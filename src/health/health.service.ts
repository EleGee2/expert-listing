import { Injectable } from '@nestjs/common';

import { PrismaService } from '@/database/prisma.service';
import { RedisService } from '@/redis/redis.service';

type DependencyStatus = 'up' | 'down';

@Injectable()
export class HealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  live() {
    return {
      status: 'ok',
      uptime: process.uptime(),
    };
  }

  async check() {
    const [database, redis] = await Promise.all([this.checkDatabase(), this.checkRedis()]);
    const dependencies = { database, redis };
    const status = Object.values(dependencies).every((dependency) => dependency.status === 'up')
      ? 'ok'
      : 'degraded';

    return {
      status,
      uptime: process.uptime(),
      dependencies,
    };
  }

  private async checkDatabase(): Promise<{ status: DependencyStatus; latencyMs?: number; error?: string }> {
    const startedAt = Date.now();

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'up', latencyMs: Date.now() - startedAt };
    } catch (error) {
      return { status: 'down', error: error instanceof Error ? error.message : 'Unknown database error' };
    }
  }

  private async checkRedis(): Promise<{ status: DependencyStatus; latencyMs?: number; error?: string }> {
    const startedAt = Date.now();

    try {
      await this.redis.ping();
      return { status: 'up', latencyMs: Date.now() - startedAt };
    } catch (error) {
      return { status: 'down', error: error instanceof Error ? error.message : 'Unknown Redis error' };
    }
  }
}
