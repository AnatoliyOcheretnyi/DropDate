alter table saved_titles
  drop constraint if exists saved_titles_list_type_check;

alter table saved_titles
  add constraint saved_titles_list_type_check
  check (list_type in ('follow', 'watchlist', 'favorite', 'liked', 'watched', 'disliked'));
