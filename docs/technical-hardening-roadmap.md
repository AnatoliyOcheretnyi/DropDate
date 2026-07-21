# DropDate technical hardening roadmap

Updated: 2026-07-22

This document records the technical assessment after frontend commit `0b7e1f7`
and backend commit `cdd90b0`. It is a prioritized maintenance roadmap, not a
blocker for continued product development.

## Current state

| Area | Rating | Notes |
| --- | ---: | --- |
| Frontend engineering | 7.5/10 | Reliable quality targets and production build |
| Frontend release safety | 8/10 | CI blocks deploy on lint, typecheck, tests, build and smoke tests |
| Backend security | 7/10 | Jobs, body limits, rate limits and configuration were hardened |
| Backend operations | 6/10 | DB pool and deploy gates exist; multi-instance jobs remain a risk |
| Backend tests | 4.5/10 | Race-clean, but overall coverage is 18.6% |
| Overall production readiness | 7/10 | Suitable for controlled releases with the remaining risks tracked below |

## Completed hardening

### Frontend

- Added Nx lint, typecheck, unit, e2e and build targets.
- Added Vitest and Playwright desktop/mobile smoke coverage.
- Added CI quality gates before Vercel deployment.
- Added CSP and baseline security headers.
- Added route-level loading, error and not-found states.
- Added offline messaging and reduced-motion support.
- Added a vendor-neutral analytics event layer.
- Added a shared backend proxy with normalized errors and timeouts.
- Removed all current `next/no-img-element` warnings.
- Made the changelog version testable against `VERSION`.

### Backend

- Made `/jobs/*` authentication fail closed.
- Added constant-time service-token comparison.
- Added request body and per-route-class rate limits.
- Separated long-running job timeouts from normal request timeouts.
- Added explicit database connection pool settings.
- Moved superuser accounts to `SUPERUSER_EMAILS` configuration.
- Added vet, test, build and race gates before Render deployment.
- Added security, configuration, JWT and password-policy tests.
- Increased overall coverage from 17% to 18.6%.

## Prioritized next work

### P0 — data and authorization safety

1. Run PostgreSQL in CI and test migrations from an empty database through the
   latest migration.
2. Add integration tests for auth registration, login, refresh rotation,
   revocation and email verification.
3. Add permission tests for friends, social lists, recommendations, dev tools
   and job endpoints.
4. Add PostgreSQL advisory locks or a dedicated worker so scheduled jobs run
   once when multiple backend replicas are active.

### P1 — distributed production reliability

1. Replace the per-instance rate limiter with Redis- or PostgreSQL-backed
   limiting before horizontally scaling the API.
2. Add structured JSON logs, request/job metrics and DB pool telemetry.
3. Add a post-deployment `/ready` smoke check to the Render workflow.
4. Stop ignoring notification-side-effect errors; log and measure failed
   notification creation explicitly.
5. Introduce a backend coverage threshold at 35%, then raise it toward 50–60%.

### P2 — frontend confidence

1. Add authenticated Playwright flows for login, saved lists, daily pick,
   onboarding and friends.
2. Migrate the remaining BFF routes to the shared backend proxy.
3. Add unit/integration coverage around optimistic saved updates and auth token
   refresh behavior.
4. Reduce unnecessary `"use client"` boundaries and move static rendering back
   to Server Components where practical.
5. Connect the analytics event layer to the selected production analytics
   destination and document the event schema.

### P3 — maintainability and API contracts

1. Split `internal/tmdb/client.go` into transport, movie, TV, discovery,
   details and mapping modules.
2. Decompose the largest release, recommendation, saved and frontend UI modules.
3. Expand or generate OpenAPI coverage for all registered backend routes. The
   current specification covers only 9 of 66 routes.
4. Add contract tests that detect drift between registered routes and OpenAPI.
5. Add automated dependency and vulnerability scanning.

## Configuration required before deployment

```env
JOBS_ACCESS_TOKEN=<long-random-secret>
SUPERUSER_EMAILS=<comma-separated-admin-emails>
```

Review DB pool and request-limit defaults in `apps/backend/.env.example` for the
production plan before increasing instance count or traffic.
