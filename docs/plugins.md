# Plugins

This template is packaged as a plugin through `.claude-plugin/plugin.json`.
`.claude-plugin/marketplace.json` makes the repo a marketplace with that one
plugin in it, so you can install it anywhere:

```
/plugin install dev-starter-kit --marketplace scotthavird/claude-code-template
```

The one-step `--marketplace` form needs Claude Code v2.1.275 or later. On
older versions, add the marketplace first with
`/plugin marketplace add scotthavird/claude-code-template`, then run
`/plugin install dev-starter-kit@scotthavird-marketplace`.

See the [official plugins docs](https://code.claude.com/docs/en/plugins)
and the [manifest reference](https://code.claude.com/docs/en/plugins-reference).

## Why the plugin is called `dev-starter-kit`

`claude plugin validate` refuses plugin names that pass as one of
Anthropic's own. That covers any name starting with `claude-`,
`anthropic-` or `cc-plugin-`, and names such as `claude-code`. The repo
keeps its name, but the plugin is `dev-starter-kit`. Its `displayName` is
"Claude Code Template", and its components are namespaced under the plugin
name, for example `/dev-starter-kit:pr-review`.

## What's in this plugin

The template keeps its components under `.claude/` so that the repo works
as an ordinary project too. `plugin.json` points the plugin at those paths
with top-level component keys:

| Component      | Manifest key                                               | Location                                                    |
| -------------- | ---------------------------------------------------------- | ----------------------------------------------------------- |
| Slash commands | `commands`                                                 | `.claude/commands/` (12)                                    |
| Subagents      | `agents` (one entry per file; directories aren't accepted) | `.claude/agents/*.md` (7)                                   |
| Skills         | `skills`                                                   | `.claude/skills/` (7)                                       |
| Output styles  | `outputStyles`                                             | `.claude/output-styles/*.md` (3)                            |
| Themes         | `experimental.themes`                                      | `.claude/themes/anthropic-clay.json` (1)                    |
| Bin            | default location                                           | `bin/` (1 executable on `$PATH` when the plugin is enabled) |
| MCP servers    | default location                                           | `.mcp.json`                                                 |

### What a plugin install does not bring

- **Hooks.** The hook commands in `.claude/settings.json` call
  `bash scripts/...` relative to the project, and those scripts don't
  exist in a project that only installed the plugin. To package them,
  move them into a `hooks/hooks.json` that calls
  `"${CLAUDE_PLUGIN_ROOT}"/scripts/...`.
- **Status line, permissions, `defaultMode`.** These are settings, not
  plugin components. Fork or copy `.claude/settings.json` to get them.
- **`CLAUDE.md`.** A `CLAUDE.md` at the plugin root isn't loaded as
  context, and `claude plugin validate` warns about it. To ship context
  with a plugin, put it in a skill.

### Earlier manifests: the `components` block was ignored

Earlier versions of this manifest nested every path under a `components`
object. Claude Code doesn't recognize that key, so it stripped the block
at load time. Plugin installs then scanned the default root-level
`commands/`, `agents/` and `skills/` folders, which this repo doesn't
have. The manifest now uses top-level keys, and paths start with `./`
as the reference requires.

## Validate the plugin

```bash
claude plugin validate --strict --json .
```

`.github/workflows/plugin-validate.yml` runs this on every PR and push to
`main`. It needs no API key. It fails on any error, and on any warning
except the expected `CLAUDE.md at the plugin root` one, which this repo
accepts because CLAUDE.md is the project memory for people working on the
template itself.

## What's new in the plugin spec (v2.1.123 → v2.1.325)

- **`engines["claude-code"]`** (v2.1.323): a version range for the CLI.
  Plugins outside it aren't installed, updated or loaded, and install
  picks the newest plugin version that fits. This plugin declares
  `>=2.1.323`.
- **`experimental{}`** holds `themes`, `monitors` and `evals`, whose shape
  may still change. A top-level `themes` key still loads but produces a
  validate warning.
- **Validate output**: `--strict` turns warnings into failures, and
  `--json` gives machine-readable output. From v2.1.281 the command also
  checks MCP entries.
- **Reserved names**: names that pass as Anthropic's own plugins are
  errors. A whole-word `claude` anywhere else in the name is a warning.

### Earlier (v2.1.85 → v2.1.122)

- **`bin/` executables** (v2.1.91): files in `bin/` go on the Bash tool's
  `$PATH` while the plugin is enabled. This template ships
  `bin/claude-template-info` as a demo.
- **Themes** (v2.1.118): plugins can ship color themes that appear in
  `/theme`. We ship `anthropic-clay`.
- **`claude plugin tag`** (v2.1.118): creates release git tags with version
  validation.
- **`claude plugin prune`** (v2.1.122): removes orphaned auto-installed
  plugin dependencies.

## Forking this plugin

1. Fork the repo or copy this directory structure into your own.
2. Edit `.claude-plugin/plugin.json`: set your own `name`, `author` and
   `repository`, and keep the name clear of the reserved prefixes.
3. Update the matching entry in `.claude-plugin/marketplace.json`.
4. Bump `version` in both `plugin.json` and `package.json`. Setting
   `version` pins users to it until you change it.
5. Run `claude plugin validate --strict .`.
6. Others install it with
   `/plugin install <name> --marketplace <your-github-user>/<repo>`.

## Versioning and dependencies

`version` lives in `plugin.json`, and `package.json` mirrors it. The
manifest's `version` overrides any version in the marketplace entry. If
the plugin needs other plugins, declare them in `dependencies`. See
[plugin dependencies](https://code.claude.com/docs/en/plugin-dependencies).

## Enabling and disabling

Enable state is stored under `enabledPlugins`, keyed by
`<plugin>@<marketplace>`:

```json
{
  "enabledPlugins": {
    "dev-starter-kit@scotthavird-marketplace": true
  }
}
```

From the shell, use `claude plugin disable <plugin>` and
`claude plugin enable <plugin>`. `claude plugin details <name>` shows the
plugin's component inventory and its projected token cost.
