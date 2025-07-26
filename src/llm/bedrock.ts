import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

export interface BedrockOptions {
  model: string;
  prompt: string;
  maxTokens?: number;
  region: string;
}

// Utility to check if the model is Anthropic via its ID (works for all Claude 3+ via Bedrock)
function isAnthropicModel(modelId: string): boolean {
  return modelId.startsWith("anthropic.");
}

export async function bedrockChat(options: BedrockOptions): Promise<string> {
  const { model, prompt, maxTokens = 1024, region } = options;
  const client = new BedrockRuntimeClient({ region });

  // Build body depending on model
  let body: any;
  if (isAnthropicModel(model)) {
    // Anthropic via Bedrock expects messages array and max_tokens_to_sample
    body = {
      // Claude 3 via Bedrock expects a 'messages' array, not 'prompt'
      // Here we treat the full prompt as a single user message:
      messages: [{ role: "user", content: prompt }],
      max_tokens_to_sample: maxTokens,
      // Optionally, you can add temperature, stop_sequences, etc. as needed
    };
  } else {
    // Default/fallback for other models, e.g., Llama, Titan
    body = {
      prompt,
      max_tokens: maxTokens,
    };
  }

  const input = {
    modelId: model,
    contentType: "application/json",
    accept: "application/json",
    body: JSON.stringify(body),
  };
  const command = new InvokeModelCommand(input);
  const response = await client.send(command);

  // Parse result according to model output format (Claude, Titan, Llama differ)
  const text = await response.body.transformToString();
  let result: any = {};
  try { result = JSON.parse(text); } catch {}
  // Claude (Anthropic) returns .content, others might return .completion or .outputs
  return (
    result.content ||
    result.completion ||
    result.outputs?.[0]?.text ||
    text
  );
}
