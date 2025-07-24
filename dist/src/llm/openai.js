"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.chatCompletion = chatCompletion;
const openai_1 = __importDefault(require("openai"));
async function chatCompletion(messages, opts, onStreamChunk) {
    const client = new openai_1.default({ apiKey: opts.apiKey });
    const params = {
        model: opts.model,
        messages: messages,
        temperature: opts.temperature ?? 0.2,
        stream: opts.stream ?? false,
    };
    if (opts.tools && opts.tools.length > 0) {
        params.tools = opts.tools;
    }
    const timeoutMs = opts.timeoutMs ?? 60000;
    // Streaming mode can be implemented later when needed.
    if (opts.stream) {
        throw new Error("Streaming mode not yet implemented in openai provider");
    }
    const responsePromise = client.chat.completions.create(params);
    let timeoutId;
    const timeoutPromise = new Promise((_r, rej) => {
        timeoutId = setTimeout(() => rej(new Error("OpenAI request timed out")), timeoutMs);
    });
    try {
        const res = await Promise.race([responsePromise, timeoutPromise]);
        return res.choices?.[0]?.message?.content ?? "";
    }
    finally {
        if (timeoutId) {
            clearTimeout(timeoutId);
        }
    }
}
