# Plugins

This template is packaged as a plugin via `.claude-plugin/plugin.json` and
a single-plugin marketplace via `.claude-plugin/marketplace.json`. That
means you can install it anywhere:

```
/plugin install scotthavird/claude-code-template
```

See the [official plugins docs](https://code.claude.com/docs/en/plugins)
and the [marketplace docs](https://code.claude.com/docs/en/plugin-marketplaces).

## What's in this plugin

| Component | Location |
|---|---|
| Slash commands | `.claude/commands/` (12) |
| Subagents | `.claude/agents/` (7) |
| Skills | `.claude/skills/` (6) |
| Output styles | `.claude/output-styles/` (3) |
| Status line | `.claude/statusline/statusline.sh` |
| Hooks | `.claude/settings.json` + `scripts/hooks/` |
| MCP servers | `.mcp.json` |

## Forking this plugin

1. Fork the repo or copy this directory structure into your own.
2. Edit `.claude-plugin/plugin.json` — update `name`, `author`, `repository`.
3. Publish to your own marketplace:
   - Option A: add an entry to your existing `marketplace.json`.
   - Option B: publish the marketplace repo separately — see the
     [marketplace docs](https://code.claude.com/docs/en/plugin-marketplaces).
4. Others install via `/plugin install <your-github-user>/<repo>`.

## Versioning and dependencies

If your plugin depends on specific versions of other plugins or MCP
servers, declare them in `plugin.json`. See
[plugin dependencies](https://code.claude.com/docs/en/plugin-dependencies).

## Disabling components locally

You can enable/disable specific components from a plugin in
`.claude/settings.json`:

```json
{
  "plugins": {
    "claude-code-template": {
      "enabled": true,
      "components": {
        "commands": ["commit", "pr", "review"],
        "agents": true,
        "skills": true
      }
    }
  }
}
```
