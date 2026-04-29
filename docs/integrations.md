# Integrations

How this template plugs into the other places Claude Code runs.

## GitHub Actions

`.github/workflows/claude.yml` — responds to `@claude` mentions in PRs,
issues, and review comments.

`.github/workflows/claude-review.yml` — runs a review pass on every new
PR or push to an open PR.

### Lighter alternative: `/ultrareview`

For an alternative to running the full Claude Code action in CI, the
CLI now ships `claude ultrareview <target>` (v2.1.120+) which delegates
review to cloud-managed parallel agents. Findings stream back to the
runner. Cheaper for the runner, slower wall-clock, broader coverage
than a single `claude -p` invocation.

`scripts/ci-review.sh --ultrareview <target>` wraps it.

Both require `ANTHROPIC_API_KEY` in the repo's Actions secrets. **If the
secret is not set, both workflows skip cleanly** (a `check-secret` gate
job emits a workflow notice and the responder/review job is marked
*skipped*, not failed) — so a fresh fork doesn't get red CI on every PR
before you've configured the key. Add the secret at *Settings → Secrets
and variables → Actions* to enable. See the
[Claude Code GitHub Actions doc](https://code.claude.com/docs/en/github-actions).

## GitLab CI/CD

`.gitlab-ci.yml` shows the same pattern for GitLab. See the
[GitLab CI/CD doc](https://code.claude.com/docs/en/gitlab-ci-cd).

## Slack

Mention `@Claude` in Slack and file bug reports / feature requests that
get routed into Claude Code sessions. Requires admin setup on the
workspace. [Slack integration doc](https://code.claude.com/docs/en/slack).

## Chrome DevTools

For web-app debugging, Claude Code can attach to Chrome DevTools to
inspect live pages. [Chrome integration doc](https://code.claude.com/docs/en/chrome).

## Channels (Telegram / Discord / webhooks)

Push events from arbitrary sources into a running session via the
[channels API](https://code.claude.com/docs/en/channels).

## Routines (cloud-scheduled agents)

Templated cloud agents that fire from a cron schedule, GitHub event, or
API call. Available on Claude Code on the web (Week 16, April 2026).
Useful for: morning PR reviews, overnight CI failure analysis, weekly
dependency audits, syncing docs after PRs merge. See
[Routines](https://code.claude.com/docs/en/routines).

## Remote Control

Continue a local session from your phone or another device with
[Remote Control](https://code.claude.com/docs/en/remote-control).

## IDE plugins

- [VS Code](https://code.claude.com/docs/en/vs-code)
- [JetBrains](https://code.claude.com/docs/en/jetbrains)
- [Desktop app](https://code.claude.com/docs/en/desktop)
- [Web (claude.ai/code)](https://code.claude.com/docs/en/claude-code-on-the-web)

All of these read the same `.claude/`, `CLAUDE.md`, and `.mcp.json` in
this repo.

## Enterprise / cloud providers

This template runs against any configured provider. Pick one:

| Provider | Docs |
|---|---|
| Anthropic API (default) | [authentication](https://code.claude.com/docs/en/authentication) |
| Amazon Bedrock | [Bedrock setup](https://code.claude.com/docs/en/amazon-bedrock) |
| Google Vertex AI | [Vertex setup](https://code.claude.com/docs/en/google-vertex-ai) |
| Microsoft Foundry | [Foundry setup](https://code.claude.com/docs/en/microsoft-foundry) |
| Self-hosted LLM gateway | [LLM gateway](https://code.claude.com/docs/en/llm-gateway) |

Set via env vars (`CLAUDE_CODE_USE_BEDROCK=1`, `CLAUDE_CODE_USE_VERTEX=1`,
etc.) in `.claude/settings.local.json`.
