import { Request, Response } from 'express';
import paymentService from './payment.service';
import routingService from '../../shared/routing/routing.service';
import ledgerService from '../ledger/ledger.service';
import redisService from '../../shared/redis/redis';
import prisma from '../../shared/database/prisma';

export class PaymentController {
  /**
   * Helper to serialize BigInt objects to string before sending JSON
   */
  private serializeBigInt(obj: any): any {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj === 'bigint') return obj.toString();
    if (Array.isArray(obj)) return obj.map((item) => this.serializeBigInt(item));
    if (typeof obj === 'object') {
      const copy: any = {};
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          copy[key] = this.serializeBigInt(obj[key]);
        }
      }
      return copy;
    }
    return obj;
  }

  /**
   * POST /api/orders
   * Expects: { merchantOrderId, amount, currency, customerEmail, metadata }
   * Authenticated via API key (req.merchantId)
   */
  public createOrder = async (req: Request, res: Response) => {
    const merchantId = req.merchantId;
    const { merchantOrderId, amount, currency, customerEmail, metadata } = req.body;

    if (!merchantId) {
      return res.status(401).json({ error: 'Merchant authentication required' });
    }

    if (!merchantOrderId || !amount || !customerEmail) {
      return res.status(400).json({ error: 'merchantOrderId, amount (in cents), and customerEmail are required' });
    }

    try {
      const amountBigInt = BigInt(amount);
      if (amountBigInt <= 0n) {
        return res.status(400).json({ error: 'Amount must be greater than 0' });
      }

      const order = await paymentService.createOrder(
        merchantId,
        merchantOrderId,
        amountBigInt,
        currency,
        customerEmail,
        metadata
      );

      return res.status(201).json(this.serializeBigInt(order));
    } catch (error: any) {
      console.error('Order creation endpoint error:', error);
      return res.status(400).json({ error: error.message || 'Failed to create order' });
    }
  };

  /**
   * POST /api/payments/authorize
   * Simulates payment authorization.
   * Expects: { orderId, method, customerIp }
   */
  public authorizePayment = async (req: Request, res: Response) => {
    const { orderId, method, customerIp } = req.body;

    if (!orderId || !method) {
      return res.status(400).json({ error: 'orderId and method (e.g. CARD) are required' });
    }

    try {
      const result = await paymentService.authorizePayment(
        orderId,
        method,
        customerIp || req.ip || null
      );
      return res.status(200).json(this.serializeBigInt(result));
    } catch (error: any) {
      console.error('Payment authorization endpoint error:', error);
      return res.status(400).json({ error: error.message || 'Authorization failed' });
    }
  };

  /**
   * POST /api/payments/capture
   * Simulates capturing payment.
   * Expects: { orderId, method, customerIp }
   */
  public capturePayment = async (req: Request, res: Response) => {
    const { orderId, method, customerIp } = req.body;

    if (!orderId) {
      return res.status(400).json({ error: 'orderId is required' });
    }

    try {
      const result = await paymentService.capturePayment(
        orderId,
        method || 'CARD',
        customerIp || req.ip || null
      );
      return res.status(200).json(this.serializeBigInt(result));
    } catch (error: any) {
      console.error('Payment capture endpoint error:', error);
      return res.status(400).json({ error: error.message || 'Capture failed' });
    }
  };

  /**
   * GET /api/payments/routing-stats
   * Retrieves live HDFC and ICICI routing stats and degradation status.
   */
  public getRoutingStats = async (req: Request, res: Response) => {
    try {
      const stats = await routingService.getRouteStatusReport();
      return res.status(200).json(stats);
    } catch (error: any) {
      console.error('Failed to get routing stats:', error);
      return res.status(500).json({ error: error.message || 'Failed to fetch routing stats' });
    }
  };

  /**
   * GET /api/payments/admin-stats
   * Public-facing developer proxy for live analytics, audit logs, and settlements.
   */
  public getAdminStats = async (req: Request, res: Response) => {
    try {
      const redisVolume = await redisService.get('analytics:global:volume');
      const redisCount = await redisService.get('analytics:global:txcount');

      const globalVolume = redisVolume ? BigInt(redisVolume) : 0n;
      const globalTxCount = redisCount ? parseInt(redisCount) : 0;

      const platformRevenue = await ledgerService.getAccountBalance(
        'SYSTEM_PLATFORM',
        'PLATFORM_REVENUE',
        'USD'
      );

      const activeMerchants = await prisma.merchant.count({
        where: { status: 'ACTIVE', role: 'MERCHANT' },
      });

      const riskAlerts = await prisma.riskAlert.findMany({
        take: 30,
        orderBy: { createdAt: 'desc' },
      });

      const auditLogs = await prisma.auditLog.findMany({
        take: 30,
        orderBy: { createdAt: 'desc' },
      });

      const settlements = await prisma.settlement.findMany({
        take: 30,
        orderBy: { createdAt: 'desc' },
      });

      return res.status(200).json({
        globalVolume: globalVolume.toString(),
        globalTxCount,
        platformRevenue: platformRevenue.toString(),
        activeMerchants,
        riskAlerts: this.serializeBigInt(riskAlerts),
        auditLogs: this.serializeBigInt(auditLogs),
        settlements: this.serializeBigInt(settlements),
      });
    } catch (error: any) {
      console.error('Developer admin stats fetch failed:', error);
      return res.status(500).json({ error: error.message || 'Stats query failed' });
    }
  };
}

export default new PaymentController();
