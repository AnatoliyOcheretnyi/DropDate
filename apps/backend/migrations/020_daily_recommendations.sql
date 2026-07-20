create table if not exists daily_recommendations (
  user_id uuid not null references users(id) on delete cascade,
  pick_date date not null,
  tmdb_id integer not null,
  media_type text not null check (media_type in ('movie', 'tv')),
  title text not null,
  year text,
  poster_url text,
  reason_text text,
  reason_seed_count integer not null default 0,
  reason_primary_source text not null default '',
  revealed boolean not null default false,
  action text not null default 'none' check (action in ('none', 'saved', 'disliked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, pick_date)
);

create index if not exists daily_recommendations_user_action_idx
  on daily_recommendations(user_id, action, pick_date desc);
