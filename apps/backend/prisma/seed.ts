import { PrismaClient, Role, MerchantStatus, OrderStatus, PaymentStatus, LedgerEntityType, LedgerEntryType, LedgerTransactionType } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const prisma = new PrismaClient();

// Hash function helper matching the app implementation
const hashString = (str: string): string => {
  return crypto.createHash('sha256').update(str).digest('hex');
};

async function main() {
  console.log('Seeding payment gateway database...');

  // 1. Clear existing data in reverse order of relations
  await prisma.riskAlert.deleteMany({});
  await prisma.webhookLog.deleteMany({});
  await prisma.merchantWebhook.deleteMany({});
  await prisma.merchantApiKey.deleteMany({});
  await prisma.merchantAccount.deleteMany({});
  await prisma.ledgerEntry.deleteMany({});
  await prisma.ledgerAccount.deleteMany({});
  await prisma.refund.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.settlement.deleteMany({});
  await prisma.settlementBatch.deleteMany({});
  await prisma.auditLog.deleteMany({});
  await prisma.merchant.deleteMany({});

  // 2. Create Password Hashes
  const adminPasswordHash = await bcrypt.hash('AdminPass123', 10);
  const merchantPasswordHash = await bcrypt.hash('MerchantPass123', 10);

  // 3. Create Super Admin
  const admin = await prisma.merchant.create({
    data: {
      businessName: 'Platform Administration',
      email: 'admin@platform.com',
      passwordHash: adminPasswordHash,
      role: Role.SUPER_ADMIN,
      status: MerchantStatus.ACTIVE,
    },
  });
  console.log('Created Super Admin: admin@platform.com');

  // 4. Create Merchant
  const merchant = await prisma.merchant.create({
    data: {
      businessName: 'Apex Retailers Inc.',
      email: 'merchant@store.com',
      passwordHash: merchantPasswordHash,
      role: Role.MERCHANT,
      status: MerchantStatus.ACTIVE,
    },
  });
  console.log('Created Merchant: merchant@store.com');

  // 5. Create Merchant Bank Account info
  await prisma.merchantAccount.create({
    data: {
      merchantId: merchant.id,
      bankName: 'Silicon Valley Payout Bank',
      accountNumber: '1234567890',
      routingNumber: '021000021',
    },
  });

  // 6. Create Default Merchant Ledger Accounts
  const mAvailable = await prisma.ledgerAccount.create({
    data: { entityId: merchant.id, entityType: LedgerEntityType.MERCHANT_AVAILABLE, currency: 'USD' },
  });
  const mPending = await prisma.ledgerAccount.create({
    data: { entityId: merchant.id, entityType: LedgerEntityType.MERCHANT_PENDING, currency: 'USD' },
  });
  const mSettled = await prisma.ledgerAccount.create({
    data: { entityId: merchant.id, entityType: LedgerEntityType.MERCHANT_SETTLED, currency: 'USD' },
  });

  // Create System Ledger Accounts
  const sysGateway = await prisma.ledgerAccount.create({
    data: { entityId: 'SYSTEM_GATEWAY', entityType: LedgerEntityType.GATEWAY_RECEIVABLE, currency: 'USD' },
  });
  const sysPlatform = await prisma.ledgerAccount.create({
    data: { entityId: 'SYSTEM_PLATFORM', entityType: LedgerEntityType.PLATFORM_REVENUE, currency: 'USD' },
  });

  // 7. Generate a static API key for testing
  const rawKey = 'sk_live_abc123merchantkeyforlocaldemo';
  const prefix = 'sk_live_abc123';
  const keyHash = hashString(rawKey);
  const expiresAt = new Date();
  expiresAt.setFullYear(expiresAt.getFullYear() + 2); // 2 years expiry

  await prisma.merchantApiKey.create({
    data: {
      merchantId: merchant.id,
      prefix,
      keyHash,
      expiresAt,
    },
  });
  console.log(`Created test API Key: ${rawKey}`);

  // 8. Create mock orders, payments & balanced ledger postings
  console.log('Creating transaction logs and double-entry ledger seeding...');

  // Transaction 1: Captured payment of $120.00
  const order1 = await prisma.order.create({
    data: {
      merchantId: merchant.id,
      merchantOrderId: 'ord_apex_901',
      amount: 12000n, // $120.00
      currency: 'USD',
      status: OrderStatus.CAPTURED,
      customerEmail: 'customer1@gmail.com',
    },
  });
  const payment1 = await prisma.payment.create({
    data: {
      orderId: order1.id,
      merchantId: merchant.id,
      amount: 12000n,
      currency: 'USD',
      status: PaymentStatus.CAPTURED,
      method: 'CARD',
      gatewayReference: 'GWT_CAPT_SEED901',
    },
  });

  // Ledger entries for Tx 1: Fee 2% of $120 ($2.40) + $0.30 = $2.70. Net = $117.30
  const fee1 = 270n;
  const net1 = 11730n;
  await prisma.ledgerEntry.createMany({
    data: [
      { ledgerAccountId: sysGateway.id, entryType: LedgerEntryType.DEBIT, amount: 12000n, transactionId: payment1.id, transactionType: LedgerTransactionType.PAYMENT_CAPTURE, description: 'Debit Gateway Receivable' },
      { ledgerAccountId: mPending.id, entryType: LedgerEntryType.CREDIT, amount: net1, transactionId: payment1.id, transactionType: LedgerTransactionType.PAYMENT_CAPTURE, description: 'Credit Merchant Pending' },
      { ledgerAccountId: sysPlatform.id, entryType: LedgerEntryType.CREDIT, amount: fee1, transactionId: payment1.id, transactionType: LedgerTransactionType.PAYMENT_CAPTURE, description: 'Credit Platform Fee Revenue' },
    ],
  });

  // Transaction 2: Captured payment of $50.00
  const order2 = await prisma.order.create({
    data: {
      merchantId: merchant.id,
      merchantOrderId: 'ord_apex_902',
      amount: 5000n, // $50.00
      currency: 'USD',
      status: OrderStatus.CAPTURED,
      customerEmail: 'customer2@yahoo.com',
    },
  });
  const payment2 = await prisma.payment.create({
    data: {
      orderId: order2.id,
      merchantId: merchant.id,
      amount: 5000n,
      currency: 'USD',
      status: PaymentStatus.CAPTURED,
      method: 'UPI',
      gatewayReference: 'GWT_CAPT_SEED902',
    },
  });

  // Ledger entries for Tx 2: Fee 2% of $50 ($1.00) + $0.30 = $1.30. Net = $48.70
  const fee2 = 130n;
  const net2 = 4870n;
  await prisma.ledgerEntry.createMany({
    data: [
      { ledgerAccountId: sysGateway.id, entryType: LedgerEntryType.DEBIT, amount: 5000n, transactionId: payment2.id, transactionType: LedgerTransactionType.PAYMENT_CAPTURE, description: 'Debit Gateway Receivable' },
      { ledgerAccountId: mPending.id, entryType: LedgerEntryType.CREDIT, amount: net2, transactionId: payment2.id, transactionType: LedgerTransactionType.PAYMENT_CAPTURE, description: 'Credit Merchant Pending' },
      { ledgerAccountId: sysPlatform.id, entryType: LedgerEntryType.CREDIT, amount: fee2, transactionId: payment2.id, transactionType: LedgerTransactionType.PAYMENT_CAPTURE, description: 'Credit Platform Fee Revenue' },
    ],
  });

  // Transaction 3: Authorized only payment of $400.00 (No ledger entries, as not captured!)
  const order3 = await prisma.order.create({
    data: {
      merchantId: merchant.id,
      merchantOrderId: 'ord_apex_903',
      amount: 40000n,
      currency: 'USD',
      status: OrderStatus.AUTHORIZED,
      customerEmail: 'customer3@outlook.com',
    },
  });
  await prisma.payment.create({
    data: {
      orderId: order3.id,
      merchantId: merchant.id,
      amount: 40000n,
      currency: 'USD',
      status: PaymentStatus.AUTHORIZED,
      method: 'CARD',
      gatewayReference: 'GWT_AUTH_SEED903',
    },
  });

  // Transaction 4: Failed payment of $90.00
  const order4 = await prisma.order.create({
    data: {
      merchantId: merchant.id,
      merchantOrderId: 'ord_apex_904',
      amount: 9000n,
      currency: 'USD',
      status: OrderStatus.FAILED,
      customerEmail: 'customer4@icloud.com',
    },
  });
  await prisma.payment.create({
    data: {
      orderId: order4.id,
      merchantId: merchant.id,
      amount: 9000n,
      currency: 'USD',
      status: PaymentStatus.FAILED,
      method: 'CARD',
      gatewayReference: 'GWT_FAIL_SEED904',
    },
  });

  // Audit Logs Seeding
  await prisma.auditLog.createMany({
    data: [
      { actorId: merchant.id, actorRole: 'MERCHANT', action: 'api_key.created', resource: 'api_key', resourceId: prefix, ipAddress: '127.0.0.1' },
      { actorId: 'SYSTEM', actorRole: 'SYSTEM', action: 'ledger_account.created', resource: 'ledger_account', resourceId: mPending.id },
    ],
  });

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
