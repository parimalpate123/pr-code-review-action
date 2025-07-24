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
const rest_1 = require("@octokit/rest");
const core = __importStar(require("@actions/core"));
const github = __importStar(require("@actions/github"));
const comments_1 = require("../github/comments");
const promises_1 = require("fs/promises");
async function run() {
    try {
        console.log("🔍 Starting PR Agent preparation...");
        // Debug environment variables
        console.log("Environment check:");
        console.log("- Event name:", github.context.eventName);
        console.log("- TRIGGER_PHRASE:", process.env.TRIGGER_PHRASE);
        console.log("- GITHUB_TOKEN exists:", !!process.env.GITHUB_TOKEN);
        console.log("- RUNNER_TEMP:", process.env.RUNNER_TEMP);
        const trigger = process.env.TRIGGER_PHRASE || "@agent";
        console.log("- Using trigger:", trigger);
        // Debug the trigger detection
        console.log("GitHub context for trigger detection:");
        console.log("- Event name:", github.context.eventName);
        console.log("- Comment body:", github.context.payload.comment?.body);
        console.log("- Issue body:", github.context.payload.issue?.body);
        console.log("- PR body:", github.context.payload.pull_request?.body);
        // Let's also check what isTriggerPresent is actually checking
        console.log("- Full comment object:", JSON.stringify(github.context.payload.comment, null, 2));
        // Manual trigger check for debugging
        const commentBody = github.context.payload.comment?.body || "";
        const manualCheck = commentBody.includes(trigger);
        console.log("- Manual trigger check:", manualCheck);
        console.log("- Comment includes '@agent':", commentBody.includes("@agent"));
        // Use manual check instead of the faulty isTriggerPresent function
        const shouldRun = manualCheck; // isTriggerPresent(trigger);
        console.log("- Using manual check, should run agent:", shouldRun);
        core.setOutput("run_agent", shouldRun ? "true" : "false");
        if (!shouldRun) {
            console.log("❌ Trigger not present, exiting early");
            return;
        }
        console.log("✅ Trigger detected, proceeding...");
        const octokit = new rest_1.Octokit({ auth: process.env.GITHUB_TOKEN });
        console.log("✅ Octokit initialized");
        // Handle different event types to get PR number
        let prNumber;
        let issueNumber;
        if (github.context.eventName === "pull_request") {
            prNumber = github.context.payload.pull_request?.number;
            console.log("Pull request event - PR number:", prNumber);
        }
        else if (github.context.eventName === "issue_comment") {
            issueNumber = github.context.payload.issue?.number;
            console.log("Issue comment event - Issue number:", issueNumber);
            // Check if this issue is actually a PR
            if (issueNumber) {
                try {
                    console.log("🔍 Checking if issue is a PR...");
                    const issue = await octokit.rest.issues.get({
                        owner: github.context.repo.owner,
                        repo: github.context.repo.repo,
                        issue_number: issueNumber,
                    });
                    if (issue.data.pull_request) {
                        prNumber = issueNumber; // Issue number = PR number for PRs
                        console.log("✅ Issue is a PR, using as PR number:", prNumber);
                    }
                    else {
                        console.log("❌ Issue is not a PR, cannot proceed");
                        throw new Error("Comment is on an issue, not a pull request");
                    }
                }
                catch (error) {
                    console.error("❌ Failed to check if issue is PR:", error);
                    throw error;
                }
            }
        }
        else {
            console.log("❌ Unsupported event type:", github.context.eventName);
            throw new Error(`Unsupported event type: ${github.context.eventName}`);
        }
        if (!prNumber) {
            console.error("❌ No PR number found");
            console.log("Full payload:", JSON.stringify(github.context.payload, null, 2));
            throw new Error("No PR number found in GitHub context");
        }
        console.log("✅ PR number confirmed:", prNumber);
        // Skip tracking comment for now due to permissions issue
        let commentId = null;
        try {
            commentId = await (0, comments_1.upsertTrackingComment)(octokit, `PR Agent is working… \n\n(Trigger phrase \`${trigger}\` detected)`);
            console.log("✅ Tracking comment created/updated, ID:", commentId);
        }
        catch (error) {
            console.log("⚠️ Could not create tracking comment (permissions issue), continuing...");
            console.log("Error:", error.message);
            commentId = null;
        }
        let pr, files;
        try {
            console.log("📥 Fetching PR data...");
            pr = await octokit.rest.pulls.get({
                owner: github.context.repo.owner,
                repo: github.context.repo.repo,
                pull_number: prNumber,
            });
            console.log("✅ PR data fetched, title:", pr.data.title);
            // Get changed files with patch (may be truncated)
            console.log("📥 Fetching changed files...");
            files = await octokit.paginate(octokit.rest.pulls.listFiles, {
                owner: github.context.repo.owner,
                repo: github.context.repo.repo,
                pull_number: prNumber,
                per_page: 100,
            });
            console.log("✅ Files fetched, count:", files.length);
            console.log("Files:", files.map((f) => f.filename).join(", "));
        }
        catch (error) {
            console.error("❌ GitHub API failed:", error);
            throw new Error(`GitHub API failed: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
        const diff = files
            .map((f) => `File: ${f.filename}\n${f.patch ?? ""}`)
            .join("\n\n");
        console.log("✅ Diff generated, length:", diff.length);
        const ctx = {
            repo: github.context.repo,
            commentId,
            prNumber,
            title: pr.data.title,
            body: pr.data.body ?? "",
            diff,
            thread: [],
            userComment: commentBody || "",
        };
        // Collect recent user replies to agent comment for follow-up context
        let comments;
        try {
            console.log("📥 Fetching comments...");
            comments = await octokit.rest.issues.listComments({
                owner: github.context.repo.owner,
                repo: github.context.repo.repo,
                issue_number: prNumber,
            });
            console.log("✅ Comments fetched, count:", comments.data.length);
        }
        catch (error) {
            console.error("❌ Failed to fetch comments:", error);
            throw new Error(`GitHub API failed: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
        const agentIndex = comments.data.findIndex((c) => commentId && c.id === commentId);
        console.log("Agent comment index:", agentIndex);
        if (agentIndex >= 0) {
            const replies = comments.data
                .slice(agentIndex + 1)
                .filter((c) => !c.user?.login?.includes("github-actions"));
            ctx.thread = replies
                .map((r) => ({
                author: r.user?.login ?? "",
                body: r.body ?? "",
            }))
                .slice(-5);
            console.log("✅ Thread context collected, replies:", ctx.thread.length);
        }
        // Debug context object
        console.log("Context object summary:");
        console.log("- repo:", ctx.repo);
        console.log("- commentId:", ctx.commentId);
        console.log("- prNumber:", ctx.prNumber);
        console.log("- title length:", ctx.title?.length ?? 0);
        console.log("- body length:", ctx.body?.length ?? 0);
        console.log("- diff length:", ctx.diff?.length ?? 0);
        console.log("- thread length:", ctx.thread?.length ?? 0);
        const ctxPath = `${process.env.RUNNER_TEMP}/pr-agent-context.json`;
        console.log("📁 Writing context to:", ctxPath);
        const contextJson = JSON.stringify(ctx, null, 2);
        console.log("Context JSON length:", contextJson.length);
        await (0, promises_1.writeFile)(ctxPath, contextJson, "utf8");
        console.log("✅ Context file written successfully");
        // Verify file was written
        try {
            const writtenContent = await (0, promises_1.readFile)(ctxPath, "utf8");
            console.log("✅ File verification: length =", writtenContent.length);
        }
        catch (verifyError) {
            console.error("❌ File verification failed:", verifyError);
        }
        core.setOutput("context_file", ctxPath);
        console.log("✅ Output set: context_file =", ctxPath);
    }
    catch (error) {
        console.error("❌ Fatal error in prepare script:", error);
        core.setFailed(error instanceof Error ? error.message : "Unknown error");
        throw error;
    }
}
run().catch((error) => {
    console.error("❌ Unhandled error:", error);
    process.exit(1);
});
