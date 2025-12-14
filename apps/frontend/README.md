# DropDate Frontend

Next.js 14 single-page UI that searches DropDate backend for the next release of a show/movie. Responsive layout, Ukrainian copy.

## Quick start

```bash
cd apps/frontend
cp .env.example .env.local   # tweak BACKEND_URL if backend runs elsewhere
yarn install                 # or npm/pnpm if you prefer
yarn dev                     # dev server on http://localhost:3000
```

From repo root you can also run `yarn dev:frontend` (Nx target).

## API proxy

Requests go through the Next.js route `/api/next-release`, which forwards to the Go API and keeps the browser free from CORS headaches. Adjust the backend URL via `.env.local`. Autosuggest hits `/api/suggest` which proxies the backend `/suggest` endpoint and shows up to 5 TMDB matches (title + year).

## Scripts

- `yarn dev` – Next.js dev server with hot reload.
- `yarn build` – production build (outputs `.next`).
- `yarn start` – serve the production build.
- `yarn lint` – ESLint with `next/core-web-vitals`.

## Roadmap

- Add loading skeletons & optimistic UI.
- Hook up testing (Playwright or React Testing Library).
- Sync with upcoming mobile client once it’s ready.
