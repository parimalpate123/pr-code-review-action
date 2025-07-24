import { Octokit } from "@octokit/rest";
import * as github from "@actions/github";

export async function upsertTrackingComment(
  octokit: Octokit,
  body: string,
): Promise<number> {
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