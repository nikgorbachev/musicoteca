---
name: Next.js artifact in the pnpm monorepo
description: How to run a Next.js app as an artifact when the user wants Next.js instead of the react-vite scaffold
---

# Next.js as an artifact

The monorepo has no Next.js artifact template. To honor an explicit Next.js request:

1. `createArtifact({ artifactType: "react-vite", ... })` to get a registered artifact, an allocated `localPort`, a managed workflow, and proxy routing.
2. Delete the Vite scaffold files and write a Next.js app in the same directory.
3. Edit `artifact.toml` via `verifyAndReplaceArtifactToml` — set development `run` to the Next dev command, and replace `serve = "static"` production with `[services.production.build]`/`[services.production.run]` (Next needs a Node server, not static hosting).

**Why:** going through `createArtifact` is the only way to get the artifact registered + port-allocated + proxy-routed; converting it afterward is far cheaper than hand-wiring all that.

**How to apply:**
- `verifyAndReplaceArtifactToml` rejects any change to the `[[integratedSkills]]` block — keep it verbatim in the temp toml.
- Bind Next to the injected `PORT` (`next dev -p $PORT -H 0.0.0.0`).
- The pnpm catalog pins React 19; Next 14 needs React 18 — pin React/types explicitly, not `catalog:`.

# Proxy path ownership (`/api` collision)

The reverse proxy routes by the `paths` in each artifact's `artifact.toml`, most-specific-first. The default api-server artifact claims `/api`, so a Next.js app at `/` will NOT receive `/api/*` requests — they go to api-server and 502 if it's not running.

**Why:** a more-specific path claim from another artifact overrides a catch-all `/`.

**How to apply:** if a self-contained app needs to own `/api/*`, free that path — deleting the api-server artifact directory removes it from the registry (there is no `removeArtifact` callback; directory deletion works and emits a "Removed artifact" update). Then `/api/*` falls through to the `/` catch-all.
