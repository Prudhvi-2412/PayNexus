import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, hashString } from '../utils/crypto';
import prisma from '../database/prisma';
import redisService from '../redis/redis';

// Extend Express Request types globally inside this module
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        role: string;
        email: string;
      };
      merchantId?: string;
      apiKeyUsed?: string;
    }
  }
}

/**
 * Middleware to authenticate JWT bearer tokens
 */
export const authenticateUser = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication token missing or invalid' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = verifyAccessToken(token);
    req.user = payload;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
  }
};

/**
 * Middleware to restrict access by role
 */
export const requireRoles = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
    }

    next();
  };
};

/**
 * Middleware to authenticate API keys passed by Merchant in headers
 * Supports Cache-aside using Redis
 */
export const authenticateApiKey = async (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers['x-api-key'] as string;
  if (!apiKey) {
    return res.status(401).json({ error: 'API key missing. Use x-api-key header.' });
  }

  try {
    const hashedKey = hashString(apiKey);
    const cacheKey = `apikey:${hashedKey}`;
    
    // Check Redis cache first
    const cachedData = await redisService.get(cacheKey);
    if (cachedData) {
      const cached = JSON.parse(cachedData);
      if (!cached.active) {
        return res.status(401).json({ error: 'Inactive or revoked API key' });
      }
      req.merchantId = cached.merchantId;
      req.apiKeyUsed = hashedKey;
      return next();
    }

    // Cache miss, check database
    const keyRecord = await prisma.merchantApiKey.findUnique({
      where: { keyHash: hashedKey },
      include: { merchant: true },
    });

    if (!keyRecord) {
      return res.status(401).json({ error: 'Invalid API key' });
    }

    if (!keyRecord.active || keyRecord.merchant.status === 'SUSPENDED') {
      // Cache the inactive state for 1 hour to prevent DB spamming with bad keys
      await redisService.set(cacheKey, JSON.stringify({ active: false }), 3600);
      return res.status(401).json({ error: 'Suspended or inactive merchant account' });
    }

    if (keyRecord.expiresAt < new Date()) {
      await redisService.set(cacheKey, JSON.stringify({ active: false }), 3600);
      return res.status(401).json({ error: 'API key expired' });
    }

    // Cache valid API key metadata for 24 hours (86400 seconds)
    const cachePayload = {
      merchantId: keyRecord.merchantId,
      active: true,
    };
    await redisService.set(cacheKey, JSON.stringify(cachePayload), 86400);

    req.merchantId = keyRecord.merchantId;
    req.apiKeyUsed = hashedKey;
    next();
  } catch (error) {
    console.error('API key authentication error:', error);
    return res.status(500).json({ error: 'Internal server authentication error' });
  }
};
