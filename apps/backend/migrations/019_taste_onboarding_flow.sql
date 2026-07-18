alter table users
  add column if not exists taste_onboarding_stage text not null default 'genre'
    check (taste_onboarding_stage in ('genre', 'country', 'titles', 'completed')),
  add column if not exists taste_onboarding_genres_completed_at timestamptz,
  add column if not exists taste_onboarding_countries_completed_at timestamptz,
  add column if not exists taste_onboarding_titles_completed_at timestamptz,
  add column if not exists taste_onboarding_snoozed_until timestamptz;

create table if not exists taste_onboarding_title_feedback (
  user_id uuid not null references users(id) on delete cascade,
  tmdb_id integer not null,
  media_type text not null check (media_type in ('movie', 'tv')),
  title text not null,
  poster_url text not null default '',
  year text not null default '',
  sentiment text not null check (sentiment in ('liked', 'disliked', 'watchlist')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, tmdb_id, media_type)
);

create index if not exists taste_onboarding_feedback_user_idx
  on taste_onboarding_title_feedback(user_id, updated_at desc);
