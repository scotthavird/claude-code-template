# Permission Modes

A permission mode decides which tool calls run without asking. Deny rules
(`permissions.deny`) block in every mode, including `bypassPermissions`.

See the official [permission modes](https://code.claude.com/docs/en/permission-modes)
and [configure auto mode](https://code.claude.com/docs/en/auto-mode-config) docs.

## The modes

| Config value              | UI name            | What runs without asking                                                                                                              |
| ------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| `default` (also `manual`) | Manual             | Reads, plus anything matched by `permissions.allow`                                                                                   |
| `acceptEdits`             | Accept edits       | Reads, file edits, and common filesystem commands (`mkdir`, `mv`, `cp`, …) in scope                                                   |
| `plan`                    | Plan               | Reads only. Edits wait until you approve a plan. When auto mode is available, the classifier can approve commands it judges read-only |
| `auto`                    | Auto               | Everything, with each action reviewed by the auto mode classifier                                                                     |
| `dontAsk`                 | Don't ask          | Reads in the working directories and pre-approved tools. Anything that would prompt is denied                                         |
| `bypassPermissions`       | Bypass permissions | Everything. Only for throwaway containers and VMs                                                                                     |

**Manual is the old "default".** v2.1.200 renamed the `default` mode to
Manual in the CLI, `--help`, VS Code and JetBrains. `"defaultMode": "manual"`
and `--permission-mode manual` work alongside `default`. Shared settings
files should keep `default`, because CLIs older than v2.1.200 don't accept
`manual`.

## Auto mode is the default now

If no permission mode is configured, the session starts in:

- **auto** in interactive terminal and VS Code sessions. This applies to
  every plan and provider from v2.1.284; v2.1.283 had already made it the
  default on third-party providers and with telemetry off.
- **Manual** (`default`) under `claude -p` and the Agent SDK (v2.1.302+).
  A call that needs approval is denied unless a rule, hook, `canUseTool`
  or `--permission-prompt-tool` allows it.
- **Manual** whenever auto mode is unavailable, for example when an
  administrator has disabled it. Since v2.1.323, a requested `auto` mode
  that isn't available falls back to Manual, which asks first.

`permissions.defaultMode` still overrides the built-in default, with two
exceptions in project files.

### Project files can't turn on auto or bypass

In `.claude/settings.json` and `.claude/settings.local.json`,
`"defaultMode": "auto"` and `"defaultMode": "bypassPermissions"` are
ignored (bypass since v2.1.257). A repo you clone can't grant itself
more autonomy. Put those values in `~/.claude/settings.json`, or pass
`--permission-mode` on the command line. Every other value works in
project files, and project values outrank `~/.claude/settings.json`.

VS Code never reads project settings for the starting mode. Use the
`claudeCode.initialPermissionMode` VS Code setting instead.

**Plugins can't set it either.** A plugin install brings commands, agents
and skills but no `permissions` block. Users who install this template as
a plugin get whatever their own settings or the built-in default say,
which is auto on a current CLI.

## Switching modes

- **Shift+Tab** cycles modes. From `auto`, the first press goes to Manual,
  then `acceptEdits`, then `plan`. `auto` sits at the end of the cycle
  when it is available. `bypassPermissions` appears in the cycle only if
  the session started with it enabled. `dontAsk` never appears.
- **At launch:** `claude --permission-mode <mode>`. The choices are
  `manual`, `acceptEdits`, `plan`, `auto`, `dontAsk` and
  `bypassPermissions`.
- **In settings:** `permissions.defaultMode`, subject to the
  project-file rule above.

## Configuring auto mode

The classifier reads the `autoMode` block from `~/.claude/settings.json`,
managed settings, and the `--settings` flag or Agent SDK. **It ignores
`autoMode` in `.claude/settings.json` and `.claude/settings.local.json`**,
so a checked-in repo can't add its own allow rules. That is why this
template ships no `autoMode` block.

Entries are prose rules, not tool patterns. Include `"$defaults"` to keep
the built-in list for that section. An array without `"$defaults"`
replaces the built-in rules entirely.

```json
{
  "autoMode": {
    "environment": [
      "$defaults",
      "Source control: github.com/your-org and all repos under it"
    ],
    "soft_deny": [
      "$defaults",
      "Never run database migrations outside the migrations CLI"
    ],
    "hard_deny": [
      "$defaults",
      "Never send repository contents to third-party code-review APIs"
    ]
  }
}
```

| Key                | Meaning                                                                                                                | Since    |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------- | -------- |
| `environment`      | Trusted repos, buckets, domains and services, plus context about your org                                              | —        |
| `allow`            | Exceptions to `soft_deny` rules                                                                                        | —        |
| `soft_deny`        | Risky actions that an explicit user request can clear                                                                  | —        |
| `hard_deny`        | Actions blocked even when the user asks for them                                                                       | v2.1.136 |
| `classifyAllShell` | `true` sends every Bash/PowerShell command to the classifier, suspending even narrow allow rules like `Bash(npm test)` | v2.1.193 |

By default, auto mode suspends only broad allow rules that grant
arbitrary code execution, such as `Bash(*)` or wildcarded interpreters.
Narrow rules like the ones in this template's `permissions.allow` still
approve matching commands before the classifier runs. Set
`classifyAllShell` if you want the classifier to see every shell command.

### Tools for auto mode

- **`/auto-mode-setup`** (v2.1.304 on every provider): reads the project
  and your recent sessions in it, drafts `environment` entries, and writes
  them to `~/.claude/settings.json` if you accept.
- **`claude auto-mode defaults`** prints the built-in rules as JSON.
  `--label '<prefix>'` shows one rule.
- **`claude auto-mode config`** prints the effective rules after your
  settings are applied.
- **`claude auto-mode critique`** reviews your custom rules for
  ambiguity and redundancy.
- **`claude auto-mode reset`** (v2.1.212) removes the `autoMode` block
  from your user settings. `--yes` skips the confirmation.
- **`/permissions` → Auto mode tab** (v2.1.246) lets you view and edit
  rules. Changes are saved to `~/.claude/settings.json`.

### When the classifier blocks something

- A denial reason appears in the transcript, the toast and `/permissions`
  (v2.1.193), for example `Auto mode: [Data Exfiltration]`. The bracketed
  text is the name of the rule that matched.
- **`/permissions` → Recently blocked** shows the exact command. Press `r`
  to approve it and let Claude retry. Approving doesn't add a rule.
- The `PermissionDenied` hook receives the blocked call's `tool_input`.
- After 3 blocks in a row, or 20 in total, auto mode pauses and Claude
  Code goes back to prompting.

### Keep a human checkpoint in auto mode

Explicit `ask` rules are evaluated before the classifier and always
prompt, even in auto mode:

```json
{
  "permissions": {
    "ask": ["Bash(git push *)", "Bash(gh pr create *)"]
  }
}
```

## This template's default

`.claude/settings.json` sets **no** `permissions.defaultMode`. Here is why:

- The option it would want, `auto`, is ignored in project files. Pinning
  `default` would therefore force Manual on everyone who opens the repo,
  and because project settings outrank user settings, it would override
  a user who chose `auto` in `~/.claude/settings.json`.
- Without a pin, a fork behaves the same way as a plugin install, which
  can't carry `defaultMode` anyway. Both follow the user's own setting or
  the built-in default, which is auto in the terminal and Manual in `-p`.
- The guardrails still apply in every mode. These are the
  `permissions.deny` rules, the `block-dangerous-bash.sh` PreToolUse hook
  and `redact-secrets.sh`.

To pin Manual for yourself in this repo, set `"defaultMode": "default"`
in `.claude/settings.local.json`; the example file has it commented out.
To pin it for the whole team, put the same value in
`.claude/settings.json`.
