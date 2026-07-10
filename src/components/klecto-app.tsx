/* eslint-disable @next/next/no-img-element */
"use client";

import { AnimatePresence, MotionConfig, motion } from "motion/react";
import {
  Archive,
  ArrowLeft,
  Bell,
  Bookmark,
  Camera,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Compass,
  Ellipsis,
  Flag,
  Grid2X2,
  Heart,
  Home,
  ImagePlus,
  Layers3,
  LockKeyhole,
  Menu,
  MessageCircle,
  Mic,
  MoreHorizontal,
  Paperclip,
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
  UserRound,
  Video,
  X,
} from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { createCollectionAction, createItemAction } from "@/app/actions/catalog";
import { createClient } from "@/lib/supabase/client";
import type { CatalogDashboardDTO, ViewerDTO, Visibility } from "@/lib/catalog-types";
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
  const [createOpen, setCreateOpen] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);

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

  return (
    <MotionConfig reducedMotion="user" transition={{ type: "spring", stiffness: 310, damping: 28, mass: 0.72 }}>
    <motion.div className="app-frame" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.52, ease: [0.16, 1, 0.3, 1] }}>
      <DesktopRail view={view} navigate={navigate} onCreate={() => setCreateOpen(true)} viewer={initialData.viewer} />

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
              <button className="primary-button full" onClick={() => { setCreateOpen(true); setMobileMenu(false); }}><Plus size={18} /> Add to Klecto</button>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.main className="main-column" initial={{ opacity: 0, y: 20, scale: 0.992 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: 0.06, duration: 0.56, ease: [0.16, 1, 0.3, 1] }}>
        <AnimatePresence mode="wait" initial={false}>
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
                onCreate={() => setCreateOpen(true)}
              />
            )}
            {view === "collections" && <CollectionsView onCreate={() => setCreateOpen(true)} data={initialData} />}
            {view === "matches" && <MatchesView onMessage={() => navigate("inbox")} />}
            {view === "inbox" && <InboxView />}
            {view === "profile" && <ProfileView onOpenCollection={() => navigate("collections")} viewer={initialData.viewer} />}
          </motion.div>
        </AnimatePresence>
      </motion.main>

      <ContextRail view={view} navigate={navigate} />

      <nav className="mobile-bottom-nav" aria-label="Primary navigation">
        {navItems.slice(0, 4).map((item) => {
          const Icon = item.icon;
          return <motion.button key={item.id} className={view === item.id ? "active" : ""} onClick={() => navigate(item.id)} whileTap={{ scale: 0.92 }}><Icon size={21} /><span>{item.label}</span>{item.id === "inbox" && <i>2</i>}</motion.button>;
        })}
        <motion.button className="mobile-create" onClick={() => setCreateOpen(true)} aria-label="Create" whileTap={{ scale: 0.9, rotate: -8 }}><Plus size={22} /></motion.button>
      </nav>

      <AnimatePresence>
        {commentItem && <CommentDrawer item={commentItem} onClose={() => setCommentItem(null)} />}
        {createOpen && <CreateModal onClose={() => setCreateOpen(false)} data={initialData} />}
      </AnimatePresence>
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
            <FeedCard key={item.id} item={item} index={index} liked={props.liked.includes(item.id)} saved={props.saved.includes(item.id)} wished={props.wished.includes(item.id)} onLike={() => props.toggleLike(item.id)} onSave={() => props.toggleSave(item.id)} onWish={() => props.toggleWish(item.id)} onComment={() => props.onComment(item)} />
          ))}
        </AnimatePresence>
      </div>
    </>
  );
}

function FeedCard({ item, index, liked, saved, wished, onLike, onSave, onWish, onComment }: { item: FeedItem; index: number; liked: boolean; saved: boolean; wished: boolean; onLike: () => void; onSave: () => void; onWish: () => void; onComment: () => void }) {
  const mood = item.mood ? moodLabels[item.mood] : null;
  const MoodIcon = mood?.icon;
  return (
    <motion.article layout className="feed-card" initial={{ opacity: 0, y: 22, scale: 0.985 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} whileHover={{ y: -4 }} transition={{ delay: index * 0.055, duration: 0.46, ease: [0.16, 1, 0.3, 1] }}>
      <div className="post-head">
        <button className="author"><img src={item.author.avatar} alt="" /><span><strong>{item.author.name}{item.author.verified && <ShieldCheck size={14} />}</strong><small>@{item.author.handle} · {item.time}</small></span></button>
        <button className="icon-button"><Ellipsis size={19} /></button>
      </div>
      <div className="collection-label"><span>{item.kind === "wishlist" ? <Repeat2 size={14} /> : <Layers3 size={14} />}</span>{item.collection}<ChevronRight size={14} /></div>
      <h2>{item.title}</h2>
      <p className="post-copy">{item.description}</p>
      <div className="media-frame">
        <img src={item.image} alt={item.imageAlt} />
        {mood && MoodIcon && <span className={`mood-tag ${item.mood}`}><MoodIcon size={14} fill={item.mood === "favorite" ? "currentColor" : "none"} />{mood.label}</span>}
        <span className="image-count"><Camera size={13} /> 1 / 3</span>
      </div>
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

function CollectionsView({ onCreate, data }: { onCreate: () => void; data: CatalogDashboardDTO }) {
  const scope = "All collections";
  const liveCollections = data.viewer ? data.collections : null;
  const cards = liveCollections ?? collectionCards.map((collection, index) => ({
    id: `demo-${index}`,
    name: collection.title,
    description: collection.subtitle,
    coverUrl: collection.image,
    visibility: collection.privacy.toLowerCase() as Visibility,
    items: Array.from({ length: collection.count }),
    subcollections: [],
  }));
  const subcollectionCount = data.collections.reduce((total, collection) => total + collection.subcollections.length, 0);
  return (
    <>
      <section className="page-header"><div><span className="eyebrow">THE THINGS YOU KEEP</span><h1>Collections</h1></div><button className="primary-button" onClick={onCreate}><Plus size={18} /> New collection</button></section>
      <section className="collection-summary">
        <div><strong>{data.viewer?.itemCount ?? 155}</strong><span>items catalogued</span></div><div><strong>{data.viewer?.collectionCount ?? 12}</strong><span>collections</span></div><div><strong>{data.viewer ? subcollectionCount : 8}</strong><span>subcollections</span></div>
      </section>
      <div className="collection-toolbar"><div className="select-like"><Grid2X2 size={16} />{scope}<ChevronDown size={15} /></div><button className="icon-button"><Search size={19} /></button><button className="icon-button"><SlidersHorizontal size={18} /></button></div>
      <div className="collection-grid">
        {cards.map((collection, index) => (
          <motion.article className="collection-card" key={collection.id} initial={{ opacity: 0, y: 20, scale: 0.985 }} animate={{ opacity: 1, y: 0, scale: 1 }} whileHover={{ y: -5 }} transition={{ delay: index * 0.06, duration: 0.44, ease: [0.16, 1, 0.3, 1] }} onClick={() => { if (data.viewer) window.location.href = `/collections/${collection.id}`; }}>
            <div className={`collection-image ${collection.coverUrl ? "" : "placeholder"}`}>{collection.coverUrl ? <img src={collection.coverUrl} alt="" /> : <strong>{collection.name.slice(0, 2).toUpperCase()}</strong>}<span style={{ background: ["#f0ff9b", "#d7e6ff", "#ffd4c8", "#e8dcff"][index % 4] }}>{collection.items.length}</span>{collection.visibility === "private" && <i><LockKeyhole size={13} /></i>}</div>
            <div className="collection-card-body"><small>{collection.visibility}</small><h2>{collection.name}</h2><p>{collection.subcollections.map((entry) => entry.name).slice(0, 3).join(", ") || collection.description || "Ready for the first item"}</p><div><span>{collection.items.length} items</span><button className="icon-button" onClick={(event) => event.stopPropagation()}><MoreHorizontal size={18} /></button></div></div>
          </motion.article>
        ))}
        {liveCollections?.length === 0 && <div className="catalog-empty"><Layers3 size={24} /><strong>Your shelves are waiting.</strong><p>Start with Sneakers, Clothing, Watches, or name something only you collect.</p></div>}
        <button className="new-collection-card" onClick={onCreate}><span><Plus size={24} /></span><strong>Start something new</strong><small>Use a category or name your own.</small></button>
      </div>
    </>
  );
}

function MatchesView({ onMessage }: { onMessage: () => void }) {
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
        <div className="match-actions"><button className="secondary-button"><UserRound size={17} /> View profile</button><button className="primary-button" onClick={onMessage}><MessageCircle size={17} /> Say hello</button></div>
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

function CreateModal({ onClose, data }: { onClose: () => void; data: CatalogDashboardDTO }) {
  const [type, setType] = useState<"Item" | "Collection" | "Post">("Item");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("public");
  const [templateId, setTemplateId] = useState("");
  const [collectionId, setCollectionId] = useState(data.collections[0]?.id ?? "");
  const [subcollectionId, setSubcollectionId] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [condition, setCondition] = useState("");
  const [mood, setMood] = useState<"grail" | "memory" | "favorite" | "regret" | "neutral">("neutral");
  const [isFavorite, setIsFavorite] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const selectedCollection = data.collections.find((collection) => collection.id === collectionId);

  const submit = () => {
    const viewer = data.viewer;
    if (!viewer) {
      window.location.href = "/login";
      return;
    }
    setError("");

    if (type === "Post") {
      setError("Live posts arrive in the next social-data slice. Items and collections are ready now.");
      return;
    }

    startTransition(async () => {
      if (type === "Collection") {
        const result = await createCollectionAction({
          name: title,
          description: description.trim() || null,
          templateId: templateId || null,
          visibility,
        });
        if (!result.ok) return setError(result.error ?? "Could not create the collection.");
        window.location.reload();
        return;
      }

      if (!collectionId) return setError("Create or choose a collection first.");
      if (files.length === 0) return setError("Add at least one photo of the item.");
      if (files.length > 8) return setError("Choose no more than eight photos.");

      const acceptedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/avif", "image/heic"]);
      const invalidFile = files.find((file) => !acceptedTypes.has(file.type) || file.size > 15 * 1024 * 1024);
      if (invalidFile) return setError(`${invalidFile.name} is not a supported image under 15 MB.`);

      const supabase = createClient();
      const uploadedPaths: string[] = [];
      for (const file of files) {
        const extension = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
        const path = `${viewer.id}/items/${crypto.randomUUID()}.${extension}`;
        const { error: uploadError } = await supabase.storage
          .from("collection-media")
          .upload(path, file, { cacheControl: "31536000", upsert: false, contentType: file.type });
        if (uploadError) {
          if (uploadedPaths.length) await supabase.storage.from("collection-media").remove(uploadedPaths);
          return setError(`Upload failed for ${file.name}. Please try again.`);
        }
        uploadedPaths.push(path);
      }

      const numericYear = year ? Number(year) : null;
      const result = await createItemAction({
        collectionId,
        subcollectionId: subcollectionId || null,
        title,
        description: description.trim() || null,
        brand: brand.trim() || null,
        model: model.trim() || null,
        year: Number.isFinite(numericYear) ? numericYear : null,
        condition: condition.trim() || null,
        mood,
        isFavorite,
        visibility,
        mediaPaths: uploadedPaths,
      });
      if (!result.ok) {
        await supabase.storage.from("collection-media").remove(uploadedPaths);
        return setError(result.error ?? "Could not create the item.");
      }
      window.location.reload();
    });
  };
  return (
    <motion.div className="modal-backdrop centered" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.section className="create-modal" initial={{ opacity: 0, scale: 0.96, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }} onClick={(event) => event.stopPropagation()}>
        <header><div><span className="eyebrow">ADD TO YOUR WORLD</span><h2>Create something</h2></div><button className="icon-button" onClick={onClose}><X size={20} /></button></header>
        <div className="create-types">{(["Item", "Collection", "Post"] as const).map((entry) => <button key={entry} className={type === entry ? "active" : ""} onClick={() => { setType(entry); setError(""); }}>{entry === "Item" ? <ImagePlus /> : entry === "Collection" ? <Layers3 /> : <Repeat2 />}<span><strong>{entry}</strong><small>{entry === "Item" ? "Catalog one thing" : entry === "Collection" ? "Start a new shelf" : "Share a thought"}</small></span>{type === entry && <Check size={17} />}</button>)}</div>
        <div className="form-field"><label>{type} title</label><input autoFocus placeholder={type === "Item" ? "e.g. Jordan 1 High ‘85" : `Name your ${type.toLowerCase()}`} value={title} onChange={(event) => setTitle(event.target.value)} /></div>
        {type !== "Post" && <div className="form-field"><label>Description</label><textarea placeholder="What makes this worth keeping?" value={description} onChange={(event) => setDescription(event.target.value)} /></div>}
        {type === "Collection" && <>
          <div className="two-fields">
            <div className="form-field"><label>Starting template</label><select value={templateId} onChange={(event) => setTemplateId(event.target.value)}><option value="">Custom collection</option>{data.templates.map((template) => <option value={template.id} key={template.id}>{template.name}</option>)}</select></div>
            <div className="form-field"><label>Who can see it</label><select value={visibility} onChange={(event) => setVisibility(event.target.value as Visibility)}><option value="public">Public</option><option value="followers">Followers</option><option value="private">Private</option></select></div>
          </div>
        </>}
        {type === "Item" && <>
          <label className="upload-zone"><ImagePlus size={24} /><strong>{files.length ? `${files.length} photo${files.length === 1 ? "" : "s"} selected` : "Choose item photos"}</strong><span>Up to 8 images · JPG, PNG, WEBP, AVIF or HEIC · 15 MB each</span><span className="secondary-button">Browse photos</span><input className="visually-hidden" type="file" accept="image/jpeg,image/png,image/webp,image/avif,image/heic" multiple onChange={(event) => setFiles(Array.from(event.target.files ?? []))} /></label>
          <div className="two-fields">
            <div className="form-field"><label>Collection</label><select value={collectionId} onChange={(event) => { setCollectionId(event.target.value); setSubcollectionId(""); }}><option value="">Choose a collection</option>{data.collections.map((collection) => <option value={collection.id} key={collection.id}>{collection.name}</option>)}</select></div>
            <div className="form-field"><label>Subcollection</label><select value={subcollectionId} onChange={(event) => setSubcollectionId(event.target.value)} disabled={!selectedCollection?.subcollections.length}><option value="">None</option>{selectedCollection?.subcollections.map((entry) => <option value={entry.id} key={entry.id}>{entry.name}</option>)}</select></div>
          </div>
          <div className="two-fields"><div className="form-field"><label>Brand</label><input value={brand} onChange={(event) => setBrand(event.target.value)} placeholder="Nike" /></div><div className="form-field"><label>Model</label><input value={model} onChange={(event) => setModel(event.target.value)} placeholder="Air Jordan 1" /></div></div>
          <div className="two-fields"><div className="form-field"><label>Year</label><input value={year} onChange={(event) => setYear(event.target.value.replace(/\D/g, "").slice(0, 4))} inputMode="numeric" placeholder="2021" /></div><div className="form-field"><label>Condition</label><input value={condition} onChange={(event) => setCondition(event.target.value)} placeholder="Deadstock" /></div></div>
          <div className="two-fields"><div className="form-field"><label>Story mark</label><select value={mood} onChange={(event) => setMood(event.target.value as typeof mood)}><option value="neutral">No mark</option><option value="grail">Grail</option><option value="memory">Memory</option><option value="favorite">Favorite</option><option value="regret">Regret</option></select></div><div className="form-field"><label>Visibility</label><select value={visibility} onChange={(event) => setVisibility(event.target.value as Visibility)}><option value="public">Public</option><option value="followers">Followers</option><option value="private">Private</option></select></div></div>
          <label className="check-field"><input type="checkbox" checked={isFavorite} onChange={(event) => setIsFavorite(event.target.checked)} /><Star size={16} /> Pin this as a favorite item</label>
        </>}
        {type === "Post" && <div className="create-coming-soon"><Repeat2 size={20} /><strong>Social posting is next.</strong><p>The current live slice focuses on building the catalog that posts and wishlists will reference.</p></div>}
        {error && <div className="create-error" role="alert">{error}</div>}
        <footer><span>{data.viewer ? "Saved to your live catalog" : "Sign in to publish"}</span><div className="progress"><i /><i className={pending ? "active" : ""} /></div><button className="primary-button" disabled={!title.trim() || pending} onClick={submit}>{pending ? "Publishing…" : data.viewer ? "Publish" : "Continue to sign in"}<ChevronRight size={17} /></button></footer>
      </motion.section>
    </motion.div>
  );
}
