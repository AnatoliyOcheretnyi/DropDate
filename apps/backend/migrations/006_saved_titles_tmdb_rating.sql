alter table saved_titles
  add column if not exists tmdb_rating double precision;
