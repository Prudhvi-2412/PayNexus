import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../../shared/database/prisma';
import redisService from '../../shared/redis/redis';
import ledgerService from '../ledger/ledger.service';
import {
  hashPassword,
  comparePassword,
  generateTokens,
  verifyRefreshToken,
  generateApiKey,
  hashString,
} from '../../shared/utils/crypto';

export class MerchantController {
  /**
   * POST /api/v1/auth/register
   * Registers a new merchant or admin/customer user.
   */
  public async register(req: Request, res: Response) {
    const { businessName, email, password, role } = req.body;

    if (!email || !password || !businessName) {
      return res.status(400).json({ error: 'businessName, email, and password are required' });
    }

    try {
      const existing = await prisma.merchant.findUnique({ where: { email } });
      if (existing) {
        return res.status(400).json({ error: 'Merchant email already registered' });
      }

      const passwordHash = await hashPassword(password);
      const merchant = await prisma.merchant.create({
        data: {
          businessName,
          email,
          passwordHash,
          role: role || 'MERCHANT',
        },
      });

      // Create default ledger accounts for the merchant
      await Promise.all([
        ledgerService.getOrCreateAccount(merchant.id, 'MERCHANT_AVAILABLE', 'USD'),
        ledgerService.getOrCreateAccount(merchant.id, 'MERCHANT_PENDING', 'USD'),
        ledgerService.getOrCreateAccount(merchant.id, 'MERCHANT_SETTLED', 'USD'),
      ]);

      const tokens = generateTokens({
        userId: merchant.id,
        role: merchant.role,
        email: merchant.email,
      });

      return res.status(201).json({
        message: 'Registration successful',
        merchant: {
          id: merchant.id,
          businessName: merchant.businessName,
          email: merchant.email,
          role: merchant.role,
        },
        ...tokens,
      });
    } catch (error) {
      console.error('Registration error:', error);
      return res.status(500).json({ error: 'Internal registration error' });
    }
  }

  /**
   * POST /api/v1/auth/login
   */
  public async login(req: Request, res: Response) {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    try {
      const merchant = await prisma.merchant.findUnique({ where: { email } });
      if (!merchant) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      if (merchant.status === 'SUSPENDED') {
        return res.status(403).json({ error: 'Account has been suspended' });
      }

      const isValid = await comparePassword(password, merchant.passwordHash);
      if (!isValid) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const tokens = generateTokens({
        userId: merchant.id,
        role: merchant.role,
        email: merchant.email,
      });

      return res.status(200).json({
        message: 'Login successful',
        merchant: {
          id: merchant.id,
          businessName: merchant.businessName,
          email: merchant.email,
          role: merchant.role,
        },
        ...tokens,
      });
    } catch (error) {
      console.error('Login error:', error);
      return res.status(500).json({ error: 'Internal login error' });
    }
  }

  /**
   * POST /api/v1/auth/refresh
   */
  public async refresh(req: Request, res: Response) {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token is required' });
    }

    try {
      const payload = verifyRefreshToken(refreshToken);
      const merchant = await prisma.merchant.findUnique({ where: { id: payload.userId } });

      if (!merchant || merchant.status === 'SUSPENDED') {
        return res.status(401).json({ error: 'Unauthorized account' });
      }

      const tokens = generateTokens({
        userId: merchant.id,
        role: merchant.role,
        email: merchant.email,
      });

      return res.status(200).json(tokens);
    } catch (error) {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }
  }

  /**
   * POST /api/v1/auth/password-reset
   */
  public async passwordReset(req: Request, res: Response) {
    const { email, newPassword } = req.body;
    if (!email || !newPassword) {
      return res.status(400).json({ error: 'Email and newPassword are required' });
    }

    try {
      const merchant = await prisma.merchant.findUnique({ where: { email } });
      if (!merchant) {
        // Return 200 for security to prevent email enumeration
        return res.status(200).json({ message: 'Password reset link sent (if account exists)' });
      }

      const passwordHash = await hashPassword(newPassword);
      await prisma.merchant.update({
        where: { id: merchant.id },
        data: { passwordHash },
      });

      return res.status(200).json({ message: 'Password updated successfully' });
    } catch (error) {
      console.error('Password reset error:', error);
      return res.status(500).json({ error: 'Internal reset error' });
    }
  }

  /**
   * POST /api/v1/merchant/api-keys
   * Generates a new API key for the merchant.
   */
  public async generateApiKey(req: Request, res: Response) {
    const merchantId = req.user?.userId || req.merchantId;
    if (!merchantId) {
      return res.status(401).json({ error: 'Merchant context required' });
    }

    try {
      const { rawKey, prefix, keyHash } = generateApiKey();
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + 12); // Expires in 1 year

      const apiKey = await prisma.merchantApiKey.create({
        data: {
          merchantId,
          prefix,
          keyHash,
          expiresAt,
        },
      });

      // Cache the key in Redis immediately
      const cacheKey = `apikey:${keyHash}`;
      await redisService.set(
        cacheKey,
        JSON.stringify({ merchantId, active: true }),
        86400 // 24 hours TTL
      );

      return res.status(201).json({
        message: 'API Key generated successfully. Save it now, it will not be displayed again.',
        apiKey: rawKey,
        prefix: apiKey.prefix,
        expiresAt: apiKey.expiresAt,
      });
    } catch (error) {
      console.error('API key generation error:', error);
      return res.status(500).json({ error: 'Internal API key error' });
    }
  }

  /**
   * GET /api/v1/merchant/api-keys
   */
  public async listApiKeys(req: Request, res: Response) {
    const merchantId = req.user?.userId || req.merchantId;
    if (!merchantId) {
      return res.status(401).json({ error: 'Merchant context required' });
    }

    try {
      const keys = await prisma.merchantApiKey.findMany({
        where: { merchantId },
        select: {
          id: true,
          prefix: true,
          active: true,
          expiresAt: true,
          createdAt: true,
        },
      });
      return res.status(200).json(keys);
    } catch (error) {
      return res.status(500).json({ error: 'Internal API key query error' });
    }
  }

  /**
   * DELETE /api/v1/merchant/api-keys/:id
   * Revokes an API key.
   */
  public async revokeApiKey(req: Request, res: Response) {
    const merchantId = req.user?.userId || req.merchantId;
    const { id } = req.params;

    if (!merchantId) {
      return res.status(401).json({ error: 'Merchant context required' });
    }

    try {
      const apiKey = await prisma.merchantApiKey.findFirst({
        where: { id, merchantId },
      });

      if (!apiKey) {
        return res.status(404).json({ error: 'API key not found' });
      }

      await prisma.merchantApiKey.update({
        where: { id },
        data: { active: false },
      });

      // Clear from Redis cache or set to inactive
      const cacheKey = `apikey:${apiKey.keyHash}`;
      await redisService.del(cacheKey);

      return res.status(200).json({ message: 'API key revoked successfully' });
    } catch (error) {
      return res.status(500).json({ error: 'Internal key revoke error' });
    }
  }

  /**
   * POST /api/v1/merchant/webhooks
   */
  public async configureWebhook(req: Request, res: Response) {
    const merchantId = req.user?.userId || req.merchantId;
    const { url, secret, events } = req.body; // events is an array of strings e.g. ["payment.success"]

    if (!merchantId) {
      return res.status(401).json({ error: 'Merchant context required' });
    }

    if (!url || !secret || !events || !Array.isArray(events)) {
      return res.status(400).json({ error: 'url, secret, and events (array) are required' });
    }

    try {
      const webhook = await prisma.merchantWebhook.create({
        data: {
          merchantId,
          url,
          secret,
          events: events.join(','),
        },
      });

      // Cache webhook config in Redis (TTL: 1 hour)
      const cacheKey = `webhook:${merchantId}`;
      await redisService.set(cacheKey, JSON.stringify(webhook), 3600);

      return res.status(201).json({
        message: 'Webhook configured successfully',
        webhook: {
          id: webhook.id,
          url: webhook.url,
          events: webhook.events.split(','),
          active: webhook.active,
        },
      });
    } catch (error) {
      console.error('Webhook config error:', error);
      return res.status(500).json({ error: 'Internal webhook config error' });
    }
  }

  /**
   * GET /api/v1/merchant/webhooks
   */
  public async listWebhooks(req: Request, res: Response) {
    const merchantId = req.user?.userId || req.merchantId;
    if (!merchantId) {
      return res.status(401).json({ error: 'Merchant context required' });
    }

    try {
      const webhooks = await prisma.merchantWebhook.findMany({
        where: { merchantId },
      });
      return res.status(200).json(
        webhooks.map((w) => ({
          id: w.id,
          url: w.url,
          events: w.events.split(','),
          active: w.active,
          createdAt: w.createdAt,
        }))
      );
    } catch (error) {
      return res.status(500).json({ error: 'Internal webhook query error' });
    }
  }

  /**
   * GET /api/v1/merchant/balance
   * Derived dynamically from Double-Entry Ledger.
   */
  public async getBalance(req: Request, res: Response) {
    const merchantId = req.user?.userId || req.merchantId;
    if (!merchantId) {
      return res.status(401).json({ error: 'Merchant context required' });
    }

    try {
      const balances = await ledgerService.getMerchantBalances(merchantId);
      return res.status(200).json(balances);
    } catch (error) {
      console.error('Balance derivation error:', error);
      return res.status(500).json({ error: 'Internal balance fetch error' });
    }
  }

  /**
   * GET /api/v1/merchant/payments
   */
  public async listPayments(req: Request, res: Response) {
    const merchantId = req.user?.userId || req.merchantId;
    if (!merchantId) {
      return res.status(401).json({ error: 'Merchant context required' });
    }

    try {
      const payments = await prisma.payment.findMany({
        where: { merchantId },
        orderBy: { createdAt: 'desc' },
      });

      // Convert BigInt to string for JSON serialization
      const serialized = payments.map((p) => ({
        ...p,
        amount: p.amount.toString(),
      }));

      return res.status(200).json(serialized);
    } catch (error) {
      return res.status(500).json({ error: 'Internal payment query error' });
    }
  }

  /**
   * GET /api/v1/merchant/refunds
   */
  public async listRefunds(req: Request, res: Response) {
    const merchantId = req.user?.userId || req.merchantId;
    if (!merchantId) {
      return res.status(401).json({ error: 'Merchant context required' });
    }

    try {
      const refunds = await prisma.refund.findMany({
        where: { merchantId },
        orderBy: { createdAt: 'desc' },
      });

      const serialized = refunds.map((r) => ({
        ...r,
        amount: r.amount.toString(),
      }));

      return res.status(200).json(serialized);
    } catch (error) {
      return res.status(500).json({ error: 'Internal refund query error' });
    }
  }

  /**
   * GET /api/v1/merchant/settlements
   */
  public async listSettlements(req: Request, res: Response) {
    const merchantId = req.user?.userId || req.merchantId;
    if (!merchantId) {
      return res.status(401).json({ error: 'Merchant context required' });
    }

    try {
      const settlements = await prisma.settlement.findMany({
        where: { merchantId },
        orderBy: { createdAt: 'desc' },
      });

      const serialized = settlements.map((s) => ({
        ...s,
        grossAmount: s.grossAmount.toString(),
        feeAmount: s.feeAmount.toString(),
        netAmount: s.netAmount.toString(),
      }));

      return res.status(200).json(serialized);
    } catch (error) {
      return res.status(500).json({ error: 'Internal settlement query error' });
    }
  }
}
export default new MerchantController();
