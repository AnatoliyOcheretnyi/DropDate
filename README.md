# DropDate Monorepo

DropDate is a small playground for tracking the next release date of a show or movie. The repository runs as an Nx-powered monorepo and ships a Go backend, a Next.js frontend, and an Expo-based mobile client (draft/mocked).

## Stack

- **Backend (`apps/backend`)** — Go HTTP API that talks to TMDB for both series and movies; exposes releases/search/details/saved lists + notifications; runs a scheduled notifications job; caches popular titles in‑memory.
- **Frontend (`apps/frontend`)** — Next.js 14 app with trending rows, full search, details page, saved lists, and profile activity center (bell + notifications). All traffic goes through internal API routes (`/api/*`).
- **Mobile (`apps/mobile`)** — Expo Router TypeScript app mimicking the web design; points directly to the Go API via `EXPO_PUBLIC_BACKEND_URL`. Draft state only.

## Getting Started

```bash
yarn install
```

Environment tweaks:
- Backend requires `TMDB_ACCESS_TOKEN` (v4 read token). Copy `apps/backend/.env.example` → `.env` (or `.env.local`) and place your TMDB token there, or export it manually before running `yarn dev:backend`.
- Backend migrations use `SUPABASE_CONNECTION_STRING` (`apps/backend/.env`) and run via `yarn db:migrate`.
- Backend notification job endpoint uses `JOBS_ACCESS_TOKEN` (Bearer token) and `NOTIFICATIONS_JOB_INTERVAL` (optional, default 24h).
- Frontend reads `BACKEND_URL` from `apps/frontend/.env.local` (copy `.env.example`).
- Mobile reads `EXPO_PUBLIC_BACKEND_URL` from `apps/mobile/.env` (copy `.env.example` and use a LAN IP for physical devices).

## Useful Commands

All commands execute from repo root and delegate to Nx targets.

| Command | Description |
| --- | --- |
| `yarn dev:backend` | Run Go API via Air (`apps/backend`). |
| `yarn dev:frontend` | Run Next.js dev server on port 3000. |
| `yarn dev:mobile` | Start Expo with Metro bundler (`apps/mobile`). |
| `yarn db:migrate` | Apply backend SQL migrations. |
| `yarn build` | Build every project respecting Nx cache. |
| `yarn lint` | Run `go vet` + `next lint` (ESLint auto-fix on save is configured via `.vscode/settings.json`). |
| `yarn test` | Execute backend `go test` (extend when frontend tests arrive). |
| `yarn nx graph` | Visualize project dependency graph. |

## Nx Notes

- Projects are declared in `nx.json` and corresponding `apps/*/project.json` files.
- Add new apps/libs by extending `projects` or running `yarn nx g @nx/workspace:project ...`.
- Remote caching (Nx Cloud) is disabled for now; enable later with `yarn nx connect-to-nx-cloud`.

## Roadmap

- Polish backend integration with more providers.
- Expand the mobile feature set (deeper navigation, offline states).
- Add automated tests for frontend (Playwright/RTL) and contract tests for API/mobile.
