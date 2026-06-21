import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const WIKI_UA = "Musicoteca/1.0 (https://replit.com; educational project)";

// ---- Language detection ----

const LATIN_STOPWORDS: Record<string, string[]> = {
  en: ["the", "and", "you", "are", "with", "that", "this", "have", "your", "not", "for", "was", "but", "all", "what", "when", "like", "just", "from", "know"],
  es: ["que", "los", "las", "una", "por", "con", "para", "esta", "como", "pero", "más", "mi", "yo", "soy", "está", "eres", "nada", "amor", "corazón", "vida"],
  fr: ["les", "des", "une", "est", "pas", "vous", "dans", "pour", "qui", "avec", "sur", "mais", "mon", "tout", "plus", "moi", "toi", "amour", "rien", "être"],
  it: ["che", "non", "per", "una", "sono", "con", "come", "più", "sei", "questo", "questa", "gli", "nel", "della", "amore", "cuore", "cosa", "anche", "siamo", "mai"],
  de: ["und", "der", "die", "das", "ich", "nicht", "ein", "eine", "mit", "ist", "war", "wir", "dich", "mein", "auch", "wie", "für", "den", "nur", "wenn"],
  pt: ["que", "não", "uma", "com", "por", "para", "mais", "você", "meu", "minha", "está", "são", "como", "mas", "dos", "das", "amor", "coração", "nada", "vida"],
};

function detectLanguage(raw: string): string {
  const text = raw
    .split("\n")
    .filter((l) => !l.includes("***") && !/^\(\d+\)$/.test(l.trim()))
    .join("\n");
  if (text.replace(/\s/g, "").length < 8) return "";

  // Non-Latin scripts (kana checked before Han for Japanese)
  if (/[\u0400-\u04FF]/.test(text)) return "ru";
  if (/[\u0600-\u06FF]/.test(text)) return "ar";
  if (/[\uAC00-\uD7AF]/.test(text)) return "ko";
  if (/[\u3040-\u30FF]/.test(text)) return "ja";
  if (/[\u4E00-\u9FFF]/.test(text)) return "zh";
  if (/[\u0370-\u03FF]/.test(text)) return "el";
  if (/[\u0590-\u05FF]/.test(text)) return "he";
  if (/[\u0E00-\u0E7F]/.test(text)) return "th";
  if (/[\u0900-\u097F]/.test(text)) return "hi";

  // Latin script: stopword scoring
  const words = text.toLowerCase().match(/[a-zà-ÿ']+/g) ?? [];
  if (words.length === 0) return "";
  const counts: Record<string, number> = {};
  const sets: Array<[string, Set<string>]> = [];
  for (const [lang, list] of Object.entries(LATIN_STOPWORDS)) {
    sets.push([lang, new Set(list)]);
    counts[lang] = 0;
  }
  for (const w of words) {
    for (const [lang, s] of sets) if (s.has(w)) counts[lang] += 1;
  }
  if (/ß/.test(text)) counts.de += 3;
  if (/ñ/.test(text)) counts.es += 3;

  let best = "en";
  let bestScore = 0;
  for (const [lang, c] of Object.entries(counts)) {
    if (c > bestScore) {
      bestScore = c;
      best = lang;
    }
  }
  return bestScore < 2 ? "en" : best;
}

// ---- Musixmatch lyrics ----

interface LyricsResponse {
  message?: { body?: { lyrics?: { lyrics_body?: string } } };
}

async function fetchLyrics(
  trackId: string,
  apiKey: string | undefined,
): Promise<string> {
  if (!apiKey) return "";
  const url = new URL("https://api.musixmatch.com/ws/1.1/track.lyrics.get");
  url.searchParams.set("track_id", trackId);
  url.searchParams.set("apikey", apiKey);
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return "";
  const data = (await res.json()) as LyricsResponse;
  return data.message?.body?.lyrics?.lyrics_body ?? "";
}

// ---- Musixmatch analysis ----

interface AnalysisTheme {
  theme?: string;
  quotes?: Array<string | { quote?: string }>;
}

interface AnalysisResponse {
  message?: {
    body?: {
      analysis?: {
        meaning?: { explanation?: string };
        moods?: { main_moods?: Array<string | { mood?: string; name?: string }> };
        themes?: { main_themes?: AnalysisTheme[] };
      };
    };
  };
}

interface AnalysisResult {
  lensExplanation: string;
  moods: string[];
  themes: Array<{ theme: string; quotes: string[] }>;
}

async function fetchAnalysis(
  trackId: string,
  apiKey: string | undefined,
): Promise<AnalysisResult> {
  const empty: AnalysisResult = { lensExplanation: "", moods: [], themes: [] };
  if (!apiKey) return empty;
  const url = new URL(
    "https://api.musixmatch.com/ws/1.1/track.lyrics.analysis.get",
  );
  url.searchParams.set("track_id", trackId);
  url.searchParams.set("apikey", apiKey);
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return empty;
  const data = (await res.json()) as AnalysisResponse;
  const analysis = data.message?.body?.analysis;
  if (!analysis) return empty;

  const moods = (analysis.moods?.main_moods ?? [])
    .map((m) => (typeof m === "string" ? m : m.mood ?? m.name ?? ""))
    .filter(Boolean);

  const themes = (analysis.themes?.main_themes ?? []).map((t) => ({
    theme: t.theme ?? "",
    quotes: (t.quotes ?? [])
      .map((q) => (typeof q === "string" ? q : q.quote ?? ""))
      .filter(Boolean),
  }));

  return {
    lensExplanation: analysis.meaning?.explanation ?? "",
    moods,
    themes,
  };
}

// ---- Wikipedia ----

type WikiSource = "song" | "album" | "artist" | "none";

interface WikiResult {
  wikiExtract: string;
  wikiImage: string | null;
  wikiSource: WikiSource;
}

interface WikiSearchResponse {
  query?: { search?: Array<{ title: string }> };
}

interface WikiSummaryResponse {
  extract?: string;
  thumbnail?: { source?: string };
  type?: string;
}

function wikiSubdomain(language: string, title: string): string {
  const lang = (language || "").toLowerCase().slice(0, 2);
  if (lang) return lang;
  if (/[\u0400-\u04FF]/.test(title)) return "ru";
  return "en";
}

const RU_TRANSLIT: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh",
  з: "z", и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o",
  п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "kh", ц: "ts",
  ч: "ch", ш: "sh", щ: "shch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu",
  я: "ya",
};

function transliterateRu(text: string): string {
  return text
    .split("")
    .map((ch) => {
      const lower = ch.toLowerCase();
      const mapped = RU_TRANSLIT[lower];
      if (mapped === undefined) return ch;
      if (ch === lower || mapped === "") return mapped;
      return mapped.charAt(0).toUpperCase() + mapped.slice(1);
    })
    .join("");
}

async function searchWiki(sub: string, query: string): Promise<string[]> {
  const url = new URL(`https://${sub}.wikipedia.org/w/api.php`);
  url.searchParams.set("action", "query");
  url.searchParams.set("list", "search");
  url.searchParams.set("srsearch", query);
  url.searchParams.set("srnamespace", "0");
  url.searchParams.set("srlimit", "5");
  url.searchParams.set("format", "json");
  const res = await fetch(url, {
    cache: "no-store",
    headers: { "User-Agent": WIKI_UA },
  });
  if (!res.ok) return [];
  const data = (await res.json()) as WikiSearchResponse;
  return (data.query?.search ?? []).map((s) => s.title);
}

async function wikiSummary(
  sub: string,
  title: string,
): Promise<{ extract: string; image: string | null; type: string } | null> {
  const url = `https://${sub}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
    title,
  )}`;
  const res = await fetch(url, {
    cache: "no-store",
    headers: { "User-Agent": WIKI_UA, accept: "application/json" },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as WikiSummaryResponse;
  return {
    extract: data.extract ?? "",
    image: data.thumbnail?.source ?? null,
    type: data.type ?? "standard",
  };
}

async function fetchWikipedia(
  language: string,
  title: string,
  album: string,
  artist: string,
): Promise<WikiResult> {
  const sub = wikiSubdomain(language, title);
  console.log(
    "[wiki] language param:",
    language || "(empty)",
    "| subdomain:",
    sub,
  );

  const norm = (s: string) =>
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\p{L}\p{N} ]/gu, " ")
      .replace(/\s+/g, " ")
      .trim();

  const songWords = [
    "song", "single", "песня", "singolo", "chanson", "lied", "canción",
    "canzone",
  ];
  const albumWords = ["album", "альбом", "álbum"];
  const musicWords = [
    "song", "single", "album", "band", "group", "singer", "musician",
    "composer", "released", "recorded",
    "песня", "группа", "певец", "альбом", "музыкант",
    "canzone", "cantante", "gruppo", "musicista",
    "chanson", "chanteur", "chanteuse", "groupe",
    "lied", "sänger", "sängerin", "gruppe",
    "canción", "cantante", "grupo", "banda",
  ];
  const disambigMarkers = [
    "may refer to", "refer to:", "puede referirse a", "puede referirse",
    "può riferirsi a", "peut faire référence", "kann sich auf", "bezeichnet:",
  ];

  const normArtist = norm(artist);
  const normTitle = norm(title);
  const normAlbum = norm(album);
  const artistTokens = normArtist.split(" ").filter((w) => w.length >= 4);

  const isDisambig = (extract: string) => {
    const e = extract.toLowerCase();
    return disambigMarkers.some((m) => e.includes(m));
  };
  const mentionsArtist = (extract: string) => {
    const e = norm(extract);
    return artistTokens.length > 0 && artistTokens.some((t) => e.includes(t));
  };
  const hasMusicWord = (extract: string) => {
    const e = extract.toLowerCase();
    return musicWords.some((w) => e.includes(w));
  };

  // Fetch summaries for ranked candidates; return the first that validates.
  const tryCandidates = async (
    candidates: string[],
    source: WikiSource,
    validate: (extract: string, candTitle: string) => boolean,
  ): Promise<WikiResult | null> => {
    const seen = new Set<string>();
    for (const cand of candidates) {
      if (!cand || seen.has(cand)) continue;
      seen.add(cand);
      if (seen.size > 4) break;
      const s = await wikiSummary(sub, cand);
      if (!s || !s.extract) continue;
      if (s.type === "disambiguation" || isDisambig(s.extract)) continue;
      if (!validate(s.extract, cand)) continue;
      console.log(`[wiki] matched ${source} page:`, cand);
      return { wikiExtract: s.extract, wikiImage: s.image, wikiSource: source };
    }
    return null;
  };

  // C1 — song
  if (title) {
    const queries = [`${title} ${artist}`.trim(), title];
    if (sub === "ru") {
      const tr = transliterateRu(title);
      if (tr && tr !== title) queries.push(tr);
    }
    for (const query of queries) {
      const titles = await searchWiki(sub, query);
      console.log("[wiki] song search:", query, "->", titles);
      const score = (t: string) =>
        (normTitle && norm(t).includes(normTitle) ? 2 : 0) +
        (songWords.some((w) => t.toLowerCase().includes(w)) ? 1 : 0);
      const ranked = [...titles]
        .filter((t) => score(t) > 0)
        .sort((a, b) => score(b) - score(a));
      const result = await tryCandidates(ranked, "song", (extract, cand) => {
        const titleMatch = !!normTitle && norm(cand).includes(normTitle);
        return mentionsArtist(extract) || (titleMatch && hasMusicWord(extract));
      });
      if (result) return result;
    }
  }

  // C2 — album
  if (album) {
    const titles = await searchWiki(sub, album);
    console.log("[wiki] album search:", album, "->", titles);
    const candidates = titles.filter(
      (t) =>
        (normAlbum && norm(t).includes(normAlbum)) ||
        albumWords.some((w) => t.toLowerCase().includes(w)),
    );
    const result = await tryCandidates(candidates, "album", (extract, cand) => {
      const albumMatch = !!normAlbum && norm(cand).includes(normAlbum);
      return mentionsArtist(extract) || (albumMatch && hasMusicWord(extract));
    });
    if (result) return result;
  }

  // C3 — artist (use a less-generic query on ru, e.g. "Кино группа")
  if (artist) {
    const artistQuery = sub === "ru" ? `${artist} группа` : artist;
    const titles = await searchWiki(sub, artistQuery);
    console.log("[wiki] artist search:", artistQuery, "->", titles);
    const ranked = [...titles].sort((a, b) => {
      const sa = normArtist && norm(a).includes(normArtist) ? 1 : 0;
      const sb = normArtist && norm(b).includes(normArtist) ? 1 : 0;
      return sb - sa;
    });
    const result = await tryCandidates(
      [...ranked, artist],
      "artist",
      (extract, cand) => {
        const nameMatch =
          mentionsArtist(extract) ||
          (!!normArtist && norm(cand).includes(normArtist));
        return nameMatch && hasMusicWord(extract);
      },
    );
    if (result) return result;
  }

  console.log("[wiki] no match found");
  return { wikiExtract: "", wikiImage: null, wikiSource: "none" };
}

// ---- YouTube ----

interface YouTubeResponse {
  items?: Array<{
    id?: { videoId?: string };
    snippet?: { thumbnails?: { high?: { url?: string } } };
  }>;
}

async function fetchYouTube(
  artist: string,
  title: string,
  key: string | undefined,
): Promise<{ videoId: string | null; youtubeThumbnail: string | null }> {
  const empty = { videoId: null, youtubeThumbnail: null };
  if (!key) return empty;
  const url = new URL("https://www.googleapis.com/youtube/v3/search");
  url.searchParams.set("part", "snippet");
  url.searchParams.set("q", `${artist} ${title} official`.trim());
  url.searchParams.set("type", "video");
  url.searchParams.set("maxResults", "1");
  url.searchParams.set("key", key);
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return empty;
  const data = (await res.json()) as YouTubeResponse;
  const item = data.items?.[0];
  if (!item) return empty;
  return {
    videoId: item.id?.videoId ?? null,
    youtubeThumbnail: item.snippet?.thumbnails?.high?.url ?? null,
  };
}

// ---- Route ----

export async function GET(
  request: Request,
  { params }: { params: { trackId: string } },
) {
  const trackId = params.trackId;
  const { searchParams } = new URL(request.url);
  const artist = searchParams.get("artist") ?? "";
  const title = searchParams.get("title") ?? "";
  const album = searchParams.get("album") ?? "";
  const language = searchParams.get("language") ?? "";

  console.log("exhibit params:", { trackId, artist, title, album, language });

  const apiKey = process.env.MUSIXMATCH_API_KEY;
  const ytKey = process.env.YOUTUBE_API_KEY;
  const paramLang = language.toLowerCase().slice(0, 2);

  // Stage 1 — fetch sources that don't depend on language
  const [lyricsR, analysisR, ytR] = await Promise.allSettled([
    fetchLyrics(trackId, apiKey),
    fetchAnalysis(trackId, apiKey),
    fetchYouTube(artist, title, ytKey),
  ]);

  const lyrics = lyricsR.status === "fulfilled" ? lyricsR.value : "";
  const analysis: AnalysisResult =
    analysisR.status === "fulfilled"
      ? analysisR.value
      : { lensExplanation: "", moods: [], themes: [] };
  const yt =
    ytR.status === "fulfilled"
      ? ytR.value
      : { videoId: null, youtubeThumbnail: null };

  // Determine the effective language (param → detected from lyrics → Cyrillic title)
  const detected = detectLanguage(lyrics);
  const effLang =
    paramLang ||
    detected ||
    (/[\u0400-\u04FF]/.test(title) ? "ru" : "");
  console.log("language detect:", { paramLang, detected, effLang });

  // Stage 2 — Wikipedia with the resolved language
  let wiki: WikiResult = {
    wikiExtract: "",
    wikiImage: null,
    wikiSource: "none",
  };
  try {
    wiki = await fetchWikipedia(effLang, title, album, artist);
  } catch {
    // keep empty wiki on failure
  }

  return NextResponse.json({
    language: effLang,
    lyrics,
    lensExplanation: analysis.lensExplanation,
    moods: analysis.moods,
    themes: analysis.themes,
    wikiExtract: wiki.wikiExtract,
    wikiImage: wiki.wikiImage,
    wikiSource: wiki.wikiSource,
    videoId: yt.videoId,
    youtubeThumbnail: yt.youtubeThumbnail,
  });
}
