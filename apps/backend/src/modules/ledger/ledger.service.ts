import { Prisma, LedgerEntityType, LedgerEntryType, LedgerTransactionType } from '@prisma/client';
import prisma from '../../shared/database/prisma';

export interface LedgerEntryInput {
  entityId: string;
  entityType: LedgerEntityType;
  entryType: LedgerEntryType;
  amount: bigint; // BigInt representing cents
  description?: string;
}

class LedgerService {
  /**
   * Helper to determine if an account type is Credit-normal or Debit-normal.
   * - Credit-Normal: Balance = Credits - Debits (e.g. Liability to Merchant, Platform Revenue)
   * - Debit-Normal: Balance = Debits - Credits (e.g. Assets, Gateway Receivables, Customer Wallet credits)
   */
  public isCreditNormal(entityType: LedgerEntityType): boolean {
    switch (entityType) {
      case LedgerEntityType.MERCHANT_AVAILABLE:
      case LedgerEntityType.MERCHANT_PENDING:
      case LedgerEntityType.MERCHANT_SETTLED:
      case LedgerEntityType.PLATFORM_REVENUE:
        return true;
      case LedgerEntityType.CUSTOMER_WALLET:
      case LedgerEntityType.GATEWAY_RECEIVABLE:
        return false;
      default:
        return true;
    }
  }

  /**
   * Retrieves or creates a ledger account for a given entity, type, and currency.
   * Can accept an existing transaction client for ACID transactions.
   */
  public async getOrCreateAccount(
    entityId: string,
    entityType: LedgerEntityType,
    currency: string = 'USD',
    tx: Prisma.TransactionClient = prisma
  ) {
    // Find account
    let account = await tx.ledgerAccount.findUnique({
      where: {
        entityId_entityType_currency: {
          entityId,
          entityType,
          currency,
        },
      },
    });

    // Create if not exists
    if (!account) {
      try {
        account = await tx.ledgerAccount.create({
          data: {
            entityId,
            entityType,
            currency,
          },
        });
      } catch (err: any) {
        // Handle concurrency duplicate key error by fetching again
        if (err.code === 'P2002') {
          account = await tx.ledgerAccount.findUnique({
            where: {
              entityId_entityType_currency: {
                entityId,
                entityType,
                currency,
              },
            },
          });
        } else {
          throw err;
        }
      }
    }

    if (!account) {
      throw new Error(`Ledger account could not be retrieved or created for ${entityId}/${entityType}`);
    }

    return account;
  }

  /**
   * Records a double-entry transaction.
   * Verifies that Sum(DEBITS) === Sum(CREDITS).
   * Runs inside an ACID transaction client.
   */
  public async recordTransaction(
    transactionId: string,
    transactionType: LedgerTransactionType,
    entries: LedgerEntryInput[],
    currency: string = 'USD',
    tx: Prisma.TransactionClient = prisma
  ) {
    if (entries.length === 0) {
      throw new Error('Cannot record an empty ledger transaction');
    }

    // Verify equation: Debits = Credits
    let totalDebit = 0n;
    let totalCredit = 0n;

    for (const entry of entries) {
      if (entry.amount < 0n) {
        throw new Error('Ledger entry amount must be a positive integer (in cents)');
      }
      if (entry.entryType === LedgerEntryType.DEBIT) {
        totalDebit += entry.amount;
      } else {
        totalCredit += entry.amount;
      }
    }

    if (totalDebit !== totalCredit) {
      throw new Error(`Double-entry balance mismatch. Total Debits: ${totalDebit} cents, Total Credits: ${totalCredit} cents. Difference must be 0.`);
    }

    // Create entries and tie to accounts
    const createdEntries = [];
    for (const entry of entries) {
      const account = await this.getOrCreateAccount(entry.entityId, entry.entityType, currency, tx);
      
      const ledgerEntry = await tx.ledgerEntry.create({
        data: {
          ledgerAccountId: account.id,
          entryType: entry.entryType,
          amount: entry.amount,
          transactionId,
          transactionType,
          description: entry.description,
        },
      });
      createdEntries.push(ledgerEntry);
    }

    return createdEntries;
  }

  /**
   * Derives account balance by summing ledger entries.
   * Returns a BigInt representing cents.
   */
  public async getAccountBalance(
    entityId: string,
    entityType: LedgerEntityType,
    currency: string = 'USD'
  ): Promise<bigint> {
    const account = await prisma.ledgerAccount.findUnique({
      where: {
        entityId_entityType_currency: {
          entityId,
          entityType,
          currency,
        },
      },
      include: {
        entries: true,
      },
    });

    if (!account) {
      return 0n;
    }

    // Aggregate debits and credits
    const aggregations = await prisma.ledgerEntry.groupBy({
      by: ['entryType'],
      where: {
        ledgerAccountId: account.id,
      },
      _sum: {
        amount: true,
      },
    });

    let debits = 0n;
    let credits = 0n;

    for (const agg of aggregations) {
      if (agg.entryType === LedgerEntryType.DEBIT) {
        debits = agg._sum.amount || 0n;
      } else {
        credits = agg._sum.amount || 0n;
      }
    }

    const isCredit = this.isCreditNormal(entityType);
    return isCredit ? (credits - debits) : (debits - credits);
  }

  /**
   * Helper to get all balances for a merchant (Available, Pending, Settled)
   */
  public async getMerchantBalances(merchantId: string, currency: string = 'USD') {
    const [available, pending, settled] = await Promise.all([
      this.getAccountBalance(merchantId, LedgerEntityType.MERCHANT_AVAILABLE, currency),
      this.getAccountBalance(merchantId, LedgerEntityType.MERCHANT_PENDING, currency),
      this.getAccountBalance(merchantId, LedgerEntityType.MERCHANT_SETTLED, currency),
    ]);

    return {
      availableBalance: available.toString(),
      pendingBalance: pending.toString(),
      settledBalance: settled.toString(),
      currency,
    };
  }
}

export const ledgerService = new LedgerService();
export default ledgerService;
