create table if not exists game_results (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references users(id) on delete cascade,
  game_id text not null, score integer not null default 0, best_streak integer not null default 0,
  daily boolean not null default false, played_at timestamptz not null default now()
);
create index if not exists game_results_user_idx on game_results(user_id, played_at desc);
create table if not exists game_challenges (
  id uuid primary key default gen_random_uuid(), creator_id uuid not null references users(id) on delete cascade,
  opponent_id uuid not null references users(id) on delete cascade, game_id text not null, seed bigint not null,
  creator_score integer, opponent_score integer, created_at timestamptz not null default now(),
  completed_at timestamptz, check(creator_id<>opponent_id)
);
create index if not exists game_challenges_users_idx on game_challenges(creator_id,opponent_id,created_at desc);
