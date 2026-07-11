-- Complete catalog engagement across collections, subcollections, and items.
-- A signed-in collector contributes at most one view per target per calendar
-- day. This prevents reloads from inflating public counters while keeping the
-- event data simple to aggregate under RLS.

alter table public.catalog_comments
  add column collection_id uuid references public.collections(id) on delete cascade;

alter table public.catalog_comments
  drop constraint catalog_comments_check;

alter table public.catalog_comments
  add constraint catalog_comments_one_target_check
  check (num_nonnulls(collection_id, subcollection_id, item_id) = 1);

create index catalog_comments_collection_idx
  on public.catalog_comments (collection_id, created_at)
  where collection_id is not null and deleted_at is null;

drop policy if exists catalog_comments_read on public.catalog_comments;
drop policy if exists catalog_comments_insert on public.catalog_comments;

create policy catalog_comments_read
on public.catalog_comments
for select
to anon, authenticated
using (
  (collection_id is not null and private.can_view_collection(collection_id))
  or (subcollection_id is not null and private.can_view_subcollection(subcollection_id))
  or (item_id is not null and private.can_view_item(item_id))
);

create policy catalog_comments_insert
on public.catalog_comments
for insert
to authenticated
with check (
  (select auth.uid()) = author_id
  and (
    (collection_id is not null and private.can_view_collection(collection_id))
    or (subcollection_id is not null and private.can_view_subcollection(subcollection_id))
    or (item_id is not null and private.can_view_item(item_id))
  )
);

create table public.catalog_views (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid references public.collections(id) on delete cascade,
  subcollection_id uuid references public.subcollections(id) on delete cascade,
  item_id uuid references public.items(id) on delete cascade,
  viewer_id uuid not null references public.profiles(id) on delete cascade,
  viewed_on date not null default current_date,
  created_at timestamptz not null default now(),
  constraint catalog_views_one_target_check
    check (num_nonnulls(collection_id, subcollection_id, item_id) = 1)
);

create unique index catalog_views_collection_viewer_day_key
  on public.catalog_views (collection_id, viewer_id, viewed_on)
  where collection_id is not null;

create unique index catalog_views_subcollection_viewer_day_key
  on public.catalog_views (subcollection_id, viewer_id, viewed_on)
  where subcollection_id is not null;

create unique index catalog_views_item_viewer_day_key
  on public.catalog_views (item_id, viewer_id, viewed_on)
  where item_id is not null;

create index catalog_views_collection_count_idx
  on public.catalog_views (collection_id, created_at desc)
  where collection_id is not null;

create index catalog_views_subcollection_count_idx
  on public.catalog_views (subcollection_id, created_at desc)
  where subcollection_id is not null;

create index catalog_views_item_count_idx
  on public.catalog_views (item_id, created_at desc)
  where item_id is not null;

alter table public.catalog_views enable row level security;

create policy catalog_views_read
on public.catalog_views
for select
to anon, authenticated
using (
  (collection_id is not null and private.can_view_collection(collection_id))
  or (subcollection_id is not null and private.can_view_subcollection(subcollection_id))
  or (item_id is not null and private.can_view_item(item_id))
);

create policy catalog_views_insert
on public.catalog_views
for insert
to authenticated
with check (
  (select auth.uid()) = viewer_id
  and (
    (collection_id is not null and private.can_view_collection(collection_id))
    or (subcollection_id is not null and private.can_view_subcollection(subcollection_id))
    or (item_id is not null and private.can_view_item(item_id))
  )
);

grant select on public.catalog_views to anon, authenticated;
grant insert on public.catalog_views to authenticated;
