# The `.claude/` Directory

Everything Claude Code reads from your project lives under `.claude/`.
This is what's in this template and what each piece does.

```
.claude/
├── commands/          slash commands: /commit, /review, /debug, etc.
├── agents/            specialized subagents: debugger, pr-reviewer, ...
├── skills/            auto-triggered context: test-writing, accessibility, ...
├── output-styles/     talk-style presets: concise, educational, review
├── statusline/        bottom-of-terminal status line script
├── settings.json      committed project settings (hooks, perms, MCP wiring)
└── settings.local.json    gitignored personal overrides (from .example)
```

Plus, at the repo root:

```
.claude-plugin/        plugin.json + marketplace.json (makes this installable)
.mcp.json              project-scoped MCP servers
CLAUDE.md              persistent instructions loaded every session
```

## Loading order

When Claude Code starts, it composes settings from (later overrides earlier):

1. Global user settings (`~/.claude/settings.json`)
2. User's home plugins / skills / commands
3. Project `.claude/settings.json` (this repo)
4. Project `.claude/settings.local.json` (your personal, gitignored)
5. CLI flags (`--permission-mode`, `--model`, ...)

Within the same tier, later wins (`settings.local.json` beats `settings.json`).

## Sharing vs. personalizing

- **Share with the team:** `.claude/settings.json`, commands, agents,
  skills, output styles, statusline, MCP.
- **Keep private:** `.claude/settings.local.json` — personal API keys,
  personal permission allowlists, personal hook tweaks.

`.claude/settings.local.json` is gitignored in this template's `.gitignore`.

## See also

- [Official .claude directory doc](https://code.claude.com/docs/en/claude-directory)
- [Settings reference](https://code.claude.com/docs/en/settings)
