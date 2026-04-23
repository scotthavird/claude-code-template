# Hooks Cookbook

Hooks are shell commands Claude Code runs at specific lifecycle events.
Each hook receives the event payload as JSON on stdin and signals back
via exit code:

- `0` — allow / continue normally
- `2` — block; stderr is surfaced to the model
- anything else — advisory, logged

See the [official hooks reference](https://code.claude.com/docs/en/hooks).

## Events

| Event | When | Can block? |
|---|---|---|
| `SessionStart` | New session opens | no |
| `UserPromptSubmit` | User sends a prompt | yes (rare) |
| `PreToolUse` | Before Claude calls a tool | yes |
| `PostToolUse` | After Claude calls a tool | no |
| `Notification` | System notification | no |
| `Stop` | Session ends | no |

## Recipes

### 1. Format files on save

See [`scripts/hooks/format-on-save.sh`](../scripts/hooks/format-on-save.sh).
Wired to `PostToolUse` with matcher `Edit|Write|MultiEdit`. Runs Prettier /
Ruff / gofmt / rustfmt based on file extension.

### 2. Block dangerous bash

See [`scripts/hooks/block-dangerous-bash.sh`](../scripts/hooks/block-dangerous-bash.sh).
Wired to `PreToolUse` with matcher `Bash`. Returns exit 2 for patterns
like `rm -rf /`, force-push to main, pipe-to-shell from the internet.

### 3. Inject project context at session start

See [`scripts/hooks/inject-context.sh`](../scripts/hooks/inject-context.sh).
Wired to `SessionStart` with matcher `startup`. Prints branch, recent
commits, dirty file count, open PRs to stdout — injected into the session.

### 4. Surface session cost on exit

See [`scripts/hooks/session-cost.sh`](../scripts/hooks/session-cost.sh).
Wired to `Stop`. Reads `cost.total_cost_usd` and `num_turns` from stdin,
prints a one-liner to stderr.

## Payload shapes

All hook payloads share these fields:

```json
{
  "session_id": "...",
  "tool_name": "Bash",
  "tool_input": { ... },
  "tool_output": { ... }
}
```

`Stop` adds cost info:

```json
{
  "num_turns": 12,
  "cost": { "total_cost_usd": 0.42, "total_duration_ms": 82000 }
}
```

## Gotchas

- Hook stdout is **injected into the conversation** for `SessionStart` and
  `UserPromptSubmit`. For other events it's ignored — use stderr for
  anything the user should see.
- Hooks have a 30s timeout by default. Long-running work should detach.
- Hooks run with the user's environment and full file access. Treat them
  like any other code in your repo.
- If `jq` is missing, fail open (`exit 0`) — don't block legit tool calls
  over a parse error.
