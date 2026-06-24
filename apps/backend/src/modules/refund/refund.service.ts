import { OrderStatus, PaymentStatus, RefundStatus, LedgerTransactionType } from '@prisma/client';
import prisma from '../../shared/database/prisma';
import kafkaService from '../../shared/kafka/kafka';
import ledgerService from '../ledger/ledger.service';
import redisService from '../../shared/redis/redis';

export class RefundService {
  /**
   * Process full or partial refund for a payment
   */
  public async processRefund(
    merchantId: string,
    paymentId: string,
    refundAmountCents: bigint,
    reason: string = 'MERCHANT_REQUESTED'
  ) {
    const lockKey = `lock:refund:${paymentId}`;
    const lockValue = Math.random().toString();
    const hasLock = await redisService.acquireLock(lockKey, lockValue, 5000);
    if (!hasLock) {
      throw new Error('A refund operation is already in progress for this payment. Please try again.');
    }

    try {
      return await prisma.$transaction(async (tx) => {
        // Lock payment row to prevent concurrent refunds
        const payments: any[] = await tx.$queryRaw`
          SELECT * FROM payments WHERE id = ${paymentId} LIMIT 1 FOR UPDATE
        `;

        if (payments.length === 0) {
          throw new Error('Payment not found');
        }
        const payment = payments[0];

        if (payment.merchantId !== merchantId) {
          throw new Error('Unauthorized: Payment does not belong to this merchant');
        }

        if (payment.status !== PaymentStatus.CAPTURED) {
          throw new Error(`Refunds are only allowed on CAPTURED payments. Current status: ${payment.status}`);
        }

        // Fetch all previous successful or pending refunds for this payment
        const existingRefunds = await tx.refund.findMany({
          where: {
            paymentId,
            status: { in: [RefundStatus.SUCCESS, RefundStatus.PENDING] },
          },
        });

        const totalAlreadyRefunded = existingRefunds.reduce(
          (sum, ref) => sum + ref.amount,
          0n
        );

        const remainingRefundable = payment.amount - totalAlreadyRefunded;
        if (refundAmountCents > remainingRefundable) {
          throw new Error(
            `Refund amount exceeds refundable balance. Original: ${payment.amount} cents. Already refunded: ${totalAlreadyRefunded} cents. Requested: ${refundAmountCents} cents.`
          );
        }

        // Create Refund record
        const refund = await tx.refund.create({
          data: {
            paymentId,
            merchantId,
            amount: refundAmountCents,
            currency: payment.currency,
            status: RefundStatus.PENDING,
            reason,
          },
        });

        // Publish refund.created
        await kafkaService.publish('refund.created', {
          refundId: refund.id,
          paymentId,
          merchantId,
          amount: refundAmountCents.toString(),
        });

        // Ledger Reversal logic
        const captureEntries = await tx.ledgerEntry.findMany({
          where: {
            transactionId: paymentId,
            transactionType: LedgerTransactionType.PAYMENT_CAPTURE,
          },
          include: {
            ledgerAccount: true,
          },
        });

        let originalFee = 0n;
        for (const entry of captureEntries) {
          if (entry.ledgerAccount.entityType === 'PLATFORM_REVENUE') {
            originalFee = entry.amount;
          }
        }

        // Pro-rate the fee reversal
        const feeReversal = (refundAmountCents * originalFee) / payment.amount;
        const netReversal = refundAmountCents - feeReversal;

        // Ledger balancing
        const ledgerEntries = [
          {
            entityId: merchantId,
            entityType: 'MERCHANT_PENDING' as const,
            entryType: 'DEBIT' as const,
            amount: netReversal,
            description: `Refund reversal from Merchant Pending. Refund ID: ${refund.id}`,
          },
          {
            entityId: 'SYSTEM_PLATFORM',
            entityType: 'PLATFORM_REVENUE' as const,
            entryType: 'DEBIT' as const,
            amount: feeReversal,
            description: `Platform fee refund reversal. Refund ID: ${refund.id}`,
          },
          {
            entityId: 'SYSTEM_GATEWAY',
            entityType: 'GATEWAY_RECEIVABLE' as const,
            entryType: 'CREDIT' as const,
            amount: refundAmountCents,
            description: `Gateway cash payout for Refund ${refund.id}`,
          },
        ];

        await ledgerService.recordTransaction(
          refund.id,
          LedgerTransactionType.REFUND,
          ledgerEntries,
          payment.currency,
          tx
        );

        // Update Refund status to SUCCESS and Order Status to REFUNDED if fully refunded
        const updatedRefund = await tx.refund.update({
          where: { id: refund.id },
          data: {
            status: RefundStatus.SUCCESS,
            gatewayReference: 'REF_GWT_' + Math.random().toString(36).substring(7).toUpperCase(),
          },
        });

        // Update Order Status to REFUNDED if the whole payment is refunded
        const isFullyRefunded = totalAlreadyRefunded + refundAmountCents === payment.amount;
        if (isFullyRefunded) {
          await tx.order.update({
            where: { id: payment.orderId },
            data: { status: OrderStatus.REFUNDED },
          });
        }

        // Publish refund.completed event
        await kafkaService.publish('refund.completed', {
          refundId: refund.id,
          paymentId,
          merchantId,
          amount: refundAmountCents.toString(),
          feeReversed: feeReversal.toString(),
          netReversed: netReversal.toString(),
          isFullyRefunded,
        });

        return updatedRefund;
      });
    } finally {
      await redisService.releaseLock(lockKey, lockValue);
    }
  }
}

export const refundService = new RefundService();
export default refundService;
