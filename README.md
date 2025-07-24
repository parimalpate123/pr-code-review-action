# PR Agent

GitHub Action that provides AI-powered pull request reviews using Anthropic Claude or OpenAI models.

## Features

- **Multi-provider**: Supports both Anthropic (Claude) and OpenAI (GPT/o3) models
- **Trigger-based**: Activates on configurable phrases (default: `@agent`)
- **Inline comments**: Posts file-specific suggestions via GitHub Review API
- **Context-aware**: Includes conversation history for follow-up questions
- **Timeout handling**: Configurable request timeouts with graceful error messages
- **Diff summarization**: Automatically truncates large diffs to stay within token limits

## Quick Start

Create `.github/workflows/pr-agent.yml`:

```yaml
name: PR Agent
on:
  issue_comment:
    types: [created]

jobs:
  review:
    if: contains(github.event.comment.body, '@agent')
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: leegmoore/pr-agent-action@main
        with:
          model: "claude-sonnet-4-20250514"
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
```

Comment `@agent please review` on any PR to trigger.

## Configuration

### Inputs

| Input | Description | Default |
|-------|-------------|---------|
| `model` | Model ID (determines provider by prefix) | `claude-3-sonnet-20240229` |
| `trigger_phrase` | Phrase that activates the agent | `@agent` |
| `max_tokens` | Token limit before diff truncation | `25000` |
| `timeout_minutes` | Maximum runtime before failure | `30` |

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `ANTHROPIC_API_KEY` | Anthropic API key for Claude models | If using Claude |
| `OPENAI_API_KEY` | OpenAI API key for GPT/o3 models | If using OpenAI |

### Model Selection

Provider is determined by model name prefix:
- `claude-*` → Anthropic API
- `gpt-*`, `o3-*` → OpenAI API

Examples:
- `claude-sonnet-4-20250514`
- `o3-pro-2025-06-10`
- `gpt-4.1-mini-2025-04-14`

## Advanced Features

### Inline Comments

The agent can post file-specific comments by including a JSON block in its response:

```json
[
  {"path": "src/app.ts", "position": 15, "body": "Consider null checking here"},
  {"path": "lib/utils.js", "position": 8, "body": "This function could be optimized"}
]
```

### Follow-up Context

When users reply to the agent's comment, subsequent triggers include the conversation history, enabling contextual follow-ups.

### Error Handling

- API timeouts result in clear error messages in the comment
- Missing API keys cause graceful workflow skips
- Invalid models throw descriptive errors

## Development

```bash
git clone https://github.com/leegmoore/pr-agent-action.git
cd pr-agent-action
bun install
bun run build
bun test
```

### Testing

- `bun run smoke:anthropic` - Test Anthropic provider
- `bun run smoke:openai` - Test OpenAI provider  
- `bun test` - Run unit tests
- `./scripts/act-test.sh` - Integration test with act

## Architecture

The action consists of three phases:

1. **Prepare** (`src/entrypoints/prepare.ts`)
   - Detects trigger phrase
   - Fetches PR metadata and diff
   - Collects conversation context
   - Creates tracking comment

2. **Execute** (`src/entrypoints/run-agent.ts`)
   - Builds prompt with diff truncation
   - Calls selected LLM provider
   - Parses inline comment JSON
   - Posts GitHub Review if inline comments found

3. **Update** (`src/entrypoints/update-comment.ts`)
   - Updates tracking comment with response

### Provider Layer

- `src/llm/openai.ts` - OpenAI API wrapper with timeout
- `src/llm/anthropic.ts` - Anthropic API wrapper with timeout

Both providers support configurable timeouts and return standardized error messages.

## License

MIT 