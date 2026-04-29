# Permission Modes

Claude Code has four permission modes that govern how tool calls are approved.
Set the default in `.claude/settings.json` under `permissions.defaultMode`
and override per-session with CLI flags or `/mode` inside the session.

See the [official permission modes doc](https://code.claude.com/docs/en/permission-modes).

## `default`

Every tool call that isn't explicitly allow-listed prompts for approval.
Safe choice for a new/unfamiliar repo.

- Every `Bash` command prompts unless matched by `permissions.allow`.
- `Edit` / `Write` prompt for each file change.
- Reads denied by `permissions.deny` are blocked outright.

## `acceptEdits`

Skips prompts for `Edit`, `Write`, `MultiEdit`. Useful when you've decided
you want Claude to just go ahead and make the changes and you'll review
the diff afterward.

- File edits happen silently.
- Bash still prompts.
- Permission denies still apply.

## `plan`

Claude can read and think, but **cannot** make any changes or run any
commands with side effects. Great for "explore this codebase and tell me
how X works" or "plan this refactor". Exits via `ExitPlanMode` once a
plan is approved.

## `bypassPermissions`

No prompts for anything. Claude can run any tool call without approval.
**Only use in sandboxed / ephemeral environments** — a fresh devcontainer,
a Docker container with no mounted credentials, a VM you can burn.

## `auto` (Claude Code v2.1.111+)

A classifier handles permission prompts: safe actions run without
interruption, risky ones get blocked, and ambiguous ones still prompt.
The middle ground between `default` (prompts on everything unlisted)
and `bypassPermissions` (no prompts at all).

Configure custom rules via `autoMode` in settings. Use `"$defaults"` to
extend the built-in lists rather than replace them:

```json
{
  "permissions": { "defaultMode": "auto" },
  "autoMode": {
    "allow": ["$defaults", "Bash(my-internal-tool:*)"],
    "soft_deny": ["$defaults"],
    "environment": ["$defaults"]
  }
}
```

When auto mode denies a call, the new `PermissionDenied` hook (v2.1.89+)
fires and the call appears in `/permissions` Recent tab with a retry
option.

## Switching modes mid-session

```
/mode default
/mode acceptEdits
/mode plan
```

Or via CLI flag:

```bash
claude --permission-mode plan
```

## This template's default

`default` — the safest starting point for a publicly-forked template.
Change it in `.claude/settings.json` once you trust your workflow.
