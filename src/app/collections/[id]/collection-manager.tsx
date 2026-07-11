/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Eye,
  Heart,
  ImagePlus,
  Layers3,
  LockKeyhole,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Plus,
  Save,
  Search,
  Send,
  Share2,
  SlidersHorizontal,
  Trash2,
  UsersRound,
  X,
} from "lucide-react";
import {
  createCollectionPostAction,
  createCatalogCommentAction,
  deleteCollectionAction,
  deleteSubcollectionAction,
  recordCollectionShareAction,
  recordCatalogViewAction,
  setCollectionLikeAction,
  updateCollectionAction,
} from "@/app/actions/catalog";
import { CatalogCommentSheet, SubcollectionWorkspace, type CommentTarget } from "./subcollection-workspace";
import { createClient } from "@/lib/supabase/client";
import type {
  CatalogCommentDTO,
  CollectionDTO,
  SubcollectionDTO,
  TemplateDTO,
  ViewerDTO,
  Visibility,
} from "@/lib/catalog-types";

type CollectionManagerProps = {
  viewer: ViewerDTO;
  collection: CollectionDTO;
  templates: TemplateDTO[];
  subcollectionId?: string;
};

type Notice = { type: "error" | "success"; text: string } | null;
type CollectionReactionState = { liked: boolean; likes: number; comments: number; views: number };

type DeleteConfirmation =
  | { kind: "collection" }
  | { kind: "subcollection"; subcollection: SubcollectionDTO };

const imageTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/avif", "image/heic"]);

function displayVisibility(visibility: Visibility) {
  return visibility === "followers" ? "Followers" : `${visibility[0].toUpperCase()}${visibility.slice(1)}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

function visibilityIcon(visibility: Visibility) {
  if (visibility === "private") return <LockKeyhole size={14} />;
  if (visibility === "followers") return <UsersRound size={14} />;
  return <Eye size={14} />;
}

export function CollectionManager(props: CollectionManagerProps) {
  const activeSubcollection = props.subcollectionId
    ? props.collection.subcollections.find((entry) => entry.id === props.subcollectionId)
    : null;

  if (activeSubcollection) {
    return <SubcollectionWorkspace viewer={props.viewer} collection={props.collection} subcollection={activeSubcollection} />;
  }

  return <CollectionWorkspace {...props} />;
}

function CollectionWorkspace({ viewer, collection, templates }: Omit<CollectionManagerProps, "subcollectionId">) {
  const [name, setName] = useState(collection.name);
  const [description, setDescription] = useState(collection.description ?? "");
  const [templateId, setTemplateId] = useState(collection.templateId ?? "");
  const [visibility, setVisibility] = useState<Visibility>(collection.visibility);
  const [coverPath, setCoverPath] = useState<string | null>(collection.coverPath);
  const [coverUrl, setCoverUrl] = useState<string | null>(collection.coverUrl);
  const [showEditor, setShowEditor] = useState(false);
  const [showPostComposer, setShowPostComposer] = useState(false);
  const [ownerMenuOpen, setOwnerMenuOpen] = useState(false);
  const [selectedSubcollection, setSelectedSubcollection] = useState<SubcollectionDTO | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<DeleteConfirmation | null>(null);
  const [catalogQuery, setCatalogQuery] = useState("");
  const [catalogKind, setCatalogKind] = useState<"all" | "brand" | "series" | "era" | "custom">("all");
  const [catalogVisibility, setCatalogVisibility] = useState<Visibility | "inherit" | "all">("all");
  const [catalogSort, setCatalogSort] = useState<"order" | "recent" | "name" | "items" | "liked">("order");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [postText, setPostText] = useState("");
  const [uploadingCover, setUploadingCover] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [pending, startTransition] = useTransition();
  const [collectionReaction, setCollectionReaction] = useState<CollectionReactionState>({
    liked: collection.likedByViewer,
    likes: collection.likeCount,
    comments: collection.commentCount,
    views: collection.viewCount,
  });
  const [comments, setComments] = useState<CatalogCommentDTO[]>(collection.comments);
  const [commentTarget, setCommentTarget] = useState<CommentTarget | null>(null);

  useEffect(() => {
    void recordCatalogViewAction({ targetType: "collection", targetId: collection.id });
  }, [collection.id]);

  const basePayload = (nextVisibility = visibility, nextCoverPath = coverPath) => ({
    id: collection.id,
    name,
    description: description.trim() || null,
    templateId: templateId || null,
    visibility: nextVisibility,
    coverPath: nextCoverPath,
  });

  const saveDetails = () => {
    setNotice(null);
    startTransition(async () => {
      const result = await updateCollectionAction(basePayload());
      if (!result.ok) {
        setNotice({ type: "error", text: result.error ?? "The collection could not be saved." });
        return;
      }
      setNotice({ type: "success", text: "Collection details saved." });
      window.setTimeout(() => window.location.reload(), 350);
    });
  };

  const changeVisibility = (nextVisibility: Visibility) => {
    if (nextVisibility === visibility) return;
    setVisibility(nextVisibility);
    setNotice(null);
    startTransition(async () => {
      const result = await updateCollectionAction(basePayload(nextVisibility));
      if (!result.ok) {
        setVisibility(visibility);
        setNotice({ type: "error", text: result.error ?? "Privacy could not be changed." });
        return;
      }
      setNotice({ type: "success", text: `Collection is now ${displayVisibility(nextVisibility).toLowerCase()}.` });
    });
  };

  const uploadCover = async (file: File) => {
    setNotice(null);
    if (!imageTypes.has(file.type) || file.size > 15 * 1024 * 1024) {
      setNotice({ type: "error", text: "Choose a JPG, PNG, WEBP, AVIF, or HEIC image under 15 MB." });
      return;
    }

    const extension = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
    const path = `${viewer.id}/collections/${collection.id}/cover-${crypto.randomUUID()}.${extension}`;
    const priorPath = coverPath;
    const priorUrl = coverUrl;
    setUploadingCover(true);

    const { error: uploadError } = await createClient().storage
      .from("collection-media")
      .upload(path, file, { cacheControl: "31536000", upsert: false, contentType: file.type });

    if (uploadError) {
      setUploadingCover(false);
      setNotice({ type: "error", text: "The cover could not be uploaded. Please try again." });
      return;
    }

    const localPreview = URL.createObjectURL(file);
    setCoverPath(path);
    setCoverUrl(localPreview);
    setUploadingCover(false);

    startTransition(async () => {
      const result = await updateCollectionAction(basePayload(visibility, path));
      if (!result.ok) {
        await createClient().storage.from("collection-media").remove([path]);
        setCoverPath(priorPath);
        setCoverUrl(priorUrl);
        setNotice({ type: "error", text: result.error ?? "The cover could not be saved." });
        return;
      }

      if (priorPath && priorPath !== path) {
        await createClient().storage.from("collection-media").remove([priorPath]);
      }
      setNotice({ type: "success", text: "Collection cover updated." });
      window.setTimeout(() => window.location.reload(), 350);
    });
  };

  const requestSubcollectionDelete = (subcollection: SubcollectionDTO) => {
    setNotice(null);
    setDeleteConfirmation({ kind: "subcollection", subcollection });
  };

  const confirmDelete = () => {
    const confirmation = deleteConfirmation;
    if (!confirmation) return;
    setNotice(null);
    startTransition(async () => {
      const result = confirmation.kind === "collection"
        ? await deleteCollectionAction(collection.id)
        : await deleteSubcollectionAction(confirmation.subcollection.id);

      if (!result.ok) {
        setNotice({
          type: "error",
          text: result.error ?? (confirmation.kind === "collection" ? "The collection could not be deleted." : "The subcollection could not be deleted."),
        });
        return;
      }

      if (confirmation.kind === "collection") {
        window.location.href = "/";
        return;
      }

      setDeleteConfirmation(null);
      setNotice({ type: "success", text: "Subcollection deleted." });
      window.setTimeout(() => window.location.reload(), 300);
    });
  };

  const publishCollection = () => {
    setNotice(null);
    startTransition(async () => {
      const result = await createCollectionPostAction({
        collectionId: collection.id,
        body: postText.trim() || null,
        visibility,
      });
      if (!result.ok) {
        setNotice({ type: "error", text: result.error ?? "The collection post could not be published." });
        return;
      }
      setPostText("");
      setShowPostComposer(false);
      setNotice({ type: "success", text: "Collection posted to your profile." });
    });
  };

  const toggleCollectionLike = () => {
    const prior = collectionReaction;
    const next = {
      ...prior,
      liked: !prior.liked,
      likes: prior.likes + (prior.liked ? -1 : 1),
    };
    setCollectionReaction(next);
    startTransition(async () => {
      const result = await setCollectionLikeAction({
        id: collection.id,
        active: next.liked,
        collectionId: collection.id,
      });
      if (!result.ok) {
        setCollectionReaction(prior);
        setNotice({ type: "error", text: result.error ?? "The collection like could not be updated." });
      }
    });
  };

  const submitCollectionComment = (target: CommentTarget, body: string) => {
    if (target.type !== "collection") return;
    startTransition(async () => {
      const result = await createCatalogCommentAction({
        collectionId: collection.id,
        targetCollectionId: target.id,
        itemId: null,
        subcollectionId: null,
        body,
      });
      if (!result.ok || !result.id) {
        setNotice({ type: "error", text: result.error ?? "The comment could not be saved." });
        return;
      }
      const commentId = result.id;
      setComments((current) => [...current, {
        id: commentId,
        collectionId: target.id,
        itemId: null,
        subcollectionId: null,
        authorId: viewer.id,
        body,
        createdAt: new Date().toISOString(),
        isOwn: true,
      }]);
      setCollectionReaction((current) => ({ ...current, comments: current.comments + 1 }));
    });
  };

  const shareCollection = async () => {
    const url = `${window.location.origin}/u/${viewer.username}/collections/${collection.slug}`;
    const shareData = {
      title: `${collection.name} · Klecto`,
      text: collection.description || `Take a look at ${viewer.displayName}'s ${collection.name} collection.`,
      url,
    };

    try {
      let channel: "copy_link" | "external" = "copy_link";
      if (navigator.share) {
        await navigator.share(shareData);
        channel = "external";
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
      } else {
        window.prompt("Copy your collection link", url);
      }
      void recordCollectionShareAction({ collectionId: collection.id, channel });
      setNotice({ type: "success", text: channel === "external" ? "Share sheet opened." : "Collection link copied." });
    } catch (error) {
      if ((error as DOMException).name !== "AbortError") {
        setNotice({ type: "error", text: "The collection link could not be shared." });
      }
    }
  };

  const visibleSubcollections = useMemo(() => {
    const normalizedQuery = catalogQuery.trim().toLocaleLowerCase();
    return collection.subcollections
      .map((subcollection) => ({
        subcollection,
        items: collection.items.filter((item) => item.subcollectionId === subcollection.id),
      }))
      .filter(({ subcollection, items }) => {
        const effectiveVisibility = subcollection.visibility ?? "inherit";
        const searchText = [
          subcollection.name,
          subcollection.description ?? "",
          subcollection.kind,
          ...items.flatMap((item) => [item.title, item.brand ?? "", item.model ?? "", item.description ?? ""]),
        ].join(" ").toLocaleLowerCase();
        return (catalogKind === "all" || subcollection.kind === catalogKind)
          && (catalogVisibility === "all" || effectiveVisibility === catalogVisibility)
          && (!normalizedQuery || searchText.includes(normalizedQuery));
      })
      .sort((left, right) => {
        if (catalogSort === "name") return left.subcollection.name.localeCompare(right.subcollection.name);
        if (catalogSort === "items") return right.items.length - left.items.length || left.subcollection.name.localeCompare(right.subcollection.name);
        if (catalogSort === "liked") return right.subcollection.likeCount - left.subcollection.likeCount || left.subcollection.name.localeCompare(right.subcollection.name);
        if (catalogSort === "recent") return (right.items[0]?.createdAt ?? "").localeCompare(left.items[0]?.createdAt ?? "");
        return left.subcollection.position - right.subcollection.position;
      });
  }, [catalogKind, catalogQuery, catalogSort, catalogVisibility, collection.items, collection.subcollections]);

  return (
    <main className="collection-studio-page">
      <header className="settings-topbar">
        <Link href="/"><ArrowLeft size={17} /> Back to Klecto</Link>
        <span className="eyebrow">YOUR COLLECTION</span>
        <span>@{viewer.username}</span>
      </header>

      <section className="collection-studio-shell collection-workspace-shell">
        <section className="studio-hero studio-workspace-hero collection-showcase">
          <div className={`studio-cover studio-editable-cover ${coverUrl ? "" : "placeholder"}`}>
            {coverUrl ? <img src={coverUrl} alt={`${collection.name} cover`} /> : <strong>{collection.name.slice(0, 2).toUpperCase()}</strong>}
            <span>{collection.items.length} {collection.items.length === 1 ? "object" : "objects"}</span>
            <label className="studio-cover-edit">
              <ImagePlus size={16} /> {uploadingCover ? "Uploading…" : coverUrl ? "Change cover" : "Add cover"}
              <input type="file" accept="image/jpeg,image/png,image/webp,image/avif,image/heic" disabled={uploadingCover || pending} onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void uploadCover(file);
                event.currentTarget.value = "";
              }} />
            </label>
          </div>

          <div className="studio-hero-copy">
            <span className="eyebrow">OWNED COLLECTION · {displayVisibility(visibility)}</span>
            <h1>{collection.name}</h1>
            <p>{collection.description || "Build the story one shelf at a time."}</p>
            <div className="studio-meta">
              <span>{collection.subcollections.length} subcollections</span>
              <span>{collection.items.length} total items</span>
              <span>Updated {formatDate(collection.updatedAt)}</span>
            </div>
            <div className="catalog-reactions collection-reactions" aria-label="Collection engagement">
              <button className={collectionReaction.liked ? "liked" : ""} disabled={pending} onClick={toggleCollectionLike} aria-label={collectionReaction.liked ? "Unlike collection" : "Like collection"}><Heart size={17} fill={collectionReaction.liked ? "currentColor" : "none"} /> {collectionReaction.likes}</button>
              <button disabled={pending} onClick={() => setCommentTarget({ type: "collection", id: collection.id, title: collection.name })}><MessageCircle size={17} /> {collectionReaction.comments}</button>
              <span className="catalog-quiet-view" aria-label={`${collectionReaction.views} collection views`}>{collectionReaction.views.toLocaleString()} reads</span>
            </div>
            <div className="studio-hero-actions">
              <button className="secondary-button" disabled={pending} onClick={() => void shareCollection()}><Share2 size={16} /> Share</button>
              <button className="primary-button" disabled={pending} onClick={() => setShowPostComposer((current) => !current)}><Send size={16} /> Post collection</button>
            </div>
            <div className="studio-visibility-pills" aria-label="Collection privacy">
              {(["public", "followers", "private"] as Visibility[]).map((entry) => <button key={entry} className={visibility === entry ? "active" : ""} onClick={() => changeVisibility(entry)} disabled={pending}>{visibilityIcon(entry)} {displayVisibility(entry)}</button>)}
            </div>
          </div>
          <div className="collection-showcase-owner">
            <button className="collection-owner-menu-trigger" onClick={() => setOwnerMenuOpen((current) => !current)} aria-expanded={ownerMenuOpen} aria-label="Collection options"><MoreHorizontal size={19} /></button>
            {ownerMenuOpen ? <div className="collection-owner-menu" role="dialog" aria-label="Collection options"><button onClick={() => { setOwnerMenuOpen(false); void shareCollection(); }}><Share2 size={16} /> Share collection</button><button onClick={() => { setOwnerMenuOpen(false); setShowPostComposer(true); }}><Send size={16} /> Post collection</button><button onClick={() => { setOwnerMenuOpen(false); setShowEditor(true); }}><Pencil size={16} /> Edit collection</button><span>Visibility</span><div>{(["public", "followers", "private"] as Visibility[]).map((entry) => <button className={visibility === entry ? "active" : ""} key={entry} disabled={pending} onClick={() => changeVisibility(entry)}>{visibilityIcon(entry)} {displayVisibility(entry)}</button>)}</div></div> : null}
          </div>
        </section>

        {showPostComposer ? (
          <section className="studio-post-composer" aria-label="Post this collection">
            <div><span className="eyebrow">SHARE TO YOUR PROFILE</span><h2>Give this collection a line of context.</h2><p>The collection card will be attached to your post automatically.</p></div>
            <textarea value={postText} maxLength={3000} onChange={(event) => setPostText(event.target.value)} placeholder="What makes this collection worth sharing? (optional)" />
            <footer><button className="text-button" onClick={() => setShowPostComposer(false)}><X size={15} /> Cancel</button><button className="primary-button" disabled={pending} onClick={publishCollection}><Send size={16} /> Publish post</button></footer>
          </section>
        ) : null}

        <section className="studio-route-section collection-catalog">
          <div className="collection-catalog-head collection-catalog-head--solo">
            <div><span className="eyebrow">THE SHELVES</span><h2>Browse the collection</h2><p>Open a section when you want the full story, or create the next shelf here.</p></div>
            <div className="collection-catalog-actions collection-catalog-actions--solo"><button className="primary-button collection-catalog-create" onClick={() => { window.location.href = `/create?mode=subcollection&collection=${collection.id}`; }}><Plus size={16} /> New section</button></div>
          </div>

          <div className="collection-catalog-toolbar">
            <label className="collection-catalog-search"><Search size={17} /><input value={catalogQuery} onChange={(event) => setCatalogQuery(event.target.value)} placeholder="Search sections, items, or brands" aria-label="Search this collection" />{catalogQuery ? <button type="button" onClick={() => setCatalogQuery("")} aria-label="Clear search"><X size={15} /></button> : null}</label>
            <label className="collection-catalog-sort"><span>Sort</span><select value={catalogSort} onChange={(event) => setCatalogSort(event.target.value as typeof catalogSort)} aria-label="Sort subcollections"><option value="order">Collection order</option><option value="recent">Recent activity</option><option value="name">Name A-Z</option><option value="items">Most items</option><option value="liked">Most liked</option></select></label>
            <div className="collection-catalog-filter-wrap"><button className={`collection-catalog-filter ${catalogKind !== "all" || catalogVisibility !== "all" ? "active" : ""}`} onClick={() => setFiltersOpen((current) => !current)} aria-expanded={filtersOpen}><SlidersHorizontal size={17} /> Filter</button>{filtersOpen ? <div className="collection-catalog-filter-popover" role="dialog" aria-label="Filter subcollections"><span>Type</span><div>{(["all", "brand", "series", "era", "custom"] as const).map((entry) => <button className={catalogKind === entry ? "active" : ""} key={entry} onClick={() => setCatalogKind(entry)}>{entry === "all" ? "Everything" : entry}</button>)}</div><span>Visibility</span><div>{(["all", "inherit", "public", "followers", "private"] as const).map((entry) => <button className={catalogVisibility === entry ? "active" : ""} key={entry} onClick={() => setCatalogVisibility(entry)}>{entry === "all" ? "Any visibility" : entry === "inherit" ? "Inherits collection" : displayVisibility(entry)}</button>)}</div></div> : null}</div>
          </div>
          <div className="collection-catalog-results"><span>{visibleSubcollections.length === collection.subcollections.length ? `${collection.subcollections.length} section${collection.subcollections.length === 1 ? "" : "s"}` : `${visibleSubcollections.length} of ${collection.subcollections.length} sections`}</span>{catalogQuery || catalogKind !== "all" || catalogVisibility !== "all" ? <button onClick={() => { setCatalogQuery(""); setCatalogKind("all"); setCatalogVisibility("all"); }}>Clear filters</button> : null}</div>

          <div className="subcollection-route-grid collection-catalog-grid">
            {visibleSubcollections.map(({ subcollection: entry, items: entries }, index) => {
              const preview = entry.coverUrl ?? entries.find((item) => item.imageUrl)?.imageUrl;
              return (
                <article className="subcollection-route-card curator-subcollection-card" key={entry.id}>
                  <Link href={`/collections/${collection.id}/subcollections/${entry.id}`} className="subcollection-route-link">
                    <div className={`subcollection-route-image ${preview ? "" : "placeholder"}`}>{preview ? <img src={preview} alt="" /> : <Layers3 size={23} />}<span>{String(index + 1).padStart(2, "0")}</span></div>
                    <div><small>{entry.kind} · {entry.visibility ? displayVisibility(entry.visibility) : `inherits ${displayVisibility(visibility)}`}</small><h3>{entry.name}</h3><p>{entry.description || `${entries.length} objects waiting inside.`}</p><strong>{entries.length} {entries.length === 1 ? "item" : "items"} <ChevronRight size={15} /></strong></div>
                  </Link>
                  <button className="subcollection-delete subcollection-menu-trigger" aria-label={`Options for ${entry.name}`} disabled={pending} onClick={() => setSelectedSubcollection(entry)}><MoreHorizontal size={17} /></button>
                </article>
              );
            })}
            {visibleSubcollections.length === 0 ? <div className="studio-empty subcollection-empty"><Layers3 size={25} /><strong>No sections match that view.</strong><p>Try another search or clear your filters to browse every part of this collection.</p></div> : null}
          </div>
        </section>

        {showEditor ? (
          <section className="settings-card studio-settings studio-details-card">
            <div className="settings-card-title">
              <span><Pencil size={16} /></span>
              <div><h2>Collection settings</h2><p>Rename it, change its template, or control who can see it.</p></div>
            </div>
            <div className="settings-form-grid">
              <label><span>Name</span><input value={name} onChange={(event) => setName(event.target.value)} maxLength={80} /></label>
              <label><span>Template</span><select value={templateId} onChange={(event) => setTemplateId(event.target.value)}><option value="">Custom collection</option>{templates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}</select></label>
              <label className="wide"><span>Description</span><textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={1000} /></label>
              <label><span>Visibility</span><select value={visibility} onChange={(event) => setVisibility(event.target.value as Visibility)}><option value="public">Public</option><option value="followers">Followers</option><option value="private">Private</option></select></label>
            </div>
            <div className="studio-actions">
              <button className="danger-button" disabled={pending} onClick={() => { setNotice(null); setDeleteConfirmation({ kind: "collection" }); }}><Trash2 size={16} /> Delete collection</button>
              <button className="primary-button" disabled={pending || !name.trim()} onClick={saveDetails}><Save size={16} /> Save settings</button>
            </div>
          </section>
        ) : null}

        {selectedSubcollection ? <div className="catalog-action-backdrop" role="presentation" onClick={() => setSelectedSubcollection(null)}><section className="catalog-action-sheet" role="dialog" aria-modal="true" aria-label={`${selectedSubcollection.name} options`} onClick={(event) => event.stopPropagation()}><span className="eyebrow">SECTION DETAILS</span><h2>{selectedSubcollection.name}</h2><p className="collection-action-summary">{selectedSubcollection.description || "A focused part of this collection."}</p><button onClick={() => { window.location.href = `/collections/${collection.id}/subcollections/${selectedSubcollection.id}`; }}><ChevronRight size={18} /> Open and edit section</button><button className="danger" disabled={pending} onClick={() => { const target = selectedSubcollection; setSelectedSubcollection(null); requestSubcollectionDelete(target); }}><Trash2 size={18} /> Delete section</button><button className="cancel" onClick={() => setSelectedSubcollection(null)}>Cancel</button></section></div> : null}

        {deleteConfirmation ? <DeleteConfirmationSheet
          eyebrow={deleteConfirmation.kind === "collection" ? "DELETE COLLECTION" : "DELETE SECTION"}
          title={deleteConfirmation.kind === "collection" ? `Delete ${collection.name}?` : `Delete ${deleteConfirmation.subcollection.name}?`}
          description={deleteConfirmation.kind === "collection"
            ? "This permanently removes the collection and every item inside it. This cannot be undone."
            : `This removes the section from ${collection.name}. Its items will stay in the main collection.`}
          confirmLabel={deleteConfirmation.kind === "collection" ? "Delete collection" : "Delete section"}
          pending={pending}
          onCancel={() => setDeleteConfirmation(null)}
          onConfirm={confirmDelete}
        /> : null}

        {commentTarget ? <CatalogCommentSheet target={commentTarget} viewer={viewer} comments={comments} pending={pending} onClose={() => setCommentTarget(null)} onSubmit={submitCollectionComment} /> : null}

        {notice ? <div className={`settings-message floating ${notice.type}`} role="status">{notice.type === "success" ? <Check size={17} /> : null}{notice.text}</div> : null}
      </section>
    </main>
  );
}

function DeleteConfirmationSheet({
  eyebrow,
  title,
  description,
  confirmLabel,
  pending,
  onCancel,
  onConfirm,
}: {
  eyebrow: string;
  title: string;
  description: string;
  confirmLabel: string;
  pending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="catalog-action-backdrop catalog-confirm-backdrop" role="presentation" onClick={() => { if (!pending) onCancel(); }}>
      <section className="catalog-action-sheet catalog-confirm-sheet" role="alertdialog" aria-modal="true" aria-labelledby="catalog-delete-confirmation-title" onClick={(event) => event.stopPropagation()}>
        <span className="eyebrow">{eyebrow}</span>
        <h2 id="catalog-delete-confirmation-title">{title}</h2>
        <p className="collection-action-summary catalog-confirm-copy">{description}</p>
        <button className="danger catalog-confirm-action" disabled={pending} onClick={onConfirm}><Trash2 size={18} /> {confirmLabel}</button>
        <button className="cancel" disabled={pending} onClick={onCancel}>Keep it</button>
      </section>
    </div>
  );
}
