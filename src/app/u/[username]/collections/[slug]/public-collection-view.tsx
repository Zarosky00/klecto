/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowLeft,
  Heart,
  Layers3,
  MessageCircle,
  Send,
  Share2,
  Star,
  X,
} from "lucide-react";
import {
  createCatalogCommentAction,
  recordCatalogViewAction,
  setCollectionLikeAction,
  setItemLikeAction,
  setSubcollectionLikeAction,
} from "@/app/actions/catalog";
import type {
  CatalogCommentDTO,
  PublicProfileCollectionDTO,
  PublicProfileDTO,
  PublicProfileItemDTO,
  PublicProfileSubcollectionDTO,
} from "@/lib/catalog-types";
import styles from "../../public-profile.module.css";

type ReactionState = { liked: boolean; likes: number; comments: number; views: number };

function numberLabel(value: number) {
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

function itemMeta(item: PublicProfileItemDTO) {
  return item.tags.length
    ? item.tags.map((tag) => `#${tag}`).join(" · ")
    : [item.brand, item.model, item.year, item.condition].filter(Boolean).join(" · ");
}

function reactionFrom(target: { likedByViewer: boolean; likeCount: number; commentCount: number; viewCount: number }): ReactionState {
  return {
    liked: target.likedByViewer,
    likes: target.likeCount,
    comments: target.commentCount,
    views: target.viewCount,
  };
}

function ViewCount({ count, variant = "card" }: { count: number; variant?: "hero" | "card" | "detail" }) {
  const label = `${count} ${count === 1 ? "view" : "views"}`;
  const variantClass = variant === "hero"
    ? styles.publicViewCountHero
    : variant === "detail"
      ? styles.publicViewCountDetail
      : styles.publicViewCountCard;

  return <span className={`${styles.publicViewCount} ${variantClass}`} aria-label={label} title={label}>
    {numberLabel(count)} reads
  </span>;
}

export function PublicCollectionView({
  profile,
  collection,
}: {
  profile: PublicProfileDTO;
  collection: PublicProfileCollectionDTO;
}) {
  const [collectionReaction, setCollectionReaction] = useState(() => reactionFrom(collection));
  const [subcollectionReactions, setSubcollectionReactions] = useState<Record<string, ReactionState>>(() => Object.fromEntries(
    collection.subcollections.map((entry) => [entry.id, reactionFrom(entry)]),
  ));
  const [itemReactions, setItemReactions] = useState<Record<string, ReactionState>>(() => Object.fromEntries(
    collection.items.map((entry) => [entry.id, reactionFrom(entry)]),
  ));
  const [comments, setComments] = useState<CatalogCommentDTO[]>(collection.comments);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [activeSubcollection, setActiveSubcollection] = useState<PublicProfileSubcollectionDTO | null>(null);
  const [activeItem, setActiveItem] = useState<PublicProfileItemDTO | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const collectionItems = useMemo(
    () => activeSubcollection ? collection.items.filter((item) => item.subcollectionId === activeSubcollection.id) : [],
    [activeSubcollection, collection.items],
  );

  const recordView = (targetType: "collection" | "subcollection" | "item", targetId: string, increment: () => void) => {
    void recordCatalogViewAction({ targetType, targetId }).then((result) => {
      if (result.ok && result.created) increment();
    });
  };

  useEffect(() => {
    recordView("collection", collection.id, () => setCollectionReaction((current) => ({ ...current, views: current.views + 1 })));
    // The target is stable for the lifetime of this page; deliberately avoid
    // counting every render as another visit.
  }, [collection.id]);

  const toggleCollectionLike = () => {
    const prior = collectionReaction;
    const next = { ...prior, liked: !prior.liked, likes: prior.likes + (prior.liked ? -1 : 1) };
    setCollectionReaction(next);
    startTransition(async () => {
      const result = await setCollectionLikeAction({ id: collection.id, collectionId: collection.id, active: next.liked });
      if (!result.ok) {
        setCollectionReaction(prior);
        setNotice(result.error ?? "Sign in to like this collection.");
      }
    });
  };

  const toggleSubcollectionLike = (subcollection: PublicProfileSubcollectionDTO) => {
    const prior = subcollectionReactions[subcollection.id] ?? reactionFrom(subcollection);
    const next = { ...prior, liked: !prior.liked, likes: prior.likes + (prior.liked ? -1 : 1) };
    setSubcollectionReactions((current) => ({ ...current, [subcollection.id]: next }));
    startTransition(async () => {
      const result = await setSubcollectionLikeAction({ id: subcollection.id, collectionId: collection.id, active: next.liked });
      if (!result.ok) {
        setSubcollectionReactions((current) => ({ ...current, [subcollection.id]: prior }));
        setNotice(result.error ?? "Sign in to like this section.");
      }
    });
  };

  const toggleItemLike = (item: PublicProfileItemDTO) => {
    const prior = itemReactions[item.id] ?? reactionFrom(item);
    const next = { ...prior, liked: !prior.liked, likes: prior.likes + (prior.liked ? -1 : 1) };
    setItemReactions((current) => ({ ...current, [item.id]: next }));
    startTransition(async () => {
      const result = await setItemLikeAction({ id: item.id, collectionId: collection.id, subcollectionId: item.subcollectionId, active: next.liked });
      if (!result.ok) {
        setItemReactions((current) => ({ ...current, [item.id]: prior }));
        setNotice(result.error ?? "Sign in to like this item.");
      }
    });
  };

  const shareCollection = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: `${collection.name} · Klecto`, text: collection.description ?? undefined, url });
      else if (navigator.clipboard) await navigator.clipboard.writeText(url);
      else window.prompt("Copy this collection link", url);
      setNotice("Collection link ready to share.");
    } catch (error) {
      if ((error as DOMException).name !== "AbortError") setNotice("The collection link could not be shared.");
    }
  };

  const openSubcollection = (subcollection: PublicProfileSubcollectionDTO) => {
    setActiveSubcollection(subcollection);
    recordView("subcollection", subcollection.id, () => setSubcollectionReactions((current) => ({
      ...current,
      [subcollection.id]: { ...(current[subcollection.id] ?? reactionFrom(subcollection)), views: (current[subcollection.id]?.views ?? subcollection.viewCount) + 1 },
    })));
  };

  const openItem = (item: PublicProfileItemDTO) => {
    setActiveItem(item);
    recordView("item", item.id, () => setItemReactions((current) => ({
      ...current,
      [item.id]: { ...(current[item.id] ?? reactionFrom(item)), views: (current[item.id]?.views ?? item.viewCount) + 1 },
    })));
  };

  return (
    <main className={styles.page}>
      <header className={styles.topbar}>
        <Link className={styles.backLink} href={`/u/${profile.profile.username}`}><ArrowLeft size={16} /> @{profile.profile.username}</Link>
        <Link className={styles.wordmark} href="/" aria-label="Klecto home"><span aria-hidden="true">K</span> klecto</Link>
        <span className={styles.publicCollectionOwner}>{profile.profile.displayName}</span>
      </header>

      <motion.section className={styles.publicCollectionHero} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
        <div className={styles.publicCollectionCover}>
          {collection.coverUrl ? <img src={collection.coverUrl} alt={`${collection.name} cover`} /> : <Layers3 size={42} />}
          <span>{collection.subcollectionCount} {collection.subcollectionCount === 1 ? "section" : "sections"}</span>
        </div>
        <div className={styles.publicCollectionCopy}>
          <span className={styles.kicker}>@{profile.profile.username}’S COLLECTION</span>
          <h1>{collection.name}</h1>
          <p>{collection.description || "A collection kept in public, one story at a time."}</p>
          <div className={styles.publicCollectionFacts}>
            <span><strong>{collection.itemCount}</strong><small>objects</small></span>
            <span><strong>{collection.subcollectionCount}</strong><small>sections</small></span>
          </div>
          <div className={styles.publicCollectionEngagement}>
            <div className={styles.publicCollectionActions}>
              <button className={collectionReaction.liked ? styles.liked : ""} disabled={pending} onClick={toggleCollectionLike} aria-label={`${collectionReaction.liked ? "Unlike" : "Like"} collection, ${numberLabel(collectionReaction.likes)} likes`}><Heart aria-hidden="true" size={17} fill={collectionReaction.liked ? "currentColor" : "none"} /> {numberLabel(collectionReaction.likes)}</button>
              <button onClick={() => setCommentsOpen(true)} aria-label={`Open ${numberLabel(collectionReaction.comments)} collection comments`}><MessageCircle aria-hidden="true" size={17} /> {numberLabel(collectionReaction.comments)}</button>
              <button onClick={() => void shareCollection()} aria-label="Share collection"><Share2 aria-hidden="true" size={17} /> Share</button>
            </div>
            <ViewCount count={collectionReaction.views} variant="hero" />
          </div>
        </div>
      </motion.section>

      {notice ? <button className={styles.publicCollectionNotice} onClick={() => setNotice(null)}>{notice} <X size={14} /></button> : null}

      <section className={styles.publicCollectionSection}>
        <div className={styles.sectionHead}><div><span className={styles.kicker}>THE SECTIONS</span><h2>Browse the shelves</h2></div><span>{collection.subcollectionCount} total</span></div>
        {collection.subcollections.length ? <div className={styles.publicSubcollectionGrid}>{collection.subcollections.map((subcollection) => {
          const reaction = subcollectionReactions[subcollection.id] ?? reactionFrom(subcollection);
          return <article className={styles.publicSubcollectionCard} key={subcollection.id}>
            <button className={styles.publicSubcollectionOpen} onClick={() => openSubcollection(subcollection)}>
              <div>{subcollection.coverUrl ? <img src={subcollection.coverUrl} alt="" /> : <Layers3 size={26} />}<span>{subcollection.kind}</span></div>
              <small>{subcollection.name}</small><p>{subcollection.description || "Open this section to see every saved object."}</p>
            </button>
            <div className={styles.publicSubcollectionMeta}><button className={reaction.liked ? styles.liked : ""} disabled={pending} onClick={() => toggleSubcollectionLike(subcollection)}><Heart size={14} fill={reaction.liked ? "currentColor" : "none"} /> {numberLabel(reaction.likes)}</button></div>
          </article>;
        })}</div> : <div className={styles.emptyProfile}><Layers3 size={26} /><strong>No public sections yet.</strong><p>This collection is waiting for its first shelf.</p></div>}
      </section>

      {collection.items.length ? <section className={styles.publicCollectionSection}>
        <div className={styles.sectionHead}><div><span className={styles.kicker}>HIGHLIGHTS</span><h2>Objects with a story</h2></div><span>{collection.items.length} total</span></div>
        <div className={styles.publicItemGrid}>{collection.items.map((item) => <PublicItemCard item={item} reaction={itemReactions[item.id] ?? reactionFrom(item)} pending={pending} onOpen={() => openItem(item)} onToggleLike={() => toggleItemLike(item)} key={item.id} />)}</div>
      </section> : null}

      <AnimatePresence>
        {commentsOpen ? <CollectionCommentsSheet collection={collection} comments={comments} pending={pending} onClose={() => setCommentsOpen(false)} onSubmit={(body) => {
          startTransition(async () => {
            const result = await createCatalogCommentAction({ collectionId: collection.id, targetCollectionId: collection.id, itemId: null, subcollectionId: null, body });
            if (!result.ok || !result.id) return setNotice(result.error ?? "Sign in to comment on this collection.");
            setComments((current) => [...current, { id: result.id!, collectionId: collection.id, itemId: null, subcollectionId: null, authorId: "viewer", body, createdAt: new Date().toISOString(), isOwn: true }]);
            setCollectionReaction((current) => ({ ...current, comments: current.comments + 1 }));
          });
        }} /> : null}
        {activeSubcollection ? <SubcollectionSheet subcollection={activeSubcollection} viewCount={subcollectionReactions[activeSubcollection.id]?.views ?? activeSubcollection.viewCount} items={collectionItems} reactions={itemReactions} pending={pending} onClose={() => setActiveSubcollection(null)} onOpenItem={openItem} onToggleItemLike={toggleItemLike} /> : null}
        {activeItem ? <ItemSheet item={activeItem} reaction={itemReactions[activeItem.id] ?? reactionFrom(activeItem)} pending={pending} onClose={() => setActiveItem(null)} onToggleLike={() => toggleItemLike(activeItem)} /> : null}
      </AnimatePresence>
    </main>
  );
}

function PublicItemCard({ item, reaction, pending, onOpen, onToggleLike }: { item: PublicProfileItemDTO; reaction: ReactionState; pending: boolean; onOpen: () => void; onToggleLike: () => void }) {
  return <article className={styles.publicItemCard}>
    <button className={styles.publicItemOpen} onClick={onOpen}>
      <div>{item.imageUrls[0] ? <img src={item.imageUrls[0]} alt="" /> : <Layers3 size={28} />}{item.isFavorite ? <span><Star size={13} fill="currentColor" /> Favourite</span> : null}</div>
      <small>{item.mood}</small><h3>{item.title}</h3><p>{itemMeta(item) || item.description || "A catalogued object."}</p>
    </button>
    <div className={styles.publicItemMeta}><button className={reaction.liked ? styles.liked : ""} disabled={pending} onClick={onToggleLike}><Heart size={14} fill={reaction.liked ? "currentColor" : "none"} /> {numberLabel(reaction.likes)}</button></div>
  </article>;
}

function CollectionCommentsSheet({ collection, comments, pending, onClose, onSubmit }: { collection: PublicProfileCollectionDTO; comments: CatalogCommentDTO[]; pending: boolean; onClose: () => void; onSubmit: (body: string) => void }) {
  const [draft, setDraft] = useState("");
  return <motion.div className="catalog-comment-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}><motion.section className="catalog-comment-sheet" role="dialog" aria-modal="true" aria-label={`Comments for ${collection.name}`} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 18 }} transition={{ type: "spring", stiffness: 300, damping: 28 }} onClick={(event) => event.stopPropagation()}><header><div><span className="eyebrow">COLLECTION DISCUSSION</span><h2>{collection.name}</h2></div><button type="button" onClick={onClose} aria-label="Close comments"><X size={19} /></button></header><div className="catalog-comment-list">{comments.length ? comments.map((comment) => <article key={comment.id}><span>{comment.isOwn ? "You" : "Collector"}</span><p>{comment.body}</p><small>{new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(comment.createdAt))}</small></article>) : <div className="catalog-comment-empty"><MessageCircle size={20} /><strong>Start the conversation.</strong><p>Leave a thought on this collection.</p></div>}</div><form onSubmit={(event) => { event.preventDefault(); const body = draft.trim(); if (!body) return; onSubmit(body); setDraft(""); }}><span className={styles.commentAvatar}>K</span><textarea value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Add a comment about this collection…" maxLength={2000} /><button className="primary-button" disabled={pending || !draft.trim()}><Send size={16} /> Send</button></form></motion.section></motion.div>;
}

function SubcollectionSheet({ subcollection, viewCount, items, reactions, pending, onClose, onOpenItem, onToggleItemLike }: { subcollection: PublicProfileSubcollectionDTO; viewCount: number; items: PublicProfileItemDTO[]; reactions: Record<string, ReactionState>; pending: boolean; onClose: () => void; onOpenItem: (item: PublicProfileItemDTO) => void; onToggleItemLike: (item: PublicProfileItemDTO) => void }) {
  return <motion.div className={styles.publicDetailBackdrop} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}><motion.section className={styles.publicDetailSheet} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 18 }} transition={{ type: "spring", stiffness: 300, damping: 28 }} onClick={(event) => event.stopPropagation()}><header><div><span className={styles.kicker}>{subcollection.kind} SECTION</span><h2>{subcollection.name}</h2><p>{subcollection.description || "Every object gathered here."}</p><ViewCount count={viewCount} variant="detail" /></div><button onClick={onClose} aria-label="Close section"><X size={19} /></button></header><div className={styles.publicDetailItems}>{items.length ? items.map((item) => <PublicItemCard item={item} reaction={reactions[item.id] ?? reactionFrom(item)} pending={pending} onOpen={() => onOpenItem(item)} onToggleLike={() => onToggleItemLike(item)} key={item.id} />) : <div className={styles.emptyProfile}><Layers3 size={24} /><strong>No public objects here yet.</strong></div>}</div></motion.section></motion.div>;
}

function ItemSheet({ item, reaction, pending, onClose, onToggleLike }: { item: PublicProfileItemDTO; reaction: ReactionState; pending: boolean; onClose: () => void; onToggleLike: () => void }) {
  const metadata = [item.brand, item.model, item.year, item.condition].filter(Boolean).join(" · ");
  return <motion.div className={styles.publicDetailBackdrop} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}><motion.section className={styles.publicItemSheet} initial={{ opacity: 0, y: 24, scale: .985 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 18, scale: .985 }} transition={{ type: "spring", stiffness: 300, damping: 28 }} onClick={(event) => event.stopPropagation()}><header><div><span className={styles.kicker}>{item.mood} OBJECT</span><h2>{item.title}</h2></div><button onClick={onClose} aria-label="Close item"><X size={19} /></button></header><div className={styles.publicItemSheetImage}>{item.imageUrls[0] ? <img src={item.imageUrls[0]} alt={item.title} /> : <Layers3 size={38} />}</div><div className={styles.publicItemSheetCopy}><p>{item.description || "No description has been added to this object yet."}</p>{metadata ? <span>{metadata}</span> : null}<div><button className={reaction.liked ? styles.liked : ""} disabled={pending} onClick={onToggleLike}><Heart size={17} fill={reaction.liked ? "currentColor" : "none"} /> {numberLabel(reaction.likes)}</button><ViewCount count={reaction.views} variant="detail" /></div></div></motion.section></motion.div>;
}
