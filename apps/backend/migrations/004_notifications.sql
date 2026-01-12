create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  tmdb_id integer not null,
  media_type text not null check (media_type in ('movie','tv')),
  title text not null,
  event_type text not null,
  event_key text not null,
  season_number int,
  episode_number int,
  episode_name text,
  release_date date,
  poster_url text,
  backdrop_url text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists notifications_unique_idx
  on notifications(user_id, tmdb_id, media_type, event_key);

create index if not exists notifications_user_idx
  on notifications(user_id, created_at desc);

create index if not exists notifications_user_unread_idx
  on notifications(user_id)
  where read_at is null;
