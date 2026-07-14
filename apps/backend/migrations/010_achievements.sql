create table if not exists user_achievement_unlocks (
  user_id uuid not null references users(id) on delete cascade,
  list_key text not null check (list_key in ('total', 'follow', 'watchlist', 'favorite', 'liked', 'watched', 'disliked')),
  tier integer not null,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, list_key, tier)
);

create index if not exists user_achievement_unlocks_user_idx on user_achievement_unlocks(user_id);
