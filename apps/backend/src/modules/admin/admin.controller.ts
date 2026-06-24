import { Request, Response } from 'express';
import prisma from '../../shared/database/prisma';
import redisService from '../../shared/redis/redis';
import ledgerService from '../ledger/ledger.service';

export class AdminController {
  /**
   * GET /api/v1/admin/analytics
   * Super Admin dashboard metrics
   */
  public getAnalytics = async (req: Request, res: Response) => {
    try {
      // 1. Fetch Global Volume & Tx Count from Redis
      const redisVolume = await redisService.get('analytics:global:volume');
      const redisCount = await redisService.get('analytics:global:txcount');

      const globalVolume = redisVolume ? BigInt(redisVolume) : 0n;
      const globalTxCount = redisCount ? parseInt(redisCount) : 0;

      // 2. Derive Platform Revenue from Ledger
      const platformRevenue = await ledgerService.getAccountBalance(
        'SYSTEM_PLATFORM',
        'PLATFORM_REVENUE',
        'USD'
      );

      // 3. Count Active Merchants
      const activeMerchants = await prisma.merchant.count({
        where: { status: 'ACTIVE', role: 'MERCHANT' },
      });

      // 4. Fetch Risk Alerts
      const riskAlerts = await prisma.riskAlert.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          payment: {
            select: {
              amount: true,
              currency: true,
              merchant: { select: { businessName: true } },
            },
          },
        },
      });

      // 5. Fetch Recent Audit Logs
      const auditLogs = await prisma.auditLog.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
      });

      // Map risk alerts BigInt amounts to String
      const serializedAlerts = riskAlerts.map((alert) => ({
        ...alert,
        payment: {
          ...alert.payment,
          amount: alert.payment.amount.toString(),
        },
      }));

      return res.status(200).json({
        globalVolume: globalVolume.toString(),
        globalTxCount,
        platformRevenue: platformRevenue.toString(),
        activeMerchants,
        riskAlerts: serializedAlerts,
        auditLogs,
      });
    } catch (error: any) {
      console.error('Admin analytics fetch failed:', error);
      return res.status(500).json({ error: error.message || 'Analytics query failed' });
    }
  };
}

export default new AdminController();
