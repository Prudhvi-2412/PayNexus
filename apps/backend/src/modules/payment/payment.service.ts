import { OrderStatus, PaymentStatus, RiskAction, LedgerTransactionType, Prisma } from '@prisma/client';
import prisma from '../../shared/database/prisma';
import kafkaService from '../../shared/kafka/kafka';
import fraudService from '../fraud/fraud.service';
import ledgerService from '../ledger/ledger.service';
import redisService from '../../shared/redis/redis';
import routingService from '../../shared/routing/routing.service';

export class PaymentService {
  /**
   * Enforces and validates order status transitions based on a formal state machine.
   */
  private validateTransition(current: OrderStatus, next: OrderStatus) {
    const ALLOWED: Record<OrderStatus, OrderStatus[]> = {
      [OrderStatus.CREATED]: [OrderStatus.AUTHORIZED, OrderStatus.CAPTURED, OrderStatus.FAILED],
      [OrderStatus.AUTHORIZED]: [OrderStatus.CAPTURED, OrderStatus.FAILED],
      [OrderStatus.CAPTURED]: [OrderStatus.REFUNDED, OrderStatus.SETTLED],
      [OrderStatus.FAILED]: [],
      [OrderStatus.REFUNDED]: [],
      [OrderStatus.SETTLED]: [OrderStatus.REFUNDED],
    };

    if (!ALLOWED[current].includes(next)) {
      throw new Error(`Invalid state transition: Cannot change order from ${current} to ${next}`);
    }
  }

  /**
   * Creates a payment order (POST /api/orders)
   */
  public async createOrder(
    merchantId: string,
    merchantOrderId: string,
    amount: bigint,
    currency: string = 'USD',
    customerEmail: string,
    metadata?: any
  ) {
    const lockKey = `lock:order_create:${merchantId}:${merchantOrderId}`;
    const lockValue = Math.random().toString();
    const hasLock = await redisService.acquireLock(lockKey, lockValue, 5000);
    if (!hasLock) {
      throw new Error('A duplicate order creation is already in progress. Please try again.');
    }

    try {
      // Check if duplicate merchant_order_id exists for this merchant
      const existing = await prisma.order.findUnique({
        where: {
          merchantId_merchantOrderId: {
            merchantId,
            merchantOrderId,
          },
        },
      });

      if (existing) {
        throw new Error(`Order with ID ${merchantOrderId} already exists for this merchant`);
      }

      const order = await prisma.order.create({
        data: {
          merchantId,
          merchantOrderId,
          amount,
          currency,
          status: OrderStatus.CREATED,
          customerEmail,
          metadata: metadata ? (metadata as Prisma.InputJsonValue) : Prisma.DbNull,
        },
      });

      // Publish payment.created event
      await kafkaService.publish('payment.created', {
        orderId: order.id,
        merchantId,
        amount: order.amount.toString(),
        currency: order.currency,
      });

      return order;
    } finally {
      await redisService.releaseLock(lockKey, lockValue);
    }
  }

  /**
   * Simulates authorizing a payment (CREATED -> AUTHORIZED)
   */
  public async authorizePayment(orderId: string, method: string, customerIp: string | null) {
    const lockKey = `lock:order_process:${orderId}`;
    const lockValue = Math.random().toString();
    const hasLock = await redisService.acquireLock(lockKey, lockValue, 5000);
    if (!hasLock) {
      throw new Error('Another action is currently in progress for this order.');
    }

    try {
      return await prisma.$transaction(async (tx) => {
        // Pessimistic Row Lock (SELECT ... FOR UPDATE)
        const orders: any[] = await tx.$queryRaw`
          SELECT * FROM orders WHERE id = ${orderId} LIMIT 1 FOR UPDATE
        `;

        if (orders.length === 0) {
          throw new Error('Order not found');
        }
        const order = orders[0];

        if (order.status === OrderStatus.AUTHORIZED) {
          return { order, alreadyAuthorized: true };
        }

        this.validateTransition(order.status as OrderStatus, OrderStatus.AUTHORIZED);

        // Evaluate fraud prior to authorization
        const { riskScore, riskStatus, rulesTriggered } = await fraudService.evaluateTransaction(
          order.merchantId,
          order.amount,
          customerIp
        );

        if (riskStatus === RiskAction.BLOCK) {
          await tx.order.update({
            where: { id: orderId },
            data: { status: OrderStatus.FAILED },
          });

          const payment = await tx.payment.create({
            data: {
              orderId,
              merchantId: order.merchantId,
              amount: order.amount,
              currency: order.currency,
              status: PaymentStatus.FAILED,
              method,
              gatewayReference: 'BLOCKED_BY_FRAUD',
              customerIp,
              riskScore,
              riskStatus,
            },
          });

          await kafkaService.publish('payment.failed', {
            orderId,
            paymentId: payment.id,
            reason: 'Risk score exceeded limits',
          });

          throw new Error('Transaction blocked by risk engine');
        }

        // Update Order Status
        const updatedOrder = await tx.order.update({
          where: { id: orderId },
          data: { status: OrderStatus.AUTHORIZED },
        });

        // Determine banking route dynamically
        const gatewayRoute = await routingService.getGatewayRoute(method);

        // Create Payment entry
        const payment = await tx.payment.create({
          data: {
            orderId,
            merchantId: order.merchantId,
            amount: order.amount,
            currency: order.currency,
            status: PaymentStatus.AUTHORIZED,
            method,
            gatewayReference: 'GWT_' + gatewayRoute + '_AUTH_' + Math.random().toString(36).substring(7).toUpperCase(),
            customerIp,
            riskScore,
            riskStatus,
          },
        });

        if (riskStatus === RiskAction.REVIEW) {
          for (const rule of rulesTriggered) {
            await fraudService.logRiskAlert(payment.id, rule, riskScore, riskStatus);
          }
        }

        await kafkaService.publish('payment.authorized', {
          orderId,
          paymentId: payment.id,
          merchantId: order.merchantId,
          amount: order.amount.toString(),
        });

        return { order: updatedOrder, payment };
      });
    } finally {
      await redisService.releaseLock(lockKey, lockValue);
    }
  }

  /**
   * Captures the payment (AUTHORIZED or CREATED -> CAPTURED)
   * Deducts a 2% platform fee + $0.30, registers double-entry ledger postings.
   */
  public async capturePayment(orderId: string, method: string = 'CARD', customerIp: string | null = null) {
    const lockKey = `lock:order_process:${orderId}`;
    const lockValue = Math.random().toString();
    const hasLock = await redisService.acquireLock(lockKey, lockValue, 5000);
    if (!hasLock) {
      throw new Error('Another action is currently in progress for this order.');
    }

    try {
      return await prisma.$transaction(async (tx) => {
        // Pessimistic Row Lock
        const orders: any[] = await tx.$queryRaw`
          SELECT * FROM orders WHERE id = ${orderId} LIMIT 1 FOR UPDATE
        `;

        if (orders.length === 0) {
          throw new Error('Order not found');
        }
        const order = orders[0];

        if (order.status === OrderStatus.CAPTURED) {
          const payment = await tx.payment.findFirst({
            where: { orderId, status: PaymentStatus.CAPTURED },
          });
          return { order, payment, alreadyCaptured: true };
        }

        this.validateTransition(order.status as OrderStatus, OrderStatus.CAPTURED);

        // Perform fraud detection
        let riskScore = 0;
        let riskStatus: RiskAction = RiskAction.ALLOW;
        let rulesTriggered: string[] = [];

        const existingAuthPayment = await tx.payment.findFirst({
          where: { orderId, status: PaymentStatus.AUTHORIZED },
        });

        if (existingAuthPayment) {
          riskScore = existingAuthPayment.riskScore || 0;
          riskStatus = existingAuthPayment.riskStatus || RiskAction.ALLOW;
        } else {
          const fraudResult = await fraudService.evaluateTransaction(
            order.merchantId,
            order.amount,
            customerIp
          );
          riskScore = fraudResult.riskScore;
          riskStatus = fraudResult.riskStatus;
          rulesTriggered = fraudResult.rulesTriggered;
        }

        if (riskStatus === RiskAction.BLOCK) {
          await tx.order.update({
            where: { id: orderId },
            data: { status: OrderStatus.FAILED },
          });
          throw new Error('Transaction blocked by risk engine');
        }

        // Determine banking route dynamically
        const gatewayRoute = await routingService.getGatewayRoute(method);

        // SYSTEM DESIGN TRAP: Simulate banking rail outage.
        // HDFC route is simulated to fail if the payment amount ends in a '5' digit (e.g. amount % 10n === 5n).
        // This lets developers trigger automatic route failover down to ICICI.
        let isGatewaySuccessful = true;
        if (gatewayRoute === 'HDFC' && order.amount % 10n === 5n) {
          isGatewaySuccessful = false;
        }

        if (!isGatewaySuccessful) {
          await routingService.reportFailure(gatewayRoute);
          
          // Fail the payment and transaction
          await tx.order.update({
            where: { id: orderId },
            data: { status: OrderStatus.FAILED },
          });

          const payment = await tx.payment.create({
            data: {
              orderId,
              merchantId: order.merchantId,
              amount: order.amount,
              currency: order.currency,
              status: PaymentStatus.FAILED,
              method,
              gatewayReference: `GWT_${gatewayRoute}_FAIL`,
              customerIp,
              riskScore,
              riskStatus,
            },
          });

          await kafkaService.publish('payment.failed', {
            orderId,
            paymentId: payment.id,
            reason: `Gateway transaction error on route: ${gatewayRoute}`,
          });

          throw new Error(`Bank Gateway Connection Refused on route: ${gatewayRoute}. Simulating automatic failover threshold.`);
        }

        // Log Gateway success
        await routingService.reportSuccess(gatewayRoute);

        // Perform Capturing updates
        const updatedOrder = await tx.order.update({
          where: { id: orderId },
          data: { status: OrderStatus.CAPTURED },
        });

        const gatewayRef = 'GWT_' + gatewayRoute + '_CAPT_' + Math.random().toString(36).substring(7).toUpperCase();
        const payment = await tx.payment.create({
          data: {
            orderId,
            merchantId: order.merchantId,
            amount: order.amount,
            currency: order.currency,
            status: PaymentStatus.CAPTURED,
            method,
            gatewayReference: gatewayRef,
            customerIp,
            riskScore,
            riskStatus,
          },
        });

        if (riskStatus === RiskAction.REVIEW && rulesTriggered.length > 0) {
          for (const rule of rulesTriggered) {
            await fraudService.logRiskAlert(payment.id, rule, riskScore, riskStatus);
          }
        }

        // Double-Entry Ledger System Integration
        const platformFeeRate = 2n; // 2%
        const flatFee = 30n; // 30 cents
        const feeAmount = (order.amount * platformFeeRate) / 100n + flatFee;
        const netAmount = order.amount - feeAmount;

        const ledgerEntries = [
          {
            entityId: 'SYSTEM_GATEWAY',
            entityType: 'GATEWAY_RECEIVABLE' as const,
            entryType: 'DEBIT' as const,
            amount: order.amount,
            description: `Gateway funds receivable (${gatewayRoute}) for Payment ${payment.id}`,
          },
          {
            entityId: order.merchantId,
            entityType: 'MERCHANT_PENDING' as const,
            entryType: 'CREDIT' as const,
            amount: netAmount,
            description: `Payment proceeds credited to Merchant Pending. Payment ID: ${payment.id}`,
          },
          {
            entityId: 'SYSTEM_PLATFORM',
            entityType: 'PLATFORM_REVENUE' as const,
            entryType: 'CREDIT' as const,
            amount: feeAmount,
            description: `Platform fee deducted for Payment ${payment.id}`,
          },
        ];

        await ledgerService.recordTransaction(
          payment.id,
          LedgerTransactionType.PAYMENT_CAPTURE,
          ledgerEntries,
          order.currency,
          tx
        );

        await kafkaService.publish('payment.captured', {
          orderId,
          paymentId: payment.id,
          merchantId: order.merchantId,
          amount: order.amount.toString(),
          feeAmount: feeAmount.toString(),
          netAmount: netAmount.toString(),
          currency: order.currency,
          gatewayRoute,
        });

        return { order: updatedOrder, payment };
      });
    } finally {
      await redisService.releaseLock(lockKey, lockValue);
    }
  }
}

export const paymentService = new PaymentService();
export default paymentService;
