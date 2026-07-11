/* eslint-disable @next/next/no-img-element */
"use client";

import { AnimatePresence, motion } from "motion/react";
import {
  Bell,
  Bookmark,
  ChevronRight,
  Ellipsis,
  Eye,
  Heart,
  Image as ImageIcon,
  Layers3,
  MessageCircle,
  PackageOpen,
  Plus,
  Repeat2,
  Search,
  Send,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  X,
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
  const hours = Math.floor(difference / 3_600_000);
  if (hours < 1) return "now";
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return days < 7 ? `${days}d` : new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(value));
}

function updateEntry(entries: DiscoveryFeedEntryDTO[], id: string, recipe: (entry: DiscoveryFeedEntryDTO) => DiscoveryFeedEntryDTO) {
  return entries.map((entry) => entry.id === id ? recipe(entry) : entry);
}

export function DiscoveryHome({ feed, viewer, initialPostId }: { feed: DiscoveryFeedDTO; viewer: ViewerDTO | null; initialPostId?: string }) {
  const router = useRouter();
  const [filter, setFilter] = useState<DiscoveryFilter>("all");
  const [entries, setEntries] = useState(feed.entries);
  const [commentTarget, setCommentTarget] = useState<DiscoveryFeedEntryDTO | null>(null);
  const [wishlistTarget, setWishlistTarget] = useState<DiscoveryFeedEntryDTO | null>(null);
  const [mediaTarget, setMediaTarget] = useState<DiscoveryFeedEntryDTO | null>(null);
  const [postTarget, setPostTarget] = useState<DiscoveryFeedEntryDTO | null>(() => feed.entries.find((entry) => entry.id === initialPostId) ?? null);
  const [wishlisterTarget, setWishlisterTarget] = useState<DiscoveryFeedEntryDTO | null>(null);
  const [engagementTarget, setEngagementTarget] = useState<{ entry: DiscoveryFeedEntryDTO; kind: "likes" | "wishlist" } | null>(null);
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
    const optimistic = () => setEntries((current) => updateEntry(current, entry.id, (item) => ({
      ...item,
      likedByViewer: active,
      likeCount: Math.max(0, item.likeCount + (active ? 1 : -1)),
    })));
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

  const addCommentForTarget = (target: DiscoveryFeedEntryDTO | null, body: string, closeDrawer = true) => {
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
    };
    if (feed.isDemoFallback) {
      addLocalComment();
      if (closeDrawer) setCommentTarget(null);
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
        if (closeDrawer) setCommentTarget(null);
        showNotice("Comment posted.");
      })();
    });
  };
  const addComment = (body: string) => addCommentForTarget(commentTarget, body);

  const createWishlist = (quote: string) => {
    const target = wishlistTarget;
    if (!target) return;
    if (feed.isDemoFallback) {
      setWishlistTarget(null);
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
    imageUrls: item.imageUrl ? [item.imageUrl] : [],
    imageCount: item.imageUrl ? 1 : 0,
    viewCount: 0,
    subcollection: (catalogTarget ?? mediaTarget ?? postTarget)?.subcollection ?? (item.subcollectionId ? {
      id: item.subcollectionId,
      slug: item.subcollectionId,
      name: item.subcollectionName ?? "Section",
      kind: "custom",
    } : null),
    likeCount: 0,
    likedByViewer: false,
    commentCount: 0,
    comments: [],
    wishlistCount: 0,
    wishlisters: [],
    likers: [],
  });

  const openPreviewMedia = (item: DiscoveryFeedEntryDTO["catalogPreview"]["items"][number]) => {
    setCatalogTarget(null);
    setMediaTarget(previewItemEntry(item));
  };
  const openPreviewComment = (item: DiscoveryFeedEntryDTO["catalogPreview"]["items"][number]) => {
    closePost();
    setCatalogTarget(null);
    setMediaTarget(null);
    setCommentTarget(previewItemEntry(item));
  };
  const openPreviewWishlist = (item: DiscoveryFeedEntryDTO["catalogPreview"]["items"][number]) => {
    closePost();
    setCatalogTarget(null);
    setMediaTarget(null);
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
            <DiscoveryCard key={entry.id} entry={entry} index={index} demo={feed.isDemoFallback} pending={isPending}
              onLike={() => toggleLike(entry)} onComment={() => setCommentTarget(entry)} onWishlist={() => setWishlistTarget(entry)}
              onMedia={() => setMediaTarget(entry)} onOpenPost={() => openPost(entry)} onWishlisters={() => setWishlisterTarget(entry)} />
          ))}
        </AnimatePresence>
      </div>

      {visibleEntries.length === 0 && <div className={styles.empty}><Layers3 size={22} /><strong>No matching shelves yet.</strong><span>Try another part of the catalogue.</span></div>}

      <AnimatePresence>
        {commentTarget && <CommentDrawer entry={commentTarget} pending={isPending} onClose={() => setCommentTarget(null)} onSubmit={addComment} />}
        {wishlistTarget && <WishlistComposer entry={wishlistTarget} viewer={viewer} pending={isPending} onClose={() => setWishlistTarget(null)} onSubmit={createWishlist} />}
        {postTarget && <PostDetail entry={postTarget} demo={feed.isDemoFallback} pending={isPending} onClose={closePost}
          onLike={() => toggleLike(postTarget)} onWishlist={() => setWishlistTarget(postTarget)}
          onMedia={() => setMediaTarget(postTarget)}
          onEngagement={(kind) => setEngagementTarget({ entry: postTarget, kind })}
          onSubmitComment={(body) => addCommentForTarget(postTarget, body, false)} />}
        {mediaTarget && <MediaViewer entry={mediaTarget} onClose={() => setMediaTarget(null)} onViewCollection={() => setCatalogTarget(mediaTarget)} />}
        {catalogTarget && <CatalogExplorerSheet entry={catalogTarget} demo={feed.isDemoFallback} onClose={() => setCatalogTarget(null)}
          onItemMedia={openPreviewMedia} onItemComment={openPreviewComment} onItemWishlist={openPreviewWishlist} />}
        {wishlisterTarget && <EngagementSheet entry={wishlisterTarget} kind="wishlist" demo={feed.isDemoFallback} onClose={() => setWishlisterTarget(null)} />}
        {engagementTarget && <EngagementSheet entry={engagementTarget.entry} kind={engagementTarget.kind} demo={feed.isDemoFallback} onClose={() => setEngagementTarget(null)} />}
        {notice && <motion.div className={styles.notice} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}>{notice}</motion.div>}
      </AnimatePresence>
    </section>
  );
}

function DiscoveryCard({ entry, index, demo, pending, onLike, onComment, onWishlist, onMedia, onOpenPost, onWishlisters }: {
  entry: DiscoveryFeedEntryDTO;
  index: number;
  demo: boolean;
  pending: boolean;
  onLike: () => void;
  onComment: () => void;
  onWishlist: () => void;
  onMedia: () => void;
  onOpenPost: () => void;
  onWishlisters: () => void;
}) {
  const isWishlist = entry.kind === "wishlist";
  const sourceCard = (
    <>
      <a href={entry.sourceHref} className={`collection-label ${styles.collectionLabel}`}>
        <span><KindIcon kind={entry.targetKind} /></span><span>{entrySource(entry)}</span><b>{kindLabels[entry.targetKind]}</b><ChevronRight size={14} />
      </a>
      <h2>{entry.title}</h2>
      {entry.description && <p className="post-copy">{entry.description}</p>}
      <button type="button" className={`media-frame ${styles.media}`} onClick={onMedia} aria-label={`View ${entry.title} photos`}>
        {entry.imageUrls[0] ? <img src={entry.imageUrls[0]} alt="" /> : <span className={styles.mediaFallback}><ImageIcon size={28} /></span>}
        <span className={`mood-tag ${styles.kindTag}`}><KindIcon kind={entry.targetKind} size={13} />{kindLabels[entry.targetKind]}</span>
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
          <span><strong>{entry.author.displayName}{entry.author.isVerified && <ShieldCheck size={14} />}</strong><small>@{entry.author.username} / {relativeTime(entry.createdAt)}</small></span>
        </a>
        <button type="button" className="icon-button" aria-label="More catalog options"><Ellipsis size={19} /></button>
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

function CommentDrawer({ entry, pending, onClose, onSubmit }: { entry: DiscoveryFeedEntryDTO; pending: boolean; onClose: () => void; onSubmit: (body: string) => void }) {
  const [body, setBody] = useState("");
  return (
    <motion.div className={styles.sheetBackdrop} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={onClose}>
      <motion.aside className={`${styles.sheet} ${styles.commentDrawer}`} initial={{ x: 36, opacity: 0.7 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 36, opacity: 0.7 }} onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-label="Comments">
        <div className={styles.sheetHandle} />
        <header><div><span>CONVERSATION</span><h3>{entry.commentCount} comments</h3></div><button type="button" onClick={onClose} aria-label="Close comments"><X size={19} /></button></header>
        <div className={styles.commentContext}>
          {entry.imageUrls[0] ? <img src={entry.imageUrls[0]} alt="" /> : <span><ImageIcon size={18} /></span>}
          <div><b>{entry.title}</b><small>{entrySource(entry)}</small></div>
          <a href={entry.sourceHref} aria-label="Open original"><ChevronRight size={18} /></a>
        </div>
        <div className={styles.commentSort}><span>Top comments</span><small>{entry.comments.length ? "Open the original to view all" : "Start the conversation"}</small></div>
        <div className={styles.commentList}>
          {entry.comments.map((comment) => (
            <article key={comment.id} className={styles.commentRow}>
              {comment.author.avatarUrl ? <img src={comment.author.avatarUrl} alt="" /> : <span>{comment.author.displayName.slice(0, 1)}</span>}
              <div><strong>{comment.author.displayName}<small>@{comment.author.username} / {relativeTime(comment.createdAt)}</small></strong><p>{comment.body}</p><button type="button" onClick={() => setBody((current) => current ? current : `@${comment.author.username} `)}>Reply</button></div>
            </article>
          ))}
          {!entry.comments.length && <div className={styles.commentEmpty}><MessageCircle size={20} /><span>No replies yet. Be the first to add to this shelf.</span></div>}
        </div>
        <form className={styles.commentComposer} onSubmit={(event) => { event.preventDefault(); onSubmit(body); }}>
          <textarea value={body} onChange={(event) => setBody(event.target.value)} placeholder="Add to the conversation..." maxLength={2000} autoFocus />
          <footer><span>{body.length}/2000</span><button type="submit" disabled={!body.trim() || pending}><Send size={16} /> Reply</button></footer>
        </form>
      </motion.aside>
    </motion.div>
  );
}

function MediaViewer({ entry, onClose, onViewCollection }: { entry: DiscoveryFeedEntryDTO; onClose: () => void; onViewCollection: () => void }) {
  const images = entry.imageUrls.length ? entry.imageUrls : [];
  const [activeIndex, setActiveIndex] = useState(0);
  const [immersive, setImmersive] = useState(false);
  const [zoom, setZoom] = useState(1);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinchDistance = useRef<number | null>(null);
  const pinchStartZoom = useRef(1);
  const didPinch = useRef(false);
  const lastImageTap = useRef(0);
  const goTo = useCallback((index: number) => {
    if (!images.length || !scrollRef.current) return;
    const next = (index + images.length) % images.length;
    scrollRef.current.scrollTo({ left: scrollRef.current.clientWidth * next, behavior: "smooth" });
    setActiveIndex(next);
    setZoom(1);
  }, [images.length]);
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
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
    setImmersive((active) => !active);
  };
  return createPortal(
    <motion.div className={`${styles.mediaBackdrop} ${immersive ? styles.mediaBackdropFullscreen : ""}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={onClose}>
      <motion.section className={`${styles.mediaViewer} ${immersive ? styles.mediaViewerFullscreen : ""}`} initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }} onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-label={`${entry.title} photos`}>
        <header><div><span>PHOTOS</span><h3>{entry.title}</h3></div><button type="button" onClick={onClose} aria-label="Close photo viewer"><X size={21} /></button></header>
        <div ref={scrollRef} className={styles.mediaTrack} onPointerDown={updatePointer} onPointerMove={updatePointer} onPointerUp={clearPointer} onPointerCancel={clearPointer} onScroll={(event) => {
          const width = event.currentTarget.clientWidth || 1;
          const nextIndex = Math.round(event.currentTarget.scrollLeft / width);
          if (activeIndex !== nextIndex) setZoom(1);
          setActiveIndex(nextIndex);
        }}>
          {images.length ? images.map((image, index) => <img key={`${image}-${index}`} src={image} alt={`${entry.title} photo ${index + 1}`} draggable={false} onClick={toggleFullscreen} style={index === activeIndex ? { transform: `scale(${zoom})` } : undefined} />) : <div className={styles.mediaEmpty}><ImageIcon size={32} /><span>No images added yet</span></div>}
        </div>
        <footer>
          <span>{images.length ? `${activeIndex + 1} / ${images.length}` : "0 photos"}</span>
          {images.length > 1 && <div className={styles.mediaDots}>{images.map((_, index) => <button key={index} type="button" className={index === activeIndex ? styles.activeDot : undefined} onClick={() => goTo(index)} aria-label={`View photo ${index + 1}`} />)}</div>}
          <button type="button" className={styles.viewCollectionButton} onClick={onViewCollection}><Layers3 size={15} /> View collection</button>
        </footer>
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

function PostDetail({ entry, demo, pending, onClose, onLike, onWishlist, onMedia, onEngagement, onSubmitComment }: {
  entry: DiscoveryFeedEntryDTO;
  demo: boolean;
  pending: boolean;
  onClose: () => void;
  onLike: () => void;
  onWishlist: () => void;
  onMedia: () => void;
  onEngagement: (kind: "likes" | "wishlist") => void;
  onSubmitComment: (body: string) => void;
}) {
  const [commentBody, setCommentBody] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [commentFilter, setCommentFilter] = useState<"top" | "latest">("top");
  const [likedComments, setLikedComments] = useState<Set<string>>(() => new Set());
  const commentInputRef = useRef<HTMLTextAreaElement | null>(null);
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
          <a href={demo ? entry.sourceHref : `/u/${encodeURIComponent(entry.author.username)}`} className={styles.postAuthor}>
            {entry.author.avatarUrl ? <img src={entry.author.avatarUrl} alt="" /> : <span>{entry.author.displayName.slice(0, 1)}</span>}
            <div><b>{entry.author.displayName}</b><small>@{entry.author.username} / {relativeTime(entry.createdAt)}</small></div>
          </a>
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
              return <article key={comment.id} className={styles.postComment}>
                <a href={demo ? entry.sourceHref : `/u/${encodeURIComponent(comment.author.username)}`} className={styles.postCommentAuthor}>
                  {comment.author.avatarUrl ? <img src={comment.author.avatarUrl} alt="" /> : <span>{comment.author.displayName.slice(0, 1)}</span>}
                  <span><b>{comment.author.displayName}</b><small>@{comment.author.username} · {relativeTime(comment.createdAt)}</small></span>
                </a>
                <p>{comment.body}</p>
                <div className={styles.postCommentActions}><button type="button" className={commentLiked ? styles.detailLiked : undefined} onClick={() => setLikedComments((current) => { const next = new Set(current); if (next.has(comment.id)) next.delete(comment.id); else next.add(comment.id); return next; })}><Heart size={14} fill={commentLiked ? "currentColor" : "none"} /> {(comment.likeCount ?? 0) + (commentLiked ? 1 : 0)}</button><button type="button" onClick={() => { setReplyingTo(comment.id); setCommentBody(`@${comment.author.username} `); window.setTimeout(() => commentInputRef.current?.focus(), 0); }}>Reply</button></div>
              </article>;
            })}
            {!entry.comments.length && <p className={styles.postRepliesEmpty}>No replies yet. Start the conversation.</p>}
            <form className={styles.postCommentComposer} onSubmit={(event) => { event.preventDefault(); if (!commentBody.trim()) return; onSubmitComment(commentBody); setCommentBody(""); setReplyingTo(null); }}>
              <div className={styles.postCommentComposerHead}><span>{replyingTo ? "REPLYING TO A COLLECTOR" : "ADD A COMMENT"}</span>{replyingTo && <button type="button" onClick={() => { setReplyingTo(null); setCommentBody(""); }}>Cancel reply</button>}</div>
              <textarea ref={commentInputRef} value={commentBody} onChange={(event) => setCommentBody(event.target.value)} placeholder="Share a thought about this shelf..." maxLength={2000} />
              <footer><small>{commentBody.length}/2000</small><button type="submit" disabled={!commentBody.trim() || pending}><Send size={15} /> Comment</button></footer>
            </form>
          </section>
        </div>
      </motion.article>
    </motion.div>,
    document.body,
  );
}

function EngagementSheet({ entry, kind, demo, onClose }: { entry: DiscoveryFeedEntryDTO; kind: "likes" | "wishlist"; demo: boolean; onClose: () => void }) {
  const collectors: DiscoveryAuthorDTO[] = kind === "likes" ? entry.likers : entry.wishlisters;
  const count = kind === "likes" ? entry.likeCount : entry.wishlistCount;
  const label = kind === "likes" ? "LIKED BY" : "WISHLISTED BY";
  return (
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
    </motion.div>
  );
}

function WishlistComposer({ entry, viewer, pending, onClose, onSubmit }: { entry: DiscoveryFeedEntryDTO; viewer: ViewerDTO | null; pending: boolean; onClose: () => void; onSubmit: (quote: string) => void }) {
  const [quote, setQuote] = useState("");
  return (
    <motion.div className={styles.sheetBackdrop} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={onClose}>
      <motion.section className={styles.sheet} initial={{ y: 40, opacity: 0.7 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0.7 }} onMouseDown={(event) => event.stopPropagation()}>
        <div className={styles.sheetHandle} />
        <header><div><span>ADD TO YOUR WISHLIST</span><h3>{entry.title}</h3></div><button type="button" onClick={onClose} aria-label="Close wishlist"><X size={19} /></button></header>
        <div className={styles.quotedTarget}><Repeat2 size={17} /><div><b>{kindLabels[entry.targetKind]} / {entrySource(entry)}</b><span>{entry.description ?? "Keep this one in sight."}</span></div></div>
        <label className={styles.quoteLabel}>YOUR NOTE <em>optional</em><textarea value={quote} onChange={(event) => setQuote(event.target.value)} placeholder={viewer ? "Why do you want this?" : "Sign in to post a quote"} maxLength={600} /></label>
        <footer><span>{quote.length}/600</span><button type="button" disabled={pending} onClick={() => onSubmit(quote)}><Repeat2 size={16} /> {viewer ? "Wishlist" : "Sign in to wishlist"}</button></footer>
      </motion.section>
    </motion.div>
  );
}
