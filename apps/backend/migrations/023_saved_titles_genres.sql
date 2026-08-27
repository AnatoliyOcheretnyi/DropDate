-- Genres for the saved library.
--
-- The genre filter on "Мій список" runs entirely on the client, so the whole
-- library has to carry its genres in the rows the list endpoint already
-- returns. Details() is a per-title TMDB request and cannot be issued for a
-- 128-title library on every page load.
--
-- Existing rows keep the empty default until the one-off backfill
-- (cmd/backfillgenres) walks them; the client hides the genre row while fewer
-- than two distinct genres are present, so it degrades quietly.
alter table saved_titles
  add column if not exists genres text[] not null default '{}';
