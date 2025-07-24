import { buildPrompt } from "../src/prompt/builder";
import { expect, test } from "bun:test";

test("diff truncates when over token limit", () => {
  const longDiff = "a".repeat(5000);
  const prompt = buildPrompt({
    title: "Test PR",
    body: "Body",
    diff: longDiff,
    tokenLimit: 100, // ~400 chars allowed
    repo: { owner: "test-owner", repo: "test-repo" },
    prNumber: 123,
  });
  expect(prompt.includes("(truncated)")).toBe(true);
});

test("template placeholders are replaced correctly", () => {
  const prompt = buildPrompt({
    title: "Fix bug in login",
    body: "This PR fixes a critical bug",
    diff: "- old code\n+ new code",
    tokenLimit: 25000,
    repo: { owner: "myorg", repo: "myrepo" },
    prNumber: 456,
    thread: [{ author: "reviewer", body: "Looks good!" }],
  });
  
  expect(prompt).toContain("myorg/myrepo");
  expect(prompt).toContain("456");
  expect(prompt).toContain("Fix bug in login");
  expect(prompt).toContain("This PR fixes a critical bug");
  expect(prompt).toContain("- old code\n+ new code");
  expect(prompt).toContain("@reviewer: Looks good!");
});

test("empty thread does not leave placeholder", () => {
  const prompt = buildPrompt({
    title: "Test PR",
    body: "Test body",
    diff: "test diff",
    tokenLimit: 25000,
    repo: { owner: "test", repo: "test" },
    prNumber: 1,
    thread: [],
  });
  
  expect(prompt).not.toContain("{{THREAD}}");
}); 