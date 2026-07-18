create table if not exists taste_rankings (
  user_id uuid not null references users(id) on delete cascade,
  kind text not null check (kind in ('genre','country')),
  item_id text not null,
  score real not null default 1000,
  comparisons integer not null default 0,
  wins integer not null default 0,
  losses integer not null default 0,
  ties integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, kind, item_id)
);
create index if not exists taste_rankings_user_kind_idx on taste_rankings(user_id, kind, score desc);
