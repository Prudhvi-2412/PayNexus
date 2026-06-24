import { Request, Response } from 'express';
import settlementService from './settlement.service';

export class SettlementController {
  /**
   * POST /api/v1/settlements/trigger
   * Triggers the T+1 settlement run for all merchants.
   */
  public triggerSettlement = async (req: Request, res: Response) => {
    // Note: In real life this would be limited to Super Admins only (via requireRoles)
    try {
      const result = await settlementService.performSettlementBatch();
      return res.status(200).json(result);
    } catch (error: any) {
      console.error('Trigger settlement endpoint error:', error);
      return res.status(500).json({ error: error.message || 'Settlement batch failed' });
    }
  };
}

export default new SettlementController();
