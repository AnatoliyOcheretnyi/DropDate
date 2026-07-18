create table if not exists episode_progress (
  user_id uuid not null references users(id) on delete cascade,
  tmdb_id integer not null,
  season_number integer not null check(season_number >= 0),
  episode_number integer not null check(episode_number > 0),
  watched boolean not null default true,
  watched_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key(user_id,tmdb_id,season_number,episode_number)
);
create index if not exists episode_progress_continue_idx on episode_progress(user_id,updated_at desc) where watched;
