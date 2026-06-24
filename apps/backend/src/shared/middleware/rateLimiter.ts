import { Request, Response, NextFunction } from 'express';
import redisService from '../redis/redis';

interface TokenBucketOptions {
  capacity: number;
  refillRate: number; // Tokens refilled per second
  keyPrefix: string;
}

/**
 * Creates an Express rate-limiting middleware using Redis Token Bucket
 */
export const rateLimiter = (options: TokenBucketOptions) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Rate limit by merchantId if authenticated, otherwise fallback to Client IP
    const identifier = req.merchantId || req.user?.userId || req.ip || 'unknown';
    const rateLimitKey = `ratelimit:${options.keyPrefix}:${identifier}`;

    try {
      const { allowed, remaining } = await redisService.rateLimitTokenBucket(
        rateLimitKey,
        options.capacity,
        options.refillRate
      );

      res.setHeader('X-RateLimit-Limit', options.capacity);
      res.setHeader('X-RateLimit-Remaining', remaining);

      if (!allowed) {
        return res.status(429).json({
          error: 'Too Many Requests',
          message: `Rate limit exceeded. Bucket capacity is ${options.capacity}. Please try again later.`,
        });
      }

      next();
    } catch (error) {
      console.error('Rate limiting token bucket middleware error:', error);
      // Fail open to avoid blocking transactions if rate-limiter encounters issues
      next();
    }
  };
};

// Common rate limit configs using token bucket
export const publicApiRateLimiter = rateLimiter({
  capacity: 30,
  refillRate: 1, // Refill 1 token per second
  keyPrefix: 'pub_bucket',
});

export const merchantApiRateLimiter = rateLimiter({
  capacity: 100,
  refillRate: 2, // Refill 2 tokens per second (120 req/min dynamic velocity)
  keyPrefix: 'merch_bucket',
});
