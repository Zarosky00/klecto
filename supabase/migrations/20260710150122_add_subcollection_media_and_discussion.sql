-- Subcollection visibility is independent from its parent collection. Keep the
-- decision in the private schema, then reuse it for rows and Storage objects.
create or replace function private.can_view_subcollection(target_subcollection uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.subcollections subcollection
    join public.collections collection on collection.id = subcollection.collection_id
    where subcollection.id = target_subcollection
      and (
        subcollection.user_id = (select auth.uid())
        or (
          private.can_view_collection(collection.id)
          and (
            coalesce(subcollection.visibility, collection.visibility) = 'public'
            or (
              coalesce(subcollection.visibility, collection.visibility) = 'followers'
              and exists (
                select 1
                from public.follows follow
                where follow.follower_id = (select auth.uid())
                  and follow.following_id = subcollection.user_id
              )
            )
          )
        )
      )
  );
$$;

grant execute on function private.can_view_subcollection(uuid) to anon, authenticated;

create or replace function private.can_view_item(target_item uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.items item
    join public.collections collection on collection.id = item.collection_id
    where item.id = target_item
      and private.can_view_collection(collection.id)
      and (item.subcollection_id is null or private.can_view_subcollection(item.subcollection_id))
      and (
        item.user_id = (select auth.uid())
        or coalesce(item.visibility, collection.visibility) = 'public'
        or (
          coalesce(item.visibility, collection.visibility) = 'followers'
          and exists (
            select 1
            from public.follows follow
            where follow.follower_id = (select auth.uid())
              and follow.following_id = item.user_id
          )
        )
      )
  );
$$;

drop policy if exists subcollections_read on public.subcollections;
create policy subcollections_read
on public.subcollections
for select
to anon, authenticated
using (private.can_view_subcollection(id));

create table public.subcollection_likes (
  subcollection_id uuid not null references public.subcollections(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (subcollection_id, user_id)
);

create table public.catalog_comments (
  id uuid primary key default gen_random_uuid(),
  item_id uuid references public.items(id) on delete cascade,
  subcollection_id uuid references public.subcollections(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  edited_at timestamptz,
  deleted_at timestamptz,
  check (num_nonnulls(item_id, subcollection_id) = 1)
);

create index subcollection_likes_subcollection_idx on public.subcollection_likes (subcollection_id, created_at desc);
create index catalog_comments_item_idx on public.catalog_comments (item_id, created_at) where item_id is not null and deleted_at is null;
create index catalog_comments_subcollection_idx on public.catalog_comments (subcollection_id, created_at) where subcollection_id is not null and deleted_at is null;

alter table public.subcollection_likes enable row level security;
alter table public.catalog_comments enable row level security;

create policy subcollection_likes_read
on public.subcollection_likes
for select
to anon, authenticated
using (private.can_view_subcollection(subcollection_id));

create policy subcollection_likes_insert
on public.subcollection_likes
for insert
to authenticated
with check ((select auth.uid()) = user_id and private.can_view_subcollection(subcollection_id));

create policy subcollection_likes_delete
on public.subcollection_likes
for delete
to authenticated
using ((select auth.uid()) = user_id);

create policy catalog_comments_read
on public.catalog_comments
for select
to anon, authenticated
using (
  (item_id is not null and private.can_view_item(item_id))
  or (subcollection_id is not null and private.can_view_subcollection(subcollection_id))
);

create policy catalog_comments_insert
on public.catalog_comments
for insert
to authenticated
with check (
  (select auth.uid()) = author_id
  and (
    (item_id is not null and private.can_view_item(item_id))
    or (subcollection_id is not null and private.can_view_subcollection(subcollection_id))
  )
);

create policy catalog_comments_update
on public.catalog_comments
for update
to authenticated
using ((select auth.uid()) = author_id)
with check ((select auth.uid()) = author_id);

create policy catalog_comments_delete
on public.catalog_comments
for delete
to authenticated
using ((select auth.uid()) = author_id);

grant select on public.subcollection_likes, public.catalog_comments to anon, authenticated;
grant insert, update, delete on public.subcollection_likes, public.catalog_comments to authenticated;

-- The bucket stays private. This SELECT rule only permits a signed URL when a
-- visible catalog row references the exact object owned by that collector.
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
    or exists (
      select 1
      from public.subcollections subcollection
      where subcollection.cover_path = storage.objects.name
        and storage.objects.owner_id = subcollection.user_id::text
        and private.can_view_subcollection(subcollection.id)
    )
  )
);
