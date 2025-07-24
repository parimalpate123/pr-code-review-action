import { Octokit } from "@octokit/rest";

export interface InlineComment {
  path: string; // file path
  position: number; // line index in patch (1-based)
  body: string; // comment text
}

export async function postInlineReview(
  octokit: Octokit,
  owner: string,
  repo: string,
  pull_number: number,
  comments: InlineComment[],
  summary: string,
) {
  if (comments.length === 0) return;
  await octokit.rest.pulls.createReview({
    owner,
    repo,
    pull_number,
    event: "COMMENT",
    body: summary,
    comments: comments.map((c) => ({ path: c.path, position: c.position, body: c.body })),
  });
} 