/* eslint-disable @next/next/no-img-element */
"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Eye,
  ImagePlus,
  Layers3,
  LockKeyhole,
  Pencil,
  Plus,
  Save,
  Send,
  Share2,
  Sparkles,
  Star,
  Trash2,
  UsersRound,
  X,
} from "lucide-react";
import type { DemoCollection, DemoItem, DemoSubcollection } from "@/lib/demo-collections";
import type { Visibility } from "@/lib/catalog-types";

type Notice = { type: "error" | "success"; text: string } | null;

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

export function DemoCollectionWorkspace({ collection, subcollectionId }: { collection: DemoCollection; subcollectionId?: string }) {
  const subcollection = subcollectionId ? collection.subcollections.find((entry) => entry.id === subcollectionId) : null;
  if (subcollection) return <DemoSubcollectionWorkspace collection={collection} subcollection={subcollection} />;
  return <DemoCollectionDashboard collection={collection} />;
}

function DemoCollectionDashboard({ collection }: { collection: DemoCollection }) {
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
      const nativeShare = Reflect.get(navigator, "share") as unknown;
      const usedNativeShare = typeof nativeShare === "function";
      if (usedNativeShare) await nativeShare.call(navigator, { title: `${name} · Klecto`, text: description, url });
      else if (navigator.clipboard) await navigator.clipboard.writeText(url);
      else window.prompt("Copy your demo collection link", url);
      setNotice({ type: "success", text: usedNativeShare ? "Share sheet opened." : "Demo collection link copied." });
    } catch (error) {
      if ((error as DOMException).name !== "AbortError") setNotice({ type: "error", text: "The demo collection could not be shared." });
    }
  };

  if (deleted) {
    return (
      <main className="collection-studio-page">
        <header className="settings-topbar"><Link href="/"><ArrowLeft size={17} /> Back to Klecto</Link><span className="eyebrow">DEMO COLLECTION</span><span>@{collection.owner.username}</span></header>
        <section className="collection-studio-shell demo-deleted-state"><Layers3 size={28} /><span className="eyebrow">DEMO CHANGE</span><h1>{name} was removed.</h1><p>That action is local to the sample account. Refresh the page to restore Arjun’s starting shelf, or sign in to manage a live collection.</p><div><button className="secondary-button" onClick={() => window.location.reload()}>Restore demo</button><Link className="primary-button" href="/">Back to Klecto</Link></div></section>
      </main>
    );
  }

  return (
    <main className="collection-studio-page">
      <header className="settings-topbar"><Link href="/"><ArrowLeft size={17} /> Back to Klecto</Link><span className="eyebrow">DEMO COLLECTION</span><span>@{collection.owner.username}</span></header>
      <section className="collection-studio-shell collection-workspace-shell">
        <DemoWorkspaceNote />
        <section className="studio-hero studio-workspace-hero">
          <div className="studio-cover studio-editable-cover"><img src={coverUrl} alt={`${name} cover`} /><span>{itemCount} objects</span><label className="studio-cover-edit"><ImagePlus size={16} /> Change cover<input type="file" accept="image/*" onChange={(event) => { const file = event.target.files?.[0]; if (file) changeCover(file); event.currentTarget.value = ""; }} /></label></div>
          <div className="studio-hero-copy"><span className="eyebrow">ARJUN&apos;S COLLECTION · {visibilityLabel(visibility)}</span><h1>{name}</h1><p>{description}</p><div className="studio-meta"><span>{subcollections.length} subcollections</span><span>{itemCount} total items</span><span>Updated {formatDate(collection.updatedAt)}</span></div><div className="studio-hero-actions"><button className="secondary-button" onClick={() => void share()}><Share2 size={16} /> Share</button><button className="primary-button" onClick={() => setShowPostComposer((current) => !current)}><Send size={16} /> Post collection</button></div><div className="studio-visibility-pills" aria-label="Demo collection privacy">{(["public", "followers", "private"] as Visibility[]).map((entry) => <button className={visibility === entry ? "active" : ""} key={entry} onClick={() => { setVisibility(entry); setNotice({ type: "success", text: `Demo collection set to ${visibilityLabel(entry).toLowerCase()}.` }); }}>{visibilityIcon(entry)} {visibilityLabel(entry)}</button>)}</div></div>
        </section>

        {showPostComposer ? <section className="studio-post-composer"><div><span className="eyebrow">SHARE TO YOUR PROFILE</span><h2>Give this collection a line of context.</h2><p>This interactive sample keeps posts in the current browser session.</p></div><textarea value={postText} onChange={(event) => setPostText(event.target.value)} placeholder="What makes this collection worth sharing? (optional)" /><footer><button className="text-button" onClick={() => setShowPostComposer(false)}><X size={15} /> Cancel</button><button className="primary-button" onClick={() => { setPostText(""); setShowPostComposer(false); setNotice({ type: "success", text: "Demo post published to Arjun’s sample profile." }); }}><Send size={16} /> Publish post</button></footer></section> : null}

        <section className="studio-route-section"><div className="studio-section-head workspace-section-head"><div><span className="eyebrow">STEP 1 · CHOOSE A SUBCOLLECTION</span><h2>Subcollections</h2><p>These open as full demo pages, exactly like a live owner collection.</p></div><button className="secondary-button" onClick={() => setShowSettings((current) => !current)}><Pencil size={16} /> {showSettings ? "Close settings" : "Manage collection"}</button></div><div className="subcollection-route-grid">{subcollections.map((entry, index) => <DemoSubcollectionCard key={entry.id} collection={collection} subcollection={entry} index={index} visibility={visibility} onDelete={() => { if (window.confirm(`Remove “${entry.name}” from this demo?`)) { setSubcollections((current) => current.filter((candidate) => candidate.id !== entry.id)); setNotice({ type: "success", text: "Subcollection removed locally in the demo." }); } }} />)}</div></section>

        {showSettings ? <section className="settings-card studio-settings studio-details-card"><div className="settings-card-title"><span><Pencil size={16} /></span><div><h2>Collection settings</h2><p>These controls are interactive so you can preview the live owner workspace.</p></div></div><div className="settings-form-grid"><label><span>Name</span><input value={name} maxLength={80} onChange={(event) => setName(event.target.value)} /></label><label><span>Visibility</span><select value={visibility} onChange={(event) => setVisibility(event.target.value as Visibility)}><option value="public">Public</option><option value="followers">Followers</option><option value="private">Private</option></select></label><label className="wide"><span>Description</span><textarea value={description} maxLength={1000} onChange={(event) => setDescription(event.target.value)} /></label></div><div className="studio-actions"><button className="danger-button" onClick={() => { if (window.confirm(`Delete “${name}” from this demo?`)) setDeleted(true); }}><Trash2 size={16} /> Delete collection</button><button className="primary-button" onClick={() => setNotice({ type: "success", text: "Demo collection settings saved locally." })}><Save size={16} /> Save settings</button></div></section> : null}

        <section className="studio-items-section studio-direct-items"><div className="studio-section-head"><div><span className="eyebrow">STEP 2 · ITEMS WITHOUT A SUBCOLLECTION</span><h2>Unsorted items</h2></div><button className="secondary-button" onClick={() => setNotice({ type: "success", text: "Use a signed-in account to add permanent items." })}><Plus size={15} /> Add item</button></div><DemoItemGrid items={directItems} onDelete={(item) => { if (window.confirm(`Delete “${item.title}” from this demo?`)) { setDirectItems((current) => current.filter((candidate) => candidate.id !== item.id)); setNotice({ type: "success", text: "Item removed locally in the demo." }); } }} emptyTitle="Everything is neatly grouped." emptyBody="Open a subcollection to browse its items." /></section>
        {notice ? <div className={`settings-message floating ${notice.type}`} role="status">{notice.type === "success" ? <Check size={17} /> : null}{notice.text}</div> : null}
      </section>
    </main>
  );
}

function DemoSubcollectionCard({ collection, subcollection, index, visibility, onDelete }: { collection: DemoCollection; subcollection: DemoSubcollection; index: number; visibility: Visibility; onDelete: () => void }) {
  const preview = subcollection.items[0]?.image;
  return <article className="subcollection-route-card" key={subcollection.id}><Link href={`/demo/collections/${collection.slug}/subcollections/${subcollection.id}`} className="subcollection-route-link"><div className="subcollection-route-image">{preview ? <img src={preview} alt="" /> : <Layers3 size={23} />}<span>{String(index + 1).padStart(2, "0")}</span></div><div><small>{subcollection.kind} · {subcollection.visibility ? visibilityLabel(subcollection.visibility) : `inherits ${visibilityLabel(visibility)}`}</small><h3>{subcollection.name}</h3><p>{subcollection.description}</p><strong>{subcollection.items.length} {subcollection.items.length === 1 ? "item" : "items"} <ChevronRight size={15} /></strong></div></Link><button className="subcollection-delete" aria-label={`Delete ${subcollection.name}`} onClick={onDelete}><Trash2 size={15} /></button></article>;
}

function DemoSubcollectionWorkspace({ collection, subcollection }: { collection: DemoCollection; subcollection: DemoSubcollection }) {
  const [items, setItems] = useState(subcollection.items);
  const [deleted, setDeleted] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const effectiveVisibility = subcollection.visibility ?? collection.visibility;

  if (deleted) {
    return <main className="collection-studio-page"><header className="settings-topbar"><Link href={`/demo/collections/${collection.slug}`}><ArrowLeft size={17} /> {collection.name}</Link><span className="eyebrow">DEMO SUBCOLLECTION</span><span>@{collection.owner.username}</span></header><section className="collection-studio-shell demo-deleted-state"><Layers3 size={28} /><span className="eyebrow">DEMO CHANGE</span><h1>{subcollection.name} was removed.</h1><p>This change is local to the sample workspace.</p><Link className="primary-button" href={`/demo/collections/${collection.slug}`}>Back to collection</Link></section></main>;
  }

  return <main className="collection-studio-page"><header className="settings-topbar"><Link href={`/demo/collections/${collection.slug}`}><ArrowLeft size={17} /> {collection.name}</Link><span className="eyebrow">DEMO SUBCOLLECTION</span><span>@{collection.owner.username}</span></header><section className="collection-studio-shell subcollection-workspace-shell"><DemoWorkspaceNote /><nav className="collection-breadcrumb" aria-label="Collection hierarchy"><Link href="/">Collections</Link><ChevronRight size={14} /><Link href={`/demo/collections/${collection.slug}`}>{collection.name}</Link><ChevronRight size={14} /><span>{subcollection.name}</span></nav><section className="subcollection-page-hero"><div className="subcollection-page-mark"><Layers3 size={28} /><span>{subcollection.kind}</span></div><div><span className="eyebrow">{visibilityLabel(effectiveVisibility)} · {String(subcollection.position + 1).padStart(2, "0")} IN THIS COLLECTION</span><h1>{subcollection.name}</h1><p>{subcollection.description}</p><div className="studio-meta"><span>{items.length} {items.length === 1 ? "item" : "items"}</span><span>Newest first</span><span>Inside {collection.name}</span></div></div><div className="subcollection-page-actions"><button className="secondary-button" onClick={() => setNotice({ type: "success", text: "Use a signed-in account to add permanent items." })}><Plus size={16} /> Add item</button><button className="danger-button" onClick={() => { if (window.confirm(`Delete “${subcollection.name}” from this demo?`)) setDeleted(true); }}><Trash2 size={16} /> Delete</button></div></section><section className="studio-items-section subcollection-items-section"><div className="studio-section-head"><div><span className="eyebrow">STEP 3 · BROWSE THE ITEMS</span><h2>Items in order</h2></div><Link href={`/demo/collections/${collection.slug}`}>All subcollections <ChevronRight size={15} /></Link></div><DemoItemGrid items={items} numbered onDelete={(item) => { if (window.confirm(`Delete “${item.title}” from this demo?`)) { setItems((current) => current.filter((candidate) => candidate.id !== item.id)); setNotice({ type: "success", text: "Item removed locally in the demo." }); } }} emptyTitle="This subcollection is ready." emptyBody="Use a signed-in account to add the first permanent item." /></section>{notice ? <div className={`settings-message floating ${notice.type}`} role="status">{notice.type === "success" ? <Check size={17} /> : null}{notice.text}</div> : null}</section></main>;
}

function DemoItemGrid({ items, onDelete, emptyTitle, emptyBody, numbered = false }: { items: DemoItem[]; onDelete: (item: DemoItem) => void; emptyTitle: string; emptyBody: string; numbered?: boolean }) {
  return <div className="studio-item-grid">{items.map((item, index) => <article key={item.id}><div className="studio-item-image">{item.image ? <img src={item.image} alt={item.title} /> : <Layers3 />}{numbered ? <b className="studio-item-order">{String(index + 1).padStart(2, "0")}</b> : null}{item.isFavorite ? <i><Star size={13} fill="currentColor" /></i> : null}{item.visibility === "private" ? <span><LockKeyhole size={13} /></span> : null}</div><div><small>{item.brand || item.mood}</small><h3>{item.title}</h3><p>{item.details || item.description}</p><button onClick={() => onDelete(item)}><Trash2 size={14} /> Delete</button></div></article>)}{items.length === 0 ? <div className="studio-empty"><Layers3 size={24} /><strong>{emptyTitle}</strong><p>{emptyBody}</p></div> : null}</div>;
}

function DemoWorkspaceNote() {
  return <div className="demo-workspace-note"><Sparkles size={16} /><span><strong>Arjun Kapoor sample account</strong> — changes here are interactive previews and reset on refresh. Sign in to save them to your own collection.</span></div>;
}
