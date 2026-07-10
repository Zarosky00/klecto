export type Visibility = "public" | "followers" | "private";
export type ItemMood = "grail" | "memory" | "favorite" | "regret" | "neutral";

export type ViewerDTO = {
  id: string;
  email: string | null;
  username: string;
  displayName: string;
  bio: string | null;
  location: string | null;
  website: string | null;
  avatarPath: string | null;
  avatarUrl: string | null;
  bannerPath: string | null;
  bannerUrl: string | null;
  accountVisibility: Visibility;
  allowMessagesFrom: "everyone" | "followers" | "matches" | "nobody";
  showSimilarity: boolean;
  isVerified: boolean;
  followersCount: number;
  followingCount: number;
  collectionCount: number;
  itemCount: number;
};

export type TemplateDTO = {
  id: string;
  slug: string;
  name: string;
  icon: string;
  description: string | null;
};

export type SubcollectionDTO = {
  id: string;
  collectionId: string;
  name: string;
  slug: string;
  description: string | null;
  kind: "brand" | "series" | "era" | "custom";
  visibility: Visibility | null;
  position: number;
};

export type ItemDTO = {
  id: string;
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
  imageUrl: string | null;
  imageCount: number;
  createdAt: string;
};

export type CollectionDTO = {
  id: string;
  templateId: string | null;
  name: string;
  slug: string;
  description: string | null;
  coverPath: string | null;
  coverUrl: string | null;
  visibility: Visibility;
  isFeatured: boolean;
  updatedAt: string;
  subcollections: SubcollectionDTO[];
  items: ItemDTO[];
};

export type CatalogDashboardDTO = {
  viewer: ViewerDTO | null;
  templates: TemplateDTO[];
  collections: CollectionDTO[];
};

export type ActionResult = {
  ok: boolean;
  id?: string;
  error?: string;
};
