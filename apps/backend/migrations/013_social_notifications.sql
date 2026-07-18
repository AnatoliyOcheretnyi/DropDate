alter table notifications drop constraint if exists notifications_media_type_check;
alter table notifications add constraint notifications_media_type_check
  check (media_type in ('movie', 'tv', 'social'));
