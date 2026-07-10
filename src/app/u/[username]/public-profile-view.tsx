/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { ArrowLeft, Check, ImagePlus, Layers3, LockKeyhole, Settings, ShieldCheck, Sparkles, Star, UserRound } from "lucide-react";
import type { PublicProfileDTO, PublicProfileItemDTO } from "@/lib/catalog-types";
import styles from "./public-profile.module.css";

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function numberLabel(value: number) {
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

function itemMeta(item: PublicProfileItemDTO) {
  return [item.brand, item.model, item.year, item.condition].filter(Boolean).join(" · ");
}

function ItemCard({ item }: { item: PublicProfileItemDTO }) {
  const imageUrl = item.imageUrls[0];

  return (
    <article className={styles.itemCard}>
      <div className={styles.itemImage}>
        {imageUrl ? <img src={imageUrl} alt={item.title} /> : <Layers3 aria-hidden="true" />}
        {item.isFavorite ? <span className={styles.favorite}><Star size={13} fill="currentColor" /> Favourite</span> : null}
        {item.imageCount > 1 ? <span className={styles.imageCount}><ImagePlus size={12} /> {item.imageCount}</span> : null}
      </div>
      <div className={styles.itemCopy}>
        <span className={styles.itemMood}>{item.mood}</span>
        <h3>{item.title}</h3>
        <p>{itemMeta(item) || item.description || "Catalogued object"}</p>
      </div>
    </article>
  );
}

export function PublicProfileUnavailable() {
  return (
    <main className={styles.unavailablePage}>
      <Link className={styles.backLink} href="/"><ArrowLeft size={16} /> Back to Klecto</Link>
      <section className={styles.unavailableCard}>
        <span className={styles.unavailableIcon}><LockKeyhole size={25} /></span>
        <span className={styles.kicker}>PRIVATE OR UNAVAILABLE</span>
        <h1>This shelf isn’t open right now.</h1>
        <p>It may be private, unavailable to your account, or no longer exist. Klecto keeps those cases intentionally indistinguishable.</p>
        <Link href="/" className={styles.darkButton}>Explore Klecto <ArrowLeft size={15} /></Link>
      </section>
    </main>
  );
}

export function PublicProfileView({ profile }: { profile: PublicProfileDTO }) {
  const { viewer, stats, similarity } = profile;
  const hasProfileMedia = Boolean(profile.profile.avatarUrl || profile.profile.bannerUrl);

  return (
    <main className={styles.page}>
      <header className={styles.topbar}>
        <Link className={styles.backLink} href="/"><ArrowLeft size={16} /> Back to Klecto</Link>
        <Link className={styles.wordmark} href="/" aria-label="Klecto home"><span aria-hidden="true">K</span> klecto</Link>
        {viewer.isOwner ? (
          <Link className={styles.editLink} href="/settings/profile"><Settings size={15} /> Edit profile</Link>
        ) : (
          <Link className={styles.exploreLink} href="/">Explore</Link>
        )}
      </header>

      <section className={styles.profileFrame}>
        <div
          className={`${styles.banner} ${profile.profile.bannerUrl ? styles.hasBanner : ""}`}
          style={profile.profile.bannerUrl ? { backgroundImage: `url(${profile.profile.bannerUrl})` } : undefined}
        >
          <span className={styles.bannerGrain} aria-hidden="true" />
          <span className={styles.bannerOrbit} aria-hidden="true" />
          <span className={styles.bannerCaption}>{hasProfileMedia ? "Collector’s archive" : "A personal shelf, in progress"}</span>
        </div>

        <div className={styles.profileBody}>
          <div className={styles.avatar}>
            {profile.profile.avatarUrl ? <img src={profile.profile.avatarUrl} alt={`${profile.profile.displayName}'s avatar`} /> : <span>{initials(profile.profile.displayName)}</span>}
          </div>
          <div className={styles.identityRow}>
            <div className={styles.identity}>
              <span className={styles.kicker}>COLLECTOR PROFILE</span>
              <h1>{profile.profile.displayName}{profile.profile.isVerified ? <ShieldCheck className={styles.verified} size={20} aria-label="Verified collector" /> : null}</h1>
              <p className={styles.handle}>@{profile.profile.username}</p>
            </div>
            {viewer.isFollowing ? <span className={styles.followState}><Check size={14} /> Following</span> : null}
          </div>

          {profile.profile.bio ? <p className={styles.bio}>{profile.profile.bio}</p> : <p className={styles.bioMuted}>This collector is still writing the story behind their shelf.</p>}

          <div className={styles.profileFacts}>
            {profile.profile.location ? <span>{profile.profile.location}</span> : null}
            {profile.profile.website ? <a href={profile.profile.website} target="_blank" rel="noreferrer">Visit website ↗</a> : null}
          </div>

          <div className={styles.stats} aria-label="Collector statistics">
            <span><strong>{numberLabel(stats.followersCount)}</strong> followers</span>
            <span><strong>{numberLabel(stats.followingCount)}</strong> following</span>
            <span><strong>{numberLabel(stats.collectionCount)}</strong> shelves</span>
            <span><strong>{numberLabel(stats.itemCount)}</strong> objects</span>
          </div>
        </div>
      </section>

      {similarity ? (
        <section className={styles.similarity}>
          <div className={styles.similarityRing} style={{ "--similarity": `${similarity.percentage}%` } as React.CSSProperties}><span>{Math.round(similarity.percentage)}%</span></div>
          <div>
            <span className={styles.kicker}>COLLECTION OVERLAP</span>
            <h2>Your shelves have a thread in common.</h2>
            <p>{similarity.sharedCount > 0 ? `${similarity.sharedCount} shared catalog tags help shape this match.` : "No shared catalog tags yet — explore their shelf to find a common thread."}</p>
            {similarity.sharedTags.length ? <div className={styles.tagRow}>{similarity.sharedTags.map((tag) => <span key={tag}>#{tag}</span>)}</div> : null}
          </div>
          <Sparkles className={styles.similaritySparkle} size={25} aria-hidden="true" />
        </section>
      ) : null}

      <section className={styles.collectionSection}>
        <div className={styles.sectionHead}>
          <div><span className={styles.kicker}>PUBLIC SHELVES</span><h2>What {viewer.isOwner ? "you’re" : `${profile.profile.displayName.split(" ")[0]} is`} collecting</h2></div>
          <span>{stats.collectionCount} {stats.collectionCount === 1 ? "collection" : "collections"}</span>
        </div>

        {profile.collections.length ? (
          <div className={styles.collectionList}>
            {profile.collections.map((collection) => (
              <article className={styles.collectionCard} id={`collection-${collection.slug}`} key={collection.id}>
                <div className={styles.collectionCover}>
                  {collection.coverUrl ? <img src={collection.coverUrl} alt="" /> : <span>{collection.name.slice(0, 2).toUpperCase()}</span>}
                  {collection.isFeatured ? <i><Star size={14} fill="currentColor" /> Featured</i> : null}
                  <b>{collection.itemCount} {collection.itemCount === 1 ? "object" : "objects"}</b>
                </div>
                <div className={styles.collectionHeader}>
                  <div><span className={styles.kicker}>{collection.subcollectionCount ? `${collection.subcollectionCount} sub-shelves` : "OPEN SHELF"}</span><h3>{collection.name}</h3></div>
                  <span>Updated {new Intl.DateTimeFormat("en", { month: "short", year: "numeric" }).format(new Date(collection.updatedAt))}</span>
                </div>
                <p className={styles.collectionDescription}>{collection.description || "A carefully kept part of this collector’s story."}</p>
                {collection.items.length ? <div className={styles.itemGrid}>{collection.items.map((item) => <ItemCard item={item} key={item.id} />)}</div> : <div className={styles.emptyCollection}><Layers3 size={20} /><span>This shelf is ready for its first object.</span></div>}
              </article>
            ))}
          </div>
        ) : (
          <div className={styles.emptyProfile}><UserRound size={26} /><strong>No visible shelves yet.</strong><p>When this collector shares an item or opens a collection, it will appear here.</p></div>
        )}
      </section>
    </main>
  );
}
