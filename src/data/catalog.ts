import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getCurrentIdentity } from "@/data/auth";
import type {
  CatalogDashboardDTO,
  CatalogCommentDTO,
  CollectionDTO,
  ItemDTO,
  SubcollectionDTO,
  TemplateDTO,
  ViewerDTO,
} from "@/lib/catalog-types";

function publicProfileUrl(
  supabase: Awaited<ReturnType<typeof createClient>>,
  path: string | null,
) {
  if (!path) return null;
  return supabase.storage.from("profile-media").getPublicUrl(path).data.publicUrl;
}

export async function getCatalogDashboard(): Promise<CatalogDashboardDTO> {
  const supabase = await createClient();
  const identity = await getCurrentIdentity();

  const templatesPromise = supabase
    .from("collection_templates")
    .select("id, slug, name, icon, description")
    .order("sort_order");

  if (!identity) {
    const { data: templates } = await templatesPromise;
    return {
      viewer: null,
      templates: (templates ?? []) as TemplateDTO[],
      collections: [],
    };
  }

  const [
    templatesResult,
    profileResult,
    collectionsResult,
    subcollectionsResult,
    itemsResult,
    collectionLikesResult,
    itemLikesResult,
    subcollectionLikesResult,
    catalogCommentsResult,
    catalogViewsResult,
    followersResult,
    followingResult,
  ] = await Promise.all([
    templatesPromise,
    supabase
      .from("profiles")
      .select("username, display_name, bio, location, website, avatar_path, banner_path, account_visibility, allow_messages_from, show_similarity, is_verified")
      .eq("id", identity.id)
      .maybeSingle(),
    supabase
      .from("collections")
      .select("id, template_id, name, slug, description, cover_path, visibility, is_featured, updated_at")
      .eq("user_id", identity.id)
      .order("updated_at", { ascending: false }),
    supabase
      .from("subcollections")
      .select("id, collection_id, name, slug, description, kind, cover_path, visibility, position")
      .eq("user_id", identity.id)
      .order("position"),
    supabase
      .from("items")
      .select("id, collection_id, subcollection_id, title, description, brand, model, year, condition, mood, is_favorite, visibility, created_at, item_media(storage_path, position), item_tags(tag)")
      .eq("user_id", identity.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("collection_likes")
      .select("collection_id, user_id"),
    supabase
      .from("item_likes")
      .select("item_id, user_id"),
    supabase
      .from("subcollection_likes")
      .select("subcollection_id, user_id"),
    supabase
      .from("catalog_comments")
      .select("id, collection_id, item_id, subcollection_id, author_id, body, created_at")
      .is("deleted_at", null)
      .order("created_at", { ascending: true }),
    supabase
      .from("catalog_views")
      .select("collection_id, subcollection_id, item_id"),
    supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("following_id", identity.id),
    supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("follower_id", identity.id),
  ]);

  if (profileResult.error) {
    console.error("Unable to load profile", profileResult.error);
  }

  const mediaPaths = (itemsResult.data ?? [])
    .flatMap((item) => item.item_media ?? [])
    .map((media) => media.storage_path);
  const coverPaths = (collectionsResult.data ?? [])
    .map((collection) => collection.cover_path)
    .filter((path): path is string => Boolean(path));
  const subcollectionCoverPaths = (subcollectionsResult.data ?? [])
    .map((subcollection) => subcollection.cover_path)
    .filter((path): path is string => Boolean(path));
  const signedPaths = [...new Set([...mediaPaths, ...coverPaths, ...subcollectionCoverPaths])];
  const signedUrlByPath = new Map<string, string>();

  if (signedPaths.length > 0) {
    const { data: signedUrls, error } = await supabase.storage
      .from("collection-media")
      .createSignedUrls(signedPaths, 60 * 60);

    if (error) console.error("Unable to sign catalog media", error);
    signedUrls?.forEach((entry) => {
      if (entry.path && entry.signedUrl) signedUrlByPath.set(entry.path, entry.signedUrl);
    });
  }

  const itemLikeCounts = new Map<string, number>();
  const likedItemIds = new Set<string>();
  (itemLikesResult.data ?? []).forEach((like) => {
    itemLikeCounts.set(like.item_id, (itemLikeCounts.get(like.item_id) ?? 0) + 1);
    if (like.user_id === identity.id) likedItemIds.add(like.item_id);
  });

  const collectionLikeCounts = new Map<string, number>();
  const likedCollectionIds = new Set<string>();
  (collectionLikesResult.data ?? []).forEach((like) => {
    collectionLikeCounts.set(like.collection_id, (collectionLikeCounts.get(like.collection_id) ?? 0) + 1);
    if (like.user_id === identity.id) likedCollectionIds.add(like.collection_id);
  });

  const subcollectionLikeCounts = new Map<string, number>();
  const likedSubcollectionIds = new Set<string>();
  (subcollectionLikesResult.data ?? []).forEach((like) => {
    subcollectionLikeCounts.set(like.subcollection_id, (subcollectionLikeCounts.get(like.subcollection_id) ?? 0) + 1);
    if (like.user_id === identity.id) likedSubcollectionIds.add(like.subcollection_id);
  });

  const comments: CatalogCommentDTO[] = (catalogCommentsResult.data ?? []).map((comment) => ({
    id: comment.id,
    collectionId: comment.collection_id,
    itemId: comment.item_id,
    subcollectionId: comment.subcollection_id,
    authorId: comment.author_id,
    body: comment.body,
    createdAt: comment.created_at,
    isOwn: comment.author_id === identity.id,
  }));
  const itemCommentCounts = new Map<string, number>();
  const subcollectionCommentCounts = new Map<string, number>();
  const collectionCommentCounts = new Map<string, number>();
  comments.forEach((comment) => {
    if (comment.collectionId) collectionCommentCounts.set(comment.collectionId, (collectionCommentCounts.get(comment.collectionId) ?? 0) + 1);
    if (comment.itemId) itemCommentCounts.set(comment.itemId, (itemCommentCounts.get(comment.itemId) ?? 0) + 1);
    if (comment.subcollectionId) subcollectionCommentCounts.set(comment.subcollectionId, (subcollectionCommentCounts.get(comment.subcollectionId) ?? 0) + 1);
  });

  const collectionViewCounts = new Map<string, number>();
  const subcollectionViewCounts = new Map<string, number>();
  const itemViewCounts = new Map<string, number>();
  (catalogViewsResult.data ?? []).forEach((view) => {
    if (view.collection_id) collectionViewCounts.set(view.collection_id, (collectionViewCounts.get(view.collection_id) ?? 0) + 1);
    if (view.subcollection_id) subcollectionViewCounts.set(view.subcollection_id, (subcollectionViewCounts.get(view.subcollection_id) ?? 0) + 1);
    if (view.item_id) itemViewCounts.set(view.item_id, (itemViewCounts.get(view.item_id) ?? 0) + 1);
  });

  const subcollections: SubcollectionDTO[] = (subcollectionsResult.data ?? []).map((entry) => ({
    id: entry.id,
    collectionId: entry.collection_id,
    name: entry.name,
    slug: entry.slug,
    description: entry.description,
    kind: entry.kind as SubcollectionDTO["kind"],
    coverPath: entry.cover_path,
    coverUrl: entry.cover_path ? signedUrlByPath.get(entry.cover_path) ?? null : null,
    visibility: entry.visibility,
    position: entry.position,
    likeCount: subcollectionLikeCounts.get(entry.id) ?? 0,
    likedByViewer: likedSubcollectionIds.has(entry.id),
    commentCount: subcollectionCommentCounts.get(entry.id) ?? 0,
    viewCount: subcollectionViewCounts.get(entry.id) ?? 0,
  }));

  const items: ItemDTO[] = (itemsResult.data ?? []).map((item) => {
    const orderedMedia = [...(item.item_media ?? [])].sort((a, b) => a.position - b.position);
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
      visibility: item.visibility,
      imageUrl: imageUrls[0] ?? null,
      imageUrls,
      imageCount: orderedMedia.length,
      likeCount: itemLikeCounts.get(item.id) ?? 0,
      likedByViewer: likedItemIds.has(item.id),
      commentCount: itemCommentCounts.get(item.id) ?? 0,
      viewCount: itemViewCounts.get(item.id) ?? 0,
      createdAt: item.created_at,
    };
  });

  const collections: CollectionDTO[] = (collectionsResult.data ?? []).map((collection) => ({
    id: collection.id,
    templateId: collection.template_id,
    name: collection.name,
    slug: collection.slug,
    description: collection.description,
    coverPath: collection.cover_path,
    coverUrl: collection.cover_path ? signedUrlByPath.get(collection.cover_path) ?? null : null,
    visibility: collection.visibility,
    isFeatured: collection.is_featured,
    updatedAt: collection.updated_at,
    likeCount: collectionLikeCounts.get(collection.id) ?? 0,
    likedByViewer: likedCollectionIds.has(collection.id),
    commentCount: collectionCommentCounts.get(collection.id) ?? 0,
    viewCount: collectionViewCounts.get(collection.id) ?? 0,
    subcollections: subcollections.filter((entry) => entry.collectionId === collection.id),
    items: items.filter((item) => item.collectionId === collection.id),
    comments: comments.filter((comment) => {
      if (comment.collectionId === collection.id) return true;
      const belongsToItem = comment.itemId ? items.some((item) => item.collectionId === collection.id && item.id === comment.itemId) : false;
      const belongsToSubcollection = comment.subcollectionId ? subcollections.some((entry) => entry.collectionId === collection.id && entry.id === comment.subcollectionId) : false;
      return belongsToItem || belongsToSubcollection;
    }),
  }));

  const profile = profileResult.data;
  const viewer: ViewerDTO | null = profile
    ? {
        id: identity.id,
        email: identity.email,
        username: profile.username,
        displayName: profile.display_name,
        bio: profile.bio,
        location: profile.location,
        website: profile.website,
        avatarPath: profile.avatar_path,
        avatarUrl: publicProfileUrl(supabase, profile.avatar_path),
        bannerPath: profile.banner_path,
        bannerUrl: publicProfileUrl(supabase, profile.banner_path),
        accountVisibility: profile.account_visibility,
        allowMessagesFrom: profile.allow_messages_from as ViewerDTO["allowMessagesFrom"],
        showSimilarity: profile.show_similarity,
        isVerified: profile.is_verified,
        followersCount: followersResult.count ?? 0,
        followingCount: followingResult.count ?? 0,
        collectionCount: collections.length,
        itemCount: items.length,
      }
    : null;

  return {
    viewer,
    templates: (templatesResult.data ?? []) as TemplateDTO[],
    collections,
  };
}

export async function getOwnedCollection(collectionId: string) {
  const dashboard = await getCatalogDashboard();
  if (!dashboard.viewer) return null;
  return {
    viewer: dashboard.viewer,
    templates: dashboard.templates,
    collection: dashboard.collections.find((entry) => entry.id === collectionId) ?? null,
  };
}
