create table if not exists friend_recommendations (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references users(id) on delete cascade,
  recipient_id uuid not null references users(id) on delete cascade,
  tmdb_id integer not null,
  media_type text not null check (media_type in ('movie', 'tv')),
  title text not null,
  poster_url text,
  message text not null default '',
  opened_at timestamptz,
  created_at timestamptz not null default now(),
  check (sender_id <> recipient_id)
);

create index if not exists friend_recommendations_recipient_idx
  on friend_recommendations(recipient_id, created_at desc);

create table if not exists shared_lists (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references users(id) on delete cascade,
  name text not null,
  visibility text not null default 'private' check (visibility in ('private', 'friends', 'public')),
  share_token uuid not null default gen_random_uuid() unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists shared_list_members (
  list_id uuid not null references shared_lists(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  role text not null default 'editor' check (role in ('viewer', 'editor')),
  joined_at timestamptz not null default now(),
  primary key (list_id, user_id)
);

create table if not exists shared_list_items (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references shared_lists(id) on delete cascade,
  added_by uuid not null references users(id) on delete cascade,
  tmdb_id integer not null,
  media_type text not null check (media_type in ('movie', 'tv')),
  title text not null,
  poster_url text,
  created_at timestamptz not null default now(),
  unique(list_id, tmdb_id, media_type)
);

create index if not exists shared_lists_owner_idx on shared_lists(owner_id, updated_at desc);
create index if not exists shared_list_members_user_idx on shared_list_members(user_id, joined_at desc);
create index if not exists shared_list_items_list_idx on shared_list_items(list_id, created_at desc);

drop trigger if exists shared_lists_set_updated_at on shared_lists;
create trigger shared_lists_set_updated_at before update on shared_lists
for each row execute function set_updated_at();
