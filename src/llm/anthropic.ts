import fetch from "node-fetch";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AnthropicOptions {
  apiKey: string;
  model: string;
  maxTokens: number;
  temperature?: number;
}

export async function anthropicChat(
  messages: ChatMessage[],
  opts: AnthropicOptions & { timeoutMs?: number },
): Promise<string> {
  const body = {
    model: opts.model,
    max_tokens: opts.maxTokens,
    temperature: opts.temperature ?? 0.2,
    messages,
  };

  const ctl = new AbortController();
  const timeout = setTimeout(() => ctl.abort("timeout"), opts.timeoutMs ?? 60000);
  
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": opts.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
      signal: ctl.signal,
    });

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Anthropic API error ${res.status}: ${txt}`);
    }

    const data: any = await res.json();
    return data?.content?.[0]?.text ?? "";
  } finally {
    clearTimeout(timeout);
  }
} 