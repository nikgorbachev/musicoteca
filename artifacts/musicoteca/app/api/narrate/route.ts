import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const VOICE_MAP: Record<string, string> = {
  "1950s": "EfjZO8iTlwA2wRGzKGMj",
  "1960s": "i5l9LLTfCYKQzNK6qwQV",
  "1970s": "aLg5bXPwIfBuljLTf1d6",
  "1980s": "z8Z7TbjIBaor7fzwiadh",
  "1990s": "o98AvbWqdipnEF1z8h4p",
  "2000s": "bRDyApmqjRqHeDaynDN0",
  default: "Atn2QJg3TnFV3zBkm0i0",
};

function getVoiceId(era: string): string {
  return VOICE_MAP[era] ?? VOICE_MAP["default"];
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      text?: string;
      language?: string;
      era?: string;
    };
    const text = (body.text ?? "")
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .trim()
      .slice(0, 5000);
    const era = body.era ?? "default";

    if (!text) return new Response("No text", { status: 400 });

    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) return new Response("No API key", { status: 500 });

    const voiceId = getVoiceId(era);

    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_multilingual_v2",
          voice_settings: { stability: 0.5, similarity_boost: 0.75 },
        }),
      },
    );

    if (!res.ok) {
      const err = await res.text();
      console.error("ElevenLabs error:", err);
      return new Response("ElevenLabs error", { status: 502 });
    }

    return new Response(res.body, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error("narrate error:", e);
    return new Response("Server error", { status: 500 });
  }
}
