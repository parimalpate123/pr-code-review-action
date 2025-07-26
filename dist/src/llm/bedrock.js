"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bedrockChat = bedrockChat;
const client_bedrock_runtime_1 = require("@aws-sdk/client-bedrock-runtime");
async function bedrockChat(options) {
    const { model, prompt, maxTokens = 1024, region } = options;
    const client = new client_bedrock_runtime_1.BedrockRuntimeClient({ region });
    const input = {
        modelId: model,
        contentType: "application/json",
        accept: "application/json",
        body: JSON.stringify({
            prompt,
            max_tokens: maxTokens,
        }),
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
    return result.completion || result.outputs?.[0]?.text || text;
}
