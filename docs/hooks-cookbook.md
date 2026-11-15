# Hooks Cookbook

Hooks are shell commands Claude Code runs at specific lifecycle events.
Each hook receives the event payload as JSON on stdin and signals back
via exit code:

- `0` — allow / continue normally
- `2` — block; stderr is surfaced to the model
- anything else — advisory, logged

See the [official hooks reference](https://code.claude.com/docs/en/hooks).

## Events

| Event                | When                               | Can block?                | Available since                                                 |
| -------------------- | ---------------------------------- | ------------------------- | --------------------------------------------------------------- |
| `SessionStart`       | New session opens                  | no                        | base                                                            |
| `UserPromptSubmit`   | User sends a prompt                | yes (rare)                | base                                                            |
| `PreToolUse`         | Before Claude calls a tool         | yes                       | base                                                            |
| `PostToolUse`        | After Claude calls a tool          | no, but can mutate output | base; `updatedToolOutput` in v2.1.122                           |
| `PostToolUseFailure` | After a tool call errored          | no                        | recent                                                          |
| `PreCompact`         | Before context is compacted        | yes                       | v2.1.105                                                        |
| `PermissionDenied`   | Auto-mode classifier denied a call | no                        | v2.1.89                                                         |
| `TaskCreated`        | A Task was created via TaskCreate  | no                        | v2.1.84                                                         |
| `Notification`       | System notification                | no                        | base; `agent_needs_input` / `agent_completed` types in v2.1.198 |
| `Stop`               | Session ends                       | no                        | base                                                            |

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
Wired to `SessionStart` with matcher `startup`. Collects branch, recent
commits, dirty file count and open PRs, and returns them as
`hookSpecificOutput.additionalContext`. It also names the session after
the branch with `hookSpecificOutput.sessionTitle` (v2.1.152+), which has
the same effect as `/rename`: the name shows in the prompt box, `/resume`,
agent view rows and `@` mentions for [cross-session messaging](cross-session-messaging.md).

```json
{
  "hookSpecificOutput": {
    "hookEventName": "SessionStart",
    "additionalContext": "## Session context (auto-injected)\n\nBranch: `feature/auth-refactor` ...",
    "sessionTitle": "feature/auth-refactor"
  }
}
```

It skips the title when the payload already has a `session_title` (set by
`--name`, `/rename` or another hook), in background sessions
(`CLAUDE_JOB_DIR` is set; agent view names those from the prompt), on the
default branch, on a detached HEAD, and when `INJECT_CONTEXT_NO_TITLE=1`.
Without `jq` it falls back to printing plain text, which SessionStart also
adds to the context. Tests: `bash scripts/hooks/test-inject-context.sh`.

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

### 7. Desktop notifications for background agents

See [`scripts/hooks/notify-agent.sh`](../scripts/hooks/notify-agent.sh).
Wired to `Notification` with matcher
`permission_prompt|idle_prompt|elicitation_dialog|agent_needs_input|agent_completed`.
`agent_needs_input` and `agent_completed` (v2.1.198+) fire while
[agent view](agent-view.md) is open, when a background session starts
waiting on you or finishes.

Hooks have no controlling terminal, so writing an escape sequence to
`/dev/tty` fails. Since v2.1.141 a hook can return it in
`terminalSequence` and Claude Code writes it for you:

```json
{
  "terminalSequence": "\u001b]9;Agent finished · my-app: flaky-test-fix finished\u0007"
}
```

Claude Code accepts only OSC `0`/`1`/`2` (titles), `9` (iTerm2, WezTerm,
Windows Terminal, ConEmu), `99` (Kitty), `777` (urxvt, Ghostty, Warp) and
a bare BEL. Anything else, including OSC 8 links and colors, makes it
ignore the field. It's written only in interactive sessions (not `-p` or
the SDK) and only from hooks that aren't `async`. Notification hooks
can't block, and Claude Code discards their `systemMessage`, but
`terminalSequence` still fires.

The script picks a method per terminal:

| Terminal                             | Method                                                                   |
| ------------------------------------ | ------------------------------------------------------------------------ |
| WezTerm, Windows Terminal, ConEmu    | OSC 9                                                                    |
| Warp, urxvt                          | OSC 777                                                                  |
| iTerm2, Ghostty, Kitty               | Nothing. `preferredNotifChannel: "auto"` already notifies there natively |
| Terminal.app, VS Code, anything else | `osascript` (macOS) or `notify-send` (Linux), else a bell                |

Set `NOTIFY_AGENT_METHOD` (a variable of this script) to `osc9`, `osc777`,
`osc99`, `desktop`, `bell` or `none` to override it. In tmux 3.3+, add
`set -g allow-passthrough on` to `~/.tmux.conf` so OSC sequences reach
the outer terminal. The message is stripped of control characters before
it goes into the sequence, and `;` is kept out of OSC 777 fields.

Tests: `bash scripts/hooks/test-notify-agent.sh` (stubs `osascript` and
`notify-send`, so nothing pops up).

### Conditional `if` field on hooks (v2.1.85+)

Hooks can be filtered with an `if` clause using permission rule syntax.
`if` belongs on the **hook handler**, next to `type` and `command`, not
on the matcher group:

```json
{
  "matcher": "Bash",
  "hooks": [
    {
      "type": "command",
      "if": "Bash(git push *)",
      "command": "bash scripts/hooks/notify-push.sh"
    }
  ]
}
```

The handler runs only when the call matches the rule. That's useful for
narrow filters that would otherwise need shell-level matching inside the
script. Some rules to keep in mind:

- `if` holds exactly one rule. There is no `&&`, `||` or list syntax, so
  write one handler per condition.
- It is evaluated only on tool events (`PreToolUse`, `PostToolUse`,
  `PostToolUseFailure`, `PermissionRequest`, `PermissionDenied`). On any
  other event, a handler with `if` never runs.
- It is best-effort. Use permission rules, not an `if`-filtered hook, to
  enforce a hard allow or deny.

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

## Behavior changes since v2.1.122

These changes can alter what existing hooks do without any edit on your
side. Check your own hooks against them.

| Version             | Change                                                                                                                                                      | What to do                                                                                      |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| v2.1.176            | `if` path patterns for Read/Edit/Write (`Edit(src/**)`, `Read(.env)`) now match as documented                                                               | Re-test file-path `if` filters that "never fired"                                               |
| v2.1.191            | Comma-separated matchers such as `"Bash,PowerShell"` used to never fire, and now work                                                                       | Prefer `\|` (`"Bash\|PowerShell"`), the documented form                                         |
| v2.1.195            | Hyphenated matchers such as `mcp__brave-search` now match exactly instead of as a substring                                                                 | Write `mcp__brave-search__.*` to match all tools of that server                                 |
| v2.1.214            | A single-segment `dir/**` in an `if` condition matches only `<cwd>/dir`                                                                                     | Write `**/dir/**` for any-depth matching. Permission `deny`/`ask` rules keep any-depth matching |
| v2.1.214            | Exit code 2 now blocks even when the hook's stdout JSON fails schema validation                                                                             | —                                                                                               |
| v2.1.214            | SessionStart reports `source: "fork"` for forked sessions, which used to be `"resume"`                                                                      | Matchers on `resume` no longer fire for forks                                                   |
| v2.1.243            | `if` rules like `Bash(cat *)` no longer fire on unrelated commands that contain `$()` or backticks                                                          | —                                                                                               |
| v2.1.288            | PreToolUse/PermissionRequest hooks whose matching failed, or whose tool input couldn't be serialized, are no longer skipped. The call is blocked instead    | Fail-closed by default for those edge cases                                                     |
| v2.1.299            | `UserPromptSubmit` runs **before** a skill or custom slash command expands, so blocking the prompt also stops the command's embedded `!` shell commands     | Expect the unexpanded `/command args` prompt, not the expanded text                             |
| v2.1.300            | `updatedInput` from PreToolUse/PermissionRequest is validated like Claude's own input. Unknown keys are dropped, and input the tool rejects denies the call | Only return fields the tool's schema knows                                                      |
| v2.1.302 / v2.1.312 | At most 12 prompt or agent hooks of one event run at once, and at most 24 per session including subagents. A `timeout` under 1s counts as 1s                | Command hooks are unaffected                                                                    |
| v2.1.314            | `if` conditions like `Monitor(tail *)` match the Monitor tool's shell commands the same way `Bash(tail *)` matches Bash                                     | —                                                                                               |
| v2.1.319            | PostToolUse hooks run, with up to 10s to finish, on tool calls that finish after a new message interrupts the turn                                          | Keep PostToolUse hooks fast and idempotent                                                      |
| v2.1.323            | If the permission check errors after a PreToolUse hook returned `allow`, Claude Code decides as if no hook had answered                                     | A hook's `allow` doesn't override a failed check                                                |

### Audit of this template's hooks

- The `block-dangerous-bash.sh` entry in `.claude/settings.json` used to
  carry `"if": "Bash(*)"` on the matcher group. `if` is a handler field,
  and `Bash(*)` means the same as `Bash` anyway, so it was removed. The
  `"matcher": "Bash"` already scopes the hook.
- `redact-secrets.sh` relies on `updatedToolOutput` for Bash, Read and
  Grep. Releases after v2.1.122 restrict replacement only for
  `AskUserQuestion` and `ExitPlanMode` results in cloud sessions, so it
  isn't affected.

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
  `UserPromptSubmit`. For other events plain text is ignored — use stderr
  for anything the user should see. JSON output is still read on every
  event, which is how `terminalSequence` works from a `Notification` hook.
- Don't write to `/dev/tty` from a hook; there is no controlling terminal.
  Return `terminalSequence` instead (recipe 7).
- The default timeout is 600s for command, http and `mcp_tool` hooks.
  It drops to 30s on `UserPromptSubmit` and the model-switch events, and
  to 10s on `MessageDisplay`. Prompt hooks get 30s and agent hooks 60s.
  Long-running work should use `async: true` or detach.
- Hooks run with the user's environment and full file access. Treat them
  like any other code in your repo.
- If `jq` is missing, fail open (`exit 0`) — don't block legit tool calls
  over a parse error.
