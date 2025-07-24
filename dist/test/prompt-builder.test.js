"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const builder_1 = require("../src/prompt/builder");
const bun_test_1 = require("bun:test");
(0, bun_test_1.test)("diff truncates when over token limit", () => {
    const longDiff = "a".repeat(5000);
    const prompt = (0, builder_1.buildPrompt)({
        title: "Test PR",
        body: "Body",
        diff: longDiff,
        tokenLimit: 100, // ~400 chars allowed
        repo: { owner: "test-owner", repo: "test-repo" },
        prNumber: 123,
    });
    (0, bun_test_1.expect)(prompt.includes("(truncated)")).toBe(true);
});
(0, bun_test_1.test)("template placeholders are replaced correctly", () => {
    const prompt = (0, builder_1.buildPrompt)({
        title: "Fix bug in login",
        body: "This PR fixes a critical bug",
        diff: "- old code\n+ new code",
        tokenLimit: 25000,
        repo: { owner: "myorg", repo: "myrepo" },
        prNumber: 456,
        thread: [{ author: "reviewer", body: "Looks good!" }],
    });
    (0, bun_test_1.expect)(prompt).toContain("myorg/myrepo");
    (0, bun_test_1.expect)(prompt).toContain("456");
    (0, bun_test_1.expect)(prompt).toContain("Fix bug in login");
    (0, bun_test_1.expect)(prompt).toContain("This PR fixes a critical bug");
    (0, bun_test_1.expect)(prompt).toContain("- old code\n+ new code");
    (0, bun_test_1.expect)(prompt).toContain("@reviewer: Looks good!");
});
(0, bun_test_1.test)("empty thread does not leave placeholder", () => {
    const prompt = (0, builder_1.buildPrompt)({
        title: "Test PR",
        body: "Test body",
        diff: "test diff",
        tokenLimit: 25000,
        repo: { owner: "test", repo: "test" },
        prNumber: 1,
        thread: [],
    });
    (0, bun_test_1.expect)(prompt).not.toContain("{{THREAD}}");
});
