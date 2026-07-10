/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Layers3, LockKeyhole, Pencil, Plus, Save, Star, Trash2 } from "lucide-react";
import {
  createSubcollectionAction,
  deleteCollectionAction,
  deleteItemAction,
  deleteSubcollectionAction,
  updateCollectionAction,
} from "@/app/actions/catalog";
import type { CollectionDTO, TemplateDTO, ViewerDTO, Visibility } from "@/lib/catalog-types";

export function CollectionManager({ viewer, collection, templates }: { viewer: ViewerDTO; collection: CollectionDTO; templates: TemplateDTO[] }) {
  const [name, setName] = useState(collection.name);
  const [description, setDescription] = useState(collection.description ?? "");
  const [templateId, setTemplateId] = useState(collection.templateId ?? "");
  const [visibility, setVisibility] = useState<Visibility>(collection.visibility);
  const [subName, setSubName] = useState("");
  const [subDescription, setSubDescription] = useState("");
  const [subKind, setSubKind] = useState<"brand" | "series" | "era" | "custom">("brand");
  const [subVisibility, setSubVisibility] = useState<Visibility | "inherit">("inherit");
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const run = (operation: () => Promise<{ ok: boolean; error?: string }>, success: string, redirectAfter = false) => {
    setMessage(null);
    startTransition(async () => {
      const result = await operation();
      if (!result.ok) return setMessage({ type: "error", text: result.error ?? "The change could not be saved." });
      if (redirectAfter) {
        window.location.href = "/";
        return;
      }
      setMessage({ type: "success", text: success });
      window.setTimeout(() => window.location.reload(), 450);
    });
  };

  return (
    <main className="collection-studio-page">
      <header className="settings-topbar"><Link href="/"><ArrowLeft size={17} /> Back to Klecto</Link><span className="eyebrow">COLLECTION STUDIO</span><span>@{viewer.username}</span></header>
      <section className="collection-studio-shell">
        <div className="studio-hero">
          <div className={`studio-cover ${collection.coverUrl ? "" : "placeholder"}`}>{collection.coverUrl ? <img src={collection.coverUrl} alt="" /> : <strong>{collection.name.slice(0, 2).toUpperCase()}</strong>}<span>{collection.items.length} objects</span></div>
          <div><span className="eyebrow">{collection.visibility} collection</span><h1>{collection.name}</h1><p>{collection.description || "A new shelf with room for a story."}</p><div className="studio-meta"><span>{collection.subcollections.length} subcollections</span><span>{collection.items.length} items</span><span>Updated {new Date(collection.updatedAt).toLocaleDateString()}</span></div></div>
        </div>

        <section className="settings-card studio-settings">
          <div className="settings-card-title"><span><Pencil size={16} /></span><div><h2>Collection details</h2><p>Rename the shelf or make its audience more selective.</p></div></div>
          <div className="settings-form-grid"><label><span>Name</span><input value={name} onChange={(event) => setName(event.target.value)} maxLength={80} /></label><label><span>Template</span><select value={templateId} onChange={(event) => setTemplateId(event.target.value)}><option value="">Custom collection</option>{templates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}</select></label><label className="wide"><span>Description</span><textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={1000} /></label><label><span>Visibility</span><select value={visibility} onChange={(event) => setVisibility(event.target.value as Visibility)}><option value="public">Public</option><option value="followers">Followers</option><option value="private">Private</option></select></label></div>
          <div className="studio-actions"><button className="danger-button" disabled={pending} onClick={() => { if (window.confirm(`Delete “${collection.name}” and every item inside it?`)) run(() => deleteCollectionAction(collection.id), "Collection deleted.", true); }}><Trash2 size={16} /> Delete collection</button><button className="primary-button" disabled={pending || !name.trim()} onClick={() => run(() => updateCollectionAction({ id: collection.id, name, description: description.trim() || null, templateId: templateId || null, visibility }), "Collection updated.")}><Save size={16} /> Save details</button></div>
        </section>

        <section className="settings-card">
          <div className="settings-card-title"><span><Layers3 size={16} /></span><div><h2>Subcollections</h2><p>Add a brand like Nike, a series, an era, or your own grouping.</p></div></div>
          <div className="subcollection-create"><input value={subName} onChange={(event) => setSubName(event.target.value)} placeholder="e.g. Nike" /><select value={subKind} onChange={(event) => setSubKind(event.target.value as typeof subKind)}><option value="brand">Brand</option><option value="series">Series</option><option value="era">Era</option><option value="custom">Custom</option></select><select value={subVisibility} onChange={(event) => setSubVisibility(event.target.value as typeof subVisibility)}><option value="inherit">Inherit privacy</option><option value="public">Public</option><option value="followers">Followers</option><option value="private">Private</option></select><button className="primary-button" disabled={pending || !subName.trim()} onClick={() => run(async () => { const result = await createSubcollectionAction({ collectionId: collection.id, name: subName, description: subDescription.trim() || null, kind: subKind, visibility: subVisibility === "inherit" ? null : subVisibility }); if (result.ok) { setSubName(""); setSubDescription(""); } return result; }, "Subcollection added.")}><Plus size={16} /> Add</button></div>
          <textarea className="subcollection-note" value={subDescription} onChange={(event) => setSubDescription(event.target.value)} placeholder="Optional note about this subcollection" />
          <div className="subcollection-list">{collection.subcollections.map((entry) => <div key={entry.id}><span><strong>{entry.name}</strong><small>{entry.kind} · {entry.visibility ?? `inherits ${collection.visibility}`}</small></span><button disabled={pending} onClick={() => run(() => deleteSubcollectionAction(entry.id), "Subcollection removed.")}><Trash2 size={15} /></button></div>)}{collection.subcollections.length === 0 && <p>No subcollections yet. Items can still live directly in the collection.</p>}</div>
        </section>

        <section className="studio-items-section">
          <div className="studio-section-head"><div><span className="eyebrow">OBJECTS ON THIS SHELF</span><h2>Items</h2></div><Link href="/">Add item from Klecto <Plus size={15} /></Link></div>
          <div className="studio-item-grid">{collection.items.map((item) => <article key={item.id}><div className={`studio-item-image ${item.imageUrl ? "" : "placeholder"}`}>{item.imageUrl ? <img src={item.imageUrl} alt={item.title} /> : <Layers3 />}{item.isFavorite && <i><Star size={13} fill="currentColor" /></i>}{item.visibility === "private" && <span><LockKeyhole size={13} /></span>}</div><div><small>{item.brand || item.mood}</small><h3>{item.title}</h3><p>{[item.model, item.year, item.condition].filter(Boolean).join(" · ") || "Catalogued object"}</p><button disabled={pending} onClick={() => { if (window.confirm(`Delete “${item.title}”?`)) run(() => deleteItemAction(item.id), "Item deleted."); }}><Trash2 size={14} /> Delete</button></div></article>)}{collection.items.length === 0 && <div className="studio-empty"><Layers3 size={24} /><strong>Nothing catalogued yet.</strong><p>Return to Klecto and use Add to Klecto to publish the first item.</p></div>}</div>
        </section>

        {message && <div className={`settings-message floating ${message.type}`}>{message.type === "success" && <Check size={17} />}{message.text}</div>}
      </section>
    </main>
  );
}
