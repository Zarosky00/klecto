import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getCurrentIdentity } from "@/data/auth";
import type { ActionResult, ItemMood, Visibility } from "@/lib/catalog-types";

export type ProfileMutationInput = {
  username: string;
  displayName: string;
  bio: string | null;
  location: string | null;
  website: string | null;
  avatarPath: string | null;
  bannerPath: string | null;
  accountVisibility: Visibility;
  allowMessagesFrom: "everyone" | "followers" | "matches" | "nobody";
  showSimilarity: boolean;
};

export type CollectionMutationInput = {
  id?: string;
  name: string;
  description: string | null;
  templateId: string | null;
  visibility: Visibility;
  /** Undefined means "leave the current cover alone"; null removes it. */
  coverPath?: string | null;
};

export type CollectionPostMutationInput = {
  collectionId: string;
  body: string | null;
  visibility: Visibility;
};

export type CollectionShareMutationInput = {
  collectionId: string;
  channel: "copy_link" | "external";
};

export type SubcollectionMutationInput = {
  id?: string;
  collectionId: string;
  name: string;
  description: string | null;
  kind: "brand" | "series" | "era" | "custom";
  visibility: Visibility | null;
  /** Undefined means "leave the current cover alone"; null removes it. */
  coverPath?: string | null;
};

export type CatalogReactionMutationInput = {
  targetId: string;
  active: boolean;
};

export type CatalogCommentMutationInput = {
  itemId: string | null;
  subcollectionId: string | null;
  body: string;
};

export type ItemMutationInput = {
  id?: string;
  collectionId: string;
  subcollectionId: string | null;
  title: string;
  description: string | null;
  brand: string | null;
  model: string | null;
  year: number | null;
  condition: string | null;
  mood: ItemMood;
  isFavorite: boolean;
  visibility: Visibility | null;
  mediaPaths: string[];
};

export type ItemMediaAppendMutationInput = {
  itemId: string;
  collectionId: string;
  mediaPaths: string[];
};

function slugify(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 72) || "collection";
}

async function authenticatedClient() {
  const identity = await getCurrentIdentity();
  if (!identity) return null;
  return { identity, supabase: await createClient() };
}

function ownsStoragePath(userId: string, path: string) {
  return path.startsWith(`${userId}/`) && !path.includes("..") && path.length <= 500;
}

function ownsItemUploadPath(userId: string, path: string) {
  return path.startsWith(`${userId}/items/`) && ownsStoragePath(userId, path);
}

function ownsCollectionCoverPath(userId: string, path: string) {
  return path.startsWith(`${userId}/collections/`) && ownsStoragePath(userId, path);
}

function ownsSubcollectionCoverPath(userId: string, collectionId: string, subcollectionId: string, path: string) {
  return path.startsWith(`${userId}/collections/${collectionId}/subcollections/${subcollectionId}/`) && ownsStoragePath(userId, path);
}

export async function updateProfileMutation(input: ProfileMutationInput): Promise<ActionResult> {
  const context = await authenticatedClient();
  if (!context) return { ok: false, error: "Sign in to update your profile." };

  if (
    (input.avatarPath && !ownsStoragePath(context.identity.id, input.avatarPath)) ||
    (input.bannerPath && !ownsStoragePath(context.identity.id, input.bannerPath))
  ) {
    return { ok: false, error: "That profile media path is not yours." };
  }

  const { error } = await context.supabase
    .from("profiles")
    .update({
      username: input.username,
      display_name: input.displayName,
      bio: input.bio,
      location: input.location,
      website: input.website,
      avatar_path: input.avatarPath,
      banner_path: input.bannerPath,
      account_visibility: input.accountVisibility,
      allow_messages_from: input.allowMessagesFrom,
      show_similarity: input.showSimilarity,
      updated_at: new Date().toISOString(),
    })
    .eq("id", context.identity.id);

  if (error) {
    console.error("Profile update failed", error);
    return { ok: false, error: error.code === "23505" ? "That username is already taken." : "Could not update your profile." };
  }
  return { ok: true, id: context.identity.id };
}

export async function createCollectionMutation(input: CollectionMutationInput): Promise<ActionResult> {
  const context = await authenticatedClient();
  if (!context) return { ok: false, error: "Sign in to create a collection." };

  const baseSlug = slugify(input.name);
  const { data: existing } = await context.supabase
    .from("collections")
    .select("slug")
    .eq("user_id", context.identity.id)
    .like("slug", `${baseSlug}%`);
  const slugs = new Set((existing ?? []).map((entry) => entry.slug));
  const slug = slugs.has(baseSlug) ? `${baseSlug}-${crypto.randomUUID().slice(0, 6)}` : baseSlug;

  const { data, error } = await context.supabase
    .from("collections")
    .insert({
      user_id: context.identity.id,
      template_id: input.templateId,
      name: input.name,
      slug,
      description: input.description,
      visibility: input.visibility,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Collection creation failed", error);
    return { ok: false, error: "Could not create the collection." };
  }
  return { ok: true, id: data.id };
}

export async function updateCollectionMutation(input: CollectionMutationInput & { id: string }): Promise<ActionResult> {
  const context = await authenticatedClient();
  if (!context) return { ok: false, error: "Sign in to edit a collection." };

  if (input.coverPath && !ownsCollectionCoverPath(context.identity.id, input.coverPath)) {
    return { ok: false, error: "That collection cover does not belong to your account." };
  }

  const updates: {
    name: string;
    description: string | null;
    template_id: string | null;
    visibility: Visibility;
    cover_path?: string | null;
  } = {
    name: input.name,
    description: input.description,
    template_id: input.templateId,
    visibility: input.visibility,
  };

  if (input.coverPath !== undefined) updates.cover_path = input.coverPath;

  const { data, error } = await context.supabase
    .from("collections")
    .update(updates)
    .eq("id", input.id)
    .eq("user_id", context.identity.id)
    .select("id")
    .maybeSingle();

  if (error || !data) return { ok: false, error: "Collection not found or not editable." };
  return { ok: true, id: data.id };
}

export async function createCollectionPostMutation(input: CollectionPostMutationInput): Promise<ActionResult> {
  const context = await authenticatedClient();
  if (!context) return { ok: false, error: "Sign in to post a collection." };

  const { data: collection } = await context.supabase
    .from("collections")
    .select("id, name")
    .eq("id", input.collectionId)
    .eq("user_id", context.identity.id)
    .maybeSingle();

  if (!collection) return { ok: false, error: "Collection not found or not editable." };

  const body = input.body?.trim() || `A closer look at ${collection.name}.`;
  const { data, error } = await context.supabase
    .from("posts")
    .insert({
      author_id: context.identity.id,
      kind: "post",
      body,
      collection_id: collection.id,
      visibility: input.visibility,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Collection post failed", error);
    return { ok: false, error: "Could not publish the collection post." };
  }
  return { ok: true, id: data.id };
}

export async function recordCollectionShareMutation(input: CollectionShareMutationInput): Promise<ActionResult> {
  const context = await authenticatedClient();
  if (!context) return { ok: false, error: "Sign in to share a collection." };

  const { data: collection } = await context.supabase
    .from("collections")
    .select("id")
    .eq("id", input.collectionId)
    .eq("user_id", context.identity.id)
    .maybeSingle();

  if (!collection) return { ok: false, error: "Collection not found or not editable." };

  const { error } = await context.supabase.from("share_events").insert({
    user_id: context.identity.id,
    collection_id: collection.id,
    channel: input.channel,
  });

  if (error) {
    console.error("Collection share record failed", error);
    return { ok: false, error: "The link was created, but the share could not be recorded." };
  }
  return { ok: true, id: collection.id };
}

export async function deleteCollectionMutation(collectionId: string): Promise<ActionResult> {
  const context = await authenticatedClient();
  if (!context) return { ok: false, error: "Sign in to delete a collection." };

  const { data: collection } = await context.supabase
    .from("collections")
    .select("id, cover_path")
    .eq("id", collectionId)
    .eq("user_id", context.identity.id)
    .maybeSingle();
  if (!collection) return { ok: false, error: "Collection not found." };

  const { data: items } = await context.supabase
    .from("items")
    .select("id")
    .eq("collection_id", collectionId)
    .eq("user_id", context.identity.id);
  const itemIds = (items ?? []).map((item) => item.id);
  const media = itemIds.length
    ? await context.supabase.from("item_media").select("storage_path").in("item_id", itemIds)
    : { data: [] as { storage_path: string }[] };
  const paths = [collection.cover_path, ...(media.data ?? []).map((entry) => entry.storage_path)].filter(
    (path): path is string => Boolean(path),
  );

  if (paths.length) {
    const { error: storageError } = await context.supabase.storage.from("collection-media").remove(paths);
    if (storageError) return { ok: false, error: "Could not remove the collection media." };
  }

  const { error } = await context.supabase
    .from("collections")
    .delete()
    .eq("id", collectionId)
    .eq("user_id", context.identity.id);
  if (error) return { ok: false, error: "Could not delete the collection." };
  return { ok: true, id: collectionId };
}

export async function createSubcollectionMutation(input: SubcollectionMutationInput): Promise<ActionResult> {
  const context = await authenticatedClient();
  if (!context) return { ok: false, error: "Sign in to add a subcollection." };

  const { data: parent } = await context.supabase
    .from("collections")
    .select("id")
    .eq("id", input.collectionId)
    .eq("user_id", context.identity.id)
    .maybeSingle();
  if (!parent) return { ok: false, error: "Collection not found." };

  const baseSlug = slugify(input.name);
  const { data: existing } = await context.supabase
    .from("subcollections")
    .select("slug")
    .eq("collection_id", input.collectionId)
    .like("slug", `${baseSlug}%`);
  const slugs = new Set((existing ?? []).map((entry) => entry.slug));
  const slug = slugs.has(baseSlug) ? `${baseSlug}-${crypto.randomUUID().slice(0, 6)}` : baseSlug;

  const { data: lastSubcollection } = await context.supabase
    .from("subcollections")
    .select("position")
    .eq("collection_id", input.collectionId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await context.supabase
    .from("subcollections")
    .insert({
      collection_id: input.collectionId,
      user_id: context.identity.id,
      name: input.name,
      slug,
      description: input.description,
      kind: input.kind,
      visibility: input.visibility,
      position: (lastSubcollection?.position ?? -1) + 1,
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: "Could not create the subcollection." };
  return { ok: true, id: data.id };
}

export async function deleteSubcollectionMutation(subcollectionId: string): Promise<ActionResult> {
  const context = await authenticatedClient();
  if (!context) return { ok: false, error: "Sign in to edit subcollections." };

  const { data: subcollection } = await context.supabase
    .from("subcollections")
    .select("id, cover_path")
    .eq("id", subcollectionId)
    .eq("user_id", context.identity.id)
    .maybeSingle();
  if (!subcollection) return { ok: false, error: "Subcollection not found." };

  if (subcollection.cover_path) {
    const { error: storageError } = await context.supabase.storage.from("collection-media").remove([subcollection.cover_path]);
    if (storageError) return { ok: false, error: "Could not remove the subcollection cover." };
  }

  const { error } = await context.supabase
    .from("subcollections")
    .delete()
    .eq("id", subcollectionId)
    .eq("user_id", context.identity.id);
  if (error) return { ok: false, error: "Could not delete the subcollection." };
  return { ok: true, id: subcollectionId };
}

export async function updateSubcollectionMutation(input: SubcollectionMutationInput & { id: string }): Promise<ActionResult> {
  const context = await authenticatedClient();
  if (!context) return { ok: false, error: "Sign in to edit a subcollection." };

  if (input.coverPath && !ownsSubcollectionCoverPath(context.identity.id, input.collectionId, input.id, input.coverPath)) {
    return { ok: false, error: "That subcollection cover does not belong to your account." };
  }

  const updates: {
    name: string;
    description: string | null;
    kind: "brand" | "series" | "era" | "custom";
    visibility: Visibility | null;
    cover_path?: string | null;
  } = {
    name: input.name,
    description: input.description,
    kind: input.kind,
    visibility: input.visibility,
  };
  if (input.coverPath !== undefined) updates.cover_path = input.coverPath;

  const { data, error } = await context.supabase
    .from("subcollections")
    .update(updates)
    .eq("id", input.id)
    .eq("collection_id", input.collectionId)
    .eq("user_id", context.identity.id)
    .select("id")
    .maybeSingle();
  if (error || !data) return { ok: false, error: "Subcollection not found or not editable." };
  return { ok: true, id: data.id };
}

export async function setItemLikeMutation(input: CatalogReactionMutationInput): Promise<ActionResult> {
  const context = await authenticatedClient();
  if (!context) return { ok: false, error: "Sign in to like an item." };

  const query = input.active
    ? context.supabase.from("item_likes").upsert({ item_id: input.targetId, user_id: context.identity.id }, { onConflict: "item_id,user_id", ignoreDuplicates: true })
    : context.supabase.from("item_likes").delete().eq("item_id", input.targetId).eq("user_id", context.identity.id);
  const { error } = await query;
  if (error) return { ok: false, error: "Could not update the item like." };
  return { ok: true, id: input.targetId };
}

export async function setSubcollectionLikeMutation(input: CatalogReactionMutationInput): Promise<ActionResult> {
  const context = await authenticatedClient();
  if (!context) return { ok: false, error: "Sign in to like a subcollection." };

  const query = input.active
    ? context.supabase.from("subcollection_likes").upsert({ subcollection_id: input.targetId, user_id: context.identity.id }, { onConflict: "subcollection_id,user_id", ignoreDuplicates: true })
    : context.supabase.from("subcollection_likes").delete().eq("subcollection_id", input.targetId).eq("user_id", context.identity.id);
  const { error } = await query;
  if (error) return { ok: false, error: "Could not update the subcollection like." };
  return { ok: true, id: input.targetId };
}

export async function createCatalogCommentMutation(input: CatalogCommentMutationInput): Promise<ActionResult> {
  const context = await authenticatedClient();
  if (!context) return { ok: false, error: "Sign in to add a comment." };

  const { data, error } = await context.supabase
    .from("catalog_comments")
    .insert({
      author_id: context.identity.id,
      item_id: input.itemId,
      subcollection_id: input.subcollectionId,
      body: input.body,
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: "Could not add the comment." };
  return { ok: true, id: data.id };
}

export async function createItemMutation(input: ItemMutationInput): Promise<ActionResult> {
  const context = await authenticatedClient();
  if (!context) return { ok: false, error: "Sign in to add an item." };
  if (input.mediaPaths.some((path) => !ownsItemUploadPath(context.identity.id, path))) {
    return { ok: false, error: "One or more media paths are invalid." };
  }

  const { data: referencedMedia } = await context.supabase
    .from("item_media")
    .select("storage_path")
    .in("storage_path", input.mediaPaths);
  if (referencedMedia?.length) {
    return { ok: false, error: "One or more media files are already attached to an item." };
  }

  const removePendingMedia = async () => {
    if (input.mediaPaths.length) {
      await context.supabase.storage.from("collection-media").remove(input.mediaPaths);
    }
  };

  const { data: parent } = await context.supabase
    .from("collections")
    .select("id")
    .eq("id", input.collectionId)
    .eq("user_id", context.identity.id)
    .maybeSingle();
  if (!parent) return { ok: false, error: "Collection not found." };

  if (input.subcollectionId) {
    const { data: subcollection } = await context.supabase
      .from("subcollections")
      .select("id")
      .eq("id", input.subcollectionId)
      .eq("collection_id", input.collectionId)
      .eq("user_id", context.identity.id)
      .maybeSingle();
    if (!subcollection) return { ok: false, error: "Subcollection does not belong to this collection." };
  }

  const { data: item, error } = await context.supabase
    .from("items")
    .insert({
      user_id: context.identity.id,
      collection_id: input.collectionId,
      subcollection_id: input.subcollectionId,
      title: input.title,
      description: input.description,
      brand: input.brand,
      model: input.model,
      year: input.year,
      condition: input.condition,
      mood: input.mood,
      is_favorite: input.isFavorite,
      visibility: input.visibility,
    })
    .select("id")
    .single();
  if (error) {
    await removePendingMedia();
    return { ok: false, error: "Could not create the item." };
  }

  if (input.mediaPaths.length) {
    const { error: mediaError } = await context.supabase.from("item_media").insert(
      input.mediaPaths.map((storagePath, position) => ({
        item_id: item.id,
        user_id: context.identity.id,
        storage_path: storagePath,
        position,
      })),
    );
    if (mediaError) {
      await context.supabase.from("items").delete().eq("id", item.id).eq("user_id", context.identity.id);
      await removePendingMedia();
      return { ok: false, error: "The item media could not be attached." };
    }
  }
  return { ok: true, id: item.id };
}

export async function updateItemMutation(input: ItemMutationInput & { id: string }): Promise<ActionResult> {
  const context = await authenticatedClient();
  if (!context) return { ok: false, error: "Sign in to edit an item." };
  const { data, error } = await context.supabase
    .from("items")
    .update({
      subcollection_id: input.subcollectionId,
      title: input.title,
      description: input.description,
      brand: input.brand,
      model: input.model,
      year: input.year,
      condition: input.condition,
      mood: input.mood,
      is_favorite: input.isFavorite,
      visibility: input.visibility,
    })
    .eq("id", input.id)
    .eq("collection_id", input.collectionId)
    .eq("user_id", context.identity.id)
    .select("id")
    .maybeSingle();
  if (error || !data) return { ok: false, error: "Item not found or not editable." };
  return { ok: true, id: data.id };
}

export async function appendItemMediaMutation(input: ItemMediaAppendMutationInput): Promise<ActionResult> {
  const context = await authenticatedClient();
  if (!context) return { ok: false, error: "Sign in to add item photos." };
  if (input.mediaPaths.length === 0 || input.mediaPaths.some((path) => !ownsItemUploadPath(context.identity.id, path))) {
    return { ok: false, error: "One or more item photos are invalid." };
  }

  const { data: item } = await context.supabase
    .from("items")
    .select("id")
    .eq("id", input.itemId)
    .eq("collection_id", input.collectionId)
    .eq("user_id", context.identity.id)
    .maybeSingle();
  if (!item) return { ok: false, error: "Item not found or not editable." };

  const { data: existingMedia } = await context.supabase
    .from("item_media")
    .select("storage_path, position")
    .eq("item_id", input.itemId)
    .order("position", { ascending: false });
  if ((existingMedia?.length ?? 0) + input.mediaPaths.length > 8) {
    return { ok: false, error: "An item can have up to eight photos." };
  }
  const nextPosition = (existingMedia?.[0]?.position ?? -1) + 1;

  const { data: referencedMedia } = await context.supabase
    .from("item_media")
    .select("storage_path")
    .in("storage_path", input.mediaPaths);
  if (referencedMedia?.length) return { ok: false, error: "One or more photos are already attached to an item." };

  const { error } = await context.supabase.from("item_media").insert(
    input.mediaPaths.map((storagePath, index) => ({
      item_id: input.itemId,
      user_id: context.identity.id,
      storage_path: storagePath,
      position: nextPosition + index,
    })),
  );
  if (error) return { ok: false, error: "Could not attach the new item photos." };
  return { ok: true, id: input.itemId };
}

export async function deleteItemMutation(itemId: string): Promise<ActionResult> {
  const context = await authenticatedClient();
  if (!context) return { ok: false, error: "Sign in to delete an item." };

  const { data: item } = await context.supabase
    .from("items")
    .select("id, item_media(storage_path)")
    .eq("id", itemId)
    .eq("user_id", context.identity.id)
    .maybeSingle();
  if (!item) return { ok: false, error: "Item not found." };

  const paths = (item.item_media ?? []).map((entry) => entry.storage_path);
  if (paths.length) {
    const { error: storageError } = await context.supabase.storage.from("collection-media").remove(paths);
    if (storageError) return { ok: false, error: "Could not remove the item media." };
  }
  const { error } = await context.supabase
    .from("items")
    .delete()
    .eq("id", itemId)
    .eq("user_id", context.identity.id);
  if (error) return { ok: false, error: "Could not delete the item." };
  return { ok: true, id: itemId };
}
