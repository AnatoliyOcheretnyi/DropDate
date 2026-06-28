# Mood Picker Spec

Status: Draft

Scope: DropDate web and backend

Document type: Combined product + technical spec

## Why this format

Like the movie games feature, the mood picker does not need a separate RnD
document yet. It is a guided, deterministic flow built on top of metadata we
already serve from TMDB. A combined product + technical spec is the right
artifact because:

- product requirements define how the picker should feel (short, playful, ends
  with concrete films)
- technical design is small: a question schema, an answer→TMDB-`/discover`
  mapping, and a results endpoint
- v1 reuses existing screens, the saved-list actions, the details flow, and the
  same backend/proxy patterns already used by games and recommendations

If we later add an LLM layer (natural-language refinement, "why this fits your
mood" generation) or conversational narrowing, we can split out a separate
design for that.

## Problem

DropDate has browse rows, details, saved lists, recommendations, and a games
mode, but no low-effort "I don't know what to watch, just tell me" entry point.

As a result:

- a user who hasn't saved anything (cold start) gets weak recommendations
- choosing a film still requires the user to know what they want and search/browse
- there is no fast, fun, repeatable "pick something for tonight" loop

## Opportunity

A short guided picker that asks 3–5 playful questions ("What's your mood?",
"Who are you watching with?", "How much time do you have?") and ends with a small
set of concrete film picks.

It:

- works for brand-new users with zero saved history (no seeds required)
- creates more entry points into `details` and saved lists
- is cheap, deterministic, fast, and debuggable
- reuses the games-style card UI and the existing TMDB layer
- leaves a clean seam to add an LLM flavor layer later without redesign

## Design decision: expert system, not LLM (v1)

v1 is a **deterministic expert system**: each answer maps to TMDB
`/discover/movie` parameters and weights. We deliberately do **not** use an LLM
in v1.

Rationale:

- deterministic, free, fast (<300 ms with cache), and fully debuggable
- TMDB `/discover` already supports every filter we need (genres, runtime,
  release window, rating floor, sort, certification)
- an LLM here adds latency, cost, and unpredictability without improving the
  quality of a well-designed question→filter mapping
- the picker output is always real TMDB titles, so there is no hallucination risk

An LLM is a Phase 2 enhancement for one narrow job only: generating a short
"why this fits your mood" line per pick. It never selects titles.

## Goals

1. Launch a single-player mood picker as a dedicated surface.
2. Work for anonymous and authenticated users; require no saved history.
3. End every session with concrete, savable film picks plus a "Show more" reshuffle.
4. Keep v1 fully deterministic and generated from existing TMDB metadata.
5. Reuse existing details route, saved-list actions, and auth gating.
6. Leave clean seams for later LLM flavor text and preference personalization.

## Non-goals

1. No LLM in v1 (neither for selection nor flavor text).
2. No TV/anime in v1 (movie-only, same as games v1).
3. No persisted mood sessions, history, or stats in v1.
4. No free-text/natural-language input (both modes use fixed-choice answers and
   fixed nudge buttons; natural-language search is the separate AI Assistant spec).
5. No multi-page infinite scroll; "Show more" / refine pulls the next batch only.
6. No mixing mood results into the recommendation ranking engine.
7. No "guess the movie I'm thinking of" mechanic — that is the separate
   `movie-akinator-spec.md`. This picker proposes; it does not guess.

## Current state

Building blocks that already exist:

- TMDB-backed catalog, details, search, trending/popular/top-rated providers
  (`apps/backend/internal/tmdb`, `apps/backend/internal/release`)
- title metadata: genres, runtime, release date, vote average, vote count,
  origin country (`release.Details`)
- saved list actions and saved-state rendering
- the games feature as a structural template: a static-mode service plus a
  `GET /games/questions` endpoint and a `features/games` frontend module
- the proxy pattern in `apps/frontend/app/api/*` (GET passthrough for games;
  POST + cookie passthrough for auth)

Important gaps to close:

- there is **no `/discover` method** on the TMDB client yet (only
  trending/popular/top_rated/upcoming list endpoints and search)
- there is **no genre-ID mapping** in the backend (genres are only read as names
  from details payloads)

## Product concept

### Surface

Add a dedicated **Mood Picker** surface, reachable as:

- a promoted card on home ("Не знаєш що подивитись? Підберемо за настроєм")
- and/or an entry alongside Games in navigation

Gameplay lives on its own page; home only invites into it. This mirrors the
games rollout decision.

### Core loop

1. user opens the picker
2. user answers 3–5 single-choice questions, one card at a time, with a back step
3. on the last answer the app requests picks
4. app shows a small results set (default 6 cards): poster, title, year, rating,
   and one short "reason" tag derived from the answers
5. each card offers `Details` and `Save` (save routes anon users into auth)
6. a `Show more` action reshuffles / pulls the next batch from the same query,
   excluding already-shown titles
7. a `Start over` action resets the questionnaire

### Interaction modes

The picker has two modes that share one resolver and one `/discover` engine. The
user chooses the mode on the start screen.

- **Mode A — Guided (questions → results).** Answer N questions, get a result set.
  This is the default and the simplest loop.
- **Mode B — Refine (propose → nudge → re-propose).** We immediately propose one
  pick (seeded from a single "vibe" answer or from the user's preferences/saved
  history if available), and the user steers with directional nudge buttons
  ("веселіше", "страшніше", "коротше", "новіше", "маловідоме", "більше екшену").
  Each nudge mutates the running discover params and proposes again. Converges
  the way a refinement loop does — inspired by the Akinator feel, but it is a
  picker, not a guesser.

Both modes are stateless on the backend: the client holds the running state
(answers + applied nudges + shown ids) and sends it on every call. The backend
folds that state into `DiscoverParams` and returns picks.

### Depth

Mode A supports a **depth** choice on the start screen:

- `quick` — 3 questions (mood, time, discovery)
- `standard` — 5 questions (the full v1 set below)
- `deep` — 8–10 questions (adds nuance questions backed by TMDB keywords)

Critical design rule: **deeper does not mean more hard filters.** Adding hard
`/discover` filters per question shrinks the result pool, fires the relaxation
ladder, and silently discards the user's answers — it feels broken. So depth is
built on two mechanisms instead:

1. **`with_keywords`** (TMDB keyword IDs) for nuance — e.g. "based on a true
   story", "one location", "mind-bending", "dystopia", "heist", "feel-good".
   These are granular enough to refine without collapsing the pool.
2. **Server-side re-rank over a larger pool.** For `deep`, fetch a bigger
   candidate pool (2–3 pages) and rank by how many soft signals each candidate
   matches (genre overlap + keyword overlap + rating tier). Extra answers then
   influence **ordering**, not hard inclusion, so the result count never drops to
   zero from over-constraining.

Only a small, stable subset of answers stays as hard filters (era, runtime,
adult, family certification). Everything added by depth is soft (keywords +
re-rank weights).

### Question set (v1)

Standard depth = five questions. Each answer carries a mapping to discover
parameters (see Mapping below). Copy is illustrative; final UA copy lives in
`libs/shared/src/strings.ts`.

1. **Mood / vibe** (`mood`) — single choice, required
   - `lift` — Підняти настрій
   - `cry` — Поплакати
   - `adrenaline` — Адреналін
   - `think` — Подумати
   - `cozy` — Затишний вечір
   - `scary` — Полоскотати нерви

2. **Company** (`company`) — single choice, required
   - `solo` — Сам/сама
   - `couple` — Удвох
   - `friends` — З друзями
   - `family` — Сім'я з дітьми

3. **Time available** (`time`) — single choice, required
   - `short` — До 90 хвилин
   - `standard` — Близько 2 годин
   - `any` — Не важливо

4. **Era** (`era`) — single choice, required
   - `fresh` — Свіже (2018+)
   - `modern` — 2000-х і новіше
   - `classic` — Класика (до 2000)
   - `any` — Не важливо

5. **Familiarity** (`discovery`) — single choice, required
   - `popular` — Популярне і перевірене
   - `hidden` — Приховані перлини

Deep depth adds up to five **nuance questions** on top of the five above. These
map to TMDB keywords and re-rank weights only (never hard filters):

6. **Tone** (`tone`) — `feel_good` / `dark` / `intense` / `quirky`
7. **Story basis** (`basis`) — `true_story` / `fiction` / `any`
8. **Pacing** (`pacing`) — `slow_burn` / `fast` / `any`
9. **Texture** (`texture`) — `visually_stunning` / `dialogue_driven` / `any`
10. **Twist** (`twist`) — `mind_bending` / `straightforward` / `any`

Each nuance answer contributes a `with_keywords` set and a re-rank weight; `any`
contributes nothing. The exact keyword IDs are resolved once from the TMDB
keyword endpoint and stored in a constants table (like the genre table).

The question schema is served by the backend so we can tune answers, copy, and
mappings without a frontend release. The `GET /mood/questions?depth=` response
returns only the questions for the requested depth.

## Mapping (answer → TMDB `/discover/movie`)

The resolver folds all selected answers into a single `DiscoverParams`. Genres
add to `with_genres`; some answers add `without_genres`. Conflicts resolve by the
rules in "Conflict resolution".

TMDB movie genre IDs used (stable):

| Genre        | ID  |
| ------------ | --- |
| Action       | 28  |
| Adventure    | 12  |
| Animation    | 16  |
| Comedy       | 35  |
| Crime        | 80  |
| Documentary  | 99  |
| Drama        | 18  |
| Family       | 10751 |
| Fantasy      | 14  |
| History      | 36  |
| Horror       | 27  |
| Music        | 10402 |
| Mystery      | 9648 |
| Romance      | 10749 |
| Science Fiction | 878 |
| Thriller     | 53  |
| War          | 10752 |
| Western      | 37  |

### Mood

| answer       | with_genres (any of)               | without_genres |
| ------------ | ---------------------------------- | -------------- |
| `lift`       | Comedy, Family, Music              | Horror, War    |
| `cry`        | Drama, Romance                     | —              |
| `adrenaline` | Action, Thriller, Adventure        | —              |
| `think`      | Drama, Mystery, Science Fiction, History | —        |
| `cozy`       | Romance, Comedy, Family, Fantasy   | Horror         |
| `scary`      | Horror, Thriller, Mystery          | —              |

Note: TMDB `with_genres` joined by `|` means OR. We use OR for mood breadth.

### Company

| answer    | effect                                                                 |
| --------- | --------------------------------------------------------------------- |
| `solo`    | no change                                                              |
| `couple`  | gentle boost toward Romance/Drama if mood is neutral; no hard filter   |
| `friends` | add Comedy/Action to `with_genres`; no hard filter                     |
| `family`  | `certification_country=US`, `certification.lte=PG-13`, add Family, `without_genres += Horror, Thriller, War` (overrides mood genres on conflict) |

### Time

| answer     | runtime filter                          |
| ---------- | --------------------------------------- |
| `short`    | `with_runtime.lte=95`                   |
| `standard` | `with_runtime.gte=90`, `with_runtime.lte=150` |
| `any`      | none                                    |

### Era

| answer    | release window                                              |
| --------- | ---------------------------------------------------------- |
| `fresh`   | `primary_release_date.gte=2018-01-01`                      |
| `modern`  | `primary_release_date.gte=2000-01-01`                      |
| `classic` | `primary_release_date.lte=1999-12-31`                      |
| `any`     | none                                                       |

### Discovery

| answer    | sort_by              | vote_count.gte | notes                                |
| --------- | -------------------- | -------------- | ------------------------------------ |
| `popular` | `popularity.desc`    | 300            | well-known, safe picks               |
| `hidden`  | `vote_average.desc`  | 150            | quality floor avoids junk; lower popularity surfaces lesser-known titles |

### Always-on defaults

- `language=uk-UA` (client already defaults this)
- `include_adult=false`
- `vote_count.gte` floor from the discovery answer (never below 150) to keep
  quality acceptable
- `page` chosen by the picks endpoint for reshuffle variety (see below)

### Conflict resolution

- `without_genres` always wins over `with_genres` for the same genre (e.g.
  `family` removes Horror even if mood added it).
- If `with_genres` becomes empty after exclusions, fall back to the mood's
  genre list minus exclusions; if still empty, drop genre filtering entirely.
- Company genre additions are soft: appended only, never used to exclude.

### Mode B nudges (refinement deltas)

In Mode B, the user steers an already-proposed pick with directional buttons.
Each nudge is a delta applied to the running `DiscoverParams`. Nudges accumulate
(the client keeps the ordered list and replays it server-side each call), so a
user can go "funnier" twice to push further.

| nudge        | label        | delta                                                        |
| ------------ | ------------ | ----------------------------------------------------------- |
| `funnier`    | Веселіше     | +Comedy, −Horror; bump comedy keyword weight                |
| `scarier`    | Страшніше    | +Horror, +Thriller                                          |
| `deeper`     | Серйозніше   | +Drama, +Mystery; sort → `vote_average.desc`                |
| `more_action`| Більше екшену| +Action, +Adventure                                         |
| `shorter`    | Коротше      | step `with_runtime.lte` down (150→120→95)                   |
| `newer`      | Новіше       | step `primary_release_date.gte` up (→2010→2018→2022)        |
| `older`      | Старіше      | step `primary_release_date.lte` down (→2010→2000→1990)      |
| `obscure`    | Маловідоме   | sort → `vote_average.desc`, lower popularity, keep `vote_count.gte≥150` |
| `safer`      | Популярніше  | sort → `popularity.desc`, raise `vote_count.gte`            |

Rules:

- genre deltas are additive/subtractive on the running `with_genres` /
  `without_genres`; a `−genre` removes it from `with_genres` and adds to
  `without_genres`.
- numeric deltas clamp at sane bounds (runtime ≥ 60, year window stays valid).
- each refine call returns the next pick(s) excluding everything already shown
  (`shownTmdbIds`).
- Mode B applies the same relaxation ladder if a nudge over-constrains the pool.

## Result selection

1. Resolve answers → `DiscoverParams`.
2. Call `release.Discover(params, page)`; request up to 2 pages if needed to fill
   the batch.
3. If authenticated, exclude titles already in the user's saved lists.
4. Exclude any `excludeTmdbIds` passed by the client (reshuffle support).
5. Shuffle within the fetched pool for variety, then take `count` (default 6,
   max 12).
6. Attach a `reason` tag per pick derived from the dominant answers
   (e.g. "Адреналін · до 90 хв").

### Relaxation ladder (too few results)

If fewer than `count` valid picks after filtering, relax constraints in this
order and retry, stopping as soon as enough are found:

1. drop `with_runtime.*`
2. widen era (drop `primary_release_date.*`)
3. lower `vote_count.gte` to 50
4. drop `without_genres`
5. drop `with_genres`

Each relaxation step is recorded in `meta.relaxed` for debugging and so the UI
can optionally say "ми трохи розширили пошук".

## Technical design

### TMDB client

Add a discover method to `apps/backend/internal/tmdb/client.go`:

```go
type DiscoverParams struct {
    WithGenres       []int
    WithoutGenres    []int
    RuntimeLTE       int        // 0 = unset
    RuntimeGTE       int
    ReleaseDateGTE   string     // "YYYY-MM-DD", "" = unset
    ReleaseDateLTE   string
    SortBy           string     // default "popularity.desc"
    VoteCountGTE     int
    CertificationLTE string
    CertCountry      string
    Page             int        // 1-based
}

func (c *Client) Discover(ctx context.Context, p DiscoverParams) ([]Suggestion, error)
```

Implementation mirrors `listMovies`: build `/discover/movie`, set `language=uk-UA`,
map params to query keys (`with_genres` joined by `|`, `without_genres` by `,`,
`with_runtime.lte`, `primary_release_date.gte`, `sort_by`, `vote_count.gte`,
`include_adult=false`, `page`), decode `movieListResponse`, map to `Suggestion`.

Add a genre-ID constants file `apps/backend/internal/tmdb/genres.go` (the table
above) so the resolver and client share one source of truth.

### Release service

Add a `DiscoverProvider` interface and a `Discover` passthrough on
`release.Service`, wired in `buildReleaseProviders` like the existing providers:

```go
type DiscoverProvider interface {
    Discover(ctx context.Context, p tmdb.DiscoverParams) ([]release.Suggestion, error)
}
```

(Use a release-level param struct if we want to avoid leaking the tmdb type into
release; a thin mirror struct is acceptable and matches existing layering.)

### Mood package

New package `apps/backend/internal/moodpicker`:

- `types.go` — `Question`, `Option`, `QuestionSet`, `Answers`, `Pick`,
  `PicksResult`, `Meta`
- `schema.go` — the static question sets per depth + nudge definitions
- `mapping.go` — answer→`DiscoverParams` resolver, genre + keyword tables,
  conflict rules, nudge deltas, relaxation ladder
- `service.go` — `Questions(depth)` (returns the schema for a depth) and
  `Picks(ctx, req)` where `req` carries `{mode, depth, answers, nudges, count,
  excludeIDs, userID}` (resolve base params → apply nudges → discover → filter →
  re-rank/shuffle → reason tags)
- `service_test.go` — resolver, nudge-delta, and relaxation tests (table-driven,
  like games)

Dependencies (interfaces, satisfied by existing services):

- `catalogSource` with `Discover(...)` from `release.Service`
- optional `savedReader` with `SeedRows(ctx, userID)` from `saved.Service` to
  exclude saved titles when authenticated (same interface recommendations uses)

Wire in `apps/backend/internal/app/app.go` next to `gamesService`.

### API design

Two endpoints, registered in `routes.go`:

`GET /mood/questions` → static schema (no auth):

```json
{
  "items": [
    {
      "id": "mood",
      "title": "Який у тебе настрій?",
      "type": "single",
      "options": [
        { "id": "lift", "label": "Підняти настрій", "emoji": "😄" },
        { "id": "cry", "label": "Поплакати", "emoji": "😢" }
      ]
    }
  ],
  "meta": { "version": 1 }
}
```

`POST /mood/picks` → resolves answers to picks. Auth-optional: if the refresh
cookie/access token is present, exclude saved titles; otherwise anonymous.

Request (stateless — client sends full running state every call):

```json
{
  "mode": "guided",
  "depth": "standard",
  "answers": { "mood": "adrenaline", "company": "friends", "time": "short", "era": "fresh", "discovery": "popular" },
  "nudges": [],
  "count": 6,
  "excludeTmdbIds": [603, 27205]
}
```

- `mode`: `"guided"` (A) or `"refine"` (B).
- `depth`: `"quick" | "standard" | "deep"` (Mode A only; ignored for refine).
- `answers`: chosen options keyed by question id. For `refine`, a single `mood`
  seed is enough to start.
- `nudges`: ordered list of nudge ids applied so far (Mode B). The server replays
  them over the resolved base params.
- `count`: default 6, max 12. For `refine`, callers typically request 1.
- `excludeTmdbIds`: everything already shown this session.

`GET /mood/questions?depth=standard` returns only the questions for the requested
depth (3 / 5 / up to 10).

Response:

```json
{
  "items": [
    {
      "tmdbId": 12345,
      "mediaType": "movie",
      "title": "Назва",
      "year": "2021",
      "posterUrl": "https://...",
      "rating": 7.6,
      "reason": "Адреналін · до 90 хв"
    }
  ],
  "meta": {
    "count": 6,
    "relaxed": ["runtime"],
    "generatedAt": "2026-06-28T12:00:00Z"
  }
}
```

Validation: unknown step or option IDs → `400`. Missing required answers → `400`
with which step is missing. Empty result after full relaxation → `200` with empty
`items` and `meta.relaxed` populated, so the UI can show an empty state.

`POST` is used for picks (it has a request body and reads auth) and follows the
auth proxy pattern (cookie passthrough), not the plain games GET proxy.

### Frontend

New feature module `apps/frontend/src/features/mood`:

- `screens/MoodScreen.tsx` — orchestrates question flow and results
- `components/MoodQuestionCard.tsx` — one question with option chips, back button
- `components/MoodResults.tsx` — pick grid, reuses saved/details actions, `Show
  more` + `Start over`
- `hooks/useMoodSession.ts` — state machine
- `api/mood.ts` — `getQuestions()`, `getPicks(answers, count, excludeIds)`

Proxy routes:

- `app/api/mood/questions/route.ts` — GET passthrough (copy from games)
- `app/api/mood/picks/route.ts` — POST + cookie passthrough (copy from auth/login)

Copy lives in `libs/shared/src/strings.ts` under a `mood` namespace.

### State model

`useMoodSession` keeps it lightweight (no global store):

- `status`: `"asking" | "loading" | "results" | "empty" | "error"`
- `questions`: fetched schema
- `stepIndex`, `answers` (map of stepId → optionId)
- `picks`, `shownTmdbIds` (accumulated to feed `excludeTmdbIds` on reshuffle)
- `relaxed` (for the optional "we widened the search" hint)

## Caching

- Question schema: static, in-memory (no TTL needed); served directly.
- Discover responses: cache in the TMDB client or mood service keyed by a
  normalized param string, TTL 6–24h. Reshuffle uses a different `page`, so it
  naturally varies and benefits from the same cache.

## Edge cases and rules

- Movie-only in v1 (`mediaType="movie"` everywhere), TV deferred.
- `family` mode hard-excludes Horror/Thriller/War and applies a certification cap.
- Always `include_adult=false`.
- Reshuffle must not repeat already-shown titles within a session
  (`shownTmdbIds`).
- If `count` cannot be met even after full relaxation, return what we have plus
  `meta.relaxed`; the UI shows an empty/partial state, never an error.
- Anonymous users get the full flow; only `Save` routes them into auth.

## Analytics

Recommended events:

- mood session started
- question answered (step id, option id)
- picks requested (answers payload, count)
- pick details opened
- pick saved
- show-more / reshuffle used
- session restarted

Enough to learn which moods are popular and whether the picker drives details
opens and saves.

## Rollout plan

### Phase 1 (this spec)

- TMDB `Discover` + genre table
- `release.Discover` passthrough
- `moodpicker` package: schema + mapping + service + relaxation
- `GET /mood/questions`, `POST /mood/picks`
- Mode A (guided) with `quick` + `standard` depth (genre-based)
- frontend flow: questions → results → save/details → show more → start over
- anonymous play; authenticated users get saved-titles excluded

### Phase 2

- `deep` depth: TMDB keyword table + nuance questions + server-side re-rank over
  a larger pool.
- Mode B (refine): nudge buttons + delta resolver, sharing the Phase 1 engine.

### Phase 3

- LLM "why this fits your mood" one-line flavor per pick. Provider-agnostic via
  the AI Assistant layer (see `ai-assistant-spec.md`); never selects titles, runs
  after deterministic selection, cacheable per (tmdbId, mood).
- Personalize the resolver from user preferences if/when that feature ships
  (bias genres/languages, respect avoided genres).
- TV support with separate runtime/era semantics.

### Phase 4

- Persist mood sessions and a small "your moods" history.
- Shareable mood result link.

## Open questions

1. Is the Mood Picker its own nav entry, a home card, or both at launch?
2. Default result `count` — 6 or 9?
3. Single-choice only, or allow multi-select for the mood step (e.g. "смішне +
   страшне")?
4. Should `family` mode be movie-only with a hard certification cap, or also
   surface animation-forward picks explicitly?
5. Do we ship the optional "we widened your search" hint in v1, or keep relaxation
   silent?

## Recommendation

Ship a deterministic v1 Mood Picker as a dedicated single-player page:

- five fixed questions, server-provided schema
- answer→`/discover` resolver with a relaxation ladder
- movie-only, anonymous-friendly, saved-excluded for authed users
- results with reason tags, `Save`/`Details`, and `Show more`

Treat the LLM flavor layer, preference personalization, TV, and persisted history
as planned Phase 2/3 extensions, not launch blockers.
