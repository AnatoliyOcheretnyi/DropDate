alter table saved_titles
  add column if not exists list_type text not null default 'follow'
    check (list_type in ('follow', 'watchlist', 'favorite'));

drop index if exists saved_titles_unique_idx;
create unique index if not exists saved_titles_unique_idx
  on saved_titles(user_id, tmdb_id, media_type, list_type);

create index if not exists saved_titles_user_list_idx
  on saved_titles(user_id, list_type);
