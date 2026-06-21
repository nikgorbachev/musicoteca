interface MistralMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface MistralChatOptions {
  messages: MistralMessage[];
  maxTokens: number;
  jsonResponse?: boolean;
}

interface MistralResponse {
  choices?: Array<{ message?: { content?: string } }>;
}

const MISTRAL_URL = "https://api.mistral.ai/v1/chat/completions";
const MISTRAL_MODEL = "mistral-small-2503";

/**
 * Run a chat completion against the Mistral API (mistral-small-2503).
 * Returns the message content, or null when the key is missing or the
 * request fails. Never caches — every call hits the API in real time.
 */
export async function mistralChat(
  options: MistralChatOptions,
): Promise<string | null> {
  const key = process.env.MISTRAL_API_KEY;
  if (!key) {
    console.log("[mistral] no MISTRAL_API_KEY");
    return null;
  }

  const { messages, maxTokens, jsonResponse = false } = options;

  try {
    const res = await fetch(MISTRAL_URL, {
      method: "POST",
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MISTRAL_MODEL,
        max_tokens: maxTokens,
        ...(jsonResponse ? { response_format: { type: "json_object" } } : {}),
        messages,
      }),
    });
    if (!res.ok) {
      console.log(`[mistral] not ok: ${res.status}`);
      return null;
    }
    const data = (await res.json()) as MistralResponse;
    return data.choices?.[0]?.message?.content ?? null;
  } catch (err) {
    console.log(`[mistral] error: ${String(err)}`);
    return null;
  }
}
