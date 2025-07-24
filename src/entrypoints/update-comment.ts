#!/usr/bin/env node
import * as core from "@actions/core";
import { Octokit } from "@octokit/rest";
import { readFile } from "fs/promises";

interface RepoInfo {
  owner: string;
  repo: string;
}

interface Context {
  repo: RepoInfo;
  commentId: number;
}

function getArgValue(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  return idx !== -1 && process.argv.length > idx + 1 ? process.argv[idx + 1] : undefined;
}

function getInputOrArg(name: string, flag: string): string | undefined {
  return (
    getArgValue(flag) ||
    core.getInput(name) ||
    process.env[name.toUpperCase()]
  );
}

async function run() {
  try {
    // Support both input and CLI args for context_file and body_file
    const contextPath = getInputOrArg("context_file", "--context_file");
    const bodyPath = getInputOrArg("body_file", "--body_file");

    if (!contextPath || !bodyPath) {
      throw new Error("context_file and body_file must be provided either as input or CLI args.");
    }

    const context: Context = JSON.parse(await readFile(contextPath, "utf8"));
    const body: string = await readFile(bodyPath, "utf8");

    const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

    await octokit.rest.issues.updateComment({
      owner: context.repo.owner,
      repo: context.repo.repo,
      comment_id: context.commentId,
      body,
    });
  } catch (err: any) {
    core.setFailed(err.message);
  }
}

run();
