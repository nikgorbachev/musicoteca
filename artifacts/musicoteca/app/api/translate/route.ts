import { NextResponse } from "next/server";
import { mistralChat } from "@/lib/mistral";

export const dynamic = "force-dynamic";

interface TranslateRequest {
  lyrics?: string;
  artist?: string;
  title?: string;
}

export async function POST(request: Request) {
  const empty = { translation: "" };
  try {
    const body = (await request.json()) as TranslateRequest;
    const lyrics = body.lyrics ?? "";
    const artist = body.artist ?? "";
    const title = body.title ?? "";

    if (!lyrics.trim()) return NextResponse.json(empty);

    const userPrompt = `Translate these lyrics to English, line by line. Preserve the line breaks exactly. Return JSON with one key: 'translation' containing the full translated lyrics with same line structure as original.

Song: "${title}" by ${artist}

Lyrics:
${lyrics}`;

    const content = await mistralChat({
      maxTokens: 1500,
      jsonResponse: true,
      messages: [
        {
          role: "system",
          content:
            "You are a careful lyrics translator. Return only valid JSON.",
        },
        { role: "user", content: userPrompt },
      ],
    });
    if (!content) return NextResponse.json(empty);

    const parsed = JSON.parse(content) as { translation?: unknown };
    const t = parsed.translation;
    const translation =
      typeof t === "string"
        ? t
        : Array.isArray(t)
          ? t.filter((v) => typeof v === "string").join("\n")
          : "";
    return NextResponse.json({ translation });
  } catch {
    return NextResponse.json(empty);
  }
}
