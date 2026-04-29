# Claude Code Template

An opinionated, comprehensive [Claude Code](https://code.claude.com/) starter
template — installable as a plugin, forkable as a base repo, runnable in a
devcontainer.

Covers: slash commands, subagents, auto-triggered skills, output styles,
status line, hooks, MCP servers, CI/CD (GitHub Actions + GitLab), Agent SDK
examples, devcontainer with egress firewall, and more.

## Install as a plugin

If you already use Claude Code:

```
/plugin install scotthavird/claude-code-template
```

This gives you all commands, agents, skills, output styles, and hooks from
this template, without forking the repo.

## Fork as a base

1. **Use this template** to create a new repo.
2. **Open in a container** — VS Code / Cursor will prompt to "Reopen in Container", or use `Cmd+Shift+P` → *Dev Containers: Reopen in Container*. Claude Code, Prettier, ESLint, Ruff, and GH extensions are pre-installed.
3. **Authenticate** — copy `.claude/settings.local.json.example` → `.claude/settings.local.json` and add your `ANTHROPIC_API_KEY`, or run `claude /login`.
4. **Start a session** — `claude` in the repo root.
5. **Try a command** — `/analyze-project`, `/review`, or `/debug`.

## What's inside

### Slash commands (12)

`/analyze-project` `/commit` `/pr` `/test` `/lint-fix` `/review`
`/security-review` `/debug` `/refactor` `/explain` `/doc` `/implement-issue`

### Subagents (7)

`security-auditor` `doc-generator` `test-runner` `pr-reviewer`
`refactor-planner` `debugger` `dependency-auditor`

### Skills (7, auto-triggered)

`code-review` `db-migration` `test-writing` `api-design`
`performance-audit` `accessibility` `effort-aware`

### Output styles (3)

`concise` `educational` `review`

### Hooks (real, not just logging)

- **Format on save** — Prettier / Ruff / gofmt / rustfmt
- **Block dangerous bash** — destructive patterns, force-push to main, pipe-to-shell (with quote/comment-aware matching)
- **Inject context on session start** — branch, commits, open PRs
- **Redact secrets from tool output** — uses v2.1.122 `updatedToolOutput` to scrub keys/JWTs/PATs before the model sees them
- **PreCompact checkpoint** — saves session state before compaction drops context (v2.1.105+)
- **Session cost on stop** — total cost plus per-tool `duration_ms` breakdown (v2.1.121+)

### CI/CD

- `.github/workflows/claude.yml` — `@claude` mentions in issues/PRs
- `.github/workflows/claude-review.yml` — automatic review on new PRs
- `.gitlab-ci.yml` — GitLab equivalent
- `scripts/ci-review.sh` — headless-mode example

### Agent SDK

`sdk/` has TypeScript and Python starters including a custom-tool example.

### DevContainer

- Node 20 + Python 3.12 + Docker-in-Docker
- Egress firewall (`init-firewall.sh`) restricting outbound network to an
  allowlist (Anthropic API, GitHub, npm, PyPI)
- `~/.claude` mounted so global settings and auto-memory persist

## Directory layout

```
.claude-plugin/      plugin.json + marketplace.json
.claude/             commands, agents, skills, output-styles, statusline, settings
.devcontainer/       container + firewall
.github/workflows/   Claude Code CI
.mcp.json            filesystem, memory, git, fetch
docs/                best-practices, permission-modes, hooks-cookbook, plugins, agent-sdk, integrations
scripts/             hook scripts + log analyzer + CI review
sdk/                 TypeScript + Python SDK starters
CLAUDE.md            persistent system prompt
```

## Documentation

- [Best practices](docs/best-practices.md)
- [Permission modes](docs/permission-modes.md)
- [Hooks cookbook](docs/hooks-cookbook.md)
- [Plugins](docs/plugins.md)
- [Agent SDK](docs/agent-sdk.md)
- [Integrations](docs/integrations.md)
- [The `.claude/` directory](docs/claude-directory.md)

## Customization

### Add a slash command

Create `.claude/commands/my-command.md`:

```markdown
---
description: What this command does
argument-hint: [arg1]
allowed-tools: Bash(git:*), Read
---

Your prompt here. $ARGUMENTS becomes the user's input.
```

### Add a subagent

Create `.claude/agents/my-agent.md`:

```markdown
---
name: my-agent
description: When this agent should be used.
tools: Read, Grep, Glob, Bash
model: sonnet
---

System prompt for the agent...
```

### Add a skill

Create `.claude/skills/my-skill/SKILL.md`:

```markdown
---
name: my-skill
description: Triggers on X, Y, Z contexts.
allowed-tools: Read, Grep
---

Instructions for the skill...
```

## Security notes

- `logs/` is gitignored — hook logs may contain sensitive prompts/outputs.
- `.claude/settings.local.json` is gitignored — put personal API keys there.
- Permission rules deny `Read(.env)`, `Read(./secrets/**)`, `Bash(rm -rf:*)`, `Bash(sudo:*)`, and pipe-to-shell patterns by default.
- The PreToolUse hook `block-dangerous-bash.sh` provides a second layer.
- The devcontainer firewall restricts egress to a fixed allowlist.

## Learn more

- [Claude Code overview](https://code.claude.com/docs/en/overview)
- [Commands](https://code.claude.com/docs/en/commands)
- [Hooks](https://code.claude.com/docs/en/hooks)
- [Skills](https://code.claude.com/docs/en/skills)
- [Subagents](https://code.claude.com/docs/en/sub-agents)
- [Plugins](https://code.claude.com/docs/en/plugins)
- [Settings](https://code.claude.com/docs/en/settings)
- [MCP](https://code.claude.com/docs/en/mcp)
- [Agent SDK](https://code.claude.com/docs/en/agent-sdk/overview)
- [GitHub Actions](https://code.claude.com/docs/en/github-actions)
- [DevContainers](https://code.claude.com/docs/en/devcontainer)

## Contributing

Fork, customize, share. If you add a broadly useful command / skill /
agent, PRs are welcome.

## License

MIT — see [LICENSE](LICENSE).
