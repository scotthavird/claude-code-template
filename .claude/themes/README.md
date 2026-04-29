# Themes

Custom themes shipped with this template. Switch with `/theme` from
inside a session, or set the default in `~/.claude/settings.json`.

| Theme | Notes |
|---|---|
| `anthropic-clay` | Warm, low-contrast. Auto-adapts to light/dark terminal background. |

Plugins can ship themes via a `themes/` directory at the plugin root.
This template's `.claude-plugin/plugin.json` registers `themes:` so any
JSON file dropped here is picked up.

See [official themes docs](https://code.claude.com/docs/en/settings#themes).
