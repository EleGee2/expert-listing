import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Response } from 'express';

import { RequestWithId } from '@/common/types/request-with-id';

import { MetricsService } from './metrics.service';

@Injectable()
export class MetricsMiddleware implements NestMiddleware {
  constructor(private readonly metricsService: MetricsService) {}

  use(req: RequestWithId, res: Response, next: NextFunction) {
    const startedAt = process.hrtime.bigint();

    res.on('finish', () => {
      const durationSeconds = Number(process.hrtime.bigint() - startedAt) / 1_000_000_000;

      this.metricsService.observeHttpRequest(
        req.method,
        this.getRoute(req),
        res.statusCode,
        durationSeconds,
      );
    });

    next();
  }

  private getRoute(req: RequestWithId): string {
    const routePath = typeof req.route?.path === 'string' ? req.route.path : undefined;

    if (routePath) {
      return `${req.baseUrl}${routePath}`;
    }

    return req.path
      .replace(/cm[a-z0-9]{20,}/g, ':id')
      .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ':uuid');
  }
}
