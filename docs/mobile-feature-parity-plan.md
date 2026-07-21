# Mobile parity audit and delivery plan

Status: in progress

Last audited: 2026-07-22

Goal: bring the Expo app to functional parity with the web product while using
native navigation, interaction, accessibility and performance patterns.

## Current assessment

The mobile app is about **50–55% functionally aligned** with the current web
product. Core discovery is mature enough to extend, but recent social, game and
title-detail work has widened the gap. The previous audit overstated Details and
Games parity and incorrectly treated episode tracking as future scope.

| Product area | Parity | What already works | Gap to close |
| --- | ---: | --- | --- |
| Auth/session | 85% | login, registration, verification link, refresh, guest mode | username/profile editing, recovery flow and boundary tests |
| Home/discovery | 75% | feed, recommendations, mood, Cinematch, people | social activity, daily/game entry points and continuity blocks |
| Search | 75% | search, suggestions, title navigation | consolidate query/cache behavior, richer native filters |
| Title details | 55% | hero, metadata, cast, list actions, rating, sharing | watch providers, recommend-to-friend sheet, shared lists, collapsible episode tracker and episode ratings |
| Saved library | 60% | lists, filters and list actions | move remote state from Zustand to Query, optimistic rollback, shared lists |
| Profile | 55% | account, theme, stats, taste order, people/calendar links | friends, achievements, username and social shortcuts |
| Friends/social | 5% | backend/web contracts exist | friends/search/requests/profile, activity feed, shared/public lists |
| Games | 15% | original comparison game with two modes | native hub, all web modes, difficulty curve, daily/endless/10-round choice, stats and challenges |
| Calendar/people | 80% | calendar, follows, person details and filmography | richer media presentation, social context and polish |
| Notifications | 45% | in-app list, unread badge, mark read | social/game event rendering, deep links and push delivery |
| Mobile quality | 35% | theme, Reanimated foundation, haptics, API refresh | Dynamic Type audit, reduced-motion coverage, offline cache, screen-reader QA, tests and production builds |

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
- [ ] Add Friends: search, incoming/outgoing requests and list are complete; native friend profile remains.
- [ ] Add Achievements: own accessible progress view is complete; friend view and unlock celebration remain.
- [ ] Connect profile shortcuts and notification deep links.

### 2. Title-detail parity

- [x] Add regional watch providers with a compact native country picker.
- [x] Replace the large recommend block with a compact action and friend sheet.
- [x] Add seasons collapsed by default, lazy episode metadata, responsive poster
  cards, watched state and per-episode rating.
- [ ] Add shared-list actions without crowding the primary title controls.

### 3. Games parity

- [ ] Build a native games hub and focused routes for comparison, people,
  director/movie, timeline, year, blitz, wheel, friend taste and Akinator.
- [ ] Support `10 rounds` and `until defeat` in games with lives; remove the
  separate endless duplicate.
- [ ] Increase pool diversity and apply progressive difficulty appropriate to
  each mode (closer years/ratings and less obvious people links).
- [ ] Add daily state, streaks, results, stats and challenge feedback.

### 4. Social depth and data ownership

- [ ] Add activity feed, shared/public lists and collaboration controls.
- [ ] Move saved remote data to Query with optimistic updates and rollback.
- [ ] Expand notifications for recommendations, friendships, activity and games.

### 5. Hardening and release readiness

- [ ] Selectively persist read-only query data and define offline behavior.
- [ ] Audit VoiceOver/TalkBack, Dynamic Type, contrast and reduced motion.
- [ ] Add unit tests for domain hooks, integration tests for auth/cache boundaries,
  and E2E for auth → discovery → save → episode/social flows.
- [ ] Validate lifecycle/back navigation and create production iOS/Android builds.

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
