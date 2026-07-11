/* eslint-disable @next/next/no-img-element */
"use client";

import { AnimatePresence, motion } from "motion/react";
import {
  ArrowUpRight,
  ChevronRight,
  Heart,
  Image as ImageIcon,
  Layers3,
  MessageCircle,
  PackageOpen,
  Repeat2,
  Send,
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
import type { DiscoveryFeedDTO, DiscoveryFeedEntryDTO, ViewerDTO } from "@/lib/catalog-types";
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
  if (entry.targetKind === "subcollection") return `${entry.subcollection?.name ?? "Section"} · ${entry.collection.name}`;
  return `${entry.subcollection?.name ?? "Unsorted"} · ${entry.collection.name}`;
}

function relativeTime(value: string) {
  const difference = Math.max(0, Date.now() - new Date(value).getTime());
  const hours = Math.floor(difference / 3_600_000);
  if (hours < 1) return "now";
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return days < 7 ? `${days}d` : new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(value));
}

function updateEntry(
  entries: DiscoveryFeedEntryDTO[],
  id: string,
  recipe: (entry: DiscoveryFeedEntryDTO) => DiscoveryFeedEntryDTO,
) {
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
  const visibleEntries = useMemo(
    () => filter === "all" ? entries : entries.filter((entry) => entry.kind === filter),
    [entries, filter],
  );

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
        if (!result.ok) {
          showNotice(result.error ?? "Could not update the like.");
          return;
        }
        optimistic();
      })();
    });
  };

  const addComment = (body: string) => {
    const target = commentTarget;
    if (!target || !body.trim()) return;
    if (feed.isDemoFallback) {
      setEntries((current) => updateEntry(current, target.id, (item) => ({ ...item, commentCount: item.commentCount + 1 })));
      setCommentTarget(null);
      showNotice("Comment added to this demo shelf.");
      return;
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
        if (!result.ok) {
          showNotice(result.error ?? "Could not add the comment.");
          return;
        }
        setEntries((current) => updateEntry(current, target.id, (item) => ({ ...item, commentCount: item.commentCount + 1 })));
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
      showNotice(quote.trim() ? "Your quoted wishlist is ready in this demo." : "Added to your demo wishlist.");
      return;
    }
    startTransition(() => {
      void (async () => {
        const result = await createWishlistPostAction({
          targetType: target.targetKind,
          targetId: target.targetId,
          quoteText: quote.trim() || null,
        });
        if (!result.ok) {
          showNotice(result.error ?? "Could not add that wishlist.");
          return;
        }
        setWishlistTarget(null);
        showNotice("Wishlisted — your note is now part of the feed.");
        router.refresh();
      })();
    });
  };

  return (
    <section className={styles.discovery}>
      <header className={styles.topbar}>
        <div>
          <span className={styles.eyebrow}>DISCOVER WHAT PEOPLE KEEP</span>
          <h1>From their shelf<br />to your world.</h1>
        </div>
        <div className={styles.topbarCopy}>
          <Sparkles size={17} />
          <span>Public collections, stories, and finds chosen for you.</span>
        </div>
      </header>

      <div className={styles.filterRow} role="tablist" aria-label="Filter discovery feed">
        {filterLabels.map((choice) => (
          <button key={choice.id} type="button" role="tab" aria-selected={filter === choice.id}
            className={filter === choice.id ? styles.filterActive : undefined}
            onClick={() => setFilter(choice.id)}>{choice.label}</button>
        ))}
      </div>

      {feed.isDemoFallback && (
        <div className={styles.demoNote}><Sparkles size={16} /><span>Showing the Arjun Kapoor sample shelf while your public feed grows.</span></div>
      )}

      <div className={styles.feed}>
        <AnimatePresence initial={false} mode="popLayout">
          {visibleEntries.map((entry, index) => (
            <DiscoveryCard
              key={entry.id}
              entry={entry}
              index={index}
              demo={feed.isDemoFallback}
              pending={isPending}
              onLike={() => toggleLike(entry)}
              onComment={() => setCommentTarget(entry)}
              onWishlist={() => setWishlistTarget(entry)}
            />
          ))}
        </AnimatePresence>
      </div>

      {visibleEntries.length === 0 && (
        <div className={styles.empty}><Layers3 size={22} /><strong>No {filterLabels.find((entry) => entry.id === filter)?.label.toLocaleLowerCase()} here yet.</strong><span>Try another part of the catalogue.</span></div>
      )}

      <AnimatePresence>
        {commentTarget && <CommentComposer entry={commentTarget} pending={isPending} onClose={() => setCommentTarget(null)} onSubmit={addComment} />}
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
  return (
    <motion.article className={`${styles.card} ${isWishlist ? styles.wishlist : ""}`} layout
      initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.98 }}
      transition={{ delay: Math.min(index, 6) * 0.045, duration: 0.38, ease: [0.16, 1, 0.3, 1] }}>
      {isWishlist ? (
        <div className={styles.wishlistLabel}><Repeat2 size={15} /><span>{entry.author.displayName} wishlisted this</span></div>
      ) : (
        <div className={styles.cardHead}>
          <a href={demo ? entry.sourceHref : `/u/${encodeURIComponent(entry.author.username)}`} className={styles.author}>
            {entry.author.avatarUrl ? <img src={entry.author.avatarUrl} alt="" /> : <span>{entry.author.displayName.slice(0, 1)}</span>}
            <b>{entry.author.displayName}{entry.author.isVerified ? <i>✓</i> : null}</b><small>@{entry.author.username} · {relativeTime(entry.createdAt)}</small>
          </a>
          <span className={styles.kindPill}><KindIcon kind={entry.kind} />{kindLabels[entry.kind]}</span>
        </div>
      )}

      {isWishlist && entry.quoteText && <p className={styles.quote}>{entry.quoteText}</p>}

      <a href={entry.sourceHref} className={`${styles.catalogueCard} ${styles[`type${entry.targetKind[0].toUpperCase()}${entry.targetKind.slice(1)}` as "typeCollection"]}`}>
        <div className={styles.cover}>
          {entry.imageUrls[0] ? <img src={entry.imageUrls[0]} alt="" /> : <span className={styles.coverFallback}><ImageIcon size={28} /></span>}
          <span className={styles.coverKind}><KindIcon kind={entry.targetKind} /> {kindLabels[entry.targetKind]}</span>
          {entry.imageCount > 1 && <span className={styles.photoCount}>{entry.imageCount} photos</span>}
        </div>
        <div className={styles.catalogueCopy}>
          <span className={styles.sourceLine}>{entrySource(entry)}</span>
          <h2>{entry.title}</h2>
          {entry.description && <p>{entry.description}</p>}
          <span className={styles.explore}>Explore the catalogue <ArrowUpRight size={15} /></span>
        </div>
      </a>

      {isWishlist && <div className={styles.wishlistAuthor}><span>{entry.author.displayName} · @{entry.author.username}</span><span>{relativeTime(entry.createdAt)}</span></div>}

      <footer className={styles.actions}>
        <button type="button" className={entry.likedByViewer ? styles.liked : undefined} disabled={pending} onClick={onLike} aria-label="Like this catalog entry"><Heart size={18} fill={entry.likedByViewer ? "currentColor" : "none"} /><span>{entry.likeCount}</span></button>
        <button type="button" disabled={pending} onClick={onComment} aria-label="Comment on this catalog entry"><MessageCircle size={18} /><span>{entry.commentCount}</span></button>
        <button type="button" className={styles.wishlistAction} disabled={pending} onClick={onWishlist}><Repeat2 size={18} /><span>Wishlist</span></button>
        <a href={entry.sourceHref} className={styles.openAction} aria-label="Open the source catalogue"><ChevronRight size={20} /></a>
      </footer>
    </motion.article>
  );
}

function CommentComposer({ entry, pending, onClose, onSubmit }: { entry: DiscoveryFeedEntryDTO; pending: boolean; onClose: () => void; onSubmit: (body: string) => void }) {
  const [body, setBody] = useState("");
  return (
    <motion.div className={styles.sheetBackdrop} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={onClose}>
      <motion.section className={styles.sheet} initial={{ y: 40, opacity: 0.7 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0.7 }} onMouseDown={(event) => event.stopPropagation()}>
        <div className={styles.sheetHandle} />
        <header><div><span>COMMENT ON {kindLabels[entry.targetKind].toUpperCase()}</span><h3>{entry.title}</h3></div><button type="button" onClick={onClose} aria-label="Close comment composer"><X size={19} /></button></header>
        <textarea value={body} onChange={(event) => setBody(event.target.value)} placeholder="Add something thoughtful…" maxLength={2000} autoFocus />
        <footer><span>{body.length}/2000</span><button type="button" disabled={!body.trim() || pending} onClick={() => onSubmit(body)}><Send size={16} /> Post comment</button></footer>
      </motion.section>
    </motion.div>
  );
}

function WishlistComposer({ entry, viewer, pending, onClose, onSubmit }: { entry: DiscoveryFeedEntryDTO; viewer: ViewerDTO | null; pending: boolean; onClose: () => void; onSubmit: (quote: string) => void }) {
  const [quote, setQuote] = useState("");
  return (
    <motion.div className={styles.sheetBackdrop} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={onClose}>
      <motion.section className={`${styles.sheet} ${styles.wishlistSheet}`} initial={{ y: 40, opacity: 0.7 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0.7 }} onMouseDown={(event) => event.stopPropagation()}>
        <div className={styles.sheetHandle} />
        <header><div><span>ADD TO YOUR WISHLIST</span><h3>{entry.title}</h3></div><button type="button" onClick={onClose} aria-label="Close wishlist composer"><X size={19} /></button></header>
        <div className={styles.quotedTarget}><Repeat2 size={17} /><div><b>{kindLabels[entry.targetKind]} · {entrySource(entry)}</b><span>{entry.description ?? "Keep this one in sight."}</span></div></div>
        <label className={styles.quoteLabel}>YOUR NOTE <em>optional</em><textarea value={quote} onChange={(event) => setQuote(event.target.value)} placeholder={viewer ? "Why do you want this?" : "Sign in to post a quote"} maxLength={600} /></label>
        <footer><span>{quote.length}/600</span><button type="button" disabled={pending} onClick={() => onSubmit(quote)}><Repeat2 size={16} /> {viewer ? "Wishlist" : "Sign in to wishlist"}</button></footer>
      </motion.section>
    </motion.div>
  );
}
