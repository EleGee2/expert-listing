# Expert Listing API

Production-grade REST API for an expert marketplace/listing platform.

## Current Phase

Phase 1 is the foundation: NestJS, PostgreSQL, Prisma, Redis, Docker, health checks, Swagger, structured logging, and production bootstrap patterns.

## Stack

- NestJS 11
- PostgreSQL
- Prisma
- Redis
- BullMQ-ready infrastructure
- Swagger/OpenAPI
- Pino structured logging
- Jest and Supertest

## Setup

```bash
npm install
cp .env.example .env
docker compose up -d postgres redis
npm run prisma:generate
npm run prisma:migrate
npm run start:dev
```

## Docker

```bash
docker compose up --build
```

When running through Docker Compose, the API is exposed on `http://localhost:3001` to avoid conflicts with other local apps using port `3000`.

## Useful URLs

- API base: `http://localhost:3000/api/v1`
- Health: `http://localhost:3000/api/v1/health`
- Liveness: `http://localhost:3000/api/v1/health/live`
- Readiness: `http://localhost:3000/api/v1/health/ready`
- Swagger: `http://localhost:3000/docs`
- Metrics: `http://localhost:3000/metrics`

Local Docker exposes PostgreSQL on `localhost:55433` and Redis on `localhost:56380` to avoid conflicts with existing local services.

## Phase 2 Endpoints

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `GET /api/v1/users/me`
- `PATCH /api/v1/users/me`

Protected endpoints require `Authorization: Bearer <accessToken>`.

## Phase 3 Endpoints

- `GET /api/v1/categories`
- `POST /api/v1/categories` Admin only
- `GET /api/v1/experts`
- `POST /api/v1/experts`
- `GET /api/v1/experts/:id`
- `PATCH /api/v1/experts/:id`
- `GET /api/v1/experts/:id/services`
- `POST /api/v1/experts/:id/services`
- `PATCH /api/v1/experts/:id/services/:serviceId`
- `GET /api/v1/experts/:id/reviews`
- `POST /api/v1/experts/:id/reviews`
- `POST /api/v1/experts/:id/favorite`
- `DELETE /api/v1/experts/:id/favorite`
- `GET /api/v1/favorites/me`

Expert search supports `q`, `categorySlug`, `city`, `country`, `minRateMinor`, `maxRateMinor`, `page`, and `limit` query params.

## Phase 4 Endpoints

- `GET /api/v1/experts/:expertId/availability`
- `POST /api/v1/experts/:expertId/availability`
- `POST /api/v1/bookings`
- `GET /api/v1/bookings/me`
- `GET /api/v1/bookings/:id`
- `POST /api/v1/bookings/:id/cancel`
- `POST /api/v1/bookings/:id/complete`
- `POST /api/v1/payments/webhooks/mock`

Mock payment webhooks require `x-payment-signature` to match `PAYMENT_WEBHOOK_SECRET`.

## Verification

```bash
npm run typecheck
npm run lint
npm run test
npm run test:e2e
npm run build
npm run audit:high
```

## Phases

See `PLAN.md` for the phased build plan.
