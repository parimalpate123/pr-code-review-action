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
exports.upsertTrackingComment = upsertTrackingComment;
const github = __importStar(require("@actions/github"));
async function upsertTrackingComment(octokit, body) {
    const ctx = github.context;
    const { owner, repo } = ctx.repo;
    const issueNumber = ctx.payload.issue?.number ?? ctx.payload.pull_request?.number;
    if (!issueNumber) {
        throw new Error("No issue or PR number found in GitHub context");
    }
    // Look for existing bot comment
    const list = await octokit.rest.issues.listComments({ owner, repo, issue_number: issueNumber });
    const existing = list.data.find((c) => c.user?.login === "github-actions[bot]" && c.body?.includes("PR Agent is working"));
    if (existing) {
        await octokit.rest.issues.updateComment({ owner, repo, comment_id: existing.id, body });
        return existing.id;
    }
    const res = await octokit.rest.issues.createComment({ owner, repo, issue_number: issueNumber, body });
    return res.data.id;
}
