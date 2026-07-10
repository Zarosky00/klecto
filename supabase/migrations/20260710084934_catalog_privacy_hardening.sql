-- Prevent child catalog visibility from broadening a parent and restrict
-- profile updates to user-editable columns only.

create or replace function private.can_view_subcollection(target_subcollection uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.subcollections sc
    join public.collections c on c.id = sc.collection_id
    where sc.id = target_subcollection
      and private.can_view_collection(c.id)
      and (
        sc.user_id = (select auth.uid())
        or coalesce(sc.visibility, c.visibility) = 'public'
        or (
          coalesce(sc.visibility, c.visibility) = 'followers'
          and exists (
            select 1 from public.follows f
            where f.follower_id = (select auth.uid())
              and f.following_id = sc.user_id
          )
        )
      )
  );
$$;

create or replace function private.can_view_item(target_item uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.items i
    join public.collections c on c.id = i.collection_id
    left join public.subcollections sc on sc.id = i.subcollection_id
    cross join lateral (
      select case
        when c.visibility = 'private' or sc.visibility = 'private' or i.visibility = 'private' then 'private'::public.visibility
        when c.visibility = 'followers' or sc.visibility = 'followers' or i.visibility = 'followers' then 'followers'::public.visibility
        else 'public'::public.visibility
      end as effective_visibility
    ) access
    where i.id = target_item
      and private.can_view_collection(c.id)
      and (i.subcollection_id is null or private.can_view_subcollection(i.subcollection_id))
      and (
        i.user_id = (select auth.uid())
        or access.effective_visibility = 'public'
        or (
          access.effective_visibility = 'followers'
          and exists (
            select 1 from public.follows f
            where f.follower_id = (select auth.uid())
              and f.following_id = i.user_id
          )
        )
      )
  );
$$;

create or replace function private.can_view_post(target_post uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.posts p
    where p.id = target_post
      and p.deleted_at is null
      and (
        p.author_id = (select auth.uid())
        or (
          private.can_view_profile(p.author_id)
          and (
            p.visibility = 'public'
            or (
              p.visibility = 'followers'
              and exists (
                select 1 from public.follows f
                where f.follower_id = (select auth.uid())
                  and f.following_id = p.author_id
              )
            )
          )
          and (p.item_id is null or private.can_view_item(p.item_id))
          and (p.collection_id is null or private.can_view_collection(p.collection_id))
          and (p.subcollection_id is null or private.can_view_subcollection(p.subcollection_id))
        )
      )
  );
$$;

revoke all on function private.can_view_subcollection(uuid) from public;
grant execute on function private.can_view_subcollection(uuid) to anon, authenticated;

drop policy if exists subcollections_read on public.subcollections;
create policy subcollections_read
on public.subcollections for select
to anon, authenticated
using (private.can_view_subcollection(id));

drop policy if exists profiles_update on public.profiles;
create policy profiles_update
on public.profiles for update
to authenticated
using ((select auth.uid()) = id and not is_suspended)
with check ((select auth.uid()) = id and not is_suspended);

revoke update on public.profiles from authenticated;
grant update (
  username,
  display_name,
  bio,
  location,
  website,
  avatar_path,
  banner_path,
  account_visibility,
  allow_messages_from,
  show_similarity,
  last_seen_at,
  updated_at
) on public.profiles to authenticated;
