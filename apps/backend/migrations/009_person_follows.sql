create table if not exists person_follows (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  person_id integer not null,
  role text not null check (role in ('actor', 'director')),
  name text not null,
  profile_url text,
  known_for text,
  liked boolean not null default true,
  subscribed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, person_id, role)
);

create index if not exists person_follows_user_id_idx on person_follows(user_id);
create index if not exists person_follows_subscribed_idx on person_follows(subscribed) where subscribed;
