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
const rest_1 = require("@octokit/rest");
const promises_1 = require("fs/promises");
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
        // Support both input and CLI args for context_file and body_file
        const contextPath = getInputOrArg("context_file", "--context_file");
        const bodyPath = getInputOrArg("body_file", "--body_file");
        if (!contextPath || !bodyPath) {
            throw new Error("context_file and body_file must be provided either as input or CLI args.");
        }
        const context = JSON.parse(await (0, promises_1.readFile)(contextPath, "utf8"));
        const body = await (0, promises_1.readFile)(bodyPath, "utf8");
        const octokit = new rest_1.Octokit({ auth: process.env.GITHUB_TOKEN });
        await octokit.rest.issues.updateComment({
            owner: context.repo.owner,
            repo: context.repo.repo,
            comment_id: context.commentId,
            body,
        });
    }
    catch (err) {
        core.setFailed(err.message);
    }
}
run();
