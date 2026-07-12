-- Posts may be created through the public API, so target visibility must be
-- enforced in RLS as well as in server actions. This prevents a client from
-- attaching an otherwise invisible catalog id to a wishlist or collection post.

drop policy if exists posts_insert on public.posts;
create policy posts_insert
on public.posts for insert
to authenticated
with check (
  (select auth.uid()) = author_id
  and (collection_id is null or private.can_view_collection(collection_id))
  and (subcollection_id is null or private.can_view_subcollection(subcollection_id))
  and (item_id is null or private.can_view_item(item_id))
);

drop policy if exists posts_update on public.posts;
create policy posts_update
on public.posts for update
to authenticated
using ((select auth.uid()) = author_id)
with check (
  (select auth.uid()) = author_id
  and (collection_id is null or private.can_view_collection(collection_id))
  and (subcollection_id is null or private.can_view_subcollection(subcollection_id))
  and (item_id is null or private.can_view_item(item_id))
);
