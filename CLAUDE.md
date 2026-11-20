# Claude Code Template — Project Memory

## Overview

A comprehensive, opinionated Claude Code template. Designed to be installed
as a plugin or forked as a starting point. Everything here aligns with the
[official Claude Code docs](https://code.claude.com/docs/en/overview).

## Directory map

```
.claude-plugin/           plugin.json + marketplace.json → makes this installable
.claude/
├── commands/             slash commands (/commit, /pr, /pr-review, /debug, …)
├── agents/               subagents (security-auditor, debugger, pr-reviewer, …)
├── skills/               auto-triggered skills (test-writing, accessibility, …)
├── output-styles/        concise, educational, review
├── statusline/           status line script
├── settings.json         hooks, permissions, MCP wiring (shared)
└── settings.local.json.example  → copy to settings.local.json (gitignored)
.devcontainer/            devcontainer + egress firewall
.github/workflows/        claude.yml (@claude mentions) + claude-review.yml (auto-PR review) + plugin-validate.yml + showcase-publish.yml (film → R2)
.gitlab-ci.yml            GitLab CI equivalent
.mcp.json                 project-scoped MCP servers
docs/                     mirrored condensed versions of key official docs
sdk/                      Agent SDK starters (TypeScript + Python)
showcase/                 Feature Showcase Pipeline: spec.yaml → real recording → Remotion film + docs/features/
scripts/
├── hooks/                real hook scripts (format, block-dangerous, inject-context, notify-agent, cost)
├── agents-status.sh      summarize `claude agents --json` (table, tmux line, blocked list)
├── log-hook-event.sh     JSONL event logger
├── analyze-logs.py       log analyzer
└── ci-review.sh          headless-mode PR review example
```

## Slash commands

| Command            | Purpose                                                                                                                                               |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/analyze-project` | Project structure overview                                                                                                                            |
| `/commit`          | Conventional commit with auto-generated message                                                                                                       |
| `/pr`              | Open a PR with auto-generated description                                                                                                             |
| `/test`            | Run tests with coverage                                                                                                                               |
| `/lint-fix`        | Auto-fix linter issues                                                                                                                                |
| `/pr-review`       | Review current branch / PR via `pr-reviewer` subagent (was `/review`; renamed because built-in `/review` is now an alias of `/code-review`, v2.1.223) |
| `/security-audit`  | Security audit of the diff via `security-auditor`                                                                                                     |
| `/debug`           | Trace bug to root cause via `debugger`                                                                                                                |
| `/refactor`        | Plan a refactor via `refactor-planner`                                                                                                                |
| `/explain`         | Explain a file / symbol / concept                                                                                                                     |
| `/doc`             | Generate docs via `doc-generator`                                                                                                                     |
| `/implement-issue` | Read a GitHub issue and implement it end-to-end                                                                                                       |
| `/showcase`        | Record a real `claude` demo of a feature and render a film + docs page (`showcase/`)                                                                  |
| `/fix-until-green` | Find the test command, record the failing baseline, and hand back a ready-to-paste `/goal` that keeps Claude fixing until the suite passes (v2.1.139) |

## Subagents

| Agent                  | Purpose                                                          |
| ---------------------- | ---------------------------------------------------------------- |
| `security-auditor`     | OWASP scan, secrets detection, dependency vulns                  |
| `doc-generator`        | README / JSDoc / TSDoc / Python docstrings / architecture        |
| `test-runner`          | Run the suite, summarize failures                                |
| `pr-reviewer`          | End-to-end PR review with severity tags                          |
| `refactor-planner`     | Sequenced, reversible refactor plan                              |
| `debugger`             | Root cause analysis, not symptom patching                        |
| `dependency-auditor`   | CVEs, deprecation, license risk                                  |
| `showcase-spec-writer` | Changelog entry → `showcase/features/<slug>/spec.yaml` + fixture |
| `showcase-director`    | Visual QA of rendered showcase stills → spec edits               |

## Skills (auto-triggered)

| Skill               | Triggers on                                                |
| ------------------- | ---------------------------------------------------------- |
| `code-review`       | Code review / PR / pre-commit context                      |
| `db-migration`      | Schema changes, ORM model work                             |
| `test-writing`      | Writing or discussing tests                                |
| `api-design`        | HTTP/REST/GraphQL/RPC interface work                       |
| `performance-audit` | Profiling, optimization, hot paths                         |
| `accessibility`     | UI work (WCAG 2.2 AA baseline)                             |
| `effort-aware`      | Adapts to `${CLAUDE_EFFORT}` (v2.1.120+) — calibrate scope |

## Hooks

Configured in `.claude/settings.json`. All hooks receive the event
payload as JSON on stdin.

| Event                                     | Script                    | Effect                                                                                                                                                |
| ----------------------------------------- | ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SessionStart`                            | `inject-context.sh`       | Injects branch + recent commits + open PRs; names the session after the branch via `sessionTitle` (v2.1.152)                                          |
| `PreToolUse` (Bash)                       | `block-dangerous-bash.sh` | Blocks destructive shell patterns                                                                                                                     |
| `PostToolUse` (Edit\|Write)               | `format-on-save.sh`       | Runs Prettier / Ruff / gofmt / rustfmt                                                                                                                |
| `PostToolUse` (Bash\|Read\|Grep)          | `redact-secrets.sh`       | Rewrites tool output via `updatedToolOutput` (v2.1.122) to redact secrets                                                                             |
| `PreCompact`                              | `pre-compact.sh`          | Saves a checkpoint to `.claude/checkpoints/` before compaction (v2.1.105)                                                                             |
| `Notification` (prompts, idle, `agent_*`) | `notify-agent.sh`         | Desktop ping via `terminalSequence` OSC 9/777 (v2.1.141) or osascript/notify-send when a session or background agent (v2.1.198) needs you or finishes |
| `Stop`                                    | `session-cost.sh`         | Cost summary + per-tool `duration_ms` breakdown (v2.1.121)                                                                                            |
| All events                                | `log-hook-event.sh`       | JSONL logging for later analysis                                                                                                                      |

See [docs/hooks-cookbook.md](docs/hooks-cookbook.md) for details.

## Parallel and background agents

- `claude agents` lists every background session; `claude --bg "<task>"`,
  `/bg` and `←` send work there; `/fork` copies the conversation into a
  new background session (the old `/fork` is now `/subtask`). See
  [docs/agent-view.md](docs/agent-view.md).
- `scripts/agents-status.sh` reads `claude agents --json`: `--short` for a
  tmux status line, `--blocked` for sessions waiting on you.
- `notify-agent.sh` pings you when a background agent needs input or
  finishes, so you don't have to watch the list.
- `worktree.baseRef: "head"` in `.claude/settings.json` makes new
  worktrees (background sessions, `/fork`, isolated subagents,
  `--worktree`) start from local `HEAD` with unpushed commits, instead of
  the default `"fresh"` (`origin/<default-branch>`).
- Sessions can message each other (`@session-name`, `notify_when_idle`).
  Relayed messages carry no user authority. See
  [docs/cross-session-messaging.md](docs/cross-session-messaging.md).
- `/goal <condition>` keeps one session working until a condition holds;
  `/fix-until-green` sets one up for the test suite. See
  [docs/best-practices.md](docs/best-practices.md#keep-going-until-done-goal).

## Permission modes

`.claude/settings.json` deliberately sets no `permissions.defaultMode`.
Sessions therefore start in the user's own mode or the built-in default:
`auto` in the terminal from v2.1.284, Manual under `claude -p`. Project
files can't select `auto` or `bypassPermissions` anyway.
Switch with Shift+Tab or `--permission-mode <name>`.
Modes: `manual` (config value `default`; renamed in v2.1.200), `acceptEdits`,
`plan`, `auto`, `dontAsk`, `bypassPermissions`. `autoMode` rules are only
read from `~/.claude/settings.json`, managed settings, or `--settings`.

See [docs/permission-modes.md](docs/permission-modes.md).

## MCP servers

Declared in `.mcp.json`. Opted in via `enabledMcpjsonServers` in
`settings.json`:

| Server       | `alwaysLoad` | What it does                                |
| ------------ | ------------ | ------------------------------------------- |
| `filesystem` | yes          | Sandboxed file access rooted at project dir |
| `git`        | yes          | Git log/diff/blame/show operations          |
| `memory`     | no           | Persistent knowledge graph across sessions  |
| `fetch`      | no           | Fetch web content as markdown               |

`alwaysLoad: true` (v2.1.122) skips tool-search deferral so these tools
are always available without `@`-mention discovery.

`filesystem` and `memory` run through `npx`. `git` and `fetch` are Python
packages (`mcp-server-git`, `mcp-server-fetch`) and run through `uvx`, so
you need [uv](https://docs.astral.sh/uv/) installed; the devcontainer
installs it. These two servers have no npm build. The old
`npx @modelcontextprotocol/server-git` / `server-fetch` entries returned
404 and showed up as `CONNECTION_CLOSED`.

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
  - `plugin-validate.yml` — `claude plugin validate` on the plugin manifest (no API key needed)
  - `showcase-publish.yml` — render a showcase film from its `cast.cast` and upload it to R2 over the S3 API (R2 secrets; skips without them)
- **GitLab CI** (`.gitlab-ci.yml`): equivalent MR review pipeline
- **Headless** (`scripts/ci-review.sh`): one-shot `claude -p` example

The review and `@claude` pipelines require `ANTHROPIC_API_KEY` in CI
secrets; the two GitHub workflows skip cleanly without it.

## Agent SDK

See [`sdk/`](sdk/) for TypeScript and Python starters. Use the SDK when
the CLI isn't the right surface (long-running services, custom tools,
embedding the agent loop in your own product).

## Getting started

1. Copy `.claude/settings.local.json.example` → `.claude/settings.local.json`.
   Put your `ANTHROPIC_API_KEY` there (or use `claude /login`).
2. Open in VS Code / Cursor and reopen in container, OR install Claude
   Code locally and run `claude` in the repo root.
3. Try: `/analyze-project`, then `/pr-review` on a branch.

## Full docs

- [Best practices](docs/best-practices.md)
- [Permission modes](docs/permission-modes.md)
- [Hooks cookbook](docs/hooks-cookbook.md)
- [Agent view and background sessions](docs/agent-view.md)
- [Cross-session messaging](docs/cross-session-messaging.md)
- [Plugins](docs/plugins.md)
- [Agent SDK](docs/agent-sdk.md)
- [Integrations](docs/integrations.md)
- [`.claude/` directory](docs/claude-directory.md)
