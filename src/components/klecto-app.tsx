/* eslint-disable @next/next/no-img-element */
"use client";

import { AnimatePresence, MotionConfig, motion } from "motion/react";
import {
  Archive,
  ArrowLeft,
  Ban,
  Bell,
  Bookmark,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Compass,
  Ellipsis,
  Flag,
  Heart,
  Home,
  ImagePlus,
  Layers3,
  LockKeyhole,
  Menu,
  MessageCircle,
  Mic,
  Maximize2,
  MoreHorizontal,
  Paperclip,
  Pencil,
  Phone,
  Plus,
  Repeat2,
  Search,
  Send,
  Settings,
  Share2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Star,
  Trash2,
  UserRound,
  Video,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CatalogDashboardDTO, CollectionDTO, ViewerDTO, Visibility } from "@/lib/catalog-types";
import {
  collectionCards,
  comments,
  conversations,
  feedItems,
  matches,
  type FeedItem,
} from "@/lib/seed";

type View = "home" | "collections" | "matches" | "inbox" | "profile";
type FeedFilter = "Everything" | "Collections" | "Items" | "Wishlists";
type CollectorPreview = {
  name: string;
  handle: string;
  avatar: string;
  verified?: boolean;
  score?: number;
  shared?: string[];
};
type CollectionPreview = {
  title: string;
  subtitle: string;
  count: number;
  privacy: string;
  image: string;
  ownerHandle: string;
  ownerName?: string;
};
type CommentReply = {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  body: string;
  time: string;
  likes: number;
};
type CommentRecord = CommentReply & { replies: CommentReply[] };
type ChatMessage = {
  id: string;
  body: string;
  time: string;
  direction: "received" | "sent";
  replyTo?: string;
};

const navItems: { id: View; label: string; icon: typeof Home }[] = [
  { id: "home", label: "Home", icon: Home },
  { id: "collections", label: "Collections", icon: Layers3 },
  { id: "matches", label: "Matches", icon: Sparkles },
  { id: "inbox", label: "Inbox", icon: MessageCircle },
  { id: "profile", label: "Profile", icon: UserRound },
];

const moodLabels = {
  grail: { label: "Grail", icon: Sparkles },
  memory: { label: "Memory", icon: Clock3 },
  favorite: { label: "Favorite", icon: Star },
  regret: { label: "Regret", icon: Archive },
};

const DEFAULT_AVATAR = "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=120&q=85";

export function KlectoApp({ initialData }: { initialData: CatalogDashboardDTO }) {
  const [view, setView] = useState<View>("home");
  const [feedMode, setFeedMode] = useState<"For you" | "Following">("For you");
  const [filter, setFilter] = useState<FeedFilter>("Everything");
  const [liked, setLiked] = useState<string[]>(["chair-1"]);
  const [saved, setSaved] = useState<string[]>([]);
  const [wished, setWished] = useState<string[]>(["camera-1"]);
  const [commentItem, setCommentItem] = useState<FeedItem | null>(null);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [collectorPreview, setCollectorPreview] = useState<CollectorPreview | null>(null);
  const [collectionPreview, setCollectionPreview] = useState<CollectionPreview | null>(null);

  const openFeedCollection = (item: FeedItem) => {
    const collectionName = item.collection.split("/")[0]?.trim() || item.collection;
    const ownedCollection = initialData.viewer && item.author.handle === initialData.viewer.username
      ? initialData.collections.find((collection) => collection.name.toLocaleLowerCase() === collectionName.toLocaleLowerCase())
      : null;
    if (ownedCollection) {
      window.location.href = `/collections/${ownedCollection.id}`;
      return;
    }
    setCollectionPreview({
      title: collectionName,
      subtitle: item.collection,
      count: item.kind === "collection" ? 12 : 1,
      privacy: "Public",
      image: item.image,
      ownerHandle: item.author.handle,
      ownerName: item.author.name,
    });
  };

  const visibleFeed = useMemo(() => {
    if (filter === "Collections") return feedItems.filter((item) => item.kind === "collection");
    if (filter === "Items") return feedItems.filter((item) => item.kind === "item");
    if (filter === "Wishlists") return feedItems.filter((item) => item.kind === "wishlist");
    return feedItems;
  }, [filter]);

  const toggle = (id: string, values: string[], setValues: (value: string[]) => void) =>
    setValues(values.includes(id) ? values.filter((value) => value !== id) : [...values, id]);

  const navigate = (next: View) => {
    setView(next);
    setMobileMenu(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const openCreate = (mode?: "collection" | "item") => {
    window.location.href = mode ? `/create?mode=${mode}` : "/create";
  };

  return (
    <MotionConfig reducedMotion="user" transition={{ type: "spring", stiffness: 310, damping: 28, mass: 0.72 }}>
    <motion.div className="app-frame" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.52, ease: [0.16, 1, 0.3, 1] }}>
      <DesktopRail view={view} navigate={navigate} onCreate={openCreate} viewer={initialData.viewer} />

      <header className="mobile-topbar">
        <button className="icon-button" onClick={() => setMobileMenu(true)} aria-label="Open menu">
          <Menu size={21} />
        </button>
        <Brand compact />
        <button className="avatar-button" onClick={() => navigate("profile")} aria-label="Open profile">
          <img src={initialData.viewer?.avatarUrl ?? DEFAULT_AVATAR} alt={initialData.viewer?.displayName ?? "Klecto profile"} />
        </button>
      </header>

      <AnimatePresence>
        {mobileMenu && (
          <motion.div className="mobile-menu-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.aside className="mobile-drawer" initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }} transition={{ type: "spring", damping: 28, stiffness: 260 }}>
              <div className="drawer-head"><Brand /><button className="icon-button" onClick={() => setMobileMenu(false)} aria-label="Close menu"><X size={20} /></button></div>
              <UserMini viewer={initialData.viewer} />
              <nav className="drawer-nav">
                {navItems.map((item) => <NavButton key={item.id} {...item} active={view === item.id} onClick={() => navigate(item.id)} />)}
              </nav>
              <button className="primary-button full" onClick={() => { setMobileMenu(false); openCreate(); }}><Plus size={18} /> Add to Klecto</button>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.main className="main-column" initial={{ opacity: 0, y: 20, scale: 0.992 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: 0.06, duration: 0.56, ease: [0.16, 1, 0.3, 1] }}>
          <motion.div key={view} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} transition={{ duration: 0.22 }}>
            {view === "home" && (
              <HomeView
                mode={feedMode}
                setMode={setFeedMode}
                filter={filter}
                setFilter={setFilter}
                items={visibleFeed}
                liked={liked}
                saved={saved}
                wished={wished}
                toggleLike={(id) => toggle(id, liked, setLiked)}
                toggleSave={(id) => toggle(id, saved, setSaved)}
                toggleWish={(id) => toggle(id, wished, setWished)}
                onComment={setCommentItem}
                onCreate={() => openCreate("item")}
                onOpenCollector={setCollectorPreview}
                onOpenCollection={openFeedCollection}
              />
            )}
            {view === "collections" && <CollectionsView onCreate={() => openCreate("collection")} data={initialData} />}
            {view === "matches" && <MatchesView onMessage={() => navigate("inbox")} onOpenCollector={setCollectorPreview} />}
            {view === "inbox" && <AdvancedInboxView onOpenCollector={setCollectorPreview} />}
            {view === "profile" && <PremiumProfileView onOpenCollection={setCollectionPreview} viewer={initialData.viewer} collections={initialData.collections} />}
          </motion.div>
      </motion.main>

      <PremiumContextRail view={view} navigate={navigate} onOpenCollector={setCollectorPreview} />

      <nav className="mobile-bottom-nav" aria-label="Primary navigation">
        {navItems.slice(0, 4).map((item) => {
          const Icon = item.icon;
          return <motion.button key={item.id} className={view === item.id ? "active" : ""} onClick={() => navigate(item.id)} whileTap={{ scale: 0.92 }}><Icon size={21} /><span>{item.label}</span>{item.id === "inbox" && <i>2</i>}</motion.button>;
        })}
        {view !== "inbox" && <motion.button className="mobile-create" onClick={() => openCreate()} aria-label="Create" whileTap={{ scale: 0.9, rotate: -8 }}><Plus size={22} /></motion.button>}
      </nav>

      {commentItem && <PremiumCommentDrawer item={commentItem} onClose={() => setCommentItem(null)} />}
      {collectorPreview && <CollectorProfileSheet collector={collectorPreview} onClose={() => setCollectorPreview(null)} onOpenCollection={setCollectionPreview} />}
      {collectionPreview && <CollectionPreviewSheet collection={collectionPreview} onClose={() => setCollectionPreview(null)} onOpenOwner={setCollectorPreview} />}
    </motion.div>
    </MotionConfig>
  );
}

function Brand({ compact = false }: { compact?: boolean }) {
  return <div className={`brand ${compact ? "compact" : ""}`}><span className="brand-mark"><i /><i /><i /></span>{!compact && <span>klecto</span>}</div>;
}

function DesktopRail({ view, navigate, onCreate, viewer }: { view: View; navigate: (view: View) => void; onCreate: () => void; viewer: ViewerDTO | null }) {
  return (
    <motion.aside className="desktop-rail" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}>
      <Brand />
      <nav className="rail-nav">
        {navItems.map((item) => <NavButton key={item.id} {...item} active={view === item.id} onClick={() => navigate(item.id)} />)}
      </nav>
      <button className="primary-button full" onClick={onCreate}><Plus size={19} /> Add to Klecto</button>
      <div className="rail-spacer" />
      <button className="quiet-nav" onClick={() => { window.location.href = viewer ? "/settings/profile" : "/login"; }}><Settings size={20} /><span>Settings</span></button>
      <UserMini viewer={viewer} />
    </motion.aside>
  );
}

function NavButton({ label, icon: Icon, active, onClick }: { label: string; icon: typeof Home; active: boolean; onClick: () => void }) {
  return <motion.button className={`nav-button ${active ? "active" : ""}`} onClick={onClick} whileHover={{ x: 3 }} whileTap={{ scale: 0.98 }}><Icon size={21} strokeWidth={active ? 2.4 : 1.8} /><span>{label}</span>{label === "Inbox" && <i>2</i>}</motion.button>;
}

function UserMini({ viewer }: { viewer: ViewerDTO | null }) {
  return (
    <button className="user-mini" onClick={() => { if (!viewer) window.location.href = "/login"; }}>
      <span className="avatar-wrap"><img src={viewer?.avatarUrl ?? DEFAULT_AVATAR} alt={viewer?.displayName ?? "Join Klecto"} />{viewer && <i />}</span>
      <span><strong>{viewer?.displayName ?? "Join Klecto"}</strong><small>{viewer ? `@${viewer.username}` : "Create your first shelf"}</small></span><MoreHorizontal size={18} />
    </button>
  );
}

function HomeView(props: {
  mode: "For you" | "Following";
  setMode: (mode: "For you" | "Following") => void;
  filter: FeedFilter;
  setFilter: (filter: FeedFilter) => void;
  items: FeedItem[];
  liked: string[];
  saved: string[];
  wished: string[];
  toggleLike: (id: string) => void;
  toggleSave: (id: string) => void;
  toggleWish: (id: string) => void;
  onComment: (item: FeedItem) => void;
  onCreate: () => void;
  onOpenCollector: (collector: CollectorPreview) => void;
  onOpenCollection: (item: FeedItem) => void;
}) {
  return (
    <>
      <section className="page-header feed-header">
        <div className="segmented-tabs">
          {(["For you", "Following"] as const).map((mode) => <button key={mode} onClick={() => props.setMode(mode)} className={props.mode === mode ? "active" : ""}>{mode}</button>)}
        </div>
        <div className="header-actions"><button className="icon-button"><Search size={20} /></button><button className="icon-button notification"><Bell size={20} /><i /></button></div>
      </section>
      <section className="feed-intro">
        <div><span className="eyebrow">YOUR DAILY SHELF</span><h1>Worth keeping.</h1><p>Objects, stories, and people who understand why they matter.</p></div>
        <button className="square-create" onClick={props.onCreate}><Plus size={26} /><span>Add yours</span></button>
      </section>
      <div className="filter-row">
        {(["Everything", "Collections", "Items", "Wishlists"] as FeedFilter[]).map((filter) => <button key={filter} className={props.filter === filter ? "active" : ""} onClick={() => props.setFilter(filter)}>{filter}</button>)}
        <button className="filter-settings"><SlidersHorizontal size={16} /></button>
      </div>
      <div className="feed-list">
        <AnimatePresence mode="popLayout" initial={false}>
          {props.items.map((item, index) => (
            <FeedCard key={item.id} item={item} index={index} liked={props.liked.includes(item.id)} saved={props.saved.includes(item.id)} wished={props.wished.includes(item.id)} onLike={() => props.toggleLike(item.id)} onSave={() => props.toggleSave(item.id)} onWish={() => props.toggleWish(item.id)} onComment={() => props.onComment(item)} onOpenCollector={props.onOpenCollector} onOpenCollection={props.onOpenCollection} />
          ))}
        </AnimatePresence>
      </div>
    </>
  );
}

function FeedCard({ item, index, liked, saved, wished, onLike, onSave, onWish, onComment, onOpenCollector, onOpenCollection }: { item: FeedItem; index: number; liked: boolean; saved: boolean; wished: boolean; onLike: () => void; onSave: () => void; onWish: () => void; onComment: () => void; onOpenCollector?: (collector: CollectorPreview) => void; onOpenCollection?: (item: FeedItem) => void }) {
  const mood = item.mood ? moodLabels[item.mood] : null;
  const MoodIcon = mood?.icon;
  return (
    <motion.article layout className="feed-card" initial={{ opacity: 0, y: 22, scale: 0.985 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} whileHover={{ y: -4 }} transition={{ delay: index * 0.055, duration: 0.46, ease: [0.16, 1, 0.3, 1] }}>
      <div className="post-head" onClickCapture={(event) => { if ((event.target as HTMLElement).closest(".author")) onOpenCollector?.(item.author); }}>
        <button className="author"><img src={item.author.avatar} alt="" /><span><strong>{item.author.name}{item.author.verified && <ShieldCheck size={14} />}</strong><small>@{item.author.handle} · {item.time}</small></span></button>
        <button className="icon-button"><Ellipsis size={19} /></button>
      </div>
      <button className="collection-label collection-link" onClick={() => onOpenCollection?.(item)}><span>{item.kind === "wishlist" ? <Repeat2 size={14} /> : <Layers3 size={14} />}</span>{item.collection}<ChevronRight size={14} /></button>
      <h2>{item.title}</h2>
      <p className="post-copy">{item.description}</p>
      <FeedMediaGallery item={item} mood={mood?.label ?? null} MoodIcon={MoodIcon} />
      <div className="metadata-row">{item.metadata.map((entry) => <span key={entry}>{entry}</span>)}</div>
      <div className="post-actions">
        <button className={liked ? "liked" : ""} onClick={onLike}><Heart size={19} fill={liked ? "currentColor" : "none"} /><span>{item.likes + (liked ? 1 : 0)}</span></button>
        <button onClick={onComment}><MessageCircle size={19} /><span>{item.comments}</span></button>
        <button className={wished ? "wished" : ""} onClick={onWish}><Repeat2 size={20} /><span>{item.wishlists + (wished && item.kind !== "wishlist" ? 1 : 0)}</span></button>
        <button className={saved ? "saved" : ""} onClick={onSave}><Bookmark size={19} fill={saved ? "currentColor" : "none"} /></button>
        <button><Share2 size={19} /></button>
      </div>
    </motion.article>
  );
}

function FeedMediaGallery({ item, mood, MoodIcon }: { item: FeedItem; mood: string | null; MoodIcon: typeof Sparkles | undefined }) {
  const images = item.images?.length ? item.images : [item.image];
  const [activeIndex, setActiveIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinchDistance = useRef<number | null>(null);
  const pinchStartZoom = useRef(1);

  const goTo = (nextIndex: number) => {
    const wrappedIndex = (nextIndex + images.length) % images.length;
    setDirection(wrappedIndex >= activeIndex ? 1 : -1);
    setActiveIndex(wrappedIndex);
    setZoom(1);
  };

  const updatePointer = (event: React.PointerEvent<HTMLElement>) => {
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.current.size !== 2) return;
    const [first, second] = [...pointers.current.values()];
    const distance = Math.hypot(first.x - second.x, first.y - second.y);
    if (!pinchDistance.current) {
      pinchDistance.current = distance;
      pinchStartZoom.current = zoom;
      return;
    }
    setZoom(Math.min(3, Math.max(1, pinchStartZoom.current * (distance / pinchDistance.current))));
  };

  const clearPointer = (event: React.PointerEvent<HTMLElement>) => {
    pointers.current.delete(event.pointerId);
    if (pointers.current.size < 2) pinchDistance.current = null;
  };

  return (
    <>
      <div className="media-gallery" tabIndex={0} onKeyDown={(event) => {
        if (images.length < 2) return;
        if (event.key === "ArrowRight") { event.preventDefault(); goTo(activeIndex + 1); }
        if (event.key === "ArrowLeft") { event.preventDefault(); goTo(activeIndex - 1); }
      }} aria-label={`${item.title} photo gallery`}>
        <motion.div className={`media-frame ${zoom > 1 ? "zoomed" : ""}`} drag={images.length > 1 && zoom === 1 ? "x" : false} dragConstraints={{ left: 0, right: 0 }} dragElastic={0.14} onPointerDown={updatePointer} onPointerMove={updatePointer} onPointerUp={clearPointer} onPointerCancel={clearPointer} onDragEnd={(_, info) => {
          if (images.length < 2 || Math.abs(info.offset.x) < 46) return;
          goTo(info.offset.x < 0 ? activeIndex + 1 : activeIndex - 1);
        }}>
          <AnimatePresence initial={false} mode="wait" custom={direction}>
            <motion.img key={images[activeIndex]} src={images[activeIndex]} alt={`${item.imageAlt} photo ${activeIndex + 1} of ${images.length}`} custom={direction} initial={{ opacity: 0, x: direction * 28, scale: 1.015 }} animate={{ opacity: 1, x: 0, scale: zoom }} exit={{ opacity: 0, x: direction * -28, scale: 1.01 }} transition={{ duration: zoom === 1 ? 0.32 : 0.14, ease: [0.16, 1, 0.3, 1] }} onDoubleClick={() => setZoom((current) => current > 1 ? 1 : 2)} onClick={() => { if (zoom === 1) setLightboxOpen(true); else setZoom(1); }} />
          </AnimatePresence>
          {mood && MoodIcon && <span className={`mood-tag ${item.mood}`}><MoodIcon size={14} fill={item.mood === "favorite" ? "currentColor" : "none"} />{mood}</span>}
          {images.length > 1 && <>
            <div className="gallery-dots" aria-label={`Photo ${activeIndex + 1} of ${images.length}`}>{images.map((_, imageIndex) => <button key={imageIndex} className={activeIndex === imageIndex ? "active" : ""} onClick={() => goTo(imageIndex)} aria-label={`Show photo ${imageIndex + 1}`} />)}</div>
          </>}
          <button className="gallery-expand" onClick={() => setLightboxOpen(true)} aria-label="View photos fullscreen"><Maximize2 size={16} /></button>
          {images.length > 1 && <span className="image-count">{activeIndex + 1} / {images.length}</span>}
          <span className="gallery-gesture-hint">{zoom > 1 ? "Tap to reset" : "Swipe, pinch or double tap"}</span>
        </motion.div>
      </div>
      <AnimatePresence>{lightboxOpen && <MediaLightbox images={images} imageAlt={item.imageAlt} initialIndex={activeIndex} onClose={() => setLightboxOpen(false)} />}</AnimatePresence>
    </>
  );
}

function MediaLightbox({ images, imageAlt, initialIndex, onClose }: { images: string[]; imageAlt: string; initialIndex: number; onClose: () => void }) {
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [direction, setDirection] = useState(1);
  const goTo = useCallback((nextIndex: number) => {
    const wrappedIndex = (nextIndex + images.length) % images.length;
    setDirection(wrappedIndex >= activeIndex ? 1 : -1);
    setActiveIndex(wrappedIndex);
  }, [activeIndex, images.length]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight") goTo(activeIndex + 1);
      if (event.key === "ArrowLeft") goTo(activeIndex - 1);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeIndex, goTo, onClose]);

  return (
    <motion.div className="lightbox-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} role="dialog" aria-modal="true" aria-label="Photo viewer">
      <motion.section className="media-lightbox" initial={{ opacity: 0, scale: 0.97, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.98, y: 12 }} transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }} onClick={(event) => event.stopPropagation()}>
        <header><span>{activeIndex + 1} of {images.length}</span><button className="icon-button" onClick={onClose} aria-label="Close photo viewer"><X size={21} /></button></header>
        <div className="lightbox-stage">
          {images.length > 1 && <button className="lightbox-nav previous" onClick={() => goTo(activeIndex - 1)} aria-label="Previous photo"><ChevronLeft size={24} /></button>}
          <AnimatePresence initial={false} mode="wait" custom={direction}>
            <motion.img key={images[activeIndex]} src={images[activeIndex]} alt={`${imageAlt} — photo ${activeIndex + 1} of ${images.length}`} custom={direction} initial={{ opacity: 0, x: direction * 48, scale: 0.985 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: direction * -48, scale: 0.99 }} transition={{ duration: 0.34, ease: [0.16, 1, 0.3, 1] }} />
          </AnimatePresence>
          {images.length > 1 && <button className="lightbox-nav next" onClick={() => goTo(activeIndex + 1)} aria-label="Next photo"><ChevronRight size={24} /></button>}
        </div>
        {images.length > 1 && <div className="lightbox-thumbnails">{images.map((image, imageIndex) => <button key={image} className={activeIndex === imageIndex ? "active" : ""} onClick={() => goTo(imageIndex)}><img src={image} alt={`Go to photo ${imageIndex + 1}`} /></button>)}</div>}
      </motion.section>
    </motion.div>
  );
}

function CollectionsView({ onCreate, data }: { onCreate: () => void; data: CatalogDashboardDTO }) {
  const [query, setQuery] = useState("");
  const [visibilityFilter, setVisibilityFilter] = useState<Visibility | "all">("all");
  const [sort, setSort] = useState<"recent" | "name" | "items">("recent");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const demoCards = collectionCards
    .filter((collection) => collection.ownerHandle === "arjcollects")
    .map((collection) => ({
      id: `demo-${collection.slug}`,
      name: collection.title,
      description: collection.subtitle,
      coverUrl: collection.image,
      visibility: collection.privacy.toLowerCase() as Visibility,
      itemCount: collection.count,
      subcollectionNames: collection.subtitle.split(",").map((entry) => entry.trim()).filter(Boolean),
      updatedAt: "2026-07-09T10:20:00.000Z",
      href: `/demo/collections/${collection.slug}`,
    }));
  const cards = data.viewer
    ? data.collections.map((collection) => ({
      id: collection.id,
      name: collection.name,
      description: collection.description,
      coverUrl: collection.coverUrl,
      visibility: collection.visibility,
      itemCount: collection.items.length,
      subcollectionNames: collection.subcollections.map((entry) => entry.name),
      updatedAt: collection.updatedAt,
      href: `/collections/${collection.id}`,
    }))
    : demoCards;
  const visibleCards = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    return [...cards]
      .filter((collection) => visibilityFilter === "all" || collection.visibility === visibilityFilter)
      .filter((collection) => !normalized || [collection.name, collection.description ?? "", ...collection.subcollectionNames].join(" ").toLocaleLowerCase().includes(normalized))
      .sort((left, right) => {
        if (sort === "name") return left.name.localeCompare(right.name);
        if (sort === "items") return right.itemCount - left.itemCount || left.name.localeCompare(right.name);
        return right.updatedAt.localeCompare(left.updatedAt);
      });
  }, [cards, query, sort, visibilityFilter]);
  const itemCount = cards.reduce((total, collection) => total + collection.itemCount, 0);
  const subcollectionCount = data.viewer
    ? data.collections.reduce((total, collection) => total + collection.subcollections.length, 0)
    : 3;
  return (
    <>
      <section className="page-header"><div><span className="eyebrow">THE THINGS YOU KEEP</span><h1>Collections</h1></div><button className="primary-button" onClick={onCreate}><Plus size={18} /> New collection</button></section>
      <section className="collection-summary">
        <div><strong>{itemCount}</strong><span>items catalogued</span></div><div><strong>{cards.length}</strong><span>collections</span></div><div><strong>{subcollectionCount}</strong><span>subcollections</span></div>
      </section>
      <div className="collection-toolbar catalog-toolbar">
        <label className="collection-search"><Search size={17} /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search your collections" aria-label="Search your collections" />{query ? <button type="button" onClick={() => setQuery("")} aria-label="Clear collection search"><X size={15} /></button> : null}</label>
        <label className="collection-sort-select"><span>Sort</span><select value={sort} onChange={(event) => setSort(event.target.value as typeof sort)} aria-label="Sort collections"><option value="recent">Recently updated</option><option value="name">Name A–Z</option><option value="items">Most items</option></select></label>
        <div className="collection-filter-wrap"><button className={`collection-filter-trigger ${visibilityFilter !== "all" ? "active" : ""}`} onClick={() => setFiltersOpen((current) => !current)} aria-expanded={filtersOpen}><SlidersHorizontal size={17} /> Filter{visibilityFilter !== "all" ? `: ${visibilityFilter}` : ""}</button>{filtersOpen ? <div className="collection-filter-popover" role="dialog" aria-label="Filter collections"><span>Visibility</span>{(["all", "public", "followers", "private"] as const).map((entry) => <button key={entry} className={visibilityFilter === entry ? "active" : ""} onClick={() => { setVisibilityFilter(entry); setFiltersOpen(false); }}>{entry === "all" ? "All collections" : `${entry[0].toUpperCase()}${entry.slice(1)}`}</button>)}</div> : null}</div>
      </div>
      <div className="collection-toolbar-results"><span>{visibleCards.length === cards.length ? `${cards.length} collection${cards.length === 1 ? "" : "s"}` : `${visibleCards.length} of ${cards.length} collections`}</span>{visibilityFilter !== "all" || query ? <button onClick={() => { setQuery(""); setVisibilityFilter("all"); }}>Clear filters</button> : null}</div>
      <div className="collection-grid">
        {visibleCards.map((collection, index) => (
          <motion.article className="collection-card" key={collection.id} initial={{ opacity: 0, y: 20, scale: 0.985 }} animate={{ opacity: 0.999, y: 0, scale: 1 }} whileHover={{ y: -5 }} transition={{ delay: index * 0.06, duration: 0.44, ease: [0.16, 1, 0.3, 1] }} onClick={() => { window.location.href = collection.href; }}>
            <div className={`collection-image ${collection.coverUrl ? "" : "placeholder"}`}>{collection.coverUrl ? <img src={collection.coverUrl} alt="" /> : <strong>{collection.name.slice(0, 2).toUpperCase()}</strong>}<span style={{ background: ["#f0ff9b", "#d7e6ff", "#ffd4c8", "#e8dcff"][index % 4] }}>{collection.itemCount}</span>{collection.visibility === "private" && <i><LockKeyhole size={13} /></i>}</div>
            <div className="collection-card-body"><small>{collection.visibility}</small><h2>{collection.name}</h2><p>{collection.subcollectionNames.slice(0, 3).join(", ") || collection.description || "Ready for the first item"}</p><div><span>{collection.itemCount} items</span><ChevronRight size={17} /></div></div>
          </motion.article>
        ))}
        {visibleCards.length === 0 && <div className="catalog-empty"><Layers3 size={24} /><strong>No collections match that view.</strong><p>Try another search or clear your filters to see the rest of your shelves.</p></div>}
        <button className="new-collection-card" onClick={onCreate}><span><Plus size={24} /></span><strong>Start something new</strong><small>Use a category or name your own.</small></button>
      </div>
    </>
  );
}

function MatchesView({ onMessage, onOpenCollector }: { onMessage: () => void; onOpenCollector: (collector: CollectorPreview) => void }) {
  const [active, setActive] = useState(0);
  const match = matches[active];
  return (
    <>
      <section className="page-header"><div><span className="eyebrow">COLLECTORS ON YOUR WAVELENGTH</span><h1>Matches</h1></div><button className="icon-button"><SlidersHorizontal size={19} /></button></section>
      <div className="match-hero">
        <div className="match-score" style={{ "--score": `${match.score * 3.6}deg` } as React.CSSProperties}><div><strong>{match.score}%</strong><span>similar</span></div></div>
        <img className="match-avatar" src={match.avatar} alt="" />
        <span className="match-kicker">TODAY’S CLOSEST MATCH</span><h2>{match.name}</h2><p>@{match.handle}</p>
        <div className="shared-tags">{match.shared.map((tag) => <span key={tag}>{tag}</span>)}</div>
        <div className="match-actions"><button className="secondary-button" onClick={() => onOpenCollector(match)}><UserRound size={17} /> View profile</button><button className="primary-button" onClick={onMessage}><MessageCircle size={17} /> Say hello</button></div>
        <button className="match-arrow left" onClick={() => setActive((active + matches.length - 1) % matches.length)}><ChevronLeft /></button>
        <button className="match-arrow right" onClick={() => setActive((active + 1) % matches.length)}><ChevronRight /></button>
      </div>
      <section className="similarity-breakdown">
        <div className="section-title"><div><span className="eyebrow">WHY YOU MATCH</span><h2>Shared shelf</h2></div><span>{match.shared.length} overlaps</span></div>
        {[{ name: "Archive sneakers", value: 94, note: "18 shared items" }, { name: "Film cameras", value: 78, note: "6 shared items" }, { name: "Design books", value: 61, note: "4 shared items" }].map((row) => <div className="similarity-row" key={row.name}><span><strong>{row.name}</strong><small>{row.note}</small></span><div><i style={{ width: `${row.value}%` }} /></div><strong>{row.value}%</strong></div>)}
      </section>
    </>
  );
}

function previewFromCard(card: (typeof collectionCards)[number]): CollectionPreview {
  return {
    title: card.title,
    subtitle: card.subtitle,
    count: card.count,
    privacy: card.privacy,
    image: card.image,
    ownerHandle: card.ownerHandle,
  };
}

function CollectorProfileSheet({ collector, onClose, onOpenCollection }: { collector: CollectorPreview; onClose: () => void; onOpenCollection: (collection: CollectionPreview) => void }) {
  const [tab, setTab] = useState<"Overview" | "Shelves">("Overview");
  const [fullProfile, setFullProfile] = useState(false);
  const cards = collectionCards.filter((card) => card.ownerHandle === collector.handle);
  const visibleCards = cards.length ? cards : collectionCards.slice(0, 2);
  const relatedItems = feedItems.filter((item) => item.author.handle === collector.handle);
  const shared = collector.shared ?? matches.find((entry) => entry.handle === collector.handle)?.shared ?? ["Stories", "Good objects"];

  return (
    <motion.div className="sheet-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.aside className="collector-sheet" initial={{ opacity: 0, x: 28, scale: 0.985 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: 24, scale: 0.985 }} transition={{ type: "spring", damping: 29, stiffness: 290 }} onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-label={`${collector.name} profile`}>
        <div className="collector-sheet-cover"><div className="collector-sheet-orbit" /><button className="icon-button sheet-close" onClick={onClose} aria-label="Close profile"><X size={20} /></button><span>COLLECTOR PROFILE</span></div>
        <div className="collector-sheet-body">
          <div className="collector-sheet-identity"><img src={collector.avatar} alt={collector.name} /><div><span className="eyebrow">ON KLECTO</span><h2>{collector.name}{collector.verified && <ShieldCheck size={17} />}</h2><p>@{collector.handle}</p></div>{collector.score ? <div className="collector-score">{collector.score}%<small>match</small></div> : null}</div>
          <p className="collector-sheet-bio">A shelf built around the details worth returning to: provenance, patina, and the stories no product page can hold.</p>
          <div className="collector-shared"><span>YOU BOTH KEEP</span><div>{shared.slice(0, 4).map((tag) => <i key={tag}>{tag}</i>)}</div></div>
          <div className="collector-sheet-actions"><button className="primary-button" onClick={() => setFullProfile(true)}><UserRound size={17} /> View full profile</button><button className="secondary-button" onClick={() => setTab("Shelves")}><Layers3 size={17} /> Shelves</button></div>
          <AnimatePresence>{fullProfile && <motion.section className="collector-full-profile" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}><div className="collector-full-stats"><span><strong>{collector.score ?? 82}%</strong> similarity</span><span><strong>{visibleCards.length}</strong> public shelves</span><span><strong>{visibleCards.reduce((total, card) => total + card.count, 0)}</strong> objects</span></div><p>Everything visible here is a public part of the @{collector.handle} collection story.</p><div className="collector-full-shelves">{visibleCards.map((card) => <button key={card.slug} onClick={() => onOpenCollection(previewFromCard(card))}><img src={card.image} alt="" /><span><strong>{card.title}</strong><small>{card.count} objects</small></span><ChevronRight size={16} /></button>)}</div></motion.section>}</AnimatePresence>
          <div className="sheet-tabs"><button className={tab === "Overview" ? "active" : ""} onClick={() => setTab("Overview")}>Overview</button><button className={tab === "Shelves" ? "active" : ""} onClick={() => setTab("Shelves")}>Shelves <span>{visibleCards.length}</span></button></div>
          {tab === "Overview" ? <div className="collector-glance"><div><strong>{collector.score ?? 82}%</strong><span>collection overlap</span></div><div><strong>{Math.max(12, relatedItems.length * 14 + 12)}</strong><span>objects shared</span></div><div><strong>{visibleCards.reduce((total, card) => total + card.count, 0)}</strong><span>catalogued</span></div></div> : <div className="sheet-collection-list">{visibleCards.map((card) => <button className="sheet-collection" key={card.slug} onClick={() => onOpenCollection(previewFromCard(card))}><img src={card.image} alt="" /><span><small>{card.privacy} shelf</small><strong>{card.title}</strong><em>{card.count} objects <ChevronRight size={15} /></em></span></button>)}</div>}
        </div>
      </motion.aside>
    </motion.div>
  );
}

function CollectionPreviewSheet({ collection, onClose, onOpenOwner }: { collection: CollectionPreview; onClose: () => void; onOpenOwner: (collector: CollectorPreview) => void }) {
  const [activeSubcollection, setActiveSubcollection] = useState<string | null>(null);
  const match = matches.find((entry) => entry.handle === collection.ownerHandle);
  const owner: CollectorPreview = match ?? { name: collection.ownerName ?? collection.ownerHandle, handle: collection.ownerHandle, avatar: feedItems.find((item) => item.author.handle === collection.ownerHandle)?.author.avatar ?? DEFAULT_AVATAR };
  const relatedItems = feedItems.filter((item) => item.author.handle === collection.ownerHandle);
  const showcase = relatedItems.length ? relatedItems : feedItems.slice(0, 2);
  const subcollections = collection.title.toLowerCase().includes("sneaker")
    ? ["Nike", "New Balance", "Air Jordan"]
    : collection.title.toLowerCase().includes("watch")
      ? ["Seiko", "Hamilton", "Everyday wear"]
      : collection.title.toLowerCase().includes("record")
        ? ["Jazz", "Soul", "Ambient"]
        : ["Featured finds", "Recent additions", "Stories"];

  return (
    <motion.div className="sheet-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.aside className="collection-preview-sheet" initial={{ opacity: 0, y: 28, scale: 0.985 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.985 }} transition={{ type: "spring", damping: 28, stiffness: 280 }} onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-label={`${collection.title} collection`}>
        <div className="collection-preview-cover"><img src={collection.image} alt="" /><div className="collection-preview-gradient" /><button className="icon-button sheet-close" onClick={onClose} aria-label="Close collection"><X size={20} /></button><span>{collection.privacy} SHELF</span><div><h2>{collection.title}</h2><p>{collection.subtitle}</p></div></div>
        <div className="collection-preview-body">
          <button className="sheet-owner" onClick={() => { onClose(); onOpenOwner(owner); }}><img src={owner.avatar} alt="" /><span><small>CURATED BY</small><strong>{owner.name}</strong><em>@{owner.handle}</em></span><ChevronRight size={18} /></button>
          <div className="collection-preview-stats"><span><strong>{collection.count}</strong> objects</span><span><strong>{showcase.length}</strong> highlighted</span><span><strong>Updated</strong> recently</span></div>
          {activeSubcollection && <button className="collection-preview-back" onClick={() => setActiveSubcollection(null)}><ArrowLeft size={15} /> All subcollections</button>}
          <div className="collection-preview-heading"><div><span className="eyebrow">{activeSubcollection ? "ITEMS IN THIS SUBCOLLECTION" : "SUBCOLLECTIONS"}</span><h3>{activeSubcollection ?? "Choose a shelf within this collection."}</h3></div><button className="secondary-button" onClick={() => { onClose(); onOpenOwner(owner); }}>View profile</button></div>
          {activeSubcollection ? <div className="collection-preview-items">{showcase.map((item) => <article key={item.id}><img src={item.image} alt="" /><span><small>{activeSubcollection} - {item.metadata[0] ?? "Collection item"}</small><strong>{item.title}</strong></span></article>)}</div> : <div className="collection-preview-subcollections">{subcollections.map((name, index) => <button key={name} onClick={() => setActiveSubcollection(name)}><span><small>SUBCOLLECTION {index + 1}</small><strong>{name}</strong><em>{Math.max(2, Math.round(collection.count / subcollections.length))} items</em></span><ChevronRight size={18} /></button>)}</div>}
        </div>
      </motion.aside>
    </motion.div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function InboxView() {
  const [selected, setSelected] = useState(0);
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState<string[]>([]);
  const active = conversations[selected];
  return (
    <div className="inbox-shell">
      <section className="conversation-list">
        <div className="inbox-title"><div><span className="eyebrow">YOUR CIRCLE</span><h1>Inbox</h1></div><button className="icon-button"><Plus size={19} /></button></div>
        <div className="search-box"><Search size={17} /><input aria-label="Search conversations" placeholder="Search conversations" /></div>
        <div className="inbox-tabs"><button className="active">All</button><button>Unread</button><button>Groups</button></div>
        {conversations.map((conversation, index) => <button key={conversation.name} className={`conversation ${selected === index ? "active" : ""}`} onClick={() => setSelected(index)}><span className="avatar-wrap"><img src={conversation.avatar} alt="" />{conversation.online && <i />}</span><span><strong>{conversation.name}</strong><small>{conversation.message}</small></span><span><time>{conversation.time}</time>{conversation.unread > 0 && <i>{conversation.unread}</i>}</span></button>)}
      </section>
      <section className="chat-panel">
        <header className="chat-head"><span className="avatar-wrap"><img src={active.avatar} alt="" /><i /></span><span><strong>{active.name}</strong><small>Active now · {matches[0].score}% match</small></span><div><button className="icon-button"><Phone size={18} /></button><button className="icon-button"><Video size={19} /></button><button className="icon-button"><MoreHorizontal size={19} /></button></div></header>
        <div className="chat-body">
          <span className="day-divider">TODAY</span>
          <div className="message received">Hey! Your New Balance shelf is excellent. Is the grey 990v3 as comfortable as everyone says?<time>10:31</time></div>
          <div className="message sent">Completely. It’s the pair I grab without thinking.<time>10:33</time></div>
          <div className="shared-item"><img src={collectionCards[0].image} alt="" /><span><small>SHARED ITEM</small><strong>New Balance 990v3</strong><p>Archive sneakers · 2021</p></span></div>
          <div className="message received">That colorway is unreal — trade someday?<time>10:36</time><button><Repeat2 size={13} /> Reply</button></div>
          {sent.map((text, index) => <div className="message sent" key={`${text}-${index}`}>{text}<time>Now</time></div>)}
        </div>
        <form className="composer" onSubmit={(event) => { event.preventDefault(); if (!message.trim()) return; setSent([...sent, message.trim()]); setMessage(""); }}><button type="button"><Plus size={20} /></button><input value={message} onChange={(event) => setMessage(event.target.value)} placeholder={`Message ${active.name.split(" ")[0]}`} /><button type="button"><Mic size={19} /></button><button className="send-button" aria-label="Send message"><Send size={17} /></button></form>
      </section>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function ProfileView({ onOpenCollection, viewer }: { onOpenCollection: () => void; viewer: ViewerDTO | null }) {
  const [tab, setTab] = useState("Posts");
  const displayName = viewer?.displayName ?? "Arjun Kapoor";
  const username = viewer?.username ?? "arjcollects";
  const bio = viewer?.bio ?? "Saving the things that make time visible. Sneakers, watches, records, and every tiny story attached.";
  return (
    <>
      <section className="profile-hero">
        <div className="profile-banner" style={viewer?.bannerUrl ? { backgroundImage: `linear-gradient(90deg, rgb(29 32 22 / 35%), transparent), url(${viewer.bannerUrl})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}><span>Objects become stories<br />when someone remembers.</span></div>
        <div className="profile-identity"><img src={viewer?.avatarUrl ?? DEFAULT_AVATAR} alt={displayName} /><button className="secondary-button" onClick={() => { window.location.href = viewer ? "/settings/profile" : "/login"; }}>{viewer ? "Edit profile" : "Join Klecto"}</button><button className="icon-button"><MoreHorizontal size={19} /></button></div>
        <div className="profile-copy"><h1>{displayName}</h1><p className="handle">@{username}</p><p>{bio}</p><span>{viewer?.location ?? "Mumbai, India"}{viewer && ` · ${viewer.accountVisibility} profile`}</span></div>
        <div className="profile-stats"><span><strong>{viewer?.followingCount ?? 486}</strong> following</span><span><strong>{viewer?.followersCount ?? "2,184"}</strong> followers</span><span><strong>{viewer?.itemCount ?? 155}</strong> items</span></div>
        <div className="profile-similarity"><div className="mini-ring">82%</div><span><strong>Your collection match</strong><small>Top overlaps: Nike, Seiko, Jazz</small></span><button>See details <ChevronRight size={15} /></button></div>
      </section>
      <div className="profile-tabs">{["Posts", "Collections", "Replies", "Likes", "Saved"].map((name) => <button key={name} className={tab === name ? "active" : ""} onClick={() => { setTab(name); if (name === "Collections") onOpenCollection(); }}>{name}{(name === "Likes" || name === "Saved") && <LockKeyhole size={12} />}</button>)}</div>
      <div className="profile-feed">
        <div className="profile-note"><Sparkles size={17} /><span><strong>Private to you:</strong> Likes and saved items only appear for the account owner.</span></div>
        {feedItems.slice(0, 2).map((item, index) => <FeedCard key={item.id} item={item} index={index} liked={index === 0} saved={false} wished={false} onLike={() => {}} onSave={() => {}} onWish={() => {}} onComment={() => {}} />)}
      </div>
    </>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function ContextRail({ navigate }: { view: View; navigate: (view: View) => void }) {
  return (
    <motion.aside className="context-rail" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.14, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}>
      <div className="search-box global-search"><Search size={17} /><input placeholder="Search Klecto" aria-label="Search Klecto" /><kbd>⌘ K</kbd></div>
      <section className="side-card similarity-card"><div className="side-card-head"><span><Sparkles size={16} /> YOUR SIMILARITY</span><button onClick={() => navigate("matches")}>View all</button></div><div className="similarity-feature"><div className="side-ring">82%</div><span><strong>Great taste travels.</strong><p>You share 23 interests with collectors in your circle.</p></span></div><div className="overlap-avatars">{matches.map((match) => <img key={match.name} src={match.avatar} alt="" />)}<span>+18</span><small>collectors match above 70%</small></div></section>
      <section className="side-card"><div className="side-card-head"><span><Compass size={16} /> PEOPLE TO KNOW</span><button onClick={() => navigate("matches")}>See all</button></div>{matches.slice(0, 3).map((match) => <div className="person-row" key={match.name}><img src={match.avatar} alt="" /><span><strong>{match.name}</strong><small>{match.score}% match · {match.shared[0]}</small></span><button>Follow</button></div>)}</section>
      <section className="side-card prompt-card"><span>WEEKLY PROMPT · 04</span><h3>The piece you almost let go.</h3><p>Share its story with the community.</p><button className="secondary-button">Add your answer <ArrowLeft size={15} /></button></section>
      <footer><span>About</span><span>Privacy</span><span>Guidelines</span><span>© 2026 Klecto</span></footer>
    </motion.aside>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function CommentDrawer({ item, onClose }: { item: FeedItem; onClose: () => void }) {
  const [reply, setReply] = useState("");
  return (
    <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.aside className="comment-drawer" initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 30, stiffness: 280 }} onClick={(event) => event.stopPropagation()}>
        <header><div><span className="eyebrow">CONVERSATION</span><h2>{item.comments} comments</h2></div><button className="icon-button" onClick={onClose}><X size={20} /></button></header>
        <div className="comment-context"><img src={item.image} alt="" /><span><strong>{item.title}</strong><small>by {item.author.name}</small></span></div>
        <div className="comment-sort"><span>Top comments</span><ChevronDown size={15} /></div>
        <div className="comment-tree">
          {comments.map((comment) => <div className="comment-thread" key={comment.body}><Comment comment={comment} />{comment.replies.map((child) => <div className="nested-comment" key={child.body}><Comment comment={child} /></div>)}</div>)}
        </div>
        <div className="comment-composer"><img src="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=80&q=85" alt="" /><div><textarea placeholder="Add to the conversation…" value={reply} onChange={(event) => setReply(event.target.value)} /><span><button><ImagePlus size={17} /></button><button><Paperclip size={17} /></button><button className="primary-button" disabled={!reply.trim()} onClick={() => setReply("")}>Reply</button></span></div></div>
      </motion.aside>
    </motion.div>
  );
}

function Comment({ comment }: { comment: { name: string; handle: string; avatar: string; body: string; time: string; likes: number } }) {
  return <div className="comment"><img src={comment.avatar} alt="" /><div><div className="comment-name"><strong>{comment.name}</strong><span>@{comment.handle} · {comment.time}</span><button><MoreHorizontal size={16} /></button></div><p>{comment.body}</p><div className="comment-actions"><button><Heart size={15} /> {comment.likes}</button><button><MessageCircle size={15} /> Reply</button><button><Share2 size={15} /></button><button><Flag size={14} /></button></div></div></div>;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function PremiumInboxView({ onOpenCollector }: { onOpenCollector: (collector: CollectorPreview) => void }) {
  const [selected, setSelected] = useState(0);
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState<string[]>([]);
  const [tab, setTab] = useState<"All" | "Unread" | "Groups">("All");
  const [mobileThreadOpen, setMobileThreadOpen] = useState(false);
  const [calling, setCalling] = useState<"audio" | "video" | null>(null);
  const active = conversations[selected] ?? conversations[0];
  const activeMatch = active.handle ? matches.find((match) => match.handle === active.handle) : undefined;
  const activeCollector: CollectorPreview | null = active.handle
    ? activeMatch ?? { name: active.name, handle: active.handle, avatar: active.avatar }
    : null;
  const visibleConversations = conversations
    .map((conversation, index) => ({ conversation, index }))
    .filter(({ conversation }) => tab === "All" || (tab === "Unread" ? conversation.unread > 0 : !conversation.handle));

  const selectConversation = (index: number) => {
    setSelected(index);
    setMobileThreadOpen(true);
  };

  return (
    <div className={`inbox-shell premium-inbox ${mobileThreadOpen ? "thread-open" : ""}`}>
      <section className="conversation-list premium-conversation-list">
        <div className="inbox-title premium-inbox-title"><div><span className="eyebrow">YOUR CIRCLE</span><h1>Inbox</h1><p>Small conversations, well kept.</p></div><button className="new-thread-button" aria-label="Start a new conversation"><Plus size={19} /></button></div>
        <div className="inbox-search-wrap"><div className="search-box"><Search size={18} /><input aria-label="Search conversations" placeholder="Search your circle" /></div></div>
        <div className="inbox-tabs premium-inbox-tabs" aria-label="Conversation filter">{(["All", "Unread", "Groups"] as const).map((entry) => <button key={entry} className={tab === entry ? "active" : ""} onClick={() => setTab(entry)}>{entry}{entry === "Unread" && <span>{conversations.filter((conversation) => conversation.unread > 0).length}</span>}</button>)}</div>
        <div className="conversation-stack">
          {visibleConversations.map(({ conversation, index }) => <motion.button layout key={conversation.name} className={`conversation premium-conversation ${selected === index ? "active" : ""}`} onClick={() => selectConversation(index)} whileTap={{ scale: 0.985 }}><span className="avatar-wrap"><img src={conversation.avatar} alt="" />{conversation.online && <i />}</span><span className="conversation-copy"><strong>{conversation.name}</strong><small>{conversation.message}</small></span><span className="conversation-meta"><time>{conversation.time}</time>{conversation.unread > 0 && <i>{conversation.unread}</i>}</span></motion.button>)}
        </div>
        <div className="inbox-footnote"><span><Sparkles size={15} /> Your best collection match is one message away.</span></div>
      </section>
      <section className="chat-panel premium-chat-panel">
        <header className="chat-head premium-chat-head">
          <button className="mobile-thread-back" onClick={() => setMobileThreadOpen(false)} aria-label="Back to conversations"><ChevronLeft size={21} /></button>
          <button className="chat-person" onClick={() => activeCollector && onOpenCollector(activeCollector)} disabled={!activeCollector}><span className="avatar-wrap"><img src={active.avatar} alt="" />{active.online && <i />}</span><span><strong>{active.name}</strong><small>{active.handle ? `${active.online ? "Active now" : "Away"}${activeMatch ? ` - ${activeMatch.score}% match` : ""}` : "Group conversation"}</small></span></button>
          <div className="chat-tools"><button className="icon-button" onClick={() => setCalling("audio")} aria-label="Start audio call"><Phone size={18} /></button><button className="icon-button video-call" onClick={() => setCalling("video")} aria-label="Start video call"><Video size={19} /></button><button className="icon-button" aria-label="Conversation options"><MoreHorizontal size={19} /></button></div>
        </header>
        <div className="chat-body premium-chat-body">
          <span className="day-divider">TODAY</span>
          <motion.div className="message received" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>Hey! Your New Balance shelf is excellent. Is the grey 990v3 as comfortable as everyone says?<time>10:31</time></motion.div>
          <motion.div className="message sent" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>Completely. It is the pair I grab without thinking.<time>10:33</time></motion.div>
          <motion.button className="shared-item premium-shared-item" whileTap={{ scale: 0.99 }}><img src={collectionCards[0].image} alt="" /><span><small>SHARED FROM A SHELF</small><strong>New Balance 990v3</strong><p>Archive sneakers - 2021</p></span><ChevronRight size={18} /></motion.button>
          <motion.div className="message received" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>That colorway is unreal - trade someday?<time>10:36</time></motion.div>
          {sent.map((text, index) => <motion.div className="message sent" key={`${text}-${index}`} initial={{ opacity: 0, y: 10, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}>{text}<time>Now</time></motion.div>)}
        </div>
        <form className="composer premium-composer" onSubmit={(event) => { event.preventDefault(); const value = message.trim(); if (!value) return; setSent((current) => [...current, value]); setMessage(""); }}><button type="button" className="composer-add" aria-label="Add something"><Plus size={20} /></button><input value={message} onChange={(event) => setMessage(event.target.value)} placeholder={`Message ${active.name.split(" ")[0]}`} /><button type="button" className="composer-mic" aria-label="Record a voice message"><Mic size={19} /></button><button className="send-button" aria-label="Send message"><Send size={17} /></button></form>
      </section>
      <AnimatePresence>{calling && <motion.div className="call-toast" initial={{ opacity: 0, y: 18, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.96 }}><span>{calling === "video" ? <Video size={18} /> : <Phone size={17} />}</span><div><strong>{calling === "video" ? "Video call ready" : "Audio call ready"}</strong><small>Connect when the other collector accepts.</small></div><button onClick={() => setCalling(null)} aria-label="Dismiss call notice"><X size={17} /></button></motion.div>}</AnimatePresence>
    </div>
  );
}

function AdvancedInboxView({ onOpenCollector }: { onOpenCollector: (collector: CollectorPreview) => void }) {
  const [selected, setSelected] = useState(0);
  const [draft, setDraft] = useState("");
  const [tab, setTab] = useState<"All" | "Unread" | "Groups">("All");
  const [mobileThreadOpen, setMobileThreadOpen] = useState(false);
  const [calling, setCalling] = useState<"audio" | "video" | null>(null);
  const [blockedHandles, setBlockedHandles] = useState<string[]>([]);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);
  const [menuMessage, setMenuMessage] = useState<ChatMessage | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: "message-1", body: "Hey! Your New Balance shelf is excellent. Is the grey 990v3 as comfortable as everyone says?", time: "10:31", direction: "received" },
    { id: "message-2", body: "Completely. It is the pair I grab without thinking.", time: "10:33", direction: "sent" },
    { id: "message-3", body: "That colorway is unreal - trade someday?", time: "10:36", direction: "received" },
  ]);
  const active = conversations[selected] ?? conversations[0];
  const activeMatch = active.handle ? matches.find((match) => match.handle === active.handle) : undefined;
  const activeCollector: CollectorPreview | null = active.handle ? activeMatch ?? { name: active.name, handle: active.handle, avatar: active.avatar } : null;
  const isBlocked = Boolean(active.handle && blockedHandles.includes(active.handle));
  const visibleConversations = conversations.map((conversation, index) => ({ conversation, index })).filter(({ conversation }) => tab === "All" || (tab === "Unread" ? conversation.unread > 0 : !conversation.handle));

  const selectConversation = (index: number) => { setSelected(index); setMobileThreadOpen(true); setReplyingTo(null); setEditingMessage(null); setDraft(""); };
  const submit = () => {
    const body = draft.trim();
    if (!body || isBlocked) return;
    if (editingMessage) {
      setMessages((current) => current.map((message) => message.id === editingMessage.id ? { ...message, body, time: "Edited" } : message));
      setEditingMessage(null);
    } else {
      setMessages((current) => [...current, { id: `message-${Date.now()}`, body, time: "Now", direction: "sent", replyTo: replyingTo?.body }]);
    }
    setDraft("");
    setReplyingTo(null);
  };
  const beginEdit = (message: ChatMessage) => { setEditingMessage(message); setReplyingTo(null); setDraft(message.body); setMenuMessage(null); };
  const beginReply = (message: ChatMessage) => { setReplyingTo(message); setEditingMessage(null); setDraft(""); setMenuMessage(null); };
  const blockActive = () => {
    if (active.handle) setBlockedHandles((current) => current.includes(active.handle as string) ? current.filter((handle) => handle !== active.handle) : [...current, active.handle as string]);
    setMenuMessage(null);
  };

  return (
    <div className={`inbox-shell premium-inbox advanced-inbox ${mobileThreadOpen ? "thread-open" : ""} ${isBlocked ? "conversation-blocked" : ""}`}>
      <section className="conversation-list premium-conversation-list">
        <div className="inbox-title premium-inbox-title"><div><span className="eyebrow">YOUR CIRCLE</span><h1>Inbox</h1><p>Small conversations, well kept.</p></div><button className="new-thread-button" aria-label="Start a new conversation"><Plus size={19} /></button></div>
        <div className="inbox-search-wrap"><div className="search-box"><Search size={18} /><input aria-label="Search conversations" placeholder="Search your circle" /></div></div>
        <div className="inbox-tabs premium-inbox-tabs" aria-label="Conversation filter">{(["All", "Unread", "Groups"] as const).map((entry) => <button key={entry} className={tab === entry ? "active" : ""} onClick={() => setTab(entry)}>{entry}{entry === "Unread" && <span>{conversations.filter((conversation) => conversation.unread > 0).length}</span>}</button>)}</div>
        <div className="conversation-stack">{visibleConversations.map(({ conversation, index }) => <motion.button layout key={conversation.name} className={`conversation premium-conversation ${selected === index ? "active" : ""}`} onClick={() => selectConversation(index)} whileTap={{ scale: 0.985 }}><span className="avatar-wrap"><img src={conversation.avatar} alt="" />{conversation.online && <i />}</span><span className="conversation-copy"><strong>{conversation.name}</strong><small>{conversation.message}</small></span><span className="conversation-meta"><time>{conversation.time}</time>{conversation.unread > 0 && <i>{conversation.unread}</i>}</span></motion.button>)}</div>
        <div className="inbox-footnote"><span><Sparkles size={15} /> Your best collection match is one message away.</span></div>
      </section>
      <section className="chat-panel premium-chat-panel">
        <header className="chat-head premium-chat-head"><button className="mobile-thread-back" onClick={() => setMobileThreadOpen(false)} aria-label="Back to conversations"><ChevronLeft size={21} /></button><button className="chat-person" onClick={() => activeCollector && onOpenCollector(activeCollector)} disabled={!activeCollector || isBlocked}><span className="avatar-wrap"><img src={active.avatar} alt="" />{active.online && <i />}</span><span><strong>{active.name}</strong><small>{active.handle ? `${active.online ? "Active now" : "Away"}${activeMatch ? ` - ${activeMatch.score}% match` : ""}` : "Group conversation"}</small></span></button>{activeCollector && !isBlocked && <button className="chat-profile-link" onClick={() => onOpenCollector(activeCollector)}>Profile</button>}<div className="chat-tools"><button className="icon-button" onClick={() => setCalling("audio")} aria-label="Start audio call" disabled={isBlocked}><Phone size={18} /></button><button className="icon-button video-call" onClick={() => setCalling("video")} aria-label="Start video call" disabled={isBlocked}><Video size={19} /></button><button className="icon-button" onClick={blockActive} aria-label={isBlocked ? "Unblock collector" : "Block collector"}>{isBlocked ? <Check size={18} /> : <Ban size={18} />}</button></div></header>
        <div className="chat-body premium-chat-body"><span className="day-divider">TODAY</span>{messages.map((message, index) => <motion.div key={message.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index * 0.04, 0.16) }}><ChatMessageBubble message={message} onOpenMenu={setMenuMessage} />{index === 1 && <motion.button className="shared-item premium-shared-item" whileTap={{ scale: 0.99 }}><img src={collectionCards[0].image} alt="" /><span><small>SHARED FROM A SHELF</small><strong>New Balance 990v3</strong><p>Archive sneakers - 2021</p></span><ChevronRight size={18} /></motion.button>}</motion.div>)}{isBlocked && <div className="chat-blocked-note"><Ban size={16} /><span><strong>{active.name} is blocked.</strong><small>They cannot message or call you from this conversation.</small></span><button onClick={() => active.handle && setBlockedHandles((current) => current.filter((handle) => handle !== active.handle))}>Unblock</button></div>}</div>
        <form className="composer premium-composer advanced-composer" onSubmit={(event) => { event.preventDefault(); submit(); }}><button type="button" className="composer-add" aria-label="Add something" disabled={isBlocked}><Plus size={20} /></button><div className="composer-field">{replyingTo && <span>Replying to: {replyingTo.body.slice(0, 34)}<button type="button" onClick={() => setReplyingTo(null)}><X size={12} /></button></span>}{editingMessage && <span>Editing message<button type="button" onClick={() => { setEditingMessage(null); setDraft(""); }}><X size={12} /></button></span>}<input value={draft} onChange={(event) => setDraft(event.target.value)} disabled={isBlocked} placeholder={isBlocked ? `${active.name} is blocked` : `Message ${active.name.split(" ")[0]}`} /></div><button type="button" className="composer-mic" aria-label="Record a voice message" disabled={isBlocked}><Mic size={19} /></button><button className="send-button" disabled={isBlocked || !draft.trim()} aria-label="Send message"><Send size={17} /></button></form>
      </section>
      <AnimatePresence>{calling && <motion.div className="call-toast" initial={{ opacity: 0, y: 18, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.96 }}><span>{calling === "video" ? <Video size={18} /> : <Phone size={17} />}</span><div><strong>{calling === "video" ? "Video call ready" : "Audio call ready"}</strong><small>Connect when the other collector accepts.</small></div><button onClick={() => setCalling(null)} aria-label="Dismiss call notice"><X size={17} /></button></motion.div>}{menuMessage && <ChatActionSheet message={menuMessage} canBlock={Boolean(active.handle)} onClose={() => setMenuMessage(null)} onReply={() => beginReply(menuMessage)} onEdit={() => beginEdit(menuMessage)} onDelete={() => { setMessages((current) => current.filter((message) => message.id !== menuMessage.id)); setMenuMessage(null); }} onBlock={blockActive} />}</AnimatePresence>
    </div>
  );
}

function ChatMessageBubble({ message, onOpenMenu }: { message: ChatMessage; onOpenMenu: (message: ChatMessage) => void }) {
  return <div className={`message ${message.direction} chat-message-bubble`}>{message.replyTo && <span className="chat-reply-context">{message.replyTo}</span>}<p>{message.body}</p><footer><time>{message.time}</time><button onClick={() => onOpenMenu(message)} aria-label="Message options"><MoreHorizontal size={15} /></button></footer></div>;
}

function ChatActionSheet({ message, canBlock, onClose, onReply, onEdit, onDelete, onBlock }: { message: ChatMessage; canBlock: boolean; onClose: () => void; onReply: () => void; onEdit: () => void; onDelete: () => void; onBlock: () => void }) {
  return <motion.div className="chat-action-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}><motion.div className="chat-action-sheet" initial={{ opacity: 0, y: 18, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.97 }} transition={{ type: "spring", damping: 25, stiffness: 340 }} onClick={(event) => event.stopPropagation()}><span className="eyebrow">MESSAGE OPTIONS</span><p>{message.body}</p><button onClick={onReply}><MessageCircle size={18} /> Reply</button>{message.direction === "sent" && <><button onClick={onEdit}><Pencil size={18} /> Edit message</button><button className="danger" onClick={onDelete}><Trash2 size={18} /> Delete message</button></>}{message.direction === "received" && canBlock && <button className="danger" onClick={onBlock}><Ban size={18} /> Block collector</button>}<button className="cancel" onClick={onClose}>Cancel</button></motion.div></motion.div>;
}

function PremiumProfileView({ onOpenCollection, viewer, collections }: { onOpenCollection: (collection: CollectionPreview) => void; viewer: ViewerDTO | null; collections: CollectionDTO[] }) {
  const [tab, setTab] = useState<"Posts" | "Collections" | "Replies" | "Likes" | "Saved">("Posts");
  const displayName = viewer?.displayName ?? "Arjun Kapoor";
  const username = viewer?.username ?? "arjcollects";
  const bio = viewer?.bio ?? "Saving the things that make time visible. Sneakers, watches, records, and every tiny story attached.";
  const cards = collectionCards.filter((card) => card.ownerHandle === username);
  const profileCards = cards.length ? cards : collectionCards.slice(0, 3);
  const privateTab = tab === "Likes" || tab === "Saved";

  return (
    <>
      <section className="profile-hero profile-premium">
        <div className="profile-banner profile-premium-banner" style={viewer?.bannerUrl ? { backgroundImage: `linear-gradient(100deg, rgb(24 28 19 / 50%), rgb(24 28 19 / 7%)), url(${viewer.bannerUrl})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}><div className="profile-banner-glow" /><div className="profile-banner-copy"><span>THE PERSONAL ARCHIVE</span><strong>Objects become stories<br />when someone remembers.</strong></div></div>
        <div className="profile-premium-body">
          <div className="profile-premium-top"><div className="profile-premium-avatar"><img src={viewer?.avatarUrl ?? DEFAULT_AVATAR} alt={displayName} /><i /></div><div className="profile-premium-actions"><button className="secondary-button" onClick={() => { window.location.href = viewer ? "/settings/profile" : "/login"; }}>{viewer ? "Edit profile" : "Join Klecto"}</button><button className="icon-button" aria-label="Profile options"><MoreHorizontal size={19} /></button></div></div>
          <div className="profile-premium-identity"><span className="eyebrow">COLLECTOR</span><h1>{displayName}<ShieldCheck size={18} /></h1><p className="handle">@{username}</p><p className="profile-premium-bio">{bio}</p><div className="profile-premium-location"><span>{viewer?.location ?? "Mumbai, India"}</span><i /> <span>{viewer ? `${viewer.accountVisibility} profile` : "Public profile"}</span></div></div>
          <div className="profile-stat-grid"><span><strong>{viewer?.followersCount ?? "2,184"}</strong><small>followers</small></span><span><strong>{viewer?.followingCount ?? 486}</strong><small>following</small></span><span><strong>{viewer?.itemCount ?? 155}</strong><small>catalogued</small></span><span><strong>{viewer?.collectionCount ?? 12}</strong><small>shelves</small></span></div>
          <button className="profile-similarity premium-profile-similarity" onClick={() => setTab("Collections")}><div className="mini-ring">82%</div><span><strong>Your collection match</strong><small>Top overlaps: Nike, Seiko, Jazz</small></span><em>Explore <ChevronRight size={16} /></em></button>
        </div>
      </section>
      <div className="profile-tabs profile-premium-tabs" aria-label="Profile content">{(["Posts", "Collections", "Replies", "Likes", "Saved"] as const).map((name) => <button key={name} className={tab === name ? "active" : ""} onClick={() => setTab(name)}>{name}{(name === "Likes" || name === "Saved") && <LockKeyhole size={12} />}</button>)}</div>
      <div className="profile-feed profile-premium-feed">
        {privateTab && <motion.div className="profile-note" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}><LockKeyhole size={16} /><span><strong>Only you can see this.</strong> {tab} stay private to your account.</span></motion.div>}
        {tab === "Collections" && <motion.div className="profile-collection-grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>{viewer ? collections.map((collection, index) => <motion.button className="profile-collection-card" key={collection.id} onClick={() => { window.location.href = `/collections/${collection.id}`; }} whileHover={{ y: -4 }} whileTap={{ scale: 0.985 }} transition={{ delay: index * 0.05 }}><div className="profile-collection-live-cover">{collection.coverUrl ? <img src={collection.coverUrl} alt="" /> : <span>{collection.name.slice(0, 2).toUpperCase()}</span>}</div><span><small>{collection.visibility} shelf · {collection.subcollections.length} subcollections</small><strong>{collection.name}</strong><em>{collection.items.length} objects <ChevronRight size={15} /></em></span></motion.button>) : profileCards.map((card, index) => <motion.button className="profile-collection-card" key={card.slug} onClick={() => { if (card.ownerHandle === "arjcollects") { window.location.href = `/demo/collections/${card.slug}`; return; } onOpenCollection(previewFromCard(card)); }} whileHover={{ y: -4 }} whileTap={{ scale: 0.985 }} transition={{ delay: index * 0.05 }}><img src={card.image} alt="" /><span><small>{card.privacy} shelf</small><strong>{card.title}</strong><em>{card.count} objects <ChevronRight size={15} /></em></span></motion.button>)}</motion.div>}
        {tab === "Replies" && <motion.div className="profile-reply-list" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>{comments.map((comment) => <article key={comment.id}><img src={comment.avatar} alt="" /><div><span>Replied to <strong>@{comment.handle}</strong></span><p>Exactly why I keep this shelf: the details get better with time.</p><small>{comment.time} - 12 likes</small></div></article>)}</motion.div>}
        {(tab === "Posts" || privateTab) && feedItems.slice(privateTab ? 1 : 0, privateTab ? 3 : 2).map((item, index) => <FeedCard key={`${tab}-${item.id}`} item={item} index={index} liked={index === 0} saved={tab === "Saved"} wished={tab === "Likes"} onLike={() => {}} onSave={() => {}} onWish={() => {}} onComment={() => {}} onOpenCollection={(entry) => { const collectionName = entry.collection.split("/")[0]?.trim() || entry.collection; const owned = viewer && entry.author.handle === viewer.username ? collections.find((collection) => collection.name.toLocaleLowerCase() === collectionName.toLocaleLowerCase()) : null; if (owned) { window.location.href = `/collections/${owned.id}`; return; } onOpenCollection({ title: collectionName, subtitle: entry.collection, count: 1, privacy: "Public", image: entry.image, ownerHandle: entry.author.handle, ownerName: entry.author.name }); }} />)}
      </div>
    </>
  );
}

function PremiumContextRail({ view, navigate, onOpenCollector }: { view: View; navigate: (view: View) => void; onOpenCollector: (collector: CollectorPreview) => void }) {
  const [following, setFollowing] = useState<string[]>([]);
  return (
    <motion.aside className="context-rail premium-context-rail" data-view={view} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.14, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}>
      <div className="search-box global-search"><Search size={17} /><input placeholder="Search Klecto" aria-label="Search Klecto" /><kbd>CMD K</kbd></div>
      <section className="side-card similarity-card"><div className="side-card-head"><span><Sparkles size={16} /> YOUR SIMILARITY</span><button onClick={() => navigate("matches")}>View all</button></div><div className="similarity-feature"><div className="side-ring">82%</div><span><strong>Great taste travels.</strong><p>You share 23 interests with collectors in your circle.</p></span></div><div className="overlap-avatars">{matches.map((match) => <button key={match.name} onClick={() => onOpenCollector(match)} aria-label={`Open ${match.name} profile`}><img src={match.avatar} alt="" /></button>)}<span>+18</span><small>collectors match above 70%</small></div></section>
      <section className="side-card"><div className="side-card-head"><span><Compass size={16} /> PEOPLE TO KNOW</span><button onClick={() => navigate("matches")}>See all</button></div>{matches.slice(0, 3).map((match) => <div className="person-row premium-person-row" key={match.name}><button className="person-profile" onClick={() => onOpenCollector(match)}><img src={match.avatar} alt="" /><span><strong>{match.name}</strong><small>{match.score}% match - {match.shared[0]}</small></span></button><button className={following.includes(match.handle) ? "following" : ""} onClick={() => setFollowing((current) => current.includes(match.handle) ? current.filter((handle) => handle !== match.handle) : [...current, match.handle])}>{following.includes(match.handle) ? "Following" : "Follow"}</button></div>)}</section>
      <section className="side-card prompt-card"><span>WEEKLY PROMPT - 04</span><h3>The piece you almost let go.</h3><p>Share its story with the community.</p><button className="secondary-button" onClick={() => navigate("home")}>Add your answer <ArrowLeft size={15} /></button></section>
      <footer><span>About</span><span>Privacy</span><span>Guidelines</span><span>(c) 2026 Klecto</span></footer>
    </motion.aside>
  );
}

function PremiumCommentDrawer({ item, onClose }: { item: FeedItem; onClose: () => void }) {
  const [draft, setDraft] = useState("");
  const [replyingTo, setReplyingTo] = useState<CommentReply | null>(null);
  const [menuComment, setMenuComment] = useState<CommentReply | null>(null);
  const [likedCommentIds, setLikedCommentIds] = useState<string[]>([]);
  const [newComments, setNewComments] = useState<CommentRecord[]>([]);
  const visibleComments = [...(comments as CommentRecord[]), ...newComments];

  const submit = () => {
    const body = draft.trim();
    if (!body) return;
    setNewComments((current) => [...current, { id: `comment-${Date.now()}`, name: "Arjun Kapoor", handle: "arjcollects", avatar: DEFAULT_AVATAR, body: replyingTo ? `@${replyingTo.handle} ${body}` : body, time: "now", likes: 0, replies: [] }]);
    setDraft("");
    setReplyingTo(null);
  };

  return (
    <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.aside className="comment-drawer premium-comment-drawer" initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 30, stiffness: 280 }} onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-label="Comments">
        <header><div><span className="eyebrow">CONVERSATION</span><h2>{item.comments + newComments.length} comments</h2></div><button className="icon-button" onClick={onClose} aria-label="Close comments"><X size={20} /></button></header>
        <div className="comment-context"><img src={item.image} alt="" /><span><strong>{item.title}</strong><small>by {item.author.name}</small></span><button className="icon-button" aria-label="Open item"><ChevronRight size={18} /></button></div>
        <div className="comment-sort"><span>Top comments</span><ChevronDown size={15} /><small>Hold a comment for options</small></div>
        <div className="comment-tree premium-comment-tree">{visibleComments.map((comment) => <div className="comment-thread" key={comment.id}><InteractiveComment comment={comment} liked={likedCommentIds.includes(comment.id)} onToggleLike={() => setLikedCommentIds((current) => current.includes(comment.id) ? current.filter((id) => id !== comment.id) : [...current, comment.id])} onReply={setReplyingTo} onOpenMenu={setMenuComment} />{comment.replies.map((child) => <div className="nested-comment" key={child.id}><InteractiveComment comment={child} liked={likedCommentIds.includes(child.id)} onToggleLike={() => setLikedCommentIds((current) => current.includes(child.id) ? current.filter((id) => id !== child.id) : [...current, child.id])} onReply={setReplyingTo} onOpenMenu={setMenuComment} /></div>)}</div>)}</div>
        <form className="comment-composer premium-comment-composer" onSubmit={(event) => { event.preventDefault(); submit(); }}><img src={DEFAULT_AVATAR} alt="" /><div>{replyingTo && <span className="replying-to">Replying to @{replyingTo.handle}<button type="button" onClick={() => setReplyingTo(null)}><X size={13} /></button></span>}<textarea placeholder="Add to the conversation..." value={draft} onChange={(event) => setDraft(event.target.value)} /><span><button type="button" aria-label="Add image"><ImagePlus size={17} /></button><button type="button" aria-label="Attach file"><Paperclip size={17} /></button><button className="primary-button" disabled={!draft.trim()}>Reply</button></span></div></form>
        <AnimatePresence>{menuComment && <CommentActionSheet comment={menuComment} onClose={() => setMenuComment(null)} onReply={() => { setReplyingTo(menuComment); setMenuComment(null); }} />}</AnimatePresence>
      </motion.aside>
    </motion.div>
  );
}

function InteractiveComment({ comment, liked, onToggleLike, onReply, onOpenMenu }: { comment: CommentReply; liked: boolean; onToggleLike: () => void; onReply: (comment: CommentReply) => void; onOpenMenu: (comment: CommentReply) => void }) {
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearHold = () => { if (holdTimer.current) { clearTimeout(holdTimer.current); holdTimer.current = null; } };
  useEffect(() => () => clearHold(), []);
  const beginHold = (event: React.PointerEvent<HTMLElement>) => {
    if ((event.pointerType === "mouse" && event.button !== 0) || (event.target as HTMLElement).closest("button")) return;
    holdTimer.current = setTimeout(() => { onOpenMenu(comment); holdTimer.current = null; }, 560);
  };
  return <article className="comment interactive-comment" onPointerDown={beginHold} onPointerUp={clearHold} onPointerCancel={clearHold} onPointerLeave={clearHold} onPointerMove={clearHold}><img src={comment.avatar} alt="" /><div><div className="comment-name"><strong>{comment.name}</strong><span>@{comment.handle} - {comment.time}</span><button onClick={() => onOpenMenu(comment)} aria-label={`More options for ${comment.name}`}><MoreHorizontal size={17} /></button></div><p>{comment.body}</p><div className="comment-quick-actions"><button className={`comment-like-count ${liked ? "liked" : ""}`} onClick={onToggleLike} aria-label={`Like comment by ${comment.name}`}><Heart size={15} fill={liked ? "currentColor" : "none"} /> <span>{comment.likes + (liked ? 1 : 0)}</span></button><button className="comment-reply-button" onClick={() => onReply(comment)}><MessageCircle size={14} /> Reply</button></div></div></article>;
}

function CommentActionSheet({ comment, onClose, onReply }: { comment: CommentReply; onClose: () => void; onReply: () => void }) {
  useEffect(() => { const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); }; window.addEventListener("keydown", onKeyDown); return () => window.removeEventListener("keydown", onKeyDown); }, [onClose]);
  const share = () => { if (navigator.clipboard) void navigator.clipboard.writeText(`${comment.name}: ${comment.body}`).catch(() => undefined); onClose(); };
  return <motion.div className="comment-action-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}><motion.div className="comment-action-sheet" initial={{ opacity: 0, y: 18, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.97 }} transition={{ type: "spring", damping: 25, stiffness: 340 }} onClick={(event) => event.stopPropagation()}><div className="comment-action-summary"><img src={comment.avatar} alt="" /><span><strong>{comment.name}</strong><small>@{comment.handle}</small></span></div><button onClick={onReply}><MessageCircle size={18} /> Reply</button><button onClick={share}><Share2 size={18} /> Share comment</button><button className="danger" onClick={onClose}><Flag size={18} /> Report</button><button className="cancel" onClick={onClose}>Cancel</button></motion.div></motion.div>;
}
