# Mobile Feature-Parity Migration Plan

Status: In progress

Scope: migrate the currently implemented DropDate web experience to the Expo
mobile client with native UX, shared backend contracts, feature-based
decomposition, and production-safe state boundaries.

## Principles

- Mobile calls the Go API directly; it does not reproduce Next.js proxy routes.
- TanStack Query owns server state. Zustand owns session and short-lived client
  state. MMKV stores only small persisted client/session values.
- Expo Router route files remain thin and render feature screens.
- Shared UI is extracted only when it is genuinely reusable.
- Every feature includes loading, empty, error, authentication, retry, and
  logout/login isolation behavior.
- Web layouts are adapted to native navigation, gestures, bottom sheets,
  haptics, accessibility, app lifecycle, and constrained screens.

## Current gap (updated 2026-07)

| Area | Web | Mobile | Remaining work |
| --- | --- | --- | --- |
| Auth | Complete | Done | — |
| Home | Complete | Done | — |
| Search | Complete | Done | Still on its isolated query implementation |
| Details | Complete | Done | — |
| Saved | Complete | Partial | Move remote data from Zustand to Query, optimistic mutations |
| Profile | Complete | Done | Automated user-boundary tests |
| Recommendations | Complete | Done | — |
| Mood | Complete | Done | — |
| Cinematch | Complete | Done | — |
| Games | Complete | Done | — |
| Calendar | Complete | Done | — |
| People | Complete | Done | — |
| Notifications | Complete | Baseline done | Push notifications remain future work |
| Cold start | Complete | Done | — |
| Friends | Complete (Jul 2026) | Missing | Username, search, requests, friend profile with saved/achievements |
| Achievements | Complete (Jul 2026) | Missing | List-size tiers, unlock flow, profile display |

## Target structure

```text
apps/mobile/
  app/                         # thin Expo Router entries
  src/
    app/                       # providers, bootstrap, navigation policy
    entities/                  # reusable domain UI and models
    features/                  # complete user-facing vertical slices
      auth/
      home/
      search/
      saved/
      details/
      recommendations/
      mood/
      match/
      games/
      calendar/
      notifications/
      people/
      profile/
    shared/
      api/                     # client, errors, query keys/contracts
      hooks/
      storage/
      theme/
      ui/
      utils/
```

## Delivery phases

### Phase 0 - inventory and contracts

- [x] Compare current web routes, backend routes, and mobile routes.
- [x] Confirm that Query, Zustand, MMKV, FlashList, Reanimated, gestures and
  Expo Image are already installed.
- [x] Consolidate shared mobile API contracts and query keys.

### Phase 1 - application foundation

- [x] Typed API client with normalized errors, timeouts and cancellation.
- [x] Authorization injection and one-flight refresh/retry after `401`.
- [x] Central session cleanup for logout, expiry and user changes.
- [x] Query defaults for retry/reconnect policy. App lifecycle wiring remains.
- [x] Shared loading, empty, error and retry primitives. Toast/undo remains.
- [x] Shared spring-press, staggered entrance and screen-transition primitives.
- [x] Backend cold-start readiness experience.

### Phase 2 - stabilize existing slices

- [x] Refactor auth onto the shared client.
- [x] Refactor home and details onto shared query factories. Search remains on
  its existing isolated query implementation.
- [ ] Move authenticated saved server state from Zustand to Query.
- [ ] Add optimistic saved/rating/watch mutations with rollback.
- [x] Complete profile navigation baseline. Automated user-boundary tests remain.

### Phase 3 - title and personalized discovery parity

- [x] Cast carousel and person navigation.
- [x] Details metadata, cast, native share and existing list actions integrated.
- [x] Personalized home recommendations with AI reason text.
- [x] Followed-people profile entry, stats and persisted taste ranking.

### Phase 4 - interactive discovery

- [x] Adaptive Mood Picker using `/mood/next`, persisted session and result cards.
- [x] Iterative Cinematch with additional questions and shown-title exclusion.
- [x] Movie Games with posters, lives, streaks, reveal, details and haptics.
- [x] Preserve Mood/Match session state across details navigation and app backgrounding.

### Phase 5 - retention surfaces

- [x] Week/month calendar with period navigation, subscriptions and release history.
- [x] Person details, filmography, AI pick and follow/subscription controls.
- [x] Notification center baseline with unread state and mark-read mutations.
  Navigation badge and foreground polling included; push remains future work.

### Phase 6 - social parity (new web features from Jul 2026)

- [ ] Friends: search, requests, friends list, friend profile with saved lists
  and achievements.
- [ ] Achievements: unlock tiers, unlock feedback, profile display.

### Phase 7 - hardening

- [ ] Offline/read-only behavior and selective persisted query cache.
- [x] Expo-scheme email verification deep link and native title sharing.
- [ ] Accessibility, Dynamic Type and reduced motion.
- [ ] iOS/Android lifecycle and back-navigation checks.
- [ ] Unit/integration tests and critical-flow E2E coverage.
- [ ] Production iOS and Android builds.

## Definition of feature parity

A migrated feature is complete only when it has an equivalent native user flow,
uses the backend as its source of truth, handles loading/empty/error/offline
states, respects guest and authenticated behavior, cannot leak cached user data
across sessions, is accessible, and has been checked on both iOS and Android.

## Explicitly outside current web parity

The migration does not invent backend capabilities that the web product does
not have. Push notifications, multiplayer, Movie Akinator, Stripe billing,
episode-level tracking, and natural-language AI search remain separate future
product work unless implemented on web/backend during this migration.
