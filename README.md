# Klecto

Klecto is a social home for collectors: catalogue the objects you care about, tell the stories attached to them, and meet people through collection similarity rather than a generic interest graph.

This repository contains:

- a responsive, mobile-first Next.js product prototype with interactive feed, collection, matching, profile, chat, comments, wishlist, and create flows;
- Supabase SSR authentication utilities and email/password account creation;
- a production-oriented Postgres schema with RLS for public, followers-only, and private content;
- data models for one-to-one/group chat, replies, reactions, calls, reporting, blocking, and private saves;
- a generated TypeScript database contract.

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`. Authentication is available at `/login`.

## Commands

```bash
npm run lint
npm run build
```

## Supabase

The live Klecto project is connected through a publishable browser key. The full schema lives in [`supabase/migrations/20260710083108_initial_klecto.sql`](supabase/migrations/20260710083108_initial_klecto.sql). Every exposed table has RLS enabled. Never add a service-role or secret key to a `NEXT_PUBLIC_` environment variable.

For a new environment, link the Supabase CLI and apply migrations through the normal deployment workflow. After any schema change, regenerate [`src/types/database.ts`](src/types/database.ts) and run both Supabase security and performance advisors.

## Product documentation

- [`docs/PRODUCT_SPEC.md`](docs/PRODUCT_SPEC.md) — product model, information architecture, interaction rules, privacy, and success metrics.
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — application, database, realtime, media, matching, and deployment decisions.
- [`docs/DELIVERY_PLAN.md`](docs/DELIVERY_PLAN.md) — release phases and acceptance criteria.

## Current boundary

The frontend uses curated demo content so the experience is reviewable before user accounts exist. The live backend, auth utilities, and database contract are ready; the next delivery phase replaces demo adapters with server queries/actions, object uploads, realtime subscriptions, and WebRTC/SFU media sessions.
