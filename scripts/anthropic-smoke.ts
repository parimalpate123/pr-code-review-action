import { anthropicChat } from "../src/llm/anthropic.ts";

(async () => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const model = process.env.ANTHROPIC_MODEL;
  if (!apiKey || !model) {
    console.log("[skip] ANTHROPIC_API_KEY or ANTHROPIC_MODEL not set – skipping Anthropic smoke test");
    process.exit(0);
  }
  const text = await anthropicChat(
    [{ role: "user", content: process.argv.slice(2).join(" ") }],
    { apiKey, model, maxTokens: 300 },
  );
  console.log(text);
})(); 