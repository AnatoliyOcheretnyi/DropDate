alter table users
  add column if not exists email_verified_at timestamptz;

create table if not exists email_verifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  token_hash text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists email_verifications_token_hash_idx
  on email_verifications(token_hash);

create index if not exists email_verifications_user_id_idx
  on email_verifications(user_id);
