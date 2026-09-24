# Operations Guide

## Health Checks

- Liveness: `GET /api/v1/health/live`
- Readiness: `GET /api/v1/health/ready`
- Compatibility readiness endpoint: `GET /api/v1/health`

Use liveness for process restarts and readiness for load balancer membership.

## Metrics

- Prometheus endpoint: `GET /metrics`

Key application metrics:

- `http_requests_total`
- `http_request_duration_seconds`
- Default Node.js process and event-loop metrics

## Logs

The API emits structured JSON logs in production through Pino. Authorization and cookie headers are redacted.

## Common Local Commands

```bash
docker compose up -d postgres redis
npm run prisma:deploy
npm run start:dev
```

## Recovery Notes

- If Redis is down, readiness degrades and rate limiting/cache-adjacent flows are unavailable.
- If PostgreSQL is down, readiness degrades and all write/read domain flows fail.
- Pending booking payment confirmations are represented as persisted payment rows and can be reconciled by provider reference.
