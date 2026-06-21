---
name: musicoteca exhibit enrichment (language + wikipedia)
description: How the musicoteca exhibit route detects lyric language and matches Wikipedia pages, and why it's built the way it is.
---

# Language detection is intentionally dependency-free

The exhibit route (`app/api/exhibit/[trackId]/route.ts`) ships its own `detectLanguage()`
(Unicode script ranges for non-Latin + Latin stopword scoring for en/es/fr/it/de/pt).

**Why:** `pnpm --filter @workspace/musicoteca add franc-min` fails in this environment
(exit -1, no output) — do not retry it. A hand-rolled detector avoids the dependency.

**How to apply:** Low-confidence Latin text (fewer than 2 stopword hits across all
languages) deliberately defaults to `"en"` to avoid cross-language false positives
("que" is shared by es/fr/pt). Full song lyrics easily clear that bar, so real
non-English songs still detect correctly. Don't lower the threshold to 1.

# Wikipedia matching MUST validate relevance, not just keyword-in-title

Picking "first search result whose title contains a song/album word" returns wrong
pages (e.g. a German TV show "Sing meinen Song" for a song query, or an electrical
"corriente alterna" page for an artist query).

**Why:** Wikipedia search is fuzzy; title-token matching alone is far too permissive.

**How to apply:** After fetching each candidate's REST summary, reject it unless it
validates. Song/album stage: `mentionsArtist(extract) || (titleMatch && hasMusicWord)`.
Artist stage (strictest, since names are often common words): require BOTH name match
AND a music word — `nameMatch && hasMusicWord`. Always drop disambiguation pages via
the summary API's `type === "disambiguation"` field (more robust than phrase matching).
Returning no wiki ("none") is better than returning a confidently-wrong page.

# Caveat: search result quality is out of scope

Musixmatch's top search result is frequently a karaoke/cover/tribute with a *different*
artist (Pavarotti, "Various Artists", etc.). When debugging "wrong wiki page", first
confirm the track's actual title/artist before suspecting the matcher.
