# Klecto delivery plan

## Phase 0 — Product and technical foundation (complete)

- Responsive premium visual system and primary navigation.
- Interactive demo for feed, filters, reactions, comments, collections, matching, profile, inbox, and creation.
- Live Supabase schema, RLS, Storage buckets, templates, auth clients, generated database types.
- Product specification, architecture, and delivery backlog.

Acceptance: production build passes; every public table has RLS; advisors show no security warnings.

## Phase 1 — Catalog vertical slice

- Sign-up, confirmation, onboarding, profile editor, avatar/banner upload.
- Create/edit/delete collection and subcollection.
- Multi-image item upload, ordering, metadata, moods, privacy inheritance.
- Public collector profile and collection detail routes.

Acceptance: a new user can sign up and publish a public or private collection with at least three items from a phone.

## Phase 2 — Social distribution

- Following and For You server feeds with cursor pagination.
- Post composer, wishlist quote-post flow, likes, private saves, share links.
- Nested comments with edit/delete/reply/report.
- Notifications and public/private profile tabs.

Acceptance: two accounts can follow, post, wishlist, comment, reply, save, and block with RLS verified for every transition.

## Phase 3 — Matching and messaging

- Normalized tag extraction and similarity candidate jobs.
- Match explanations and profile comparison.
- Direct/group creation, roles, membership, realtime messages, edit/delete/reply/reactions, shared catalog cards.
- Presence, typing state, unread markers, mute, and block handling.

Acceptance: only active members can read a conversation; blocked users cannot start a direct chat or appear in matches.

## Phase 4 — Calls, moderation, and launch readiness

- WebRTC 1:1 calls with TURN; SFU integration for group video.
- Call invitations, ringing, missed/declined history, device selection, reconnect.
- Moderation queue, media scanning, rate limits, abuse controls, account export/deletion.
- End-to-end tests, observability, backups, analytics, performance budgets, and accessibility audit.

Acceptance: verified call authorization, tested network fallback, moderation response path, and launch checklist complete.
