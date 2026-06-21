import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const WIKI_UA = "Musicoteca/1.0 (https://replit.com; educational project)";

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
): Promise<{ extract: string; image: string | null } | null> {
  const url = `https://${sub}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
    title,
  )}`;
  const res = await fetch(url, {
    cache: "no-store",
    headers: { "User-Agent": WIKI_UA, accept: "application/json" },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as WikiSummaryResponse;
  return { extract: data.extract ?? "", image: data.thumbnail?.source ?? null };
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

  const songWords = [
    "song",
    "single",
    "песня",
    "singolo",
    "chanson",
    "lied",
    "canción",
    "canzone",
  ];
  const albumWords = ["album", "альбом", "álbum"];

  // C1 — song (try Cyrillic original and a transliterated query on ru)
  if (title) {
    const queries = [title];
    if (sub === "ru") {
      const tr = transliterateRu(title);
      if (tr && tr !== title) queries.push(tr);
    }
    for (const query of queries) {
      const titles = await searchWiki(sub, query);
      console.log("[wiki] song search:", query, "->", titles);
      const hit = titles.find((t) =>
        songWords.some((w) => t.toLowerCase().includes(w)),
      );
      if (hit) {
        const s = await wikiSummary(sub, hit);
        if (s && s.extract) {
          console.log("[wiki] matched song page:", hit);
          return {
            wikiExtract: s.extract,
            wikiImage: s.image,
            wikiSource: "song",
          };
        }
      }
    }
  }

  // C2 — album
  if (album) {
    const titles = await searchWiki(sub, album);
    console.log("[wiki] album search:", album, "->", titles);
    const hit = titles.find((t) =>
      albumWords.some((w) => t.toLowerCase().includes(w)),
    );
    if (hit) {
      const s = await wikiSummary(sub, hit);
      if (s && s.extract) {
        console.log("[wiki] matched album page:", hit);
        return {
          wikiExtract: s.extract,
          wikiImage: s.image,
          wikiSource: "album",
        };
      }
    }
  }

  // C3 — artist (use a less-generic query on ru, e.g. "Кино группа")
  if (artist) {
    const artistQuery = sub === "ru" ? `${artist} группа` : artist;
    const titles = await searchWiki(sub, artistQuery);
    console.log("[wiki] artist search:", artistQuery, "->", titles);
    const hit = titles[0];
    if (hit) {
      const s = await wikiSummary(sub, hit);
      if (s && s.extract) {
        console.log("[wiki] matched artist page:", hit);
        return {
          wikiExtract: s.extract,
          wikiImage: s.image,
          wikiSource: "artist",
        };
      }
    }
    const direct = await wikiSummary(sub, artist);
    if (direct && direct.extract) {
      console.log("[wiki] matched artist page (direct):", artist);
      return {
        wikiExtract: direct.extract,
        wikiImage: direct.image,
        wikiSource: "artist",
      };
    }
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

  const [lyricsR, analysisR, wikiR, ytR] = await Promise.allSettled([
    fetchLyrics(trackId, apiKey),
    fetchAnalysis(trackId, apiKey),
    fetchWikipedia(language, title, album, artist),
    fetchYouTube(artist, title, ytKey),
  ]);

  const lyrics = lyricsR.status === "fulfilled" ? lyricsR.value : "";
  const analysis: AnalysisResult =
    analysisR.status === "fulfilled"
      ? analysisR.value
      : { lensExplanation: "", moods: [], themes: [] };
  const wiki: WikiResult =
    wikiR.status === "fulfilled"
      ? wikiR.value
      : { wikiExtract: "", wikiImage: null, wikiSource: "none" };
  const yt =
    ytR.status === "fulfilled"
      ? ytR.value
      : { videoId: null, youtubeThumbnail: null };

  return NextResponse.json({
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
