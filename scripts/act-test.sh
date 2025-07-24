#!/usr/bin/env bash
set -e
export LLM_FAKE_RESPONSE="stub ok"
# Use PAT if available else dummy
export GITHUB_TOKEN=${GITHUB_TOKEN:-ghp_dummy1234567890}

action_dir=$(dirname "$0")/..

act issue_comment -e tests/fixtures/issue_comment.json --workflows examples/pr-agent-example.yml --container-architecture linux/amd64 --input model=o3-pro-2025-06-10 --secret OPENAI_API_KEY=dummy --secret ANTHROPIC_API_KEY=dummy || exit 1 