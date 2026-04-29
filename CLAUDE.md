# Claude Code Template — Project Memory

## Overview

A comprehensive, opinionated Claude Code template. Designed to be installed
as a plugin or forked as a starting point. Everything here aligns with the
[official Claude Code docs](https://code.claude.com/docs/en/overview).

## Directory map

```
.claude-plugin/           plugin.json + marketplace.json → makes this installable
.claude/
├── commands/             slash commands (/commit, /pr, /review, /debug, …)
├── agents/               subagents (security-auditor, debugger, pr-reviewer, …)
├── skills/               auto-triggered skills (test-writing, accessibility, …)
├── output-styles/        concise, educational, review
├── statusline/           status line script
├── settings.json         hooks, permissions, MCP wiring (shared)
└── settings.local.json.example  → copy to settings.local.json (gitignored)
.devcontainer/            devcontainer + egress firewall
.github/workflows/        claude.yml (@claude mentions) + claude-review.yml (auto-PR review)
.gitlab-ci.yml            GitLab CI equivalent
.mcp.json                 project-scoped MCP servers
docs/                     mirrored condensed versions of key official docs
sdk/                      Agent SDK starters (TypeScript + Python)
scripts/
├── hooks/                real hook scripts (format, block-dangerous, inject-context, cost)
├── log-hook-event.sh     JSONL event logger
├── analyze-logs.py       log analyzer
└── ci-review.sh          headless-mode PR review example
```

## Slash commands

| Command | Purpose |
|---|---|
| `/analyze-project` | Project structure overview |
| `/commit` | Conventional commit with auto-generated message |
| `/pr` | Open a PR with auto-generated description |
| `/test` | Run tests with coverage |
| `/lint-fix` | Auto-fix linter issues |
| `/review` | Review current branch / PR via `pr-reviewer` subagent |
| `/security-review` | Security audit of the diff via `security-auditor` |
| `/debug` | Trace bug to root cause via `debugger` |
| `/refactor` | Plan a refactor via `refactor-planner` |
| `/explain` | Explain a file / symbol / concept |
| `/doc` | Generate docs via `doc-generator` |
| `/implement-issue` | Read a GitHub issue and implement it end-to-end |

## Subagents

| Agent | Purpose |
|---|---|
| `security-auditor` | OWASP scan, secrets detection, dependency vulns |
| `doc-generator` | README / JSDoc / TSDoc / Python docstrings / architecture |
| `test-runner` | Run the suite, summarize failures |
| `pr-reviewer` | End-to-end PR review with severity tags |
| `refactor-planner` | Sequenced, reversible refactor plan |
| `debugger` | Root cause analysis, not symptom patching |
| `dependency-auditor` | CVEs, deprecation, license risk |

## Skills (auto-triggered)

| Skill | Triggers on |
|---|---|
| `code-review` | Code review / PR / pre-commit context |
| `db-migration` | Schema changes, ORM model work |
| `test-writing` | Writing or discussing tests |
| `api-design` | HTTP/REST/GraphQL/RPC interface work |
| `performance-audit` | Profiling, optimization, hot paths |
| `accessibility` | UI work (WCAG 2.2 AA baseline) |
| `effort-aware` | Adapts to `${CLAUDE_EFFORT}` (v2.1.120+) — calibrate scope |

## Hooks

Configured in `.claude/settings.json`. All hooks receive the event
payload as JSON on stdin.

| Event | Script | Effect |
|---|---|---|
| `SessionStart` | `inject-context.sh` | Injects branch + recent commits + open PRs |
| `PreToolUse` (Bash) | `block-dangerous-bash.sh` | Blocks destructive shell patterns |
| `PostToolUse` (Edit\|Write) | `format-on-save.sh` | Runs Prettier / Ruff / gofmt / rustfmt |
| `PostToolUse` (Bash\|Read\|Grep) | `redact-secrets.sh` | Rewrites tool output via `updatedToolOutput` (v2.1.122) to redact secrets |
| `PreCompact` | `pre-compact.sh` | Saves a checkpoint to `.claude/checkpoints/` before compaction (v2.1.105) |
| `Stop` | `session-cost.sh` | Cost summary + per-tool `duration_ms` breakdown (v2.1.121) |
| All events | `log-hook-event.sh` | JSONL logging for later analysis |

See [docs/hooks-cookbook.md](docs/hooks-cookbook.md) for details.

## Permission modes

Default is `default` (prompts on every unlisted Bash / file write).
Switch per session with `/mode <name>` or `--permission-mode <name>`.
Modes: `default`, `acceptEdits`, `plan`, `bypassPermissions`, `auto`
(v2.1.111+ — classifier-based).

See [docs/permission-modes.md](docs/permission-modes.md).

## MCP servers

Declared in `.mcp.json`. Opted in via `enabledMcpjsonServers` in
`settings.json`:

| Server | `alwaysLoad` | What it does |
|---|---|---|
| `filesystem` | yes | Sandboxed file access rooted at project dir |
| `git` | yes | Git log/diff/blame/show operations |
| `memory` | no | Persistent knowledge graph across sessions |
| `fetch` | no | Fetch web content as markdown |

`alwaysLoad: true` (v2.1.122) skips tool-search deferral so these tools
are always available without `@`-mention discovery.

## Memory

Two independent systems:

1. **CLAUDE.md (this file)** — committed, shared, human-authored. Acts as
   persistent system prompt.
2. **Auto memory** at `~/.claude/projects/.../memory/` — Claude builds
   this as it learns about the project. Not committed. Inspect/edit it
   directly if needed.

## Themes

`.claude/themes/anthropic-clay.json` — a warm, low-contrast theme that
auto-adapts to light/dark terminals. Switch with `/theme` (v2.1.118+).

## Plugin executables (`bin/`)

`bin/claude-template-info` — example of a plugin-shipped executable
that goes on the Bash tool's `$PATH` when this plugin is installed
(v2.1.91+). Run it from any session to get a one-page summary of what
this template provides.

## DevContainer

`.devcontainer/` includes:
- Node 20 base + Python 3.12 + Docker-in-Docker
- VS Code extensions pre-installed (Claude Code, Prettier, ESLint, Ruff, GH Actions, GH PRs)
- `init-firewall.sh` — egress allowlist (Anthropic API, GitHub, npm, PyPI only)
- Mounts `~/.claude` so your global settings/auto-memory persist across rebuilds

Disable the firewall with `DISABLE_CLAUDE_FIREWALL=1` if you need broader
network access (e.g. package proxies).

## CI/CD

- **GitHub Actions** (`.github/workflows/`):
  - `claude.yml` — `@claude` mentions in issues/PRs
  - `claude-review.yml` — automatic review on new PRs
- **GitLab CI** (`.gitlab-ci.yml`): equivalent MR review pipeline
- **Headless** (`scripts/ci-review.sh`): one-shot `claude -p` example

All require `ANTHROPIC_API_KEY` in CI secrets.

## Agent SDK

See [`sdk/`](sdk/) for TypeScript and Python starters. Use the SDK when
the CLI isn't the right surface (long-running services, custom tools,
embedding the agent loop in your own product).

## Getting started

1. Copy `.claude/settings.local.json.example` → `.claude/settings.local.json`.
   Put your `ANTHROPIC_API_KEY` there (or use `claude /login`).
2. Open in VS Code / Cursor and reopen in container, OR install Claude
   Code locally and run `claude` in the repo root.
3. Try: `/analyze-project`, then `/review` on a branch.

## Full docs

- [Best practices](docs/best-practices.md)
- [Permission modes](docs/permission-modes.md)
- [Hooks cookbook](docs/hooks-cookbook.md)
- [Plugins](docs/plugins.md)
- [Agent SDK](docs/agent-sdk.md)
- [Integrations](docs/integrations.md)
- [`.claude/` directory](docs/claude-directory.md)
