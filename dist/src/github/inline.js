"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.postInlineReview = postInlineReview;
async function postInlineReview(octokit, owner, repo, pull_number, comments, summary) {
    if (comments.length === 0)
        return;
    await octokit.rest.pulls.createReview({
        owner,
        repo,
        pull_number,
        event: "COMMENT",
        body: summary,
        comments: comments.map((c) => ({ path: c.path, position: c.position, body: c.body })),
    });
}
