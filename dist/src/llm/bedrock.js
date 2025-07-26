"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bedrockChat = bedrockChat;
const client_bedrock_runtime_1 = require("@aws-sdk/client-bedrock-runtime");
async function bedrockChat(options) {
    const { model, prompt, maxTokens = 1024, region } = options;
    const client = new client_bedrock_runtime_1.BedrockRuntimeClient({ region });
    // For Claude 3 models, the input must have "anthropic_version" and "messages"
    // Adjust if you want to support non-Claude models!
    const body = JSON.stringify({
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: maxTokens,
        messages: [{ role: "user", content: prompt }],
    });
    const input = {
        modelId: model,
        contentType: "application/json",
        accept: "application/json",
        body,
    };
    const command = new client_bedrock_runtime_1.InvokeModelCommand(input);
    const response = await client.send(command);
    // Parse result according to model output format (Claude, Titan, Llama differ)
    const text = await response.body.transformToString();
    let result = {};
    try {
        result = JSON.parse(text);
    }
    catch { }
    // Always return a string, no matter what.
    if (typeof result.content === "string")
        return result.content;
    if (Array.isArray(result.content))
        return result.content.map((c) => c.text || c).join('\n');
    if (typeof result.completion === "string")
        return result.completion;
    if (result.outputs?.[0]?.text)
        return result.outputs[0].text;
    return typeof text === "string" ? text : JSON.stringify(text);
}
