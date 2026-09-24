import { Inject, Injectable } from '@nestjs/common';
import { ThrottlerStorage } from '@nestjs/throttler';
import { ThrottlerStorageRecord } from '@nestjs/throttler/dist/throttler-storage-record.interface';
import Redis from 'ioredis';

import { REDIS_CLIENT } from '@/redis/redis.constants';

@Injectable()
export class RedisThrottlerStorage implements ThrottlerStorage {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<ThrottlerStorageRecord> {
    if (this.redis.status === 'wait' || this.redis.status === 'end') {
      await this.redis.connect();
    }

    const namespacedKey = `throttle:${throttlerName}:${key}`;
    const blockKey = `${namespacedKey}:blocked`;
    const result = (await this.redis.eval(
      `
      local blockTtl = redis.call('pttl', KEYS[2])
      if blockTtl > 0 then
        local currentHits = tonumber(redis.call('get', KEYS[1]) or '0')
        local ttl = redis.call('pttl', KEYS[1])
        return { currentHits, ttl, 1, blockTtl }
      end

      local currentHits = redis.call('incr', KEYS[1])
      if currentHits == 1 then
        redis.call('pexpire', KEYS[1], ARGV[1])
      end

      local ttl = redis.call('pttl', KEYS[1])
      if currentHits > tonumber(ARGV[2]) then
        redis.call('set', KEYS[2], '1', 'PX', ARGV[3])
        return { currentHits, ttl, 1, tonumber(ARGV[3]) }
      end

      return { currentHits, ttl, 0, 0 }
      `,
      2,
      namespacedKey,
      blockKey,
      ttl,
      limit,
      blockDuration,
    )) as [number, number, number, number];

    return {
      totalHits: Number(result[0]),
      timeToExpire: Math.max(0, Math.ceil(Number(result[1]) / 1000)),
      isBlocked: Number(result[2]) === 1,
      timeToBlockExpire: Math.max(0, Math.ceil(Number(result[3]) / 1000)),
    };
  }
}
