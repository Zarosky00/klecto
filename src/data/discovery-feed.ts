import "server-only";

import { getCurrentIdentity } from "@/data/auth";
import { createClient } from "@/lib/supabase/server";
import type {
  DiscoveryAuthorDTO,
  DiscoveryCatalogDTO,
  DiscoveryCatalogPreviewDTO,
  DiscoveryCommentDTO,
  DiscoveryFeedDTO,
  DiscoveryFeedEntryDTO,
  DiscoverySubcollectionDTO,
  DiscoveryTargetKind,
  ItemMood,
} from "@/lib/catalog-types";

type CatalogCollectionRow = {
  id: string;
  user_id: string;
  slug: string;
  name: string;
  description: string | null;
  cover_path: string | null;
  updated_at: string;
};

type CatalogSubcollectionRow = {
  id: string;
  user_id: string;
  collection_id: string;
  slug: string;
  name: string;
  description: string | null;
  kind: string;
  cover_path: string | null;
  visibility: "public" | "followers" | "private" | null;
  updated_at: string;
};

type CatalogItemRow = {
  id: string;
  user_id: string;
  collection_id: string;
  subcollection_id: string | null;
  title: string;
  description: string | null;
  brand: string | null;
  mood: ItemMood;
  visibility: "public" | "followers" | "private" | null;
  created_at: string;
  item_media: { storage_path: string; position: number }[] | null;
};

type ProfileRow = {
  id: string;
  username: string;
  display_name: string;
  avatar_path: string | null;
  is_verified: boolean;
};

type CatalogCommentRow = {
  id: string;
  collection_id: string | null;
  subcollection_id: string | null;
  item_id: string | null;
  author_id: string;
  body: string;
  created_at: string;
};

const demoImage = {
  collection: "https://images.unsplash.com/photo-1528459105426-b9548367069b?auto=format&fit=crop&w=1200&q=85",
  section: "https://images.unsplash.com/photo-1531058020387-3be344556be6?auto=format&fit=crop&w=1200&q=85",
  item: "https://images.unsplash.com/photo-1511497584788-876760111969?auto=format&fit=crop&w=1200&q=85",
  object: "https://images.unsplash.com/photo-1493666438817-866a91353ca9?auto=format&fit=crop&w=1200&q=85",
};

function sourceHref(author: DiscoveryAuthorDTO, collection: DiscoveryCatalogDTO) {
  return `/u/${encodeURIComponent(author.username)}/collections/${encodeURIComponent(collection.slug)}`;
}

function publicAvatarUrl(
  supabase: Awaited<ReturnType<typeof createClient>>,
  path: string | null,
) {
  if (!path) return null;
  return supabase.storage.from("profile-media").getPublicUrl(path).data.publicUrl;
}

async function signedCatalogUrls(
  supabase: Awaited<ReturnType<typeof createClient>>,
  paths: string[],
) {
  const urls = new Map<string, string>();
  const unique = [...new Set(paths.filter(Boolean))];
  for (let start = 0; start < unique.length; start += 100) {
    const { data, error } = await supabase.storage
      .from("collection-media")
      .createSignedUrls(unique.slice(start, start + 100), 60 * 5);
    if (error) {
      console.error("Unable to sign discovery media", error);
      continue;
    }
    data?.forEach((entry) => {
      if (entry.path && entry.signedUrl) urls.set(entry.path, entry.signedUrl);
    });
  }
  return urls;
}

function kindFrom(value: string): DiscoverySubcollectionDTO["kind"] {
  return value === "brand" || value === "series" || value === "era" ? value : "custom";
}

function fallbackFeed(): DiscoveryFeedDTO {
  const author: DiscoveryAuthorDTO = {
    id: "demo-arjun",
    username: "arjcollects",
    displayName: "Arjun Kapoor",
    avatarUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=160&q=85",
    isVerified: false,
  };
  const collection: DiscoveryCatalogDTO = { id: "demo-childhood", slug: "childhood-things", name: "Childhood things" };
  const toyBox: DiscoverySubcollectionDTO = { id: "demo-toy-box", slug: "toy-box", name: "The toy box", kind: "custom" };
  const paperTrail: DiscoverySubcollectionDTO = { id: "demo-paper-trail", slug: "paper-trail", name: "Paper trail", kind: "era" };
  const href = "/demo/collections/childhood-things";
  const now = new Date().toISOString();
  const maya: DiscoveryAuthorDTO = { ...author, id: "demo-maya", username: "mayakeeps", displayName: "Maya Sen", avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=160&q=85" };
  const demoComments: DiscoveryCommentDTO[] = [
    { id: "demo-comment-1", author: maya, body: "This is the kind of detail that makes a collection feel alive.", createdAt: now, isOwn: false, likeCount: 12, replyCount: 1 },
    { id: "demo-comment-2", author, body: "Exactly. I still remember finding it again years later.", createdAt: now, isOwn: true, parentId: "demo-comment-1", likeCount: 4, replyCount: 0 },
  ];
  const catalogPreview: DiscoveryCatalogPreviewDTO = {
    collection,
    subcollections: [
      { id: toyBox.id, slug: toyBox.slug, name: toyBox.name, kind: toyBox.kind, coverUrl: demoImage.section, itemCount: 1 },
      { id: paperTrail.id, slug: paperTrail.slug, name: paperTrail.name, kind: paperTrail.kind, coverUrl: demoImage.object, itemCount: 1 },
    ],
    items: [
      { id: "demo-controller", title: "Midnight game controller", description: "A weekend tournament survivor.", imageUrl: demoImage.item, subcollectionId: toyBox.id, subcollectionName: toyBox.name },
      { id: "demo-library-card", title: "Library card", description: "Paper card / 2006 / worn", imageUrl: demoImage.object, subcollectionId: paperTrail.id, subcollectionName: paperTrail.name },
    ],
  };
  return {
    isDemoFallback: true,
    entries: [
      {
        id: "demo-collection-childhood", kind: "collection", targetKind: "collection", targetId: collection.id,
        author, sourceAuthor: author, collection, subcollection: null, title: collection.name,
        description: "Toys, tickets, and the small proof that a good day happened.", quoteText: null,
        imageUrls: [demoImage.collection], imageCount: 1, mood: null, createdAt: now,
        likeCount: 42, likedByViewer: false, commentCount: 7, viewCount: 385, comments: demoComments, wishlistCount: 5, wishlisters: [maya], likers: [maya, author], catalogPreview, sourceHref: href,
      },
      {
        id: "demo-section-toy-box", kind: "subcollection", targetKind: "subcollection", targetId: toyBox.id,
        author, sourceAuthor: author, collection, subcollection: toyBox, title: toyBox.name,
        description: "Controllers, figures, and the after-school rituals that lasted for hours.", quoteText: null,
        imageUrls: [demoImage.section], imageCount: 1, mood: null, createdAt: now,
        likeCount: 18, likedByViewer: false, commentCount: 4, viewCount: 152, comments: demoComments.slice(0, 1), wishlistCount: 2, wishlisters: [maya], likers: [maya], catalogPreview, sourceHref: href,
      },
      {
        id: "demo-item-controller", kind: "item", targetKind: "item", targetId: "demo-controller",
        author, sourceAuthor: author, collection, subcollection: toyBox, title: "Midnight game controller",
        description: "The controller that survived every weekend tournament with one stubborn trigger.", quoteText: null,
        imageUrls: [demoImage.item, demoImage.object, demoImage.section], imageCount: 3, mood: "memory", createdAt: now,
        likeCount: 24, likedByViewer: false, commentCount: 4, viewCount: 219, comments: demoComments, wishlistCount: 8, wishlisters: [maya], likers: [maya, author], catalogPreview, sourceHref: href,
      },
      {
        id: "demo-wishlist-library-card", kind: "wishlist", targetKind: "item", targetId: "demo-library-card",
        author: maya, sourceAuthor: author,
        collection, subcollection: paperTrail, title: "Library card",
        description: "Paper card · 2006 · worn", quoteText: "I want to find one like this before the year ends.",
        imageUrls: [demoImage.object, demoImage.section], imageCount: 2, mood: "neutral", createdAt: now,
        likeCount: 12, likedByViewer: false, commentCount: 2, viewCount: 184, comments: demoComments.slice(0, 1), wishlistCount: 1, wishlisters: [maya], likers: [maya], catalogPreview, sourceHref: href,
      },
    ],
  };
}

/**
 * RLS stays the authorization boundary. These explicit public predicates make
 * the home feed public-only even for an authenticated collector who can see
 * more of a followed catalogue elsewhere in the product.
 */
export async function getDiscoveryFeed(): Promise<DiscoveryFeedDTO> {
  const [supabase, identity] = await Promise.all([createClient(), getCurrentIdentity()]);
  const [collectionsResult, subcollectionsResult, itemsResult, wishlistPostsResult] = await Promise.all([
    supabase.from("collections")
      .select("id, user_id, slug, name, description, cover_path, updated_at")
      .eq("visibility", "public")
      .order("updated_at", { ascending: false }).limit(18),
    supabase.from("subcollections")
      .select("id, user_id, collection_id, slug, name, description, kind, cover_path, visibility, updated_at")
      .or("visibility.is.null,visibility.eq.public")
      .order("updated_at", { ascending: false }).limit(24),
    supabase.from("items")
      .select("id, user_id, collection_id, subcollection_id, title, description, brand, mood, visibility, created_at, item_media(storage_path, position)")
      .or("visibility.is.null,visibility.eq.public")
      .order("created_at", { ascending: false }).limit(30),
    supabase.from("posts")
      .select("id, author_id, quote_text, collection_id, subcollection_id, item_id, created_at")
      .eq("kind", "wishlist").eq("visibility", "public").is("deleted_at", null)
      .order("created_at", { ascending: false }).limit(18),
  ]);

  if (collectionsResult.error || subcollectionsResult.error || itemsResult.error || wishlistPostsResult.error) {
    console.error("Unable to load discovery feed", {
      collections: collectionsResult.error,
      subcollections: subcollectionsResult.error,
      items: itemsResult.error,
      wishlists: wishlistPostsResult.error,
    });
  }

  const collections = (collectionsResult.data ?? []) as CatalogCollectionRow[];
  const visibleCollectionIds = new Set(collections.map((entry) => entry.id));
  const collectionById = new Map(collections.map((entry) => [entry.id, entry]));
  const subcollections = ((subcollectionsResult.data ?? []) as CatalogSubcollectionRow[])
    .filter((entry) => visibleCollectionIds.has(entry.collection_id));
  const subcollectionById = new Map(subcollections.map((entry) => [entry.id, entry]));
  const items = ((itemsResult.data ?? []) as CatalogItemRow[]).filter((entry) =>
    visibleCollectionIds.has(entry.collection_id) && (!entry.subcollection_id || subcollectionById.has(entry.subcollection_id)),
  );
  const itemById = new Map(items.map((entry) => [entry.id, entry]));
  const wishlistPosts = (wishlistPostsResult.data ?? []).filter((post) =>
    (post.collection_id && visibleCollectionIds.has(post.collection_id)) ||
    (post.subcollection_id && subcollectionById.has(post.subcollection_id)) ||
    (post.item_id && itemById.has(post.item_id)),
  );

  const profileIds = [...new Set([
    ...collections.map((entry) => entry.user_id),
    ...subcollections.map((entry) => entry.user_id),
    ...items.map((entry) => entry.user_id),
    ...wishlistPosts.map((entry) => entry.author_id),
  ])];
  const { data: profileRows } = profileIds.length
    ? await supabase.from("profiles").select("id, username, display_name, avatar_path, is_verified").in("id", profileIds)
    : { data: [] as ProfileRow[] };
  const profileById = new Map((profileRows as ProfileRow[] | null ?? []).map((entry) => [entry.id, entry]));
  const authorFor = (id: string): DiscoveryAuthorDTO | null => {
    const profile = profileById.get(id);
    if (!profile) return null;
    return {
      id: profile.id,
      username: profile.username,
      displayName: profile.display_name,
      avatarUrl: publicAvatarUrl(supabase, profile.avatar_path),
      isVerified: profile.is_verified,
    };
  };
  const wishlistCountByTarget = new Map<string, number>();
  const wishlistersByTarget = new Map<string, DiscoveryAuthorDTO[]>();
  wishlistPosts.forEach((post) => {
    const targetId = post.item_id ?? post.subcollection_id ?? post.collection_id;
    if (!targetId) return;
    wishlistCountByTarget.set(targetId, (wishlistCountByTarget.get(targetId) ?? 0) + 1);
    const author = authorFor(post.author_id);
    if (!author) return;
    const collectors = wishlistersByTarget.get(targetId) ?? [];
    if (!collectors.some((collector) => collector.id === author.id) && collectors.length < 5) {
      collectors.push(author);
      wishlistersByTarget.set(targetId, collectors);
    }
  });

  const mediaPaths = [
    ...collections.map((entry) => entry.cover_path),
    ...subcollections.map((entry) => entry.cover_path),
    ...items.flatMap((entry) => entry.item_media?.map((media) => media.storage_path) ?? []),
  ].filter((path): path is string => Boolean(path));
  const signedUrlByPath = await signedCatalogUrls(supabase, mediaPaths);

  const collectionIds = collections.map((entry) => entry.id);
  const subcollectionIds = subcollections.map((entry) => entry.id);
  const itemIds = items.map((entry) => entry.id);
  const commentTargetFilter = [
    collectionIds.length ? `collection_id.in.(${collectionIds.join(",")})` : null,
    subcollectionIds.length ? `subcollection_id.in.(${subcollectionIds.join(",")})` : null,
    itemIds.length ? `item_id.in.(${itemIds.join(",")})` : null,
  ].filter((value): value is string => Boolean(value)).join(",");
  const viewTargetFilter = [
    collectionIds.length ? `collection_id.in.(${collectionIds.join(",")})` : null,
    subcollectionIds.length ? `subcollection_id.in.(${subcollectionIds.join(",")})` : null,
    itemIds.length ? `item_id.in.(${itemIds.join(",")})` : null,
  ].filter((value): value is string => Boolean(value)).join(",");
  const [collectionLikes, subcollectionLikes, itemLikes, catalogComments, catalogViews] = await Promise.all([
    collectionIds.length ? supabase.from("collection_likes").select("collection_id, user_id").in("collection_id", collectionIds) : Promise.resolve({ data: [] as { collection_id: string; user_id: string }[] }),
    subcollectionIds.length ? supabase.from("subcollection_likes").select("subcollection_id, user_id").in("subcollection_id", subcollectionIds) : Promise.resolve({ data: [] as { subcollection_id: string; user_id: string }[] }),
    itemIds.length ? supabase.from("item_likes").select("item_id, user_id").in("item_id", itemIds) : Promise.resolve({ data: [] as { item_id: string; user_id: string }[] }),
    commentTargetFilter
      ? supabase.from("catalog_comments").select("id, collection_id, subcollection_id, item_id, author_id, body, created_at").is("deleted_at", null).or(commentTargetFilter).order("created_at", { ascending: true })
      : Promise.resolve({ data: [] as CatalogCommentRow[] }),
    viewTargetFilter
      ? supabase.from("catalog_views").select("collection_id, subcollection_id, item_id").or(viewTargetFilter)
      : Promise.resolve({ data: [] as { collection_id: string | null; subcollection_id: string | null; item_id: string | null }[] }),
  ]);

  const countAndMine = (rows: { id: string; userId: string }[]) => {
    const counts = new Map<string, number>();
    const mine = new Set<string>();
    rows.forEach((row) => {
      counts.set(row.id, (counts.get(row.id) ?? 0) + 1);
      if (row.userId === identity?.id) mine.add(row.id);
    });
    return { counts, mine };
  };
  const collectionReaction = countAndMine((collectionLikes.data ?? []).map((row) => ({ id: row.collection_id, userId: row.user_id })));
  const subcollectionReaction = countAndMine((subcollectionLikes.data ?? []).map((row) => ({ id: row.subcollection_id, userId: row.user_id })));
  const itemReaction = countAndMine((itemLikes.data ?? []).map((row) => ({ id: row.item_id, userId: row.user_id })));
  const viewCountByTarget = new Map<string, number>();
  (catalogViews.data ?? []).forEach((view) => {
    const id = view.item_id ?? view.subcollection_id ?? view.collection_id;
    if (id) viewCountByTarget.set(id, (viewCountByTarget.get(id) ?? 0) + 1);
  });
  const likeAuthorIds = [...new Set([
    ...(collectionLikes.data ?? []).map((row) => row.user_id),
    ...(subcollectionLikes.data ?? []).map((row) => row.user_id),
    ...(itemLikes.data ?? []).map((row) => row.user_id),
  ])].filter((id) => !profileById.has(id));
  if (likeAuthorIds.length) {
    const { data: likeProfiles } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_path, is_verified")
      .in("id", likeAuthorIds);
    (likeProfiles as ProfileRow[] | null ?? []).forEach((profile) => profileById.set(profile.id, profile));
  }
  const likersByTarget = new Map<string, DiscoveryAuthorDTO[]>();
  const addLiker = (targetId: string, userId: string) => {
    const liker = authorFor(userId);
    if (!liker) return;
    const people = likersByTarget.get(targetId) ?? [];
    if (!people.some((person) => person.id === liker.id) && people.length < 8) {
      people.push(liker);
      likersByTarget.set(targetId, people);
    }
  };
  (collectionLikes.data ?? []).forEach((row) => addLiker(row.collection_id, row.user_id));
  (subcollectionLikes.data ?? []).forEach((row) => addLiker(row.subcollection_id, row.user_id));
  (itemLikes.data ?? []).forEach((row) => addLiker(row.item_id, row.user_id));
  const commentRows = (catalogComments.data ?? []) as CatalogCommentRow[];
  const commentAuthorIds = [...new Set(commentRows.map((row) => row.author_id).filter((id) => !profileById.has(id)))];
  if (commentAuthorIds.length) {
    const { data: commentProfiles } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_path, is_verified")
      .in("id", commentAuthorIds);
    (commentProfiles as ProfileRow[] | null ?? []).forEach((profile) => profileById.set(profile.id, profile));
  }

  const commentCount = new Map<string, number>();
  const commentsByTarget = new Map<string, DiscoveryCommentDTO[]>();
  commentRows.forEach((row) => {
    const id = row.collection_id ?? row.subcollection_id ?? row.item_id;
    if (!id) return;
    commentCount.set(id, (commentCount.get(id) ?? 0) + 1);
    const author = authorFor(row.author_id) ?? {
      id: row.author_id,
      username: "collector",
      displayName: "Collector",
      avatarUrl: null,
      isVerified: false,
    };
    const thread = commentsByTarget.get(id) ?? [];
    if (thread.length < 4) {
      thread.push({ id: row.id, author, body: row.body, createdAt: row.created_at, isOwn: row.author_id === identity?.id });
      commentsByTarget.set(id, thread);
    }
  });

  const collectionDTO = (row: CatalogCollectionRow): DiscoveryCatalogDTO => ({ id: row.id, slug: row.slug, name: row.name });
  const subcollectionDTO = (row: CatalogSubcollectionRow): DiscoverySubcollectionDTO => ({ id: row.id, slug: row.slug, name: row.name, kind: kindFrom(row.kind) });
  const previewFor = (collection: CatalogCollectionRow): DiscoveryCatalogPreviewDTO => ({
    collection: collectionDTO(collection),
    subcollections: subcollections
      .filter((section) => section.collection_id === collection.id)
      .map((section) => ({
        id: section.id,
        slug: section.slug,
        name: section.name,
        kind: kindFrom(section.kind),
        coverUrl: section.cover_path ? signedUrlByPath.get(section.cover_path) ?? null : null,
        itemCount: items.filter((item) => item.subcollection_id === section.id).length,
      })),
    items: items
      .filter((item) => item.collection_id === collection.id)
      .map((item) => {
        const media = [...(item.item_media ?? [])].sort((left, right) => left.position - right.position);
        const section = item.subcollection_id ? subcollectionById.get(item.subcollection_id) : null;
        return {
          id: item.id,
          title: item.title,
          description: item.description ?? item.brand,
          imageUrl: media[0] ? signedUrlByPath.get(media[0].storage_path) ?? null : null,
          subcollectionId: section?.id ?? null,
          subcollectionName: section?.name ?? null,
        };
      }),
  });
  const reactionsFor = (kind: DiscoveryTargetKind, id: string) => {
    const reactions = kind === "collection" ? collectionReaction : kind === "subcollection" ? subcollectionReaction : itemReaction;
    return { likeCount: reactions.counts.get(id) ?? 0, likedByViewer: reactions.mine.has(id) };
  };
  const entries: DiscoveryFeedEntryDTO[] = [];

  collections.forEach((row) => {
    const author = authorFor(row.user_id);
    if (!author) return;
    const catalog = collectionDTO(row);
    const reaction = reactionsFor("collection", row.id);
    entries.push({
      id: `collection-${row.id}`, kind: "collection", targetKind: "collection", targetId: row.id, author, sourceAuthor: author,
      collection: catalog, subcollection: null, title: row.name, description: row.description, quoteText: null,
      imageUrls: row.cover_path && signedUrlByPath.get(row.cover_path) ? [signedUrlByPath.get(row.cover_path)!] : [], imageCount: row.cover_path ? 1 : 0,
      mood: null, createdAt: row.updated_at, ...reaction, commentCount: commentCount.get(row.id) ?? 0, viewCount: viewCountByTarget.get(row.id) ?? 0, comments: commentsByTarget.get(row.id) ?? [], wishlistCount: wishlistCountByTarget.get(row.id) ?? 0, wishlisters: wishlistersByTarget.get(row.id) ?? [], likers: likersByTarget.get(row.id) ?? [], catalogPreview: previewFor(row),
      sourceHref: sourceHref(author, catalog),
    });
  });
  subcollections.forEach((row) => {
    const author = authorFor(row.user_id);
    const parent = collectionById.get(row.collection_id);
    if (!author || !parent) return;
    const catalog = collectionDTO(parent);
    const section = subcollectionDTO(row);
    const reaction = reactionsFor("subcollection", row.id);
    entries.push({
      id: `subcollection-${row.id}`, kind: "subcollection", targetKind: "subcollection", targetId: row.id, author, sourceAuthor: author,
      collection: catalog, subcollection: section, title: row.name, description: row.description, quoteText: null,
      imageUrls: row.cover_path && signedUrlByPath.get(row.cover_path) ? [signedUrlByPath.get(row.cover_path)!] : [], imageCount: row.cover_path ? 1 : 0,
      mood: null, createdAt: row.updated_at, ...reaction, commentCount: commentCount.get(row.id) ?? 0, viewCount: viewCountByTarget.get(row.id) ?? 0, comments: commentsByTarget.get(row.id) ?? [], wishlistCount: wishlistCountByTarget.get(row.id) ?? 0, wishlisters: wishlistersByTarget.get(row.id) ?? [], likers: likersByTarget.get(row.id) ?? [], catalogPreview: previewFor(parent),
      sourceHref: sourceHref(author, catalog),
    });
  });
  items.forEach((row) => {
    const author = authorFor(row.user_id);
    const parent = collectionById.get(row.collection_id);
    if (!author || !parent) return;
    const catalog = collectionDTO(parent);
    const section = row.subcollection_id ? subcollectionById.get(row.subcollection_id) : null;
    const orderedMedia = [...(row.item_media ?? [])].sort((a, b) => a.position - b.position);
    const reaction = reactionsFor("item", row.id);
    entries.push({
      id: `item-${row.id}`, kind: "item", targetKind: "item", targetId: row.id, author, sourceAuthor: author,
      collection: catalog, subcollection: section ? subcollectionDTO(section) : null, title: row.title,
      description: row.description ?? row.brand, quoteText: null,
      imageUrls: orderedMedia.map((media) => signedUrlByPath.get(media.storage_path)).filter((url): url is string => Boolean(url)), imageCount: orderedMedia.length,
      mood: row.mood, createdAt: row.created_at, ...reaction, commentCount: commentCount.get(row.id) ?? 0, viewCount: viewCountByTarget.get(row.id) ?? 0, comments: commentsByTarget.get(row.id) ?? [], wishlistCount: wishlistCountByTarget.get(row.id) ?? 0, wishlisters: wishlistersByTarget.get(row.id) ?? [], likers: likersByTarget.get(row.id) ?? [], catalogPreview: previewFor(parent),
      sourceHref: sourceHref(author, catalog),
    });
  });
  wishlistPosts.forEach((post) => {
    const author = authorFor(post.author_id);
    if (!author) return;
    let targetKind: DiscoveryTargetKind;
    let targetId: string;
    let ownerId: string;
    let catalogRow: CatalogCollectionRow | undefined;
    let sectionRow: CatalogSubcollectionRow | null = null;
    let title: string;
    let description: string | null;
    let imageUrls: string[];
    let imageCount: number;
    let mood: ItemMood | null = null;
    if (post.item_id) {
      const item = itemById.get(post.item_id); if (!item) return;
      targetKind = "item"; targetId = item.id; ownerId = item.user_id; catalogRow = collectionById.get(item.collection_id); sectionRow = item.subcollection_id ? subcollectionById.get(item.subcollection_id) ?? null : null;
      title = item.title; description = item.description ?? item.brand; mood = item.mood;
      const ordered = [...(item.item_media ?? [])].sort((a, b) => a.position - b.position);
      imageUrls = ordered.map((media) => signedUrlByPath.get(media.storage_path)).filter((url): url is string => Boolean(url)); imageCount = ordered.length;
    } else if (post.subcollection_id) {
      const section = subcollectionById.get(post.subcollection_id); if (!section) return;
      targetKind = "subcollection"; targetId = section.id; ownerId = section.user_id; catalogRow = collectionById.get(section.collection_id); sectionRow = section;
      title = section.name; description = section.description; imageUrls = section.cover_path && signedUrlByPath.get(section.cover_path) ? [signedUrlByPath.get(section.cover_path)!] : []; imageCount = section.cover_path ? 1 : 0;
    } else if (post.collection_id) {
      const catalog = collectionById.get(post.collection_id); if (!catalog) return;
      targetKind = "collection"; targetId = catalog.id; ownerId = catalog.user_id; catalogRow = catalog;
      title = catalog.name; description = catalog.description; imageUrls = catalog.cover_path && signedUrlByPath.get(catalog.cover_path) ? [signedUrlByPath.get(catalog.cover_path)!] : []; imageCount = catalog.cover_path ? 1 : 0;
    } else return;
    const owner = authorFor(ownerId);
    if (!catalogRow || !owner) return;
    const reaction = reactionsFor(targetKind, targetId);
    entries.push({
      id: post.id, kind: "wishlist", targetKind, targetId, author, sourceAuthor: owner,
      collection: collectionDTO(catalogRow), subcollection: sectionRow ? subcollectionDTO(sectionRow) : null,
      title, description, quoteText: post.quote_text, imageUrls, imageCount, mood, createdAt: post.created_at,
      ...reaction, commentCount: commentCount.get(targetId) ?? 0, viewCount: viewCountByTarget.get(targetId) ?? 0, comments: commentsByTarget.get(targetId) ?? [], wishlistCount: wishlistCountByTarget.get(targetId) ?? 0, wishlisters: wishlistersByTarget.get(targetId) ?? [], likers: likersByTarget.get(targetId) ?? [], catalogPreview: previewFor(catalogRow), sourceHref: sourceHref(owner, collectionDTO(catalogRow)),
    });
  });

  if (!entries.length) return fallbackFeed();
  // Interleave types so a fresh home page doesn't become a wall of one catalog
  // shape just because one table happened to update most recently.
  const rank = { wishlist: 0, item: 1, subcollection: 2, collection: 3 } as const;
  entries.sort((left, right) => {
    const age = new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
    return age === 0 ? rank[left.kind] - rank[right.kind] : age;
  });
  return { entries: entries.slice(0, 36), isDemoFallback: false };
}
