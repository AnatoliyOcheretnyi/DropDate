# DropDate Mobile

Expo Router (TypeScript) client that mirrors the DropDate web design: a hero intro, search field, and release card fed by the Go backend.

## Stack

- Expo SDK 54 + React Native 0.81
- Single screen rendered via Expo Router (`app/index.tsx`)
- Custom UI in `src/` (hooks, components, theme)
- Backend URL configured via `EXPO_PUBLIC_BACKEND_URL`

## Quick start

```bash
cd apps/mobile
cp .env.example .env        # optionally tweak backend URL
npm install                 # or yarn/pnpm
npx expo start
```

Expo CLI will give you QR codes and simulator options. The UI expects the backend to run locally on port 8080 (matching `.env.example`).

## Project layout

```
apps/mobile
├── app/            # Expo Router entry (`index.tsx` + layout)
├── src/
│   ├── components/ # UI blocks (ReleaseCard, etc.)
│   ├── hooks/      # `useNextRelease`
│   ├── screens/    # HomeScreen mirrors the web design
│   └── theme/      # shared colors/typography tokens
└── assets/         # icons + splash art
```

## Nx targets

After installing dependencies in repo root, you can run `yarn dev:mobile` (proxied to `nx run mobile:start`). Linting uses `npx expo lint` via `nx run mobile:lint`.

## Notes

- Mobile is still work in progress; features will stay in sync with the web client.
- `EXPO_PUBLIC_BACKEND_URL` must be reachable from the emulator/device (use your LAN IP instead of `localhost` when running on physical hardware).
