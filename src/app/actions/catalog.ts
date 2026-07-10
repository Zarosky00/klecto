"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  createCollectionMutation,
  createItemMutation,
  createSubcollectionMutation,
  deleteCollectionMutation,
  deleteItemMutation,
  deleteSubcollectionMutation,
  updateCollectionMutation,
  updateItemMutation,
  updateProfileMutation,
} from "@/data/catalog-mutations";
import type { ActionResult } from "@/lib/catalog-types";

const nullableText = (max: number) => z.string().trim().max(max).nullable();
const visibility = z.enum(["public", "followers", "private"]);

const profileSchema = z.object({
  username: z.string().trim().toLowerCase().regex(/^[a-z0-9_]{3,24}$/),
  displayName: z.string().trim().min(1).max(60),
  bio: nullableText(240),
  location: nullableText(100),
  website: z.union([z.url().max(300), z.literal(""), z.null()]).transform((value) => value || null),
  avatarPath: nullableText(500),
  bannerPath: nullableText(500),
  accountVisibility: visibility,
  allowMessagesFrom: z.enum(["everyone", "followers", "matches", "nobody"]),
  showSimilarity: z.boolean(),
});

const collectionSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(80),
  description: nullableText(1000),
  templateId: z.string().uuid().nullable(),
  visibility,
});

const subcollectionSchema = z.object({
  collectionId: z.string().uuid(),
  name: z.string().trim().min(1).max(80),
  description: nullableText(600),
  kind: z.enum(["brand", "series", "era", "custom"]),
  visibility: visibility.nullable(),
});

const itemSchema = z.object({
  id: z.string().uuid().optional(),
  collectionId: z.string().uuid(),
  subcollectionId: z.string().uuid().nullable(),
  title: z.string().trim().min(1).max(140),
  description: nullableText(4000),
  brand: nullableText(100),
  model: nullableText(120),
  year: z.number().int().min(1000).max(2200).nullable(),
  condition: nullableText(80),
  mood: z.enum(["grail", "memory", "favorite", "regret", "neutral"]),
  isFavorite: z.boolean(),
  visibility: visibility.nullable(),
  mediaPaths: z.array(z.string().min(3).max(500)).max(8),
});

const createItemSchema = itemSchema.extend({
  mediaPaths: z.array(z.string().min(3).max(500)).min(1).max(8),
});

function invalid(error: z.ZodError): ActionResult {
  return { ok: false, error: error.issues[0]?.message ?? "Check the form and try again." };
}

function refreshCatalog() {
  revalidatePath("/");
  revalidatePath("/settings/profile");
  revalidatePath("/collections", "layout");
}

export async function updateProfileAction(input: unknown): Promise<ActionResult> {
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const result = await updateProfileMutation(parsed.data);
  if (result.ok) refreshCatalog();
  return result;
}

export async function createCollectionAction(input: unknown): Promise<ActionResult> {
  const parsed = collectionSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const result = await createCollectionMutation(parsed.data);
  if (result.ok) refreshCatalog();
  return result;
}

export async function updateCollectionAction(input: unknown): Promise<ActionResult> {
  const parsed = collectionSchema.required({ id: true }).safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const result = await updateCollectionMutation(parsed.data);
  if (result.ok) refreshCatalog();
  return result;
}

export async function deleteCollectionAction(id: unknown): Promise<ActionResult> {
  const parsed = z.string().uuid().safeParse(id);
  if (!parsed.success) return invalid(parsed.error);
  const result = await deleteCollectionMutation(parsed.data);
  if (result.ok) refreshCatalog();
  return result;
}

export async function createSubcollectionAction(input: unknown): Promise<ActionResult> {
  const parsed = subcollectionSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const result = await createSubcollectionMutation(parsed.data);
  if (result.ok) refreshCatalog();
  return result;
}

export async function deleteSubcollectionAction(id: unknown): Promise<ActionResult> {
  const parsed = z.string().uuid().safeParse(id);
  if (!parsed.success) return invalid(parsed.error);
  const result = await deleteSubcollectionMutation(parsed.data);
  if (result.ok) refreshCatalog();
  return result;
}

export async function createItemAction(input: unknown): Promise<ActionResult> {
  const parsed = createItemSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const result = await createItemMutation(parsed.data);
  if (result.ok) refreshCatalog();
  return result;
}

export async function updateItemAction(input: unknown): Promise<ActionResult> {
  const parsed = itemSchema.required({ id: true }).safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const result = await updateItemMutation(parsed.data);
  if (result.ok) refreshCatalog();
  return result;
}

export async function deleteItemAction(id: unknown): Promise<ActionResult> {
  const parsed = z.string().uuid().safeParse(id);
  if (!parsed.success) return invalid(parsed.error);
  const result = await deleteItemMutation(parsed.data);
  if (result.ok) refreshCatalog();
  return result;
}
