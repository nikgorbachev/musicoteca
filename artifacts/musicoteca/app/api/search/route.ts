import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const FIXTURES = [
  {
    trackId: "1",
    title: "Звезда по имени Солнце",
    artist: "Кино",
    coverUrl: "https://placehold.co/60x60/0D0F14/F0F0ED?text=К",
  },
  {
    trackId: "2",
    title: "La sera dei miracoli",
    artist: "Lucio Dalla",
    coverUrl: "https://placehold.co/60x60/0D0F14/F0F0ED?text=LD",
  },
  {
    trackId: "3",
    title: "Wonderwall",
    artist: "Oasis",
    coverUrl: "https://placehold.co/60x60/0D0F14/F0F0ED?text=O",
  },
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";

  // API keys (e.g. MUSIXMATCH_API_KEY, DEEZER_APP_ID) stay server-side only.
  // For now we return hardcoded fixtures regardless of the query —
  // real Musixmatch wiring comes later.
  void q;

  return NextResponse.json({ results: FIXTURES });
}
