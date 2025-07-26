"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bedrockChat = bedrockChat;
const client_bedrock_runtime_1 = require("@aws-sdk/client-bedrock-runtime");
function isAnthropicModel(modelId) {
    return modelId.startsWith("anthropic.");
}
async function bedrockChat(options) {
    const { model, prompt, maxTokens = 1024, region } = options;
    const client = new client_bedrock_runtime_1.BedrockRuntimeClient({ region });
    let body;
    if (isAnthropicModel(model)) {
        // Claude 3 (and above) via Bedrock expects these exact fields
        body = {
            messages: [{ role: "user", content: prompt }],
            max_tokens: maxTokens,
            anthropic_version: "bedrock-2023-05-31"
            // Optionally: temperature, stop_sequences, etc.
        };
    }
    else {
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
    const command = new client_bedrock_runtime_1.InvokeModelCommand(input);
    const response = await client.send(command);
    const text = await response.body.transformToString();
    let result = {};
    try {
        result = JSON.parse(text);
    }
    catch { }
    // Anthropic/Claude 3+ on Bedrock: .content
    // Titan, Llama, etc: .completion or .outputs[0].text
    return (result.content ||
        result.completion ||
        result.outputs?.[0]?.text ||
        text);
}
