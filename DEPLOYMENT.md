# Deployment Guide

## Runtime Requirements

- Node.js 22 or Docker.
- PostgreSQL 16+.
- Redis 7+.
- Strong JWT and webhook secrets supplied through the platform secret manager.

## Required Commands

```bash
npm ci
npm run prisma:generate
npm run prisma:deploy
npm run build
npm run start:prod
```

## Docker Deployment

```bash
docker build -t expert-listing-api .
docker run --env-file .env -p 3000:3000 expert-listing-api
```

## Release Checklist

- Run `npm run verify`.
- Run `npm run prisma:deploy` against the target database before starting new API instances.
- Confirm `/api/v1/health/ready` returns `status: ok`.
- Confirm `/metrics` is scraped by the monitoring system.
- Rotate any local development secrets before production use.
