import redisService from '../../shared/redis/redis';
import prisma from '../../shared/database/prisma';
import { RiskAction } from '@prisma/client';

const HIGH_VALUE_THRESHOLD_CENTS = BigInt(process.env.FRAUD_HIGH_VALUE_THRESHOLD_CENTS || '1000000'); // $10,000
const MAX_IP_VELOCITY_HOUR = parseInt(process.env.FRAUD_SUSPICIOUS_IP_LIMIT_PER_HOUR || '50');

export class FraudService {
  /**
   * Evaluates the risk score of a transaction request
   * Returns a risk score (0-100) and an action (ALLOW, REVIEW, BLOCK)
   */
  public async evaluateTransaction(
    merchantId: string,
    amountCents: bigint,
    customerIp: string | null
  ): Promise<{ riskScore: number; riskStatus: RiskAction; rulesTriggered: string[] }> {
    let riskScore = 0;
    const rulesTriggered: string[] = [];

    // Rule 1: High Value Transaction Check
    if (amountCents >= HIGH_VALUE_THRESHOLD_CENTS) {
      riskScore += 45;
      rulesTriggered.push('HIGH_VALUE_TRANSACTION');
    }

    // Rule 2: IP Velocity Check (Requests from same IP in last 1 hour)
    if (customerIp) {
      const ipKey = `fraud:ip:${customerIp}`;
      try {
        const { allowed, remaining } = await redisService.rateLimit(ipKey, MAX_IP_VELOCITY_HOUR, 3600);
        if (!allowed) {
          riskScore += 40;
          rulesTriggered.push('IP_VELOCITY_EXCEEDED');
        } else if (remaining < MAX_IP_VELOCITY_HOUR / 5) {
          riskScore += 15;
          rulesTriggered.push('IP_VELOCITY_HIGH');
        }
      } catch (err) {
        console.error('Fraud engine IP check failure:', err);
      }
    }

    // Rule 3: Merchant Velocity Check (Excessive transactions in 1 minute)
    const merchantKey = `fraud:merch:${merchantId}`;
    try {
      const { allowed } = await redisService.rateLimit(merchantKey, 10, 60); // Max 10 transactions/minute
      if (!allowed) {
        riskScore += 25;
        rulesTriggered.push('MERCHANT_VELOCITY_EXCEEDED');
      }
    } catch (err) {
      console.error('Fraud engine merchant check failure:', err);
    }

    // Evaluate Risk Status
    let riskStatus: RiskAction = RiskAction.ALLOW;
    if (riskScore >= 75) {
      riskStatus = RiskAction.BLOCK;
    } else if (riskScore >= 40) {
      riskStatus = RiskAction.REVIEW;
    }

    return {
      riskScore,
      riskStatus,
      rulesTriggered,
    };
  }

  /**
   * Logs a risk alert into the DB
   */
  public async logRiskAlert(paymentId: string, ruleTriggered: string, riskScore: number, action: RiskAction) {
    try {
      await prisma.riskAlert.create({
        data: {
          paymentId,
          ruleTriggered,
          riskScore,
          actionTaken: action,
        },
      });
    } catch (err) {
      console.error('Failed to log risk alert:', err);
    }
  }
}

export const fraudService = new FraudService();
export default fraudService;
