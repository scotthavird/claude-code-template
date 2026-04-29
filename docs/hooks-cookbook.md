# Hooks Cookbook

Hooks are shell commands Claude Code runs at specific lifecycle events.
Each hook receives the event payload as JSON on stdin and signals back
via exit code:

- `0` — allow / continue normally
- `2` — block; stderr is surfaced to the model
- anything else — advisory, logged

See the [official hooks reference](https://code.claude.com/docs/en/hooks).

## Events

| Event | When | Can block? | Available since |
|---|---|---|---|
| `SessionStart` | New session opens | no | base |
| `UserPromptSubmit` | User sends a prompt | yes (rare) | base |
| `PreToolUse` | Before Claude calls a tool | yes | base |
| `PostToolUse` | After Claude calls a tool | no, but can mutate output | base; `updatedToolOutput` in v2.1.122 |
| `PostToolUseFailure` | After a tool call errored | no | recent |
| `PreCompact` | Before context is compacted | yes | v2.1.105 |
| `PermissionDenied` | Auto-mode classifier denied a call | no | v2.1.89 |
| `TaskCreated` | A Task was created via TaskCreate | no | v2.1.84 |
| `Notification` | System notification | no | base |
| `Stop` | Session ends | no | base |

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

### 4. Surface session cost on exit (with per-tool timing)

See [`scripts/hooks/session-cost.sh`](../scripts/hooks/session-cost.sh).
Wired to `Stop`. Reads `cost.total_cost_usd` and `num_turns` from stdin,
prints a one-liner to stderr. As of v2.1.121, `PostToolUse` payloads
include `duration_ms`; the script now tails `logs/PostToolUse-events.jsonl`
to add a "top tools by time" breakdown.

### 5. Save a checkpoint before context compaction

See [`scripts/hooks/pre-compact.sh`](../scripts/hooks/pre-compact.sh).
Wired to `PreCompact` (v2.1.105+). Writes `.claude/checkpoints/pre-compact-*.md`
with branch, dirty file count, and last commit. Permissive by default
(always exits 0). Customize the block-conditions if you want compaction
gated on, e.g., "no in-progress refactor without tests".

### 6. Redact secrets from tool output

See [`scripts/hooks/redact-secrets.sh`](../scripts/hooks/redact-secrets.sh).
Wired to `PostToolUse` matcher `Bash|Read|Grep`. Demonstrates the
v2.1.122 `hookSpecificOutput.updatedToolOutput` field — the hook rewrites
the tool result the model sees, replacing secret-shaped strings (API
keys, JWTs, AWS access keys, GitHub PATs, Slack tokens) with
`[REDACTED-*]` markers. Fail-open: leaves output untouched on parse error.

### Conditional `if` field on hooks (v2.1.85+)

Hooks can be filtered with an `if` clause using permission rule syntax:

```json
{
  "matcher": "Bash",
  "if": "Bash(git push:*)",
  "hooks": [
    { "type": "command", "command": "bash scripts/hooks/notify-push.sh" }
  ]
}
```

The hook only fires when the matched call satisfies the `if` rule. Useful
for narrow filters that would otherwise need shell-level matching inside
the hook script.

### Calling MCP tools from hooks (v2.1.118+)

Hooks can invoke MCP tools directly without spawning a subprocess:

```json
{
  "type": "mcp_tool",
  "server": "memory",
  "tool": "store_observation",
  "arguments": { "kind": "session_start" }
}
```

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
