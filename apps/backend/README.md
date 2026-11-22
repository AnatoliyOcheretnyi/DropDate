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

## Localized titles, descriptions and search

Engineering rules for all Gemini integrations: [token and request efficiency](docs/gemini-efficiency.md).

TMDB responses use Ukrainian text first and English text for missing descriptions
or untranslated titles. Each field is resolved independently; a missing synopsis
never replaces an existing Ukrainian title. Episode text follows the same policy.
If neither translation exists, the original title remains and the description
stays empty unless another source synopsis can be translated. English lookups
are cached and time bounded; their failure does not fail the primary request.

With `GEMINI_API_KEY` configured, `AI_TRANSLATIONS_ENABLED=true` (default) fills
missing Ukrainian titles and descriptions using the configured `GEMINI_MODEL`.
List/search responses translate missing titles in batches (up to 50 per response),
and saved lists resolve current names by TMDB identity instead of returning the
old title stored when the item was saved. Descriptions are translated on detail
requests. An English synopsis is preferred as the source, or
an existing original-language synopsis when English is absent. An empty source
is never sent for plot generation. Verified Ukrainian text and editorial
overrides take priority. Model output is validated for language and empty fields,
but automatic translation can still contain mistakes.

The optional `translation` response field identifies machine-translated fields
(`title`, `overview`) and preserves `originalTitle`. It also exposes separate
`titleIsMachineTranslated` and `overviewIsMachineTranslated` booleans. Details,
search suggestions and saved-list names retain this provenance; saved cards and
detail pages display a notice. These names are not official release names.

With a database configured, successful translations are written immediately to
PostgreSQL `title_translations` (migration `024_title_translations.sql`). Rows are
keyed by TMDB ID, media type and language; they retain the source text, translated
text, model/provider and update time. Generated boolean columns
`title_is_machine_translated` and `overview_is_machine_translated` identify each
nonempty machine-translated field. Original TMDB records and user-owned saved
rows are not rewritten. There is no TTL or 10,000-row eviction in the database.

Run `npx nx run backend:migrate` before starting the updated backend. On startup,
the legacy file is imported without overwriting existing database rows. Requests
check the shared database by identity, including translations written by another
replica after startup. The local file is now optional for durable translations;
it still stores learned search aliases. Failed database writes stay pending and
are retried by the periodic flush; the optional file provides a local fallback.
An unavailable database cannot guarantee durability until a write succeeds.

Stored translations are reused while their source text matches. New model
requests are bounded to five seconds, two
concurrent calls and twenty calls per minute per process. Failures have a
five-minute cooldown and retain the original/English response without failing
the detail page. Set `AI_TRANSLATIONS_ENABLED=false` to disable new model calls;
already saved translations remain readable without a Gemini key.

The search/autocomplete catalog learns original, localized and alternative names
from fetched TMDB records. It normalizes punctuation, accents and whitespace and
supports one-edit typos in titles of at least five characters. It supplements
empty or single-page TMDB results, deduplicating by media type and ID; broad,
multi-page searches retain TMDB pagination. This is an incremental catalog, not
a complete Ukrainian index of every TMDB title.

`TMDB_TITLE_CATALOG_PATH` defaults to `.cache/title-catalog.json`, relative to the
backend working directory. Up to 10,000 learned titles are persisted every 30
seconds and on graceful shutdown. PostgreSQL stores translations independently
of this file. Without a database, use a persistent volume for file durability.
Replicas share PostgreSQL translations but must not share the same catalog file.

Editorial search aliases ship in `internal/tmdb/title_aliases.json`. To add private
corrections without rebuilding, set `TMDB_TITLE_OVERRIDES_PATH` to a JSON file with
the same array format and restart the backend. Entries require `id`, `mediaType`
(`movie` or `tv`) and `aliases`. Optional `title` and `overview` override display
text; `searchTitle` and `year` seed a search-only entry until TMDB metadata is
loaded. Leave `title` unset for unofficial Ukrainian search variants. Record the
source in `source`; verify the TMDB ID rather than matching by translated name.

The bundled Jean-Marc entry (movie 442269) includes Ukrainian search aids; they
are not presented as an official Ukrainian release title.

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
