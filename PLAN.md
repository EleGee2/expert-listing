# Expert Listing API Plan

## Build Phases

- [x] Phase 1: Foundation scaffold, production baseline, PostgreSQL, Redis, health checks, API docs.
- [x] Phase 2: Identity and access with users, auth, JWT refresh tokens, roles, and rate limiting.
- [x] Phase 3: Expert marketplace with categories, expert profiles, services, reviews, favorites, and search.
- [x] Phase 4: Booking and payments as a production-ready optional module with provider abstraction and webhooks.
- [x] Phase 5: Hardening with observability, CI, deployment docs, performance testing, and security review.

## Phase 1 Scope

- [x] Create NestJS project scaffold.
- [x] Add strict TypeScript, ESLint, Prettier, Jest, and e2e setup.
- [x] Add environment validation.
- [x] Add structured logging.
- [x] Add global validation, error handling, request IDs, CORS, Helmet, and versioned REST prefix.
- [x] Add Prisma/PostgreSQL wiring.
- [x] Add Redis wiring.
- [x] Add health checks.
- [x] Add Swagger/OpenAPI docs.
- [x] Add Dockerfile and Docker Compose.
- [x] Add README and env example.

## Phase 1 Review

- Project lives at `/Users/jerome/Downloads/expert-listing`.
- REST routes are globally prefixed with `/api/v1`.
- Swagger is available at `/docs`.
- Health endpoint is available at `/api/v1/health`.
- Prisma schema includes foundational models for the later phases: users, experts, categories, services, reviews, favorites, availability, bookings, payments, refresh tokens, audit logs, and outbox events.
- Local verification passed: `npm run lint`, `npm run test`, `npm run test:e2e`, and `npm run build`.
- Docker verification passed: API, PostgreSQL, and Redis are running through Compose; live health returns `status: ok`.
- Docker host ports are `3001` for API, `55433` for PostgreSQL, and `56380` for Redis to avoid existing local port conflicts.
- Known follow-up: `npm audit` reports three high-severity dependency findings in the current dependency tree. Do not run `npm audit fix --force` blindly; review during Phase 5 hardening or pin safer compatible versions earlier if needed.

## Phase 2 Review

- Added `AuthModule` with register, login, refresh, and logout endpoints.
- Added rotating refresh tokens persisted as SHA-256 hashes in PostgreSQL.
- Added access-token JWT guard as a global guard; routes are protected by default unless decorated with `@Public()`.
- Added global roles guard and `@Roles()` decorator.
- Added `UsersModule` with `GET /api/v1/users/me` and `PATCH /api/v1/users/me`.
- Added Redis-backed throttling through Nest throttler storage, making rate limits safe across multiple API instances.
- Added unit coverage for auth registration token issuance and invalid login handling.
- Local verification passed: `npm run lint`, `npm run test`, `npm run test:e2e`, and `npm run build`.
- Docker verification passed: rebuilt API image, confirmed health status is `ok`, and smoke-tested register, authenticated `users/me`, refresh rotation, logout, and revoked refresh-token rejection.

## Phase 3 Review

- Added public category listing and admin-only category creation.
- Added public expert search/filtering with pagination.
- Added expert profile creation/update with owner/admin authorization.
- Added expert service creation/update/listing.
- Added expert reviews with one review per user/expert and self-review prevention.
- Added favorites add/remove/list endpoints.
- Kept booking and payments deferred to Phase 4.
- Local verification passed: `npm run lint`, `npm run test`, `npm run test:e2e`, and `npm run build`.
- Docker verification passed: rebuilt API image, confirmed health status is `ok`, seeded categories, and smoke-tested register expert, create expert profile, create service, register customer, review, favorite, detail, and expert search.
- Dockerfile now retries `prisma generate` during image builds to tolerate transient Prisma binary download/checksum failures.

## Phase 4 Review

- Added expert availability slot creation/listing.
- Added booking creation with service pricing snapshot, overlap checks, optional availability-slot locking, and pending payment creation.
- Added customer/expert/admin booking access control.
- Added booking list/detail/cancel/complete endpoints.
- Added mock payment provider abstraction and signed mock payment webhook confirmation.
- Added outbox event creation on payment-confirmed booking confirmation.
- Local verification passed: `npm run lint`, `npm run test`, `npm run test:e2e`, and `npm run build`.
- Docker verification passed: rebuilt API image, confirmed health status is `ok`, seeded categories, and smoke-tested expert/service/availability creation, customer booking creation, signed mock payment confirmation, booking completion, and booking listing.

## Phase 5 Review

- Added Prometheus-compatible `/metrics` endpoint with default Node.js metrics plus HTTP request counters and duration histograms.
- Added `/api/v1/health/live` and `/api/v1/health/ready` while preserving `/api/v1/health`.
- Added response compression and `trust proxy` configuration for production load balancer deployments.
- Added `.github/workflows/ci.yml` with PostgreSQL and Redis services, migrations, lint, tests, e2e tests, and build.
- Added `DEPLOYMENT.md`, `OPERATIONS.md`, and `SECURITY.md`.
- Added `typecheck`, `audit:high`, and `verify` npm scripts.
- Resolved the prior high-severity npm audit finding by pinning `prisma` and `@prisma/client` to `6.12.0`; `npm audit --audit-level=high` now reports `found 0 vulnerabilities`.
- Local verification passed: `npm run typecheck`, `npm run lint`, `npm run test`, `npm run test:e2e`, `npm run build`, and `npm audit --audit-level=high`.
- Docker verification passed: rebuilt API image, confirmed liveness/readiness, and verified `/metrics` exposition.

## Lessons

- Never add `Co-Authored-By: Claude` (or "Generated with Claude Code") attribution to commit messages or PR descriptions. Plain commit messages only.
