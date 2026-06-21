import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface MxTrack {
  track_id: number;
  commontrack_id: number;
  track_name: string;
  artist_name: string;
  album_name: string;
  first_release_date?: string;
  artist_id?: number;
  album_id?: number;
  has_lyrics?: number;
  track_language?: string;
}

interface MxSearchResponse {
  message?: { body?: { track_list?: Array<{ track: MxTrack }> } };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  if (!q) return NextResponse.json({ results: [] });

  const apiKey = process.env.MUSIXMATCH_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ results: [], error: "search unavailable" });
  }

  try {
    const url = new URL("https://api.musixmatch.com/ws/1.1/track.search");
    url.searchParams.set("q_track", q);
    url.searchParams.set("page_size", "8");
    url.searchParams.set("page", "1");
    url.searchParams.set("s_track_rating", "desc");
    url.searchParams.set("f_has_lyrics", "1");
    url.searchParams.set("apikey", apiKey);

    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`musixmatch ${res.status}`);

    const data = (await res.json()) as MxSearchResponse;
    const list = data.message?.body?.track_list ?? [];

    const results = list.map(({ track: t }) => ({
      trackId: String(t.track_id),
      commontrackId: String(t.commontrack_id),
      title: t.track_name ?? "",
      artist: t.artist_name ?? "",
      album: t.album_name ?? "",
      year:
        typeof t.first_release_date === "string"
          ? t.first_release_date.slice(0, 4)
          : "",
      artistId: String(t.artist_id ?? ""),
      albumId: String(t.album_id ?? ""),
      hasLyrics: t.has_lyrics === 1,
      language: t.track_language ?? "",
    }));

    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ results: [], error: "search unavailable" });
  }
}
