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
  coverPath: string | null;
  coverUrl: string | null;
  visibility: Visibility | null;
  position: number;
  likeCount: number;
  likedByViewer: boolean;
  commentCount: number;
  viewCount: number;
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
  tags: string[];
  mood: ItemMood;
  isFavorite: boolean;
  visibility: Visibility | null;
  imageUrl: string | null;
  imageUrls: string[];
  imageCount: number;
  likeCount: number;
  likedByViewer: boolean;
  commentCount: number;
  viewCount: number;
  createdAt: string;
};

export type CatalogCommentDTO = {
  id: string;
  collectionId: string | null;
  itemId: string | null;
  subcollectionId: string | null;
  authorId: string;
  body: string;
  createdAt: string;
  isOwn: boolean;
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
  likeCount: number;
  likedByViewer: boolean;
  commentCount: number;
  viewCount: number;
  subcollections: SubcollectionDTO[];
  items: ItemDTO[];
  comments: CatalogCommentDTO[];
};

export type CatalogDashboardDTO = {
  viewer: ViewerDTO | null;
  templates: TemplateDTO[];
  collections: CollectionDTO[];
};

/**
 * Deliberately small, public-facing shapes used by /u/[username].
 * These never include account controls, email addresses, raw storage paths,
 * or any private catalog values.
 */
export type PublicProfileItemDTO = {
  id: string;
  collectionId: string;
  subcollectionId: string | null;
  title: string;
  description: string | null;
  brand: string | null;
  model: string | null;
  year: number | null;
  condition: string | null;
  tags: string[];
  mood: ItemMood;
  isFavorite: boolean;
  imageUrls: string[];
  imageCount: number;
  likeCount: number;
  likedByViewer: boolean;
  commentCount: number;
  viewCount: number;
};

export type PublicProfileSubcollectionDTO = {
  id: string;
  collectionId: string;
  slug: string;
  name: string;
  description: string | null;
  kind: "brand" | "series" | "era" | "custom";
  coverUrl: string | null;
  likeCount: number;
  likedByViewer: boolean;
  commentCount: number;
  viewCount: number;
};

export type PublicProfileCollectionDTO = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  coverUrl: string | null;
  isFeatured: boolean;
  updatedAt: string;
  itemCount: number;
  subcollectionCount: number;
  likeCount: number;
  likedByViewer: boolean;
  commentCount: number;
  viewCount: number;
  subcollections: PublicProfileSubcollectionDTO[];
  items: PublicProfileItemDTO[];
  comments: CatalogCommentDTO[];
};

export type PublicProfileDTO = {
  viewer: {
    isOwner: boolean;
    isFollowing: boolean;
  };
  profile: {
    username: string;
    displayName: string;
    bio: string | null;
    location: string | null;
    website: string | null;
    avatarUrl: string | null;
    bannerUrl: string | null;
    isVerified: boolean;
  };
  stats: {
    followersCount: number;
    followingCount: number;
    collectionCount: number;
    itemCount: number;
  };
  similarity: {
    percentage: number;
    sharedCount: number;
    sharedTags: string[];
  } | null;
  collections: PublicProfileCollectionDTO[];
};

export type ActionResult = {
  ok: boolean;
  id?: string;
  created?: boolean;
  error?: string;
};
