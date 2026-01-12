alter table saved_titles
  add column if not exists runtime_minutes int,
  add column if not exists episode_count int;
