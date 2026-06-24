import { SettlementBatchStatus, SettlementStatus, LedgerTransactionType } from '@prisma/client';
import prisma from '../../shared/database/prisma';
import kafkaService from '../../shared/kafka/kafka';
import ledgerService from '../ledger/ledger.service';
import redisService from '../../shared/redis/redis';

export class SettlementService {
  /**
   * Triggers a daily T+1 settlement batch for all merchants.
   */
  public async performSettlementBatch() {
    const lockKey = `lock:settlement:run`;
    const lockValue = Math.random().toString();
    // 60-second lock to accommodate database transaction processes
    const hasLock = await redisService.acquireLock(lockKey, lockValue, 60000);
    if (!hasLock) {
      throw new Error('A global settlement batch is already in progress. Please wait.');
    }

    try {
      // Create a Settlement Batch
      const batch = await prisma.settlementBatch.create({
        data: {
          status: SettlementBatchStatus.OPEN,
        },
      });

      try {
        // Update batch status to PROCESSING
        await prisma.settlementBatch.update({
          where: { id: batch.id },
          data: { status: SettlementBatchStatus.PROCESSING },
        });

        // Fetch all merchants
        const merchants = await prisma.merchant.findMany({
          where: { status: 'ACTIVE' },
        });

        console.log(`Starting settlement processing for ${merchants.length} merchants in batch ${batch.id}`);

        for (const merchant of merchants) {
          // Fetch current pending balance (derived from ledger)
          const pendingBalance = await ledgerService.getAccountBalance(
            merchant.id,
            'MERCHANT_PENDING',
            'USD'
          );

          if (pendingBalance <= 0n) {
            console.log(`Merchant ${merchant.businessName} has no pending balance. Skipping.`);
            continue;
          }

          console.log(`Settling ${pendingBalance} cents for merchant ${merchant.businessName}`);

          // Run each merchant settlement in a separate ACID transaction to prevent one failure from blocking all
          await prisma.$transaction(async (tx) => {
            // Double check the pending balance inside transaction to avoid race conditions
            const currentPending = await ledgerService.getAccountBalance(
              merchant.id,
              'MERCHANT_PENDING',
              'USD'
            );

            if (currentPending <= 0n) return;

            // Create Settlement Record
            const settlement = await tx.settlement.create({
              data: {
                merchantId: merchant.id,
                settlementBatchId: batch.id,
                grossAmount: currentPending,
                feeAmount: 0n,
                netAmount: currentPending,
                status: SettlementStatus.CREATED,
              },
            });

            // Ledger: Move from MERCHANT_PENDING to MERCHANT_SETTLED
            const moveEntries = [
              {
                entityId: merchant.id,
                entityType: 'MERCHANT_PENDING' as const,
                entryType: 'DEBIT' as const,
                amount: currentPending,
                description: `Move pending funds to settled for payout. Settlement ID: ${settlement.id}`,
              },
              {
                entityId: merchant.id,
                entityType: 'MERCHANT_SETTLED' as const,
                entryType: 'CREDIT' as const,
                amount: currentPending,
                description: `Funds credit to Merchant Settled. Settlement ID: ${settlement.id}`,
              },
            ];

            await ledgerService.recordTransaction(
              settlement.id,
              LedgerTransactionType.SETTLEMENT_TRANSFER,
              moveEntries,
              'USD',
              tx
            );

            // Update settlement record to PROCESSING
            await tx.settlement.update({
              where: { id: settlement.id },
              data: { status: SettlementStatus.PROCESSING },
            });

            // Mock Bank Payout execution
            const payoutRef = 'PAYOUT_NET_' + Math.random().toString(36).substring(7).toUpperCase();

            // Complete settlement and record cash leaving gateway receivable
            const payoutEntries = [
              {
                entityId: merchant.id,
                entityType: 'MERCHANT_SETTLED' as const,
                entryType: 'DEBIT' as const,
                amount: currentPending,
                description: `Bank payout completed. Ref: ${payoutRef}`,
              },
              {
                entityId: 'SYSTEM_GATEWAY',
                entityType: 'GATEWAY_RECEIVABLE' as const,
                entryType: 'CREDIT' as const,
                amount: currentPending,
                description: `Cash payout released for Settlement ID: ${settlement.id}`,
              },
            ];

            await ledgerService.recordTransaction(
              settlement.id,
              LedgerTransactionType.SETTLEMENT_PAYOUT,
              payoutEntries,
              'USD',
              tx
            );

            // Update Settlement Status
            await tx.settlement.update({
              where: { id: settlement.id },
              data: {
                status: SettlementStatus.SUCCEEDED,
                payoutReference: payoutRef,
              },
            });

            // Publish Event
            await kafkaService.publish('settlement.completed', {
              settlementId: settlement.id,
              batchId: batch.id,
              merchantId: merchant.id,
              amount: currentPending.toString(),
              payoutReference: payoutRef,
            });
          });
        }

        // Close the batch
        await prisma.settlementBatch.update({
          where: { id: batch.id },
          data: {
            status: SettlementBatchStatus.COMPLETED,
            settledAt: new Date(),
          },
        });

        console.log(`Settlement batch ${batch.id} completed successfully.`);
        return { status: 'SUCCESS', batchId: batch.id };
      } catch (error) {
        console.error(`Settlement batch ${batch.id} failed:`, error);
        await prisma.settlementBatch.update({
          where: { id: batch.id },
          data: { status: SettlementBatchStatus.OPEN }, // reset status so it can be retried
        });
        throw error;
      }
    } finally {
      await redisService.releaseLock(lockKey, lockValue);
    }
  }
}

export const settlementService = new SettlementService();
export default settlementService;
