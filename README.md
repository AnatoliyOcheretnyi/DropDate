# DropDate Monorepo

DropDate is a small playground for tracking the next release date of a show or movie. The repository now runs as an Nx-powered monorepo and ships a Go backend plus a Next.js frontend (mobile client is in progress).

## Stack

- **Backend (`apps/backend`)** — Go HTTP API that proxies TVMaze and exposes `/health` + `/next-release` endpoints.
- **Frontend (`apps/frontend`)** — Next.js 14 single page that queries the API via `/api/next-release` (responsive layout, UA copy).
- **Mobile** — TBD/in progress; will live next to `apps/backend` and `apps/frontend` once bootstrapped.

## Getting Started

```bash
yarn install
```

Environment tweaks:
- Backend uses Go defaults; no env file is required yet.
- Frontend reads `BACKEND_URL` from `apps/frontend/.env.local` (copy `.env.example`).

## Useful Commands

All commands execute from repo root and delegate to Nx targets.

| Command | Description |
| --- | --- |
| `yarn dev:backend` | Run Go API via Air (`apps/backend`). |
| `yarn dev:frontend` | Run Next.js dev server on port 3000. |
| `yarn build` | Build every project respecting Nx cache. |
| `yarn lint` | Run `go vet` + `next lint`. |
| `yarn test` | Execute backend `go test` (extend when frontend tests arrive). |
| `yarn nx graph` | Visualize project dependency graph. |

## Nx Notes

- Projects are declared in `nx.json` and corresponding `apps/*/project.json` files.
- Add new apps/libs by extending `projects` or running `yarn nx g @nx/workspace:project ...`.
- Remote caching (Nx Cloud) is disabled for now; enable later with `yarn nx connect-to-nx-cloud`.

## Roadmap

- Polish backend integration with more providers.
- Flesh out the mobile client (currently work in progress).
- Add automated tests for frontend (Playwright/RTL) and contract tests for API.
