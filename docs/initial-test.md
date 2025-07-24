# PR Agent – Initial Testing Guide (Updated)

This guide walks you through **three** levels of validation for the PR-Agent:

1. Provider smoke-tests (no GitHub involved)
2. Local GitHub Actions simulation with **`act`** (uses fake LLM response)
3. Live GitHub repository run

It also explains where timeout handling, inline comments, and follow-up context come into play.

---

## 0. Prerequisites

| Tool | Purpose | Install |
|------|---------|---------|
| **Bun ≥ 1.2** | Build & run TypeScript entry-points | `curl -fsSL https://bun.sh/install | bash` |
| **Node 18+** | Needed by upstream action wrappers | — |
| **PAT (repo scope)** | Lets `act` post comments in local simulation | <https://github.com/settings/tokens> |
| **`act` CLI** | Simulate GitHub Actions locally | `brew install act` or see <https://github.com/nektos/act> |

---

## 1. Clone & bootstrap

```bash
git clone https://github.com/your-org/pr-agent.git
cd pr-agent
cp env.example .env      # fill in keys + model ids (or leave blank for skips)
bun install              # install deps
bun run build            # type-check & transpile
bun test                 # unit + integration tests (integration skips if act missing)
```
You should see **0 errors**. A skipped integration test is fine if `act` is not installed.

---

## 2. Provider smoke-tests *(optional)*

These hit the real APIs **only if** the corresponding environment variables are set; otherwise they print a skip notice.

### Anthropic
```bash
bun run smoke:anthropic "Explain what this repo does"
```

### OpenAI / o3-pro
```bash
bun run smoke:openai "Say hello from o3"
```
If keys or model variables are absent you’ll see:
```
[skip] OPENAI_API_KEY or OPENAI_MODEL not set – skipping OpenAI smoke test
```

---

## 3. Local GitHub Actions simulation (**`act`**)

This path validates the **entire composite action** without real LLMs.

1. Ensure `act` is installed: `act --version`
2. Run the bundled script:
   ```bash
   GITHUB_TOKEN=$PAT ./scripts/act-test.sh
   ```
   What happens:
   * Environment variable `LLM_FAKE_RESPONSE="stub ok"` bypasses real provider calls.
   * `act` feeds `tests/fixtures/issue_comment.json` into the workflow defined in `examples/pr-agent-example.yml`.
   * The workflow runs **prepare → run-agent → update-comment** and exits with status `0`.

> ✨ Timeout handling is still exercised because the provider layer exits immediately with the fake response.

---

## 4. Live GitHub repository test

1. Fork / create a sandbox repo and copy `examples/pr-agent-example.yml` into `.github/workflows/pr-agent.yml`.
2. Add repository **Secrets**:
   * `OPENAI_API_KEY` (optional)
   * `ANTHROPIC_API_KEY` (optional)
3. Push the workflow and open a Pull Request.
4. Comment on the PR:
   ```
   @agent Please review the latest changes.
   ```
   Expected sequence:
   1. **prepare.ts** detects the trigger, posts **“PR Agent is working…”** comment, bundles PR title/body/diff **and** any previous thread replies.
   2. **run-agent.ts** builds the prompt (diff may be truncated to `max_tokens`) and calls the provider (respecting `timeout_ms`).
   3. Summary is written back to the tracking comment. If the LLM included a fenced ```json``` block describing inline comments, **update-comment.ts** leaves those as file-level suggestions via the GitHub Review API.

5. Ask follow-up questions in the same comment thread and re-trigger `@agent` — the new messages are included in `Previously in this conversation:` block so the assistant has context.

---

## 5. Debugging checklist

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| Action skipped | Trigger phrase missing | Comment `@agent ...` or adjust `trigger_phrase` input |
| `⚠️ LLM call failed: ...` | Provider error / timeout | Check API key, model id, or increase `timeout_ms` |
| Inline comments not posted | LLM didn’t emit valid JSON block | Ensure model follows JSON schema `[ { path, position, body } ]` |
| Integration test fails | `act` not on PATH or Docker issues | Install `act`, ensure Docker daemon running |

---

## 6. Where features happen in code

| Feature | File(s) |
|---------|---------|
| Timeout & error handling | `src/llm/openai.ts`, `src/llm/anthropic.ts`, `run-agent.ts` |
| Prompt building & truncation | `src/prompt/builder.ts` |
| Follow-up context harvesting | `prepare.ts` (`ctx.thread`) |
| Inline comments | `src/github/inline.ts`, logic in `run-agent.ts` |
| Fake-response for tests | `run-agent.ts` (checks `LLM_FAKE_RESPONSE`) |

Happy testing! 🚀 