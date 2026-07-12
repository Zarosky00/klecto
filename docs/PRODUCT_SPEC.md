# Klecto product specification

## Product promise

Klecto helps people keep a meaningful, visual record of what they collect and find people whose taste overlaps with theirs. The primary object is the collection—not the post. Posts distribute collection stories; they do not own the underlying item.

## Product principles

1. **Objects first, metrics second.** Item imagery and provenance lead; engagement counts stay visually quiet.
2. **Every object can carry a story.** Title and photos are required; memory, acquisition, condition, and custom attributes remain optional.
3. **Similarity must be legible.** A match percentage is always paired with the shared tags, brands, categories, or items that produced it.
4. **Privacy inherits safely.** Child content inherits the nearest parent visibility unless its explicit override is more restrictive.
5. **Wishlist means intent.** A wishlist action creates a repost-style post pointing to the original item, subcollection, or collection, with an optional quote.
6. **Private activity stays private.** A user’s Likes and Saved profile tabs are visible only to that account owner.

## Core information architecture

### Global navigation

- **Home:** For You and Following feeds, with Everything, Collections, Items, and Wishlists filters.
- **Collections:** the owner’s catalog; collection → subcollection → item.
- **Create:** item, collection, or post entry point.
- **Matches:** ranked people, similarity breakdown, and shared shelf.
- **Inbox:** direct and group conversations, shared objects, audio/video call entry points.
- **Profile:** Posts, Collections, Replies, Likes (private), Saved (private).

### Catalog hierarchy

```text
Profile
└── Collection (custom or template-backed, e.g. Sneakers)
    ├── Subcollection (brand, series, era, or custom, e.g. Nike)
    │   └── Item
    └── Item (subcollection is optional)
```

Prebuilt collection templates provide suggested fields without constraining the catalog. Users can always create a custom collection, custom subcollection, or custom item attributes.

## Content types

### Item

Required: title, owner, collection, at least one image at publish time. Optional: description, subcollection, brand, model, year, condition, acquisition date/place, price/currency, custom attributes, tags, and mood.

Moods are **Grail**, **Memory**, **Favorite**, **Regret**, and neutral. A favorite is also stored as a dedicated boolean so it can be filtered independently from narrative mood.

### Post

A post may be standalone or point to one item, subcollection, or collection. It supports editing, soft deletion, replies, media, audience visibility, likes, private saves, comments, reporting, and sharing.

### Wishlist post

Wishlist is a post kind referencing exactly one catalog target. It may include a quote ("I’m getting this next year") or be published without commentary. Removing the wishlist post does not mutate the source catalog object.

### Comments

Comments use a parent pointer and bounded depth for Reddit-style trees. The UI collapses deep branches and loads them on demand. Authors can edit and soft-delete; a deleted parent remains as a tombstone when it has replies.

## Matching model

The first version uses an explainable Jaccard similarity score over normalized collection tags:

```text
score = shared distinct tags / all distinct tags across both users × 100
```

Tags are derived from explicit item tags and later enriched with template, brand, series, and era tokens. The score is recalculated on demand for profile comparison and cached for discovery ranking in a later phase. Blocks remove both users from matching immediately.

Future ranking can weight rare shared tags, recent catalog activity, location radius (opt-in only), and interaction quality. Follower count must not increase similarity.

## Privacy and trust

### Visibility

- **Public:** visible to anyone not blocked.
- **Followers:** visible to authenticated followers.
- **Private:** visible only to the owner.

Profiles, collections, items, and posts have independent visibility. Items inherit their collection visibility by default. Subcollections inherit their collection. A post referencing an item cannot bypass the item’s effective visibility.

### Blocking

Blocking is bidirectional for reads and discovery: both accounts disappear from feeds, search, matching, and profile reads. Existing shared groups may retain system-level membership records, but messages from a blocked member are hidden for the blocker.

### Safety

Users can report an account, post, comment, or message with a normalized reason and optional details. Reports are private to the reporter and moderation roles. Rate limits, spam scoring, media scanning, and moderator tooling are required before public launch.

## Calls

Call records, participants, status, and conversation membership are persisted in Supabase. One-to-one calls may use WebRTC with Supabase Realtime for signaling. Production group video should use an SFU media service; Supabase stores authorization and call history but does not relay audio/video streams.

## Accessibility and responsive behavior

- Minimum 44px touch targets for primary mobile controls.
- Keyboard-visible focus rings and logical tab order.
- Reduced-motion support through `prefers-reduced-motion`.
- Meaningful image alt text is part of item publishing.
- Feed and catalog layouts remain usable from 320px through wide desktop.
- Mobile navigation is bottom-anchored; desktop uses a persistent left rail and optional context rail.

## Success metrics

- Activation: first collection and three items created within 24 hours.
- Catalog depth: median items per activated collector.
- Meaningful connection: profile comparison followed by message, follow, or shared item.
- Story quality: percentage of items with description or acquisition memory.
- Healthy engagement: comment reply rate and report rate, not raw time-on-site.
- Retention: collectors returning to add or update an item after 7 and 30 days.
