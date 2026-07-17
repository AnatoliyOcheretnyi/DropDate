-- Precomputed movie feature dataset for the Akinator-style guessing game.
-- Rebuilt by a background job from TMDB; loaded into memory at startup.
create table if not exists akinator_movies (
  tmdb_id integer primary key,
  title text not null,
  year integer not null default 0,
  poster_url text not null default '',
  backdrop_url text not null default '',
  popularity real not null default 0,
  vote_average real not null default 0,
  vote_count integer not null default 0,
  runtime integer not null default 0,
  original_language text not null default '',
  is_franchise boolean not null default false,
  origin_countries jsonb not null default '[]',
  genre_ids jsonb not null default '[]',
  keywords jsonb not null default '[]',
  cast_members jsonb not null default '[]',
  directors jsonb not null default '[]',
  updated_at timestamptz not null default now()
);

create table if not exists akinator_results (
  id bigserial primary key,
  session_token text not null,
  guess_tmdb_id integer not null,
  correct boolean not null,
  actual_tmdb_id integer,
  answers jsonb not null default '[]',
  created_at timestamptz not null default now()
);

create index if not exists akinator_results_created_at_idx on akinator_results (created_at desc);
