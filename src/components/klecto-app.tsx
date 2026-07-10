/* eslint-disable @next/next/no-img-element */
"use client";

import { AnimatePresence, motion } from "motion/react";
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
import { useMemo, useState } from "react";
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

export function KlectoApp() {
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
    <div className="app-frame">
      <DesktopRail view={view} navigate={navigate} onCreate={() => setCreateOpen(true)} />

      <header className="mobile-topbar">
        <button className="icon-button" onClick={() => setMobileMenu(true)} aria-label="Open menu">
          <Menu size={21} />
        </button>
        <Brand compact />
        <button className="avatar-button" onClick={() => navigate("profile")} aria-label="Open profile">
          <img src="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=100&q=85" alt="Arjun Kapoor" />
        </button>
      </header>

      <AnimatePresence>
        {mobileMenu && (
          <motion.div className="mobile-menu-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.aside className="mobile-drawer" initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }} transition={{ type: "spring", damping: 28, stiffness: 260 }}>
              <div className="drawer-head"><Brand /><button className="icon-button" onClick={() => setMobileMenu(false)} aria-label="Close menu"><X size={20} /></button></div>
              <UserMini />
              <nav className="drawer-nav">
                {navItems.map((item) => <NavButton key={item.id} {...item} active={view === item.id} onClick={() => navigate(item.id)} />)}
              </nav>
              <button className="primary-button full" onClick={() => { setCreateOpen(true); setMobileMenu(false); }}><Plus size={18} /> Add to Klecto</button>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="main-column">
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
            {view === "collections" && <CollectionsView onCreate={() => setCreateOpen(true)} />}
            {view === "matches" && <MatchesView onMessage={() => navigate("inbox")} />}
            {view === "inbox" && <InboxView />}
            {view === "profile" && <ProfileView onOpenCollection={() => navigate("collections")} />}
          </motion.div>
        </AnimatePresence>
      </main>

      <ContextRail view={view} navigate={navigate} />

      <nav className="mobile-bottom-nav" aria-label="Primary navigation">
        {navItems.slice(0, 4).map((item) => {
          const Icon = item.icon;
          return <button key={item.id} className={view === item.id ? "active" : ""} onClick={() => navigate(item.id)}><Icon size={21} /><span>{item.label}</span>{item.id === "inbox" && <i>2</i>}</button>;
        })}
        <button className="mobile-create" onClick={() => setCreateOpen(true)} aria-label="Create"><Plus size={22} /></button>
      </nav>

      <AnimatePresence>
        {commentItem && <CommentDrawer item={commentItem} onClose={() => setCommentItem(null)} />}
        {createOpen && <CreateModal onClose={() => setCreateOpen(false)} />}
      </AnimatePresence>
    </div>
  );
}

function Brand({ compact = false }: { compact?: boolean }) {
  return <div className={`brand ${compact ? "compact" : ""}`}><span className="brand-mark"><i /><i /><i /></span>{!compact && <span>klecto</span>}</div>;
}

function DesktopRail({ view, navigate, onCreate }: { view: View; navigate: (view: View) => void; onCreate: () => void }) {
  return (
    <aside className="desktop-rail">
      <Brand />
      <nav className="rail-nav">
        {navItems.map((item) => <NavButton key={item.id} {...item} active={view === item.id} onClick={() => navigate(item.id)} />)}
      </nav>
      <button className="primary-button full" onClick={onCreate}><Plus size={19} /> Add to Klecto</button>
      <div className="rail-spacer" />
      <button className="quiet-nav"><Settings size={20} /><span>Settings</span></button>
      <UserMini />
    </aside>
  );
}

function NavButton({ label, icon: Icon, active, onClick }: { label: string; icon: typeof Home; active: boolean; onClick: () => void }) {
  return <button className={`nav-button ${active ? "active" : ""}`} onClick={onClick}><Icon size={21} strokeWidth={active ? 2.4 : 1.8} /><span>{label}</span>{label === "Inbox" && <i>2</i>}</button>;
}

function UserMini() {
  return (
    <button className="user-mini">
      <span className="avatar-wrap"><img src="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=120&q=85" alt="Arjun Kapoor" /><i /></span>
      <span><strong>Arjun Kapoor</strong><small>@arjcollects</small></span><MoreHorizontal size={18} />
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
    <motion.article layout className="feed-card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ delay: index * 0.05 }}>
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

function CollectionsView({ onCreate }: { onCreate: () => void }) {
  const scope = "All collections";
  return (
    <>
      <section className="page-header"><div><span className="eyebrow">THE THINGS YOU KEEP</span><h1>Collections</h1></div><button className="primary-button" onClick={onCreate}><Plus size={18} /> New collection</button></section>
      <section className="collection-summary">
        <div><strong>155</strong><span>items catalogued</span></div><div><strong>12</strong><span>collections</span></div><div><strong>8</strong><span>shared interests</span></div>
      </section>
      <div className="collection-toolbar"><div className="select-like"><Grid2X2 size={16} />{scope}<ChevronDown size={15} /></div><button className="icon-button"><Search size={19} /></button><button className="icon-button"><SlidersHorizontal size={18} /></button></div>
      <div className="collection-grid">
        {collectionCards.map((collection, index) => (
          <motion.article className="collection-card" key={collection.title} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.06 }}>
            <div className="collection-image"><img src={collection.image} alt="" /><span style={{ background: collection.accent }}>{collection.count}</span>{collection.privacy === "Private" && <i><LockKeyhole size={13} /></i>}</div>
            <div className="collection-card-body"><small>{collection.privacy}</small><h2>{collection.title}</h2><p>{collection.subtitle}</p><div><span>{collection.count} items</span><button className="icon-button"><MoreHorizontal size={18} /></button></div></div>
          </motion.article>
        ))}
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

function ProfileView({ onOpenCollection }: { onOpenCollection: () => void }) {
  const [tab, setTab] = useState("Posts");
  return (
    <>
      <section className="profile-hero">
        <div className="profile-banner"><span>Objects become stories<br />when someone remembers.</span></div>
        <div className="profile-identity"><img src="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=260&q=85" alt="Arjun Kapoor" /><button className="secondary-button">Edit profile</button><button className="icon-button"><MoreHorizontal size={19} /></button></div>
        <div className="profile-copy"><h1>Arjun Kapoor</h1><p className="handle">@arjcollects</p><p>Saving the things that make time visible. Sneakers, watches, records, and every tiny story attached.</p><span>Mumbai, India · Joined 2025</span></div>
        <div className="profile-stats"><span><strong>486</strong> following</span><span><strong>2,184</strong> followers</span><span><strong>155</strong> items</span></div>
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
    <aside className="context-rail">
      <div className="search-box global-search"><Search size={17} /><input placeholder="Search Klecto" aria-label="Search Klecto" /><kbd>⌘ K</kbd></div>
      <section className="side-card similarity-card"><div className="side-card-head"><span><Sparkles size={16} /> YOUR SIMILARITY</span><button onClick={() => navigate("matches")}>View all</button></div><div className="similarity-feature"><div className="side-ring">82%</div><span><strong>Great taste travels.</strong><p>You share 23 interests with collectors in your circle.</p></span></div><div className="overlap-avatars">{matches.map((match) => <img key={match.name} src={match.avatar} alt="" />)}<span>+18</span><small>collectors match above 70%</small></div></section>
      <section className="side-card"><div className="side-card-head"><span><Compass size={16} /> PEOPLE TO KNOW</span><button onClick={() => navigate("matches")}>See all</button></div>{matches.slice(0, 3).map((match) => <div className="person-row" key={match.name}><img src={match.avatar} alt="" /><span><strong>{match.name}</strong><small>{match.score}% match · {match.shared[0]}</small></span><button>Follow</button></div>)}</section>
      <section className="side-card prompt-card"><span>WEEKLY PROMPT · 04</span><h3>The piece you almost let go.</h3><p>Share its story with the community.</p><button className="secondary-button">Add your answer <ArrowLeft size={15} /></button></section>
      <footer><span>About</span><span>Privacy</span><span>Guidelines</span><span>© 2026 Klecto</span></footer>
    </aside>
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

function CreateModal({ onClose }: { onClose: () => void }) {
  const [type, setType] = useState<"Item" | "Collection" | "Post">("Item");
  const [title, setTitle] = useState("");
  const [step, setStep] = useState(1);
  return (
    <motion.div className="modal-backdrop centered" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.section className="create-modal" initial={{ opacity: 0, scale: 0.96, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }} onClick={(event) => event.stopPropagation()}>
        <header><div><span className="eyebrow">ADD TO YOUR WORLD</span><h2>Create something</h2></div><button className="icon-button" onClick={onClose}><X size={20} /></button></header>
        <div className="create-types">{(["Item", "Collection", "Post"] as const).map((entry) => <button key={entry} className={type === entry ? "active" : ""} onClick={() => setType(entry)}>{entry === "Item" ? <ImagePlus /> : entry === "Collection" ? <Layers3 /> : <Repeat2 />}<span><strong>{entry}</strong><small>{entry === "Item" ? "Catalog one thing" : entry === "Collection" ? "Start a new shelf" : "Share a thought"}</small></span>{type === entry && <Check size={17} />}</button>)}</div>
        <div className="form-field"><label>{type} title</label><input autoFocus placeholder={type === "Item" ? "e.g. Jordan 1 High ‘85" : `Name your ${type.toLowerCase()}`} value={title} onChange={(event) => setTitle(event.target.value)} /></div>
        {type === "Item" && <><div className="upload-zone"><ImagePlus size={24} /><strong>Drop photos here</strong><span>Up to 8 images · JPG, PNG or HEIC</span><button className="secondary-button">Choose photos</button></div><div className="two-fields"><div className="form-field"><label>Collection</label><button className="select-input">Archive sneakers <ChevronDown size={16} /></button></div><div className="form-field"><label>Feeling</label><button className="select-input"><Star size={15} /> Favorite <ChevronDown size={16} /></button></div></div></>}
        <footer><span>Step {step} of 2</span><div className="progress"><i /><i className={step === 2 ? "active" : ""} /></div><button className="primary-button" disabled={!title.trim()} onClick={() => step === 1 ? setStep(2) : onClose()}>{step === 1 ? "Continue" : "Publish"}<ChevronRight size={17} /></button></footer>
      </motion.section>
    </motion.div>
  );
}
