# Status Line

`statusline.sh` renders the one-line status shown at the bottom of the
Claude Code CLI. It receives session context as JSON on stdin and prints
a formatted line to stdout.

Current output:

```
claude · my-repo · ⎇ main* · $0.123
```

Wired up in `.claude/settings.json`:

```json
{
  "statusLine": {
    "type": "command",
    "command": ".claude/statusline/statusline.sh"
  }
}
```

See the [official statusline docs](https://code.claude.com/docs/en/statusline)
for the full stdin schema.
