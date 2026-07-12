-- Klecto initial schema
-- Social collection catalog, matching, feed, chat, calls, moderation, and storage.

create extension if not exists pgcrypto with schema extensions;
create schema if not exists private;

create type public.visibility as enum ('public', 'followers', 'private');
create type public.item_mood as enum ('grail', 'memory', 'favorite', 'regret', 'neutral');
create type public.post_kind as enum ('post', 'wishlist', 'collection_update');
create type public.conversation_kind as enum ('direct', 'group');
create type public.member_role as enum ('owner', 'admin', 'member');
create type public.call_kind as enum ('audio', 'video');
create type public.call_status as enum ('ringing', 'active', 'ended', 'declined', 'missed');
create type public.report_status as enum ('open', 'reviewing', 'resolved', 'dismissed');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9_]{3,24}$'),
  display_name text not null check (char_length(display_name) between 1 and 60),
  bio text check (char_length(bio) <= 240),
  location text check (char_length(location) <= 100),
  website text check (char_length(website) <= 300),
  avatar_path text,
  banner_path text,
  account_visibility public.visibility not null default 'public',
  allow_messages_from text not null default 'matches' check (allow_messages_from in ('everyone', 'followers', 'matches', 'nobody')),
  show_similarity boolean not null default true,
  is_verified boolean not null default false,
  is_suspended boolean not null default false,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

create table public.blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create table public.collection_templates (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  icon text not null,
  description text,
  suggested_fields jsonb not null default '[]'::jsonb,
  sort_order smallint not null default 0,
  created_at timestamptz not null default now()
);

create table public.collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  template_id uuid references public.collection_templates(id) on delete set null,
  name text not null check (char_length(name) between 1 and 80),
  slug text not null check (slug ~ '^[a-z0-9-]{1,90}$'),
  description text check (char_length(description) <= 1000),
  cover_path text,
  visibility public.visibility not null default 'public',
  is_featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, slug)
);

create table public.subcollections (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid not null references public.collections(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  slug text not null check (slug ~ '^[a-z0-9-]{1,90}$'),
  description text check (char_length(description) <= 600),
  kind text not null default 'custom' check (kind in ('brand', 'series', 'era', 'custom')),
  cover_path text,
  visibility public.visibility,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (collection_id, slug)
);

create table public.items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  collection_id uuid not null references public.collections(id) on delete cascade,
  subcollection_id uuid references public.subcollections(id) on delete set null,
  title text not null check (char_length(title) between 1 and 140),
  description text check (char_length(description) <= 4000),
  brand text check (char_length(brand) <= 100),
  model text check (char_length(model) <= 120),
  year integer check (year between 1000 and 2200),
  condition text check (char_length(condition) <= 80),
  acquisition_date date,
  acquisition_place text check (char_length(acquisition_place) <= 160),
  purchase_price numeric(12,2) check (purchase_price >= 0),
  currency char(3),
  mood public.item_mood not null default 'neutral',
  is_favorite boolean not null default false,
  visibility public.visibility,
  attributes jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.item_media (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  storage_path text not null,
  alt_text text check (char_length(alt_text) <= 300),
  width integer check (width > 0),
  height integer check (height > 0),
  blurhash text,
  position smallint not null default 0,
  created_at timestamptz not null default now(),
  unique (item_id, position)
);

create table public.item_tags (
  item_id uuid not null references public.items(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  tag text not null check (tag = lower(tag) and char_length(tag) between 1 and 50),
  created_at timestamptz not null default now(),
  primary key (item_id, tag)
);

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  kind public.post_kind not null default 'post',
  body text check (char_length(body) <= 3000),
  quote_text text check (char_length(quote_text) <= 600),
  item_id uuid references public.items(id) on delete cascade,
  collection_id uuid references public.collections(id) on delete cascade,
  subcollection_id uuid references public.subcollections(id) on delete cascade,
  visibility public.visibility not null default 'public',
  reply_to_post_id uuid references public.posts(id) on delete set null,
  edited_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (kind <> 'wishlist' or num_nonnulls(item_id, collection_id, subcollection_id) = 1)
);

create table public.post_media (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  storage_path text not null,
  alt_text text check (char_length(alt_text) <= 300),
  position smallint not null default 0,
  created_at timestamptz not null default now(),
  unique (post_id, position)
);

create table public.post_likes (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table public.post_saves (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  parent_id uuid references public.comments(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  depth smallint not null default 0 check (depth between 0 and 8),
  edited_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.comment_likes (
  comment_id uuid not null references public.comments(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);

create table public.collection_likes (
  collection_id uuid not null references public.collections(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (collection_id, user_id)
);

create table public.collection_saves (
  collection_id uuid not null references public.collections(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (collection_id, user_id)
);

create table public.item_likes (
  item_id uuid not null references public.items(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (item_id, user_id)
);

create table public.item_saves (
  item_id uuid not null references public.items(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (item_id, user_id)
);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  kind public.conversation_kind not null,
  created_by uuid not null references public.profiles(id) on delete cascade,
  title text check (char_length(title) <= 100),
  description text check (char_length(description) <= 500),
  avatar_path text,
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((kind = 'direct' and title is null) or kind = 'group')
);

create table public.conversation_members (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.member_role not null default 'member',
  last_read_at timestamptz,
  muted_until timestamptz,
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  primary key (conversation_id, user_id)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text check (char_length(body) <= 10000),
  reply_to_id uuid references public.messages(id) on delete set null,
  shared_item_id uuid references public.items(id) on delete set null,
  shared_collection_id uuid references public.collections(id) on delete set null,
  attachment_path text,
  edited_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (num_nonnulls(body, shared_item_id, shared_collection_id, attachment_path) >= 1)
);

create table public.message_reactions (
  message_id uuid not null references public.messages(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  emoji text not null check (char_length(emoji) between 1 and 16),
  created_at timestamptz not null default now(),
  primary key (message_id, user_id, emoji)
);

create table public.calls (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete cascade,
  kind public.call_kind not null,
  status public.call_status not null default 'ringing',
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.call_participants (
  call_id uuid not null references public.calls(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz,
  left_at timestamptz,
  primary key (call_id, user_id)
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete cascade,
  type text not null check (type in ('follow', 'like', 'comment', 'reply', 'wishlist', 'message', 'call', 'group_invite')),
  post_id uuid references public.posts(id) on delete cascade,
  comment_id uuid references public.comments(id) on delete cascade,
  conversation_id uuid references public.conversations(id) on delete cascade,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reported_user_id uuid references public.profiles(id) on delete cascade,
  post_id uuid references public.posts(id) on delete cascade,
  comment_id uuid references public.comments(id) on delete cascade,
  message_id uuid references public.messages(id) on delete cascade,
  reason text not null check (reason in ('spam', 'harassment', 'hate', 'nudity', 'violence', 'impersonation', 'scam', 'other')),
  details text check (char_length(details) <= 2000),
  status public.report_status not null default 'open',
  created_at timestamptz not null default now(),
  check (num_nonnulls(reported_user_id, post_id, comment_id, message_id) = 1)
);

create table public.share_events (
  id bigint generated always as identity primary key,
  user_id uuid references public.profiles(id) on delete set null,
  post_id uuid references public.posts(id) on delete cascade,
  collection_id uuid references public.collections(id) on delete cascade,
  item_id uuid references public.items(id) on delete cascade,
  channel text not null check (channel in ('copy_link', 'direct', 'external')),
  created_at timestamptz not null default now(),
  check (num_nonnulls(post_id, collection_id, item_id) = 1)
);

create index follows_following_idx on public.follows (following_id, created_at desc);
create index collections_user_idx on public.collections (user_id, updated_at desc);
create index subcollections_collection_idx on public.subcollections (collection_id, position);
create index items_collection_idx on public.items (collection_id, created_at desc);
create index items_subcollection_idx on public.items (subcollection_id, created_at desc) where subcollection_id is not null;
create index items_user_idx on public.items (user_id, created_at desc);
create index item_tags_tag_idx on public.item_tags (tag, user_id);
create index posts_feed_idx on public.posts (created_at desc) where deleted_at is null;
create index posts_author_idx on public.posts (author_id, created_at desc) where deleted_at is null;
create index comments_post_tree_idx on public.comments (post_id, parent_id, created_at);
create index conversation_members_user_idx on public.conversation_members (user_id, conversation_id) where left_at is null;
create index messages_conversation_idx on public.messages (conversation_id, created_at desc);
create index notifications_user_idx on public.notifications (user_id, created_at desc) where read_at is null;

-- Add a covering index for every remaining foreign key. This keeps cascades,
-- joins, and RLS relationship checks predictable as the catalog grows.
do $$
declare
  fk record;
begin
  for fk in
    select
      c.conrelid::regclass as table_name,
      left(c.conname, 55) || '_idx' as index_name,
      string_agg(quote_ident(a.attname), ', ' order by u.ordinality) as columns_sql
    from pg_constraint c
    cross join lateral unnest(c.conkey) with ordinality as u(attnum, ordinality)
    join pg_attribute a on a.attrelid = c.conrelid and a.attnum = u.attnum
    join pg_namespace n on n.oid = c.connamespace
    where c.contype = 'f'
      and n.nspname = 'public'
      and not exists (
        select 1 from pg_index i
        where i.indrelid = c.conrelid
          and i.indisvalid
          and (i.indkey::smallint[])[0:cardinality(c.conkey)-1] = c.conkey
      )
    group by c.conrelid, c.conname
  loop
    execute format('create index if not exists %I on %s (%s)', fk.index_name, fk.table_name, fk.columns_sql);
  end loop;
end $$;

create or replace function private.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at before update on public.profiles for each row execute function private.set_updated_at();
create trigger collections_updated_at before update on public.collections for each row execute function private.set_updated_at();
create trigger subcollections_updated_at before update on public.subcollections for each row execute function private.set_updated_at();
create trigger items_updated_at before update on public.items for each row execute function private.set_updated_at();
create trigger posts_updated_at before update on public.posts for each row execute function private.set_updated_at();
create trigger comments_updated_at before update on public.comments for each row execute function private.set_updated_at();
create trigger conversations_updated_at before update on public.conversations for each row execute function private.set_updated_at();
create trigger messages_updated_at before update on public.messages for each row execute function private.set_updated_at();

create or replace function private.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  base_username text;
begin
  base_username := lower(regexp_replace(coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1), 'collector'), '[^a-z0-9_]', '', 'g'));
  if char_length(base_username) < 3 then base_username := 'collector'; end if;
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    left(base_username, 17) || '_' || substr(replace(new.id::text, '-', ''), 1, 6),
    coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), split_part(coalesce(new.email, 'Collector'), '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users for each row execute function private.handle_new_user();

create or replace function private.is_blocked_between(first_user uuid, second_user uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.blocks
    where (blocker_id = first_user and blocked_id = second_user)
       or (blocker_id = second_user and blocked_id = first_user)
  );
$$;

create or replace function private.can_view_profile(target_user uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(
    target_user = (select auth.uid())
    or (
      not private.is_blocked_between((select auth.uid()), target_user)
      and exists (
        select 1 from public.profiles p
        where p.id = target_user and not p.is_suspended and (
          p.account_visibility = 'public'
          or (p.account_visibility = 'followers' and exists (
            select 1 from public.follows f where f.follower_id = (select auth.uid()) and f.following_id = target_user
          ))
        )
      )
    ), false
  );
$$;

create or replace function private.can_view_collection(target_collection uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.collections c where c.id = target_collection and (
      c.user_id = (select auth.uid())
      or (
        private.can_view_profile(c.user_id) and (
          c.visibility = 'public'
          or (c.visibility = 'followers' and exists (
            select 1 from public.follows f where f.follower_id = (select auth.uid()) and f.following_id = c.user_id
          ))
        )
      )
    )
  );
$$;

create or replace function private.can_view_item(target_item uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.items i
    join public.collections c on c.id = i.collection_id
    where i.id = target_item and private.can_view_collection(c.id) and (
      i.user_id = (select auth.uid())
      or coalesce(i.visibility, c.visibility) = 'public'
      or (coalesce(i.visibility, c.visibility) = 'followers' and exists (
        select 1 from public.follows f where f.follower_id = (select auth.uid()) and f.following_id = i.user_id
      ))
    )
  );
$$;

create or replace function private.can_view_post(target_post uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.posts p where p.id = target_post and p.deleted_at is null and (
      p.author_id = (select auth.uid())
      or (
        private.can_view_profile(p.author_id)
        and (p.visibility = 'public' or (p.visibility = 'followers' and exists (
          select 1 from public.follows f where f.follower_id = (select auth.uid()) and f.following_id = p.author_id
        )))
        and (p.item_id is null or private.can_view_item(p.item_id))
        and (p.collection_id is null or private.can_view_collection(p.collection_id))
      )
    )
  );
$$;

create or replace function private.is_conversation_member(target_conversation uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.conversation_members cm
    where cm.conversation_id = target_conversation and cm.user_id = (select auth.uid()) and cm.left_at is null
  );
$$;

revoke all on all functions in schema private from public;
grant usage on schema private to anon, authenticated;
grant execute on function private.is_blocked_between(uuid, uuid) to anon, authenticated;
grant execute on function private.can_view_profile(uuid) to anon, authenticated;
grant execute on function private.can_view_collection(uuid) to anon, authenticated;
grant execute on function private.can_view_item(uuid) to anon, authenticated;
grant execute on function private.can_view_post(uuid) to anon, authenticated;
grant execute on function private.is_conversation_member(uuid) to authenticated;

alter table public.profiles enable row level security;
alter table public.follows enable row level security;
alter table public.blocks enable row level security;
alter table public.collection_templates enable row level security;
alter table public.collections enable row level security;
alter table public.subcollections enable row level security;
alter table public.items enable row level security;
alter table public.item_media enable row level security;
alter table public.item_tags enable row level security;
alter table public.posts enable row level security;
alter table public.post_media enable row level security;
alter table public.post_likes enable row level security;
alter table public.post_saves enable row level security;
alter table public.comments enable row level security;
alter table public.comment_likes enable row level security;
alter table public.collection_likes enable row level security;
alter table public.collection_saves enable row level security;
alter table public.item_likes enable row level security;
alter table public.item_saves enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;
alter table public.message_reactions enable row level security;
alter table public.calls enable row level security;
alter table public.call_participants enable row level security;
alter table public.notifications enable row level security;
alter table public.reports enable row level security;
alter table public.share_events enable row level security;

create policy profiles_read on public.profiles for select to anon, authenticated using (private.can_view_profile(id));
create policy profiles_update on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id and not is_verified and not is_suspended);

create policy follows_read on public.follows for select to anon, authenticated using (private.can_view_profile(follower_id) and private.can_view_profile(following_id));
create policy follows_insert on public.follows for insert to authenticated with check ((select auth.uid()) = follower_id and private.can_view_profile(following_id));
create policy follows_delete on public.follows for delete to authenticated using ((select auth.uid()) = follower_id);

create policy blocks_own on public.blocks for select to authenticated using ((select auth.uid()) = blocker_id);
create policy blocks_insert on public.blocks for insert to authenticated with check ((select auth.uid()) = blocker_id);
create policy blocks_delete on public.blocks for delete to authenticated using ((select auth.uid()) = blocker_id);

create policy templates_read on public.collection_templates for select to anon, authenticated using (true);

create policy collections_read on public.collections for select to anon, authenticated using (private.can_view_collection(id));
create policy collections_insert on public.collections for insert to authenticated with check ((select auth.uid()) = user_id);
create policy collections_update on public.collections for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy collections_delete on public.collections for delete to authenticated using ((select auth.uid()) = user_id);

create policy subcollections_read on public.subcollections for select to anon, authenticated using (private.can_view_collection(collection_id));
create policy subcollections_insert on public.subcollections for insert to authenticated with check ((select auth.uid()) = user_id and exists (select 1 from public.collections c where c.id = collection_id and c.user_id = (select auth.uid())));
create policy subcollections_update on public.subcollections for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy subcollections_delete on public.subcollections for delete to authenticated using ((select auth.uid()) = user_id);

create policy items_read on public.items for select to anon, authenticated using (private.can_view_item(id));
create policy items_insert on public.items for insert to authenticated with check ((select auth.uid()) = user_id and exists (select 1 from public.collections c where c.id = collection_id and c.user_id = (select auth.uid())));
create policy items_update on public.items for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy items_delete on public.items for delete to authenticated using ((select auth.uid()) = user_id);

create policy item_media_read on public.item_media for select to anon, authenticated using (private.can_view_item(item_id));
create policy item_media_insert on public.item_media for insert to authenticated with check ((select auth.uid()) = user_id and exists (select 1 from public.items i where i.id = item_id and i.user_id = (select auth.uid())));
create policy item_media_update on public.item_media for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy item_media_delete on public.item_media for delete to authenticated using ((select auth.uid()) = user_id);
create policy item_tags_read on public.item_tags for select to anon, authenticated using (private.can_view_item(item_id));
create policy item_tags_insert on public.item_tags for insert to authenticated with check ((select auth.uid()) = user_id and exists (select 1 from public.items i where i.id = item_id and i.user_id = (select auth.uid())));
create policy item_tags_update on public.item_tags for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy item_tags_delete on public.item_tags for delete to authenticated using ((select auth.uid()) = user_id);

create policy posts_read on public.posts for select to anon, authenticated using (private.can_view_post(id));
create policy posts_insert on public.posts for insert to authenticated with check ((select auth.uid()) = author_id);
create policy posts_update on public.posts for update to authenticated using ((select auth.uid()) = author_id) with check ((select auth.uid()) = author_id);
create policy posts_delete on public.posts for delete to authenticated using ((select auth.uid()) = author_id);
create policy post_media_read on public.post_media for select to anon, authenticated using (private.can_view_post(post_id));
create policy post_media_insert on public.post_media for insert to authenticated with check ((select auth.uid()) = author_id);
create policy post_media_update on public.post_media for update to authenticated using ((select auth.uid()) = author_id) with check ((select auth.uid()) = author_id);
create policy post_media_delete on public.post_media for delete to authenticated using ((select auth.uid()) = author_id);

create policy post_likes_read on public.post_likes for select to anon, authenticated using (private.can_view_post(post_id));
create policy post_likes_insert on public.post_likes for insert to authenticated with check ((select auth.uid()) = user_id and private.can_view_post(post_id));
create policy post_likes_delete on public.post_likes for delete to authenticated using ((select auth.uid()) = user_id);
create policy post_saves_own on public.post_saves for select to authenticated using ((select auth.uid()) = user_id);
create policy post_saves_insert on public.post_saves for insert to authenticated with check ((select auth.uid()) = user_id and private.can_view_post(post_id));
create policy post_saves_delete on public.post_saves for delete to authenticated using ((select auth.uid()) = user_id);

create policy comments_read on public.comments for select to anon, authenticated using (private.can_view_post(post_id));
create policy comments_insert on public.comments for insert to authenticated with check ((select auth.uid()) = author_id and private.can_view_post(post_id));
create policy comments_update on public.comments for update to authenticated using ((select auth.uid()) = author_id) with check ((select auth.uid()) = author_id);
create policy comments_delete on public.comments for delete to authenticated using ((select auth.uid()) = author_id);
create policy comment_likes_read on public.comment_likes for select to anon, authenticated using (exists (select 1 from public.comments c where c.id = comment_id and private.can_view_post(c.post_id)));
create policy comment_likes_insert on public.comment_likes for insert to authenticated with check ((select auth.uid()) = user_id);
create policy comment_likes_delete on public.comment_likes for delete to authenticated using ((select auth.uid()) = user_id);

create policy collection_likes_read on public.collection_likes for select to anon, authenticated using (private.can_view_collection(collection_id));
create policy collection_likes_insert on public.collection_likes for insert to authenticated with check ((select auth.uid()) = user_id and private.can_view_collection(collection_id));
create policy collection_likes_delete on public.collection_likes for delete to authenticated using ((select auth.uid()) = user_id);
create policy collection_saves_own on public.collection_saves for select to authenticated using ((select auth.uid()) = user_id);
create policy collection_saves_insert on public.collection_saves for insert to authenticated with check ((select auth.uid()) = user_id and private.can_view_collection(collection_id));
create policy collection_saves_delete on public.collection_saves for delete to authenticated using ((select auth.uid()) = user_id);
create policy item_likes_read on public.item_likes for select to anon, authenticated using (private.can_view_item(item_id));
create policy item_likes_insert on public.item_likes for insert to authenticated with check ((select auth.uid()) = user_id and private.can_view_item(item_id));
create policy item_likes_delete on public.item_likes for delete to authenticated using ((select auth.uid()) = user_id);
create policy item_saves_own on public.item_saves for select to authenticated using ((select auth.uid()) = user_id);
create policy item_saves_insert on public.item_saves for insert to authenticated with check ((select auth.uid()) = user_id and private.can_view_item(item_id));
create policy item_saves_delete on public.item_saves for delete to authenticated using ((select auth.uid()) = user_id);

create policy conversations_read on public.conversations for select to authenticated using (private.is_conversation_member(id));
create policy conversations_insert on public.conversations for insert to authenticated with check ((select auth.uid()) = created_by);
create policy conversations_update on public.conversations for update to authenticated using (exists (select 1 from public.conversation_members cm where cm.conversation_id = id and cm.user_id = (select auth.uid()) and cm.role in ('owner', 'admin') and cm.left_at is null));
create policy conversation_members_read on public.conversation_members for select to authenticated using (private.is_conversation_member(conversation_id));
create policy conversation_members_insert on public.conversation_members for insert to authenticated with check ((select auth.uid()) = user_id or exists (select 1 from public.conversations c where c.id = conversation_id and c.created_by = (select auth.uid())));
create policy conversation_members_update on public.conversation_members for update to authenticated using ((select auth.uid()) = user_id or exists (select 1 from public.conversation_members actor where actor.conversation_id = conversation_id and actor.user_id = (select auth.uid()) and actor.role in ('owner', 'admin')));
create policy conversation_members_delete on public.conversation_members for delete to authenticated using ((select auth.uid()) = user_id or exists (select 1 from public.conversation_members actor where actor.conversation_id = conversation_id and actor.user_id = (select auth.uid()) and actor.role in ('owner', 'admin')));

create policy messages_read on public.messages for select to authenticated using (private.is_conversation_member(conversation_id));
create policy messages_insert on public.messages for insert to authenticated with check ((select auth.uid()) = author_id and private.is_conversation_member(conversation_id));
create policy messages_update on public.messages for update to authenticated using ((select auth.uid()) = author_id) with check ((select auth.uid()) = author_id and private.is_conversation_member(conversation_id));
create policy messages_delete on public.messages for delete to authenticated using ((select auth.uid()) = author_id);
create policy message_reactions_read on public.message_reactions for select to authenticated using (exists (select 1 from public.messages m where m.id = message_id and private.is_conversation_member(m.conversation_id)));
create policy message_reactions_insert on public.message_reactions for insert to authenticated with check ((select auth.uid()) = user_id);
create policy message_reactions_delete on public.message_reactions for delete to authenticated using ((select auth.uid()) = user_id);

create policy calls_read on public.calls for select to authenticated using (private.is_conversation_member(conversation_id));
create policy calls_insert on public.calls for insert to authenticated with check ((select auth.uid()) = created_by and private.is_conversation_member(conversation_id));
create policy calls_update on public.calls for update to authenticated using (private.is_conversation_member(conversation_id)) with check (private.is_conversation_member(conversation_id));
create policy call_participants_read on public.call_participants for select to authenticated using (exists (select 1 from public.calls c where c.id = call_id and private.is_conversation_member(c.conversation_id)));
create policy call_participants_insert on public.call_participants for insert to authenticated with check ((select auth.uid()) = user_id);
create policy call_participants_update on public.call_participants for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy call_participants_delete on public.call_participants for delete to authenticated using ((select auth.uid()) = user_id);

create policy notifications_own on public.notifications for select to authenticated using ((select auth.uid()) = user_id);
create policy notifications_update on public.notifications for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy reports_insert on public.reports for insert to authenticated with check ((select auth.uid()) = reporter_id);
create policy reports_read_own on public.reports for select to authenticated using ((select auth.uid()) = reporter_id);
create policy share_events_insert on public.share_events for insert to anon, authenticated with check (user_id is null or user_id = (select auth.uid()));
create policy share_events_read_own on public.share_events for select to authenticated using ((select auth.uid()) = user_id);

create or replace function public.collection_similarity(other_user uuid)
returns table (percentage numeric, shared_tags text[], shared_count integer)
language sql stable security invoker set search_path = '' as $$
  with mine as (
    select distinct tag from public.item_tags where user_id = (select auth.uid())
  ), theirs as (
    select distinct tag from public.item_tags where user_id = other_user
  ), shared as (
    select mine.tag from mine join theirs using (tag)
  ), unioned as (
    select tag from mine union select tag from theirs
  )
  select
    case when (select count(*) from unioned) = 0 then 0
      else round(100.0 * (select count(*) from shared) / (select count(*) from unioned), 1)
    end,
    coalesce((select array_agg(tag order by tag) from shared), '{}'::text[]),
    (select count(*)::integer from shared);
$$;

grant execute on function public.collection_similarity(uuid) to authenticated;

insert into public.collection_templates (slug, name, icon, description, suggested_fields, sort_order) values
  ('sneakers', 'Sneakers', 'footprints', 'Shoes, colorways, drops, and the stories worn into them.', '["brand","model","size","colorway","condition","year"]', 10),
  ('clothing', 'Clothing', 'shirt', 'Vintage, designer, streetwear, and everyday pieces.', '["brand","size","material","season","condition"]', 20),
  ('watches', 'Watches', 'watch', 'Mechanical, quartz, digital, and everything keeping time.', '["brand","reference","movement","year","condition"]', 30),
  ('vinyl', 'Vinyl records', 'disc-3', 'Albums, pressings, sleeves, and listening memories.', '["artist","album","label","pressing","year","condition"]', 40),
  ('cameras', 'Cameras', 'camera', 'Film, digital, lenses, and field companions.', '["brand","model","format","lens","year","condition"]', 50),
  ('books', 'Books', 'book-open', 'Editions, covers, marginalia, and shelves.', '["author","publisher","edition","year","condition"]', 60),
  ('toys', 'Toys & figures', 'blocks', 'Figures, sets, childhood keepsakes, and tiny worlds.', '["brand","series","character","year","condition"]', 70),
  ('art', 'Art & prints', 'frame', 'Originals, editions, posters, and prints.', '["artist","medium","edition","dimensions","year"]', 80),
  ('custom', 'Something else', 'sparkles', 'Name the collection only you could make.', '[]', 999);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('profile-media', 'profile-media', true, 5242880, array['image/jpeg','image/png','image/webp','image/avif']),
  ('collection-media', 'collection-media', false, 15728640, array['image/jpeg','image/png','image/webp','image/avif','image/heic'])
on conflict (id) do nothing;

create policy profile_media_owner_insert on storage.objects for insert to authenticated with check (bucket_id = 'profile-media' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy profile_media_owner_update on storage.objects for update to authenticated using (bucket_id = 'profile-media' and owner_id = (select auth.uid())::text) with check (bucket_id = 'profile-media' and owner_id = (select auth.uid())::text);
create policy profile_media_owner_delete on storage.objects for delete to authenticated using (bucket_id = 'profile-media' and owner_id = (select auth.uid())::text);
create policy collection_media_owner_read on storage.objects for select to authenticated using (bucket_id = 'collection-media' and owner_id = (select auth.uid())::text);
create policy collection_media_owner_insert on storage.objects for insert to authenticated with check (bucket_id = 'collection-media' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy collection_media_owner_update on storage.objects for update to authenticated using (bucket_id = 'collection-media' and owner_id = (select auth.uid())::text) with check (bucket_id = 'collection-media' and owner_id = (select auth.uid())::text);
create policy collection_media_owner_delete on storage.objects for delete to authenticated using (bucket_id = 'collection-media' and owner_id = (select auth.uid())::text);

grant usage on schema public to anon, authenticated;
grant select on all tables in schema public to anon, authenticated;
grant insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages') then
    alter publication supabase_realtime add table public.messages;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications') then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;
