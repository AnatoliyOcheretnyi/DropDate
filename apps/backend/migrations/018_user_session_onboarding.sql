alter table users
  add column if not exists last_session_at timestamptz,
  add column if not exists taste_onboarding_completed_at timestamptz;

create index if not exists users_last_session_at_idx
  on users(last_session_at desc nulls last);
