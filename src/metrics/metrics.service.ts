import { Injectable } from '@nestjs/common';
import { collectDefaultMetrics, Counter, Histogram, Registry } from '@prometheus-io/client';

type HttpMetricLabels = 'method' | 'route' | 'status_code';

@Injectable()
export class MetricsService {
  private readonly registry = new Registry();
  private readonly requestCounter: Counter<HttpMetricLabels>;
  private readonly requestDuration: Histogram<HttpMetricLabels>;

  constructor() {
    this.registry.setDefaultLabels({ app: 'expert-listing' });
    collectDefaultMetrics({ register: this.registry });

    this.requestCounter = new Counter<HttpMetricLabels>({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
      registers: [this.registry],
    });
    this.requestDuration = new Histogram<HttpMetricLabels>({
      name: 'http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
      registers: [this.registry],
    });
  }

  observeHttpRequest(method: string, route: string, statusCode: number, durationSeconds: number) {
    const labels = {
      method,
      route,
      status_code: String(statusCode),
    };

    this.requestCounter.inc(labels, 1);
    this.requestDuration.observe(labels, durationSeconds);
  }

  contentType() {
    return this.registry.contentType;
  }

  metrics() {
    return this.registry.metrics();
  }
}
