# Movie Games Spec

Status: Draft

Scope: DropDate web and backend

Document type: Combined product + technical spec

## Why this format

This feature does not need a separate RnD document yet.

For the current stage, the correct artifact is a combined spec because:

- product requirements define how the game should feel and what user actions it should unlock
- technical design defines how questions are generated from existing TMDB-backed title metadata
- the first version can reuse current DropDate screens, saved lists, and details flows

If we later introduce live multiplayer, matchmaking, anti-cheat, or third-party game infrastructure, we can split out a separate technical design.

## Problem

DropDate currently supports discovery, title details, saved lists, and personalized recommendations, but it does not yet have an interactive loop that makes discovery feel playful.

As a result:

- user engagement depends mostly on browsing rows and opening details pages
- there is no lightweight repeatable activity users can play daily or casually
- there is no game-like surface that can later evolve into friend competition

## Opportunity

We can introduce a game layer that:

- makes title discovery more interactive
- creates more entry points into title details and saved lists
- increases repeat visits through quick rounds and streaks
- creates a clean path toward future social features such as friend challenges or head-to-head play

The key product idea is a simple comparison game built around movie metadata:

- which film released earlier
- which film has the higher rating
- which film is more popular
- later: which film had the bigger budget or box office

## Goals

1. Launch a simple single-player movie game that feels native to DropDate.
2. Reuse existing title details and saved-list interactions instead of inventing new content flows.
3. Make every completed round a possible entry point into `details`, `watchlist`, or `favorite`.
4. Keep the first version deterministic and easy to generate from existing backend data.
5. Lay technical foundations for future asynchronous and real-time friend competition.

## Non-goals

1. Building real-time multiplayer in v1.
2. Adding chat, matchmaking, or room presence in v1.
3. Supporting every possible comparison metric in the first release.
4. Mixing game results into recommendation ranking in v1.
5. Designing a full achievement or rewards platform in v1.

## Current state

The existing product already has useful building blocks:

- TMDB-backed title search and details
- title metadata such as `releaseDate`, `firstAirDate`, `voteAverage`, and `popularity`
- saved list actions and saved-state rendering
- a details page where users can read descriptions and inspect a title further
- existing profile and saved-page stats patterns that can later inspire game stats UI

Important limitation:

- the current exposed details model does not yet include `budget` or `revenue`

This means the first version should focus on question types that are already backed by current metadata.

## Product concept

## Surface

Introduce a dedicated `Games` surface rather than placing the full experience directly on the home page.

Recommended structure:

- add a `Games` entry point in navigation or as a promoted card on home
- keep the actual gameplay on its own page
- use home only as a discovery surface that invites users into the game

This avoids overloading the home screen and keeps the core browse experience intact.

## Core loop

Single-player game loop:

1. user starts a session
2. user sees two movie cards and one comparison prompt
3. user selects the left or right title
4. app reveals the correct answer and both values
5. app offers follow-up actions:
   - open details
   - add to watchlist
   - favorite
6. next question loads immediately
7. session ends after a fixed number of rounds or on user exit

## Initial game modes

Recommended v1 modes:

1. `Which released earlier?`
2. `Which has a higher TMDB rating?`

Recommended v1.1 modes:

1. `Which is more popular?`
2. daily challenge variant using one fixed question set per day

Deferred modes:

1. `Which had the bigger budget?`
2. `Which earned more?`

These should be deferred until the backend reliably exposes those fields.

## User stories

### Primary

1. As a user, I want a quick movie game I can play in short sessions.
2. As a user, I want to discover interesting films while playing.
3. As a user, I want to save a title to my list directly from the game flow.
4. As a user, I want to open title details after a reveal to read the description.

### Secondary

1. As a returning user, I want basic progress feedback such as score or streak.
2. As a future social user, I want this mode to eventually support friend competition without redesigning the core game.

## Proposed product behavior

## Eligibility

V1 can be available to all users, including anonymous users, but the experience is stronger for authenticated users because they can save titles during play.

Behavior by state:

- logged-out users can play and open details
- logged-out users who tap save should be routed into the existing auth flow
- logged-in users can save directly into existing lists

## Session structure

Recommended session sizes:

- quick game: 5 questions
- standard game: 10 questions

V1 should start with one default session length if we want to reduce scope further.

## Question card behavior

Each question should show:

- prompt text
- left title card
- right title card
- poster if available
- title and year

After answer reveal, show:

- which side was correct
- underlying values for both titles
- buttons for `Details` and `Save`

## Single-player progression

V1 should include simple, low-risk progression:

- current score
- current streak
- final session summary

This is enough to make the loop satisfying without building a meta-game.

## Statistics

Game statistics are desirable but should not block v1.

Recommended baseline stats to consider:

- total games played
- total questions answered
- correct answer rate
- best streak
- favorite mode
- last played at

Recommended v1 decision:

- show only in-session score and streak
- optionally persist aggregate stats if the backend cost is low
- avoid complex dashboards until we validate gameplay retention

## Future social direction

The game should be designed so it can evolve into friend competition later.

Recommended future modes:

1. asynchronous head-to-head
2. friend challenge links
3. same-seed comparison match where both players answer the same questions
4. leaderboard or season stats only after core usage is proven

Recommended sequencing:

- first ship single-player
- then add asynchronous PvP
- only after that evaluate real-time multiplayer

## Content and data rules

## Scope for v1

Use `movie` titles only in the first release.

Reasons:

- release date comparisons are easier to explain for movies
- TV introduces ambiguity around `firstAirDate`, multi-season history, and release semantics
- movie-only scope reduces edge cases and simplifies UX copy

TV and anime/manga-related game variants can be layered in later with separate rules.

## Candidate selection

Question generation should pull from TMDB-backed catalog data already accessible through the backend.

Sources can include:

- trending titles
- popular titles
- top-rated titles
- recommendation candidates

Avoid generating pairs from raw search results or unstable one-off data sources.

## Pair validity

A pair is valid only if:

- both titles share the same media scope for the mode
- both titles have the required metric
- the metric difference is large enough to avoid ambiguous questions
- neither title is missing a basic display asset unless we explicitly allow fallback cards

Recommended thresholds:

- release year mode: any non-identical date pair is valid
- rating mode: require at least `0.4` vote average difference
- popularity mode: require a meaningful minimum gap to avoid coin-flip questions

## Repetition control

V1 should minimize obvious repeats within a session.

Recommended rules:

- do not repeat the exact same pair in one session
- do not show the same title more than twice in a short session if enough alternatives exist

## Technical design

## Backend approach

Implement a separate backend module for game question generation rather than mixing this logic into `recommendations`.

Suggested package:

- `apps/backend/internal/games`

Responsibilities:

- build candidate pools for a requested mode
- validate pairs
- compute correct answers
- return presentation-ready question payloads

## API design

Recommended first endpoint:

- `GET /games/questions?mode=release_date&count=5`

Example response:

```json
{
  "items": [
    {
      "id": "q_01",
      "mode": "release_date",
      "prompt": "Which movie released earlier?",
      "left": {
        "tmdbId": 11,
        "mediaType": "movie",
        "title": "Example Left",
        "year": "2019",
        "posterUrl": "https://..."
      },
      "right": {
        "tmdbId": 22,
        "mediaType": "movie",
        "title": "Example Right",
        "year": "2022",
        "posterUrl": "https://..."
      }
    }
  ],
  "meta": {
    "mode": "release_date",
    "count": 5,
    "generatedAt": "2026-06-27T12:00:00Z"
  }
}
```

Optional future endpoint:

- `POST /games/sessions/result`

This would persist single-player stats or challenge results once we decide we want them.

## Frontend approach

Suggested frontend structure:

- `apps/frontend/src/features/games`

Potential modules:

- `screens/GamesScreen.tsx`
- `components/GameQuestionCard.tsx`
- `components/GameRevealPanel.tsx`
- `hooks/useGameSession.ts`
- `api/games.ts`

The feature should reuse:

- existing title details route
- existing saved item actions
- existing auth gating patterns

## State model

V1 frontend state can stay lightweight:

- current mode
- question list
- current question index
- selected answer
- score
- streak
- reveal state

This does not require a complex global store.

## Data model evolution

If we later decide to persist gameplay, recommended tables could include:

- `game_sessions`
- `game_answers`
- `game_player_stats`

Possible fields:

- user ID
- mode
- score
- question count
- correct count
- best streak
- started at
- completed at

For PvP later, introduce separate entities rather than stretching single-player tables:

- `game_matches`
- `game_match_players`
- `game_match_answers`

## Metric readiness

Current readiness by mode:

### Ready now

- `release_date`
- `rating`
- `popularity`

### Requires backend expansion

- `budget`
- `revenue`

To unlock those later, extend the TMDB details pipeline and release details model with those fields, then define validation thresholds for usable questions.

## Analytics

Recommended events:

- game session started
- question answered
- answer correctness
- details opened from reveal
- save action from reveal
- game session completed
- mode selected

This is enough to measure whether the game actually drives discovery and list growth.

## Rollout plan

## Phase 1

- single-player only
- movie-only
- one or two question modes
- in-session score and streak
- details and save actions after reveal

## Phase 2

- add popularity mode
- experiment with daily challenge
- optionally persist aggregate player stats

## Phase 3

- add friend challenges
- add asynchronous PvP with shared question sets

## Phase 4

- evaluate live multiplayer only if async PvP shows strong usage

## Open questions

1. Should the `Games` surface be visible in top navigation immediately, or start as a promoted card on home?
2. Should anonymous users be allowed full play, or should later questions require sign-in?
3. Do we want only one default mode at launch, or let users pick between two modes from day one?
4. Should saved actions inside the game default to `watchlist`, or open the full existing list picker?
5. Is session score enough for v1, or do we want lightweight persisted stats right away?
6. Should future recommendation logic consume any game-derived signals, or should those remain isolated until validated?

## Recommendation

Proceed with a v1 `Movie Games` feature as a dedicated single-player page.

Keep the first release narrow:

- movies only
- `released earlier` and `higher rating`
- score and streak within the active session
- details and saved-list actions after each reveal

Treat persisted stats, budget/revenue modes, and PvP as planned extensions rather than launch blockers.
