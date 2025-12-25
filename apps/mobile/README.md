# DropDate Mobile

Expo Router (TypeScript) client that mirrors the DropDate web design. This is a **super‑mock / draft** build and not ready for production use yet.

## Stack

- Expo SDK 54 + React Native 0.81
- Expo Router with tabs (`app/(tabs)`)
- Screens + UI in `src/` (components, screens, theme, state)
- Backend URL configured via `EXPO_PUBLIC_BACKEND_URL`

## Quick start

```bash
cd apps/mobile
cp .env.example .env        # optionally tweak backend URL
npm install                 # or yarn/pnpm
npx expo start
```

Expo CLI will give you QR codes and simulator options. The UI expects the backend to run locally on port 8080 (matching `.env.example`). Typing at least 2 characters triggers `/suggest` requests and renders a small list of TMDB matches (title + year); tapping a suggestion performs the full `/next-release` lookup automatically.

## Project layout

```
apps/mobile
├── app/            # Expo Router entry (`(tabs)` + layout)
├── src/
│   ├── components/ # UI blocks (ReleaseCard, etc.)
│   ├── screens/    # Home/Search/Saved/Details
│   ├── state/      # SavedContext (in‑memory for now)
│   └── theme/      # shared colors/typography tokens
└── assets/         # icons + splash art
```

## Nx targets

After installing dependencies in repo root, you can run `yarn dev:mobile` (proxied to `nx run mobile:start`). Linting uses `npx expo lint` via `nx run mobile:lint`.

## Notes

- Mobile is still work in progress and intentionally incomplete (mock UX + temporary state).
- `EXPO_PUBLIC_BACKEND_URL` must be reachable from the emulator/device (use your LAN IP instead of `localhost` when running on physical hardware).
