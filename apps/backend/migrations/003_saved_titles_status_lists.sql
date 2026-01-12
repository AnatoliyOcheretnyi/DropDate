alter table saved_titles
  add column if not exists user_rating int,
  add column if not exists watch_count int not null default 0,
  add column if not exists last_watched_at timestamptz;

alter table saved_titles
  drop constraint if exists saved_titles_list_type_check;

alter table saved_titles
  add constraint saved_titles_list_type_check
  check (list_type in ('follow', 'watchlist', 'favorite', 'watched', 'disliked'));

