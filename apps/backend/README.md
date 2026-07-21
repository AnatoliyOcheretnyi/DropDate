# DropDate Backend

Minimal Go HTTP API that powers DropDate (web + mobile). It relies solely on TMDB for data and keeps an in-memory cache to avoid hammering the public API.

## Prerequisites

- Go 1.21+
- [Air](https://github.com/air-verse/air) (optional, but used for dev workflow)

Install Air once:

```bash
GO111MODULE=on go install github.com/air-verse/air@latest
```

Make sure `$GOPATH/bin` is in your `PATH`, e.g. `export PATH="$HOME/go/bin:$PATH"`.

## TMDB integration

All metadata is fetched from [TMDB](https://www.themoviedb.org/) (both TV and movies, plus poster/backdrop images and suggestions). Drop your v4 read access token into the `TMDB_ACCESS_TOKEN` environment variable (or `.env` file) before starting the server:

```bash
export TMDB_ACCESS_TOKEN="eyJhbGciOiJIUzI1..."  # your token from TMDB settings
```

Alternatively copy `.env.example` to `.env` (or `.env.local`) inside `apps/backend` and fill in the token — the server auto-loads it on startup. The token is required; without it the API refuses to start because TMDB is the only provider.

## Local development

From repo root (recommended):

```bash
yarn dev:backend    # uses Nx target backend:serve -> air
```

Manual alternative from inside `apps/backend`:

```bash
air                # hot reload
# or
go run ./cmd/api   # no reload, simplest entry
```

The server listens on `http://localhost:8080`. Useful requests:

- `curl http://localhost:8080/health` – quick ping that returns `{"status":"ok"}`.
- `curl "http://localhost:8080/next-release?title=Dune"` – fetches the next known release date via TMDB (with a 30‑min in-memory cache).
- `curl "http://localhost:8080/suggest?query=dune"` – lightweight TMDB suggestions for autocomplete.
- `curl "http://localhost:8080/trending?window=week&limit=18"` – trending movies + series bundle.
- `curl "http://localhost:8080/details?tmdbId=603&mediaType=movie"` – full details (plus recommendations).
- `curl -X POST http://localhost:8080/bulk-next-release -d '{"titles":[{"title":"Dune","tmdbId":603,"mediaType":"movie"}]}'` – batch next-release lookup.
- `curl -H "Authorization: Bearer <token>" http://localhost:8080/saved` – get saved list for the current user.
- `curl -X POST -H "Authorization: Bearer <token>" http://localhost:8080/notifications` – get notifications + unread count.
- `curl -X POST -H "Authorization: Bearer <token>" http://localhost:8080/notifications/read -d '{"all":true}'` – mark notifications as read.
- `curl -X POST http://localhost:8080/auth/register -d '{"email":"test@dropdate.com","password":"StrongP@ss1"}'` – create account.
- `curl -X POST http://localhost:8080/auth/login -d '{"email":"test@dropdate.com","password":"StrongP@ss1"}'` – login and receive tokens.
- `curl -X POST http://localhost:8080/auth/refresh` – rotate refresh token cookie.
- `curl -X POST http://localhost:8080/auth/logout` – revoke refresh token.

## Database & migrations

The repo includes a simple migration runner and SQL files:

- SQL lives in `apps/backend/migrations`.
- `yarn db:migrate` runs `apps/backend/cmd/migrate` to apply pending migrations.
- Set `SUPABASE_CONNECTION_STRING` in `apps/backend/.env` (or `.env.local`) to point at your Supabase/Postgres instance.

Migrations currently create tables for users, refresh tokens, saved titles, and notifications.

## Notifications job

The backend runs a scheduled job that checks `follow` subscriptions and creates notifications when a movie releases or a new episode airs. You can trigger it manually via a protected endpoint:

```
POST /jobs/notifications
Authorization: Bearer <JOBS_ACCESS_TOKEN>
```

Environment variables:

- `JOBS_ACCESS_TOKEN` – shared secret for the job endpoint.
- `NOTIFICATIONS_JOB_INTERVAL` – schedule interval (default `24h`, set to `0` to disable).

All `/jobs/*` endpoints fail closed when `JOBS_ACCESS_TOKEN` is missing. Configure
the token in every deployed environment before enabling external cron calls.

## Production safety configuration

- `HTTP_MAX_BODY_BYTES` – maximum request body size (default `1048576`).
- `HTTP_RATE_LIMIT_PER_MINUTE` – general per-instance client limit (default `240`).
- `AUTH_RATE_LIMIT_PER_MINUTE` – stricter auth limit (default `20`).
- `EXPENSIVE_RATE_LIMIT_PER_MINUTE` – AI, game and job limit (default `30`).
- `SUPERUSER_EMAILS` – comma-separated privileged account emails.
- `DB_MAX_OPEN_CONNS` / `DB_MAX_IDLE_CONNS` – database pool bounds.
- `DB_CONN_MAX_LIFETIME` / `DB_CONN_MAX_IDLE_TIME` – pool recycling intervals.

## Swagger / OpenAPI

- Documentation UI is served at `http://localhost:8080/swagger/`.
- Spec lives in `apps/backend/docs/swagger/openapi.yaml`. Update it whenever you add/modify endpoints.

## Architecture at a glance

- `cmd/api/main.go` wires the HTTP server, mux, and endpoints.
- `internal/release.Service` encapsulates business logic around fetching/sanitizing release data and keeps an in-memory cache (≈30 хв TTL) keyed by TMDB hints.
- `internal/tmdb.Client` queries the [TMDB API](https://developer.themoviedb.org/reference/intro) for movies/series, search suggestions, and poster/backdrop images.
- `cmd/migrate` applies SQL migrations using `SUPABASE_CONNECTION_STRING`.
- `internal/auth` handles registration/login, password hashing, and JWT issuance (refresh token stored in DB).
- All responses are JSON-encoded; errors use idiomatic HTTP status codes (400, 404, etc.).

This service is intentionally small but production-friendly: future steps include more caching strategies, additional providers if needed, and richer error reporting.
