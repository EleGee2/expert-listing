import { Global, Module, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

import { REDIS_CLIENT } from './redis.constants';
import { RedisService } from './redis.service';

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new Redis({
          host: config.getOrThrow<string>('app.redis.host'),
          port: config.getOrThrow<number>('app.redis.port'),
          password: config.get<string>('app.redis.password'),
          db: config.getOrThrow<number>('app.redis.db'),
          tls: config.getOrThrow<boolean>('app.redis.tls') ? {} : undefined,
          lazyConnect: true,
          maxRetriesPerRequest: 3,
          enableReadyCheck: true,
        }),
    },
    RedisService,
  ],
  exports: [REDIS_CLIENT, RedisService],
})
export class RedisModule implements OnApplicationShutdown {
  constructor(private readonly redisService: RedisService) {}

  async onApplicationShutdown() {
    await this.redisService.quit();
  }
}
