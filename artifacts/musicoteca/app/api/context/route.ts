import { NextResponse } from "next/server";
import { mistralChat } from "@/lib/mistral";

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

const SYSTEM_PROMPT =
  "You are a museum audioguide writer. You write in the style of a thoughtful documentary narrator — warm, precise, never sensationalist. You always ground interpretation in documented facts. Return only valid JSON. Never mention Wikipedia, sources, or data availability. Never use phrases like 'the text does not provide' or 'specific details are not available'. Write only what you know, confidently and briefly. Use Markdown to format the text. Wrap key historical events, geographical locations, album names, and artist names in **bold** to make the text easily scannable. Do not use headers, just bolding. If no background research is provided, rely entirely on your own internal historical and biographical knowledge of the artist and the era, and never mention the lack of research. If no background research is provided, try to keep the placard still factual, don't overdo with atmospheric description when specific facts are unavailable";

function toText(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    return value.filter((v) => typeof v === "string").join("\n\n");
  }
  return "";
}

function stripMarkdown(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/\(\s*\)/g, "")
    .trim();
}

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

    const userPrompt = `You are writing the wall placard texts for a museum 
exhibit about the song "${title}" by ${artist} (${year}).

Background research (${wikiSource} level): ${wikiExtract}

Musixmatch analysis: ${lensExplanation}
Moods: ${moods.join(", ")}

Return JSON with exactly three keys: "innerWorld", "theMoment", and "era". 
"innerWorld" and "theMoment" MUST each be a single plain string with paragraphs 
separated by a blank line (\n\n) — NEVER an array, and never split a sentence 
across entries.

"era": the decade in which this song was originally released, formatted exactly 
as one of "1950s", "1960s", "1970s", "1980s", "1990s", "2000s", "2010s", 
"2020s". Decide using the background research and your own knowledge of the 
song and artist — do NOT just echo the year in the prompt if it looks wrong. 
If the release decade is genuinely unknown, return an empty string "".

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

    // Two attempts: transient API failures or truncated/invalid JSON on the
    // first try should not leave the plaques empty during a demo.
    let parsed: Record<string, unknown> | null = null;
    for (let attempt = 0; attempt < 2 && !parsed; attempt++) {
      const content = await mistralChat({
        maxTokens: 1200,
        jsonResponse: true,
        // ~11s per attempt so both attempts fit inside the page's 25s budget.
        timeoutMs: 11000,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
      });
      if (!content) continue;
      try {
        parsed = JSON.parse(content) as Record<string, unknown>;
      } catch {
        parsed = null;
      }
    }
    if (!parsed) return NextResponse.json(empty);

    const era = typeof parsed.era === "string" ? parsed.era.trim() : "";

    return NextResponse.json({
      innerWorld: stripMarkdown(toText(parsed.innerWorld)),
      theMoment: stripMarkdown(toText(parsed.theMoment ?? parsed["theМoment"])),
      era: /^(19|20)\d0s$/.test(era) ? era : "",
    });
  } catch {
    return NextResponse.json(empty);
  }
}
