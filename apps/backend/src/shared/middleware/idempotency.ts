import { Request, Response, NextFunction } from 'express';
import redisService from '../redis/redis';
import { hashString } from '../utils/crypto';

interface IdempotencyRecord {
  status: 'IN_PROGRESS' | 'COMPLETED';
  requestPath: string;
  requestBodyHash: string;
  responseStatus: number;
  responseBody: string;
}

/**
 * Middleware to enforce distributed idempotency using Redis
 */
export const idempotency = async (req: Request, res: Response, next: NextFunction) => {
  const idempotencyKey = req.headers['idempotency-key'] as string;
  const merchantId = req.merchantId;

  // Idempotency requires authentication (merchantId) and the header
  if (!idempotencyKey || !merchantId) {
    return next();
  }

  // Only apply idempotency to writing methods (POST, PUT, PATCH)
  if (!['POST', 'PUT', 'PATCH'].includes(req.method)) {
    return next();
  }

  const requestPath = req.path;
  const requestBodyHash = hashString(JSON.stringify(req.body || {}));
  const redisKey = `idempotency:${merchantId}:${idempotencyKey}`;
  const ttlSeconds = 24 * 60 * 60; // 24 Hours TTL

  try {
    const redisClient = redisService.getClient();
    if (!redisClient) {
      return next(); // Fail open if Redis is down
    }

    // Atomically set a lock if not exists (in-progress lock)
    const inProgressPayload: IdempotencyRecord = {
      status: 'IN_PROGRESS',
      requestPath,
      requestBodyHash,
      responseStatus: 0,
      responseBody: '{}',
    };

    const isLockAcquired = await redisClient.set(
      redisKey,
      JSON.stringify(inProgressPayload),
      'EX',
      ttlSeconds,
      'NX' // Only set if key does not exist
    );

    if (!isLockAcquired) {
      // Key already exists, read it
      const rawRecord = await redisClient.get(redisKey);
      if (!rawRecord) {
        return next();
      }

      const record = JSON.parse(rawRecord) as IdempotencyRecord;

      if (record.status === 'IN_PROGRESS') {
        return res.status(409).json({
          error: 'Conflict',
          message: 'A request with this idempotency key is already in progress. Please wait.',
        });
      }

      // If completed, check for key collisions (same key used for different payload or route)
      if (record.requestBodyHash !== requestBodyHash || record.requestPath !== requestPath) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Idempotency key collision. The key was used for a different request body or path.',
        });
      }

      // Return the cached response from Redis
      res.status(record.responseStatus);
      res.setHeader('X-Cache-Idempotent', 'true');
      return res.send(JSON.parse(record.responseBody));
    }

    // Intercept res.send to save the response on completion
    const originalSend = res.send;
    res.send = function (body: any): Response {
      // Restore original send
      res.send = originalSend;

      const statusCode = res.statusCode;

      // If server error (500+), delete the lock to allow retries
      if (statusCode >= 500) {
        redisService.del(redisKey).catch((err) =>
          console.error('Failed to clear idempotency key on server error:', err)
        );
      } else {
        // Save the successful or client-error response in Redis
        const responseBodyStr = typeof body === 'string' ? body : JSON.stringify(body);
        const completedPayload: IdempotencyRecord = {
          status: 'COMPLETED',
          requestPath,
          requestBodyHash,
          responseStatus: statusCode,
          responseBody: responseBodyStr,
        };

        redisService.set(redisKey, JSON.stringify(completedPayload), ttlSeconds).catch((err) =>
          console.error('Failed to save completed idempotency response in Redis:', err)
        );
      }

      return originalSend.call(this, body);
    };

    next();
  } catch (error) {
    console.error('Idempotency middleware error:', error);
    next();
  }
};
export default idempotency;
