/* eslint-disable @next/next/no-img-element */
"use client";

import type { PointerEvent as ReactPointerEvent } from "react";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowLeft,
  Camera,
  Check,
  ChevronRight,
  ChevronUp,
  Eye,
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
  Search,
  Send,
  Share2,
  SlidersHorizontal,
  Sparkles,
  Star,
  Trash2,
  UsersRound,
  X,
  ZoomIn,
} from "lucide-react";
import type { DemoCollection, DemoItem, DemoSubcollection } from "@/lib/demo-collections";
import type { Visibility } from "@/lib/catalog-types";

type Notice = { type: "error" | "success"; text: string } | null;
type ReactionState = { liked: boolean; likes: number; comments: number; views: number };
type CommentTarget = { type: "collection" | "item" | "subcollection"; id: string; title: string };
type DemoComment = {
  id: string;
  targetType: "collection" | "item" | "subcollection";
  targetId: string;
  body: string;
  author: string;
  createdAt: string;
};
type SubcollectionPatch = Pick<DemoSubcollection, "name" | "description" | "kind" | "visibility" | "coverUrl">;
type CollectionSettingsPatch = { name: string; description: string; visibility: Visibility };
type DemoDeleteConfirmation = {
  title: string;
  description: string;
  confirmLabel?: string;
  onConfirm: () => void;
};
type DemoMediaViewerState = {
  item: DemoItem;
  images: string[];
  initialIndex: number;
};

const MAX_DEMO_PHOTOS = 8;

function visibilityLabel(visibility: Visibility) {
  return visibility === "followers" ? "Followers" : `${visibility[0].toUpperCase()}${visibility.slice(1)}`;
}

function visibilityIcon(visibility: Visibility) {
  if (visibility === "private") return <LockKeyhole size={14} />;
  if (visibility === "followers") return <UsersRound size={14} />;
  return <Eye size={14} />;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

function shortDate(value: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(value));
}

function itemReactionMap(items: DemoItem[]) {
  return Object.fromEntries(items.map((item) => [item.id, {
    liked: item.likedByViewer,
    likes: item.likeCount,
    comments: item.commentCount,
    views: item.viewCount,
  }])) as Record<string, ReactionState>;
}

function useLongPress(onLongPress: () => void) {
  const timer = useRef<number | null>(null);
  const wasLongPressed = useRef(false);

  const clear = () => {
    if (timer.current) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    if ((event.target as HTMLElement).closest("button, input, textarea, select")) return;
    wasLongPressed.current = false;
    timer.current = window.setTimeout(() => {
      timer.current = null;
      wasLongPressed.current = true;
      onLongPress();
    }, 520);
  };

  return {
    onPointerDown,
    onPointerUp: clear,
    onPointerCancel: clear,
    onPointerLeave: clear,
    onPointerMove: clear,
    preventClickAfterLongPress: () => {
      const value = wasLongPressed.current;
      wasLongPressed.current = false;
      return value;
    },
  };
}

type BodyScrollLockSnapshot = {
  scrollY: number;
  bodyOverflow: string;
  bodyPaddingRight: string;
  bodyPosition: string;
  bodyTop: string;
  bodyLeft: string;
  bodyRight: string;
  bodyWidth: string;
  htmlOverflow: string;
  htmlOverscrollBehavior: string;
};

let bodyScrollLockDepth = 0;
let bodyScrollLockSnapshot: BodyScrollLockSnapshot | null = null;

function useBodyScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return;

    const { body, documentElement } = document;
    bodyScrollLockDepth += 1;

    if (bodyScrollLockDepth === 1) {
      const scrollY = window.scrollY;
      bodyScrollLockSnapshot = {
        scrollY,
        bodyOverflow: body.style.overflow,
        bodyPaddingRight: body.style.paddingRight,
        bodyPosition: body.style.position,
        bodyTop: body.style.top,
        bodyLeft: body.style.left,
        bodyRight: body.style.right,
        bodyWidth: body.style.width,
        htmlOverflow: documentElement.style.overflow,
        htmlOverscrollBehavior: documentElement.style.overscrollBehavior,
      };
      const scrollbarWidth = window.innerWidth - documentElement.clientWidth;
      const computedPaddingRight = Number.parseFloat(window.getComputedStyle(body).paddingRight) || 0;

      body.style.overflow = "hidden";
      body.style.position = "fixed";
      body.style.top = `-${scrollY}px`;
      body.style.left = "0";
      body.style.right = "0";
      body.style.width = "100%";
      documentElement.style.overflow = "hidden";
      documentElement.style.overscrollBehavior = "none";
      if (scrollbarWidth > 0) body.style.paddingRight = `${computedPaddingRight + scrollbarWidth}px`;
    }

    return () => {
      bodyScrollLockDepth = Math.max(0, bodyScrollLockDepth - 1);
      if (bodyScrollLockDepth !== 0 || !bodyScrollLockSnapshot) return;

      const snapshot = bodyScrollLockSnapshot;
      body.style.overflow = snapshot.bodyOverflow;
      body.style.paddingRight = snapshot.bodyPaddingRight;
      body.style.position = snapshot.bodyPosition;
      body.style.top = snapshot.bodyTop;
      body.style.left = snapshot.bodyLeft;
      body.style.right = snapshot.bodyRight;
      body.style.width = snapshot.bodyWidth;
      documentElement.style.overflow = snapshot.htmlOverflow;
      documentElement.style.overscrollBehavior = snapshot.htmlOverscrollBehavior;
      bodyScrollLockSnapshot = null;
      window.scrollTo(0, snapshot.scrollY);
    };
  }, [locked]);
}

function useViewportMatch(query: string) {
  return useSyncExternalStore(
    (notify) => {
      const mediaQuery = window.matchMedia(query);
      mediaQuery.addEventListener("change", notify);
      return () => mediaQuery.removeEventListener("change", notify);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

async function shareDemoTarget(title: string, text: string, url: string) {
  const nativeShare = Reflect.get(navigator, "share") as unknown;
  const usedNativeShare = typeof nativeShare === "function";
  if (usedNativeShare) {
    await nativeShare.call(navigator, { title, text, url });
    return true;
  }
  if (navigator.clipboard) {
    await navigator.clipboard.writeText(url);
    return false;
  }
  window.prompt("Copy your demo collection link", url);
  return false;
}

export function DemoCollectionWorkspace({ collection, subcollectionId }: { collection: DemoCollection; subcollectionId?: string }) {
  const subcollection = subcollectionId ? collection.subcollections.find((entry) => entry.id === subcollectionId) : null;
  if (subcollection) return <DemoSubcollectionWorkspace collection={collection} subcollection={subcollection} />;
  return <DemoCollectionDashboardCurated collection={collection} />;
}

// Retained only as a reference while the curated collection experience replaces this early prototype.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function DemoCollectionDashboardLegacy({ collection }: { collection: DemoCollection }) {
  const [name, setName] = useState(collection.name);
  const [description, setDescription] = useState(collection.description);
  const [visibility, setVisibility] = useState<Visibility>(collection.visibility);
  const [coverUrl, setCoverUrl] = useState(collection.coverUrl);
  const [subcollections, setSubcollections] = useState(collection.subcollections);
  const [directItems, setDirectItems] = useState(collection.directItems);
  const [showSettings, setShowSettings] = useState(false);
  const [showPostComposer, setShowPostComposer] = useState(false);
  const [postText, setPostText] = useState("");
  const [deleted, setDeleted] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [menuSubcollection, setMenuSubcollection] = useState<DemoSubcollection | null>(null);
  const [editingSubcollection, setEditingSubcollection] = useState<DemoSubcollection | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<DemoDeleteConfirmation | null>(null);
  const itemCount = directItems.length + subcollections.reduce((total, entry) => total + entry.items.length, 0);

  const changeCover = (file: File) => {
    if (!file.type.startsWith("image/") || file.size > 15 * 1024 * 1024) {
      setNotice({ type: "error", text: "Choose an image under 15 MB for the demo cover." });
      return;
    }
    setCoverUrl(URL.createObjectURL(file));
    setNotice({ type: "success", text: "Cover updated locally in the demo." });
  };

  const share = async () => {
    const url = `${window.location.origin}/demo/collections/${collection.slug}`;
    try {
      const usedNativeShare = await shareDemoTarget(`${name} · Klecto`, description, url);
      setNotice({ type: "success", text: usedNativeShare ? "Share sheet opened." : "Demo collection link copied." });
    } catch (error) {
      if ((error as DOMException).name !== "AbortError") setNotice({ type: "error", text: "The demo collection could not be shared." });
    }
  };
  const requestCollectionDeletion = () => {
    setDeleteConfirmation({
      title: `Delete ${name}?`,
      description: "This removes the collection from this demo session. Refresh the page to restore Arjun's sample shelf.",
      confirmLabel: "Delete collection",
      onConfirm: () => setDeleted(true),
    });
  };
  const requestItemDeletion = (item: DemoItem) => {
    setDeleteConfirmation({
      title: `Delete ${item.title}?`,
      description: "This removes the item from this local demo session. Refresh the page to restore the sample.",
      confirmLabel: "Delete item",
      onConfirm: () => {
        setDirectItems((current) => current.filter((candidate) => candidate.id !== item.id));
        setNotice({ type: "success", text: "Item removed locally in the demo." });
      },
    });
  };
  const requestSubcollectionDeletion = (target: DemoSubcollection) => {
    setDeleteConfirmation({
      title: `Delete ${target.name}?`,
      description: "This removes the subcollection from the local demo. Refresh the page to restore the sample.",
      confirmLabel: "Delete subcollection",
      onConfirm: () => {
        setSubcollections((current) => current.filter((entry) => entry.id !== target.id));
        setNotice({ type: "success", text: "Subcollection removed locally in the demo." });
      },
    });
  };

  if (deleted) {
    return (
      <main className="collection-studio-page">
        <header className="settings-topbar"><Link href="/?view=collections"><ArrowLeft size={17} /> Back to Klecto</Link><span className="eyebrow">DEMO COLLECTION</span><span>@{collection.owner.username}</span></header>
        <section className="collection-studio-shell demo-deleted-state"><Layers3 size={28} /><span className="eyebrow">DEMO CHANGE</span><h1>{name} was removed.</h1><p>That action is local to the sample account. Refresh the page to restore Arjun&apos;s starting shelf, or sign in to manage a live collection.</p><div><button className="secondary-button" onClick={() => window.location.reload()}>Restore demo</button><Link className="primary-button" href="/?view=collections">Back to Klecto</Link></div></section>
      </main>
    );
  }

  return (
    <main className="collection-studio-page">
      <header className="settings-topbar"><Link href="/?view=collections"><ArrowLeft size={17} /> Back to Klecto</Link><span className="eyebrow">DEMO COLLECTION</span><span>@{collection.owner.username}</span></header>
      <section className="collection-studio-shell collection-workspace-shell">
        <DemoWorkspaceNote />
        <section className="studio-hero studio-workspace-hero collection-showcase demo-collection-showcase">
          <div className="studio-cover studio-editable-cover"><img src={coverUrl} alt={`${name} cover`} /><span>{itemCount} objects</span><label className="studio-cover-edit"><ImagePlus size={16} /> Change cover<input type="file" accept="image/*" onChange={(event) => { const file = event.target.files?.[0]; if (file) changeCover(file); event.currentTarget.value = ""; }} /></label></div>
          <div className="studio-hero-copy"><span className="eyebrow">ARJUN&apos;S COLLECTION · {visibilityLabel(visibility)}</span><h1>{name}</h1><p>{description}</p><div className="studio-meta"><span>{subcollections.length} subcollections</span><span>{itemCount} total items</span><span>Updated {formatDate(collection.updatedAt)}</span></div><div className="studio-hero-actions"><button className="secondary-button" onClick={() => void share()}><Share2 size={16} /> Share</button><button className="primary-button" onClick={() => setShowPostComposer((current) => !current)}><Send size={16} /> Post collection</button></div><div className="studio-visibility-pills" aria-label="Demo collection privacy">{(["public", "followers", "private"] as Visibility[]).map((entry) => <button className={visibility === entry ? "active" : ""} key={entry} onClick={() => { setVisibility(entry); setNotice({ type: "success", text: `Demo collection set to ${visibilityLabel(entry).toLowerCase()}.` }); }}>{visibilityIcon(entry)} {visibilityLabel(entry)}</button>)}</div></div>
        </section>

        {showPostComposer ? <section className="studio-post-composer"><div><span className="eyebrow">SHARE TO YOUR PROFILE</span><h2>Give this collection a line of context.</h2><p>This interactive sample keeps posts in the current browser session.</p></div><textarea value={postText} onChange={(event) => setPostText(event.target.value)} placeholder="What makes this collection worth sharing? (optional)" /><footer><button className="text-button" onClick={() => setShowPostComposer(false)}><X size={15} /> Cancel</button><button className="primary-button" onClick={() => { setPostText(""); setShowPostComposer(false); setNotice({ type: "success", text: "Demo post published to Arjun&apos;s sample profile." }); }}><Send size={16} /> Publish post</button></footer></section> : null}

        <section className="studio-route-section"><div className="studio-section-head workspace-section-head"><div><span className="eyebrow">STEP 1 · CHOOSE A SUBCOLLECTION</span><h2>Subcollections</h2><p>Open one to see its cover, swipeable media, reactions, and owner controls.</p></div><button className="secondary-button" onClick={() => setShowSettings((current) => !current)}><Pencil size={16} /> {showSettings ? "Close settings" : "Manage collection"}</button></div><div className="subcollection-route-grid">{subcollections.map((entry, index) => <DemoSubcollectionCard key={entry.id} collection={collection} subcollection={entry} index={index} visibility={visibility} onOpenMenu={() => setMenuSubcollection(entry)} />)}</div></section>

        {showSettings ? <section className="settings-card studio-settings studio-details-card"><div className="settings-card-title"><span><Pencil size={16} /></span><div><h2>Collection settings</h2><p>These controls are interactive so you can preview the live owner workspace.</p></div></div><div className="settings-form-grid"><label><span>Name</span><input value={name} maxLength={80} onChange={(event) => setName(event.target.value)} /></label><label><span>Visibility</span><select value={visibility} onChange={(event) => setVisibility(event.target.value as Visibility)}><option value="public">Public</option><option value="followers">Followers</option><option value="private">Private</option></select></label><label className="wide"><span>Description</span><textarea value={description} maxLength={1000} onChange={(event) => setDescription(event.target.value)} /></label></div><div className="studio-actions"><button className="danger-button" onClick={requestCollectionDeletion}><Trash2 size={16} /> Delete collection</button><button className="primary-button" onClick={() => setNotice({ type: "success", text: "Demo collection settings saved locally." })}><Save size={16} /> Save settings</button></div></section> : null}

        <section className="studio-items-section studio-direct-items"><div className="studio-section-head"><div><span className="eyebrow">STEP 2 · ITEMS WITHOUT A SUBCOLLECTION</span><h2>Unsorted items</h2></div><button className="secondary-button" onClick={() => setNotice({ type: "success", text: "Use a signed-in account to add permanent items." })}><Plus size={15} /> Add item</button></div><DemoCompactItemGrid items={directItems} onDelete={requestItemDeletion} emptyTitle="Everything is neatly grouped." emptyBody="Open a subcollection to browse its items." /></section>
        <AnimatePresence>
          {menuSubcollection ? <DemoActionSheet title={menuSubcollection.name} subtitle="SUBCOLLECTION OPTIONS" onClose={() => setMenuSubcollection(null)} onEdit={() => { setEditingSubcollection(menuSubcollection); setMenuSubcollection(null); }} onShare={() => void share()} onDelete={() => { const target = menuSubcollection; setMenuSubcollection(null); requestSubcollectionDeletion(target); }} /> : null}
          {editingSubcollection ? <DemoSubcollectionEditorSheet subcollection={editingSubcollection} onClose={() => setEditingSubcollection(null)} onSaved={(patch) => { setSubcollections((current) => current.map((entry) => entry.id === editingSubcollection.id ? { ...entry, ...patch } : entry)); setEditingSubcollection(null); setNotice({ type: "success", text: "Subcollection details and cover saved locally." }); }} /> : null}
          {deleteConfirmation ? <DemoDeleteConfirmSheet confirmation={deleteConfirmation} onClose={() => setDeleteConfirmation(null)} /> : null}
        </AnimatePresence>
        {notice ? <div className={`settings-message floating ${notice.type}`} role="status">{notice.type === "success" ? <Check size={17} /> : null}{notice.text}</div> : null}
      </section>
    </main>
  );
}

function DemoCollectionDashboardCurated({ collection }: { collection: DemoCollection }) {
  const [name, setName] = useState(collection.name);
  const [description, setDescription] = useState(collection.description);
  const [visibility, setVisibility] = useState<Visibility>(collection.visibility);
  const [coverUrl, setCoverUrl] = useState(collection.coverUrl);
  const [subcollections, setSubcollections] = useState(collection.subcollections);
  const directItems = collection.directItems;
  const [collectionReaction, setCollectionReaction] = useState<ReactionState>({
    liked: collection.likedByViewer,
    likes: collection.likeCount,
    comments: collection.commentCount,
    views: collection.viewCount,
  });
  const [comments, setComments] = useState<DemoComment[]>(() => [
    {
      id: `demo-comment-${collection.slug}`,
      targetType: "collection",
      targetId: collection.slug,
      author: "Maya Chen",
      body: "The little stories around this shelf are my favourite part.",
      createdAt: "2026-07-08T10:20:00.000Z",
    },
  ]);
  const [commentTarget, setCommentTarget] = useState<CommentTarget | null>(null);
  const collectionViewRecorded = useRef(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showPostComposer, setShowPostComposer] = useState(false);
  const [postText, setPostText] = useState("");
  const [deleted, setDeleted] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [menuSubcollection, setMenuSubcollection] = useState<DemoSubcollection | null>(null);
  const [editingSubcollection, setEditingSubcollection] = useState<DemoSubcollection | null>(null);
  const [ownerMenuOpen, setOwnerMenuOpen] = useState(false);
  const [catalogQuery, setCatalogQuery] = useState("");
  const [catalogKind, setCatalogKind] = useState<"all" | "brand" | "series" | "era" | "custom">("all");
  const [catalogVisibility, setCatalogVisibility] = useState<Visibility | "inherit" | "all">("all");
  const [catalogSort, setCatalogSort] = useState<"order" | "recent" | "name" | "items" | "liked">("order");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<DemoDeleteConfirmation | null>(null);
  const itemCount = directItems.length + subcollections.reduce((total, entry) => total + entry.items.length, 0);

  useEffect(() => {
    if (collectionViewRecorded.current) return;
    collectionViewRecorded.current = true;
    setCollectionReaction((current) => ({ ...current, views: current.views + 1 }));
  }, []);

  const toggleCollectionLike = () => {
    setCollectionReaction((current) => ({
      ...current,
      liked: !current.liked,
      likes: current.likes + (current.liked ? -1 : 1),
    }));
  };

  const addCollectionComment = (target: CommentTarget, body: string) => {
    const next = {
      id: `demo-comment-${crypto.randomUUID()}`,
      targetType: target.type,
      targetId: target.id,
      author: collection.owner.name,
      body,
      createdAt: new Date().toISOString(),
    } satisfies DemoComment;
    setComments((current) => [...current, next]);
    setCollectionReaction((current) => ({ ...current, comments: current.comments + 1 }));
  };
  const visibleSubcollections = useMemo(() => {
    const normalizedQuery = catalogQuery.trim().toLocaleLowerCase();
    return [...subcollections]
      .filter((entry) => {
        const effectiveVisibility = entry.visibility ?? "inherit";
        const searchable = [entry.name, entry.description, entry.kind, ...entry.items.flatMap((item) => [item.title, item.brand ?? "", item.details, item.description])].join(" ").toLocaleLowerCase();
        return (catalogKind === "all" || entry.kind === catalogKind)
          && (catalogVisibility === "all" || effectiveVisibility === catalogVisibility)
          && (!normalizedQuery || searchable.includes(normalizedQuery));
      })
      .sort((left, right) => {
        if (catalogSort === "name") return left.name.localeCompare(right.name);
        if (catalogSort === "items") return right.items.length - left.items.length || left.name.localeCompare(right.name);
        if (catalogSort === "liked") return right.likeCount - left.likeCount || left.name.localeCompare(right.name);
        if (catalogSort === "recent") return (right.items[0]?.createdAt ?? "").localeCompare(left.items[0]?.createdAt ?? "");
        return left.position - right.position;
      });
  }, [catalogKind, catalogQuery, catalogSort, catalogVisibility, subcollections]);

  const changeCover = (file: File) => {
    if (!file.type.startsWith("image/") || file.size > 15 * 1024 * 1024) return setNotice({ type: "error", text: "Choose an image under 15 MB for the demo cover." });
    setCoverUrl(URL.createObjectURL(file));
    setNotice({ type: "success", text: "Cover updated locally in the demo." });
  };
  const share = async () => {
    try {
      const usedNativeShare = await shareDemoTarget(`${name} · Klecto`, description, `${window.location.origin}/demo/collections/${collection.slug}`);
      setNotice({ type: "success", text: usedNativeShare ? "Share sheet opened." : "Demo collection link copied." });
    } catch (error) {
      if ((error as DOMException).name !== "AbortError") setNotice({ type: "error", text: "The demo collection could not be shared." });
    }
  };
  const addSubcollection = () => {
    const next: DemoSubcollection = { id: `demo-section-${crypto.randomUUID()}`, name: "New section", description: "A new space in this collection.", kind: "custom", visibility: null, position: subcollections.length, coverUrl, likeCount: 0, commentCount: 0, viewCount: 0, likedByViewer: false, items: [] };
    setEditingSubcollection(next);
  };
  const requestCollectionDeletion = () => {
    setDeleteConfirmation({
      title: `Delete ${name}?`,
      description: "This removes the collection from this demo session. Refresh the page to restore Arjun's sample shelf.",
      confirmLabel: "Delete collection",
      onConfirm: () => setDeleted(true),
    });
  };
  const requestSubcollectionDeletion = (target: DemoSubcollection) => {
    setDeleteConfirmation({
      title: `Delete ${target.name}?`,
      description: "This removes the section and its local item changes from the demo collection. Refresh to restore the sample.",
      confirmLabel: "Delete section",
      onConfirm: () => {
        setSubcollections((current) => current.filter((entry) => entry.id !== target.id));
        setNotice({ type: "success", text: "Section removed locally in the demo." });
      },
    });
  };

  if (deleted) return <main className="collection-studio-page"><header className="settings-topbar"><Link href="/?view=collections"><ArrowLeft size={17} /> Back to Klecto</Link><span className="eyebrow">DEMO COLLECTION</span><span>@{collection.owner.username}</span></header><section className="collection-studio-shell demo-deleted-state"><Layers3 size={28} /><span className="eyebrow">DEMO CHANGE</span><h1>{name} was removed.</h1><p>That action is local to the sample account. Refresh this page to restore Arjun&apos;s starting shelf.</p><div><button className="secondary-button" onClick={() => window.location.reload()}>Restore demo</button><Link className="primary-button" href="/?view=collections">Back to Klecto</Link></div></section></main>;

  return <main className="collection-studio-page"><header className="settings-topbar"><Link href="/?view=collections"><ArrowLeft size={17} /> Back to Klecto</Link><span className="eyebrow">DEMO COLLECTION</span><span>@{collection.owner.username}</span></header><section className="collection-studio-shell collection-workspace-shell collection-showcase-shell"><DemoWorkspaceNote />
    <section className="collection-showcase collection-showcase-curated"><div className="collection-showcase-cover"><img src={coverUrl} alt={`${name} cover`} /><div className="collection-showcase-cover-shade" /><span>{itemCount} objects</span><label className="studio-cover-edit"><ImagePlus size={16} /> Change cover<input type="file" accept="image/*" onChange={(event) => { const file = event.target.files?.[0]; if (file) changeCover(file); event.currentTarget.value = ""; }} /></label></div><div className="collection-showcase-copy"><span className="eyebrow">ARJUN&apos;S SHELF · {visibilityLabel(visibility)}</span><h1>{name}</h1><p>{description}</p><div className="collection-showcase-stats"><span><strong>{subcollections.length}</strong> sections</span><span><strong>{itemCount}</strong> objects</span><span><strong>{collection.updatedAt ? shortDate(collection.updatedAt) : "Now"}</strong> updated</span></div></div><div className="collection-showcase-owner"><button className="collection-owner-menu-trigger" onClick={() => setOwnerMenuOpen((current) => !current)} aria-expanded={ownerMenuOpen} aria-label="Collection options"><MoreHorizontal size={19} /></button>{ownerMenuOpen ? <div className="collection-owner-menu" role="dialog" aria-label="Collection options"><button onClick={() => { setOwnerMenuOpen(false); void share(); }}><Share2 size={16} /> Share collection</button><button onClick={() => { setOwnerMenuOpen(false); setShowPostComposer(true); }}><Send size={16} /> Post collection</button><button onClick={() => { setOwnerMenuOpen(false); setShowSettings(true); }}><Pencil size={16} /> Edit collection</button><span>Visibility</span><div>{(["public", "followers", "private"] as Visibility[]).map((entry) => <button className={visibility === entry ? "active" : ""} key={entry} onClick={() => { setVisibility(entry); setNotice({ type: "success", text: `Demo collection set to ${visibilityLabel(entry).toLowerCase()}.` }); }}>{visibilityIcon(entry)} {visibilityLabel(entry)}</button>)}</div><button className="danger" onClick={() => { setOwnerMenuOpen(false); requestCollectionDeletion(); }}><Trash2 size={16} /> Delete collection</button></div> : null}</div></section>
    <section className="collection-catalog-toolbar collection-showcase-engagement" aria-label="Collection engagement">
      <span className="eyebrow">COLLECTOR RESPONSE</span>
      <div className="catalog-reactions">
        <button className={collectionReaction.liked ? "liked" : ""} type="button" onClick={toggleCollectionLike}><Heart size={16} fill={collectionReaction.liked ? "currentColor" : "none"} /> {collectionReaction.likes}</button>
        <button type="button" onClick={() => setCommentTarget({ type: "collection", id: collection.slug, title: name })}><MessageCircle size={16} /> {collectionReaction.comments}</button>
        <span title={`${collectionReaction.views} views`}><Eye size={16} /> {collectionReaction.views}</span>
      </div>
    </section>
    {showPostComposer ? <section className="studio-post-composer collection-showcase-post"><div><span className="eyebrow">SHARE TO YOUR PROFILE</span><h2>Give the shelf a line of context.</h2><p>This sample post is local to the current browser session.</p></div><textarea value={postText} onChange={(event) => setPostText(event.target.value)} placeholder="What makes this collection worth sharing? (optional)" /><footer><button className="text-button" onClick={() => setShowPostComposer(false)}><X size={15} /> Cancel</button><button className="primary-button" onClick={() => { setPostText(""); setShowPostComposer(false); setNotice({ type: "success", text: "Demo post published to Arjun&apos;s sample profile." }); }}><Send size={16} /> Publish post</button></footer></section> : null}
    <section className="collection-catalog">
      <div className="collection-catalog-head collection-catalog-head--solo">
        <div><span className="eyebrow">THE SHELVES</span><h2>Browse the collection</h2><p>Search the pieces inside, then open a shelf when you want the full story.</p></div>
        <div className="collection-catalog-actions collection-catalog-actions--solo"><button className="primary-button collection-catalog-create" onClick={addSubcollection}><Plus size={16} /> New section</button></div>
      </div>
      <div className="collection-catalog-toolbar"><label className="collection-catalog-search"><Search size={17} /><input value={catalogQuery} onChange={(event) => setCatalogQuery(event.target.value)} placeholder="Search sections, items, or brands" aria-label="Search this collection" />{catalogQuery ? <button type="button" onClick={() => setCatalogQuery("")} aria-label="Clear search"><X size={15} /></button> : null}</label><label className="collection-catalog-sort"><span>Sort</span><select value={catalogSort} onChange={(event) => setCatalogSort(event.target.value as typeof catalogSort)} aria-label="Sort sections"><option value="order">Collection order</option><option value="recent">Recent activity</option><option value="name">Name A-Z</option><option value="items">Most items</option><option value="liked">Most liked</option></select></label><div className="collection-catalog-filter-wrap"><button className={`collection-catalog-filter ${catalogKind !== "all" || catalogVisibility !== "all" ? "active" : ""}`} onClick={() => setFiltersOpen((current) => !current)} aria-expanded={filtersOpen}><SlidersHorizontal size={17} /> Filter</button>{filtersOpen ? <div className="collection-catalog-filter-popover" role="dialog" aria-label="Filter sections"><span>Type</span><div>{(["all", "brand", "series", "era", "custom"] as const).map((entry) => <button className={catalogKind === entry ? "active" : ""} key={entry} onClick={() => setCatalogKind(entry)}>{entry === "all" ? "Everything" : entry}</button>)}</div><span>Visibility</span><div>{(["all", "inherit", "public", "followers", "private"] as const).map((entry) => <button className={catalogVisibility === entry ? "active" : ""} key={entry} onClick={() => setCatalogVisibility(entry)}>{entry === "all" ? "Any visibility" : entry === "inherit" ? "Inherits collection" : visibilityLabel(entry)}</button>)}</div></div> : null}</div></div><div className="collection-catalog-results"><span>{visibleSubcollections.length === subcollections.length ? `${subcollections.length} section${subcollections.length === 1 ? "" : "s"}` : `${visibleSubcollections.length} of ${subcollections.length} sections`}</span>{catalogQuery || catalogKind !== "all" || catalogVisibility !== "all" ? <button onClick={() => { setCatalogQuery(""); setCatalogKind("all"); setCatalogVisibility("all"); }}>Clear filters</button> : null}</div><div className="subcollection-route-grid collection-catalog-grid">{visibleSubcollections.map((entry, index) => <DemoSubcollectionCard key={entry.id} collection={collection} subcollection={entry} index={index} visibility={visibility} onOpenMenu={() => setMenuSubcollection(entry)} />)}{visibleSubcollections.length === 0 ? <div className="studio-empty subcollection-empty"><Layers3 size={25} /><strong>No sections match that view.</strong><p>Try another search or clear the filters.</p></div> : null}</div>
    </section>
    {showSettings ? <section className="settings-card studio-settings studio-details-card collection-showcase-settings"><div className="settings-card-title"><span><Pencil size={16} /></span><div><h2>Collection settings</h2><p>Changes stay in this demo until you refresh.</p></div></div><div className="settings-form-grid"><label><span>Name</span><input value={name} maxLength={80} onChange={(event) => setName(event.target.value)} /></label><label><span>Visibility</span><select value={visibility} onChange={(event) => setVisibility(event.target.value as Visibility)}><option value="public">Public</option><option value="followers">Followers</option><option value="private">Private</option></select></label><label className="wide"><span>Description</span><textarea value={description} maxLength={1000} onChange={(event) => setDescription(event.target.value)} /></label></div><div className="studio-actions"><button className="danger-button" onClick={requestCollectionDeletion}><Trash2 size={16} /> Delete collection</button><button className="primary-button" onClick={() => { setShowSettings(false); setNotice({ type: "success", text: "Demo collection settings saved locally." }); }}><Save size={16} /> Save settings</button></div></section> : null}
    <AnimatePresence initial={false}>
      {showSettings ? <DemoCollectionSettingsSheet
        name={name}
        description={description}
        visibility={visibility}
        onClose={() => setShowSettings(false)}
        onSaved={(patch) => {
          setName(patch.name);
          setDescription(patch.description);
          setVisibility(patch.visibility);
          setShowSettings(false);
          setNotice({ type: "success", text: "Demo collection settings saved locally." });
        }}
        onDelete={() => {
          setShowSettings(false);
          requestCollectionDeletion();
        }}
      /> : null}
    </AnimatePresence>
    <AnimatePresence>
      {commentTarget ? <DemoCommentSheet key={`comment-${commentTarget.type}-${commentTarget.id}`} target={commentTarget} comments={comments} ownerName={collection.owner.name} onClose={() => setCommentTarget(null)} onSubmit={addCollectionComment} /> : null}
    </AnimatePresence>
    <AnimatePresence>{menuSubcollection ? <DemoActionSheet title={menuSubcollection.name} subtitle="SECTION DETAILS" note={menuSubcollection.description} onClose={() => setMenuSubcollection(null)} onEdit={() => { setEditingSubcollection(menuSubcollection); setMenuSubcollection(null); }} onShare={() => void share()} onDelete={() => { const target = menuSubcollection; setMenuSubcollection(null); requestSubcollectionDeletion(target); }} /> : null}{editingSubcollection ? <DemoSubcollectionEditorSheet subcollection={editingSubcollection} onClose={() => setEditingSubcollection(null)} onSaved={(patch) => { const target = editingSubcollection; setSubcollections((current) => { const existing = current.some((entry) => entry.id === target.id); if (existing) return current.map((entry) => entry.id === target.id ? { ...entry, ...patch } : entry); return [...current, { ...target, ...patch, position: current.length }]; }); setEditingSubcollection(null); setNotice({ type: "success", text: "Section details and cover saved locally." }); }} /> : null}{deleteConfirmation ? <DemoDeleteConfirmSheet confirmation={deleteConfirmation} onClose={() => setDeleteConfirmation(null)} /> : null}</AnimatePresence>
    {notice ? <div className={`settings-message floating ${notice.type}`} role="status">{notice.type === "success" ? <Check size={17} /> : null}{notice.text}</div> : null}
  </section></main>;
}

function DemoSubcollectionCard({ collection, subcollection, index, visibility, onOpenMenu }: { collection: DemoCollection; subcollection: DemoSubcollection; index: number; visibility: Visibility; onOpenMenu: () => void }) {
  const { preventClickAfterLongPress, ...pressHandlers } = useLongPress(onOpenMenu);
  return (
    <motion.article className="subcollection-route-card demo-subcollection-card curator-subcollection-card" {...pressHandlers} onContextMenu={(event) => event.preventDefault()} whileTap={{ scale: 0.992 }}>
      <Link href={`/demo/collections/${collection.slug}/subcollections/${subcollection.id}`} className="subcollection-route-link" onClick={(event) => { if (preventClickAfterLongPress()) event.preventDefault(); }}>
        <div className="subcollection-route-image">{subcollection.coverUrl ? <img src={subcollection.coverUrl} alt="" /> : <Layers3 size={23} />}<span>{String(index + 1).padStart(2, "0")}</span></div>
        <div><small>{subcollection.kind} · {subcollection.visibility ? visibilityLabel(subcollection.visibility) : `inherits ${visibilityLabel(visibility)}`}</small><h3>{subcollection.name}</h3><p>{subcollection.description}</p><strong>{subcollection.items.length} {subcollection.items.length === 1 ? "item" : "items"} <ChevronRight size={15} /></strong><div className="catalog-reactions subcollection-card-reactions"><span><Heart size={14} fill={subcollection.likedByViewer ? "currentColor" : "none"} /> {subcollection.likeCount}</span><span><MessageCircle size={14} /> {subcollection.commentCount}</span></div></div>
        <div className="catalog-reactions subcollection-card-reactions" aria-label={`${subcollection.viewCount} views`}><span><Eye size={14} /> {subcollection.viewCount}</span></div>
      </Link>
      <button className="subcollection-delete subcollection-menu-trigger" aria-label={`Options for ${subcollection.name}`} onClick={onOpenMenu}><MoreHorizontal size={17} /></button>
    </motion.article>
  );
}

function DemoSubcollectionWorkspace({ collection, subcollection }: { collection: DemoCollection; subcollection: DemoSubcollection }) {
  const router = useRouter();
  const [name, setName] = useState(subcollection.name);
  const [description, setDescription] = useState(subcollection.description);
  const [kind, setKind] = useState(subcollection.kind);
  const [visibility, setVisibility] = useState<Visibility | null>(subcollection.visibility);
  const [coverUrl, setCoverUrl] = useState(subcollection.coverUrl);
  const [items, setItems] = useState<DemoItem[]>(subcollection.items);
  const [deleted, setDeleted] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [subcollectionReaction, setSubcollectionReaction] = useState<ReactionState>({ liked: subcollection.likedByViewer, likes: subcollection.likeCount, comments: subcollection.commentCount, views: subcollection.viewCount });
  const [itemReactions, setItemReactions] = useState<Record<string, ReactionState>>(() => itemReactionMap(subcollection.items));
  const [comments, setComments] = useState<DemoComment[]>(() => [
    { id: "demo-comment-toy-box", targetType: "subcollection", targetId: subcollection.id, author: "Arjun Kapoor", body: "Still adding the stories behind each piece.", createdAt: "2026-07-09T10:20:00.000Z" },
    ...(subcollection.items[0] ? [{ id: `demo-comment-${subcollection.items[0].id}`, targetType: "item" as const, targetId: subcollection.items[0].id, author: "Maya Chen", body: "This one belongs in a glass case.", createdAt: "2026-07-08T10:20:00.000Z" }] : []),
  ]);
  const [commentTarget, setCommentTarget] = useState<CommentTarget | null>(null);
  const [itemDetail, setItemDetail] = useState<DemoItem | null>(null);
  const [itemQuery, setItemQuery] = useState("");
  const [itemSort, setItemSort] = useState<"order" | "recent" | "name" | "liked" | "comments">("order");
  const [itemVisibilityFilter, setItemVisibilityFilter] = useState<Visibility | "all">("all");
  const [itemFavouriteFilter, setItemFavouriteFilter] = useState<"all" | "favourites" | "not-favourites">("all");
  const [itemMoodFilter, setItemMoodFilter] = useState<DemoItem["mood"] | "all">("all");
  const [itemFiltersOpen, setItemFiltersOpen] = useState(false);
  const [itemMenu, setItemMenu] = useState<DemoItem | null>(null);
  const [subcollectionMenuOpen, setSubcollectionMenuOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<DemoItem | null>(null);
  const [addingItem, setAddingItem] = useState(false);
  const [editingSubcollection, setEditingSubcollection] = useState(false);
  const [mediaViewer, setMediaViewer] = useState<DemoMediaViewerState | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<DemoDeleteConfirmation | null>(null);
  const [isNavigatingBack, setIsNavigatingBack] = useState(false);
  const subcollectionViewRecorded = useRef(false);
  const viewedItemIds = useRef(new Set<string>());
  const backNavigationTimer = useRef<number | null>(null);
  const effectiveVisibility = visibility ?? collection.visibility;
  const hasActiveItemFilters = itemQuery || itemVisibilityFilter !== "all" || itemFavouriteFilter !== "all" || itemMoodFilter !== "all";

  useEffect(() => {
    if (subcollectionViewRecorded.current) return;
    subcollectionViewRecorded.current = true;
    setSubcollectionReaction((current) => ({ ...current, views: current.views + 1 }));
  }, []);
  const visibleItems = useMemo(() => {
    const normalizedQuery = itemQuery.trim().toLocaleLowerCase();
    return items
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => {
        const searchable = [item.title, item.description, item.brand ?? "", item.details, item.mood, item.visibility, item.isFavorite ? "favourite favorite star" : ""]
          .join(" ")
          .toLocaleLowerCase();
        return (!normalizedQuery || searchable.includes(normalizedQuery))
          && (itemVisibilityFilter === "all" || item.visibility === itemVisibilityFilter)
          && (itemFavouriteFilter === "all" || (itemFavouriteFilter === "favourites" ? item.isFavorite : !item.isFavorite))
          && (itemMoodFilter === "all" || item.mood === itemMoodFilter);
      })
      .sort((left, right) => {
        if (itemSort === "recent") return right.item.createdAt.localeCompare(left.item.createdAt) || left.index - right.index;
        if (itemSort === "name") return left.item.title.localeCompare(right.item.title) || left.index - right.index;
        if (itemSort === "liked") return (itemReactions[right.item.id]?.likes ?? 0) - (itemReactions[left.item.id]?.likes ?? 0) || left.index - right.index;
        if (itemSort === "comments") return (itemReactions[right.item.id]?.comments ?? 0) - (itemReactions[left.item.id]?.comments ?? 0) || left.index - right.index;
        return left.index - right.index;
      })
      .map(({ item }) => item);
  }, [itemFavouriteFilter, itemMoodFilter, itemQuery, itemReactions, itemSort, itemVisibilityFilter, items]);

  const clearItemFilters = () => {
    setItemQuery("");
    setItemVisibilityFilter("all");
    setItemFavouriteFilter("all");
    setItemMoodFilter("all");
  };

  const openComments = (target: CommentTarget) => {
    setItemMenu(null);
    setCommentTarget(target);
  };

  const share = async () => {
    const url = `${window.location.origin}/demo/collections/${collection.slug}/subcollections/${subcollection.id}`;
    try {
      const usedNativeShare = await shareDemoTarget(`${name} · ${collection.name}`, description, url);
      setNotice({ type: "success", text: usedNativeShare ? "Share sheet opened." : "Subcollection link copied." });
    } catch (error) {
      if ((error as DOMException).name !== "AbortError") setNotice({ type: "error", text: "The subcollection could not be shared." });
    }
  };

  const shareItem = async (item: DemoItem) => {
    const url = `${window.location.origin}/demo/collections/${collection.slug}/subcollections/${subcollection.id}#item-${item.id}`;
    try {
      const usedNativeShare = await shareDemoTarget(item.title, item.description || `A saved object in ${name}.`, url);
      setNotice({ type: "success", text: usedNativeShare ? "Share sheet opened." : "Item link copied." });
    } catch (error) {
      if ((error as DOMException).name !== "AbortError") setNotice({ type: "error", text: "The item could not be shared." });
    }
  };

  const changeCover = (file: File) => {
    if (!file.type.startsWith("image/") || file.size > 15 * 1024 * 1024) {
      setNotice({ type: "error", text: "Choose an image under 15 MB for the demo cover." });
      return;
    }
    setCoverUrl(URL.createObjectURL(file));
    setNotice({ type: "success", text: "Subcollection cover updated locally." });
  };

  const toggleSubcollectionLike = () => {
    setSubcollectionReaction((current) => ({ ...current, liked: !current.liked, likes: current.likes + (current.liked ? -1 : 1) }));
  };

  const toggleItemLike = (itemId: string) => {
    setItemReactions((current) => {
      const prior = current[itemId] ?? { liked: false, likes: 0, comments: 0, views: 0 };
      return { ...current, [itemId]: { ...prior, liked: !prior.liked, likes: prior.likes + (prior.liked ? -1 : 1) } };
    });
  };

  const recordItemView = (itemId: string) => {
    if (viewedItemIds.current.has(itemId)) return;
    viewedItemIds.current.add(itemId);
    setItemReactions((current) => {
      const prior = current[itemId] ?? { liked: false, likes: 0, comments: 0, views: 0 };
      return { ...current, [itemId]: { ...prior, views: prior.views + 1 } };
    });
  };

  const addComment = (target: CommentTarget, body: string) => {
    const next = { id: `demo-comment-${crypto.randomUUID()}`, targetType: target.type, targetId: target.id, author: collection.owner.name, body, createdAt: new Date().toISOString() } satisfies DemoComment;
    setComments((current) => [...current, next]);
    if (target.type === "subcollection") setSubcollectionReaction((current) => ({ ...current, comments: current.comments + 1 }));
    else if (target.type === "item") setItemReactions((current) => ({ ...current, [target.id]: { ...(current[target.id] ?? { liked: false, likes: 0, comments: 0, views: 0 }), comments: (current[target.id]?.comments ?? 0) + 1 } }));
  };

  const deleteItem = (item: DemoItem) => {
    setDeleteConfirmation({
      title: `Delete ${item.title}?`,
      description: "This removes the item and its locally added photos from this demo session. Refresh the page to restore the sample.",
      confirmLabel: "Delete item",
      onConfirm: () => {
        setItems((current) => current.filter((entry) => entry.id !== item.id));
        setItemDetail((current) => current?.id === item.id ? null : current);
        setItemMenu(null);
        setNotice({ type: "success", text: "Item removed locally in the demo." });
      },
    });
  };

  const deleteSubcollection = () => {
    setDeleteConfirmation({
      title: `Delete ${name}?`,
      description: "This removes this subcollection from the demo workspace. Refresh the page to restore Arjun's original collection.",
      confirmLabel: "Delete subcollection",
      onConfirm: () => {
        setDeleted(true);
        setSubcollectionMenuOpen(false);
      },
    });
  };

  const saveItem = (next: DemoItem) => {
    const exists = items.some((item) => item.id === next.id);
    setItems((current) => exists ? current.map((item) => item.id === next.id ? next : item) : [next, ...current]);
    if (!exists) setItemReactions((current) => ({ ...current, [next.id]: { liked: next.likedByViewer, likes: next.likeCount, comments: next.commentCount, views: next.viewCount } }));
    setEditingItem(null);
    setItemDetail(null);
    setAddingItem(false);
    setNotice({ type: "success", text: exists ? "Item and photos saved locally." : "New item with photos added locally." });
  };

  const saveItemFromDetail = (next: DemoItem) => {
    setItems((current) => current.map((item) => item.id === next.id ? next : item));
    setItemDetail(next);
    setNotice({ type: "success", text: "Item details and photos saved locally." });
  };

  const saveSubcollection = (patch: SubcollectionPatch) => {
    setName(patch.name);
    setDescription(patch.description);
    setKind(patch.kind);
    setVisibility(patch.visibility);
    setCoverUrl(patch.coverUrl);
    setEditingSubcollection(false);
    setNotice({ type: "success", text: "Subcollection details and cover saved locally." });
  };

  const navigateBackToCollection = () => {
    if (isNavigatingBack) return;
    setIsNavigatingBack(true);
    backNavigationTimer.current = window.setTimeout(() => {
      router.push(`/demo/collections/${collection.slug}`);
    }, 170);
  };

  useEffect(() => () => {
    if (backNavigationTimer.current !== null) window.clearTimeout(backNavigationTimer.current);
  }, []);

  if (deleted) {
    return <main className="collection-studio-page"><header className="settings-topbar"><Link href={`/demo/collections/${collection.slug}`}><ArrowLeft size={17} /> {collection.name}</Link><span className="eyebrow">DEMO SUBCOLLECTION</span><span>@{collection.owner.username}</span></header><section className="collection-studio-shell demo-deleted-state"><Layers3 size={28} /><span className="eyebrow">DEMO CHANGE</span><h1>{name} was removed.</h1><p>This change is local to the sample workspace. Refresh to restore Arjun&apos;s original collection.</p><Link className="primary-button" href={`/demo/collections/${collection.slug}`}>Back to collection</Link></section></main>;
  }

  return (
    <motion.main
      className="collection-studio-page subcollection-immersive-page demo-subcollection-immersive-page"
      initial={{ opacity: 0, y: 10 }}
      animate={isNavigatingBack ? { opacity: 0, y: -8 } : { opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
    >
      <header className="subcollection-floating-nav">
        <button className="subcollection-back-button" disabled={isNavigatingBack} onClick={navigateBackToCollection}><ArrowLeft size={17} /><span>Back to {collection.name}</span></button>
        <span className="subcollection-nav-title">{name}</span>
        <button className="subcollection-more-button" onClick={() => setSubcollectionMenuOpen(true)} aria-label="Subcollection options"><MoreHorizontal size={19} /></button>
      </header>

      <section className="subcollection-cover-stage">
        <motion.div className="subcollection-cover-art" initial={{ opacity: 0, scale: 1.025 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}>
          {coverUrl ? <img src={coverUrl} alt={`${name} cover`} /> : <Layers3 size={42} />}
          <div className="subcollection-cover-shade" />
          <button className="subcollection-cover-back" disabled={isNavigatingBack} onClick={navigateBackToCollection}><ArrowLeft size={16} /> Collection</button>
          <label className="subcollection-cover-edit-trigger"><Camera size={16} /> Edit cover<input type="file" accept="image/*" onChange={(event) => { const file = event.target.files?.[0]; if (file) changeCover(file); event.currentTarget.value = ""; }} /></label>
          <div className="subcollection-cover-copy"><span>{kind} · {visibilityLabel(effectiveVisibility)}</span><h1>{name}</h1><p>{description || `A dedicated part of ${collection.name}.`}</p></div>
        </motion.div>

        <div className="subcollection-info-bar">
          <div><strong>{items.length}</strong><span>{items.length === 1 ? "item" : "items"}</span></div><div><strong>{String(subcollection.position + 1).padStart(2, "0")}</strong><span>in collection</span></div><div><strong>{shortDate(collection.updatedAt)}</strong><span>last update</span></div>
          <div className="catalog-reactions subcollection-reactions"><button className={subcollectionReaction.liked ? "liked" : ""} onClick={toggleSubcollectionLike}><Heart size={17} fill={subcollectionReaction.liked ? "currentColor" : "none"} /> {subcollectionReaction.likes}</button><button onClick={() => openComments({ type: "subcollection", id: subcollection.id, title: name })}><MessageCircle size={17} /> {subcollectionReaction.comments}</button><span title={`${subcollectionReaction.views} views`}><Eye size={17} /> {subcollectionReaction.views}</span><button onClick={() => void share()} aria-label="Share subcollection"><Share2 size={17} /></button></div>
        </div>
      </section>

      <section className="subcollection-content-shell">
        <div className="subcollection-items-heading"><div><span className="eyebrow">THE OBJECTS INSIDE</span><h2>Items in order</h2><p>Swipe each gallery with your finger, open a full-screen photo, or hold an item for its owner actions.</p></div><button className="primary-button" onClick={() => setAddingItem(true)}><Plus size={16} /> Add item</button></div>
        <div className="subcollection-item-toolbar">
          <label className="subcollection-item-search"><Search size={17} /><input value={itemQuery} onChange={(event) => setItemQuery(event.target.value)} placeholder="Search titles, brands, or memories" aria-label="Search items in this subcollection" />{itemQuery ? <button type="button" onClick={() => setItemQuery("")} aria-label="Clear item search"><X size={15} /></button> : null}</label>
          <label className="subcollection-item-sort"><span>Sort</span><select value={itemSort} onChange={(event) => setItemSort(event.target.value as typeof itemSort)} aria-label="Sort items"><option value="order">Collection order</option><option value="recent">Recently added</option><option value="name">Name A–Z</option><option value="liked">Most liked</option><option value="comments">Most discussed</option></select></label>
          <div className="subcollection-item-filter-wrap"><button className={`subcollection-item-filter ${itemVisibilityFilter !== "all" || itemFavouriteFilter !== "all" || itemMoodFilter !== "all" ? "active" : ""}`} type="button" onClick={() => setItemFiltersOpen((current) => !current)} aria-expanded={itemFiltersOpen}><SlidersHorizontal size={17} /> Filter</button>{itemFiltersOpen ? <div className="subcollection-item-filter-popover" role="dialog" aria-label="Filter items"><span>Favourite</span><div className="subcollection-item-favourite-filter">{(["all", "favourites", "not-favourites"] as const).map((entry) => <button className={itemFavouriteFilter === entry ? "active" : ""} type="button" key={entry} onClick={() => setItemFavouriteFilter(entry)}>{entry === "all" ? "Everything" : entry === "favourites" ? "Favourites" : "Not favourite"}</button>)}</div><span>Visibility</span><div>{(["all", "public", "followers", "private"] as const).map((entry) => <button className={itemVisibilityFilter === entry ? "active" : ""} type="button" key={entry} onClick={() => setItemVisibilityFilter(entry)}>{entry === "all" ? "Any visibility" : visibilityLabel(entry)}</button>)}</div><span>Mood</span><div>{(["all", "grail", "memory", "favorite", "regret", "neutral"] as const).map((entry) => <button className={itemMoodFilter === entry ? "active" : ""} type="button" key={entry} onClick={() => setItemMoodFilter(entry)}>{entry === "all" ? "Any mood" : entry}</button>)}</div></div> : null}</div>
        </div>
        <div className="subcollection-item-results" aria-live="polite"><span>{visibleItems.length === items.length ? `${items.length} ${items.length === 1 ? "item" : "items"}` : `${visibleItems.length} of ${items.length} items`}</span>{hasActiveItemFilters ? <button type="button" onClick={clearItemFilters}>Clear filters</button> : null}</div>
        <div className="subcollection-item-grid">
          {visibleItems.map((item, index) => <DemoSubcollectionItemCard key={item.id} item={item} order={index + 1} reaction={itemReactions[item.id] ?? { liked: false, likes: 0, comments: 0, views: 0 }} onToggleLike={() => toggleItemLike(item.id)} onComment={() => openComments({ type: "item", id: item.id, title: item.title })} onOpenDetail={() => { recordItemView(item.id); setItemDetail(item); }} onOpenMenu={() => setItemMenu(item)} onOpenMedia={(mediaItem, images, initialIndex) => { recordItemView(mediaItem.id); setMediaViewer({ item: mediaItem, images, initialIndex }); }} />)}
          {visibleItems.length === 0 ? <div className="studio-empty"><Layers3 size={24} /><strong>{items.length ? "No items match that view." : "This subcollection is ready."}</strong><p>{items.length ? "Try a different search or clear the filters." : "Add an item and a few images to start its visual story."}</p>{items.length ? <button className="text-button" type="button" onClick={clearItemFilters}>Clear filters</button> : null}</div> : null}
        </div>
      </section>

      <AnimatePresence>
        {itemDetail ? <DemoCatalogItemDetailSheet key={`item-detail-${itemDetail.id}`} item={itemDetail} subcollectionName={name} visibility={effectiveVisibility} reaction={itemReactions[itemDetail.id] ?? { liked: false, likes: 0, comments: 0, views: 0 }} onClose={() => setItemDetail(null)} onToggleLike={() => toggleItemLike(itemDetail.id)} onComment={() => openComments({ type: "item", id: itemDetail.id, title: itemDetail.title })} onShare={() => void shareItem(itemDetail)} onSaveItem={saveItemFromDetail} onDelete={() => deleteItem(itemDetail)} onOpenMedia={(mediaItem, images, initialIndex) => { recordItemView(mediaItem.id); setMediaViewer({ item: mediaItem, images, initialIndex }); }} /> : null}
        {commentTarget ? <DemoCommentSheet key={`comment-${commentTarget.type}-${commentTarget.id}`} target={commentTarget} comments={comments} ownerName={collection.owner.name} aboveItemDetail={Boolean(itemDetail)} onClose={() => setCommentTarget(null)} onSubmit={addComment} /> : null}
        {itemMenu ? <DemoActionSheet key={`item-menu-${itemMenu.id}`} title={itemMenu.title} subtitle="ITEM OPTIONS" onClose={() => setItemMenu(null)} onEdit={() => { setEditingItem(itemMenu); setItemMenu(null); }} onShare={() => void shareItem(itemMenu)} onDelete={() => deleteItem(itemMenu)} /> : null}
        {subcollectionMenuOpen ? <DemoActionSheet key={`subcollection-menu-${subcollection.id}`} title={name} subtitle="SUBCOLLECTION OPTIONS" onClose={() => setSubcollectionMenuOpen(false)} onEdit={() => { setSubcollectionMenuOpen(false); setEditingSubcollection(true); }} onShare={() => void share()} onDelete={deleteSubcollection} /> : null}
        {editingItem ? <DemoItemEditorSheet key={`edit-item-${editingItem.id}`} item={editingItem} subcollectionName={name} onClose={() => setEditingItem(null)} onSaved={saveItem} /> : null}
        {addingItem ? <DemoItemEditorSheet key="add-item" subcollectionName={name} onClose={() => setAddingItem(false)} onSaved={saveItem} /> : null}
        {editingSubcollection ? <DemoSubcollectionEditorSheet key={`edit-subcollection-${subcollection.id}`} subcollection={{ ...subcollection, name, description, kind, visibility, coverUrl }} onClose={() => setEditingSubcollection(false)} onSaved={saveSubcollection} /> : null}
        {mediaViewer ? <DemoMediaViewer key={`media-viewer-${mediaViewer.item.id}`} item={mediaViewer.item} images={mediaViewer.images} initialIndex={mediaViewer.initialIndex} onClose={() => setMediaViewer(null)} onOpenDetail={() => { setMediaViewer(null); setItemDetail(mediaViewer.item); }} /> : null}
        {deleteConfirmation ? <DemoDeleteConfirmSheet key={`delete-${deleteConfirmation.title}`} confirmation={deleteConfirmation} onClose={() => setDeleteConfirmation(null)} /> : null}
      </AnimatePresence>
      {notice ? <div className={`settings-message floating ${notice.type}`} role="status">{notice.type === "success" ? <Check size={17} /> : null}{notice.text}</div> : null}
    </motion.main>
  );
}

function DemoSubcollectionItemCard({ item, order, reaction, onToggleLike, onComment, onOpenDetail, onOpenMenu, onOpenMedia }: { item: DemoItem; order: number; reaction: ReactionState; onToggleLike: () => void; onComment: () => void; onOpenDetail: () => void; onOpenMenu: () => void; onOpenMedia: (item: DemoItem, images: string[], initialIndex: number) => void }) {
  const { preventClickAfterLongPress, ...pressHandlers } = useLongPress(onOpenMenu);
  return <motion.article className="subcollection-item-card" role="button" tabIndex={0} aria-label={`Open ${item.title}`} {...pressHandlers} onContextMenu={(event) => event.preventDefault()} onClick={() => { if (!preventClickAfterLongPress()) onOpenDetail(); }} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onOpenDetail(); } }} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.36, delay: Math.min(order * 0.035, 0.18), ease: [0.16, 1, 0.3, 1] }} whileTap={{ scale: 0.992 }}><DemoItemMediaCarousel item={item} onOpenMedia={onOpenMedia} /><div className="subcollection-item-copy"><div className="subcollection-item-line"><span>#{String(order).padStart(2, "0")}</span><button onClick={(event) => { event.stopPropagation(); onOpenMenu(); }} aria-label={`More options for ${item.title}`}><MoreHorizontal size={17} /></button></div><small>{item.brand || item.mood}</small><h3>{item.title}</h3><p>{item.details || item.description || "Catalogued object"}</p><div className="catalog-reactions"><button className={reaction.liked ? "liked" : ""} onClick={(event) => { event.stopPropagation(); onToggleLike(); }}><Heart size={16} fill={reaction.liked ? "currentColor" : "none"} /> {reaction.likes}</button><button onClick={(event) => { event.stopPropagation(); onComment(); }}><MessageCircle size={16} /> {reaction.comments}</button><span title={`${reaction.views} views`}><Eye size={16} /> {reaction.views}</span></div></div></motion.article>;
}

function DemoItemMediaCarousel({ item, onOpenMedia }: { item: DemoItem; onOpenMedia: (item: DemoItem, images: string[], initialIndex: number) => void }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const images = item.images;
  return <div className="item-media-carousel demo-item-media-carousel"><div className="item-media-scroll" onScroll={(event) => { const width = event.currentTarget.clientWidth; if (width) setActiveIndex(Math.min(images.length - 1, Math.max(0, Math.round(event.currentTarget.scrollLeft / width)))); }}>{images.length ? images.map((image, index) => <button className="item-media-slide" key={`${image}-${index}`} onClick={(event) => { event.stopPropagation(); onOpenMedia(item, images, index); }} aria-label={`Open photo ${index + 1} of ${item.title}`}><img src={image} alt={`${item.title}, photo ${index + 1}`} /></button>) : <div className="item-media-empty"><Layers3 size={24} /></div>}</div>{images.length > 1 ? <div className="item-media-indicator"><span>{activeIndex + 1}/{images.length}</span><div>{images.map((image, index) => <i className={activeIndex === index ? "active" : ""} key={`${image}-dot`} />)}</div></div> : null}<button className="item-media-zoom item-media-open" onClick={(event) => { event.stopPropagation(); onOpenMedia(item, images, activeIndex); }} aria-label={`Open photo viewer for ${item.title}`} title="Open photo viewer"><Maximize2 size={15} /></button>{item.isFavorite ? <span className="item-favourite"><Star size={13} fill="currentColor" /></span> : null}{item.visibility === "private" ? <span className="item-private"><LockKeyhole size={13} /></span> : null}</div>;
}

function DemoCatalogItemDetailSheet({
  item,
  subcollectionName,
  visibility,
  reaction,
  onClose,
  onToggleLike,
  onComment,
  onShare,
  onSaveItem,
  onDelete,
  onOpenMedia,
}: {
  item: DemoItem;
  subcollectionName: string;
  visibility: Visibility;
  reaction: ReactionState;
  onClose: () => void;
  onToggleLike: () => void;
  onComment: () => void;
  onShare: () => void;
  onSaveItem: (item: DemoItem) => void;
  onDelete: () => void;
  onOpenMedia: (item: DemoItem, images: string[], initialIndex: number) => void;
}) {
  useBodyScrollLock(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(item.title);
  const [description, setDescription] = useState(item.description);
  const [brand, setBrand] = useState(item.brand ?? "");
  const [details, setDetails] = useState(item.details);
  const [mood, setMood] = useState<DemoItem["mood"]>(item.mood);
  const [itemVisibility, setItemVisibility] = useState<Visibility>(item.visibility ?? visibility);
  const [isFavorite, setIsFavorite] = useState(item.isFavorite);
  const [photos, setPhotos] = useState(item.images);
  const [editError, setEditError] = useState("");

  const images = isEditing ? photos : item.images;
  const safeActiveIndex = Math.min(activeIndex, Math.max(images.length - 1, 0));
  const displayedTitle = isEditing ? title.trim() || "Untitled object" : item.title;
  const displayedFavorite = isEditing ? isFavorite : item.isFavorite;
  const metadata = [
    { label: "Brand", value: item.brand },
    { label: "Details", value: item.details },
    { label: "Mood", value: item.mood },
    { label: "Visibility", value: visibilityLabel(item.visibility ?? visibility) },
    { label: "Added", value: shortDate(item.createdAt) },
    { label: "Photos", value: `${images.length} ${images.length === 1 ? "photo" : "photos"}` },
  ].filter((entry): entry is { label: string; value: string } => Boolean(entry.value));
  const viewerItem: DemoItem = {
    ...item,
    title: displayedTitle,
    description: isEditing ? description : item.description,
    brand: isEditing ? brand.trim() || null : item.brand,
    details: isEditing ? details : item.details,
    mood: isEditing ? mood : item.mood,
    visibility: isEditing ? itemVisibility : item.visibility,
    isFavorite: displayedFavorite,
    images,
  };

  const resetEditor = () => {
    setTitle(item.title);
    setDescription(item.description);
    setBrand(item.brand ?? "");
    setDetails(item.details);
    setMood(item.mood);
    setItemVisibility(item.visibility ?? visibility);
    setIsFavorite(item.isFavorite);
    setPhotos(item.images);
    setActiveIndex(0);
    setEditError("");
    setIsEditing(false);
  };

  const startEditor = () => {
    setTitle(item.title);
    setDescription(item.description);
    setBrand(item.brand ?? "");
    setDetails(item.details);
    setMood(item.mood);
    setItemVisibility(item.visibility ?? visibility);
    setIsFavorite(item.isFavorite);
    setPhotos(item.images);
    setActiveIndex(0);
    setEditError("");
    setIsEditing(true);
  };

  const selectPhotos = (files: FileList | null, replace = false) => {
    if (!files?.length) return;
    const selection = Array.from(files);
    const invalid = selection.find((file) => !file.type.startsWith("image/") || file.size > 15 * 1024 * 1024);
    if (invalid) {
      setEditError("Use image files under 15 MB.");
      return;
    }
    if ((!replace && photos.length + selection.length > MAX_DEMO_PHOTOS) || (replace && selection.length > MAX_DEMO_PHOTOS)) {
      setEditError(`An item can have up to ${MAX_DEMO_PHOTOS} photos.`);
      return;
    }
    setPhotos(replace ? selection.map((file) => URL.createObjectURL(file)) : (current) => [...current, ...selection.map((file) => URL.createObjectURL(file))]);
    setActiveIndex(0);
    setEditError("");
  };

  const save = () => {
    if (!title.trim()) {
      setEditError("Give this item a title.");
      return;
    }
    onSaveItem({
      ...item,
      title: title.trim(),
      description: description.trim(),
      brand: brand.trim() || null,
      details: details.trim(),
      mood,
      visibility: itemVisibility,
      isFavorite,
      images: photos,
    });
    setEditError("");
    setIsEditing(false);
  };

  return (
    <motion.div className="catalog-item-detail-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.section
        className={`catalog-item-detail-sheet${isEditing ? " catalog-item-detail-sheet--editing" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={`${displayedTitle} details`}
        initial={{ opacity: 0, y: 28, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 18, scale: 0.985 }}
        transition={{ type: "spring", damping: 28, stiffness: 310 }}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="catalog-item-detail-header">
          <div>
            <span className="catalog-item-detail-context"><Layers3 size={14} /> {subcollectionName}</span>
            <h2>{displayedTitle}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close item details"><X size={20} /></button>
        </header>

        <div className="catalog-item-detail-gallery">
          {images.length ? (
            <div
              className="catalog-item-detail-gallery-scroll"
              onScroll={(event) => {
                const width = event.currentTarget.clientWidth;
                if (width) setActiveIndex(Math.min(images.length - 1, Math.max(0, Math.round(event.currentTarget.scrollLeft / width))));
              }}
            >
              {images.map((image, index) => (
                <button className="catalog-item-detail-gallery-slide" type="button" key={`${image}-${index}`} onClick={() => onOpenMedia(viewerItem, images, index)} aria-label={`Open photo ${index + 1} fullscreen`}>
                  <img src={image} alt={`${displayedTitle}, photo ${index + 1}`} />
                </button>
              ))}
            </div>
          ) : (
            <div className="catalog-item-detail-gallery-empty"><Layers3 size={30} /><span>No photos added yet</span></div>
          )}
          {images.length > 1 ? (
            <div className="catalog-item-detail-indicator">
              <span>{safeActiveIndex + 1}/{images.length}</span>
              <div>{images.map((image, index) => <i className={index === safeActiveIndex ? "active" : ""} key={`${image}-indicator`} />)}</div>
            </div>
          ) : null}
          {displayedFavorite ? <span className="catalog-item-detail-favorite"><Star size={15} fill="currentColor" /> Favourite</span> : null}
        </div>

        {isEditing ? (
          <form
            className="catalog-item-inline-editor demo-catalog-item-inline-editor"
            id="catalog-item-detail-editor"
            onSubmit={(event) => {
              event.preventDefault();
              save();
            }}
          >
            <div className="catalog-item-inline-heading">
              <span className="eyebrow">EDIT THIS ITEM</span>
              <p>Make changes without leaving this item. Everything remains local to the demo.</p>
            </div>
            <div className="catalog-item-inline-grid">
              <label><span>Title</span><input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={140} /></label>
              <label><span>Brand</span><input value={brand} onChange={(event) => setBrand(event.target.value)} maxLength={100} /></label>
              <label><span>Details</span><input value={details} onChange={(event) => setDetails(event.target.value)} maxLength={160} placeholder="Year · condition · memory" /></label>
              <label><span>Mood</span><select value={mood} onChange={(event) => setMood(event.target.value as DemoItem["mood"])}><option value="grail">Grail</option><option value="memory">Memory</option><option value="favorite">Favourite</option><option value="regret">Regret</option><option value="neutral">Neutral</option></select></label>
              <label><span>Visibility</span><select value={itemVisibility} onChange={(event) => setItemVisibility(event.target.value as Visibility)}><option value="public">Public</option><option value="followers">Followers</option><option value="private">Private</option></select></label>
              <label className="catalog-item-inline-description"><span>Description</span><textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={4000} placeholder="What makes this object worth keeping?" /></label>
            </div>
            <label className="catalog-item-inline-favourite"><input type="checkbox" checked={isFavorite} onChange={(event) => setIsFavorite(event.target.checked)} /><Star size={16} fill={isFavorite ? "currentColor" : "none"} /> Favourite item</label>
            <section className="catalog-item-inline-media" aria-label="Item photos">
              <div className="catalog-item-inline-media-copy"><span>Photos</span><p>Swipeable gallery · up to {MAX_DEMO_PHOTOS} images</p></div>
              <div className="catalog-item-inline-media-actions">
                <label className="catalog-item-inline-upload"><ImagePlus size={16} /> Add photos<input type="file" accept="image/*" multiple onChange={(event) => { selectPhotos(event.target.files); event.currentTarget.value = ""; }} /></label>
                <label className="catalog-item-inline-upload is-replace"><Camera size={16} /> Replace gallery<input type="file" accept="image/*" multiple onChange={(event) => { selectPhotos(event.target.files, true); event.currentTarget.value = ""; }} /></label>
              </div>
              {photos.length ? (
                <div className="catalog-item-inline-previews">
                  {photos.map((photo, index) => (
                    <figure key={`${photo}-${index}`}>
                      <img src={photo} alt={`Photo ${index + 1} preview`} />
                      <button type="button" onClick={() => { setPhotos((current) => current.filter((_, photoIndex) => photoIndex !== index)); setActiveIndex(0); }} aria-label={`Remove photo ${index + 1}`}><X size={14} /></button>
                    </figure>
                  ))}
                </div>
              ) : <div className="catalog-item-inline-empty"><ImagePlus size={18} /><span>Add the first photo for this item.</span></div>}
            </section>
            {editError ? <p className="catalog-item-inline-error" role="alert">{editError}</p> : null}
          </form>
        ) : (
          <div className="catalog-item-detail-copy">
            <div className="catalog-item-detail-story">
              <span className="eyebrow">THE STORY</span>
              <p className="catalog-item-detail-description">{item.description || "No description has been added to this object yet."}</p>
            </div>
            <dl className="catalog-item-detail-meta">{metadata.map((entry) => <div key={entry.label}><dt>{entry.label}</dt><dd>{entry.value}</dd></div>)}</dl>
          </div>
        )}

        <footer className={`catalog-item-detail-actions${isEditing ? " catalog-item-detail-actions--editing" : ""}`}>
          {isEditing ? (
            <div className="catalog-item-inline-actions">
              <button type="button" className="text-button" onClick={resetEditor}><X size={16} /> Cancel</button>
              <button type="submit" form="catalog-item-detail-editor" className="primary-button"><Save size={16} /> Save changes</button>
            </div>
          ) : (
            <>
              <div>
                <button className={reaction.liked ? "liked" : ""} type="button" onClick={onToggleLike}><Heart size={17} fill={reaction.liked ? "currentColor" : "none"} /> <span>{reaction.likes}</span></button>
                <button type="button" onClick={onComment}><MessageCircle size={17} /> <span>{reaction.comments}</span></button>
                <span title={`${reaction.views} views`}><Eye size={17} /> <span>{reaction.views}</span></span>
                <button type="button" onClick={onShare}><Share2 size={17} /><span>Share</span></button>
              </div>
              <div className="catalog-item-detail-owner-actions">
                <button type="button" onClick={startEditor}><Pencil size={17} /><span>Edit</span></button>
                <button className="danger" type="button" onClick={onDelete}><Trash2 size={17} /><span>Delete</span></button>
              </div>
            </>
          )}
        </footer>
      </motion.section>
    </motion.div>
  );
}


function DemoCompactItemGrid({ items, onDelete, emptyTitle, emptyBody }: { items: DemoItem[]; onDelete: (item: DemoItem) => void; emptyTitle: string; emptyBody: string }) {
  return <div className="studio-item-grid">{items.map((item) => <article key={item.id}><div className="studio-item-image">{item.images[0] ? <img src={item.images[0]} alt={item.title} /> : <Layers3 />}{item.isFavorite ? <i><Star size={13} fill="currentColor" /></i> : null}{item.visibility === "private" ? <span><LockKeyhole size={13} /></span> : null}</div><div><small>{item.brand || item.mood}</small><h3>{item.title}</h3><p>{item.details || item.description}</p><div className="catalog-reactions"><span><Heart size={14} fill={item.likedByViewer ? "currentColor" : "none"} /> {item.likeCount}</span><span><MessageCircle size={14} /> {item.commentCount}</span><span><Eye size={14} /> {item.viewCount}</span></div><button onClick={() => onDelete(item)}><Trash2 size={14} /> Delete</button></div></article>)}{items.length === 0 ? <div className="studio-empty"><Layers3 size={24} /><strong>{emptyTitle}</strong><p>{emptyBody}</p></div> : null}</div>;
}

function DemoActionSheet({ title, subtitle, note, onClose, onEdit, onShare, onDelete }: { title: string; subtitle: string; note?: string; onClose: () => void; onEdit: () => void; onShare: () => void; onDelete: () => void }) {
  return <motion.div className="catalog-action-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}><motion.section className="catalog-action-sheet" initial={{ opacity: 0, y: 24, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 14, scale: 0.98 }} transition={{ type: "spring", damping: 27, stiffness: 320 }} onClick={(event) => event.stopPropagation()}><span className="eyebrow">{subtitle}</span><h2>{title}</h2>{note ? <p className="collection-action-summary">{note}</p> : null}<button onClick={onEdit}><Pencil size={18} /> Edit</button><button onClick={onShare}><Share2 size={18} /> Share</button><button className="danger" onClick={onDelete}><Trash2 size={18} /> Delete</button><button className="cancel" onClick={onClose}>Cancel</button></motion.section></motion.div>;
}

function DemoDeleteConfirmSheet({ confirmation, onClose }: { confirmation: DemoDeleteConfirmation; onClose: () => void }) {
  return (
    <motion.div className="catalog-delete-backdrop demo-delete-confirm-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.section className="catalog-delete-sheet demo-delete-confirm-sheet" role="alertdialog" aria-modal="true" aria-labelledby="demo-delete-confirm-title" initial={{ opacity: 0, y: 20, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 16, scale: 0.98 }} transition={{ type: "spring", damping: 27, stiffness: 320 }} onClick={(event) => event.stopPropagation()}>
        <span className="eyebrow">REMOVE FROM DEMO</span>
        <h2 id="demo-delete-confirm-title">{confirmation.title}</h2>
        <p>{confirmation.description}</p>
        <div className="catalog-delete-actions demo-delete-confirm-actions">
          <button type="button" className="secondary-button" onClick={onClose}>Keep it</button>
          <button type="button" className="danger-button" onClick={() => { onClose(); confirmation.onConfirm(); }}><Trash2 size={16} /> {confirmation.confirmLabel ?? "Delete"}</button>
        </div>
      </motion.section>
    </motion.div>
  );
}

function DemoCommentSheet({ target, comments, ownerName, aboveItemDetail = false, onClose, onSubmit }: { target: CommentTarget; comments: DemoComment[]; ownerName: string; aboveItemDetail?: boolean; onClose: () => void; onSubmit: (target: CommentTarget, body: string) => void }) {
  const [draft, setDraft] = useState("");
  const [expanded, setExpanded] = useState(false);
  const targetComments = comments.filter((comment) => comment.targetType === target.type && comment.targetId === target.id);
  const isItem = target.type === "item";
  const targetLabel = isItem ? "item" : target.type === "subcollection" ? "subcollection" : "collection";

  return (
    <motion.div
      className={`catalog-comment-backdrop${expanded ? " catalog-comment-backdrop--expanded" : ""}${aboveItemDetail ? " catalog-comment-backdrop--above-item-detail" : ""}`}
      style={aboveItemDetail ? { zIndex: 132 } : undefined}
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
            <span className="eyebrow">COMMENTS · DEMO</span>
            <h2>{target.title}</h2>
            {expanded ? <p className="catalog-comment-expanded-meta">{targetComments.length} {targetComments.length === 1 ? "comment" : "comments"} on this {targetLabel}</p> : null}
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
          {targetComments.map((comment) => <article key={comment.id}><span>{comment.author}</span><p>{comment.body}</p><small>{shortDate(comment.createdAt)}</small></article>)}
          {targetComments.length === 0 ? <div className="catalog-comment-empty"><MessageCircle size={20} /><strong>Start the conversation.</strong><p>Leave the first note on this {targetLabel}.</p></div> : null}
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
          <span className="catalog-comment-avatar">{ownerName.slice(0, 1)}</span>
          <textarea value={draft} onChange={(event) => setDraft(event.target.value)} placeholder={`Add a comment about this ${isItem ? "item" : "subcollection"}…`} maxLength={2000} />
          <button className="primary-button" disabled={!draft.trim()}><Send size={16} /> Send</button>
        </form>
      </motion.section>
    </motion.div>
  );
}

function demoTagsFromDetails(details: string) {
  return Array.from(new Set(
    details
      .split(/[,\u00b7]/)
      .map((tag) => tag.replace(/\u00c2/g, "").trim())
      .filter(Boolean),
  )).slice(0, 10);
}

function DemoItemEditorSheet({ item, subcollectionName, onClose, onSaved }: { item?: DemoItem; subcollectionName: string; onClose: () => void; onSaved: (item: DemoItem) => void }) {
  const [title, setTitle] = useState(item?.title ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [mood, setMood] = useState<DemoItem["mood"]>(item?.mood ?? "neutral");
  const [tags, setTags] = useState(() => demoTagsFromDetails(item?.details ?? ""));
  const [tagDraft, setTagDraft] = useState("");
  const [visibility, setVisibility] = useState<Visibility>(item?.visibility ?? "private");
  const [isFavorite, setIsFavorite] = useState(item?.isFavorite ?? false);
  const [newPhotos, setNewPhotos] = useState<string[]>([]);
  const [error, setError] = useState("");
  const existingPhotos = item?.images ?? [];

  const addTags = () => {
    const candidates = tagDraft
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean)
      .filter((tag, index, all) => all.findIndex((entry) => entry.toLocaleLowerCase() === tag.toLocaleLowerCase()) === index)
      .filter((tag) => !tags.some((entry) => entry.toLocaleLowerCase() === tag.toLocaleLowerCase()));

    if (!candidates.length) return setTagDraft("");
    const available = Math.max(0, 10 - tags.length);
    if (!available) return setError("Keep this item to 10 tags or fewer.");
    setTags((current) => [...current, ...candidates.slice(0, available)]);
    setTagDraft("");
    setError(candidates.length > available ? "Only the first tags that fit were added." : "");
  };

  const removeNewPhoto = (index: number) => {
    setNewPhotos((current) => {
      const photo = current[index];
      if (photo?.startsWith("blob:")) URL.revokeObjectURL(photo);
      return current.filter((_, photoIndex) => photoIndex !== index);
    });
  };

  const selectPhotos = (files: FileList | null) => {
    if (!files?.length) return;
    const selection = Array.from(files);
    const invalid = selection.find((file) => !file.type.startsWith("image/") || file.size > 15 * 1024 * 1024);
    if (invalid) return setError("Use image files under 15 MB.");
    if (existingPhotos.length + newPhotos.length + selection.length > MAX_DEMO_PHOTOS) return setError(`An item can have up to ${MAX_DEMO_PHOTOS} photos.`);
    setError("");
    setNewPhotos((current) => [...current, ...selection.map((file) => URL.createObjectURL(file))]);
  };

  const save = () => {
    if (!title.trim()) return setError("Give this item a title.");
    const next: DemoItem = {
      id: item?.id ?? `demo-item-${crypto.randomUUID()}`,
      title: title.trim(),
      description: description.trim(),
      brand: null,
      details: tags.join(", "),
      mood,
      isFavorite,
      visibility,
      images: [...existingPhotos, ...newPhotos],
      likeCount: item?.likeCount ?? 0,
      commentCount: item?.commentCount ?? 0,
      viewCount: item?.viewCount ?? 0,
      likedByViewer: item?.likedByViewer ?? false,
      createdAt: item?.createdAt ?? new Date().toISOString(),
    };
    onSaved(next);
  };

  return <motion.div className="catalog-editor-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
<motion.section className="catalog-editor-sheet" initial={{ opacity: 0, y: 24, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 16, scale: 0.98 }} transition={{ type: "spring", damping: 28, stiffness: 300 }} onClick={(event) => event.stopPropagation()}>
<header>
<div>
<span className="eyebrow">{item ? "EDIT ITEM" : "ADD ITEM"} · {subcollectionName}</span>
<h2>{item?.title || "A new object"}</h2>
</div>
<button onClick={onClose} aria-label="Close item editor">
<X size={20} />
</button>
</header>
<div className="catalog-editor-grid">
<label>
<span>Title</span>
<input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={140} />
</label>
<label>
<span>Mood</span>
<select value={mood} onChange={(event) => setMood(event.target.value as DemoItem["mood"])}>
<option value="grail">Grail</option>
<option value="memory">Memory</option>
<option value="favorite">Favourite</option>
<option value="regret">Regret</option>
<option value="neutral">Neutral</option>
</select>
</label>
<section className="catalog-editor-tags wide" aria-labelledby="demo-item-tags-title">
<div className="catalog-editor-tags-head"><span id="demo-item-tags-title">Tags</span><small>Anything that helps you find this object later.</small></div>
{tags.length ? <div className="catalog-editor-tag-list">{tags.map((tag) => <span key={tag}>{tag}<button type="button" onClick={() => setTags((current) => current.filter((entry) => entry !== tag))} aria-label={`Remove ${tag} tag`}><X size={12} /></button></span>)}</div> : <p className="catalog-editor-tags-empty">Add a few words instead of rigid brand, year, or condition fields.</p>}
<div className="catalog-editor-tag-input"><input value={tagDraft} onChange={(event) => setTagDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === ",") { event.preventDefault(); addTags(); } }} placeholder="e.g. 2010, midnight, weekend" maxLength={80} aria-label="Add a tag" /><button type="button" onClick={addTags} disabled={!tagDraft.trim()}><Plus size={14} /> Add</button></div>
</section>
<label>
<span>Visibility</span>
<select value={visibility} onChange={(event) => setVisibility(event.target.value as Visibility)}>
<option value="public">Public</option>
<option value="followers">Followers</option>
<option value="private">Private</option>
</select>
</label>
<label className="wide">
<span>Description</span>
<textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={4000} />
</label>
<label className="catalog-check">
<input type="checkbox" checked={isFavorite} onChange={(event) => setIsFavorite(event.target.checked)} />
<Star size={15} /> Favourite item</label>
</div>
<label className="catalog-photo-upload">
<ImagePlus size={20} />
<span>
<strong>{newPhotos.length ? `${newPhotos.length} new photo${newPhotos.length === 1 ? "" : "s"}` : "Add more photos"}</strong>
<small>Swipeable gallery · up to {MAX_DEMO_PHOTOS} total · local to this demo</small>
</span>
<input type="file" accept="image/*" multiple onChange={(event) => { selectPhotos(event.target.files); event.currentTarget.value = ""; }} />
</label>
{existingPhotos.length || newPhotos.length ? <div className="demo-editor-photo-preview">{existingPhotos.map((photo, index) => <figure key={`${photo}-${index}`}><img src={photo} alt={`Existing photo ${index + 1}`} /></figure>)}{newPhotos.map((photo, index) => <figure className="is-pending" key={`${photo}-${index}`}><img src={photo} alt={`New photo ${index + 1}`} /><button type="button" onClick={() => removeNewPhoto(index)} aria-label={`Remove new photo ${index + 1}`}><X size={13} /></button></figure>)}</div> : null}
{error ? <div className="create-error">{error}</div> : null}
<footer>
<button className="text-button" onClick={onClose}>Cancel</button>
<button className="primary-button" onClick={save}>
<Save size={16} /> Save item</button>
</footer>
</motion.section>
</motion.div>;
}

function DemoSubcollectionEditorSheet({ subcollection, onClose, onSaved }: { subcollection: DemoSubcollection; onClose: () => void; onSaved: (patch: SubcollectionPatch) => void }) {
  const [name, setName] = useState(subcollection.name);
  const [description, setDescription] = useState(subcollection.description);
  const [kind, setKind] = useState(subcollection.kind);
  const [visibility, setVisibility] = useState<Visibility | "inherit">(subcollection.visibility ?? "inherit");
  const [coverUrl, setCoverUrl] = useState(subcollection.coverUrl);
  const [error, setError] = useState("");
  const draftCoverUrl = useRef<string | null>(null);

  useBodyScrollLock(true);

  const closeWithoutSaving = () => {
    if (draftCoverUrl.current) {
      URL.revokeObjectURL(draftCoverUrl.current);
      draftCoverUrl.current = null;
    }
    onClose();
  };

  const selectCover = (file: File) => {
    if (!file.type.startsWith("image/") || file.size > 15 * 1024 * 1024) return setError("Choose an image under 15 MB.");
    if (draftCoverUrl.current) URL.revokeObjectURL(draftCoverUrl.current);
    const nextCoverUrl = URL.createObjectURL(file);
    draftCoverUrl.current = nextCoverUrl;
    setError("");
    setCoverUrl(nextCoverUrl);
  };

  const save = () => {
    if (!name.trim()) return setError("Give this subcollection a name.");
    draftCoverUrl.current = null;
    onSaved({ name: name.trim(), description: description.trim(), kind, visibility: visibility === "inherit" ? null : visibility, coverUrl });
  };

  return (
    <motion.div className="catalog-editor-backdrop demo-editor-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closeWithoutSaving}>
      <motion.section className="catalog-editor-sheet subcollection-editor-sheet demo-subcollection-editor-sheet" role="dialog" aria-modal="true" aria-label="Edit subcollection" initial={{ opacity: 0, y: 34, scale: 0.985 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 28, scale: 0.99 }} transition={{ type: "spring", damping: 29, stiffness: 310 }} onClick={(event) => event.stopPropagation()}>
        <header>
          <div><span className="eyebrow">EDIT SUBCOLLECTION</span><h2>{subcollection.name}</h2></div>
          <button type="button" onClick={closeWithoutSaving} aria-label="Close subcollection editor"><X size={20} /></button>
        </header>
        <div className="demo-editor-sheet-body">
          <label className="subcollection-cover-upload">
            <div>{coverUrl ? <img src={coverUrl} alt="Subcollection cover preview" /> : <Layers3 size={25} />}</div>
            <span><Camera size={16} /> Change cover</span>
            <input type="file" accept="image/*" onChange={(event) => { const file = event.target.files?.[0]; if (file) selectCover(file); event.currentTarget.value = ""; }} />
          </label>
          <div className="catalog-editor-grid">
            <label><span>Name</span><input value={name} onChange={(event) => setName(event.target.value)} maxLength={80} /></label>
            <label><span>Kind</span><select value={kind} onChange={(event) => setKind(event.target.value as DemoSubcollection["kind"])}><option value="brand">Brand</option><option value="series">Series</option><option value="era">Era</option><option value="custom">Custom</option></select></label>
            <label><span>Visibility</span><select value={visibility} onChange={(event) => setVisibility(event.target.value as Visibility | "inherit")}><option value="inherit">Inherit collection privacy</option><option value="public">Public</option><option value="followers">Followers</option><option value="private">Private</option></select></label>
            <label className="wide"><span>Description</span><textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={600} /></label>
          </div>
          {error ? <div className="create-error">{error}</div> : null}
        </div>
        <footer>
          <button type="button" className="text-button" onClick={closeWithoutSaving}>Cancel</button>
          <button type="button" className="primary-button" onClick={save}><Save size={16} /> Save subcollection</button>
        </footer>
      </motion.section>
    </motion.div>
  );
}

function DemoCollectionSettingsSheet({ name, description, visibility, onClose, onSaved, onDelete }: { name: string; description: string; visibility: Visibility; onClose: () => void; onSaved: (patch: CollectionSettingsPatch) => void; onDelete: () => void }) {
  const [draftName, setDraftName] = useState(name);
  const [draftDescription, setDraftDescription] = useState(description);
  const [draftVisibility, setDraftVisibility] = useState<Visibility>(visibility);
  const [error, setError] = useState("");

  useBodyScrollLock(true);

  const save = () => {
    if (!draftName.trim()) return setError("Give this collection a name.");
    onSaved({ name: draftName.trim(), description: draftDescription.trim(), visibility: draftVisibility });
  };

  return (
    <motion.div className="catalog-editor-backdrop demo-editor-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.section className="catalog-editor-sheet demo-collection-settings-sheet" role="dialog" aria-modal="true" aria-label="Collection settings" initial={{ opacity: 0, y: 34, scale: 0.985 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 28, scale: 0.99 }} transition={{ type: "spring", damping: 29, stiffness: 310 }} onClick={(event) => event.stopPropagation()}>
        <header>
          <div><span className="eyebrow">COLLECTION SETTINGS</span><h2>Edit this collection</h2></div>
          <button type="button" onClick={onClose} aria-label="Close collection settings"><X size={20} /></button>
        </header>
        <div className="demo-editor-sheet-body">
          <div className="catalog-editor-grid">
            <label><span>Name</span><input value={draftName} onChange={(event) => setDraftName(event.target.value)} maxLength={80} /></label>
            <label><span>Visibility</span><select value={draftVisibility} onChange={(event) => setDraftVisibility(event.target.value as Visibility)}><option value="public">Public</option><option value="followers">Followers</option><option value="private">Private</option></select></label>
            <label className="wide"><span>Description</span><textarea value={draftDescription} onChange={(event) => setDraftDescription(event.target.value)} maxLength={1000} /></label>
          </div>
          {error ? <div className="create-error">{error}</div> : null}
        </div>
        <footer className="demo-collection-settings-actions">
          <button type="button" className="danger-button" onClick={onDelete}><Trash2 size={16} /> Delete</button>
          <button type="button" className="text-button" onClick={onClose}>Cancel</button>
          <button type="button" className="primary-button" onClick={save}><Save size={16} /> Save changes</button>
        </footer>
      </motion.section>
    </motion.div>
  );
}

function DemoMediaViewer({ item, images, initialIndex, onClose, onOpenDetail }: { item: DemoItem; images: string[]; initialIndex: number; onClose: () => void; onOpenDetail: () => void }) {
  useBodyScrollLock(true);
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [zoomed, setZoomed] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [immersive, setImmersive] = useState(false);
  const galleryRef = useRef<HTMLDivElement>(null);
  const detailsSwipeStart = useRef<number | null>(null);
  const detailsOpenedBySwipe = useRef(false);
  const detailsId = `demo-media-details-${item.id}`;
  const useBottomDetailsSheet = useViewportMatch("(max-width: 640px)");

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (immersive) return setImmersive(false);
      if (detailsOpen) return setDetailsOpen(false);
      onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [detailsOpen, immersive, onClose]);

  const selectPhoto = (index: number) => {
    const gallery = galleryRef.current;
    if (gallery) gallery.scrollTo({ left: gallery.clientWidth * index, behavior: "smooth" });
    setActiveIndex(index);
  };

  const toggleImmersive = () => {
    setZoomed(false);
    setDetailsOpen(false);
    setImmersive((current) => !current);
  };

  const openDetailsFromSwipe = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (detailsSwipeStart.current !== null && detailsSwipeStart.current - event.clientY > 28) {
      detailsOpenedBySwipe.current = true;
      setDetailsOpen(true);
    }
    detailsSwipeStart.current = null;
  };

  const facts = [
    { label: "Brand", value: item.brand || "Unmarked" },
    { label: "Details", value: item.details || "Catalogued object" },
    { label: "Mood", value: item.mood },
    { label: "Visibility", value: visibilityLabel(item.visibility) },
  ];

  const renderDetails = (mobile = false) => <motion.aside id={detailsId} className={`demo-media-viewer-details${mobile ? " demo-media-viewer-details--mobile" : ""}`} aria-label={`${item.title} details`} initial={{ y: "104%", opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: "104%", opacity: 0 }} transition={{ type: "spring", damping: 28, stiffness: 310 }} onClick={(event) => event.stopPropagation()}>
    <button className="demo-media-viewer-details-handle" type="button" onClick={() => setDetailsOpen(false)} aria-label="Close item details"><i /></button>
    <div className="demo-media-viewer-details-heading"><div><span className="eyebrow">OBJECT DETAILS</span><h3>{item.title}</h3></div><button className="demo-media-viewer-details-expand" type="button" onClick={onOpenDetail} aria-label="Open full item details"><Maximize2 size={17} /></button></div>
    <p className="demo-media-viewer-description">{item.description || "No description has been added to this object yet."}</p>
    <dl className="demo-media-viewer-facts">{facts.map((fact) => <div key={fact.label}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>)}<div><dt>Favourite</dt><dd>{item.isFavorite ? "Saved favourite" : "Not marked"}</dd></div></dl>
  </motion.aside>;

  return <motion.div className={`demo-media-viewer-backdrop${immersive ? " demo-media-viewer-backdrop--immersive" : ""}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
    <motion.section layout className={`demo-media-viewer${immersive ? " demo-media-viewer--immersive" : ""}`} role="dialog" aria-modal="true" aria-label={`${item.title} photo viewer`} initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ type: "spring", damping: 28, stiffness: 300 }} onClick={(event) => event.stopPropagation()}>
      <header className="demo-media-viewer-header">
        <div className="demo-media-viewer-title"><span className="eyebrow">PHOTO VIEWER</span><h2>{item.title}</h2></div>
        <div className="demo-media-viewer-header-actions">
          <button className={`demo-media-viewer-zoom-toggle ${zoomed ? "active" : ""}`} type="button" onClick={() => setZoomed((current) => !current)} aria-label="Toggle image zoom"><ZoomIn size={18} /></button>
          <button className="demo-media-viewer-close" type="button" onClick={onClose} aria-label="Close photo viewer"><X size={20} /></button>
        </div>
      </header>
      <div ref={galleryRef} className={`demo-media-viewer-scroll ${zoomed ? "is-zoomed" : ""}`} onScroll={(event) => { const width = event.currentTarget.clientWidth; if (width) setActiveIndex(Math.min(images.length - 1, Math.max(0, Math.round(event.currentTarget.scrollLeft / width)))); }}>
        {images.map((image, index) => <button className="demo-media-viewer-slide" type="button" onClick={toggleImmersive} aria-label={immersive ? "Return to photo viewer" : `Open photo ${index + 1} without the viewer frame`} key={`${image}-${index}`}><img src={image} alt={`${item.title}, photo ${index + 1}`} /></button>)}
      </div>
      <footer className="demo-media-viewer-footer">
        <span className="demo-media-viewer-count" aria-live="polite">{activeIndex + 1}/{images.length}</span>
        {images.length > 1 ? <div className="demo-media-viewer-dots" role="tablist" aria-label="Photo position">{images.map((image, index) => <button type="button" key={`${image}-dot`} className={index === activeIndex ? "active" : ""} onClick={() => selectPhoto(index)} aria-label={`Show photo ${index + 1} of ${images.length}`} aria-selected={index === activeIndex} role="tab"><i /></button>)}</div> : <span className="demo-media-viewer-dots-spacer" />}
        <button className={`demo-media-viewer-details-toggle ${detailsOpen ? "is-open" : ""}`} type="button" aria-expanded={detailsOpen} aria-controls={detailsId} onPointerDown={(event) => { detailsSwipeStart.current = event.clientY; detailsOpenedBySwipe.current = false; }} onPointerUp={openDetailsFromSwipe} onPointerCancel={() => { detailsSwipeStart.current = null; }} onClick={() => { if (detailsOpenedBySwipe.current) { detailsOpenedBySwipe.current = false; return; } setDetailsOpen((current) => !current); }}><span>{item.description || "View item details"}</span><ChevronUp size={15} /></button>
      </footer>
      <AnimatePresence initial={false}>
        {detailsOpen && !useBottomDetailsSheet ? renderDetails() : null}
      </AnimatePresence>
    </motion.section>
    <AnimatePresence initial={false}>
      {detailsOpen && useBottomDetailsSheet ? renderDetails(true) : null}
    </AnimatePresence>
  </motion.div>;
}

function DemoWorkspaceNote() {
  return <div className="demo-workspace-note"><Sparkles size={16} /><span><strong>Arjun Kapoor sample account</strong> — changes here are interactive previews and reset on refresh. Sign in to save them to your own collection.</span></div>;
}
