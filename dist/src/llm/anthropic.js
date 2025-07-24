"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.anthropicChat = anthropicChat;
const node_fetch_1 = __importDefault(require("node-fetch"));
async function anthropicChat(messages, opts) {
    const body = {
        model: opts.model,
        max_tokens: opts.maxTokens,
        temperature: opts.temperature ?? 0.2,
        messages,
    };
    const ctl = new AbortController();
    const timeout = setTimeout(() => ctl.abort("timeout"), opts.timeoutMs ?? 60000);
    try {
        const res = await (0, node_fetch_1.default)("https://api.anthropic.com/v1/messages", {
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
        const data = await res.json();
        return data?.content?.[0]?.text ?? "";
    }
    finally {
        clearTimeout(timeout);
    }
}
