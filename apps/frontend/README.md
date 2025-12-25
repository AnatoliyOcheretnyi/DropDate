# DropDate Frontend

Next.js 14 UI for DropDate. The app includes trending rows, a full search page, title details, autosuggestions, and a saved list. Responsive layout, Ukrainian copy.

## Quick start

```bash
cd apps/frontend
cp .env.example .env.local   # tweak BACKEND_URL if backend runs elsewhere
yarn install                 # or npm/pnpm if you prefer
yarn dev                     # dev server on http://localhost:3000
```

From repo root you can also run `yarn dev:frontend` (Nx target).

## API proxy

Requests go through the Next.js routes below (forwarding to the Go API and avoiding CORS issues):

- `/api/suggest` – quick hints for autocomplete.
- `/api/search` – full search results (paged).
- `/api/next-release` – single title lookup.
- `/api/bulk-refresh` – refresh saved items.
- `/api/trending` – trending rows for the home page.
- `/api/details` – full title details + recommendations.

Adjust the backend URL via `.env.local`. Autosuggest shows up to 5 TMDB matches (title + year + poster). Search results are shown as a grid; clicking a card opens the details page, and the “+” action saves it to the list (persisted in `localStorage`).

## Scripts

- `yarn dev` – Next.js dev server with hot reload.
- `yarn build` – production build (outputs `.next`).
- `yarn start` – serve the production build.
- `yarn lint` – ESLint with `next/core-web-vitals`.

## Roadmap

- Add authentication + server-side persistence.
- Hook up testing (Playwright or React Testing Library).
- Sync with the mobile client once it’s ready.
