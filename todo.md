# Project Todo (prioritized)

This file lists recommended improvements, grouped by area and ordered roughly by impact and effort.

Security
- Enforce strong password hashing (argon2), validate inputs server-side, add rate limiting and account lockouts.
- Short-lived JWTs + refresh token rotation and secure cookie storage.
- Add Helmet and strict CORS policy.

Testing & CI
- Add unit tests (Jest) for backend logic and frontend components.
- Add API integration tests (supertest) for auth and match flows.
- Add an end-to-end test suite (Playwright/Cypress).
- Add GitHub Actions: lint, test, build.

Observability
- Add structured logging (winston/pino) and centralized error tracking (Sentry).
- Expose basic metrics and health endpoints for Prometheus.

Performance & Reliability
- Add indexes for frequently queried columns and review SQL queries.
- Add Redis for caching hot reads and session storage.
- Use DB transactions for match creation and scoring.

Realtime & Scaling
- Use a socket adapter (Redis) for multi-instance scaling.
- Protect against abusive websocket usage and add limits.

Frontend UX & Accessibility
- Improve ARIA attributes and keyboard navigation.
- Add loading and error states; run Lighthouse and fix top issues.

Code Quality & DX
- Add ESLint + Prettier and Husky pre-commit hooks.
- Consider incremental TypeScript migration for backend and frontend.

Database & Migrations
- Add formal migrations (Prisma Migrate, Knex, or Flyway) instead of raw SQL files.
- Improve seed scripts and make them idempotent.

Documentation
- Expand `README.md` with architecture overview, API docs, and run/debugging tips.
- Add a `CONTRIBUTING.md` with PR and branching guidelines.

Quick wins (pick first)
1. Add `helmet` and a CORS whitelist in the backend.
2. Enforce bcrypt/argon2 and password rules in `User` model.
3. Add a small Jest test for the auth endpoints and run it in CI.

If you'd like, I can implement the quick wins now and open a PR with the changes.
