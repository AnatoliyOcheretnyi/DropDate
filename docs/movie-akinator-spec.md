# Movie Akinator Spec

Status: Draft

Scope: DropDate web and backend

Document type: Combined product + technical spec

## Why a separate spec

This is a different machine from the Mood Picker. The picker **proposes** films
from filters; the Akinator **guesses** a film the user is already thinking of by
asking the most discriminating questions. That requires a different engine
(information-gain question selection + Bayesian candidate scoring over a
precomputed feature dataset), a different surface (it belongs in **Games**, not
the picker), and a different data pipeline (an offline feature build). Mixing it
into the picker spec would muddy both.

## Problem / opportunity

Users enjoy "20 questions" style guessing games (the classic Akinator). DropDate
has a rich TMDB-backed movie catalog but no playful guessing loop. A movie
Akinator:

- is a high-engagement, repeatable game ("can it guess my movie?")
- naturally drives details opens and saves (the guess card links into both)
- reuses the catalog we already ingest
- creates a strong future social hook ("challenge a friend to stump it")

The classic Akinator typically converges in ~10–20 questions. We target a
similar feel: a confident guess within ~15 questions for reasonably well-known
films.

## How it works (concept)

1. User thinks of a movie and starts a session.
2. The app asks one question at a time. Each question is a feature with five
   Akinator-style answers: **Yes / Probably / Don't know / Probably not / No**.
3. After each answer the engine updates a weighted candidate distribution and
   picks the next most informative question.
4. When one candidate dominates (or after a max question count), the app makes a
   **guess** card (poster, title, year) and asks "Is this it?".
5. On correct: celebrate, offer Details/Save, log the win.
   On wrong: optionally keep going (next-best questions) or let the user reveal
   the actual title; either way log the outcome to improve the dataset.

## Goals

1. Ship a single-player movie guessing game on the Games surface.
2. Confidently guess well-known movies within ~15 questions.
3. Be fully deterministic and offline-data driven (no per-question TMDB calls,
   no LLM in v1).
4. Reuse details route and saved-list actions on the guess card.
5. Log outcomes so guessing quality can improve over time.

## Non-goals

1. No characters/actors/TV in v1 — movies only (different feature spaces).
2. No LLM in v1. The engine is statistical, not generative.
3. No per-question TMDB calls — everything runs off a precomputed feature table.
4. No persistent leaderboards or PvP in v1 (future, like games).
5. No learning/ML training pipeline in v1 — we only **log** outcomes for later.

## Current state

- TMDB client and catalog providers already exist (`internal/tmdb`,
  `internal/release`); we can build a feature table from them.
- There is an existing scheduled background job pattern
  (`/jobs/notifications`, notifications job runs on an interval) we can mirror for
  a daily feature-build job.
- The games feature gives us the Games surface and frontend structure to reuse.

Gap: there is no precomputed catalog feature dataset and no information-gain
engine. Both are new.

## Technical design

### Feature dataset (offline build)

The engine cannot query TMDB per question, so we precompute a compact feature
table over a bounded catalog.

- **Catalog scope:** the top N most popular/known movies (start N≈4000). Big
  enough to feel magical, small enough to keep entropy math trivial and guesses
  recognizable. Obscure titles hurt the experience, so we bias to popularity.
- **Source:** iterate TMDB popular/top-rated (and optionally `/discover` sorted
  by popularity) + details, reusing the existing client. Run as a scheduled job
  (mirror the notifications job) refreshing daily/weekly.
- **Storage:** a `movie_features` table in Postgres, loaded into memory at
  startup and on refresh. The in-memory snapshot is what the engine reads.

Per-movie features (binary or small-categorical, derived from TMDB metadata):

| feature             | derivation                                            |
| ------------------- | ----------------------------------------------------- |
| `is_animated`       | genre contains Animation                               |
| `genre_*`           | one flag per major genre (action, comedy, drama, …)    |
| `decade`            | bucket from release year (pre-1980, 80s, 90s, 00s, 10s, 20s) |
| `rating_tier`       | vote_average bucket (high ≥7.5, mid 6–7.5, low <6)     |
| `runtime_tier`      | <90 / 90–120 / 120–150 / >150                          |
| `is_franchise`      | belongs to a TMDB collection                           |
| `is_english`        | original_language == en                                |
| `popularity_tier`   | very famous / famous / known                           |
| `origin_region`     | US / Europe / Asia / other (from origin_country)       |
| `is_recent`         | released in last ~5 years                              |

Each feature also carries a **prior P(answer | feature)** assumption so "Don't
know" and noisy answers degrade gracefully.

### Engine (stateless per request)

We keep the engine **stateless**: the client holds the answer history; the server
recomputes the candidate distribution from the in-memory feature table on every
call. Cost is trivial (≈ N candidates × M features per step; ~4000 × ~30 is
nothing), and it avoids a session store.

Per step:

1. Start every candidate at a weight equal to its popularity prior (more famous
   = more likely to be what a user thought of).
2. Replay each prior answer as a Bayesian update: multiply each candidate's
   weight by `P(answer | candidate's feature value)`, with a noise floor so a
   single contradicting answer never zeroes a candidate (Akinator tolerates
   mistakes). "Don't know" applies a near-neutral update.
3. **Question selection:** for each not-yet-asked feature, compute expected
   information gain (entropy reduction) over the current weighted distribution;
   ask the feature with the highest gain. Tie-break by feature robustness
   (prefer features users answer confidently, e.g. `is_animated` over fuzzy ones).
4. **Guess condition:** guess when the top candidate's normalized weight exceeds
   a threshold (e.g. ≥0.55) and leads the runner-up by a clear margin, OR when
   `questionsAsked >= maxQuestions` (e.g. 20). Guess = current top candidate.
5. On a wrong guess, drop that candidate and continue, or end and let the user
   reveal.

### API design

Stateless; client echoes history each call.

`GET /akinator/start` → first question + a `sessionToken` (opaque, just for
analytics correlation; no server state):

```json
{
  "sessionToken": "ak_…",
  "question": { "id": "is_animated", "text": "Це анімаційний фільм?" },
  "step": 1
}
```

`POST /akinator/next` → send full answer history, get next question or a guess:

```json
// request
{
  "sessionToken": "ak_…",
  "answers": [
    { "questionId": "is_animated", "answer": "no" },
    { "questionId": "decade_is_recent", "answer": "yes" }
  ]
}
```

```json
// response — either a question…
{ "type": "question", "question": { "id": "genre_action", "text": "Це бойовик?" }, "step": 3 }
// …or a guess
{
  "type": "guess",
  "guess": { "tmdbId": 27205, "title": "Початок", "year": "2010", "posterUrl": "…", "confidence": 0.62 },
  "step": 12
}
```

`POST /akinator/result` → log outcome (no state, analytics + future learning):

```json
{ "sessionToken": "ak_…", "guessTmdbId": 27205, "correct": false, "actualTmdbId": 157336 }
```

Answer enum: `yes | probably | unknown | probably_not | no`.

Validation: unknown question/answer ids → `400`. If the engine has no candidates
left (over-contradicted), return a graceful `type: "give_up"` response inviting
the user to reveal the title (which we log).

### Backend package

New package `apps/backend/internal/akinator`:

- `features.go` — feature definitions + per-movie feature extraction from
  `release.Details`
- `dataset.go` — load/refresh the `movie_features` snapshot (from DB; built by the
  job)
- `engine.go` — Bayesian update, information-gain question selection, guess logic
- `service.go` — `Start()`, `Next(answers)`, `LogResult(...)`
- `engine_test.go` — deterministic tests: known answer paths converge to the
  expected movie; "don't know" stays neutral; contradictions don't zero out

Plus a feature-build job (mirror the notifications job wiring in `app.go` /
`/jobs/...`) writing the `movie_features` table.

Wire `akinatorService` in `app.go` next to `gamesService`.

### Frontend

Module `apps/frontend/src/features/akinator` (under the Games surface):

- `screens/AkinatorScreen.tsx` — question flow + guess/result
- `components/AkinatorQuestionCard.tsx` — text + 5 answer buttons + progress
- `components/AkinatorGuessCard.tsx` — guess with "Це він?" + Details/Save + wrong
- `hooks/useAkinatorSession.ts` — holds answer history, calls the API
- `api/akinator.ts`

Proxy routes `app/api/akinator/{start,next,result}/route.ts` (GET for start, POST
for the rest), same proxy patterns as games/auth.

### State model (frontend)

- `sessionToken`, `answers[]` (history), `step`
- `current`: `{type:"question"|"guess"|"give_up", …}`
- result feedback state

## Data quality and tuning

- Bias candidate priors strongly toward popularity — guessing an obscure film the
  user wasn't thinking of feels worse than guessing a famous one.
- Cap the catalog (N) so guesses stay recognizable; expand carefully.
- Log every session outcome (`/akinator/result`) with the answer path. This is the
  raw material to later: re-weight priors, fix bad features, and (much later)
  train a learned model. v1 only logs.

## Analytics

- session started
- question answered (id, answer)
- guess shown (tmdbId, step, confidence)
- guess correct / wrong
- reveal (actual tmdbId after wrong/give-up)
- details/save from guess card

Key metrics: average questions-to-guess, guess accuracy, give-up rate.

## Rollout plan

### Phase 1

- feature dataset build job + `movie_features` table (top ~4000 movies)
- stateless engine (Bayesian update + info-gain selection + guess threshold)
- `GET /akinator/start`, `POST /akinator/next`, `POST /akinator/result`
- frontend flow under Games; Details/Save on guess; outcome logging

### Phase 2

- tune priors and features from logged outcomes
- expand catalog size; add "keep guessing" after a wrong guess
- add TV series as a separate catalog/feature space

### Phase 3

- characters/actors mode (new feature space)
- social: "stump the bot" challenge links, shared seeds
- learned scoring model trained on logged sessions

## Open questions

1. Catalog size N for v1 — 4000 enough, or start smaller (2000) for tighter guesses?
2. Max questions before a forced guess — 20, or push to make it guess earlier?
3. Movies only confirmed for v1 — is a TV mode wanted soon, or strictly later?
4. Where does Akinator sit relative to the existing comparison games — same Games
   hub, separate tab?
5. Do we persist sessions server-side at all, or stay fully stateless (current
   recommendation) and rely only on `/result` logging?

## Recommendation

Build a stateless, offline-data-driven movie Akinator in Games: a daily-built
`movie_features` table over the top ~4000 movies, a Bayesian + information-gain
engine, three thin endpoints, and a five-button question flow that ends in a
guess card with Details/Save. Log every outcome from day one so guessing quality
can be tuned later. Keep characters/actors, TV, social, and any learned model as
explicit later phases.
