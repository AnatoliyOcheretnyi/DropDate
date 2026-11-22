-- Shared, durable Ukrainian machine translations. Never overwrite TMDB data or
-- user-owned saved_titles rows. Empty fields mean that field was not translated.
create table if not exists title_translations (
  tmdb_id integer not null check (tmdb_id > 0),
  media_type text not null check (media_type in ('movie', 'tv')),
  language text not null default 'uk' check (language = 'uk'),
  source_title text not null default '',
  source_overview text not null default '',
  original_title text not null default '',
  title text not null default '',
  overview text not null default '',
  title_is_machine_translated boolean generated always as (title <> '') stored,
  overview_is_machine_translated boolean generated always as (overview <> '') stored,
  provider text not null default 'gemini',
  model text not null default '',
  catalog_result jsonb not null default '{}',
  aliases jsonb not null default '[]',
  updated_at timestamptz not null default now(),
  primary key (tmdb_id, media_type, language),
  check (title <> '' or overview <> '')
);

create index if not exists title_translations_updated_idx on title_translations (updated_at desc);
-- Only the backend's database connection accesses this table, not browser roles.
alter table title_translations enable row level security;
