/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Eye,
  ImagePlus,
  Layers3,
  LockKeyhole,
  Plus,
  Send,
  Sparkles,
  Star,
  UsersRound,
  X,
} from "lucide-react";
import {
  createCollectionAction,
  createItemAction,
  createSubcollectionAction,
} from "@/app/actions/catalog";
import { createClient } from "@/lib/supabase/client";
import type { CatalogDashboardDTO, ItemMood, Visibility } from "@/lib/catalog-types";

type CreateMode = "collection" | "subcollection" | "item";
type SubcollectionKind = "brand" | "series" | "era" | "custom";
type PhotoDraft = { file: File; previewUrl: string };

type CreationStudioProps = {
  initialData: CatalogDashboardDTO;
  initialMode?: string;
  initialCollectionId?: string;
  initialSubcollectionId?: string;
};

const supportedImageTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/avif", "image/heic"]);

const modeCopy: Record<CreateMode, { label: string; hint: string }> = {
  collection: { label: "Collection", hint: "Start the big story" },
  subcollection: { label: "Subcollection", hint: "Create a focused shelf" },
  item: { label: "Item", hint: "Add one meaningful thing" },
};

function getInitialMode(value: string | undefined): CreateMode {
  if (value === "collection" || value === "subcollection" || value === "item") return value;
  return "item";
}

function visibilityLabel(value: Visibility) {
  if (value === "followers") return "Followers";
  return value[0].toUpperCase() + value.slice(1);
}

function visibilityIcon(value: Visibility) {
  if (value === "public") return <Eye size={15} />;
  if (value === "followers") return <UsersRound size={15} />;
  return <LockKeyhole size={15} />;
}

function fieldValue(value: string) {
  return value.trim() || null;
}

export function CreationStudio({
  initialData,
  initialMode,
  initialCollectionId,
  initialSubcollectionId,
}: CreationStudioProps) {
  const router = useRouter();
  const requestedCollection = initialData.collections.find((collection) => collection.id === initialCollectionId);
  const fallbackCollection = requestedCollection ?? initialData.collections[0] ?? null;

  const [mode, setMode] = useState<CreateMode>(() => getInitialMode(initialMode));
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [collectionId, setCollectionId] = useState(fallbackCollection?.id ?? "");
  const [subcollectionId, setSubcollectionId] = useState(() => (
    fallbackCollection?.subcollections.some((entry) => entry.id === initialSubcollectionId)
      ? initialSubcollectionId ?? ""
      : ""
  ));
  const [collectionVisibility, setCollectionVisibility] = useState<Visibility>("public");
  const [subcollectionVisibility, setSubcollectionVisibility] = useState<Visibility | "inherit">("inherit");
  const [itemVisibility, setItemVisibility] = useState<Visibility>("public");
  const [shareToShelf, setShareToShelf] = useState(true);
  const [templateId, setTemplateId] = useState("");
  const [subcollectionKind, setSubcollectionKind] = useState<SubcollectionKind>("brand");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [condition, setCondition] = useState("");
  const [mood, setMood] = useState<ItemMood>("neutral");
  const [isFavorite, setIsFavorite] = useState(false);
  const [photos, setPhotos] = useState<PhotoDraft[]>([]);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const selectedCollection = useMemo(
    () => initialData.collections.find((collection) => collection.id === collectionId) ?? null,
    [collectionId, initialData.collections],
  );
  const selectedSubcollection = selectedCollection?.subcollections.find((entry) => entry.id === subcollectionId) ?? null;
  const signedIn = Boolean(initialData.viewer);
  const canCreate = !signedIn || (
    title.trim().length > 0
    && (mode === "collection" || Boolean(collectionId))
    && (mode !== "item" || photos.length > 0)
  );

  const changeMode = (nextMode: CreateMode) => {
    if (pending || mode === nextMode) return;
    setMode(nextMode);
    setError("");
  };

  const changeCollection = (nextCollectionId: string) => {
    setCollectionId(nextCollectionId);
    setSubcollectionId("");
  };

  const addPhotos = (fileList: FileList | null) => {
    const incoming = Array.from(fileList ?? []);
    if (!incoming.length) return;

    const invalid = incoming.find((file) => !supportedImageTypes.has(file.type) || file.size > 15 * 1024 * 1024);
    if (invalid) {
      setError(`${invalid.name} is not a supported image under 15 MB.`);
      return;
    }

    const availableSlots = 8 - photos.length;
    if (availableSlots <= 0) {
      setError("An item can have up to eight photos.");
      return;
    }

    const additions = incoming.slice(0, availableSlots).map((file) => ({ file, previewUrl: URL.createObjectURL(file) }));
    setPhotos((current) => [...current, ...additions]);
    setError(incoming.length > availableSlots ? "Only the first eight photos were added." : "");
  };

  const removePhoto = (previewUrl: string) => {
    setPhotos((current) => {
      const removed = current.find((entry) => entry.previewUrl === previewUrl);
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      return current.filter((entry) => entry.previewUrl !== previewUrl);
    });
  };

  const publish = () => {
    if (!signedIn) {
      router.push("/login");
      return;
    }

    setError("");
    if (!title.trim()) {
      setError(`Give this ${mode === "item" ? "item" : mode} a name first.`);
      return;
    }
    if ((mode === "subcollection" || mode === "item") && !collectionId) {
      setError("Choose a collection first.");
      return;
    }
    if (mode === "item" && !photos.length) {
      setError("Add at least one photo so this item has a place to start.");
      return;
    }

    startTransition(async () => {
      if (mode === "collection") {
        const result = await createCollectionAction({
          name: title,
          description: fieldValue(description),
          templateId: templateId || null,
          visibility: collectionVisibility,
        });
        if (!result.ok || !result.id) {
          setError(result.error ?? "This collection could not be created.");
          return;
        }
        router.push(`/collections/${result.id}`);
        router.refresh();
        return;
      }

      if (mode === "subcollection") {
        const result = await createSubcollectionAction({
          collectionId,
          name: title,
          description: fieldValue(description),
          kind: subcollectionKind,
          visibility: subcollectionVisibility === "inherit" ? null : subcollectionVisibility,
        });
        if (!result.ok || !result.id) {
          setError(result.error ?? "This subcollection could not be created.");
          return;
        }
        router.push(`/collections/${collectionId}/subcollections/${result.id}`);
        router.refresh();
        return;
      }

      const viewer = initialData.viewer;
      if (!viewer) return;
      const uploadedPaths: string[] = [];
      const storage = createClient().storage.from("collection-media");

      try {
        for (const photo of photos) {
          const extension = (photo.file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
          const path = `${viewer.id}/items/${crypto.randomUUID()}.${extension}`;
          const { error: uploadError } = await storage.upload(path, photo.file, {
            cacheControl: "31536000",
            upsert: false,
            contentType: photo.file.type,
          });
          if (uploadError) throw new Error(`Upload failed for ${photo.file.name}.`);
          uploadedPaths.push(path);
        }

        const numericYear = year ? Number(year) : null;
        const result = await createItemAction({
          collectionId,
          subcollectionId: subcollectionId || null,
          title,
          description: fieldValue(description),
          brand: fieldValue(brand),
          model: fieldValue(model),
          year: Number.isFinite(numericYear) ? numericYear : null,
          condition: fieldValue(condition),
          mood,
          isFavorite,
          visibility: shareToShelf ? "public" : itemVisibility,
          mediaPaths: uploadedPaths,
        });
        if (!result.ok) {
          if (uploadedPaths.length) await storage.remove(uploadedPaths);
          setError(result.error ?? "This item could not be added.");
          return;
        }

        router.push(subcollectionId
          ? `/collections/${collectionId}/subcollections/${subcollectionId}`
          : `/collections/${collectionId}`);
        router.refresh();
      } catch (submissionError) {
        if (uploadedPaths.length) await storage.remove(uploadedPaths);
        setError(submissionError instanceof Error ? submissionError.message : "The photos could not be uploaded. Please try again.");
      }
    });
  };

  const descriptionPlaceholder = mode === "collection"
    ? "Start with the feeling, the era, or the question this collection holds."
    : mode === "subcollection"
      ? "What belongs together in this part of the story?"
      : "Why does this piece matter? A small detail is enough.";

  return (
    <main className="create-studio-page" data-mode={mode}>
      <header className="create-studio-topbar">
        <Link href="/" className="create-studio-back-link"><ArrowLeft size={17} /> Back to Klecto</Link>
        <Link href="/" className="create-studio-wordmark" aria-label="Klecto home"><span>K</span> klecto</Link>
        <div className="create-studio-user-note">
          <Sparkles size={15} /> {signedIn ? `Writing as @${initialData.viewer?.username}` : "Your story, your shelf"}
        </div>
      </header>

      <section className="create-studio-shell">
        <div className="create-studio-intro">
          <span className="create-studio-eyebrow">ADD TO YOUR WORLD</span>
          <h1>Make room for something worth keeping.</h1>
          <p>Compose it like a post, then place it exactly where it belongs.</p>
        </div>

        <nav className="create-studio-mode-tabs" aria-label="Choose what to create">
          {(Object.keys(modeCopy) as CreateMode[]).map((entry) => {
            const Icon = entry === "collection" ? Layers3 : entry === "subcollection" ? Plus : ImagePlus;
            return (
              <button
                type="button"
                key={entry}
                className={`create-studio-mode-button ${mode === entry ? "is-active" : ""}`}
                onClick={() => changeMode(entry)}
                aria-pressed={mode === entry}
                disabled={pending}
              >
                <span className="create-studio-mode-icon"><Icon size={19} /></span>
                <span><strong>{modeCopy[entry].label}</strong><small>{modeCopy[entry].hint}</small></span>
                {mode === entry ? <Check size={17} className="create-studio-mode-check" /> : null}
              </button>
            );
          })}
        </nav>

        <div className="create-studio-layout">
          <form className="create-studio-composer" onSubmit={(event) => { event.preventDefault(); publish(); }}>
            <header className="create-studio-composer-header">
              <div className="create-studio-avatar" aria-hidden="true">
                {initialData.viewer?.avatarUrl ? <img src={initialData.viewer.avatarUrl} alt="" /> : <span>{initialData.viewer?.displayName?.slice(0, 1) ?? "K"}</span>}
              </div>
              <div>
                <span className="create-studio-eyebrow">NEW {modeCopy[mode].label.toUpperCase()}</span>
                <p>{mode === "item" ? "Tell the story first. The details can stay quiet." : mode === "subcollection" ? "Choose the thread that ties these things together." : "Give your future self a beautiful place to begin."}</p>
              </div>
            </header>

            {mode === "item" ? (
              <section className="create-studio-photo-stage" aria-label="Item photos">
                {photos.length ? (
                  <div className="create-studio-photo-grid">
                    {photos.map((photo, index) => (
                      <figure className={`create-studio-photo create-studio-photo-${Math.min(index + 1, 4)}`} key={photo.previewUrl}>
                        <img src={photo.previewUrl} alt={`Selected item photo ${index + 1}`} />
                        <button type="button" onClick={() => removePhoto(photo.previewUrl)} aria-label={`Remove photo ${index + 1}`}><X size={15} /></button>
                      </figure>
                    ))}
                    {photos.length < 8 ? <label className="create-studio-photo-add"><ImagePlus size={20} /><span>Add photo</span><input className="create-studio-visually-hidden" type="file" accept="image/jpeg,image/png,image/webp,image/avif,image/heic" multiple onChange={(event) => { addPhotos(event.target.files); event.currentTarget.value = ""; }} /></label> : null}
                  </div>
                ) : (
                  <label className="create-studio-photo-empty">
                    <span className="create-studio-photo-empty-icon"><ImagePlus size={26} /></span>
                    <strong>Start with the image.</strong>
                    <small>Choose up to 8 photos · JPG, PNG, WEBP, AVIF, or HEIC · 15 MB each</small>
                    <span className="create-studio-photo-browse">Choose photos <ChevronRight size={16} /></span>
                    <input className="create-studio-visually-hidden" type="file" accept="image/jpeg,image/png,image/webp,image/avif,image/heic" multiple onChange={(event) => { addPhotos(event.target.files); event.currentTarget.value = ""; }} />
                  </label>
                )}
              </section>
            ) : (
              <section className={`create-studio-composer-banner create-studio-composer-banner--${mode}`} aria-hidden="true">
                <div><span>{mode === "collection" ? "A place for the whole story" : "A shelf within the story"}</span><strong>{mode === "collection" ? "Begin with a beautiful blank page." : "Every section can hold its own point of view."}</strong></div>
                {mode === "collection" ? <Layers3 size={58} /> : <Plus size={58} />}
              </section>
            )}

            <section className="create-studio-story-fields">
              <label className="create-studio-title-field">
                <span>{mode === "item" ? "Name this item" : mode === "collection" ? "Name the collection" : "Name this shelf"}</span>
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  maxLength={mode === "item" ? 140 : 80}
                  placeholder={mode === "item" ? "e.g. Midnight game controller" : mode === "collection" ? "e.g. Childhood things" : "e.g. The toy box"}
                />
              </label>
              <label className="create-studio-description-field">
                <span>Story <small>optional</small></span>
                <textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={mode === "item" ? 4000 : mode === "collection" ? 1000 : 600} placeholder={descriptionPlaceholder} />
                <small className="create-studio-character-count">{description.length} characters</small>
              </label>
            </section>

            {mode === "collection" ? (
              <section className="create-studio-details create-studio-collection-details">
                <div className="create-studio-section-head"><span className="create-studio-eyebrow">COLLECTION FRAME</span><p>Start with a template, or make it completely your own.</p></div>
                <div className="create-studio-option-grid">
                  <label className="create-studio-select-field"><span>Starting point</span><select value={templateId} onChange={(event) => setTemplateId(event.target.value)}><option value="">A custom collection</option>{initialData.templates.map((template) => <option key={template.id} value={template.id}>{template.icon} {template.name}</option>)}</select></label>
                  <AudienceSelector value={collectionVisibility} onChange={setCollectionVisibility} compact />
                </div>
              </section>
            ) : null}

            {mode === "subcollection" ? (
              <section className="create-studio-details create-studio-subcollection-details">
                <div className="create-studio-section-head"><span className="create-studio-eyebrow">PLACE IT ON A SHELF</span><p>Choose its parent and the kind of connection it represents.</p></div>
                <CollectionPicker collections={initialData.collections} collectionId={collectionId} onChange={changeCollection} />
                <div className="create-studio-choice-row" aria-label="Subcollection type">
                  {(["brand", "series", "era", "custom"] as SubcollectionKind[]).map((kind) => <button type="button" className={subcollectionKind === kind ? "is-selected" : ""} key={kind} onClick={() => setSubcollectionKind(kind)} aria-pressed={subcollectionKind === kind}>{kind}</button>)}
                </div>
                <div className="create-studio-inherit-visibility">
                  <span>Visibility</span>
                  {(["inherit", "public", "followers", "private"] as const).map((entry) => <button type="button" className={subcollectionVisibility === entry ? "is-selected" : ""} key={entry} onClick={() => setSubcollectionVisibility(entry)} aria-pressed={subcollectionVisibility === entry}>{entry === "inherit" ? "Inherit collection" : visibilityLabel(entry)}</button>)}
                </div>
              </section>
            ) : null}

            {mode === "item" ? (
              <section className="create-studio-details create-studio-item-details">
                <div className="create-studio-section-head"><span className="create-studio-eyebrow">PLACE &amp; PERSONALIZE</span><p>Keep the metadata light. Add only what helps the memory land.</p></div>
                <CollectionPicker collections={initialData.collections} collectionId={collectionId} onChange={changeCollection} />
                <label className="create-studio-select-field create-studio-subcollection-picker"><span>Subcollection <small>optional</small></span><select value={subcollectionId} onChange={(event) => setSubcollectionId(event.target.value)} disabled={!selectedCollection?.subcollections.length}><option value="">No shelf yet</option>{selectedCollection?.subcollections.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</select></label>
                <div className="create-studio-detail-grid">
                  <label><span>Brand</span><input value={brand} onChange={(event) => setBrand(event.target.value)} maxLength={100} placeholder="Sony" /></label>
                  <label><span>Model</span><input value={model} onChange={(event) => setModel(event.target.value)} maxLength={120} placeholder="DualShock 4" /></label>
                  <label><span>Year</span><input value={year} onChange={(event) => setYear(event.target.value.replace(/\D/g, "").slice(0, 4))} inputMode="numeric" placeholder="2010" /></label>
                  <label><span>Condition</span><input value={condition} onChange={(event) => setCondition(event.target.value)} maxLength={80} placeholder="Loved" /></label>
                </div>
                <div className="create-studio-personal-flags">
                  <label className="create-studio-select-field"><span>Story mark</span><select value={mood} onChange={(event) => setMood(event.target.value as ItemMood)}><option value="neutral">No mark</option><option value="grail">Grail</option><option value="memory">Memory</option><option value="favorite">Favorite</option><option value="regret">Regret</option></select></label>
                  <label className={`create-studio-favorite-toggle ${isFavorite ? "is-selected" : ""}`}><input className="create-studio-visually-hidden" type="checkbox" checked={isFavorite} onChange={(event) => setIsFavorite(event.target.checked)} /><Star size={17} fill={isFavorite ? "currentColor" : "none"} /><span><strong>Favourite</strong><small>Keep this one close</small></span></label>
                </div>
                <section className={`create-studio-public-shelf ${shareToShelf ? "is-public" : ""}`}>
                  <div><span className="create-studio-public-icon"><Send size={17} /></span><span><strong>Share this item publicly</strong><small>A public item is ready to be discovered across Klecto.</small></span></div>
                  <label className="create-studio-switch"><input type="checkbox" checked={shareToShelf} onChange={(event) => { const nextValue = event.target.checked; setShareToShelf(nextValue); if (nextValue) setItemVisibility("public"); }} /><span aria-hidden="true" /></label>
                </section>
                {!shareToShelf ? <AudienceSelector value={itemVisibility} onChange={(next) => { setItemVisibility(next); if (next === "public") setShareToShelf(true); }} /> : null}
              </section>
            ) : null}

            {error ? <p className="create-studio-error" role="alert">{error}</p> : null}

            <footer className="create-studio-composer-footer">
              <div className="create-studio-save-note"><Sparkles size={15} /><span>{signedIn ? "Saved into your live Klecto catalog" : "Sign in when you are ready to save"}</span></div>
              <button type="submit" className="create-studio-publish-button" disabled={pending || !canCreate}>
                {pending ? "Adding it…" : signedIn ? mode === "item" && shareToShelf ? "Share item" : `Create ${modeCopy[mode].label.toLowerCase()}` : "Sign in to create"}
                <ChevronRight size={18} />
              </button>
            </footer>
          </form>

          <aside className="create-studio-preview" aria-label="Your creation preview">
            <div className="create-studio-preview-head"><span className="create-studio-eyebrow">LIVE PREVIEW</span><span>{mode === "item" && shareToShelf ? "PUBLIC" : "DRAFT"}</span></div>
            {mode === "item" ? <ItemPreview title={title} description={description} photo={photos[0]?.previewUrl} selectedCollection={selectedCollection?.name} selectedSubcollection={selectedSubcollection?.name} mood={mood} isFavorite={isFavorite} /> : null}
            {mode === "collection" ? <CollectionPreview title={title} description={description} visibility={collectionVisibility} templateName={initialData.templates.find((template) => template.id === templateId)?.name} /> : null}
            {mode === "subcollection" ? <SubcollectionPreview title={title} description={description} collectionName={selectedCollection?.name} kind={subcollectionKind} /> : null}
            <div className="create-studio-preview-note"><Check size={15} /> No separate post needed. Your {mode} lives with the collection, and public entries are ready to be discovered.</div>
          </aside>
        </div>
      </section>
    </main>
  );
}

function CollectionPicker({
  collections,
  collectionId,
  onChange,
}: {
  collections: CatalogDashboardDTO["collections"];
  collectionId: string;
  onChange: (collectionId: string) => void;
}) {
  return (
    <label className="create-studio-select-field create-studio-collection-picker">
      <span>Collection</span>
      <select value={collectionId} onChange={(event) => onChange(event.target.value)}>
        <option value="">Choose a collection</option>
        {collections.map((collection) => <option key={collection.id} value={collection.id}>{collection.name}</option>)}
      </select>
      {!collections.length ? <small className="create-studio-empty-picker">No collection yet. Create one first, then come back for a shelf or item.</small> : null}
    </label>
  );
}

function AudienceSelector({ value, onChange, compact = false }: { value: Visibility; onChange: (value: Visibility) => void; compact?: boolean }) {
  return (
    <div className={`create-studio-audience ${compact ? "is-compact" : ""}`}>
      <span>Who can see it</span>
      <div>
        {(["public", "followers", "private"] as Visibility[]).map((entry) => <button type="button" key={entry} className={value === entry ? "is-selected" : ""} onClick={() => onChange(entry)} aria-pressed={value === entry}>{visibilityIcon(entry)} {visibilityLabel(entry)}</button>)}
      </div>
    </div>
  );
}

function ItemPreview({
  title,
  description,
  photo,
  selectedCollection,
  selectedSubcollection,
  mood,
  isFavorite,
}: {
  title: string;
  description: string;
  photo?: string;
  selectedCollection?: string;
  selectedSubcollection?: string;
  mood: ItemMood;
  isFavorite: boolean;
}) {
  return (
    <article className="create-studio-preview-card create-studio-item-preview">
      <div className="create-studio-preview-media">{photo ? <img src={photo} alt="" /> : <ImagePlus size={30} />} {isFavorite ? <span><Star size={14} fill="currentColor" /> Favourite</span> : null}</div>
      <div className="create-studio-preview-copy"><small>{mood === "neutral" ? "ITEM" : mood}</small><h2>{title || "Your item title"}</h2><p>{description || "A few words will turn an object into a story."}</p><footer>{selectedCollection || "Choose a collection"}{selectedSubcollection ? ` · ${selectedSubcollection}` : ""}</footer></div>
    </article>
  );
}

function CollectionPreview({ title, description, visibility, templateName }: { title: string; description: string; visibility: Visibility; templateName?: string }) {
  return <article className="create-studio-preview-card create-studio-collection-preview"><div><Layers3 size={31} /><span>{templateName || "CUSTOM COLLECTION"}</span></div><h2>{title || "Your collection title"}</h2><p>{description || "The things that make up a world, gathered in one place."}</p><footer>{visibilityIcon(visibility)} {visibilityLabel(visibility)}</footer></article>;
}

function SubcollectionPreview({ title, description, collectionName, kind }: { title: string; description: string; collectionName?: string; kind: SubcollectionKind }) {
  return <article className="create-studio-preview-card create-studio-subcollection-preview"><div><Plus size={30} /><span>{kind} SHELF</span></div><h2>{title || "Your shelf title"}</h2><p>{description || "A smaller chapter inside the collection."}</p><footer>{collectionName || "Choose a collection"}</footer></article>;
}
