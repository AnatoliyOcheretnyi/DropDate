# DropDate Frontend

Next.js 14 single-page UI that searches DropDate backend for the next release of a show/movie. The page features TMDB autosuggestions, a poster recommendation grid, and a saved list card (matching the mobile design). Responsive layout, Ukrainian copy.

## Quick start

```bash
cd apps/frontend
cp .env.example .env.local   # tweak BACKEND_URL if backend runs elsewhere
yarn install                 # or npm/pnpm if you prefer
yarn dev                     # dev server on http://localhost:3000
```

From repo root you can also run `yarn dev:frontend` (Nx target).

## API proxy

Requests go through the Next.js routes `/api/next-release` and `/api/suggest`, which forward to the Go API and keep the browser free from CORS headaches. Adjust the backend URL via `.env.local`. Autosuggest shows up to 5 TMDB matches (title + year + poster). After hitting “Знайти” the UI renders a gallery of posters that can be clicked to open the full release card or saved to the personal list (persisted in `localStorage`).

## Scripts

- `yarn dev` – Next.js dev server with hot reload.
- `yarn build` – production build (outputs `.next`).
- `yarn start` – serve the production build.
- `yarn lint` – ESLint with `next/core-web-vitals`.

## Roadmap

- Add loading skeletons & optimistic UI.
- Hook up testing (Playwright or React Testing Library).
- Sync with upcoming mobile client once it’s ready.
