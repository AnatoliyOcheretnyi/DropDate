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
- `curl "http://localhost:8080/next-release?title=Dune"` – fetches the next known release date from TVMaze.

## Swagger / OpenAPI

- Documentation UI is served at `http://localhost:8080/swagger/`.
- Spec lives in `apps/backend/docs/swagger/openapi.yaml`. Update it whenever you add/modify endpoints.

## Architecture at a glance

- `cmd/api/main.go` wires the HTTP server, mux, and endpoints.
- `internal/release.Service` encapsulates business logic around fetching/sanitizing release data.
- `internal/tvmaze.Client` performs outbound HTTP calls to the public [TVMaze API](https://www.tvmaze.com/api).
- All responses are JSON-encoded; errors use idiomatic HTTP status codes (400, 404, etc.).

This service is intentionally small but production-friendly: future steps include caching, additional sources (TMDB), and richer error reporting.
