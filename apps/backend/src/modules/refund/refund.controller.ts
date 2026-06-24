import { Request, Response } from 'express';
import refundService from './refund.service';

export class RefundController {
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
   * POST /api/v1/refunds
   * Expects: { paymentId, amount, reason }
   * Authenticated via API key (req.merchantId)
   */
  public initiateRefund = async (req: Request, res: Response) => {
    const merchantId = req.merchantId;
    const { paymentId, amount, reason } = req.body;

    if (!merchantId) {
      return res.status(401).json({ error: 'Merchant authentication required' });
    }

    if (!paymentId || !amount) {
      return res.status(400).json({ error: 'paymentId and amount (in cents) are required' });
    }

    try {
      const amountBigInt = BigInt(amount);
      if (amountBigInt <= 0n) {
        return res.status(400).json({ error: 'Refund amount must be greater than 0' });
      }

      const refund = await refundService.processRefund(
        merchantId,
        paymentId,
        amountBigInt,
        reason || 'MERCHANT_REQUESTED'
      );

      return res.status(201).json(this.serializeBigInt(refund));
    } catch (error: any) {
      console.error('Refund initiation endpoint error:', error);
      return res.status(400).json({ error: error.message || 'Refund failed' });
    }
  };
}

export default new RefundController();
