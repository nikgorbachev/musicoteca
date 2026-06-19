import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";

  // API keys (e.g. MUSIXMATCH_API_KEY, DEEZER_APP_ID) stay server-side only.
  // Placeholder response for now — real search wiring comes later.
  void q;

  return NextResponse.json({ results: [] });
}
