import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface TranslateRequest {
  lyrics?: string;
  artist?: string;
  title?: string;
}

interface GroqResponse {
  choices?: Array<{ message?: { content?: string } }>;
}

export async function POST(request: Request) {
  const empty = { translation: "" };
  try {
    const body = (await request.json()) as TranslateRequest;
    const lyrics = body.lyrics ?? "";
    const artist = body.artist ?? "";
    const title = body.title ?? "";

    if (!lyrics.trim()) return NextResponse.json(empty);

    const key = process.env.GROQ_API_KEY;
    if (!key) return NextResponse.json(empty);

    const userPrompt = `Translate these lyrics to English, line by line. Preserve the line breaks exactly. Return JSON with one key: 'translation' containing the full translated lyrics with same line structure as original.

Song: "${title}" by ${artist}

Lyrics:
${lyrics}`;

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        max_tokens: 1500,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You are a careful lyrics translator. Return only valid JSON.",
          },
          { role: "user", content: userPrompt },
        ],
      }),
    });
    if (!res.ok) return NextResponse.json(empty);

    const data = (await res.json()) as GroqResponse;
    const content = data.choices?.[0]?.message?.content;
    if (!content) return NextResponse.json(empty);

    const parsed = JSON.parse(content) as { translation?: string };
    return NextResponse.json({ translation: parsed.translation ?? "" });
  } catch {
    return NextResponse.json(empty);
  }
}
