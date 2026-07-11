import "server-only";

import { getCurrentIdentity } from "@/data/auth";
import { createClient } from "@/lib/supabase/server";
import type {
  CatalogCommentDTO,
  PublicProfileCollectionDTO,
  PublicProfileDTO,
  PublicProfileItemDTO,
  PublicProfileSubcollectionDTO,
} from "@/lib/catalog-types";

const usernamePattern = /^[a-z0-9_]{3,24}$/;

function normalizeUsername(value: string) {
  const username = value.trim().toLowerCase();
  return usernamePattern.test(username) ? username : null;
}

function publicProfileUrl(
  supabase: Awaited<ReturnType<typeof createClient>>,
  path: string | null,
) {
  if (!path) return null;
  return supabase.storage.from("profile-media").getPublicUrl(path).data.publicUrl;
}

function safeWebsite(value: string | null) {
  if (!value) return null;

  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

async function signedCatalogUrls(
  supabase: Awaited<ReturnType<typeof createClient>>,
  paths: string[],
) {
  const urls = new Map<string, string>();
  const uniquePaths = [...new Set(paths)];

  // Storage accepts a batch of paths; chunking keeps very large public shelves
  // from turning one profile visit into an oversized request.
  for (let index = 0; index < uniquePaths.length; index += 100) {
    const batch = uniquePaths.slice(index, index + 100);
    const { data, error } = await supabase.storage
      .from("collection-media")
      .createSignedUrls(batch, 60 * 5);

    if (error) {
      console.error("Unable to sign visible catalog media", error);
      continue;
    }

    data?.forEach((entry) => {
      if (entry.path && entry.signedUrl) urls.set(entry.path, entry.signedUrl);
    });
  }

  return urls;
}

/**
 * Data access boundary for public collector pages. Database RLS remains the
 * authorization source of truth; this layer narrows its result to a DTO that
 * is safe to render on a public route.
 */
export async function getPublicProfile(rawUsername: string): Promise<PublicProfileDTO | null> {
  const username = normalizeUsername(rawUsername);
  if (!username) return null;

  const [supabase, identity] = await Promise.all([createClient(), getCurrentIdentity()]);
  const profileResult = await supabase
    .from("profiles")
    .select("id, username, display_name, bio, location, website, avatar_path, banner_path, is_verified, show_similarity")
    .eq("username", username)
    .maybeSingle();

  // RLS intentionally makes a blocked, private, suspended, or nonexistent
  // account indistinguishable to the caller.
  if (profileResult.error || !profileResult.data) return null;

  const profile = profileResult.data;
  const isOwner = identity?.id === profile.id;
  const canCalculateSimilarity = Boolean(identity && !isOwner && profile.show_similarity);

  const [
    collectionsResult,
    subcollectionsResult,
    itemsResult,
    collectionLikesResult,
    subcollectionLikesResult,
    itemLikesResult,
    catalogCommentsResult,
    catalogViewsResult,
    followersResult,
    followingResult,
    followStateResult,
    similarityResult,
  ] = await Promise.all([
    supabase
      .from("collections")
      .select("id, name, slug, description, cover_path, is_featured, updated_at")
      .eq("user_id", profile.id)
      .order("is_featured", { ascending: false })
      .order("updated_at", { ascending: false }),
    supabase
      .from("subcollections")
      .select("id, collection_id, slug, name, description, kind, cover_path")
      .eq("user_id", profile.id),
    supabase
      .from("items")
      .select("id, collection_id, subcollection_id, title, description, brand, model, year, condition, mood, is_favorite, created_at, item_media(storage_path, position), item_tags(tag)")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("collection_likes")
      .select("collection_id, user_id"),
    supabase
      .from("subcollection_likes")
      .select("subcollection_id, user_id"),
    supabase
      .from("item_likes")
      .select("item_id, user_id"),
    supabase
      .from("catalog_comments")
      .select("id, collection_id, subcollection_id, item_id, author_id, body, created_at")
      .is("deleted_at", null)
      .order("created_at", { ascending: true }),
    supabase
      .from("catalog_views")
      .select("collection_id, subcollection_id, item_id"),
    supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("following_id", profile.id),
    supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("follower_id", profile.id),
    identity && !isOwner
      ? supabase
          .from("follows")
          .select("follower_id")
          .eq("follower_id", identity.id)
          .eq("following_id", profile.id)
          .maybeSingle()
      : Promise.resolve(null),
    canCalculateSimilarity
      ? supabase.rpc("collection_similarity", { other_user: profile.id })
      : Promise.resolve(null),
  ]);

  const itemRows = itemsResult.data ?? [];
  const mediaPaths = itemRows
    .flatMap((item) => item.item_media ?? [])
    .map((media) => media.storage_path);
  const coverPaths = (collectionsResult.data ?? [])
    .map((collection) => collection.cover_path)
    .filter((path): path is string => Boolean(path));
  const subcollectionCoverPaths = (subcollectionsResult.data ?? [])
    .map((subcollection) => subcollection.cover_path)
    .filter((path): path is string => Boolean(path));
  const signedUrlByPath = await signedCatalogUrls(supabase, [...coverPaths, ...subcollectionCoverPaths, ...mediaPaths]);

  const collectionLikeCounts = new Map<string, number>();
  const likedCollectionIds = new Set<string>();
  (collectionLikesResult.data ?? []).forEach((like) => {
    collectionLikeCounts.set(like.collection_id, (collectionLikeCounts.get(like.collection_id) ?? 0) + 1);
    if (like.user_id === identity?.id) likedCollectionIds.add(like.collection_id);
  });
  const subcollectionLikeCounts = new Map<string, number>();
  const likedSubcollectionIds = new Set<string>();
  (subcollectionLikesResult.data ?? []).forEach((like) => {
    subcollectionLikeCounts.set(like.subcollection_id, (subcollectionLikeCounts.get(like.subcollection_id) ?? 0) + 1);
    if (like.user_id === identity?.id) likedSubcollectionIds.add(like.subcollection_id);
  });
  const itemLikeCounts = new Map<string, number>();
  const likedItemIds = new Set<string>();
  (itemLikesResult.data ?? []).forEach((like) => {
    itemLikeCounts.set(like.item_id, (itemLikeCounts.get(like.item_id) ?? 0) + 1);
    if (like.user_id === identity?.id) likedItemIds.add(like.item_id);
  });

  const comments: CatalogCommentDTO[] = (catalogCommentsResult.data ?? []).map((comment) => ({
    id: comment.id,
    collectionId: comment.collection_id,
    subcollectionId: comment.subcollection_id,
    itemId: comment.item_id,
    authorId: comment.author_id,
    body: comment.body,
    createdAt: comment.created_at,
    isOwn: comment.author_id === identity?.id,
  }));
  const collectionCommentCounts = new Map<string, number>();
  const subcollectionCommentCounts = new Map<string, number>();
  const itemCommentCounts = new Map<string, number>();
  comments.forEach((comment) => {
    if (comment.collectionId) collectionCommentCounts.set(comment.collectionId, (collectionCommentCounts.get(comment.collectionId) ?? 0) + 1);
    if (comment.subcollectionId) subcollectionCommentCounts.set(comment.subcollectionId, (subcollectionCommentCounts.get(comment.subcollectionId) ?? 0) + 1);
    if (comment.itemId) itemCommentCounts.set(comment.itemId, (itemCommentCounts.get(comment.itemId) ?? 0) + 1);
  });

  const collectionViewCounts = new Map<string, number>();
  const subcollectionViewCounts = new Map<string, number>();
  const itemViewCounts = new Map<string, number>();
  (catalogViewsResult.data ?? []).forEach((view) => {
    if (view.collection_id) collectionViewCounts.set(view.collection_id, (collectionViewCounts.get(view.collection_id) ?? 0) + 1);
    if (view.subcollection_id) subcollectionViewCounts.set(view.subcollection_id, (subcollectionViewCounts.get(view.subcollection_id) ?? 0) + 1);
    if (view.item_id) itemViewCounts.set(view.item_id, (itemViewCounts.get(view.item_id) ?? 0) + 1);
  });

  const items: PublicProfileItemDTO[] = itemRows.map((item) => {
    const orderedMedia = [...(item.item_media ?? [])].sort((left, right) => left.position - right.position);
    const imageUrls = orderedMedia
      .map((media) => signedUrlByPath.get(media.storage_path))
      .filter((url): url is string => Boolean(url));

    return {
      id: item.id,
      collectionId: item.collection_id,
      subcollectionId: item.subcollection_id,
      title: item.title,
      description: item.description,
      brand: item.brand,
      model: item.model,
      year: item.year,
      condition: item.condition,
      tags: (item.item_tags ?? []).map((tag) => tag.tag),
      mood: item.mood,
      isFavorite: item.is_favorite,
      imageUrls,
      imageCount: orderedMedia.length,
      likeCount: itemLikeCounts.get(item.id) ?? 0,
      likedByViewer: likedItemIds.has(item.id),
      commentCount: itemCommentCounts.get(item.id) ?? 0,
      viewCount: itemViewCounts.get(item.id) ?? 0,
    };
  });

  const itemCollectionById = new Map(
    itemRows.map((item) => [item.id, item.collection_id]),
  );

  const subcollections: PublicProfileSubcollectionDTO[] = (subcollectionsResult.data ?? []).map((subcollection) => ({
    id: subcollection.id,
    collectionId: subcollection.collection_id,
    slug: subcollection.slug,
    name: subcollection.name,
    description: subcollection.description,
    kind: subcollection.kind as PublicProfileSubcollectionDTO["kind"],
    coverUrl: subcollection.cover_path ? signedUrlByPath.get(subcollection.cover_path) ?? null : null,
    likeCount: subcollectionLikeCounts.get(subcollection.id) ?? 0,
    likedByViewer: likedSubcollectionIds.has(subcollection.id),
    commentCount: subcollectionCommentCounts.get(subcollection.id) ?? 0,
    viewCount: subcollectionViewCounts.get(subcollection.id) ?? 0,
  }));

  const collections: PublicProfileCollectionDTO[] = (collectionsResult.data ?? []).map((collection) => {
    const collectionItems = items.filter(
      (item) => itemCollectionById.get(item.id) === collection.id,
    );

    return {
      id: collection.id,
      slug: collection.slug,
      name: collection.name,
      description: collection.description,
      coverUrl: collection.cover_path ? signedUrlByPath.get(collection.cover_path) ?? null : null,
      isFeatured: collection.is_featured,
      updatedAt: collection.updated_at,
      itemCount: collectionItems.length,
      subcollectionCount: subcollections.filter((entry) => entry.collectionId === collection.id).length,
      likeCount: collectionLikeCounts.get(collection.id) ?? 0,
      likedByViewer: likedCollectionIds.has(collection.id),
      commentCount: collectionCommentCounts.get(collection.id) ?? 0,
      viewCount: collectionViewCounts.get(collection.id) ?? 0,
      subcollections: subcollections.filter((entry) => entry.collectionId === collection.id),
      items: collectionItems,
      comments: comments.filter((comment) => comment.collectionId === collection.id),
    };
  });

  const similarityRow = similarityResult?.data?.[0];
  const percentage = Number(similarityRow?.percentage ?? 0);

  return {
    viewer: {
      isOwner,
      isFollowing: Boolean(followStateResult?.data),
    },
    profile: {
      username: profile.username,
      displayName: profile.display_name,
      bio: profile.bio,
      location: profile.location,
      website: safeWebsite(profile.website),
      avatarUrl: publicProfileUrl(supabase, profile.avatar_path),
      bannerUrl: publicProfileUrl(supabase, profile.banner_path),
      isVerified: profile.is_verified,
    },
    stats: {
      followersCount: followersResult.count ?? 0,
      followingCount: followingResult.count ?? 0,
      collectionCount: collections.length,
      itemCount: items.length,
    },
    similarity: canCalculateSimilarity
      ? {
          percentage: Number.isFinite(percentage) ? Math.max(0, Math.min(100, percentage)) : 0,
          sharedCount: Number(similarityRow?.shared_count ?? 0),
          sharedTags: (similarityRow?.shared_tags ?? []).filter((tag): tag is string => typeof tag === "string").slice(0, 5),
        }
      : null,
    collections,
  };
}

export async function getPublicCollection(rawUsername: string, rawSlug: string) {
  const profile = await getPublicProfile(rawUsername);
  if (!profile) return null;

  const slug = rawSlug.trim().toLocaleLowerCase();
  const collection = profile.collections.find((entry) => entry.slug === slug);
  return collection ? { profile, collection } : null;
}
