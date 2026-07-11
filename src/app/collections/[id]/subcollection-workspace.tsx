/* eslint-disable @next/next/no-img-element */
"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowLeft,
  Camera,
  Check,
  Heart,
  ImagePlus,
  Layers3,
  LockKeyhole,
  Maximize2,
  MessageCircle,
  Minimize2,
  MoreHorizontal,
  Pencil,
  Plus,
  Save,
  Send,
  Share2,
  Star,
  Trash2,
  X,
} from "lucide-react";
import {
  appendItemMediaAction,
  createCatalogCommentAction,
  deleteItemAction,
  deleteSubcollectionAction,
  setItemLikeAction,
  setSubcollectionLikeAction,
  updateItemAction,
  updateSubcollectionAction,
} from "@/app/actions/catalog";
import { createClient } from "@/lib/supabase/client";
import type {
  CatalogCommentDTO,
  CollectionDTO,
  ItemDTO,
  SubcollectionDTO,
  ViewerDTO,
  Visibility,
} from "@/lib/catalog-types";

type Notice = { type: "error" | "success"; text: string } | null;
type ReactionState = { liked: boolean; likes: number; comments: number };
type CommentTarget = { type: "item" | "subcollection"; id: string; title: string };
type ItemMenuTarget = ItemDTO | null;

const acceptedImageTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/avif", "image/heic"]);

function visibilityLabel(visibility: Visibility) {
  return visibility === "followers" ? "Followers" : `${visibility[0].toUpperCase()}${visibility.slice(1)}`;
}

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(value));
}

function reactionMap(items: ItemDTO[]) {
  return Object.fromEntries(items.map((item) => [item.id, {
    liked: item.likedByViewer,
    likes: item.likeCount,
    comments: item.commentCount,
  }])) as Record<string, ReactionState>;
}

export function SubcollectionWorkspace({
  viewer,
  collection,
  subcollection,
}: {
  viewer: ViewerDTO;
  collection: CollectionDTO;
  subcollection: SubcollectionDTO;
}) {
  const router = useRouter();
  const [notice, setNotice] = useState<Notice>(null);
  const [pending, startTransition] = useTransition();
  const [subcollectionReaction, setSubcollectionReaction] = useState<ReactionState>({
    liked: subcollection.likedByViewer,
    likes: subcollection.likeCount,
    comments: subcollection.commentCount,
  });
  const items = collection.items
    .filter((item) => item.subcollectionId === subcollection.id)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  const [itemReactions, setItemReactions] = useState<Record<string, ReactionState>>(() => reactionMap(items));
  const [comments, setComments] = useState<CatalogCommentDTO[]>(collection.comments);
  const [commentTarget, setCommentTarget] = useState<CommentTarget | null>(null);
  const [itemDetail, setItemDetail] = useState<ItemDTO | null>(null);
  const [itemMenu, setItemMenu] = useState<ItemMenuTarget>(null);
  const [subcollectionMenuOpen, setSubcollectionMenuOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ItemDTO | null>(null);
  const [editingSubcollection, setEditingSubcollection] = useState(false);
  const coverHoldTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const coverMenuWasOpened = useRef(false);
  const effectiveVisibility = subcollection.visibility ?? collection.visibility;
  const coverUrl = subcollection.coverUrl ?? items[0]?.imageUrl ?? collection.coverUrl;
  const goBack = () => {
    if (window.history.length > 1) router.back();
    else router.push(`/collections/${collection.id}`);
  };
  const clearCoverHold = () => {
    if (coverHoldTimer.current) {
      clearTimeout(coverHoldTimer.current);
      coverHoldTimer.current = null;
    }
  };
  const startCoverHold = (event: React.PointerEvent<HTMLElement>) => {
    if ((event.target as HTMLElement).closest("button")) return;
    clearCoverHold();
    coverHoldTimer.current = setTimeout(() => {
      coverMenuWasOpened.current = true;
      setSubcollectionMenuOpen(true);
      coverHoldTimer.current = null;
    }, 520);
  };

  const toggleItemLike = (item: ItemDTO) => {
    const prior = itemReactions[item.id] ?? { liked: false, likes: 0, comments: 0 };
    const next = { ...prior, liked: !prior.liked, likes: prior.likes + (prior.liked ? -1 : 1) };
    setItemReactions((current) => ({ ...current, [item.id]: next }));
    startTransition(async () => {
      const result = await setItemLikeAction({ id: item.id, active: next.liked, collectionId: collection.id, subcollectionId: subcollection.id });
      if (!result.ok) {
        setItemReactions((current) => ({ ...current, [item.id]: prior }));
        setNotice({ type: "error", text: result.error ?? "The item like could not be updated." });
      }
    });
  };

  const toggleSubcollectionLike = () => {
    const prior = subcollectionReaction;
    const next = { ...prior, liked: !prior.liked, likes: prior.likes + (prior.liked ? -1 : 1) };
    setSubcollectionReaction(next);
    startTransition(async () => {
      const result = await setSubcollectionLikeAction({ id: subcollection.id, active: next.liked, collectionId: collection.id });
      if (!result.ok) {
        setSubcollectionReaction(prior);
        setNotice({ type: "error", text: result.error ?? "The subcollection like could not be updated." });
      }
    });
  };

  const submitComment = (target: CommentTarget, body: string) => {
    startTransition(async () => {
      const result = await createCatalogCommentAction({
        collectionId: collection.id,
        itemId: target.type === "item" ? target.id : null,
        subcollectionId: target.type === "subcollection" ? target.id : null,
        body,
      });
      if (!result.ok || !result.id) {
        setNotice({ type: "error", text: result.error ?? "The comment could not be saved." });
        return;
      }
      const commentId = result.id;
      setComments((current) => [...current, {
        id: commentId,
        itemId: target.type === "item" ? target.id : null,
        subcollectionId: target.type === "subcollection" ? target.id : null,
        authorId: viewer.id,
        body,
        createdAt: new Date().toISOString(),
        isOwn: true,
      }]);
      if (target.type === "item") {
        setItemReactions((current) => ({
          ...current,
          [target.id]: { ...(current[target.id] ?? { liked: false, likes: 0, comments: 0 }), comments: (current[target.id]?.comments ?? 0) + 1 },
        }));
      } else {
        setSubcollectionReaction((current) => ({ ...current, comments: current.comments + 1 }));
      }
    });
  };

  const deleteItem = (item: ItemDTO) => {
    if (!window.confirm(`Delete "${item.title}"?`)) return;
    startTransition(async () => {
      const result = await deleteItemAction(item.id);
      if (!result.ok) return setNotice({ type: "error", text: result.error ?? "Item could not be deleted." });
      setNotice({ type: "success", text: "Item deleted." });
      window.setTimeout(() => window.location.reload(), 280);
    });
  };

  const deleteSubcollection = () => {
    if (!window.confirm(`Delete "${subcollection.name}"? Its items will stay in ${collection.name}.`)) return;
    startTransition(async () => {
      const result = await deleteSubcollectionAction(subcollection.id);
      if (!result.ok) return setNotice({ type: "error", text: result.error ?? "Subcollection could not be deleted." });
      router.push(`/collections/${collection.id}`);
    });
  };

  const shareSubcollection = async () => {
    const url = `${window.location.origin}/u/${viewer.username}#collection-${collection.slug}`;
    try {
      const nativeShare = Reflect.get(navigator, "share") as unknown;
      if (typeof nativeShare === "function") await nativeShare.call(navigator, { title: `${subcollection.name} · ${collection.name}`, url });
      else if (navigator.clipboard) await navigator.clipboard.writeText(url);
      else window.prompt("Copy your subcollection link", url);
      setNotice({ type: "success", text: "Subcollection link ready to share." });
    } catch (error) {
      if ((error as DOMException).name !== "AbortError") setNotice({ type: "error", text: "The subcollection link could not be shared." });
    }
  };

  const shareItem = async (item: ItemDTO) => {
    const url = `${window.location.origin}/u/${viewer.username}#item-${item.id}`;
    try {
      const nativeShare = Reflect.get(navigator, "share") as unknown;
      if (typeof nativeShare === "function") {
        await nativeShare.call(navigator, {
          title: `${item.title} · ${subcollection.name}`,
          text: item.description ?? `A saved object in ${collection.name}.`,
          url,
        });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
      } else {
        window.prompt("Copy your item link", url);
      }
      setNotice({ type: "success", text: "Item link ready to share." });
    } catch (error) {
      if ((error as DOMException).name !== "AbortError") setNotice({ type: "error", text: "The item link could not be shared." });
    }
  };

  return (
    <main className="collection-studio-page subcollection-immersive-page">
      <header className="subcollection-floating-nav">
        <button className="subcollection-back-button" onClick={goBack}><ArrowLeft size={17} /><span>Back to {collection.name}</span></button>
        <span className="subcollection-nav-title">{subcollection.name}</span>
        <button className="subcollection-more-button" onClick={() => setSubcollectionMenuOpen(true)} aria-label="Subcollection options"><MoreHorizontal size={19} /></button>
      </header>

      <section className="subcollection-cover-stage">
        <motion.div className="subcollection-cover-art" initial={{ opacity: 0, scale: 1.02 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }} onPointerDown={startCoverHold} onPointerUp={clearCoverHold} onPointerCancel={clearCoverHold} onPointerLeave={clearCoverHold} onPointerMove={clearCoverHold} onClick={(event) => { if ((event.target as HTMLElement).closest("button")) return; if (coverMenuWasOpened.current) { coverMenuWasOpened.current = false; return; } goBack(); }} role="link" tabIndex={0} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); goBack(); } }} aria-label={`Return to ${collection.name}; press and hold for ${subcollection.name} options`}>
          {coverUrl ? <img src={coverUrl} alt={`${subcollection.name} cover`} /> : <Layers3 size={42} />}
          <div className="subcollection-cover-shade" />
          <button className="subcollection-cover-back" onClick={(event) => { event.stopPropagation(); goBack(); }}><ArrowLeft size={16} /> Collection</button>
          <button className="subcollection-cover-edit-trigger" onClick={(event) => { event.stopPropagation(); setEditingSubcollection(true); }}><Camera size={16} /> Edit cover</button>
          <div className="subcollection-cover-copy"><span>{subcollection.kind} · {visibilityLabel(effectiveVisibility)}</span><h1>{subcollection.name}</h1><p>{subcollection.description || `A dedicated part of ${collection.name}.`}</p></div>
        </motion.div>

        <div className="subcollection-info-bar">
          <div><strong>{items.length}</strong><span>{items.length === 1 ? "item" : "items"}</span></div><div><strong>{String(subcollection.position + 1).padStart(2, "0")}</strong><span>in collection</span></div><div><strong>{dateLabel(collection.updatedAt)}</strong><span>last update</span></div>
          <div className="catalog-reactions subcollection-reactions"><button className={subcollectionReaction.liked ? "liked" : ""} disabled={pending} onClick={toggleSubcollectionLike}><Heart size={17} fill={subcollectionReaction.liked ? "currentColor" : "none"} /> {subcollectionReaction.likes}</button><button onClick={() => setCommentTarget({ type: "subcollection", id: subcollection.id, title: subcollection.name })}><MessageCircle size={17} /> {subcollectionReaction.comments}</button><button onClick={() => void shareSubcollection()}><Share2 size={17} /></button></div>
        </div>
      </section>

      <section className="subcollection-content-shell">
        <div className="subcollection-items-heading"><div><span className="eyebrow">THE OBJECTS INSIDE</span><h2>Items in order</h2><p>Swipe through every photo, tap a reaction, or hold an item for more options.</p></div><button className="primary-button" onClick={() => router.push(`/?create=item&collection=${collection.id}&subcollection=${subcollection.id}`)}><Plus size={16} /> Add item</button></div>
        <div className="subcollection-item-grid">
          {items.map((item, index) => <SubcollectionItemCard key={item.id} item={item} order={index + 1} reaction={itemReactions[item.id] ?? { liked: false, likes: 0, comments: 0 }} pending={pending} onToggleLike={() => toggleItemLike(item)} onComment={() => setCommentTarget({ type: "item", id: item.id, title: item.title })} onOpenDetail={() => setItemDetail(item)} onOpenMenu={() => setItemMenu(item)} />)}
          {items.length === 0 ? <div className="studio-empty"><Layers3 size={24} /><strong>This subcollection is ready.</strong><p>Add an item from Klecto and choose this subcollection to place it here.</p></div> : null}
        </div>
      </section>

      <AnimatePresence>
        {itemDetail ? <CatalogItemDetailSheet item={itemDetail} collection={collection} subcollection={subcollection} reaction={itemReactions[itemDetail.id] ?? { liked: false, likes: 0, comments: 0 }} pending={pending} onClose={() => setItemDetail(null)} onToggleLike={() => toggleItemLike(itemDetail)} onComment={() => { setItemDetail(null); setCommentTarget({ type: "item", id: itemDetail.id, title: itemDetail.title }); }} onShare={() => void shareItem(itemDetail)} onEdit={() => { setItemDetail(null); setEditingItem(itemDetail); }} onDelete={() => { const item = itemDetail; setItemDetail(null); deleteItem(item); }} /> : null}
        {commentTarget ? <CatalogCommentSheet target={commentTarget} viewer={viewer} comments={comments} pending={pending} onClose={() => setCommentTarget(null)} onSubmit={submitComment} /> : null}
        {itemMenu ? <CatalogActionSheet title={itemMenu.title} subtitle="ITEM OPTIONS" onClose={() => setItemMenu(null)} onEdit={() => { setEditingItem(itemMenu); setItemMenu(null); }} onShare={() => void shareItem(itemMenu)} onDelete={() => { const item = itemMenu; setItemMenu(null); deleteItem(item); }} /> : null}
        {subcollectionMenuOpen ? <CatalogActionSheet title={subcollection.name} subtitle="SUBCOLLECTION OPTIONS" onClose={() => setSubcollectionMenuOpen(false)} onEdit={() => { setSubcollectionMenuOpen(false); setEditingSubcollection(true); }} onShare={shareSubcollection} onDelete={() => { setSubcollectionMenuOpen(false); deleteSubcollection(); }} /> : null}
        {editingItem ? <ItemEditorSheet item={editingItem} collection={collection} subcollection={subcollection} viewer={viewer} onClose={() => setEditingItem(null)} onSaved={(text) => { setEditingItem(null); setNotice({ type: "success", text }); window.setTimeout(() => window.location.reload(), 350); }} /> : null}
        {editingSubcollection ? <SubcollectionEditorSheet subcollection={subcollection} collection={collection} viewer={viewer} onClose={() => setEditingSubcollection(false)} onSaved={(text) => { setEditingSubcollection(false); setNotice({ type: "success", text }); window.setTimeout(() => window.location.reload(), 350); }} /> : null}
      </AnimatePresence>
      {notice ? <div className={`settings-message floating ${notice.type}`} role="status">{notice.type === "success" ? <Check size={17} /> : null}{notice.text}</div> : null}
    </main>
  );
}

function SubcollectionItemCard({ item, order, reaction, pending, onToggleLike, onComment, onOpenDetail, onOpenMenu }: { item: ItemDTO; order: number; reaction: ReactionState; pending: boolean; onToggleLike: () => void; onComment: () => void; onOpenDetail: () => void; onOpenMenu: () => void }) {
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wasLongPressed = useRef(false);
  const clearHold = () => { if (holdTimer.current) { clearTimeout(holdTimer.current); holdTimer.current = null; } };
  const beginHold = (event: React.PointerEvent<HTMLElement>) => {
    if ((event.target as HTMLElement).closest("button")) return;
    wasLongPressed.current = false;
    holdTimer.current = setTimeout(() => { wasLongPressed.current = true; onOpenMenu(); holdTimer.current = null; }, 520);
  };
  const openDetail = () => {
    if (wasLongPressed.current) {
      wasLongPressed.current = false;
      return;
    }
    onOpenDetail();
  };
  return <motion.article className="subcollection-item-card" role="button" tabIndex={0} aria-label={`Open ${item.title}`} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.36, ease: [0.16, 1, 0.3, 1] }} onPointerDown={beginHold} onPointerUp={clearHold} onPointerCancel={clearHold} onPointerLeave={clearHold} onPointerMove={clearHold} onContextMenu={(event) => event.preventDefault()} onClick={openDetail} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onOpenDetail(); } }} whileTap={{ scale: 0.992 }}><ItemMediaCarousel item={item} /><div className="subcollection-item-copy"><div className="subcollection-item-line"><span>#{String(order).padStart(2, "0")}</span><button onClick={(event) => { event.stopPropagation(); onOpenMenu(); }} aria-label={`More options for ${item.title}`}><MoreHorizontal size={17} /></button></div><small>{item.brand || item.mood}</small><h3>{item.title}</h3><p>{[item.model, item.year, item.condition].filter(Boolean).join(" · ") || item.description || "Catalogued object"}</p><div className="catalog-reactions"><button className={reaction.liked ? "liked" : ""} disabled={pending} onClick={(event) => { event.stopPropagation(); onToggleLike(); }}><Heart size={16} fill={reaction.liked ? "currentColor" : "none"} /> {reaction.likes}</button><button onClick={(event) => { event.stopPropagation(); onComment(); }}><MessageCircle size={16} /> {reaction.comments}</button></div></div></motion.article>;
}

function ItemMediaCarousel({ item }: { item: ItemDTO }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const images = item.imageUrls.length ? item.imageUrls : item.imageUrl ? [item.imageUrl] : [];
  return <div className="item-media-carousel"><div className="item-media-scroll" onScroll={(event) => { const width = event.currentTarget.clientWidth; if (width) setActiveIndex(Math.round(event.currentTarget.scrollLeft / width)); }}>{images.length ? images.map((image, index) => <img key={`${image}-${index}`} src={image} alt={`${item.title}, photo ${index + 1}`} />) : <div className="item-media-empty"><Layers3 size={24} /></div>}</div>{images.length > 1 ? <div className="item-media-indicator"><span>{activeIndex + 1}/{images.length}</span><div>{images.map((image, index) => <i className={activeIndex === index ? "active" : ""} key={`${image}-dot`} />)}</div></div> : null}{item.isFavorite ? <span className="item-favourite"><Star size={13} fill="currentColor" /></span> : null}{item.visibility === "private" ? <span className="item-private"><LockKeyhole size={13} /></span> : null}</div>;
}

function CatalogItemDetailSheet({ item, collection, subcollection, reaction, pending, onClose, onToggleLike, onComment, onShare, onEdit, onDelete }: { item: ItemDTO; collection: CollectionDTO; subcollection: SubcollectionDTO; reaction: ReactionState; pending: boolean; onClose: () => void; onToggleLike: () => void; onComment: () => void; onShare: () => void; onEdit: () => void; onDelete: () => void }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const images = item.imageUrls.length ? item.imageUrls : item.imageUrl ? [item.imageUrl] : [];
  const metadata = [
    { label: "Brand", value: item.brand },
    { label: "Model", value: item.model },
    { label: "Year", value: item.year ? String(item.year) : null },
    { label: "Condition", value: item.condition },
    { label: "Mood", value: item.mood },
    { label: "Visibility", value: visibilityLabel(item.visibility ?? collection.visibility) },
    { label: "Added", value: dateLabel(item.createdAt) },
    { label: "Photos", value: `${images.length} ${images.length === 1 ? "photo" : "photos"}` },
  ].filter((entry): entry is { label: string; value: string } => Boolean(entry.value));

  return <motion.div className="catalog-item-detail-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}><motion.section className="catalog-item-detail-sheet" role="dialog" aria-modal="true" aria-label={`${item.title} details`} initial={{ opacity: 0, y: 28, scale: 0.985 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 18, scale: 0.985 }} transition={{ type: "spring", damping: 28, stiffness: 310 }} onClick={(event) => event.stopPropagation()}><header className="catalog-item-detail-header"><div><span className="catalog-item-detail-context"><Layers3 size={14} /> {subcollection.name}</span><h2>{item.title}</h2></div><button type="button" onClick={onClose} aria-label="Close item details"><X size={20} /></button></header><div className="catalog-item-detail-gallery">{images.length ? <div className="catalog-item-detail-gallery-scroll" onScroll={(event) => { const width = event.currentTarget.clientWidth; if (width) setActiveIndex(Math.min(images.length - 1, Math.max(0, Math.round(event.currentTarget.scrollLeft / width)))); }}>{images.map((image, index) => <div className="catalog-item-detail-gallery-slide" key={`${image}-${index}`}><img src={image} alt={`${item.title}, photo ${index + 1}`} /></div>)}</div> : <div className="catalog-item-detail-gallery-empty"><Layers3 size={30} /><span>No photos added yet</span></div>}{images.length > 1 ? <div className="catalog-item-detail-indicator"><span>{activeIndex + 1}/{images.length}</span><div>{images.map((image, index) => <i className={index === activeIndex ? "active" : ""} key={`${image}-indicator`} />)}</div></div> : null}{item.isFavorite ? <span className="catalog-item-detail-favorite"><Star size={15} fill="currentColor" /> Favourite</span> : null}</div><div className="catalog-item-detail-copy"><p className="catalog-item-detail-description">{item.description || "No description has been added to this object yet."}</p><dl className="catalog-item-detail-meta">{metadata.map((entry) => <div key={entry.label}><dt>{entry.label}</dt><dd>{entry.value}</dd></div>)}</dl></div><footer className="catalog-item-detail-actions"><div><button className={reaction.liked ? "liked" : ""} type="button" disabled={pending} onClick={onToggleLike}><Heart size={17} fill={reaction.liked ? "currentColor" : "none"} /> <span>{reaction.likes}</span></button><button type="button" onClick={onComment}><MessageCircle size={17} /> <span>{reaction.comments}</span></button><button type="button" onClick={onShare}><Share2 size={17} /><span>Share</span></button></div><div className="catalog-item-detail-owner-actions"><button type="button" onClick={onEdit}><Pencil size={17} /><span>Edit</span></button><button className="danger" type="button" onClick={onDelete}><Trash2 size={17} /><span>Delete</span></button></div></footer></motion.section></motion.div>;
}

function CatalogActionSheet({ title, subtitle, onClose, onEdit, onShare, onDelete }: { title: string; subtitle: string; onClose: () => void; onEdit: () => void; onShare: () => void; onDelete: () => void }) {
  return <motion.div className="catalog-action-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}><motion.section className="catalog-action-sheet" initial={{ opacity: 0, y: 24, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 14, scale: 0.98 }} transition={{ type: "spring", damping: 27, stiffness: 320 }} onClick={(event) => event.stopPropagation()}><span className="eyebrow">{subtitle}</span><h2>{title}</h2><button onClick={onEdit}><Pencil size={18} /> Edit</button><button onClick={onShare}><Share2 size={18} /> Share</button><button className="danger" onClick={onDelete}><Trash2 size={18} /> Delete</button><button className="cancel" onClick={onClose}>Cancel</button></motion.section></motion.div>;
}

function CatalogCommentSheet({ target, viewer, comments, pending, onClose, onSubmit }: { target: CommentTarget; viewer: ViewerDTO; comments: CatalogCommentDTO[]; pending: boolean; onClose: () => void; onSubmit: (target: CommentTarget, body: string) => void }) {
  const [draft, setDraft] = useState("");
  const [expanded, setExpanded] = useState(false);
  const targetComments = comments.filter((comment) => target.type === "item" ? comment.itemId === target.id : comment.subcollectionId === target.id);
  const isItem = target.type === "item";

  return (
    <motion.div
      className={`catalog-comment-backdrop${expanded ? " catalog-comment-backdrop--expanded" : ""}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.section
        className={`catalog-comment-sheet${expanded ? " catalog-comment-sheet--expanded" : ""}`}
        data-expanded={expanded}
        role="dialog"
        aria-modal="true"
        aria-label={`Comments for ${target.title}`}
        layout
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 18 }}
        transition={{ type: "spring", damping: 29, stiffness: 310 }}
        onClick={(event) => event.stopPropagation()}
      >
        <header>
          <div>
            <span className="eyebrow">COMMENTS</span>
            <h2>{target.title}</h2>
            {expanded ? <p className="catalog-comment-expanded-meta">{targetComments.length} {targetComments.length === 1 ? "comment" : "comments"} on this {isItem ? "item" : "subcollection"}</p> : null}
          </div>
          <div className="catalog-comment-sheet-header-actions">
            <button
              className="catalog-comment-expand-toggle"
              type="button"
              onClick={() => setExpanded((current) => !current)}
              aria-label={expanded ? "Return to compact comments" : "Expand comments"}
              aria-pressed={expanded}
              title={expanded ? "Return to compact comments" : "Expand comments"}
            >
              {expanded ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>
            <button type="button" onClick={onClose} aria-label="Close comments"><X size={19} /></button>
          </div>
        </header>
        <div className={`catalog-comment-list${expanded ? " catalog-comment-list--expanded" : ""}`}>
          {targetComments.map((comment) => <article key={comment.id}><span>{comment.isOwn ? viewer.displayName : "Collector"}</span><p>{comment.body}</p><small>{dateLabel(comment.createdAt)}</small></article>)}
          {targetComments.length === 0 ? <div className="catalog-comment-empty"><MessageCircle size={20} /><strong>Start the conversation.</strong><p>Leave the first note on this {isItem ? "item" : "subcollection"}.</p></div> : null}
        </div>
        <form
          className={`catalog-comment-composer${expanded ? " catalog-comment-composer--expanded" : ""}`}
          onSubmit={(event) => {
            event.preventDefault();
            const value = draft.trim();
            if (!value) return;
            onSubmit(target, value);
            setDraft("");
          }}
        >
          <img src={viewer.avatarUrl ?? "/favicon.ico"} alt="" />
          <textarea value={draft} onChange={(event) => setDraft(event.target.value)} placeholder={`Add a comment about this ${isItem ? "item" : "subcollection"}…`} maxLength={2000} />
          <button className="primary-button" disabled={pending || !draft.trim()}><Send size={16} /> Send</button>
        </form>
      </motion.section>
    </motion.div>
  );
}

function ItemEditorSheet({ item, collection, subcollection, viewer, onClose, onSaved }: { item: ItemDTO; collection: CollectionDTO; subcollection: SubcollectionDTO; viewer: ViewerDTO; onClose: () => void; onSaved: (message: string) => void }) {
  const [title, setTitle] = useState(item.title);
  const [description, setDescription] = useState(item.description ?? "");
  const [brand, setBrand] = useState(item.brand ?? "");
  const [model, setModel] = useState(item.model ?? "");
  const [condition, setCondition] = useState(item.condition ?? "");
  const [visibility, setVisibility] = useState<Visibility>(item.visibility ?? collection.visibility);
  const [isFavorite, setIsFavorite] = useState(item.isFavorite);
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const save = () => {
    setError("");
    if (!title.trim()) return setError("Give this item a title.");
    if (files.length > 8) return setError("Choose no more than eight photos at once.");
    const invalidFile = files.find((file) => !acceptedImageTypes.has(file.type) || file.size > 15 * 1024 * 1024);
    if (invalidFile) return setError(`${invalidFile.name} is not a supported image under 15 MB.`);
    startTransition(async () => {
      const update = await updateItemAction({ id: item.id, collectionId: collection.id, subcollectionId: subcollection.id, title, description: description.trim() || null, brand: brand.trim() || null, model: model.trim() || null, year: item.year, condition: condition.trim() || null, mood: item.mood, isFavorite, visibility, mediaPaths: [] });
      if (!update.ok) return setError(update.error ?? "Could not save the item.");
      const uploadedPaths: string[] = [];
      for (const file of files) {
        const extension = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
        const path = `${viewer.id}/items/${crypto.randomUUID()}.${extension}`;
        const { error: uploadError } = await createClient().storage.from("collection-media").upload(path, file, { cacheControl: "31536000", upsert: false, contentType: file.type });
        if (uploadError) {
          if (uploadedPaths.length) await createClient().storage.from("collection-media").remove(uploadedPaths);
          return setError(`Upload failed for ${file.name}.`);
        }
        uploadedPaths.push(path);
      }
      if (uploadedPaths.length) {
        const attached = await appendItemMediaAction({ itemId: item.id, collectionId: collection.id, subcollectionId: subcollection.id, mediaPaths: uploadedPaths });
        if (!attached.ok) {
          await createClient().storage.from("collection-media").remove(uploadedPaths);
          return setError(attached.error ?? "The new photos could not be attached.");
        }
      }
      onSaved(uploadedPaths.length ? "Item details and photos saved." : "Item details saved.");
    });
  };

  return <motion.div className="catalog-editor-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}><motion.section className="catalog-editor-sheet" initial={{ opacity: 0, y: 24, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 16, scale: 0.98 }} transition={{ type: "spring", damping: 28, stiffness: 300 }} onClick={(event) => event.stopPropagation()}><header><div><span className="eyebrow">EDIT ITEM</span><h2>{item.title}</h2></div><button onClick={onClose} aria-label="Close item editor"><X size={20} /></button></header><div className="catalog-editor-grid"><label><span>Title</span><input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={140} /></label><label><span>Brand</span><input value={brand} onChange={(event) => setBrand(event.target.value)} maxLength={100} /></label><label><span>Model</span><input value={model} onChange={(event) => setModel(event.target.value)} maxLength={120} /></label><label><span>Condition</span><input value={condition} onChange={(event) => setCondition(event.target.value)} maxLength={80} /></label><label className="wide"><span>Description</span><textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={4000} /></label><label><span>Visibility</span><select value={visibility} onChange={(event) => setVisibility(event.target.value as Visibility)}><option value="public">Public</option><option value="followers">Followers</option><option value="private">Private</option></select></label><label className="catalog-check"><input type="checkbox" checked={isFavorite} onChange={(event) => setIsFavorite(event.target.checked)} /><Star size={15} /> Favourite item</label></div><label className="catalog-photo-upload"><ImagePlus size={20} /><span><strong>{files.length ? `${files.length} new photo${files.length === 1 ? "" : "s"}` : "Add more photos"}</strong><small>Swipeable gallery · up to 8 total · JPG, PNG, WEBP, AVIF or HEIC</small></span><input type="file" accept="image/jpeg,image/png,image/webp,image/avif,image/heic" multiple onChange={(event) => setFiles(Array.from(event.target.files ?? []))} /></label>{error ? <div className="create-error">{error}</div> : null}<footer><button className="text-button" onClick={onClose}>Cancel</button><button className="primary-button" disabled={pending} onClick={save}><Save size={16} /> {pending ? "Saving…" : "Save item"}</button></footer></motion.section></motion.div>;
}

function SubcollectionEditorSheet({ subcollection, collection, viewer, onClose, onSaved }: { subcollection: SubcollectionDTO; collection: CollectionDTO; viewer: ViewerDTO; onClose: () => void; onSaved: (message: string) => void }) {
  const [name, setName] = useState(subcollection.name);
  const [description, setDescription] = useState(subcollection.description ?? "");
  const [kind, setKind] = useState(subcollection.kind);
  const [visibility, setVisibility] = useState<Visibility | "inherit">(subcollection.visibility ?? "inherit");
  const [coverPath, setCoverPath] = useState<string | null>(subcollection.coverPath);
  const [coverUrl, setCoverUrl] = useState<string | null>(subcollection.coverUrl);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const selectCover = async (file: File) => {
    setError("");
    if (!acceptedImageTypes.has(file.type) || file.size > 15 * 1024 * 1024) return setError("Choose a JPG, PNG, WEBP, AVIF, or HEIC image under 15 MB.");
    const extension = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
    const path = `${viewer.id}/collections/${collection.id}/subcollections/${subcollection.id}/cover-${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await createClient().storage.from("collection-media").upload(path, file, { cacheControl: "31536000", upsert: false, contentType: file.type });
    if (uploadError) return setError("The subcollection cover could not be uploaded.");
    setCoverPath(path);
    setCoverUrl(URL.createObjectURL(file));
  };

  const save = () => {
    if (!name.trim()) return setError("Give this subcollection a name.");
    setError("");
    startTransition(async () => {
      const result = await updateSubcollectionAction({ id: subcollection.id, collectionId: collection.id, name, description: description.trim() || null, kind, visibility: visibility === "inherit" ? null : visibility, coverPath });
      if (!result.ok) return setError(result.error ?? "Could not save the subcollection.");
      if (subcollection.coverPath && subcollection.coverPath !== coverPath) await createClient().storage.from("collection-media").remove([subcollection.coverPath]);
      onSaved("Subcollection settings and cover saved.");
    });
  };

  return <motion.div className="catalog-editor-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}><motion.section className="catalog-editor-sheet subcollection-editor-sheet" initial={{ opacity: 0, y: 24, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 16, scale: 0.98 }} transition={{ type: "spring", damping: 28, stiffness: 300 }} onClick={(event) => event.stopPropagation()}><header><div><span className="eyebrow">EDIT SUBCOLLECTION</span><h2>{subcollection.name}</h2></div><button onClick={onClose} aria-label="Close subcollection editor"><X size={20} /></button></header><label className="subcollection-cover-upload"><div>{coverUrl ? <img src={coverUrl} alt="Subcollection cover preview" /> : <Layers3 size={25} />}</div><span><Camera size={16} /> Change cover</span><input type="file" accept="image/jpeg,image/png,image/webp,image/avif,image/heic" onChange={(event) => { const file = event.target.files?.[0]; if (file) void selectCover(file); event.currentTarget.value = ""; }} /></label><div className="catalog-editor-grid"><label><span>Name</span><input value={name} onChange={(event) => setName(event.target.value)} maxLength={80} /></label><label><span>Kind</span><select value={kind} onChange={(event) => setKind(event.target.value as typeof kind)}><option value="brand">Brand</option><option value="series">Series</option><option value="era">Era</option><option value="custom">Custom</option></select></label><label><span>Visibility</span><select value={visibility} onChange={(event) => setVisibility(event.target.value as typeof visibility)}><option value="inherit">Inherit collection privacy</option><option value="public">Public</option><option value="followers">Followers</option><option value="private">Private</option></select></label><label className="wide"><span>Description</span><textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={600} /></label></div>{error ? <div className="create-error">{error}</div> : null}<footer><button className="text-button" onClick={onClose}>Cancel</button><button className="primary-button" disabled={pending} onClick={save}><Save size={16} /> {pending ? "Saving…" : "Save subcollection"}</button></footer></motion.section></motion.div>;
}
