# AI Assistant Spec

Status: Draft — not started. Parts of the original premise are already
superseded by shipped work; see "Current state" below.

Scope: DropDate web and backend

Document type: Combined product + technical spec

## Current state (updated 2026-07)

When this spec was written, DropDate had no LLM integration. That is no longer
true:

- **Gemini is already integrated** (`internal/airecs`): grounded AI
  recommendations (`/recommendations/me?ai=1`), adaptive mood next-question
  selection (`/mood/next`), and the person-page AI pick (`/person/recommend`).
- **Capability layer exists** (`internal/capabilities`): `AIRecommendations` /
  `AIMood` / `AIMatch` flags, ready for per-user gating without changing
  call-sites.
- **Monetization decision** (see `discovery-ideas.md`, розділ 11): billing is
  deliberately **deferred**. All users get all features; AI features hide
  behind capability flags so a paid gate can be turned on later without a
  rewrite. The Stripe half of this spec is design-for-later, not current work.

What remains live here: the **provider-agnostic gateway** idea (today features
call Gemini directly) and the flagship use case — **natural-language search**
(розділ 6 беклогу, ще не реалізовано).

## Why this spec

This covers a **provider-agnostic AI gateway** plus its first dedicated
user-facing use case (natural-language movie search), and — when we decide to
monetize — the Stripe subscription design that would gate AI usage.

These belong in one spec because they are coupled: AI calls cost money and are
abusable, so quotas and a paid tier are not an afterthought. The mood picker
and Akinator reference this layer for their optional LLM bits; they do not own
an LLM integration of their own.

## Problem / opportunity

- Today search is literal TMDB title search. Users who half-remember a film
  ("той фільм де мужик застряг на Марсі", "щось як Інтерстеллар, але смішне")
  can't find it.
- We have no monetization. AI features are the natural premium hook if/when we
  introduce subscriptions (currently deferred by decision).

Opportunity: a natural-language search that actually finds films from vague
descriptions, packaged as a flagship feature. The same AI layer later powers
mood flavor text, smart pitches, and conversational refinement.

## Goals

1. A single provider-agnostic LLM gateway in the backend (one place for keys,
   timeouts, retries, caching, quotas, cost control).
2. Natural-language search that returns **real TMDB titles only** (no
   hallucinations).
3. Free vs paid tiers via Stripe, with server-enforced entitlements and quotas.
4. Clean seams so other features (mood flavor, details pitch) reuse the gateway.

## Non-goals

1. No model fine-tuning or self-hosting.
2. No open-ended chatbot in v1 — scoped tasks (search, later flavor/pitch) only.
3. No client-side trust for entitlements — all gating is server-side.
4. No storing of card/payment data — Stripe holds it; we store status only.
5. AI never selects/returns a title that isn't confirmed in TMDB.

## Provider strategy

Reality check: **Gemini is already the de-facto provider** (used by `airecs`
without a gateway). The gateway should be introduced by wrapping the existing
Gemini integration first, then optionally adding others.

Original candidate for a second/free provider: **Grok (xAI)** using a free
model/tier where available. xAI's API is OpenAI-compatible (chat completions +
JSON/structured output), which makes the gateway simple.

Design principle: **provider-agnostic gateway.** We program against an internal
`llm.Provider` interface, not against Grok directly. This lets us:

- swap or add providers (e.g. a higher-quality paid model) without touching
  feature code,
- route by tier — free users on Grok's free model, premium users optionally on a
  stronger model,
- fail over if one provider is down.

Honest tradeoff to record: free Grok models are great for cost but vary in
quality, rate limits, and availability — verify current models/limits at xAI
before launch and keep them in config, not hardcoded. For the highest-quality
extraction we can later route premium traffic to a stronger model (e.g. a Claude
model such as `claude-haiku-4-5` for cheap structured tasks or
`claude-sonnet-4-6` for harder ones) behind the same interface. The gateway makes
that a config change, not a rewrite.

## The LLM gateway (backend)

New package `apps/backend/internal/llm`:

```go
type Provider interface {
    // Complete runs a single structured prompt and returns raw text (usually JSON).
    Complete(ctx context.Context, req Request) (Response, error)
}

type Request struct {
    System      string
    User        string
    JSONSchema  any     // optional: request structured/JSON output
    MaxTokens   int
    Temperature float32
}
```

- `grok.go` — Grok/xAI provider (OpenAI-compatible HTTP), key from config.
- `gateway.go` — wraps a `Provider` with: timeouts, bounded retries, a response
  cache (keyed by normalized prompt), per-user quota checks, structured logging,
  and a hard monthly cost ceiling kill-switch.
- config: `LLM.Provider`, `LLM.APIKey`, `LLM.Model`, `LLM.BaseURL`, budget caps —
  wired like the existing `TMDB.Token` config.

All features call the **gateway**, never a provider directly. The gateway is the
only place that talks to an AI vendor.

### Grounding (anti-hallucination) — mandatory

LLMs invent plausible-but-fake movies, posters, and years. The rule for every
feature: **the LLM proposes, TMDB confirms.** Nothing reaches the user that
isn't resolved to a real TMDB record. The gateway returns text; the calling
feature is responsible for resolving against TMDB and dropping anything unmatched.

## Use case 1 — Natural-language search (flagship)

### Flow

1. User types a free-text description in the AI search box.
2. Backend sends it to the gateway with a structured-output prompt asking for
   **either**:
   - `titles`: up to ~8 candidate exact movie titles (+ year if known) — best for
     "the movie where…" plot queries the model knows; **or**
   - `filters`: structured discover filters (genres, keywords, era, country) —
     best for "something like X but funnier" vibe queries.
   The model may return both.
3. Backend **resolves**:
   - each `title` via TMDB search → take the best match → keep only real hits;
   - `filters` via TMDB `/discover` (reuses the mood picker's `Discover`).
4. Merge, dedup, drop anything without a TMDB match, rank (exact-title matches
   first, then discover hits), return real `Suggestion`s + a short `interpretation`
   string ("Шукаю наукову фантастику про виживання на Марсі").
5. Frontend renders normal title cards with Details/Save.

### API

`POST /ai/search` (auth-aware; quota-enforced):

```json
// request
{ "query": "фільм де мужик сам застряг на Марсі і вирощує картоплю" }
```

```json
// response
{
  "interpretation": "Sci-fi survival on Mars",
  "results": [
    { "tmdbId": 286217, "mediaType": "movie", "title": "Марсіанин", "year": "2015", "posterUrl": "…", "source": "title_match" }
  ],
  "meta": { "model": "grok-…", "cached": false, "quota": { "remaining": 4, "limit": 5 } }
}
```

- `source`: `title_match` | `discover` so the UI can label confidence.
- Empty results → `200` with empty `results` + interpretation, never an error.
- Over quota → `402`/`403` with an `upgrade` hint (see Monetization), surfaced as
  an upgrade prompt.

### Prompt shape (sketch)

System: "You map vague descriptions to real movies. Return strict JSON
`{titles:[{title,year}], filters:{genres[],keywords[],yearFrom,yearTo,country}}`.
Never invent obscure titles; if unsure, prefer well-known matches and also fill
filters. Do not add commentary." User: the raw query. Request JSON output.

The model's titles are treated as **hypotheses**, never as final results — TMDB
resolution is the source of truth.

### Caching & cost

- Cache by normalized query (lowercased, trimmed) with a multi-hour TTL —
  repeated/popular queries cost nothing.
- Short max tokens; JSON output keeps responses small.
- Per-user daily quota (Monetization) bounds spend; the gateway's monthly ceiling
  is the backstop.

## Use case 2 — Mood flavor text (reuses gateway)

After the mood picker's selection, optionally ask the gateway for a one-line
"why this fits your mood" per pick. Cacheable per `(tmdbId, mood)`. Never
selects titles. Candidate for premium gating (via the existing capability
layer).

## Use case 3 — Smart pitch on details (optional, later)

A spoiler-free one-paragraph "why you might like this" on the details page,
generated from TMDB metadata, cached per title. Premium-gated. Listed here so it
reuses the same gateway and quota model rather than spawning a new integration.

## Abuse & safety

- **Prompt injection:** the user query is data, not instructions. Keep the system
  prompt fixed, wrap user input clearly, and never let model output trigger side
  effects — its only effect is "search TMDB for these." Grounding via TMDB
  neutralizes most injection impact.
- **Content:** rely on the provider's safety + TMDB's `include_adult=false`.
- **Quotas/rate-limit:** enforced server-side per user (and a small per-IP cap for
  anonymous) to stop scraping/cost abuse.

## Monetization — Stripe subscriptions (DEFERRED)

> **Decision (see беклог, розділ 11):** billing is not being built now. All
> users get everything; AI features sit behind capability flags
> (`internal/capabilities`) so a paid gate can be enabled later without
> rewriting call-sites. This section is the design to pick up when that
> changes.

AI calls cost money, so a paid tier ships **with** a public AI feature, not
later.

### Tiers (illustrative)

| capability                 | Free            | Premium        |
| -------------------------- | --------------- | -------------- |
| Browse / saved / games / mood picker | full   | full           |
| AI natural-language search | N/day (e.g. 5)  | high/unlimited |
| Mood flavor text           | off             | on             |
| Smart pitch                | off             | on             |

Numbers are tunable in config; entitlements are derived from plan + subscription
status, never sent by the client.

### Data model

Migration adds:

- `user_subscriptions` — `user_id` (FK), `stripe_customer_id`,
  `stripe_subscription_id`, `plan`, `status`
  (`active|trialing|past_due|canceled|…`), `current_period_end`, timestamps.
- `ai_usage` — `user_id`, `day` (date), `count`. Incremented per AI call; checked
  against the tier quota before each call. (Or a rolling counter; daily bucket is
  simplest.)

Entitlement resolution: a user is Premium iff they have a `user_subscriptions`
row with status in {`active`,`trialing`} and `current_period_end` in the future.

### Backend (Stripe)

New package `apps/backend/internal/billing` + endpoints in `routes.go`:

- `POST /billing/checkout` — create a Stripe Checkout Session for the logged-in
  user (creating/reusing a `stripe_customer_id`), return the session URL.
- `POST /billing/portal` — return a Stripe Customer Portal URL so users manage or
  cancel their subscription.
- `POST /billing/webhook` — **verify the `Stripe-Signature`**, then handle
  `checkout.session.completed`, `customer.subscription.created|updated|deleted`,
  `invoice.paid|payment_failed` → upsert `user_subscriptions`. Idempotent by Stripe
  event id.
- `GET /me/entitlements` — current plan, status, and AI quota usage for the UI.

Config: `Stripe.SecretKey`, `Stripe.WebhookSecret`, `Stripe.PriceID`, wired like
existing secrets. The webhook is the **source of truth** for subscription state —
never grant Premium based on a client redirect alone.

### Gating

A small entitlement check (middleware/helper) wraps premium endpoints:

- `/ai/search`: allowed for free users until the daily quota is hit, then `402`
  with an upgrade hint; premium users bypass the low cap.
- mood flavor / smart pitch: premium-only.

The check reads `user_subscriptions` + `ai_usage`; the client never decides.

### Security notes

- Verify webhook signatures; reject unsigned/invalid.
- Treat the webhook as the only authority on `status`/`current_period_end`.
- Store no card data — only Stripe ids and status.
- Make webhook handling idempotent (dedupe by event id).

### Frontend

- Pricing/upgrade screen + "Upgrade" entry points (e.g. when AI quota hits zero).
- `app/api/billing/{checkout,portal}/route.ts` and `app/api/ai/search/route.ts`
  and `app/api/me/entitlements/route.ts` proxies (POST + cookie passthrough, like
  auth).
- AI search UI: input, interpretation line, result grid, quota indicator, and an
  upgrade modal on `402`.
- "Manage subscription" button → `/billing/portal`.
- Entitlements fetched once into auth/app state to toggle premium UI.

## Rollout plan

Note: while billing stays deferred, Phase 1 can ship AI search gated by a
capability flag (like the other AI features) and skip the Stripe items until
the monetization decision flips.

### Phase 1 — AI search + paywall foundation

- `llm` gateway + Grok provider + grounding + cache + per-user quota
- `POST /ai/search` with TMDB resolution
- Stripe: `user_subscriptions`, `ai_usage`, checkout/portal/webhook,
  `/me/entitlements`, server-side gating
- frontend: AI search UI + pricing/upgrade + manage subscription

### Phase 2

- Mood flavor text (premium) via the gateway
- Conversational refine of AI search ("коротше", "новіше") reusing mood nudges
- Tier/quota tuning from real usage

### Phase 3

- Smart pitch on details (premium)
- Optional premium routing to a higher-quality model behind the same interface
- Annual plan, trials, promo codes via Stripe

## Open questions

1. Free daily AI-search quota — 5/day? And any anonymous allowance, or
   login-required for AI?
2. Premium price point and billing period(s) for launch?
3. Premium AI search "unlimited" or a high soft cap (abuse safety)?
4. Grok free model/tier confirmed available at our volume, or budget for a paid
   model from day one?
5. Should AI search replace or sit beside the existing literal search box?
6. Which features are the premium hook at launch — AI search only, or AI search +
   mood flavor together?

## Recommendation

Ship Phase 1 as one unit: a provider-agnostic `llm` gateway (Grok first),
grounded natural-language search that only ever returns real TMDB titles, and a
Stripe-backed free/premium split with server-enforced quotas and webhook-driven
entitlements. Keep mood flavor, smart pitch, conversational refine, and premium
model routing as later phases on the same foundation. Treat grounding,
server-side gating, and webhook signature verification as non-negotiable from day
one.
