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
  "You are a museum audioguide writer. You write in the style of a thoughtful documentary narrator — warm, precise, never sensationalist. You always ground interpretation in documented facts. Return only valid JSON. Never mention Wikipedia, sources, or data availability. Never use phrases like 'the text does not provide' or 'specific details are not available'. Write only what you know, confidently and briefly. Use Markdown to format the text. Wrap key historical events, geographical locations, album names, and artist names in **bold** to make the text easily scannable. Do not use headers, just bolding. If no background research is provided, rely entirely on your own internal historical and biographical knowledge of the artist and the era, and never mention the lack of research.";

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

    const userPrompt = `You are writing the wall placard texts for a museum 
exhibit about the song "${title}" by ${artist} (${year}).

Background research (${wikiSource} level): ${wikiExtract}

Musixmatch analysis: ${lensExplanation}
Moods: ${moods.join(", ")}

Return JSON with exactly two keys:

"innerWorld": 2-3 paragraphs written as a museum audioguide narrator. 
Draw on the research provided and your own knowledge of the artist and era. 
Tell the story of the artist's life, creative development, and emotional 
state around the time of this song. Be specific and evocative. 
NEVER mention Wikipedia, sources, or what information is or isn't available. 
NEVER say "the text does not provide" or "specific details are not available". 
If the research is thin, write what is known confidently and briefly — 
do not pad with disclaimers. Write as if narrating a documentary.

"theMoment": 2-3 paragraphs written as a museum audioguide narrator.
Describe the cultural, historical, and social world this song was born into.
The era, the city, the genre, the political climate. Be specific and 
evocative about what this moment in history felt like.
NEVER mention Wikipedia, sources, or what information is or isn't available.
NEVER say "the text does not provide" or "specific details are not available".
If the research is thin, describe the known historical context of the 
period and place confidently. Write as if narrating a documentary.

Write in English. Museum wall plaque tone — precise, warm, never academic.`;

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
