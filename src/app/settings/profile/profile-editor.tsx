/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, Camera, Check, Eye, ImagePlus, LockKeyhole, Save, ShieldCheck } from "lucide-react";
import { updateProfileAction } from "@/app/actions/catalog";
import { createClient } from "@/lib/supabase/client";
import type { ViewerDTO, Visibility } from "@/lib/catalog-types";

export function ProfileEditor({ viewer }: { viewer: ViewerDTO }) {
  const [displayName, setDisplayName] = useState(viewer.displayName);
  const [username, setUsername] = useState(viewer.username);
  const [bio, setBio] = useState(viewer.bio ?? "");
  const [location, setLocation] = useState(viewer.location ?? "");
  const [website, setWebsite] = useState(viewer.website ?? "");
  const [avatarPath, setAvatarPath] = useState(viewer.avatarPath);
  const [avatarUrl, setAvatarUrl] = useState(viewer.avatarUrl);
  const [bannerPath, setBannerPath] = useState(viewer.bannerPath);
  const [bannerUrl, setBannerUrl] = useState(viewer.bannerUrl);
  const [accountVisibility, setAccountVisibility] = useState<Visibility>(viewer.accountVisibility);
  const [allowMessagesFrom, setAllowMessagesFrom] = useState(viewer.allowMessagesFrom);
  const [showSimilarity, setShowSimilarity] = useState(viewer.showSimilarity);
  const [uploading, setUploading] = useState<"avatar" | "banner" | null>(null);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const upload = async (file: File, kind: "avatar" | "banner") => {
    setMessage(null);
    if (!new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]).has(file.type) || file.size > 5 * 1024 * 1024) {
      setMessage({ type: "error", text: "Choose a JPG, PNG, WEBP, or AVIF image under 5 MB." });
      return;
    }
    setUploading(kind);
    const extension = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
    const path = `${viewer.id}/${kind}/${crypto.randomUUID()}.${extension}`;
    const supabase = createClient();
    const { error } = await supabase.storage
      .from("profile-media")
      .upload(path, file, { upsert: false, cacheControl: "31536000", contentType: file.type });
    if (error) {
      setMessage({ type: "error", text: "The image could not be uploaded. Please try again." });
      setUploading(null);
      return;
    }
    const url = supabase.storage.from("profile-media").getPublicUrl(path).data.publicUrl;
    if (kind === "avatar") {
      setAvatarPath(path);
      setAvatarUrl(url);
    } else {
      setBannerPath(path);
      setBannerUrl(url);
    }
    setUploading(null);
  };

  const save = () => {
    setMessage(null);
    startTransition(async () => {
      const result = await updateProfileAction({
        username,
        displayName,
        bio: bio.trim() || null,
        location: location.trim() || null,
        website: website.trim() || null,
        avatarPath,
        bannerPath,
        accountVisibility,
        allowMessagesFrom,
        showSimilarity,
      });
      if (!result.ok) {
        setMessage({ type: "error", text: result.error ?? "Could not save your profile." });
        return;
      }

      const stalePaths = [
        viewer.avatarPath && viewer.avatarPath !== avatarPath ? viewer.avatarPath : null,
        viewer.bannerPath && viewer.bannerPath !== bannerPath ? viewer.bannerPath : null,
      ].filter((path): path is string => Boolean(path));
      if (stalePaths.length) await createClient().storage.from("profile-media").remove(stalePaths);
      setMessage({ type: "success", text: "Profile saved to Klecto." });
    });
  };

  return (
    <main className="settings-page">
      <header className="settings-topbar"><Link href="/"><ArrowLeft size={17} /> Back to Klecto</Link><span className="eyebrow">PROFILE & PRIVACY</span><form action="/auth/signout" method="post"><button>Sign out</button></form></header>
      <section className="settings-shell">
        <div className="settings-intro"><span className="settings-icon"><ShieldCheck size={23} /></span><div><span className="eyebrow">YOUR PUBLIC SHELF</span><h1>Make it unmistakably yours.</h1><p>Your identity, profile media, privacy, and who can begin a conversation with you.</p></div></div>

        <section className="profile-media-editor">
          <div className="editable-banner" style={bannerUrl ? { backgroundImage: `url(${bannerUrl})` } : undefined}>
            <label><ImagePlus size={17} />{uploading === "banner" ? "Uploading…" : "Change banner"}<input type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file, "banner"); }} /></label>
          </div>
          <div className="editable-avatar"><img src={avatarUrl ?? "/favicon.ico"} alt="Profile preview" /><label><Camera size={16} /><input type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file, "avatar"); }} /></label></div>
          <span className="media-guidance">Profile media is public. Location metadata is not displayed.</span>
        </section>

        <section className="settings-card">
          <div className="settings-card-title"><span>01</span><div><h2>Collector identity</h2><p>The name and story people see beside every object.</p></div></div>
          <div className="settings-form-grid"><label><span>Display name</span><input value={displayName} onChange={(event) => setDisplayName(event.target.value)} maxLength={60} /></label><label><span>Username</span><div className="prefix-input"><i>@</i><input value={username} onChange={(event) => setUsername(event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 24))} /></div></label><label className="wide"><span>Bio</span><textarea value={bio} onChange={(event) => setBio(event.target.value)} maxLength={240} /><small>{bio.length}/240</small></label><label><span>Location</span><input value={location} onChange={(event) => setLocation(event.target.value)} maxLength={100} placeholder="Mumbai, India" /></label><label><span>Website</span><input value={website} onChange={(event) => setWebsite(event.target.value)} type="url" placeholder="https://" /></label></div>
        </section>

        <section className="settings-card">
          <div className="settings-card-title"><span>02</span><div><h2>Privacy and contact</h2><p>Control the audience without hiding the personality.</p></div></div>
          <div className="privacy-options"><label><span><Eye size={18} /><i><strong>Account visibility</strong><small>Who can see your profile and public catalog.</small></i></span><select value={accountVisibility} onChange={(event) => setAccountVisibility(event.target.value as Visibility)}><option value="public">Public</option><option value="followers">Followers</option><option value="private">Private</option></select></label><label><span><LockKeyhole size={18} /><i><strong>Messages from</strong><small>Limit who can start a direct conversation.</small></i></span><select value={allowMessagesFrom} onChange={(event) => setAllowMessagesFrom(event.target.value as ViewerDTO["allowMessagesFrom"])}><option value="everyone">Everyone</option><option value="followers">Followers</option><option value="matches">Matches</option><option value="nobody">Nobody</option></select></label><label><span><ShieldCheck size={18} /><i><strong>Show collection similarity</strong><small>Let visitors understand what you share.</small></i></span><button className={`toggle-switch ${showSimilarity ? "active" : ""}`} onClick={() => setShowSimilarity(!showSimilarity)}><i /></button></label></div>
        </section>

        {message && <div className={`settings-message ${message.type}`}>{message.type === "success" && <Check size={17} />}{message.text}</div>}
        <div className="settings-save"><span>Changes are protected by your authenticated Supabase session.</span><button className="primary-button" disabled={pending || Boolean(uploading) || displayName.trim().length === 0 || username.length < 3} onClick={save}><Save size={17} />{pending ? "Saving…" : "Save profile"}</button></div>
      </section>
    </main>
  );
}
