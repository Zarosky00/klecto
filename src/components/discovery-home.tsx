/* eslint-disable @next/next/no-img-element */
"use client";

import { AnimatePresence, motion } from "motion/react";
import {
  Bell,
  ChevronRight,
  Ellipsis,
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
  Sparkles,
  X,
} from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createCatalogCommentAction,
  createWishlistPostAction,
  setCollectionLikeAction,
  setItemLikeAction,
  setSubcollectionLikeAction,
} from "@/app/actions/catalog";
import type { DiscoveryCommentDTO, DiscoveryFeedDTO, DiscoveryFeedEntryDTO, ViewerDTO } from "@/lib/catalog-types";
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

export function DiscoveryHome({ feed, viewer }: { feed: DiscoveryFeedDTO; viewer: ViewerDTO | null }) {
  const router = useRouter();
  const [filter, setFilter] = useState<DiscoveryFilter>("all");
  const [entries, setEntries] = useState(feed.entries);
  const [commentTarget, setCommentTarget] = useState<DiscoveryFeedEntryDTO | null>(null);
  const [wishlistTarget, setWishlistTarget] = useState<DiscoveryFeedEntryDTO | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const visibleEntries = useMemo(() => filter === "all" ? entries : entries.filter((entry) => entry.kind === filter), [entries, filter]);

  const showNotice = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(null), 2800);
  };

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

  const addComment = (body: string) => {
    const target = commentTarget;
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
    };
    const addLocalComment = () => setEntries((current) => updateEntry(current, target.id, (item) => ({
      ...item,
      commentCount: item.commentCount + 1,
      comments: [...item.comments, newComment].slice(-4),
    })));
    if (feed.isDemoFallback) {
      addLocalComment();
      setCommentTarget(null);
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
        setCommentTarget(null);
        showNotice("Comment posted.");
      })();
    });
  };

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
              onLike={() => toggleLike(entry)} onComment={() => setCommentTarget(entry)} onWishlist={() => setWishlistTarget(entry)} />
          ))}
        </AnimatePresence>
      </div>

      {visibleEntries.length === 0 && <div className={styles.empty}><Layers3 size={22} /><strong>No matching shelves yet.</strong><span>Try another part of the catalogue.</span></div>}

      <AnimatePresence>
        {commentTarget && <CommentDrawer entry={commentTarget} pending={isPending} onClose={() => setCommentTarget(null)} onSubmit={addComment} />}
        {wishlistTarget && <WishlistComposer entry={wishlistTarget} viewer={viewer} pending={isPending} onClose={() => setWishlistTarget(null)} onSubmit={createWishlist} />}
        {notice && <motion.div className={styles.notice} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}>{notice}</motion.div>}
      </AnimatePresence>
    </section>
  );
}

function DiscoveryCard({ entry, index, demo, pending, onLike, onComment, onWishlist }: {
  entry: DiscoveryFeedEntryDTO;
  index: number;
  demo: boolean;
  pending: boolean;
  onLike: () => void;
  onComment: () => void;
  onWishlist: () => void;
}) {
  const isWishlist = entry.kind === "wishlist";
  const sourceCard = (
    <>
      <a href={entry.sourceHref} className={`collection-label ${styles.collectionLabel}`}>
        <span><KindIcon kind={entry.targetKind} /></span><span>{entrySource(entry)}</span><b>{kindLabels[entry.targetKind]}</b><ChevronRight size={14} />
      </a>
      <h2>{entry.title}</h2>
      {entry.description && <p className="post-copy">{entry.description}</p>}
      <a href={entry.sourceHref} className={`media-frame ${styles.media}`} aria-label={`Open ${entry.title}`}>
        {entry.imageUrls[0] ? <img src={entry.imageUrls[0]} alt="" /> : <span className={styles.mediaFallback}><ImageIcon size={28} /></span>}
        <span className={`mood-tag ${styles.kindTag}`}><KindIcon kind={entry.targetKind} size={13} />{kindLabels[entry.targetKind]}</span>
        {entry.imageCount > 1 && <span className="image-count">{entry.imageCount} photos</span>}
      </a>
      <div className="metadata-row">
        <span>{entry.targetKind === "collection" ? "Full catalogue" : entry.collection.name}</span>
        {entry.subcollection && <span>{entry.subcollection.name}</span>}
      </div>
      <footer className="post-actions">
        <button type="button" className={entry.likedByViewer ? "liked" : undefined} disabled={pending} onClick={onLike}><Heart size={19} fill={entry.likedByViewer ? "currentColor" : "none"} /><span>{entry.likeCount}</span></button>
        <button type="button" disabled={pending} onClick={onComment}><MessageCircle size={19} /><span>{entry.commentCount}</span></button>
        <button type="button" className="wished" disabled={pending} onClick={onWishlist}><Repeat2 size={20} /><span>Wishlist</span></button>
        <a href={entry.sourceHref} className={styles.openAction}>Explore <ChevronRight size={18} /></a>
      </footer>
    </>
  );
  return (
    <motion.article className={`feed-card ${styles.legacyCard} ${isWishlist ? styles.wishlist : ""}`} layout
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
        ? <div className={styles.repostBox}><div className={styles.repostBoxLabel}><Repeat2 size={14} /> Original {kindLabels[entry.targetKind].toLowerCase()}</div>{sourceCard}</div>
        : sourceCard}
    </motion.article>
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
