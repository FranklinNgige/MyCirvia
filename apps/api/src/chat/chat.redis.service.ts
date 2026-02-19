import { Injectable } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class ChatRedisService {
  private readonly redis?: Redis;
  private readonly map = new Map<string, string>();
  private readonly counters = new Map<string, { count: number; resetAt: number }>();

  constructor() {
    const redisUrl = process.env.REDIS_URL;
    if (redisUrl) {
      this.redis = new Redis(redisUrl, { lazyConnect: true, maxRetriesPerRequest: 1 });
      void this.redis.connect().catch(() => undefined);
    }
  }

  async setUserSocket(userId: string, socketId: string): Promise<void> {
    if (this.redis) {
      await this.redis.set(`ws:user:${userId}`, socketId, 'EX', 60 * 60);
      return;
    }
    this.map.set(userId, socketId);
  }

  async removeUserSocket(userId: string): Promise<void> {
    if (this.redis) {
      await this.redis.del(`ws:user:${userId}`);
      return;
    }
    this.map.delete(userId);
  }

  async getUserSocket(userId: string): Promise<string | null> {
    if (this.redis) {
      return this.redis.get(`ws:user:${userId}`);
    }
    return this.map.get(userId) ?? null;
  }

  async hitRateLimit(userId: string, limit: number, windowSeconds: number): Promise<boolean> {
    if (this.redis) {
      const key = `ws:rate:${userId}`;
      const count = await this.redis.incr(key);
      if (count === 1) {
        await this.redis.expire(key, windowSeconds);
      }
      return count > limit;
    }

    const now = Date.now();
    const existing = this.counters.get(userId);
    if (!existing || existing.resetAt <= now) {
      this.counters.set(userId, { count: 1, resetAt: now + windowSeconds * 1000 });
      return false;
    }

    existing.count += 1;
    return existing.count > limit;
  }
}
