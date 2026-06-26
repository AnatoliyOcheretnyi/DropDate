# Personalized Recommendations Spec

Status: Draft

Scope: DropDate web and backend

Document type: Combined product + technical spec

## Why this format

This feature does not need a separate RnD document unless we plan to introduce a new recommendation engine, embeddings, or a third-party personalization service.

For the current product, the correct pre-implementation artifact is a combined spec:

- product requirements define what the user should see and when
- technical design defines how we derive recommendations from existing TMDB and saved-list data

## Problem

DropDate already helps users discover titles through trending, search, title details, and saved lists. It does not yet generate a personalized feed based on the user's taste profile.

As a result:

- users must manually browse trending rows even after they have already expressed preferences
- favorite and watched history are stored, but not reused to increase discovery quality
- title-level TMDB recommendations exist, but there is no user-level recommendation feed

## Opportunity

We can launch a useful first version without ML infrastructure by combining:

- saved list signals such as `favorite`, `watched`, `disliked`
- optional user stats such as `userRating` and `watchCount`
- TMDB title-to-title recommendations that already exist in the backend

This gives DropDate a personalized discovery layer with low implementation risk and no new external dependencies.

## Goals

1. Show logged-in users a personalized recommendation row generated from their saved titles.
2. Reuse existing user signals before introducing any new data model.
3. Exclude titles the user has already saved or explicitly disliked.
4. Keep the first version simple enough to ship without a new service or ML pipeline.
5. Preserve the current anonymous experience for users without an account or with insufficient taste data.

## Non-goals

1. Building a collaborative filtering system across multiple users.
2. Introducing embeddings, vector search, or LLM-based taste inference.
3. Explaining recommendations with rich semantic text in v1.
4. Re-ranking the entire home page around personalization.
5. Supporting push or email recommendation campaigns in v1.

## Current state

The existing product already provides the main building blocks:

- saved titles support multiple list types including `follow`, `watchlist`, `favorite`, `watched`, and `disliked`
- saved titles also persist `userRating`, `watchCount`, `runtimeMinutes`, `episodeCount`, and `tmdbRating`
- title details already return a `recommendations` array from TMDB
- the details screen already renders similar titles
- the home page already renders row-based discovery sections

This means v1 can be implemented as a user-level aggregation layer rather than a net-new recommendation platform.

## User stories

### Primary

1. As a logged-in user, I want DropDate to suggest movies and series based on what I already like so I can discover relevant titles faster.
2. As a logged-in user, I do not want to see titles I have already saved or disliked.
3. As a logged-in user, I want recommendations to feel related to my favorites, not just generic trending content.

### Secondary

1. As a new user, I want clear guidance on how to unlock personalized recommendations.
2. As a product owner, I want a first version that can ship quickly using existing backend capabilities.

## Proposed product behavior

## Surface

V1 should ship on the web home page as a single personalized row.

Placement:

- show the row above generic discovery rows for logged-in users with enough signal
- keep generic rows below it as fallback browsing content

Proposed row title:

- `Recommended for you`

Optional secondary label:

- `Based on your favorites and watch history`

## Eligibility

Show personalized recommendations only when all conditions are true:

- user is authenticated
- backend returns at least 6 recommendation items
- user has at least 2 strong seed titles

Strong seed titles for v1:

- `favorite`
- `watched` with `userRating >= 8`

Fallback behavior:

- if user is logged out, show the current home experience unchanged
- if user is logged in but has insufficient signal, show the current home experience unchanged and optionally add a small empty-state hint later

## Interaction

Recommendation cards should behave exactly like existing home and details cards:

- open the title details page on click
- show existing saved-state styling if already in one of the user's lists
- allow add-to-list interactions using current patterns

## Empty state

V1 may skip a dedicated empty state UI and simply omit the personalized row.

If we add an empty state, use a compact message such as:

`Add a few favorites or rated watches to unlock personal recommendations.`

## Recommendation strategy

## Summary

Generate a personalized feed by:

1. selecting strong seed titles from the user's saved data
2. requesting TMDB recommendations for each seed
3. merging and deduplicating results
4. excluding titles the user already knows or rejected
5. scoring candidates by seed strength and repetition across multiple seeds

This is content-based personalization using TMDB as the candidate source.

## Seed selection

Use the user's saved titles as follows.

High-priority seeds:

- titles in `favorite`
- titles in `watched` with `userRating >= 8`

Medium-priority seeds:

- titles in `watched` with no rating but `watchCount >= 1`
- titles in `watchlist` with `tmdbRating >= 7.5`

Negative signals:

- any title in `disliked`

Seed limits:

- use up to 10 seeds per user request
- prefer the most recently updated high-priority seeds first

## Candidate generation

For each selected seed:

1. call TMDB recommendations using the existing backend integration
2. request up to 12 candidates per seed
3. attach metadata about which seed produced each candidate

Then:

- deduplicate by `mediaType + tmdbId`
- merge duplicate candidates from multiple seeds into one scored item

## Exclusion rules

Remove any candidate that matches one of the following:

- already present in any user list
- explicitly disliked by the user
- identical to the seed title itself
- invalid or missing `tmdbId`

Optional v1.1 exclusions:

- hide titles with missing poster art
- hide titles below a minimum TMDB vote threshold

## Scoring

V1 scoring should stay deterministic and debuggable.

Base seed weights:

- `favorite`: 5
- `watched` with `userRating >= 8`: 4
- `watched` with no rating: 2
- `watchlist` with strong TMDB rating: 1

Candidate score formula:

`score = sum(seed_weight) + overlap_bonus + rating_bonus + recency_bonus`

Recommended bonuses:

- `overlap_bonus`: +2 for each additional seed that also recommends the same title
- `rating_bonus`: +1 if candidate `tmdbRating >= 7.5`, if available
- `recency_bonus`: +1 if the seed was updated in the last 30 days

Negative handling:

- no negative score path is needed in v1 because `disliked` titles are excluded entirely

## Output size

Return up to 18 ranked items by default.

This matches the current row-style browsing pattern used on the home page.

## API design

## Backend endpoint

Add:

- `GET /recommendations/me?limit=18`

Requirements:

- authentication required
- `limit` optional, default `18`, max `30`

Response shape:

```json
{
  "items": [
    {
      "tmdbId": 0,
      "mediaType": "movie",
      "title": "Example",
      "year": "2024",
      "posterUrl": "https://...",
      "reason": {
        "seedCount": 2,
        "primarySource": "favorite"
      }
    }
  ],
  "meta": {
    "seedCount": 4,
    "generatedAt": "2026-06-27T12:00:00Z"
  }
}
```

Notes:

- `reason` is optional for v1 response consumption
- frontend can ignore `reason` initially
- metadata is useful for debugging and analytics later

## Frontend proxy

Add a Next.js API route:

- `GET /api/recommendations/me`

Responsibilities:

- forward auth context to backend
- preserve current frontend-to-backend proxy pattern
- normalize backend errors into current frontend response handling style

## Suggested backend structure

Add a dedicated package:

- `apps/backend/internal/recommendations`

Suggested responsibilities:

- `Service`: orchestrates seed selection, candidate fetch, merge, exclusion, ranking
- `types.go`: internal DTOs for seeds, candidates, and result metadata
- integration layer uses existing `saved.Service` and `release.Service`

This keeps recommendation logic separate from `saved` and `release`, while still reusing both.

## Data model impact

V1 should not require a database migration.

Reasons:

- saved list types already exist
- rating and watch stats already exist
- TMDB recommendation source already exists

Possible future migrations:

- persisted recommendation snapshots
- recommendation impression logs
- explicit user feedback on recommendations

## Performance and caching

## Why caching matters

Generating recommendations can fan out into multiple TMDB calls in one request.

Without controls:

- each home load for an active user may trigger many external requests
- repeated refreshes may create avoidable TMDB load

## V1 cache strategy

Cache personalized results per user.

Recommended cache key:

- `recommendations:user:{userID}:v1:{limit}`

Recommended TTL:

- 6 hours

Invalidate or bypass cache when:

- user updates saved lists
- user changes rating
- user changes watch count
- cache entry expires

If active invalidation is too expensive for v1, TTL-based cache only is acceptable.

## Concurrency

Use bounded parallelism when fetching seed recommendations.

Recommended guardrails:

- max 4 concurrent TMDB recommendation requests per user request
- max 10 seeds processed

This keeps latency and external load under control.

## UX acceptance criteria

1. Logged-in users with enough signal see a personalized row on the home page.
2. Logged-out users see no regression in the current home page.
3. Titles already saved by the user do not appear in the personalized row.
4. Titles in `disliked` do not appear in the personalized row.
5. Clicking a recommendation opens the existing details page.
6. Row contents remain stable for a short period because of cache, instead of changing on every refresh.

## Technical acceptance criteria

1. Backend exposes a protected recommendation endpoint for the current user.
2. Frontend accesses recommendations only through the existing Next.js proxy layer.
3. Recommendation generation does not require schema changes in v1.
4. Recommendation logic is isolated in its own backend module.
5. Recommendation requests degrade gracefully when TMDB partially fails.

## Failure handling

If recommendation generation fails:

- do not block the home page
- omit the personalized row
- keep generic discovery rows visible
- log backend errors with enough context to debug seed count and failure source

If only some seed calls fail:

- keep partial results
- still return ranked output if at least one seed succeeds

## Analytics and observability

V1 minimum:

- backend logs seed count, candidate count, filtered count, final count, and latency

V1.1 optional:

- impression event when personalized row is rendered
- click event when a recommendation card is opened
- save event from a recommendation card

## Rollout plan

## Phase 1

Backend only:

- add recommendation service
- add endpoint
- add basic caching
- add tests for seed selection, exclusion, and scoring

## Phase 2

Frontend integration:

- add proxy route
- fetch personalized row on home for authenticated users
- render row using existing carousel/grid primitives

## Phase 3

Polish:

- add empty-state hint for low-signal users
- add optional reason labels such as `Because you liked Dune`
- consider profile integration if the home row performs well

## Open questions

1. Should `watchlist` influence v1 recommendations, or only `favorite` and highly rated `watched` titles?
2. Do we want separate rows for movies and series later, or a single mixed row is enough?
3. Should we surface an explanation label in v1, or keep reasons internal only?
4. Should mobile ship in the same milestone, or only after the web version is validated?
5. Do we want cache invalidation immediately on saved updates, or is TTL-only enough for the first release?

## Recommended implementation decision

Proceed with a v1 personalized home row using existing saved signals and TMDB recommendations.

This is the best tradeoff because:

- it is materially useful
- it fits the current DropDate architecture
- it requires no schema change
- it avoids premature ML complexity
- it creates a clean base for later ranking improvements
