# DropDate Backend

Minimal Go HTTP API that powers the `/next-release` endpoint and feeds the DropDate frontend/mobile clients.

## Prerequisites

- Go 1.21+
- [Air](https://github.com/air-verse/air) (optional, but used for dev workflow)

Install Air once:

```bash
GO111MODULE=on go install github.com/air-verse/air@latest
```

Make sure `$GOPATH/bin` is in your `PATH`, e.g. `export PATH="$HOME/go/bin:$PATH"`.

## TMDB integration

TVMaze covers series quite well, but for movies (and richer TV metadata) we also query [TMDB](https://www.themoviedb.org/). Drop your v4 read access token into the `TMDB_ACCESS_TOKEN` environment variable (or `.env` file) before starting the server:

```bash
export TMDB_ACCESS_TOKEN="eyJhbGciOiJIUzI1..."  # your token from TMDB settings
```

Alternatively copy `.env.example` to `.env` (or `.env.local`) inside `apps/backend` and fill in the token — the server auto-loads it on startup. If the variable is absent the backend simply falls back to TVMaze-only responses.

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
- `curl "http://localhost:8080/next-release?title=Dune"` – fetches the next known release date (TVMaze for shows, TMDB for movies/shows).
- `curl "http://localhost:8080/suggest?query=dune"` – lightweight TMDB suggestions for autocomplete.

## Swagger / OpenAPI

- Documentation UI is served at `http://localhost:8080/swagger/`.
- Spec lives in `apps/backend/docs/swagger/openapi.yaml`. Update it whenever you add/modify endpoints.

## Architecture at a glance

- `cmd/api/main.go` wires the HTTP server, mux, and endpoints.
- `internal/release.Service` encapsulates business logic around fetching/sanitizing release data.
- `internal/tvmaze.Client` performs outbound HTTP calls to the public [TVMaze API](https://www.tvmaze.com/api).
- `internal/tmdb.Client` queries the [TMDB API](https://developer.themoviedb.org/reference/intro) for movies, extra TV metadata, search suggestions, and poster images.
- `internal/release.Service` також має простий in-memory кеш (≈30 хв TTL), щоб не дублювати однакові запити до зовнішніх API і прискорити популярні тайтли.
- All responses are JSON-encoded; errors use idiomatic HTTP status codes (400, 404, etc.).

This service is intentionally small but production-friendly: future steps include caching, additional sources, and richer error reporting.
