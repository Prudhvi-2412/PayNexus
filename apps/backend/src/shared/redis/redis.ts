import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

class RedisService {
  private client: Redis | null = null;
  private isConnected = false;

  constructor() {
    this.connect();
  }

  private connect() {
    try {
      this.client = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        retryStrategy(times) {
          const delay = Math.min(times * 100, 3000);
          return delay;
        },
      });

      this.client.on('connect', () => {
        console.log('Redis connected successfully.');
        this.isConnected = true;
      });

      this.client.on('error', (err) => {
        console.warn('Redis connection error:', err.message);
        this.isConnected = false;
      });
    } catch (error) {
      console.warn('Failed to initialize Redis client:', error);
    }
  }

  public getClient(): Redis | null {
    return this.client;
  }

  public async get(key: string): Promise<string | null> {
    if (!this.isConnected || !this.client) return null;
    try {
      return await this.client.get(key);
    } catch (err) {
      console.error(`Redis GET error for key ${key}:`, err);
      return null;
    }
  }

  public async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (!this.isConnected || !this.client) return;
    try {
      if (ttlSeconds) {
        await this.client.set(key, value, 'EX', ttlSeconds);
      } else {
        await this.client.set(key, value);
      }
    } catch (err) {
      console.error(`Redis SET error for key ${key}:`, err);
    }
  }

  public async del(key: string): Promise<void> {
    if (!this.isConnected || !this.client) return;
    try {
      await this.client.del(key);
    } catch (err) {
      console.error(`Redis DEL error for key ${key}:`, err);
    }
  }

  /**
   * Distributed Lock: Acquire lock atomically using SET NX PX
   */
  public async acquireLock(lockKey: string, lockValue: string, ttlMs: number): Promise<boolean> {
    if (!this.isConnected || !this.client) return true; // Fail open to avoid deadlocks
    try {
      const result = await this.client.set(lockKey, lockValue, 'NX', 'PX', ttlMs);
      return result === 'OK';
    } catch (err) {
      console.error(`Redis Lock acquire error for key ${lockKey}:`, err);
      return true; // Fail open
    }
  }

  /**
   * Distributed Lock: Release lock atomically using custom Lua script
   */
  public async releaseLock(lockKey: string, lockValue: string): Promise<boolean> {
    if (!this.isConnected || !this.client) return true;
    try {
      const releaseScript = `
        if redis.call("get", KEYS[1]) == ARGV[1] then
          return redis.call("del", KEYS[1])
        else
          return 0
        end
      `;
      const result = await this.client.eval(releaseScript, 1, lockKey, lockValue);
      return result === 1;
    } catch (err) {
      console.error(`Redis Lock release error for key ${lockKey}:`, err);
      return true;
    }
  }

  /**
   * Token Bucket Rate Limiter using Redis Lua script.
   * keyPrefix: Rate limit scope
   * capacity: Max bucket size
   * refillRate: Token replenishment speed per second
   * requested: Number of tokens needed (defaults to 1)
   */
  public async rateLimitTokenBucket(
    key: string,
    capacity: number,
    refillRate: number,
    requested: number = 1
  ): Promise<{ allowed: boolean; remaining: number }> {
    if (!this.isConnected || !this.client) {
      return { allowed: true, remaining: capacity };
    }

    try {
      const tokenBucketScript = `
        local key = KEYS[1]
        local capacity = tonumber(ARGV[1])
        local refill_rate = tonumber(ARGV[2])
        local now = tonumber(ARGV[3])
        local requested = tonumber(ARGV[4])

        local data = redis.call('HMGET', key, 'tokens', 'last_refreshed')
        local tokens = tonumber(data[1])
        local last_refreshed = tonumber(data[2])

        if not tokens then
          tokens = capacity
          last_refreshed = now
        else
          local elapsed = math.max(0, now - last_refreshed)
          local refill = elapsed * refill_rate
          tokens = math.min(capacity, tokens + refill)
          last_refreshed = now
        end

        local allowed = 0
        if tokens >= requested then
          tokens = tokens - requested
          allowed = 1
        end

        redis.call('HMSET', key, 'tokens', tokens, 'last_refreshed', last_refreshed)
        redis.call('EXPIRE', key, math.ceil(capacity / refill_rate) + 60)

        return {allowed, math.floor(tokens)}
      `;

      const nowInSeconds = Math.floor(Date.now() / 1000);
      const results = await this.client.eval(
        tokenBucketScript,
        1,
        key,
        capacity.toString(),
        refillRate.toString(),
        nowInSeconds.toString(),
        requested.toString()
      ) as [number, number];

      const allowed = results[0] === 1;
      const remaining = results[1];

      return { allowed, remaining };
    } catch (err) {
      console.error(`Token bucket rate limit execution error:`, err);
      return { allowed: true, remaining: capacity };
    }
  }

  /**
   * Tracks routing statistics for different bank gateways (e.g. HDFC, ICICI)
   */
  public async recordGatewayTransaction(gateway: string, status: 'SUCCESS' | 'FAILURE'): Promise<void> {
    if (!this.isConnected || !this.client) return;
    try {
      const key = `gateway:stats:${gateway}`;
      const field = status === 'SUCCESS' ? 'success' : 'failure';
      await this.client.hincrby(key, field, 1);
      // Expire stats after 1 hour to focus on recent health
      await this.client.expire(key, 3600);
    } catch (err) {
      console.error('Failed to log gateway stats to Redis:', err);
    }
  }

  public async getGatewayStats(gateway: string): Promise<{ success: number; failure: number }> {
    if (!this.isConnected || !this.client) return { success: 0, failure: 0 };
    try {
      const stats = await this.client.hmget(`gateway:stats:${gateway}`, 'success', 'failure');
      return {
        success: parseInt(stats[0] || '0', 10),
        failure: parseInt(stats[1] || '0', 10),
      };
    } catch (err) {
      return { success: 0, failure: 0 };
    }
  }
}

export const redisService = new RedisService();
export default redisService;
