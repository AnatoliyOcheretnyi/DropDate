alter table episode_progress
  add column if not exists rating smallint;

alter table episode_progress
  drop constraint if exists episode_progress_rating_check;

alter table episode_progress
  add constraint episode_progress_rating_check
  check (rating is null or rating between 1 and 10);
