# World poster atlas

The globe reads one public catalog from `GET /world/atlas` (proxied by
`/api/world/atlas`). Country selection and hover use that catalog; they do not
invoke discovery or Gemini. The full country film list remains a separate flow.

## Storage and initial fill

Migration `025_world_atlas.sql` creates `world_atlas_countries` and the refresh
lease in `world_atlas_job`. Both have RLS enabled and are accessed by the backend.
Each country stores up to 12 distinct popular released movie posters (24 for Russia), TMDB IDs,
titles, ratings, and refresh timestamps. PostgreSQL stores metadata and image
URLs; image files are served by TMDB's CDN.

From the repository root:

```sh
npx nx run backend:migrate
npx nx run backend:atlas-refresh
```

The CLI uses the backend's existing `SUPABASE_CONNECTION_STRING` and
`TMDB_ACCESS_TOKEN` configuration. It fills missing/due rows and skips fresh ones.
The initial run makes one discovery request per country (two for Russia), sequentially
with a 250 ms pause. It does not translate or enrich movie details.

## Refresh and recovery

The backend checks on startup and hourly, updating only rows whose
`next_refresh_at` has elapsed. Successful rows become due one calendar month
later. `POST /jobs/world-atlas`, protected by `JOBS_ACCESS_TOKEN`, queues the same
work and immediately returns 202. The monthly GitHub workflow can wake a sleeping
deployment; it requires deployment of the endpoint and existing `JOBS_ENDPOINT`
(the notifications job URL) and `JOBS_ACCESS_TOKEN` repository secrets.

A 15-minute database lease prevents overlap across instances and CLI runs; a
refresh run is limited to 10 minutes. Failed requests keep existing posters and
retry after six hours. A previously populated country returning no posters also
keeps its old images. Truly empty countries remain empty. Database state survives
server restarts; overdue countries refresh after the server wakes.

## Globe layout

Poster count is based on spherical country area from the map geometry:

| Area, km² | Posters |
| --- | --- |
| Below 100,000 | 1 |
| Below 500,000 | 2 |
| Below 1,500,000 | 3 |
| Below 3,000,000 | 4 |
| Below 6,000,000 | 6 |
| Below 10,000,000 | 8 |
| 10,000,000 or more | 24 |

Available unique artwork caps the count. The layout splits posters between land
polygons proportionally, crops them to fill tiles, compensates for latitude, and
wraps the date line. All countries share one canvas texture, 4096×2048 on desktop
and 2048×1024 on mobile, with three country workers loading four images each
(at most 12 image requests concurrently) and incremental updates. There is
no GPU material per poster. Failed images leave the base map visible.

The API supports ETags and a five-minute public HTTP cache. The frontend proxy
does not cache an incomplete prefill; React Query keeps the complete catalog
fresh for one hour and polls an incomplete catalog every 30 seconds.

## Verification

`backend:test` covers selection, monthly scheduling, failure retention, job
authorization, and conditional HTTP reads. With `ATLAS_INTEGRATION=1`, store tests
use an isolated schema in the configured PostgreSQL database to verify the
migration, durable reads, leases, and update intervals.

`frontend:test` covers real country geometry, area tiers, date-line bounds and
cropping. `frontend:e2e` includes `world-atlas-preview.spec.ts` for desktop/mobile
country switching and catalog reuse. `WORLD_LIVE_SMOKE=1` opts into real poster
image checks and screenshots against a populated local backend.
