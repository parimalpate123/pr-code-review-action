import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

export interface BedrockOptions {
  model: string;
  prompt: string;
  maxTokens?: number;
  region: string;
}

export async function bedrockChat(options: BedrockOptions): Promise<string> {
  const { model, prompt, maxTokens = 1024, region } = options;
  const client = new BedrockRuntimeClient({ region });
  const input = {
    modelId: model,
    contentType: "application/json",
    accept: "application/json",
    body: JSON.stringify({
      prompt,
      max_tokens: maxTokens,
    }),
  };
  const command = new InvokeModelCommand(input);
  const response = await client.send(command);

  // Parse result according to model output format (Claude, Titan, Llama differ)
  const text = await response.body.transformToString();
  let result: any = {};
  try { result = JSON.parse(text); } catch {}
  return result.completion || result.outputs?.[0]?.text || text;
}