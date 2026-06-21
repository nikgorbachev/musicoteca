import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface ContextRequest {
  title?: string;
  artist?: string;
  year?: string;
  language?: string;
  wikiExtract?: string;
  wikiSource?: string;
  lensExplanation?: string;
  moods?: string[];
}

interface GroqResponse {
  choices?: Array<{ message?: { content?: string } }>;
}

const SYSTEM_PROMPT =
  "You are a museum audioguide writer. You write in the style of a thoughtful documentary narrator — warm, precise, never sensationalist. You always ground interpretation in documented facts. Return only valid JSON.";

export async function POST(request: Request) {
  const empty = { innerWorld: "", theMoment: "" };
  try {
    const body = (await request.json()) as ContextRequest;
    const title = body.title ?? "";
    const artist = body.artist ?? "";
    const year = body.year ?? "";
    const wikiSource = body.wikiSource ?? "none";
    const wikiExtract = body.wikiExtract ?? "";
    const lensExplanation = body.lensExplanation ?? "";
    const moods = body.moods ?? [];

    const key = process.env.GROQ_API_KEY;
    if (!key) return NextResponse.json(empty);

    const userPrompt = `Write two museum placard texts for the song "${title}" by ${artist} (${year}).

Wikipedia source (${wikiSource} page): ${wikiExtract}

Musixmatch analysis: ${lensExplanation}
Moods: ${moods.join(", ")}

Return JSON with exactly these two keys:

"innerWorld": 2-3 paragraphs about the artist's personal and creative context at the time of this song. What was happening in their life, career, artistic development? Where were they emotionally and creatively? Ground everything in what the Wikipedia text actually says about this period. Do not invent facts. If the Wikipedia text does not cover the period well, say so briefly and focus on what is known.

"theMoment": 2-3 paragraphs about the cultural and historical moment when this song was created. What was the era like? What was happening in the genre, the city, the country? What social or political forces shaped the world this song was born into? Again, ground in the Wikipedia text. Do not invent specific dates or events not mentioned in the source.

Write in English regardless of the song's language. Museum plaque style — precise, evocative, grounded.`;

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        max_tokens: 1000,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
      }),
    });
    if (!res.ok) return NextResponse.json(empty);

    const data = (await res.json()) as GroqResponse;
    const content = data.choices?.[0]?.message?.content;
    if (!content) return NextResponse.json(empty);

    const parsed = JSON.parse(content) as Record<string, string>;
    return NextResponse.json({
      innerWorld: parsed.innerWorld ?? "",
      theMoment: parsed.theMoment ?? parsed["theМoment"] ?? "",
    });
  } catch {
    return NextResponse.json(empty);
  }
}
