# Security Notes

## Implemented Controls

- JWT access tokens and rotating refresh tokens.
- Refresh tokens are stored as SHA-256 hashes.
- Global authentication guard with explicit `@Public()` opt-out.
- Role-based authorization guard.
- Redis-backed rate limiting for horizontal scale.
- Helmet security headers.
- CORS allowlist through `CORS_ORIGINS`.
- Request validation with DTO whitelisting and `forbidNonWhitelisted`.
- Structured errors without raw stack traces in responses.
- Signed mock payment webhook through `x-payment-signature`.
- Authorization and cookie headers are redacted from logs.

## Outstanding Security Work

- Replace mock payment provider with Paystack/Stripe provider before real money movement.
- Add refresh-token device metadata and suspicious-session revocation if needed.
- Add admin user provisioning workflow outside public registration.
- Keep `npm run audit:high` in CI and review any new findings before production release.
- Add API gateway or WAF rules for production abuse controls.
