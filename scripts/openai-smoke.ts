import { chatCompletion } from "../src/llm/openai.ts";

(async () => {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL;
  if (!apiKey || !model) {
    console.log("[skip] OPENAI_API_KEY or OPENAI_MODEL not set – skipping OpenAI smoke test");
    process.exit(0);
  }
  const text = await chatCompletion(
    [{ role: "user", content: process.argv.slice(2).join(" ") }],
    { apiKey, model },
  );
  console.log(text);
})(); 