-- Public TMDB artwork catalog, independent of user lists and machine translation.
create table if not exists world_atlas_countries (
  country_code text primary key check (country_code ~ '^[A-Z]{2}$'),
  posters jsonb not null default '[]' check (jsonb_typeof(posters) = 'array'),
  refreshed_at timestamptz,
  next_refresh_at timestamptz not null default now(),
  attempted_at timestamptz not null default now()
);
create table if not exists world_atlas_job (
  id integer primary key check (id = 1),
  owner text not null default '',
  lease_until timestamptz not null default '-infinity'
);
insert into world_atlas_job (id) values (1) on conflict do nothing;
alter table world_atlas_countries enable row level security;
alter table world_atlas_job enable row level security;
