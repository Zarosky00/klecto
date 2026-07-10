import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getCurrentIdentity } from "@/data/auth";
import type {
  CatalogDashboardDTO,
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
      .select("id, collection_id, name, slug, description, kind, visibility, position")
      .eq("user_id", identity.id)
      .order("position"),
    supabase
      .from("items")
      .select("id, collection_id, subcollection_id, title, description, brand, model, year, condition, mood, is_favorite, visibility, created_at, item_media(storage_path, position)")
      .eq("user_id", identity.id)
      .order("created_at", { ascending: false }),
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
  const signedPaths = [...new Set([...mediaPaths, ...coverPaths])];
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

  const subcollections: SubcollectionDTO[] = (subcollectionsResult.data ?? []).map((entry) => ({
    id: entry.id,
    collectionId: entry.collection_id,
    name: entry.name,
    slug: entry.slug,
    description: entry.description,
    kind: entry.kind as SubcollectionDTO["kind"],
    visibility: entry.visibility,
    position: entry.position,
  }));

  const items: ItemDTO[] = (itemsResult.data ?? []).map((item) => {
    const orderedMedia = [...(item.item_media ?? [])].sort((a, b) => a.position - b.position);
    const firstPath = orderedMedia[0]?.storage_path ?? null;
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
      mood: item.mood,
      isFavorite: item.is_favorite,
      visibility: item.visibility,
      imageUrl: firstPath ? signedUrlByPath.get(firstPath) ?? null : null,
      imageCount: orderedMedia.length,
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
    subcollections: subcollections.filter((entry) => entry.collectionId === collection.id),
    items: items.filter((item) => item.collectionId === collection.id),
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
