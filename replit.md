# MUSICOTECA

A quiet, editorial archive for songs worth keeping — a spaced-letterpress search experience built with Next.js.

## Run & Operate

- `pnpm --filter @workspace/musicoteca run dev` — run the Next.js app (reads `PORT`)
- `pnpm --filter @workspace/musicoteca run build` — production build
- `pnpm --filter @workspace/musicoteca run start` — run the production server
- `pnpm --filter @workspace/musicoteca run typecheck` — typecheck the app

## Stack

- Next.js 14 (App Router) + React 18 + TypeScript
- Tailwind CSS 3 (flat, editorial design system; no gradients, square corners)
- Fonts: Playfair Display (serif headings) + Inter (body) via `next/font/google`
- No database, no auth, no persistence — all server logic lives in Next.js route handlers

## Where things live

- `artifacts/musicoteca/app/` — App Router pages and route handlers
  - `app/page.tsx` — home: letterpress heading + centered search bar
  - `app/exhibit/[trackId]/page.tsx` — exhibit page (stubbed empty)
  - `app/api/search/route.ts` — `GET /api/search?q=` (returns `{ results: [] }` placeholder)
- `artifacts/musicoteca/components/` — client components (theme provider, theme toggle, search bar)
- `artifacts/musicoteca/.env.example` — env var template (keys read server-side only)

## Architecture decisions

- This is a standalone Next.js artifact at the root path `/`. The default monorepo Express api-server was removed so Next.js route handlers own `/api/*`. The unused `lib/api-*` and `lib/db` packages remain but are not wired in.
- Theme (light/dark) is stored in `localStorage` under `musicoteca-theme`; an inline `<script>` in the root layout applies it before paint to avoid a flash.
- API keys (Musixmatch, Deezer, ElevenLabs, OpenAI/Gemini) are only ever read inside `app/api/*` route handlers — never exposed to the client.

## Product

- Home page with a minimal, centered search experience.
- Search calls `GET /api/search?q=...` server-side; currently a placeholder returning no results.
- Exhibit route reserved for the per-track experience (not yet built).

## User preferences

- Wants Next.js 14 (App Router, TypeScript) — not the default React+Vite scaffold.
- Flat, editorial aesthetic: no gradients, no pervasive rounded corners.

## Gotchas

- The Replit proxy routes by the `paths` in each artifact's `artifact.toml`. A path claimed by another artifact (e.g. the old api-server on `/api`) overrides this app's catch-all `/`. Keep `/api/*` free so Next.js route handlers are reachable.
- The pnpm catalog pins React 19; this app pins React 18 explicitly (Next 14) — do not switch its React deps to `catalog:`.

## Pointers

- See the `pnpm-workspace` skill for workspace structure and package details
