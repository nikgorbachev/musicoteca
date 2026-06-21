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

# Language resolution priority (effLang chain)

`paramLang (track_language) || detectedFromLyrics || isrcLang || cyrillic-title→ru || "en"`.

**Why:** `track_language` is rarely populated by Musixmatch. Lyric-based detection is
the most reliable signal when lyrics exist. The ISRC's first two chars are the
registrant's *country* (not language) — a useful proxy only, so it sits BELOW lyric
detection (e.g. "Volare" carries a GB ISRC despite Italian lyrics). Instrumental/
unknown falls back to English to still pull English Wikipedia content.

**How to apply:** ISRC→language map only covers clearly monolingual markets; ambiguous
countries (BE, CH, CA, IN) are intentionally unmapped so they hit the English default.

# Russian wiki matching must be declension-tolerant (stem, not exact substring)

The relevance validators (`mentionsArtist`, `hasMusicWord`) once did exact substring
matching, which silently rejected CORRECT Russian pages: "Пугачёва" never matches the
genitive "Пугачёвой", and the music word "песня" never matches "песен".

**Why:** Russian inflects nouns by case (and has fleeting vowels), so the form in a
Wikipedia extract rarely equals the nominative form from Musixmatch. Exact matching =
false rejections, which is why "the previous (looser) version felt better for Russian".

**How to apply:** `mentionsArtist` stems Cyrillic artist tokens (len≥6 → drop last 2
chars); Latin tokens stay EXACT to avoid over-matching (e.g. "queen"→"quee"). `musicWords`
includes Russian stems/inflected forms (песн/песен/групп/исполн/выпущен/записан…). If
adding more languages with rich morphology, prefer stems over nominative forms.

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

# LLM provider: now Mistral (mistral-small-2503), not Groq

The exhibit placards (`/api/context`) and lyric translation (`/api/translate`) call
**Mistral** via `lib/mistral.ts` (`mistral-small-2503`, JSON mode). Groq was dropped —
its `llama-3.1-8b-instant` output quality (fragmented, lower-fidelity prose) was too low
for the museum-placard tone, and the per-model fallback dance wasn't worth it.

**Why:** quality > token-cap cleverness for this product. The Groq notes below are kept
as general reference only; they no longer describe the live code path.

# Newly added secrets need a workflow restart to reach the running process

Adding a secret (e.g. `MISTRAL_API_KEY`) via the secrets tooling does NOT inject it into
an already-running dev-server/workflow process — the route kept logging "no
MISTRAL_API_KEY" until the `artifacts/<slug>: web` workflow was restarted.

**Why:** env vars are read from the process environment at spawn time.

**How to apply:** after adding/changing any secret an app reads, restart that app's
workflow before testing, or you'll chase phantom "missing key" failures.

# Groq rate limits are per-model — fall back to a second model, not a second account

Groq's free-tier token-per-day caps are enforced **per model**, so a 429 on
`llama-3.3-70b-versatile` does NOT touch `llama-3.1-8b-instant`'s separate (larger)
bucket. `lib/groq.ts` exploits this: each route tries a primary model, then retries the
*other* model on failure. Context defaults to 8b (huge quota, fires every page view),
translate defaults to 70b (better quality, on-demand).

**Why:** spinning up a new Groq account to dodge the cap violates ToS and is fragile;
a second model is a free, legitimate independent quota pool.

**How to apply:** when one model is capped, the swap unlocks testing immediately — no
account juggling, no waiting for the ~24h reset.

# The 8b model returns fragmented/array JSON — normalize to a string

`llama-3.1-8b-instant` under `response_format: json_object` often returns string fields
(innerWorld/theMoment/translation) as **arrays of paragraphs — sometimes split
mid-sentence at commas**, where 70b returns a clean string. Two defenses are needed
together: (1) the prompt must explicitly demand a single string with `\n\n` between
paragraphs, never an array; (2) the route must still coerce array→string as a safety net
(join paragraphs with `\n\n`). Without the prompt rule, the coercion alone yields broken
prose with newlines mid-sentence.

# The context API (Groq) degrades silently to empty panels on rate limit

`app/api/context/route.ts` returns `{innerWorld:"", theMoment:""}` on ANY failure
(missing key, non-2xx, parse error). Groq's free tier enforces a daily tokens-per-day
cap (100k TPD on `llama-3.3-70b-versatile`); once hit it returns **429** and the route
silently yields blank Inner World / The Moment panels — fast (~130ms), looks like a code
bug but isn't.

**Why:** silent degradation keeps the exhibit page stable when the LLM is unavailable;
the page-level defaults feed straight into the markdown renderer without crashing.

**How to apply:** when those panels are unexpectedly blank, refresh workflow logs and
check for a Groq 429 TPD message BEFORE suspecting the code. The cap resets daily
(partial windows reset in minutes). To debug which branch fired, temporarily log in the
route's failure paths, then remove the logs.

# Caveat: search result quality is out of scope

Musixmatch's top search result is frequently a karaoke/cover/tribute with a *different*
artist (Pavarotti, "Various Artists", etc.). When debugging "wrong wiki page", first
confirm the track's actual title/artist before suspecting the matcher.
