import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

export interface BedrockOptions {
  model: string;
  prompt: string;
  maxTokens?: number;
  region: string;
}

function isAnthropicModel(modelId: string): boolean {
  return modelId.startsWith("anthropic.");
}

export async function bedrockChat(options: BedrockOptions): Promise<string> {
  const { model, prompt, maxTokens = 1024, region } = options;
  const client = new BedrockRuntimeClient({ region });

  let body: any;

  if (isAnthropicModel(model)) {
    // Claude 3 (and above) via Bedrock expects these exact fields
    body = {
      messages: [{ role: "user", content: prompt }],
      max_tokens: maxTokens,
      anthropic_version: "bedrock-2023-05-31"
      // Optionally: temperature, stop_sequences, etc.
    };
  } else {
    // Fallback for other Bedrock models (not Anthropic)
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

  const text = await response.body.transformToString();
  let result: any = {};
  try { result = JSON.parse(text); } catch {}

  // Anthropic/Claude 3+ on Bedrock: .content
  // Titan, Llama, etc: .completion or .outputs[0].text
  return (
    result.content ||
    result.completion ||
    result.outputs?.[0]?.text ||
    text
  );
}
