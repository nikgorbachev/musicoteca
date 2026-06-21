interface GroqMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface GroqChatOptions {
  model: string;
  fallbackModel: string;
  messages: GroqMessage[];
  maxTokens: number;
  jsonResponse?: boolean;
}

interface GroqResponse {
  choices?: Array<{ message?: { content?: string } }>;
}

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

async function callGroq(
  key: string,
  model: string,
  messages: GroqMessage[],
  maxTokens: number,
  jsonResponse: boolean,
): Promise<string | null> {
  const res = await fetch(GROQ_URL, {
    method: "POST",
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      ...(jsonResponse ? { response_format: { type: "json_object" } } : {}),
      messages,
    }),
  });
  if (!res.ok) {
    console.log(`[groq] ${model} not ok: ${res.status}`);
    return null;
  }
  const data = (await res.json()) as GroqResponse;
  return data.choices?.[0]?.message?.content ?? null;
}

/**
 * Run a Groq chat completion against the primary model, falling back to a
 * second Groq model when the primary fails or is rate-limited (429). Because
 * Groq's token caps are per-model, the fallback taps a separate daily quota.
 * Returns the message content, or null when both models fail.
 */
export async function groqChat(
  options: GroqChatOptions,
): Promise<string | null> {
  const key = process.env.GROQ_API_KEY;
  if (!key) {
    console.log("[groq] no GROQ_API_KEY");
    return null;
  }

  const { model, fallbackModel, messages, maxTokens, jsonResponse = false } =
    options;

  for (const m of [model, fallbackModel]) {
    try {
      const content = await callGroq(key, m, messages, maxTokens, jsonResponse);
      if (content) return content;
    } catch (err) {
      console.log(`[groq] ${m} error: ${String(err)}`);
    }
  }

  return null;
}
