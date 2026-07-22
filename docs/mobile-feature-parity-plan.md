# Mobile parity audit and delivery plan

Status: feature parity complete; release hardening remains

Last audited: 2026-07-22

Goal: bring the Expo app to functional parity with the web product while using
native navigation, interaction, accessibility and performance patterns.

## Current assessment

The mobile app now has **100% user-feature coverage** of the current web product.
Routes are adapted to native navigation rather than copied literally. Release
hardening, native push delivery and deeper automated/device coverage remain a
separate quality phase; they are not missing web capabilities.

| Product area    |          Parity | What already works                                                                               | Gap to close                                                                                              |
| --------------- | --------------: | ------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| Auth/session    |            100% | login, registration, verification/resend, refresh, guest mode, username and superuser access     | boundary tests                                                                                            |
| Home/discovery  |            100% | feed, recommendations, daily pick, continue watching, mood, Cinematch and Bridge                 | device polish                                                                                             |
| Search          |            100% | search, filters, relevance/year/title sorting, paging and title navigation                       | query-cache hardening                                                                                     |
| Title details   |            100% | providers, friend recommendations, shared lists, episodes and ratings                            | device QA                                                                                                 |
| Saved library   |            100% | every web list, sorting, statistics, ratings, Query server state and guest persistence           | offline verification                                                                                      |
| Profile         |            100% | identity, theme, stats, server taste tournament/onboarding, achievements, changelog and Dev Zone | device polish                                                                                             |
| Friends/social  |            100% | requests, profiles, activity, collaborative list detail and public token links                   | associated-domain production verification                                                                 |
| Games           |            100% | all modes/formats, daily, stats, leaderboard and complete friend-challenge submission            | telemetry polish                                                                                          |
| Calendar/people |            100% | calendar, follows, person details, filmography and recommendations                               | richer presentation                                                                                       |
| Notifications   | 100% web parity | in-app inbox, event rendering, unread state and deep links                                       | native push delivery is a mobile-only phase-two enhancement                                               |
| Mobile quality  |             35% | theme, Reanimated foundation, haptics, API refresh                                               | Dynamic Type audit, reduced-motion coverage, offline cache, screen-reader QA, tests and production builds |

## Native product rules

- Expo Router files stay thin; features own data, state and UI.
- TanStack Query owns server state. Zustand is limited to session and temporary
  client state; MMKV stores small preferences and resumable sessions.
- Web pages are not copied literally. Dense panels become progressive disclosure,
  bottom sheets, segmented controls, native lists and focused detail routes.
- Tap targets are at least 44×44, controls have accessibility roles/labels, text
  supports Dynamic Type, and motion respects the operating-system setting.
- Motion communicates hierarchy and state: short spring press feedback, staggered
  list entrances, layout transitions and restrained success feedback. It must not
  block input or be required to understand state.
- Every remote surface has loading, empty, error, retry and session-isolation states.

## Delivery order

### 1. Foundation and social vertical slice

- [x] Make the shared feature screen theme-aware; safe-area and typography audit continues.
- [x] Add Friends: search, requests, list and native friend profile with shared titles.
- [x] Add Achievements: own/friend progress and global unlock celebration.
- [x] Connect profile shortcuts and notification deep links.

### 2. Title-detail parity

- [x] Add regional watch providers with a compact native country picker.
- [x] Replace the large recommend block with a compact action and friend sheet.
- [x] Add seasons collapsed by default, lazy episode metadata, responsive poster
      cards, watched state and per-episode rating.
- [x] Add shared-list actions without crowding the primary title controls.

### 3. Games parity

- [x] Build a native games hub and focused routes for comparison, people,
      director/movie, timeline, year, blitz, wheel, friend taste and Akinator.
- [x] Support `10 rounds` and `until defeat` in comparison/people games; remove the
      separate endless duplicate.
- [x] Increase pool diversity and apply progressive difficulty appropriate to
      each mode (closer years/ratings and less obvious people links).
- [x] Add deterministic daily challenge, streaks, results, stats, leaderboard and challenge feedback.

### 4. Social depth and data ownership

- [x] Add activity feed, shared/public list creation and friend collaboration controls.
- [x] Move saved remote data to Query with optimistic updates and rollback.
- [x] Expand notifications for recommendations, friendships, activity, games and deep links.

### 5. Hardening and release readiness

- [x] Persist the authenticated saved library as a user-scoped read-only offline fallback.
- [ ] Audit VoiceOver/TalkBack and contrast; Dynamic Type uses native scaling and shared motion respects the system setting.
- [ ] Add unit tests for domain hooks, integration tests for auth/cache boundaries,
      and E2E for auth → discovery → save → episode/social flows.
- [ ] Validate lifecycle/back navigation and create signed production iOS/Android builds.

## Definition of parity

A feature is complete only when its native flow exposes the same user capability
as web, uses the backend as source of truth, handles loading/empty/error/offline
states, isolates authenticated data between users, is usable with assistive
technology, respects reduced motion, and has been checked on both iOS and Android.

## Intentionally not a literal web copy

Desktop multi-column dashboards, hover-only affordances and permanently expanded
forms are adapted to mobile hierarchy. Bottom sheets, collapsible sections,
gestures and focused routes are preferred when they reduce cognitive load without
hiding a core action.
