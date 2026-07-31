-- Direct feedback on recommendation cards ("цікаво" / "не моє").
-- Feeds only the recommendation engine: liked acts as a positive seed,
-- disliked as a negative seed and a permanent exclusion from the feed.
create table if not exists rec_feedback (
  user_id uuid not null references users(id) on delete cascade,
  tmdb_id integer not null,
  media_type text not null check (media_type in ('movie', 'tv')),
  title text not null default '',
  action text not null check (action in ('liked', 'disliked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, tmdb_id, media_type)
);

create index if not exists rec_feedback_user_action_idx
  on rec_feedback(user_id, action, updated_at desc);
