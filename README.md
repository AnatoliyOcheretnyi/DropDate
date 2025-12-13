# DropDate Monorepo

DropDate is a small playground for tracking the next release date of a show or movie. The repository now runs as an Nx-powered monorepo and ships a Go backend, a Next.js frontend, and an Expo-based mobile client (still evolving).

## Stack

- **Backend (`apps/backend`)** — Go HTTP API that proxies TVMaze and exposes `/health` + `/next-release` endpoints.
- **Frontend (`apps/frontend`)** — Next.js 14 single page that queries the API via `/api/next-release` (responsive layout, UA copy).
- **Mobile (`apps/mobile`)** — Expo Router TypeScript app mimicking the web design; points directly to the Go API via `EXPO_PUBLIC_BACKEND_URL`.

## Getting Started

```bash
yarn install
```

Environment tweaks:
- Backend uses Go defaults; no env file is required yet.
- Frontend reads `BACKEND_URL` from `apps/frontend/.env.local` (copy `.env.example`).
- Mobile reads `EXPO_PUBLIC_BACKEND_URL` from `apps/mobile/.env` (copy `.env.example` and use a LAN IP for physical devices).

## Useful Commands

All commands execute from repo root and delegate to Nx targets.

| Command | Description |
| --- | --- |
| `yarn dev:backend` | Run Go API via Air (`apps/backend`). |
| `yarn dev:frontend` | Run Next.js dev server on port 3000. |
| `yarn dev:mobile` | Start Expo with Metro bundler (`apps/mobile`). |
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
- Expand the mobile feature set (deeper navigation, offline states).
- Add automated tests for frontend (Playwright/RTL) and contract tests for API/mobile.
