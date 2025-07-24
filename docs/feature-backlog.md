# Feature Backlog

## Token Estimation Improvements

**Problem**: Current token estimation uses a simple `tokenLimit * 4` character-based heuristic for diff truncation. This is safe but coarse, and may not provide optimal use of available context window, especially with larger models or when approaching hard token limits.

## Thread Size Control

**Problem**: Large conversation threads with many back-and-forth messages could crowd out diff content in the prompt. Currently no limits on thread size or individual message length, which could lead to suboptimal context allocation.

## Review Comments Integration (Tentative)

**Problem**: Template includes `<review_comments>` placeholder but this is not currently populated. May want to include existing review comments as additional context for the AI agent.

**Note**: Tentative - unclear if this adds sufficient value to justify the complexity.