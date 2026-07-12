/* eslint-disable @next/next/no-img-element */
"use client";

import { AnimatePresence, motion } from "motion/react";
import {
  Bell,
  Ban,
  Bookmark,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Ellipsis,
  Eye,
  Flag,
  FolderOpen,
  Heart,
  Image as ImageIcon,
  Layers3,
  MessageCircle,
  PackageOpen,
  Plus,
  Repeat2,
  Search,
  Send,
  Share2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  X,
  UserPlus,
  VolumeX,
  Link2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import {
  createCatalogCommentAction,
  createWishlistPostAction,
  setCollectionLikeAction,
  setItemLikeAction,
  setSubcollectionLikeAction,
} from "@/app/actions/catalog";
import type { DiscoveryAuthorDTO, DiscoveryCommentDTO, DiscoveryFeedDTO, DiscoveryFeedEntryDTO, ViewerDTO } from "@/lib/catalog-types";
import styles from "./discovery-home.module.css";

type ViewerDiscovery = {
  id: string;
  title: string;
  eyebrow: string;
  imageUrl: string;
  imageUrls?: string[];
  description?: string | null;
  tags?: string[];
  targetKind?: DiscoveryFeedEntryDTO["targetKind"];
  targetId?: string;
  likeCount?: number;
  likedByViewer?: boolean;
  commentCount?: number;
  wishlistCount?: number;
  viewCount?: number;
  comments?: DiscoveryFeedEntryDTO["comments"];
  current?: boolean;
  subcollectionId?: string | null;
  subcollectionSlug?: string | null;
  subcollectionName?: string | null;
};

const demoViewerDiscoveries: ViewerDiscovery[] = [
  { id: "demo-arcade", title: "After-school arcade", eyebrow: "The toy box", subcollectionSlug: "toy-box", subcollectionName: "The toy box", imageUrl: "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=900&q=82" },
  { id: "demo-bricks", title: "The brick drawer", eyebrow: "Building sets", subcollectionSlug: "toy-box", subcollectionName: "The toy box", imageUrl: "https://images.unsplash.com/photo-1594736797933-d0501ba2fe65?auto=format&fit=crop&w=900&q=82" },
  { id: "demo-console", title: "First home console", eyebrow: "Weekend games", subcollectionSlug: "toy-box", subcollectionName: "The toy box", imageUrl: "https://images.unsplash.com/photo-1486401899868-0e435ed85128?auto=format&fit=crop&w=900&q=82" },
  { id: "demo-camera", title: "Pocket camera", eyebrow: "Weekend cameras", imageUrl: "https://images.unsplash.com/photo-1502982720700-bfff97f2ecac?auto=format&fit=crop&w=900&q=82" },
  { id: "demo-tickets", title: "Tickets worth keeping", eyebrow: "Paper trail", subcollectionSlug: "paper-trail", subcollectionName: "Paper trail", imageUrl: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=900&q=82" },
  { id: "demo-postcards", title: "Postcards from home", eyebrow: "Paper trail", subcollectionSlug: "paper-trail", subcollectionName: "Paper trail", imageUrl: "https://images.unsplash.com/photo-1524348881814-1103f883e71c?auto=format&fit=crop&w=900&q=82" },
];

type DiscoveryFilter = "all" | "collection" | "subcollection" | "item" | "wishlist";

const filterLabels: { id: DiscoveryFilter; label: string }[] = [
  { id: "all", label: "Everything" },
  { id: "collection", label: "Collections" },
  { id: "subcollection", label: "Sections" },
  { id: "item", label: "Items" },
  { id: "wishlist", label: "Wishlists" },
];

const kindLabels = {
  collection: "Collection",
  subcollection: "Subcollection",
  item: "Item",
  wishlist: "Wishlist",
} as const;

function KindIcon({ kind, size = 15 }: { kind: DiscoveryFeedEntryDTO["kind"]; size?: number }) {
  if (kind === "item") return <PackageOpen size={size} />;
  if (kind === "wishlist") return <Repeat2 size={size} />;
  return <Layers3 size={size} />;
}

function entrySource(entry: DiscoveryFeedEntryDTO) {
  if (entry.targetKind === "collection") return entry.collection.name;
  if (entry.targetKind === "subcollection") return `${entry.subcollection?.name ?? "Section"} / ${entry.collection.name}`;
  return `${entry.subcollection?.name ?? "Unsorted"} / ${entry.collection.name}`;
}

function relativeTime(value: string) {
  const difference = Math.max(0, Date.now() - new Date(value).getTime());
  const minutes = Math.floor(difference / 60_000);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(difference / 3_600_000);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days < 7 ? `${days}d ago` : new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(value));
}

function updateEntry(entries: DiscoveryFeedEntryDTO[], id: string, recipe: (entry: DiscoveryFeedEntryDTO) => DiscoveryFeedEntryDTO) {
  return entries.map((entry) => entry.id === id ? recipe(entry) : entry);
}

export function DiscoveryHome({ feed, viewer, initialPostId }: { feed: DiscoveryFeedDTO; viewer: ViewerDTO | null; initialPostId?: string }) {
  const router = useRouter();
  const [filter, setFilter] = useState<DiscoveryFilter>("all");
  const [entries, setEntries] = useState(feed.entries);
  const [commentTarget, setCommentTarget] = useState<DiscoveryFeedEntryDTO | null>(null);
  const [commentOverMedia, setCommentOverMedia] = useState(false);
  const [wishlistTarget, setWishlistTarget] = useState<DiscoveryFeedEntryDTO | null>(null);
  const [wishlistOverMedia, setWishlistOverMedia] = useState(false);
  const [mediaTarget, setMediaTarget] = useState<DiscoveryFeedEntryDTO | null>(null);
  const [postTarget, setPostTarget] = useState<DiscoveryFeedEntryDTO | null>(() => feed.entries.find((entry) => entry.id === initialPostId) ?? null);
  const [wishlisterTarget, setWishlisterTarget] = useState<DiscoveryFeedEntryDTO | null>(null);
  const [engagementTarget, setEngagementTarget] = useState<{ entry: DiscoveryFeedEntryDTO; kind: "likes" | "wishlist" } | null>(null);
  const [profileActionTarget, setProfileActionTarget] = useState<DiscoveryFeedEntryDTO | null>(null);
  const [catalogTarget, setCatalogTarget] = useState<DiscoveryFeedEntryDTO | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const visibleEntries = useMemo(() => filter === "all" ? entries : entries.filter((entry) => entry.kind === filter), [entries, filter]);

  const showNotice = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(null), 2800);
  };
  const openPost = (entry: DiscoveryFeedEntryDTO) => {
    const url = new URL(window.location.href);
    url.searchParams.delete("view");
    url.searchParams.set("post", entry.id);
    window.history.pushState({ discoveryPost: entry.id }, "", url.pathname + url.search);
    setPostTarget(entry);
  };
  const closePost = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete("post");
    window.history.replaceState({}, "", url.pathname + url.search);
    setPostTarget(null);
  };
  useEffect(() => {
    const syncPostFromUrl = () => {
      const postId = new URL(window.location.href).searchParams.get("post");
      setPostTarget(feed.entries.find((entry) => entry.id === postId) ?? null);
    };
    window.addEventListener("popstate", syncPostFromUrl);
    return () => window.removeEventListener("popstate", syncPostFromUrl);
  }, [feed.entries]);

  const toggleLike = (entry: DiscoveryFeedEntryDTO) => {
    const active = !entry.likedByViewer;
    const optimistic = () => {
      const update = (current: DiscoveryFeedEntryDTO) => ({
        ...current,
        likedByViewer: active,
        likeCount: Math.max(0, current.likeCount + (active ? 1 : -1)),
      });
      setEntries((current) => updateEntry(current, entry.id, update));
      setPostTarget((current) => current?.id === entry.id ? update(current) : current);
      setMediaTarget((current) => current?.id === entry.id ? update(current) : current);
    };
    if (feed.isDemoFallback) {
      optimistic();
      return;
    }
    startTransition(() => {
      void (async () => {
        const payload = { id: entry.targetId, active, collectionId: entry.collection.id, subcollectionId: entry.subcollection?.id ?? null };
        const result = entry.targetKind === "collection"
          ? await setCollectionLikeAction(payload)
          : entry.targetKind === "subcollection"
            ? await setSubcollectionLikeAction(payload)
            : await setItemLikeAction(payload);
        if (!result.ok) return showNotice(result.error ?? "Could not update the like.");
        optimistic();
      })();
    });
  };

  const addCommentForTarget = (target: DiscoveryFeedEntryDTO | null, body: string, closeDrawer = true, parentId?: string) => {
    if (!target || !body.trim()) return;
    const newComment: DiscoveryCommentDTO = {
      id: `local-comment-${Date.now()}`,
      author: viewer ? {
        id: viewer.id,
        username: viewer.username,
        displayName: viewer.displayName,
        avatarUrl: viewer.avatarUrl,
        isVerified: viewer.isVerified,
      } : {
        id: "demo-you",
        username: "you",
        displayName: "You",
        avatarUrl: null,
        isVerified: false,
      },
      body: body.trim(),
      createdAt: new Date().toISOString(),
      isOwn: true,
      parentId,
      likeCount: 0,
      likedByViewer: false,
      replyCount: 0,
    };
    const updateWithComment = (item: DiscoveryFeedEntryDTO) => ({
      ...item,
      commentCount: item.commentCount + 1,
      comments: [...item.comments, newComment].slice(-8),
    });
    const addLocalComment = () => {
      setEntries((current) => updateEntry(current, target.id, updateWithComment));
      setPostTarget((current) => current?.id === target.id ? updateWithComment(current) : current);
      setMediaTarget((current) => current?.id === target.id ? updateWithComment(current) : current);
    };
    if (feed.isDemoFallback) {
      addLocalComment();
      if (closeDrawer) {
        setCommentTarget(null);
        setCommentOverMedia(false);
      }
      return showNotice("Comment added to this demo shelf.");
    }
    startTransition(() => {
      void (async () => {
        const result = await createCatalogCommentAction({
          collectionId: target.collection.id,
          targetCollectionId: target.targetKind === "collection" ? target.targetId : null,
          subcollectionId: target.targetKind === "subcollection" ? target.targetId : null,
          itemId: target.targetKind === "item" ? target.targetId : null,
          body,
        });
        if (!result.ok) return showNotice(result.error ?? "Could not add the comment.");
        addLocalComment();
        if (closeDrawer) {
          setCommentTarget(null);
          setCommentOverMedia(false);
        }
        showNotice("Comment posted.");
      })();
    });
  };
  const addComment = (body: string, parentId?: string) => addCommentForTarget(commentTarget, body, true, parentId);

  const createWishlist = (quote: string) => {
    const target = wishlistTarget;
    if (!target) return;
    if (feed.isDemoFallback) {
      setWishlistTarget(null);
      setWishlistOverMedia(false);
      return showNotice(quote.trim() ? "Your quoted wishlist is ready in this demo." : "Added to your demo wishlist.");
    }
    startTransition(() => {
      void (async () => {
        const result = await createWishlistPostAction({
          targetType: target.targetKind,
          targetId: target.targetId,
          quoteText: quote.trim() || null,
        });
        if (!result.ok) return showNotice(result.error ?? "Could not add that wishlist.");
        setWishlistTarget(null);
        setWishlistOverMedia(false);
        showNotice("Wishlisted. Your note is now part of the feed.");
        router.refresh();
      })();
    });
  };

  const previewItemEntry = (item: DiscoveryFeedEntryDTO["catalogPreview"]["items"][number]): DiscoveryFeedEntryDTO => ({
    ...((catalogTarget ?? mediaTarget ?? postTarget) as DiscoveryFeedEntryDTO),
    id: `preview-item-${item.id}`,
    kind: "item",
    targetKind: "item",
    targetId: item.id,
    title: item.title,
    description: item.description,
    tags: item.tags ?? [],
    imageUrls: item.imageUrls?.length ? item.imageUrls : item.imageUrl ? [item.imageUrl] : [],
    imageCount: item.imageUrls?.length ?? (item.imageUrl ? 1 : 0),
    viewCount: item.viewCount ?? 0,
    subcollection: (catalogTarget ?? mediaTarget ?? postTarget)?.subcollection ?? (item.subcollectionId ? {
      id: item.subcollectionId,
      slug: item.subcollectionId,
      name: item.subcollectionName ?? "Section",
      kind: "custom",
    } : null),
    likeCount: item.likeCount ?? 0,
    likedByViewer: item.likedByViewer ?? false,
    commentCount: item.commentCount ?? 0,
    comments: item.comments ?? [],
    wishlistCount: item.wishlistCount ?? 0,
    wishlisters: [],
    likers: [],
  });

  const openPreviewMedia = (item: DiscoveryFeedEntryDTO["catalogPreview"]["items"][number]) => {
    setCatalogTarget(null);
    setMediaTarget(previewItemEntry(item));
  };
  const openPreviewComment = (item: DiscoveryFeedEntryDTO["catalogPreview"]["items"][number]) => {
    const preview = previewItemEntry(item);
    setCatalogTarget(null);
    setMediaTarget(preview);
    setCommentOverMedia(true);
    setCommentTarget(preview);
  };
  const openPreviewWishlist = (item: DiscoveryFeedEntryDTO["catalogPreview"]["items"][number]) => {
    closePost();
    setCatalogTarget(null);
    setMediaTarget(null);
    setWishlistOverMedia(false);
    setWishlistTarget(previewItemEntry(item));
  };

  return (
    <section className={styles.discovery}>
      <header className="page-header feed-header">
        <div className="segmented-tabs" aria-label="Discovery feed">
          <button type="button" className="active">For you</button>
          <button type="button">Following</button>
        </div>
        <div className="header-actions">
          <button type="button" className="icon-button" aria-label="Search Klecto"><Search size={20} /></button>
          <button type="button" className="icon-button notification" aria-label="Notifications"><Bell size={20} /><i /></button>
        </div>
      </header>

      <section className="feed-intro">
        <div><span className="eyebrow">YOUR DAILY SHELF</span><h1>Worth keeping.</h1><p>Collections, sections, and individual finds from people who care about the details.</p></div>
        <a className="square-create" href="/create?mode=item"><Plus size={25} /><span>Add yours</span></a>
      </section>

      <div className="filter-row" role="tablist" aria-label="Filter discovery feed">
        {filterLabels.map((choice) => (
          <button key={choice.id} type="button" role="tab" aria-selected={filter === choice.id}
            className={filter === choice.id ? "active" : undefined}
            onClick={() => setFilter(choice.id)}>{choice.label}</button>
        ))}
        <button type="button" className="filter-settings" aria-label="Discovery filters"><Sparkles size={16} /></button>
      </div>

      {feed.isDemoFallback && <div className={styles.demoNote}><Sparkles size={16} /><span>Showing the Arjun Kapoor sample shelf while your public feed grows.</span></div>}

      <div className="feed-list">
        <AnimatePresence initial={false} mode="popLayout">
          {visibleEntries.map((entry, index) => (
            <DiscoveryCard key={entry.id} entry={entry} index={index} demo={feed.isDemoFallback} viewer={viewer} pending={isPending}
              onLike={() => toggleLike(entry)} onComment={() => { setCommentOverMedia(false); setCommentTarget(entry); }} onWishlist={() => { setWishlistOverMedia(false); setWishlistTarget(entry); }}
              onMedia={() => setMediaTarget(entry)} onOpenPost={() => openPost(entry)} onWishlisters={() => setWishlisterTarget(entry)} onMore={() => setProfileActionTarget(entry)} />
          ))}
        </AnimatePresence>
      </div>

      {visibleEntries.length === 0 && <div className={styles.empty}><Layers3 size={22} /><strong>No matching shelves yet.</strong><span>Try another part of the catalogue.</span></div>}

      <AnimatePresence>
        {wishlistTarget && <WishlistComposer key={`wishlist-composer-${wishlistOverMedia ? "media" : "feed"}`} entry={wishlistTarget} viewer={viewer} pending={isPending} overMedia={wishlistOverMedia} onClose={() => { setWishlistTarget(null); setWishlistOverMedia(false); }} onSubmit={createWishlist} />}
        {postTarget && <PostDetail key="post-detail" entry={postTarget} demo={feed.isDemoFallback} viewer={viewer} pending={isPending} onClose={closePost}
          onLike={() => toggleLike(postTarget)} onWishlist={() => { setWishlistOverMedia(false); setWishlistTarget(postTarget); }}
          onMedia={() => setMediaTarget(postTarget)}
          onEngagement={(kind) => setEngagementTarget({ entry: postTarget, kind })}
          onSubmitComment={(body, parentId) => addCommentForTarget(postTarget, body, false, parentId)} />}
        {mediaTarget && <MediaViewer key="media-viewer" entry={mediaTarget} onClose={() => setMediaTarget(null)}
          onLike={(target) => toggleLike(target)}
          onComment={(target) => { setCommentOverMedia(true); setCommentTarget(target); }}
          onWishlist={(target) => { setWishlistOverMedia(true); setWishlistTarget(target); }} />}
        {catalogTarget && <CatalogExplorerSheet key="catalog-explorer" entry={catalogTarget} demo={feed.isDemoFallback} onClose={() => setCatalogTarget(null)}
          onItemMedia={openPreviewMedia} onItemComment={openPreviewComment} onItemWishlist={openPreviewWishlist} />}
        {wishlisterTarget && <EngagementSheet key="wishlist-engagement" entry={wishlisterTarget} kind="wishlist" demo={feed.isDemoFallback} onClose={() => setWishlisterTarget(null)} />}
        {engagementTarget && <EngagementSheet key="post-engagement" entry={engagementTarget.entry} kind={engagementTarget.kind} demo={feed.isDemoFallback} onClose={() => setEngagementTarget(null)} />}
        {profileActionTarget && <ProfileActionSheet key="profile-actions" entry={profileActionTarget} demo={feed.isDemoFallback} onClose={() => setProfileActionTarget(null)} />}
        {commentTarget && <CommentDrawer key={`comment-drawer-${commentOverMedia ? "media" : "feed"}`} entry={commentTarget} pending={isPending} overMedia={commentOverMedia} onClose={() => { setCommentTarget(null); setCommentOverMedia(false); }} onSubmit={addComment} />}
        {notice && <motion.div key="discovery-notice" className={styles.notice} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}>{notice}</motion.div>}
      </AnimatePresence>
    </section>
  );
}

function DiscoveryCard({ entry, index, demo, viewer, pending, onLike, onComment, onWishlist, onMedia, onOpenPost, onWishlisters, onMore }: {
  entry: DiscoveryFeedEntryDTO;
  index: number;
  demo: boolean;
  viewer: ViewerDTO | null;
  pending: boolean;
  onLike: () => void;
  onComment: () => void;
  onWishlist: () => void;
  onMedia: () => void;
  onOpenPost: () => void;
  onWishlisters: () => void;
  onMore: () => void;
}) {
  const isWishlist = entry.kind === "wishlist";
  const [following, setFollowing] = useState(false);
  const canFollow = !viewer || viewer.id !== entry.author.id;
  const sourceCard = (
    <>
      <h2>{entry.title}</h2>
      {entry.description && <p className="post-copy">{entry.description}</p>}
      <button type="button" className={`media-frame ${styles.media}`} onClick={onMedia} aria-label={`View ${entry.title} photos`}>
        {entry.imageUrls[0] ? <img src={entry.imageUrls[0]} alt="" /> : <span className={styles.mediaFallback}><ImageIcon size={28} /></span>}
        {entry.imageCount > 1 && <span className="image-count">{entry.imageCount} photos</span>}
      </button>
      <div className="metadata-row">
        <span>{entry.targetKind === "collection" ? "Full catalogue" : entry.collection.name}</span>
        {entry.subcollection && <span>{entry.subcollection.name}</span>}
      </div>
      <footer className="post-actions">
        <button type="button" className={entry.likedByViewer ? "liked" : undefined} disabled={pending} onClick={onLike}><Heart size={19} fill={entry.likedByViewer ? "currentColor" : "none"} /><span>{entry.likeCount}</span></button>
        <button type="button" disabled={pending} onClick={onComment}><MessageCircle size={19} /><span>{entry.commentCount}</span></button>
        <button type="button" className="wished" disabled={pending} onClick={onWishlist}><Repeat2 size={20} /><span>Wishlist</span></button>
        <button type="button" className={styles.wishlistCount} disabled={!entry.wishlistCount} onClick={onWishlisters} aria-label={`View ${entry.wishlistCount} people who wishlisted this`}><span>{entry.wishlistCount}</span></button>
        <a href={entry.sourceHref} className={styles.openAction}>Explore <ChevronRight size={18} /></a>
      </footer>
    </>
  );
  return (
    <motion.article className={`feed-card ${styles.legacyCard} ${isWishlist ? styles.wishlist : ""}`}
      tabIndex={0}
      onClick={(event) => { if (!(event.target as HTMLElement).closest("a, button")) onOpenPost(); }}
      onKeyDown={(event) => { if ((event.key === "Enter" || event.key === " ") && !(event.target as HTMLElement).closest("a, button")) { event.preventDefault(); onOpenPost(); } }}
      initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.98 }}
      transition={{ delay: Math.min(index, 6) * 0.045, duration: 0.38, ease: [0.16, 1, 0.3, 1] }}>
      {isWishlist && <div className={styles.wishlistLabel}><Repeat2 size={15} /><span>{entry.author.displayName} wishlisted this</span></div>}
      <div className="post-head">
        <a href={demo ? entry.sourceHref : `/u/${encodeURIComponent(entry.author.username)}`} className="author">
          {entry.author.avatarUrl ? <img src={entry.author.avatarUrl} alt="" /> : <span className={styles.avatarFallback}>{entry.author.displayName.slice(0, 1)}</span>}
          <span><strong>{entry.author.displayName}{entry.author.isVerified && <ShieldCheck size={14} />}</strong><small>@{entry.author.username} · {relativeTime(entry.createdAt)}</small></span>
        </a>
        <div className={styles.cardAuthorActions}>{canFollow && <button type="button" className={`${styles.cardFollowButton} ${following ? styles.following : ""}`} onClick={() => setFollowing((current) => !current)}>{following ? <Check size={13} /> : <UserPlus size={13} />}<span>{following ? "Following" : "Follow"}</span></button>}<button type="button" className="icon-button" aria-label="More catalog options" onClick={onMore}><Ellipsis size={19} /></button></div>
      </div>
      {isWishlist && entry.quoteText && <p className={styles.quote}>{entry.quoteText}</p>}
      {isWishlist
        ? <div className={styles.repostBox}><div className={styles.repostBoxLabel}><Repeat2 size={14} /> Original {kindLabels[entry.targetKind].toLowerCase()}</div><SourceOwner entry={entry} demo={demo} />{sourceCard}</div>
        : sourceCard}
    </motion.article>
  );
}

function SourceOwner({ entry, demo }: { entry: DiscoveryFeedEntryDTO; demo: boolean }) {
  const owner = entry.sourceAuthor;
  return (
    <a className={styles.sourceOwner} href={demo ? entry.sourceHref : `/u/${encodeURIComponent(owner.username)}`}>
      {owner.avatarUrl ? <img src={owner.avatarUrl} alt="" /> : <span>{owner.displayName.slice(0, 1)}</span>}
      <div><small>Original collector</small><b>{owner.displayName} <em>@{owner.username}</em></b></div><ChevronRight size={15} />
    </a>
  );
}

function CommentDrawer({ entry, pending, overMedia, onClose, onSubmit }: { entry: DiscoveryFeedEntryDTO; pending: boolean; overMedia: boolean; onClose: () => void; onSubmit: (body: string, parentId?: string) => void }) {
  const [body, setBody] = useState("");
  const [commentFilter, setCommentFilter] = useState<"top" | "latest">("top");
  const [filterOpen, setFilterOpen] = useState(false);
  const [collapsedThreads, setCollapsedThreads] = useState<Set<string>>(() => new Set());
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [likedComments, setLikedComments] = useState<Set<string>>(() => new Set());
  const [savedComments, setSavedComments] = useState<Set<string>>(() => new Set());
  const [menuTarget, setMenuTarget] = useState<DiscoveryCommentDTO | null>(null);
  const pressTimer = useRef<number | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const comments = useMemo(() => [...entry.comments].sort((left, right) => commentFilter === "latest"
    ? new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
    : (right.likeCount ?? 0) - (left.likeCount ?? 0)), [commentFilter, entry.comments]);
  useEffect(() => {
    const bodyOverflow = document.body.style.overflow;
    const rootOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = bodyOverflow;
      document.documentElement.style.overflow = rootOverflow;
    };
  }, []);
  const startPress = (comment: DiscoveryCommentDTO) => {
    if (pressTimer.current) window.clearTimeout(pressTimer.current);
    pressTimer.current = window.setTimeout(() => setMenuTarget(comment), 520);
  };
  const cancelPress = () => {
    if (pressTimer.current) window.clearTimeout(pressTimer.current);
    pressTimer.current = null;
  };
  const replyTo = (comment: DiscoveryCommentDTO) => {
    setMenuTarget(null);
    setReplyingTo(comment.id);
    setBody(`@${comment.author.username} `);
    window.setTimeout(() => inputRef.current?.focus(), 0);
  };
  const childrenByParent = useMemo(() => {
    const grouped = new Map<string, DiscoveryCommentDTO[]>();
    comments.forEach((comment) => {
      if (!comment.parentId) return;
      const children = grouped.get(comment.parentId) ?? [];
      children.push(comment);
      grouped.set(comment.parentId, children);
    });
    return grouped;
  }, [comments]);
  const rootComments = comments.filter((comment) => !comment.parentId);
  const renderComment = (comment: DiscoveryCommentDTO, depth = 0): React.ReactNode => {
    const childComments = childrenByParent.get(comment.id) ?? [];
    const collapsed = collapsedThreads.has(comment.id);
    return <div key={comment.id} className={`${styles.commentThread} ${depth ? styles.commentNested : ""}`}>
      <article className={styles.commentRow} onPointerDown={(event) => { if (!(event.target as HTMLElement).closest("a, button")) startPress(comment); }} onPointerUp={cancelPress} onPointerCancel={cancelPress} onPointerMove={cancelPress}>
        {comment.author.avatarUrl ? <img src={comment.author.avatarUrl} alt="" /> : <span>{comment.author.displayName.slice(0, 1)}</span>}
        <div><strong>{comment.author.displayName}<small>@{comment.author.username} · {relativeTime(comment.createdAt)}</small></strong><button type="button" className={styles.commentRowMore} onPointerDown={cancelPress} onClick={() => setMenuTarget(comment)} aria-label="More comment options"><Ellipsis size={16} /></button><p>{comment.body}</p><div className={styles.commentRowActions}><button type="button" className={likedComments.has(comment.id) ? styles.commentLiked : undefined} onClick={() => setLikedComments((current) => { const next = new Set(current); if (next.has(comment.id)) next.delete(comment.id); else next.add(comment.id); return next; })}><Heart size={14} fill={likedComments.has(comment.id) ? "currentColor" : "none"} /> {(comment.likeCount ?? 0) + (likedComments.has(comment.id) ? 1 : 0)}</button><button type="button" onClick={() => replyTo(comment)}>Reply</button>{childComments.length > 0 && <button type="button" className={styles.commentCollapseButton} onClick={() => setCollapsedThreads((current) => { const next = new Set(current); if (next.has(comment.id)) next.delete(comment.id); else next.add(comment.id); return next; })}>{collapsed ? "Show" : "Hide"} {childComments.length} {childComments.length === 1 ? "reply" : "replies"}</button>}</div></div>
      </article>
      {!collapsed && childComments.map((child) => renderComment(child, depth + 1))}
    </div>;
  };
  return createPortal(
    <motion.div className={`${styles.sheetBackdrop} ${overMedia ? styles.sheetBackdropOverMedia : ""}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={onClose}>
      <motion.aside className={`${styles.sheet} ${styles.commentDrawer} ${overMedia ? styles.commentDrawerOverMedia : ""}`} initial={overMedia ? { y: 56, opacity: 0.65 } : { x: 36, opacity: 0.7 }} animate={overMedia ? { y: 0, opacity: 1 } : { x: 0, opacity: 1 }} exit={overMedia ? { y: 42, opacity: 0.6 } : { x: 36, opacity: 0.7 }} transition={{ type: "spring", stiffness: 340, damping: 31 }} onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-label="Comments">
        <div className={styles.sheetHandle} />
        <header><div><span>CONVERSATION</span><h3>{entry.commentCount} comments</h3></div><button type="button" onClick={onClose} aria-label="Close comments"><X size={19} /></button></header>
        <div className={styles.commentContext}>
          {entry.imageUrls[0] ? <img src={entry.imageUrls[0]} alt="" /> : <span><ImageIcon size={18} /></span>}
          <div><b>{entry.title}</b><small>{entrySource(entry)}</small></div>
          <a href={entry.sourceHref} aria-label="Open original"><ChevronRight size={18} /></a>
        </div>
        <div className={styles.commentSort}><button type="button" className={styles.commentSortFilter} onClick={() => setFilterOpen(true)}><span>{commentFilter === "top" ? "Top comments" : "Latest comments"}</span><ChevronDown size={14} /></button><small>{entry.comments.length ? "Choose a view" : "Start the conversation"}</small></div>
        <div className={styles.commentList}>
          {rootComments.map((comment) => renderComment(comment))}
          {!entry.comments.length && <div className={styles.commentEmpty}><MessageCircle size={20} /><span>No replies yet. Be the first to add to this shelf.</span></div>}
        </div>
        <form className={styles.commentComposer} onSubmit={(event) => { event.preventDefault(); onSubmit(body, replyingTo ?? undefined); setBody(""); setReplyingTo(null); }}>
          <textarea ref={inputRef} value={body} onChange={(event) => setBody(event.target.value)} placeholder="Add to the conversation..." maxLength={2000} autoFocus />
          <footer><span>{body.length}/2000</span><button type="submit" disabled={!body.trim() || pending} aria-label="Send reply"><Send size={16} /></button></footer>
        </form>
        {menuTarget && <CommentActionSheet comment={menuTarget} saved={savedComments.has(menuTarget.id)} onClose={() => setMenuTarget(null)} onReply={() => replyTo(menuTarget)} onSave={() => setSavedComments((current) => { const next = new Set(current); if (next.has(menuTarget.id)) next.delete(menuTarget.id); else next.add(menuTarget.id); return next; })} />}
        {filterOpen && <CommentFilterSheet value={commentFilter} onChange={(value) => { setCommentFilter(value); setFilterOpen(false); }} onClose={() => setFilterOpen(false)} />}
      </motion.aside>
    </motion.div>,
    document.body,
  );
}

function MediaViewer({ entry, onClose, onLike, onComment, onWishlist }: { entry: DiscoveryFeedEntryDTO; onClose: () => void; onLike: (target: DiscoveryFeedEntryDTO) => void; onComment: (target: DiscoveryFeedEntryDTO) => void; onWishlist: (target: DiscoveryFeedEntryDTO) => void }) {
  const [selectedDiscovery, setSelectedDiscovery] = useState<ViewerDiscovery | null>(null);
  const [relatedOpen, setRelatedOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const images = useMemo(() => selectedDiscovery?.imageUrls?.length ? selectedDiscovery.imageUrls : selectedDiscovery ? [selectedDiscovery.imageUrl] : entry.imageUrls, [entry.imageUrls, selectedDiscovery]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [immersive, setImmersive] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [localReaction, setLocalReaction] = useState<{ key: string; liked: boolean; count: number } | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<HTMLElement | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinchDistance = useRef<number | null>(null);
  const pinchStartZoom = useRef(1);
  const didPinch = useRef(false);
  const lastImageTap = useRef(0);
  const relatedBeforeImmersive = useRef(false);
  const activeDiscoveryKey = selectedDiscovery?.id ?? entry.id;
  const activeTarget = useMemo<DiscoveryFeedEntryDTO>(() => {
    if (!selectedDiscovery || selectedDiscovery.current) return entry;
    return {
      ...entry,
      id: `${entry.id}:preview:${selectedDiscovery.targetId ?? selectedDiscovery.id}`,
      targetKind: selectedDiscovery.targetKind ?? entry.targetKind,
      targetId: selectedDiscovery.targetId ?? entry.targetId,
      title: selectedDiscovery.title,
      description: selectedDiscovery.description ?? null,
      imageUrls: images,
      imageCount: images.length,
      subcollection: selectedDiscovery.subcollectionId && selectedDiscovery.subcollectionName
        ? { id: selectedDiscovery.subcollectionId, slug: selectedDiscovery.subcollectionSlug ?? selectedDiscovery.subcollectionId, name: selectedDiscovery.subcollectionName, kind: entry.subcollection?.kind ?? "custom" }
        : entry.subcollection,
      likeCount: selectedDiscovery.likeCount ?? 0,
      likedByViewer: selectedDiscovery.likedByViewer ?? false,
      commentCount: selectedDiscovery.commentCount ?? 0,
      comments: selectedDiscovery.comments ?? [],
      wishlistCount: selectedDiscovery.wishlistCount ?? 0,
      viewCount: selectedDiscovery.viewCount ?? 0,
    };
  }, [entry, images, selectedDiscovery]);
  const displayDescription = selectedDiscovery?.description ?? entry.description;
  const displayTags = selectedDiscovery?.tags ?? entry.tags ?? [];
  const reactionLiked = localReaction?.key === activeDiscoveryKey ? localReaction.liked : (selectedDiscovery?.likedByViewer ?? entry.likedByViewer);
  const reactionCount = localReaction?.key === activeDiscoveryKey ? localReaction.count : (selectedDiscovery?.likeCount ?? entry.likeCount);
  const toggleActiveLike = () => {
    const nextLiked = !reactionLiked;
    setLocalReaction({ key: activeDiscoveryKey, liked: nextLiked, count: Math.max(0, reactionCount + (nextLiked ? 1 : -1)) });
    onLike(activeTarget);
  };
  const relatedDiscoveries = useMemo(() => {
    const subcollectionsById = new Map(entry.catalogPreview.subcollections.map((section) => [section.id, section]));
    const currentImage = entry.imageUrls[0];
    const current: ViewerDiscovery[] = currentImage ? [{
      id: `${entry.id}-current`,
      title: entry.title,
      eyebrow: "Currently viewing",
      imageUrl: currentImage,
      imageUrls: entry.imageUrls,
      description: entry.description,
      targetKind: entry.targetKind,
      targetId: entry.targetId,
      likeCount: entry.likeCount,
      likedByViewer: entry.likedByViewer,
      commentCount: entry.commentCount,
      wishlistCount: entry.wishlistCount,
      viewCount: entry.viewCount,
      comments: entry.comments,
      current: true,
      subcollectionId: entry.subcollection?.id ?? null,
      subcollectionSlug: entry.subcollection?.slug ?? null,
      subcollectionName: entry.subcollection?.name ?? null,
    }] : [];
    const sections: ViewerDiscovery[] = entry.catalogPreview.subcollections
      .filter((section) => Boolean(section.coverUrl))
      .map((section) => ({
        id: `section-${section.id}`,
        title: section.name,
        eyebrow: `${section.itemCount} ${section.itemCount === 1 ? "object" : "objects"}`,
        imageUrl: section.coverUrl!,
        description: section.description,
        targetKind: "subcollection",
        targetId: section.id,
        likeCount: section.likeCount,
        likedByViewer: section.likedByViewer,
        commentCount: section.commentCount,
        wishlistCount: section.wishlistCount,
        viewCount: section.viewCount,
        comments: section.comments,
        subcollectionId: section.id,
        subcollectionSlug: section.slug,
        subcollectionName: section.name,
      }));
    const items: ViewerDiscovery[] = entry.catalogPreview.items
      .filter((item) => Boolean(item.imageUrl))
      .map((item) => {
        const section = item.subcollectionId ? subcollectionsById.get(item.subcollectionId) : null;
        return {
          id: `item-${item.id}`,
          title: item.title,
          eyebrow: item.subcollectionName ?? entry.collection.name,
          imageUrl: item.imageUrl!,
          imageUrls: item.imageUrls?.length ? item.imageUrls : [item.imageUrl!],
          description: item.description,
          tags: item.tags ?? [],
          targetKind: "item",
          targetId: item.id,
          likeCount: item.likeCount,
          likedByViewer: item.likedByViewer,
          commentCount: item.commentCount,
          wishlistCount: item.wishlistCount,
          viewCount: item.viewCount,
          comments: item.comments,
          subcollectionId: item.subcollectionId,
          subcollectionSlug: section?.slug ?? null,
          subcollectionName: item.subcollectionName,
        };
      });
    const samples = entry.id.startsWith("demo-") ? demoViewerDiscoveries : [];
    const seen = new Set<string>();
    const discoveries = [...current, ...items, ...sections, ...samples];
    const scopedDiscoveries = !entry.id.startsWith("demo-") && entry.subcollection
      ? discoveries.filter((discovery) => discovery.current || discovery.subcollectionId === entry.subcollection?.id)
      : discoveries;
    return scopedDiscoveries.filter((discovery) => {
      if (seen.has(discovery.imageUrl)) return false;
      seen.add(discovery.imageUrl);
      return true;
    });
  }, [entry]);
  const goTo = useCallback((index: number) => {
    if (!images.length || !scrollRef.current) return;
    const next = (index + images.length) % images.length;
    scrollRef.current.scrollTo({ left: scrollRef.current.clientWidth * next, behavior: "smooth" });
    setActiveIndex(next);
    setZoom(1);
  }, [images.length]);
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
      if (event.key === "ArrowLeft") goTo(activeIndex - 1);
      if (event.key === "ArrowRight") goTo(activeIndex + 1);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  // activeIndex is intentionally part of the shortcut state.
  }, [activeIndex, goTo, onClose]);
  useEffect(() => {
    const bodyOverflow = document.body.style.overflow;
    const rootOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = bodyOverflow;
      document.documentElement.style.overflow = rootOverflow;
    };
  }, []);
  const updatePointer = (event: React.PointerEvent<HTMLDivElement>) => {
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.current.size !== 2) return;
    const [first, second] = [...pointers.current.values()];
    const distance = Math.hypot(first.x - second.x, first.y - second.y);
    if (!pinchDistance.current) {
      pinchDistance.current = distance;
      pinchStartZoom.current = zoom;
      return;
    }
    didPinch.current = true;
    setZoom(Math.min(3, Math.max(1, pinchStartZoom.current * (distance / pinchDistance.current))));
  };
  const clearPointer = (event: React.PointerEvent<HTMLDivElement>) => {
    pointers.current.delete(event.pointerId);
    if (pointers.current.size < 2) pinchDistance.current = null;
  };
  const toggleFullscreen = () => {
    if (didPinch.current) {
      didPinch.current = false;
      return;
    }
    const now = Date.now();
    if (now - lastImageTap.current < 320) return;
    lastImageTap.current = now;
    if (immersive) {
      setImmersive(false);
      setRelatedOpen(relatedBeforeImmersive.current);
      return;
    }
    relatedBeforeImmersive.current = relatedOpen;
    setRelatedOpen(false);
    setImmersive(true);
  };
  const exploreDiscovery = (discovery: ViewerDiscovery) => {
    setSelectedDiscovery(discovery.current ? null : discovery);
    setActiveIndex(0);
    setZoom(1);
    setImmersive(false);
    setRelatedOpen(true);
    scrollRef.current?.scrollTo({ left: 0, behavior: "smooth" });
    window.requestAnimationFrame(() => viewerRef.current?.scrollTo({ top: 0, behavior: "auto" }));
  };
  const exploreSubcollection = (section: DiscoveryFeedEntryDTO["catalogPreview"]["subcollections"][number]) => {
    const coverImage = section.coverUrl
      ?? entry.catalogPreview.items
        .find((item) => item.subcollectionId === section.id && (item.imageUrls?.length || item.imageUrl))
        ?.imageUrls?.[0]
      ?? entry.catalogPreview.items.find((item) => item.subcollectionId === section.id)?.imageUrl
      ?? null;
    if (!coverImage) return;
    exploreDiscovery({
      id: `section-${section.id}`,
      title: section.name,
      eyebrow: `${section.kind} · ${section.itemCount} ${section.itemCount === 1 ? "object" : "objects"}`,
      imageUrl: coverImage,
      imageUrls: [coverImage],
      description: section.description,
      targetKind: "subcollection",
      targetId: section.id,
      likeCount: section.likeCount,
      likedByViewer: section.likedByViewer,
      commentCount: section.commentCount,
      wishlistCount: section.wishlistCount,
      viewCount: section.viewCount,
      comments: section.comments,
      subcollectionId: section.id,
      subcollectionSlug: section.slug,
      subcollectionName: section.name,
    });
  };
  const activeSubcollectionSlug = selectedDiscovery?.subcollectionSlug ?? entry.subcollection?.slug ?? null;
  const activeSubcollectionName = selectedDiscovery?.subcollectionName
    ?? (selectedDiscovery && !selectedDiscovery.current ? selectedDiscovery.eyebrow : null)
    ?? entry.subcollection?.name
    ?? entry.collection.name;
  const activeSubcollectionId = selectedDiscovery?.subcollectionId ?? entry.subcollection?.id ?? null;
  const visibleRelatedDiscoveries = !entry.id.startsWith("demo-") && activeSubcollectionId
    ? relatedDiscoveries.filter((discovery) => discovery.subcollectionId === activeSubcollectionId)
    : relatedDiscoveries;
  const isDemoCatalogue = entry.sourceHref.startsWith("/demo/collections/");
  const catalogueHref = activeSubcollectionSlug
    ? isDemoCatalogue
      ? `/demo/collections/${encodeURIComponent(entry.collection.slug)}/subcollections/${encodeURIComponent(activeSubcollectionSlug)}`
      : `${entry.sourceHref}${entry.sourceHref.includes("?") ? "&" : "?"}subcollection=${encodeURIComponent(activeSubcollectionSlug)}`
    : entry.sourceHref;
  const relatedScopeLabel = activeSubcollectionSlug ? "OBJECTS IN THIS SUBCOLLECTION" : "SECTIONS AND OBJECTS IN THIS COLLECTION";
  const sharePhoto = () => {
    const url = window.location.href;
    if (navigator.share) {
      void navigator.share({ title: selectedDiscovery?.title ?? entry.title, url }).catch(() => undefined);
      return;
    }
    void navigator.clipboard?.writeText(url);
  };
  return createPortal(
    <motion.div className={`${styles.mediaBackdrop} ${relatedOpen ? styles.mediaBackdropExpanded : ""} ${immersive ? styles.mediaBackdropFullscreen : ""}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={onClose}>
      <motion.section ref={viewerRef} layout className={`${styles.mediaViewer} ${relatedOpen ? styles.mediaViewerExpanded : ""} ${immersive ? styles.mediaViewerFullscreen : ""}`} initial={{ opacity: 0, scale: 0.97, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97, y: 12 }} transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1], layout: { type: "spring", stiffness: 290, damping: 30 } }} onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-label={`${entry.title} photos`}>
        <header><div><span>{selectedDiscovery ? "DISCOVERED IN THIS CATALOGUE" : "PHOTO CLOSE-UP"}</span><h3>{selectedDiscovery?.title ?? entry.title}</h3></div><div className={styles.mediaViewerHeaderActions}><motion.a href={catalogueHref} className={styles.mediaViewerHeaderAction} whileTap={{ scale: 0.9 }} aria-label={`Open ${activeSubcollectionSlug ? activeSubcollectionName : entry.collection.name}`} title={`Open ${activeSubcollectionSlug ? activeSubcollectionName : entry.collection.name}`}><FolderOpen size={18} /></motion.a><button type="button" className={styles.mediaViewerHeaderAction} onClick={onClose} aria-label="Close photo viewer"><X size={21} /></button></div></header>
        <div ref={scrollRef} className={styles.mediaTrack} onPointerDown={updatePointer} onPointerMove={updatePointer} onPointerUp={clearPointer} onPointerCancel={clearPointer} onScroll={(event) => {
          const width = event.currentTarget.clientWidth || 1;
          const nextIndex = Math.round(event.currentTarget.scrollLeft / width);
          if (activeIndex !== nextIndex) setZoom(1);
          setActiveIndex(nextIndex);
        }}>
          <AnimatePresence initial={false}>{images.length ? images.map((image, index) => <motion.img key={`${image}-${index}`} src={image} alt={`${selectedDiscovery?.title ?? entry.title} photo ${index + 1}`} draggable={false} onClick={toggleFullscreen} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }} style={index === activeIndex ? { scale: zoom } : undefined} />) : <motion.div key="empty-media" className={styles.mediaEmpty} initial={{ opacity: 0 }} animate={{ opacity: 1 }}><ImageIcon size={32} /><span>No images added yet</span></motion.div>}</AnimatePresence>
        </div>
        <footer>
          <div className={styles.mediaFooterMain}><div className={styles.mediaPosition}><span>{images.length ? `${activeIndex + 1} / ${images.length}` : "0 photos"}</span>{images.length > 1 && <div className={styles.mediaDots}>{images.map((_, index) => <button key={index} type="button" className={index === activeIndex ? styles.activeDot : undefined} onClick={() => goTo(index)} aria-label={`View photo ${index + 1}`} />)}</div>}</div><motion.button type="button" className={styles.mediaDiscoverToggle} onClick={() => setRelatedOpen((open) => !open)} whileTap={{ scale: 0.86 }} animate={{ y: relatedOpen ? 1 : [0, 2, 0] }} transition={relatedOpen ? { type: "spring", stiffness: 420, damping: 22 } : { duration: 1.8, repeat: Infinity, ease: "easeInOut" }} aria-expanded={relatedOpen} aria-controls="media-related-discoveries" aria-label={relatedOpen ? "Hide related catalogue images" : "Show related catalogue images"}>{relatedOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}</motion.button></div>
          <div className={styles.mediaCreatorBar}><a href={`/u/${encodeURIComponent(entry.author.username)}`} className={styles.mediaViewerAuthor}><span className={styles.mediaViewerAvatar}>{entry.author.avatarUrl ? <img src={entry.author.avatarUrl} alt="" /> : entry.author.displayName.slice(0, 1)}</span><span><strong>{entry.author.displayName}</strong><small>@{entry.author.username}</small></span></a><button type="button" className={styles.mediaWishlistButton} onClick={() => onWishlist(activeTarget)}><Repeat2 size={15} /> Wishlist {activeTarget.wishlistCount ? activeTarget.wishlistCount : ""}</button></div>
          {(displayDescription || displayTags.length > 0) && <section className={styles.mediaDetails} aria-label="Image details">
            <button type="button" className={styles.mediaDetailsToggle} onClick={() => setDetailsOpen((open) => !open)} aria-expanded={detailsOpen}>
              <span><small>ABOUT THIS {selectedDiscovery?.targetKind === "subcollection" ? "SECTION" : "OBJECT"}</small><strong>{displayDescription ? (detailsOpen || displayDescription.length <= 120 ? displayDescription : `${displayDescription.slice(0, 120).trimEnd()}…`) : "View the details and tags"}</strong></span>
              {detailsOpen ? <ChevronUp size={17} /> : <ChevronDown size={17} />}
            </button>
            <AnimatePresence initial={false}>{detailsOpen && <motion.div className={styles.mediaDetailsExpanded} initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}><p>{displayDescription || "No description added yet."}</p>{displayTags.length > 0 && <div className={styles.mediaDetailTags}>{displayTags.map((tag) => <span key={tag}>#{tag}</span>)}</div>}</motion.div>}</AnimatePresence>
          </section>}
          <div className={styles.mediaEngagement} aria-label="Photo engagement">
            <div><button type="button" className={reactionLiked ? styles.mediaEngagementActive : undefined} onClick={toggleActiveLike} aria-label="Like this photo"><Heart size={18} fill={reactionLiked ? "currentColor" : "none"} /><span>{reactionCount}</span></button><button type="button" onClick={() => onComment(activeTarget)} aria-label="Open comments"><MessageCircle size={18} /><span>{activeTarget.commentCount}</span></button></div>
            <div><button type="button" className={saved ? styles.mediaEngagementActive : undefined} onClick={() => setSaved((current) => !current)}><Bookmark size={18} fill={saved ? "currentColor" : "none"} /><span>{saved ? "Saved" : "Save"}</span></button><button type="button" onClick={sharePhoto} aria-label="Share this photo"><Share2 size={18} /></button></div>
          </div>
        </footer>
        <AnimatePresence initial={false}>
          {relatedOpen && <motion.aside id="media-related-discoveries" className={styles.mediaRelatedPanel} initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.34, ease: [0.16, 1, 0.3, 1] }}>
            <div className={styles.mediaRelatedHead}><div><span>{relatedScopeLabel}</span><strong>{activeSubcollectionName}</strong></div><small>{visibleRelatedDiscoveries.length} {visibleRelatedDiscoveries.length === 1 ? "object" : "objects"}</small></div>
            <div className={styles.mediaRelatedMasonry}>
              {visibleRelatedDiscoveries.map((discovery, index) => <motion.button type="button" key={discovery.id} className={`${styles.mediaRelatedCard} ${(selectedDiscovery?.id ?? `${entry.id}-current`) === discovery.id ? styles.mediaRelatedCardActive : ""}`} onClick={() => exploreDiscovery(discovery)} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index * 0.035, 0.22), duration: 0.28 }} whileTap={{ scale: 0.97 }} aria-label={`Preview ${discovery.title}`}>
                <motion.img src={discovery.imageUrl} alt="" />
                <span><small>{discovery.eyebrow}</small><strong>{discovery.title}</strong></span>
              </motion.button>)}
            </div>
            <section className={styles.mediaAccountShelves} aria-label={`${entry.sourceAuthor.displayName}'s other collections`}>
              <div className={styles.mediaAccountShelvesHead}><div><span>MORE FROM THIS COLLECTOR</span><strong>More shelves to explore</strong></div><small>Swipe to explore</small></div>
              <div className={styles.mediaAccountShelvesTrack}>
                {entry.catalogPreview.subcollections.map((section) => <button key={section.id} type="button" onClick={() => exploreSubcollection(section)} className={styles.mediaAccountShelfCard}>
                  <div>{section.coverUrl ? <img src={section.coverUrl} alt="" /> : <Layers3 size={24} />}</div>
                  <span><small>{section.kind} · {section.itemCount} {section.itemCount === 1 ? "object" : "objects"}</small><strong>{section.name}</strong><em>{section.description ?? "Open this shelf to explore the full collection."}</em></span>
                  <ChevronRight size={16} />
                </button>)}
              </div>
            </section>
          </motion.aside>}
        </AnimatePresence>
      </motion.section>
    </motion.div>,
    document.body,
  );
}

function CatalogExplorerSheet({ entry, demo, onClose, onItemMedia, onItemComment, onItemWishlist }: {
  entry: DiscoveryFeedEntryDTO;
  demo: boolean;
  onClose: () => void;
  onItemMedia: (item: DiscoveryFeedEntryDTO["catalogPreview"]["items"][number]) => void;
  onItemComment: (item: DiscoveryFeedEntryDTO["catalogPreview"]["items"][number]) => void;
  onItemWishlist: (item: DiscoveryFeedEntryDTO["catalogPreview"]["items"][number]) => void;
}) {
  const preview = entry.catalogPreview;
  const isCollection = entry.targetKind === "collection";
  const isSubcollection = entry.targetKind === "subcollection";
  const sectionId = isSubcollection ? entry.targetId : entry.subcollection?.id ?? null;
  const items = isCollection ? preview.items : preview.items.filter((item) => item.subcollectionId === sectionId);
  const heading = isCollection ? preview.collection.name : isSubcollection ? entry.subcollection?.name ?? entry.title : entry.title;
  const eyebrow = isCollection ? "COLLECTION EXPLORER" : isSubcollection ? "SUBCOLLECTION EXPLORER" : "ITEM CONTEXT";
  const collectionHref = demo ? entry.sourceHref : "/u/" + encodeURIComponent(entry.sourceAuthor.username) + "/collections/" + encodeURIComponent(preview.collection.slug);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [likedItems, setLikedItems] = useState<Set<string>>(() => new Set());
  const [savedItems, setSavedItems] = useState<Set<string>>(() => new Set());
  const [wishlistedItems, setWishlistedItems] = useState<Set<string>>(() => new Set());
  const selectedItem = items.find((item) => item.id === selectedItemId) ?? null;
  const toggleSet = (setter: (value: Set<string> | ((current: Set<string>) => Set<string>)) => void, id: string) => {
    setter((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const openItem = (item: DiscoveryFeedEntryDTO["catalogPreview"]["items"][number]) => {
    setSelectedItemId((current) => current === item.id ? null : item.id);
  };
  const itemActions = (item: DiscoveryFeedEntryDTO["catalogPreview"]["items"][number]) => (
    <div className={styles.explorerItemActions} aria-label={`${item.title} actions`}>
      <button type="button" className={likedItems.has(item.id) ? styles.explorerActionActive : undefined} onClick={() => toggleSet(setLikedItems, item.id)} aria-label="Like item"><Heart size={15} fill={likedItems.has(item.id) ? "currentColor" : "none"} /></button>
      <button type="button" onClick={() => onItemComment(item)} aria-label="Comment on item"><MessageCircle size={15} /></button>
      <button type="button" className={wishlistedItems.has(item.id) ? styles.explorerActionActive : undefined} onClick={() => { toggleSet(setWishlistedItems, item.id); onItemWishlist(item); }} aria-label="Wishlist item"><Repeat2 size={15} /></button>
      <button type="button" className={savedItems.has(item.id) ? styles.explorerActionActive : undefined} onClick={() => toggleSet(setSavedItems, item.id)} aria-label="Save item"><Bookmark size={15} fill={savedItems.has(item.id) ? "currentColor" : "none"} /></button>
    </div>
  );
  return createPortal(
    <motion.div className={styles.catalogExplorerBackdrop} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={onClose}>
      <motion.section className={styles.catalogExplorerSheet} initial={{ y: 44, opacity: 0.7 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 44, opacity: 0.7 }} transition={{ type: "spring", stiffness: 330, damping: 30, mass: 0.72 }} onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-label={"Explore " + heading}>
        <div className={styles.sheetHandle} />
        <header><div><span>{eyebrow}</span><h3>{heading}</h3><p>{isCollection ? "Browse the sections and objects in this collection." : isSubcollection ? "Everything kept in this section." : "From " + (entry.subcollection?.name ?? preview.collection.name) + "."}</p></div><button type="button" onClick={onClose} aria-label="Close collection explorer"><X size={19} /></button></header>
        <div className={styles.catalogExplorerScroll}>
          {!isCollection && entry.subcollection && <a className={styles.explorerParent} href={collectionHref}><Layers3 size={17} /><span><small>PART OF</small><b>{preview.collection.name} / {entry.subcollection.name}</b></span><ChevronRight size={17} /></a>}
          {isCollection && <section className={styles.explorerSection}><div className={styles.explorerLabel}><span>SUBCOLLECTIONS</span><small>{preview.subcollections.length}</small></div><div className={styles.explorerSections}>{preview.subcollections.map((section) => <a key={section.id} href={entry.sourceHref}><div>{section.coverUrl ? <img src={section.coverUrl} alt="" /> : <Layers3 size={20} />}</div><span><small>{section.kind}</small><b>{section.name}</b><em>{section.itemCount} items <ChevronRight size={14} /></em></span></a>)}</div></section>}
          {selectedItem && <section className={styles.explorerPreview}>
            <button type="button" className={styles.explorerPreviewImage} onClick={() => onItemMedia(selectedItem)} aria-label={`Open ${selectedItem.title} photos`}>
              {selectedItem.imageUrl ? <img src={selectedItem.imageUrl} alt="" /> : <PackageOpen size={28} />}
              <span>Open photos</span>
            </button>
            <div className={styles.explorerPreviewCopy}><small>{selectedItem.subcollectionName ?? "ITEM"}</small><b>{selectedItem.title}</b>{selectedItem.description && <p>{selectedItem.description}</p>}{itemActions(selectedItem)}</div>
          </section>}
          <section className={styles.explorerSection}><div className={styles.explorerLabel}><span>{isCollection ? "ALL ITEMS" : isSubcollection ? "ITEMS IN THIS SECTION" : "RELATED ITEMS"}</span><small>{items.length}</small></div><div className={styles.explorerItems}>{items.map((item) => <article key={item.id} className={`${styles.explorerItem} ${selectedItemId === item.id ? styles.explorerItemSelected : ""}`}><button type="button" className={styles.explorerItemMain} onClick={() => openItem(item)}><div>{item.imageUrl ? <img src={item.imageUrl} alt="" /> : <PackageOpen size={19} />}</div><span><b>{item.title}</b><small>{(item.subcollectionName ?? "Unsorted") + (item.description ? " / " + item.description : "")}</small></span><ChevronRight size={15} /></button></article>)}{!items.length && <div className={styles.explorerEmpty}>No public items in this part of the collection yet.</div>}</div></section>
        </div>
        <footer><a href={entry.sourceHref}>Open full catalogue <ChevronRight size={16} /></a></footer>
      </motion.section>
    </motion.div>,
    document.body,
  );
}

function PostDetail({ entry, demo, viewer, pending, onClose, onLike, onWishlist, onMedia, onEngagement, onSubmitComment }: {
  entry: DiscoveryFeedEntryDTO;
  demo: boolean;
  viewer: ViewerDTO | null;
  pending: boolean;
  onClose: () => void;
  onLike: () => void;
  onWishlist: () => void;
  onMedia: () => void;
  onEngagement: (kind: "likes" | "wishlist") => void;
  onSubmitComment: (body: string, parentId?: string) => void;
}) {
  const [commentBody, setCommentBody] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [commentFilter, setCommentFilter] = useState<"top" | "latest">("top");
  const [likedComments, setLikedComments] = useState<Set<string>>(() => new Set());
  const [savedComments, setSavedComments] = useState<Set<string>>(() => new Set());
  const [commentMenuTarget, setCommentMenuTarget] = useState<DiscoveryCommentDTO | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const commentPressTimer = useRef<number | null>(null);
  const commentInputRef = useRef<HTMLTextAreaElement | null>(null);
  const canFollow = !viewer || viewer.id !== entry.author.id;
  const startCommentPress = (comment: DiscoveryCommentDTO) => {
    if (commentPressTimer.current) window.clearTimeout(commentPressTimer.current);
    commentPressTimer.current = window.setTimeout(() => setCommentMenuTarget(comment), 520);
  };
  const cancelCommentPress = () => {
    if (commentPressTimer.current) window.clearTimeout(commentPressTimer.current);
    commentPressTimer.current = null;
  };
  const replyToComment = (comment: DiscoveryCommentDTO) => {
    setCommentMenuTarget(null);
    setReplyingTo(comment.id);
    setCommentBody(`@${comment.author.username} `);
    window.setTimeout(() => commentInputRef.current?.focus(), 0);
  };
  const visibleComments = useMemo(() => [...entry.comments].sort((left, right) => {
    if (commentFilter === "latest") return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
    return ((right.likeCount ?? 0) + (likedComments.has(right.id) ? 1 : 0)) - ((left.likeCount ?? 0) + (likedComments.has(left.id) ? 1 : 0));
  }), [commentFilter, entry.comments, likedComments]);
  useEffect(() => {
    const bodyOverflow = document.body.style.overflow;
    const rootOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = bodyOverflow;
      document.documentElement.style.overflow = rootOverflow;
    };
  }, []);
  if (typeof document === "undefined") return null;
  return createPortal(
    <motion.div className={styles.postBackdrop} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={onClose}>
      <motion.article className={styles.postDetail} initial={{ y: 28, opacity: 0.75 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 28, opacity: 0.75 }} onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-label={`${entry.title} post`}>
        <header><div><span>POST DETAIL</span><h3>{entry.kind === "wishlist" ? "Wishlist post" : kindLabels[entry.targetKind]}</h3></div><button type="button" onClick={onClose} aria-label="Close post"><X size={20} /></button></header>
        <div className={styles.postScroll}>
          <div className={styles.postAuthorRow}>
            <a href={demo ? entry.sourceHref : `/u/${encodeURIComponent(entry.author.username)}`} className={styles.postAuthor}>
              {entry.author.avatarUrl ? <img src={entry.author.avatarUrl} alt="" /> : <span>{entry.author.displayName.slice(0, 1)}</span>}
              <div><b>{entry.author.displayName}</b><small>@{entry.author.username} · {relativeTime(entry.createdAt)}</small></div>
            </a>
            {canFollow && <button type="button" className={`${styles.followButton} ${isFollowing ? styles.following : ""}`} onClick={() => setIsFollowing((current) => !current)}>{isFollowing ? <><Check size={14} /> Following</> : <><UserPlus size={14} /> Follow</>}</button>}
          </div>
          {entry.kind === "wishlist" && <div className={styles.postWishlisted}><Repeat2 size={15} /> Wishlisted this {kindLabels[entry.targetKind].toLowerCase()}</div>}
          {entry.kind === "wishlist" && <SourceOwner entry={entry} demo={demo} />}
          {entry.quoteText && <p className={styles.postQuote}>{entry.quoteText}</p>}
          <button type="button" className={styles.postMedia} onClick={onMedia}>
            {entry.imageUrls[0] ? <img src={entry.imageUrls[0]} alt="" /> : <span><ImageIcon size={28} /></span>}
            {entry.imageCount > 1 && <i>{entry.imageCount} photos</i>}
          </button>
          <div className={styles.postSource}><span><KindIcon kind={entry.targetKind} />{entrySource(entry)}</span><a href={entry.sourceHref}>Explore catalogue <ChevronRight size={15} /></a></div>
          <h2>{entry.title}</h2>
          {entry.description && <p className={styles.postDescription}>{entry.description}</p>}
          <div className={styles.postActions}>
            <div className={styles.postStatGroup}><button type="button" className={entry.likedByViewer ? styles.detailLiked : undefined} disabled={pending} onClick={onLike} aria-label="Like post"><Heart size={18} fill={entry.likedByViewer ? "currentColor" : "none"} /></button><button type="button" className={styles.postCountButton} onClick={() => onEngagement("likes")} aria-label={`View ${entry.likeCount} likes`}>{entry.likeCount}</button></div>
            <button type="button" onClick={() => commentInputRef.current?.focus()}><MessageCircle size={18} /> {entry.commentCount}</button>
            <span className={styles.postViewStat}><Eye size={17} /> {entry.viewCount}</span>
            <div className={styles.postStatGroup}><button type="button" onClick={onWishlist} aria-label="Add to wishlist"><Repeat2 size={18} /></button><button type="button" className={styles.postCountButton} onClick={() => onEngagement("wishlist")} aria-label={`View ${entry.wishlistCount} wishlists`}>{entry.wishlistCount}</button></div>
          </div>
          <section className={styles.postReplies}>
            <div className={styles.postRepliesHeader}><span>COMMENTS</span><button type="button" className={styles.commentFilterButton} onClick={() => setCommentFilter((current) => current === "top" ? "latest" : "top")}><SlidersHorizontal size={14} /> {commentFilter === "top" ? "Top" : "Latest"}</button></div>
            {visibleComments.map((comment) => {
              const commentLiked = likedComments.has(comment.id);
              return <article key={comment.id} className={styles.postComment} onPointerDown={(event) => { if (!(event.target as HTMLElement).closest("a, button")) startCommentPress(comment); }} onPointerUp={cancelCommentPress} onPointerCancel={cancelCommentPress} onPointerMove={cancelCommentPress}>
                <div className={styles.postCommentHead}>
                  <a href={demo ? entry.sourceHref : `/u/${encodeURIComponent(comment.author.username)}`} className={styles.postCommentAuthor}>
                    {comment.author.avatarUrl ? <img src={comment.author.avatarUrl} alt="" /> : <span>{comment.author.displayName.slice(0, 1)}</span>}
                    <span><b>{comment.author.displayName}</b><small>@{comment.author.username} · {relativeTime(comment.createdAt)}</small></span>
                  </a>
                  <button type="button" className={styles.postCommentMore} aria-label={`More options for ${comment.author.displayName}'s comment`} onPointerDown={cancelCommentPress} onClick={() => setCommentMenuTarget(comment)}><Ellipsis size={16} /></button>
                </div>
                <p>{comment.body}</p>
                <div className={styles.postCommentActions}><button type="button" className={commentLiked ? styles.detailLiked : undefined} onClick={() => setLikedComments((current) => { const next = new Set(current); if (next.has(comment.id)) next.delete(comment.id); else next.add(comment.id); return next; })}><Heart size={14} fill={commentLiked ? "currentColor" : "none"} /> {(comment.likeCount ?? 0) + (commentLiked ? 1 : 0)}</button><button type="button" onClick={() => replyToComment(comment)}>Reply</button></div>
              </article>;
            })}
            {!entry.comments.length && <p className={styles.postRepliesEmpty}>No replies yet. Start the conversation.</p>}
          </section>
        </div>
        <form className={styles.postCommentComposer} onSubmit={(event) => { event.preventDefault(); if (!commentBody.trim()) return; onSubmitComment(commentBody, replyingTo ?? undefined); setCommentBody(""); setReplyingTo(null); }}>
          {replyingTo && <div className={styles.postCommentComposerReply}><span>Replying to a collector</span><button type="button" onClick={() => { setReplyingTo(null); setCommentBody(""); }}>Cancel</button></div>}
          <textarea ref={commentInputRef} value={commentBody} onChange={(event) => setCommentBody(event.target.value)} placeholder="Share your thoughts..." maxLength={2000} rows={1} />
          <footer><small>{commentBody.length}/2000</small><button type="submit" disabled={!commentBody.trim() || pending} aria-label="Post comment"><Send size={15} /></button></footer>
        </form>
        {commentMenuTarget && <CommentActionSheet comment={commentMenuTarget} saved={savedComments.has(commentMenuTarget.id)} onClose={() => setCommentMenuTarget(null)} onReply={() => replyToComment(commentMenuTarget)} onSave={() => setSavedComments((current) => { const next = new Set(current); if (next.has(commentMenuTarget.id)) next.delete(commentMenuTarget.id); else next.add(commentMenuTarget.id); return next; })} />}
      </motion.article>
    </motion.div>,
    document.body,
  );
}

function EngagementSheet({ entry, kind, demo, onClose }: { entry: DiscoveryFeedEntryDTO; kind: "likes" | "wishlist"; demo: boolean; onClose: () => void }) {
  const collectors: DiscoveryAuthorDTO[] = kind === "likes" ? entry.likers : entry.wishlisters;
  const count = kind === "likes" ? entry.likeCount : entry.wishlistCount;
  const label = kind === "likes" ? "LIKED BY" : "WISHLISTED BY";
  return createPortal(
    <motion.div className={styles.wishlisterBackdrop} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={onClose}>
      <motion.section className={styles.wishlisterSheet} initial={{ y: 26, opacity: 0.75 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 26, opacity: 0.75 }} onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-label={`${label.toLowerCase()} ${entry.title}`}>
        <header><div><span>{label}</span><h3>{count} collectors</h3></div><button type="button" onClick={onClose} aria-label="Close"><X size={19} /></button></header>
        <p>{entry.title}</p>
        <div className={styles.wishlisterList}>
          {collectors.map((collector) => (
            <a key={collector.id} href={demo ? entry.sourceHref : `/u/${encodeURIComponent(collector.username)}`}>
              {collector.avatarUrl ? <img src={collector.avatarUrl} alt="" /> : <span>{collector.displayName.slice(0, 1)}</span>}
              <div><b>{collector.displayName}</b><small>@{collector.username}</small></div><ChevronRight size={17} />
            </a>
          ))}
          {!collectors.length && <div className={styles.wishlisterEmpty}>{kind === "likes" ? "Like details are private for this post." : "No public wishlist accounts yet."}</div>}
        </div>
      </motion.section>
    </motion.div>,
    document.body,
  );
}

function ProfileActionSheet({ entry, demo, onClose }: { entry: DiscoveryFeedEntryDTO; demo: boolean; onClose: () => void }) {
  const profileHref = demo ? entry.sourceHref : `/u/${encodeURIComponent(entry.author.username)}`;
  const copyProfile = () => {
    void navigator.clipboard?.writeText(new URL(profileHref, window.location.origin).toString());
    onClose();
  };
  const shareProfile = () => {
    const url = new URL(profileHref, window.location.origin).toString();
    if (navigator.share) void navigator.share({ title: entry.author.displayName, url }).catch(() => undefined);
    else void navigator.clipboard?.writeText(url);
    onClose();
  };
  return createPortal(
    <motion.div className={styles.commentMoreBackdrop} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={onClose}>
      <motion.section className={styles.commentMoreSheet} initial={{ y: 28, opacity: 0.7 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 28, opacity: 0.7 }} onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-label={`Actions for ${entry.author.displayName}`}>
        <div className={styles.sheetHandle} />
        <header><div><span>PROFILE ACTIONS</span><h3>{entry.author.displayName}</h3></div><button type="button" onClick={onClose} aria-label="Close profile actions"><X size={19} /></button></header>
        <button type="button" onClick={shareProfile}><Share2 size={17} /> Share profile</button>
        <button type="button" onClick={copyProfile}><Link2 size={17} /> Copy profile link</button>
        <button type="button" onClick={onClose}><VolumeX size={17} /> Mute posts</button>
        <button type="button" onClick={onClose}><Ban size={17} /> Block @{entry.author.username}</button>
        <button type="button" className={styles.commentMoreDanger} onClick={onClose}><Flag size={17} /> Report account</button>
      </motion.section>
    </motion.div>,
    document.body,
  );
}

function CommentFilterSheet({ value, onChange, onClose }: { value: "top" | "latest"; onChange: (value: "top" | "latest") => void; onClose: () => void }) {
  return createPortal(
    <motion.div className={styles.commentMoreBackdrop} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={onClose}>
      <motion.section className={styles.commentMoreSheet} initial={{ y: 28, opacity: 0.7 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 28, opacity: 0.7 }} onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-label="Comment filters">
        <div className={styles.sheetHandle} />
        <header><div><span>COMMENT VIEW</span><h3>Choose a filter</h3></div><button type="button" onClick={onClose} aria-label="Close filters"><X size={19} /></button></header>
        <button type="button" className={value === "top" ? styles.commentFilterSelected : undefined} onClick={() => onChange("top")}><span><b>Top comments</b><small>Most liked replies first</small></span>{value === "top" && <Check size={17} />}</button>
        <button type="button" className={value === "latest" ? styles.commentFilterSelected : undefined} onClick={() => onChange("latest")}><span><b>Latest comments</b><small>Newest replies first</small></span>{value === "latest" && <Check size={17} />}</button>
      </motion.section>
    </motion.div>,
    document.body,
  );
}

function CommentActionSheet({ comment, saved, onClose, onReply, onSave }: { comment: DiscoveryCommentDTO; saved: boolean; onClose: () => void; onReply: () => void; onSave: () => void }) {
  const copyComment = () => {
    void navigator.clipboard?.writeText(comment.body);
    onClose();
  };
  return createPortal(
    <motion.div className={styles.commentMoreBackdrop} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={onClose}>
      <motion.section className={styles.commentMoreSheet} initial={{ y: 28, opacity: 0.7 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 28, opacity: 0.7 }} onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-label="Comment options">
        <div className={styles.sheetHandle} />
        <header><div><span>COMMENT OPTIONS</span><h3>{comment.author.displayName}</h3></div><button type="button" onClick={onClose} aria-label="Close comment options"><X size={19} /></button></header>
        <button type="button" onClick={onReply}><MessageCircle size={17} /> Reply</button>
        <button type="button" onClick={copyComment}><Bookmark size={17} /> Copy text</button>
        <button type="button" onClick={() => { onSave(); onClose(); }}><Bookmark size={17} /> {saved ? "Remove saved comment" : "Save comment"}</button>
        <button type="button" className={styles.commentMoreDanger} onClick={onClose}><Ellipsis size={17} /> Report comment</button>
      </motion.section>
    </motion.div>,
    document.body,
  );
}

function WishlistComposer({ entry, viewer, pending, overMedia, onClose, onSubmit }: { entry: DiscoveryFeedEntryDTO; viewer: ViewerDTO | null; pending: boolean; overMedia: boolean; onClose: () => void; onSubmit: (quote: string) => void }) {
  const [quote, setQuote] = useState("");
  useEffect(() => {
    const bodyOverflow = document.body.style.overflow;
    const rootOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = bodyOverflow;
      document.documentElement.style.overflow = rootOverflow;
    };
  }, []);
  return createPortal(
    <motion.div className={`${styles.sheetBackdrop} ${overMedia ? styles.sheetBackdropOverMedia : ""}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={onClose}>
      <motion.section className={`${styles.sheet} ${overMedia ? styles.wishlistDrawerOverMedia : ""}`} initial={overMedia ? { y: 56, opacity: 0.65 } : { y: 40, opacity: 0.7 }} animate={{ y: 0, opacity: 1 }} exit={overMedia ? { y: 42, opacity: 0.6 } : { y: 40, opacity: 0.7 }} transition={{ type: "spring", stiffness: 340, damping: 31 }} onMouseDown={(event) => event.stopPropagation()}>
        <div className={styles.sheetHandle} />
        <header><div><span>ADD TO YOUR WISHLIST</span><h3>{entry.title}</h3></div><button type="button" onClick={onClose} aria-label="Close wishlist"><X size={19} /></button></header>
        <div className={styles.quotedTarget}><Repeat2 size={17} /><div><b>{kindLabels[entry.targetKind]} / {entrySource(entry)}</b><span>{entry.description ?? "Keep this one in sight."}</span></div></div>
        <label className={styles.quoteLabel}>YOUR NOTE <em>optional</em><textarea value={quote} onChange={(event) => setQuote(event.target.value)} placeholder={viewer ? "Why do you want this?" : "Sign in to post a quote"} maxLength={600} /></label>
        <footer><span>{quote.length}/600</span><button type="button" disabled={pending} onClick={() => onSubmit(quote)}><Repeat2 size={16} /> {viewer ? "Wishlist" : "Sign in to wishlist"}</button></footer>
      </motion.section>
    </motion.div>,
    document.body,
  );
}
