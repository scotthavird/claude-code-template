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
| Skills | `.claude/skills/` (7) |
| Output styles | `.claude/output-styles/` (3) |
| Status line | `.claude/statusline/statusline.sh` |
| Hooks | `.claude/settings.json` + `scripts/hooks/` |
| Themes | `.claude/themes/` (1) |
| Bin | `bin/` (1 executable on $PATH when plugin is installed) |
| MCP servers | `.mcp.json` |

### What's new in the plugin spec (v2.1.85 → v2.1.122)

- **`bin/` executables** (v2.1.91): plugins can ship CLI tools that get
  added to the Bash tool's `$PATH` automatically. This template ships
  `bin/claude-template-info` as a demo.
- **`themes/` directory** (v2.1.118): plugins can ship color themes that
  appear in `/theme`. We ship `anthropic-clay`.
- **`monitors` manifest key** (v2.1.105): declare background reactive
  monitors. Not used in this template yet — see the [official plugins
  reference](https://code.claude.com/docs/en/plugins-reference) for the
  schema.
- **`claude plugin tag`** (v2.1.118): create release git tags for the
  plugin with version validation.
- **`claude plugin prune`** (v2.1.122): remove orphaned auto-installed
  plugin dependencies.

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
