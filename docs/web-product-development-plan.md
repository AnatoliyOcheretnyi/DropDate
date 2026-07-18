# DropDate Web Product Development Plan

Status: Implemented roadmap baseline

Scope: web product and backend; mobile is intentionally out of scope

## Agreed delivery sequence

The roadmap will be delivered as independent vertical releases. Akinator
stabilization is complete. Product analytics and Sentry remain important but
are intentionally postponed and must not block the following releases.

1. ✅ Pick of the day — implemented as a stable UTC-day selection from the
   grounded personalized recommendation pool, with a home card and watchlist
   action.
2. ✅ Watch providers and preferred country/services.
3. ✅ Notifications for followed people, friend requests, and accepted requests.
4. ✅ Taste onboarding.
5. ✅ Iterative in-session feedback for Match and Mood.
6. ✅ Cross-cultural Bridge MVP.
7. ✅ Direct friend recommendations, shared lists, and a friends activity page.
8. ✅ Persistent game statistics, challenges, and game achievements.
9. ✅ Episode tracking and Continue Watching.
10. ✅ Adaptive pairwise ranking for genres and countries, connected to all
    recommendation surfaces.

Each release must include its backend contract, web experience, persistence,
empty/loading/error states, and relevant tests. Avoid one large cross-feature
merge.

## Product assessment

Current overall assessment: **7/10 as a user-facing product** and **8/10 as a
beta/pet project**.

| Area | Assessment |
| --- | --- |
| Technical implementation | 8/10 |
| Visual execution | 7.5/10 |
| Feature breadth | 8.5/10 |
| Clarity of core value | 6/10 |
| Daily/weekly retention | 5.5/10 |
| Product potential | 8/10 |

DropDate already has enough functionality: tracking and saved lists,
notifications, calendar, recommendations, mood and match flows, people,
friends, achievements, games, and Movie Akinator. The main constraint is no
longer feature count. It is product focus, onboarding, retention, reliability,
and measurement.

## Product position

Recommended promise:

> **Find a film you would not have discovered on your own.**

The differentiator should be the combination of:

- personalized discovery;
- cross-cultural recommendations outside the usual Hollywood bubble;
- clear explanations of why each title fits;
- playful discovery through mood flows, games, and social challenges.

DropDate should not compete head-on with:

- **Letterboxd** as a social diary, review platform, and public-list network;
- **JustWatch** as the largest streaming availability catalog;
- generic TMDB clients that mainly expose trending rows and title details.

Tracking, lists, release dates, and streaming availability should support the
discovery promise rather than become separate competing product identities.

## Product principles

1. Every major recommendation must answer: **why this title, why for this user,
   and why now?**
2. A new user should receive a meaningful personalized result during the first
   session.
3. Prefer one strong daily recommendation over another long generic carousel.
4. Discovery must be actionable: show where a title can be watched in the
   user's country.
5. Games should feed discovery, sharing, and social interaction rather than
   exist as an isolated arcade.
6. Do not add major features without analytics that can measure their effect.

## Phase 0: Measurement and reliability

Priority: critical. Complete before expanding the product surface.

### Product analytics

Add an analytics layer such as PostHog or a small provider-neutral event
interface. Track at minimum:

- landing viewed;
- signup started/completed;
- onboarding started/completed;
- first title saved;
- first rating submitted;
- recommendation opened/saved/dismissed;
- mood or match session started/completed;
- game and Akinator started/completed/shared;
- friend request and recommendation sent;
- return visit after 1, 7, and 30 days.

Core funnel:

`visit -> signup -> taste calibration -> first recommendation -> first save -> return`

### Reliability

- Make database migrations an explicit required deployment step or run them in
  a controlled release job before starting a new backend version.
- Prevent frontend/backend version skew for newly introduced API routes.
- Protect all `/jobs/*` endpoints with `JOBS_ACCESS_TOKEN`.
- Add health/status reporting for background jobs and dataset freshness.
- Add Sentry or equivalent error monitoring to frontend and backend.
- Add API contract tests and Playwright coverage for signup, save, mood/match,
  games, and Akinator start.
- Document rollback behavior for migrations and feature flags.

Success criteria:

- critical user journeys are covered by automated smoke tests;
- deploys cannot expose a frontend feature before its backend API is ready;
- background-job failures are visible without reading raw server logs.

## Phase 1: Taste onboarding

Build a short calibration flow for users without enough saved/rated titles.

### Experience

1. Show 15-20 recognizable but culturally diverse films.
2. Ask the user to mark titles as loved, liked, disliked, not seen, or not
   interested.
3. Ensure the initial set is balanced across countries, decades, and genres.
4. Produce an immediate taste summary and 5 personalized recommendations.
5. Explain the strongest detected preferences in plain language.

Do not require registration before demonstrating value. Preserve the anonymous
calibration locally and attach it to the account after signup.

Success metrics:

- onboarding completion rate;
- percentage reaching the first personalized result;
- first-session save rate;
- signup conversion after seeing recommendations.

## Phase 2: Daily discovery loop

### Pick of the day

Add one daily recommendation with:

- a strong visual card;
- a concise personalized explanation;
- a label such as familiar, nearby discovery, or wildcard;
- save, dismiss, watched, and details actions;
- a shareable result;
- availability for the selected country.

The daily pick should be deterministic for the user and remain stable during
the day. Feedback must influence future picks.

### Weekly wildcard

Offer one deliberately less obvious title each week. Explain the connection to
the user's existing taste so it feels curated rather than random.

Success metrics:

- daily/weekly pick open rate;
- save and details-open rate;
- feedback rate;
- D1, D7, and D30 retention;
- notification-to-open conversion.

## Phase 3: Cross-cultural bridge

This is the recommended core differentiator.

### First release

1. Select 2-3 positively rated or loved titles.
2. Extract reusable taste dimensions: tone, pace, themes, genre combinations,
   conflict type, and preferred era.
3. Retrieve candidates from underrepresented countries and languages through
   TMDB Discover.
4. Correct popularity bias using country-relative rating and vote thresholds.
5. Return five gateway films with explanations connecting known taste to the
   unfamiliar cinema tradition.

Give users explicit controls:

- familiar to adventurous;
- preferred or excluded regions;
- movie/TV choice;
- runtime and availability constraints.

Success metrics:

- percentage of recommendations from previously unseen countries;
- saves and positive reactions to cross-cultural picks;
- diversity of countries consumed per active user;
- repeated use of the discovery controls.

## Phase 4: Where to watch

Integrate TMDB watch providers as the initial implementation.

- Let the user select a country and preferred streaming services.
- Display subscription, rent, and buy availability on details and
  recommendation cards.
- Filter discovery results by practical availability when requested.
- Notify users when saved titles become available on preferred services, where
  the data supports it.
- Treat unavailable or stale provider information explicitly rather than
  implying certainty.

This feature supports discovery; it should not attempt to replicate the full
JustWatch catalog and filtering product.

## Phase 5: Complete existing loops

Prefer completing current features over opening new product areas.

### People

- Notify users about new releases featuring followed actors and directors.
- Use followed people as an optional recommendation signal.

### TV tracking

- Add episode progress and a `Continue watching` rail.
- Support bulk season actions and show the next unwatched episode.
- Connect release notifications to actual viewing progress.

### Match and mood

- Add in-session positive/negative feedback.
- Refine results without polluting the long-term taste profile.
- Preserve session state across details navigation.

## Phase 6: Social utility

Move beyond passive profile viewing.

- Recommend a title directly to a friend with a short message.
- Create shared lists for a date night or group watch.
- Add public share links with privacy controls.
- Add asynchronous friend challenges using the existing seeded games.
- Let a game result open the discovered title or save it immediately.
- Add a lightweight friends activity feed only after direct interactions prove
  useful. The web product should expose it on a dedicated friends activity page
  with filters for saves, ratings, recommendations, achievements, challenges,
  and newly accepted friendships.

Success metrics:

- recommendations sent and accepted;
- shared-list creation and repeat use;
- challenge completion rate;
- invitations that lead to signup.

## Games strategy

Do not prioritize additional game modes in the near term. The existing set is
already broad enough.

Improve the current games through:

- persistent backend statistics instead of localStorage-only records;
- daily streaks and compact leaderboards;
- friend challenges on identical seeded questions;
- game achievements connected to the existing achievement system;
- discovery actions after every reveal: details, save, and related picks;
- quality analytics for completion, replay, and sharing.

Movie Akinator should receive dataset-quality tuning and result analytics before
expanding to TV, actors, or characters.

## Adaptive taste ranking

Replace the current passive genre/country ordering in the profile with an
interactive ranking calibration based on pairwise choices.

### Experience

The user completes a finite series of short rounds. A round asks a choice such
as:

- horror or comedy;
- comedy or drama;
- Japan or South Korea;
- France or United States;
- both equally / neither / not enough experience.

The system should not ask every possible pair. It should select the next pair
where the user's ordering is most uncertain and stop when the ranking is stable
enough or the configured round budget is exhausted. The user can recalibrate
later and see how confidence improves over time.

### Ranking model

Use an online pairwise-ranking model such as Elo for the first implementation,
with per-item uncertainty and comparison count. Bradley-Terry or TrueSkill can
replace it later without changing the API contract.

Persist separately for genres and countries:

- rating/score;
- uncertainty or confidence;
- number of comparisons;
- wins, losses, ties, and skips;
- last compared timestamp;
- explicit exclusions, if any.

Question selection should prioritize:

1. pairs with high uncertainty;
2. nearby ratings whose order is not established;
3. under-compared items;
4. occasional calibration pairs between the top and middle of the ranking.

### Recommendation integration

The ranking is a **soft preference signal**, never a hard catalog filter.

Recommended candidate score:

`relevance + taste affinity + quality + freshness + diversity + exploration`

Guardrails:

- reserve a diversity budget for genres, countries, and languages outside the
  user's top preferences;
- cap the contribution of any single country or genre;
- distinguish `unknown` from `disliked`;
- avoid interpreting a preference for Japan as a request for an all-Japanese
  feed;
- mix familiar anchors, adjacent discoveries, and deliberate wildcards;
- explain when a recommendation is shown because it matches a strong
  preference versus when it is an exploration pick;
- decay stale confidence gradually and allow explicit recalibration.

A practical initial feed mix is:

- 55% strong preference matches;
- 25% adjacent exploration;
- 15% cross-cultural or cross-genre discoveries;
- 5% wildcards.

The exact mix must later be tuned from product analytics rather than treated as
a permanent constant.

## UX improvements

- Make the homepage communicate the core promise within the first screen.
- Reduce competition between navigation destinations; emphasize Discover,
  Saved, and the daily pick.
- Keep advanced discovery under a focused Explore surface rather than adding
  more homepage rows.
- Provide consistent loading, empty, offline, and degraded-backend states.
- Explain when AI is unavailable and show a deterministic fallback.
- Audit keyboard navigation, focus states, color contrast, and reduced motion.
- Preserve user context when returning from title details.

## Data portability and trust

- Add CSV import from Letterboxd/IMDb-compatible exports to reduce switching
  cost for established film fans.
- Add account data export and deletion.
- Introduce list-level visibility controls before expanding social features.
- Explain which signals influence recommendations.
- Keep ephemeral mood/match feedback separate from durable taste signals.

## What not to build yet

- More standalone game modes.
- A full review/comment platform competing with Letterboxd.
- A comprehensive streaming catalog competing with JustWatch.
- Billing before retention and willingness to pay are measured.
- Complex public activity feeds before direct friend interactions work.
- LLM-generated titles outside a grounded TMDB candidate set.
- A large homepage made of many generic genre and country carousels.

## Recommended execution order

1. Analytics, error monitoring, deployment safety, and job health.
2. Taste calibration onboarding with immediate recommendations.
3. Pick of the day and weekly wildcard.
4. Cross-cultural bridge MVP.
5. Watch-provider availability.
6. Followed-person notifications and TV progress.
7. Friend recommendations, shared lists, and seeded challenges.
8. Persistent game statistics and achievement integration.

## North-star and guardrail metrics

Recommended north-star metric:

> **Weekly active users who save, positively rate, or start watching a title
> discovered through DropDate.**

Supporting metrics:

- activation: first personalized result and first save;
- discovery quality: save/positive-feedback rate per recommendation;
- retention: D1, D7, D30 and weekly returning users;
- breadth: new countries/languages discovered per user;
- actionability: provider click-through rate;
- social: accepted recommendations and completed challenges;
- reliability: API error rate, failed jobs, and stale datasets.

Guardrails:

- recommendation latency and AI cost per active user;
- percentage of recommendations without watch availability;
- repeated-title rate;
- popularity and country concentration;
- notification opt-out rate;
- critical frontend/backend version mismatches.

## External product references

- Letterboxd lists and tracking:
  <https://letterboxd.com/about/faq/?s=marking>
- Letterboxd import model:
  <https://letterboxd.com/about/importing-data/>
- Letterboxd subscription and availability features:
  <https://letterboxd.com/about/pro/>
- JustWatch streaming discovery:
  <https://www.justwatch.com/us>
