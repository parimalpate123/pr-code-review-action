import OpenAI from "openai";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ToolSchema {
  name: string;
  description?: string;
  parameters?: Record<string, any>;
}

export interface OpenAIProviderOptions {
  apiKey: string;
  model: string;
  temperature?: number;
  stream?: boolean;
  tools?: ToolSchema[];
  timeoutMs?: number;
}

export async function chatCompletion(
  messages: ChatMessage[],
  opts: OpenAIProviderOptions,
  onStreamChunk?: (delta: string) => void,
): Promise<string> {
  const client = new OpenAI({ apiKey: opts.apiKey });

  const params: OpenAI.Chat.ChatCompletionCreateParams = {
    model: opts.model,
    messages: messages as any,
    temperature: opts.temperature ?? 0.2,
    stream: opts.stream ?? false,
  } as any;

  if (opts.tools && opts.tools.length > 0) {
    (params as any).tools = opts.tools;
  }

  const timeoutMs = opts.timeoutMs ?? 60000;

  // Streaming mode can be implemented later when needed.
  if (opts.stream) {
    throw new Error("Streaming mode not yet implemented in openai provider");
  }

  const responsePromise = client.chat.completions.create(params) as Promise<any>;

  let timeoutId: NodeJS.Timeout | undefined;
  const timeoutPromise = new Promise((_r, rej) => {
    timeoutId = setTimeout(() => rej(new Error("OpenAI request timed out")), timeoutMs);
  });

  try {
    const res: any = await Promise.race([responsePromise, timeoutPromise]);
    return res.choices?.[0]?.message?.content ?? "";
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
} 