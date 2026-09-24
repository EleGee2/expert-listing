import { registerAs } from '@nestjs/config';

function parseOrigins(value: string | undefined): string[] {
  if (!value) {
    return [];
  }

  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export const appConfig = registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  name: process.env.APP_NAME ?? 'expert-listing',
  port: Number(process.env.PORT ?? 3000),
  apiPrefix: process.env.API_PREFIX ?? 'api',
  apiVersion: process.env.API_VERSION ?? '1',
  corsOrigins: parseOrigins(process.env.CORS_ORIGINS),
  databaseUrl: process.env.DATABASE_URL,
  redis: {
    host: process.env.REDIS_HOST ?? 'localhost',
    port: Number(process.env.REDIS_PORT ?? 6379),
    password: process.env.REDIS_PASSWORD || undefined,
    db: Number(process.env.REDIS_DB ?? 0),
    tls: process.env.REDIS_TLS === 'true',
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    accessTtl: process.env.JWT_ACCESS_TTL ?? '15m',
    refreshTtl: process.env.JWT_REFRESH_TTL ?? '30d',
  },
  payment: {
    provider: process.env.PAYMENT_PROVIDER ?? 'mock',
    webhookSecret: process.env.PAYMENT_WEBHOOK_SECRET,
  },
  rateLimit: {
    ttlMs: Number(process.env.RATE_LIMIT_TTL_MS ?? 60000),
    limit: Number(process.env.RATE_LIMIT_LIMIT ?? 120),
    authTtlMs: Number(process.env.AUTH_RATE_LIMIT_TTL_MS ?? 60000),
    authLimit: Number(process.env.AUTH_RATE_LIMIT_LIMIT ?? 10),
  },
}));
