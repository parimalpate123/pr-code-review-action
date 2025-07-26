#!/usr/bin/env node
import * as core from "@actions/core";
import { readFile, writeFile } from "fs/promises";
import { chatCompletion } from "../llm/openai";
import { anthropicChat } from "../llm/anthropic";
import { bedrockChat } from "../llm/bedrock";
import { buildPrompt } from "../prompt/builder";
import { postInlineReview } from "../github/inline";
import { Octokit } from "@octokit/rest";

interface RepoInfo {
  owner: string;
  repo: string;
}

interface Context {
  repo: RepoInfo;
  prNumber: number;
  title: string;
  body: string;
  diff: string;
  thread: { author: string; body: string }[];
}

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

function detectProvider(model: string): "anthropic" | "openai" | "bedrock" {
  // Bedrock models typically have a . in their model name, e.g., "anthropic.claude-3-5-sonnet-20240620-v1:0"
  if (model.startsWith("anthropic.claude") || model.startsWith("cohere.") || model.startsWith("meta.")) return "bedrock";
  if (model.startsWith("claude")) return "anthropic";
  if (model.startsWith("gpt") || model.startsWith("o3")) return "openai";
  throw new Error("Unknown model prefix");
}

function getArgValue(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  return idx !== -1 && process.argv.length > idx + 1 ? process.argv[idx + 1] : undefined;
}

function getInputOrArg(name: string, flag: string): string | undefined {
  return (
    getArgValue(flag) ||
    core.getInput(name) ||
    process.env[name.toUpperCase()]
  );
}

async function run() {
  try {
    const contextPath = getInputOrArg("context_file", "--context_file");
    if (!contextPath) throw new Error("❌ Missing required: context_file");

    const model = getInputOrArg("model", "--model");
    if (!model) throw new Error("❌ Missing required: model");

    const maxTokens = parseInt(getInputOrArg("max_tokens", "--max_tokens") || "25000", 10);
    const timeoutMs = parseInt(getInputOrArg("timeout_ms", "--timeout_ms") || "60000", 10);

    console.log("📥 Inputs:");
    console.log("- context_file:", contextPath);
    console.log("- model:", model);
    console.log("- max_tokens:", maxTokens);
    console.log("- timeout_ms:", timeoutMs);

    const context: Context = JSON.parse(await readFile(contextPath, "utf8"));

    const provider = detectProvider(model);
    const prompt = buildPrompt({
      title: context.title,
      body: context.body,
      diff: context.diff,
      thread: context.thread,
      tokenLimit: maxTokens,
      repo: context.repo,
      prNumber: context.prNumber,
    });
    console.log("🔍 Prompt being sent:\n", prompt);

    const messages: ChatMessage[] = [{ role: "user", content: prompt }];
    let answer: string = "";
    try {
      if (provider === "openai") {
        answer = await chatCompletion(messages, {
          apiKey: process.env.OPENAI_API_KEY ?? "",
          model,
          timeoutMs: timeoutMs,
        });
      } else if (provider === "anthropic") {
        if (!process.env.ANTHROPIC_API_KEY) throw new Error("❌ ANTHROPIC_API_KEY is not set");
        answer = await anthropicChat(messages, {
          apiKey: process.env.ANTHROPIC_API_KEY,
          model,
          maxTokens: 1024,
          timeoutMs: timeoutMs,
        });
      } else if (provider === "bedrock") {
        answer = await bedrockChat({
          model,
          prompt,
          maxTokens: maxTokens,
          region: process.env.AWS_REGION || "us-east-1",
        });
      }
    } catch (err: any) {
      answer = `⚠️ LLM call failed: ${err.message}`;
    }

    // --- Ensure answer is a string before using string methods
    if (typeof answer !== "string") {
      answer = JSON.stringify(answer, null, 2);
    }

    let inline: any[] = [];
    const jsonMatch = answer.match(/```json([\s\S]*?)```/);
    if (jsonMatch) {
      try {
        inline = JSON.parse(jsonMatch[1].trim());
        answer = answer.replace(jsonMatch[0], "").trim();
      } catch {}
    }

    if (inline.length > 0) {
      const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
      await postInlineReview(
        octokit,
        context.repo.owner,
        context.repo.repo,
        context.prNumber,
        inline,
        answer
      );
    }

    const bodyPath = `${process.env.RUNNER_TEMP}/pr-agent-body.txt`;
    await writeFile(bodyPath, answer, "utf8");
    core.setOutput("body_file", bodyPath);
  } catch (err: any) {
    core.setFailed(err.message);
  }
}

run();
