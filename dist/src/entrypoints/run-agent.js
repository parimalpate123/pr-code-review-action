#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const promises_1 = require("fs/promises");
const openai_1 = require("../llm/openai");
const anthropic_1 = require("../llm/anthropic");
const bedrock_1 = require("../llm/bedrock");
const builder_1 = require("../prompt/builder");
const inline_1 = require("../github/inline");
const rest_1 = require("@octokit/rest");
function detectProvider(model) {
    // Bedrock models typically have a . in their model name, e.g., "anthropic.claude-3-5-sonnet-20240620-v1:0"
    if (model.startsWith("anthropic.claude") || model.startsWith("cohere.") || model.startsWith("meta."))
        return "bedrock";
    if (model.startsWith("claude"))
        return "anthropic";
    if (model.startsWith("gpt") || model.startsWith("o3"))
        return "openai";
    throw new Error("Unknown model prefix");
}
function getArgValue(flag) {
    const idx = process.argv.indexOf(flag);
    return idx !== -1 && process.argv.length > idx + 1 ? process.argv[idx + 1] : undefined;
}
function getInputOrArg(name, flag) {
    return (getArgValue(flag) ||
        core.getInput(name) ||
        process.env[name.toUpperCase()]);
}
async function run() {
    try {
        const contextPath = getInputOrArg("context_file", "--context_file");
        if (!contextPath)
            throw new Error("❌ Missing required: context_file");
        const model = getInputOrArg("model", "--model");
        if (!model)
            throw new Error("❌ Missing required: model");
        const maxTokens = parseInt(getInputOrArg("max_tokens", "--max_tokens") || "25000", 10);
        const timeoutMs = parseInt(getInputOrArg("timeout_ms", "--timeout_ms") || "60000", 10);
        console.log("📥 Inputs:");
        console.log("- context_file:", contextPath);
        console.log("- model:", model);
        console.log("- max_tokens:", maxTokens);
        console.log("- timeout_ms:", timeoutMs);
        const context = JSON.parse(await (0, promises_1.readFile)(contextPath, "utf8"));
        const provider = detectProvider(model);
        const prompt = (0, builder_1.buildPrompt)({
            title: context.title,
            body: context.body,
            diff: context.diff,
            thread: context.thread,
            tokenLimit: maxTokens,
            repo: context.repo,
            prNumber: context.prNumber,
        });
        console.log("🔍 Prompt being sent:\n", prompt);
        const messages = [{ role: "user", content: prompt }];
        let answer = "";
        try {
            if (provider === "openai") {
                answer = await (0, openai_1.chatCompletion)(messages, {
                    apiKey: process.env.OPENAI_API_KEY ?? "",
                    model,
                    timeoutMs: timeoutMs,
                });
            }
            else if (provider === "anthropic") {
                if (!process.env.ANTHROPIC_API_KEY)
                    throw new Error("❌ ANTHROPIC_API_KEY is not set");
                answer = await (0, anthropic_1.anthropicChat)(messages, {
                    apiKey: process.env.ANTHROPIC_API_KEY,
                    model,
                    maxTokens: 1024,
                    timeoutMs: timeoutMs,
                });
            }
            else if (provider === "bedrock") {
                answer = await (0, bedrock_1.bedrockChat)({
                    model,
                    prompt,
                    maxTokens: maxTokens,
                    region: process.env.AWS_REGION || "us-east-1",
                });
            }
        }
        catch (err) {
            answer = `⚠️ LLM call failed: ${err.message}`;
        }
        // --- Ensure answer is a string before using string methods
        if (typeof answer !== "string") {
            answer = JSON.stringify(answer, null, 2);
        }
        let inline = [];
        const jsonMatch = answer.match(/```json([\s\S]*?)```/);
        if (jsonMatch) {
            try {
                inline = JSON.parse(jsonMatch[1].trim());
                answer = answer.replace(jsonMatch[0], "").trim();
            }
            catch { }
        }
        if (inline.length > 0) {
            const octokit = new rest_1.Octokit({ auth: process.env.GITHUB_TOKEN });
            await (0, inline_1.postInlineReview)(octokit, context.repo.owner, context.repo.repo, context.prNumber, inline, answer);
        }
        const bodyPath = `${process.env.RUNNER_TEMP}/pr-agent-body.txt`;
        await (0, promises_1.writeFile)(bodyPath, answer, "utf8");
        core.setOutput("body_file", bodyPath);
    }
    catch (err) {
        core.setFailed(err.message);
    }
}
run();
