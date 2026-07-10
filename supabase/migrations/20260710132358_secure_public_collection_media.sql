-- A private bucket still needs a narrowly scoped SELECT policy before the
-- public-profile server route can mint short-lived signed URLs. Match both the
-- visible catalog row and the Storage object owner: a catalog record must
-- never be able to point at somebody else's private file.
drop policy if exists collection_media_visible_catalog_read on storage.objects;

create policy collection_media_visible_catalog_read
on storage.objects
for select
to anon, authenticated
using (
  bucket_id = 'collection-media'
  and (
    exists (
      select 1
      from public.item_media media
      join public.items item on item.id = media.item_id
      where media.storage_path = storage.objects.name
        and media.user_id = item.user_id
        and storage.objects.owner_id = media.user_id::text
        and private.can_view_item(media.item_id)
    )
    or exists (
      select 1
      from public.collections collection
      where collection.cover_path = storage.objects.name
        and storage.objects.owner_id = collection.user_id::text
        and private.can_view_collection(collection.id)
    )
  )
);
