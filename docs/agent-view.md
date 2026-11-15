# Agent View and Background Sessions

A condensed guide to running several Claude Code sessions in parallel and
checking on them from one screen. Agent view is a research preview, so
keys and behavior still change between releases. The
[official agent view doc](https://code.claude.com/docs/en/agent-view) has
the full details and a version history.

Everything below was checked against Claude Code v2.1.325.

## The pieces

| Piece                  | What it is                                                                   | Since                                                         |
| ---------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `claude agents`        | Full-screen list of every background session, grouped by state               | v2.1.139                                                      |
| `claude --bg "<task>"` | Start a session straight in the background (`--background` is the long form) | v2.1.140 or earlier                                           |
| `/background` (`/bg`)  | Move the session you're in to the background and free the terminal           | v2.1.141 or earlier                                           |
| `←` on an empty prompt | Background the current session and open agent view in one step               | v2.1.196 (single press)                                       |
| `/fork`                | Copy the conversation into a new background session; you keep working        | v2.1.212                                                      |
| `/subtask`             | What `/fork` used to do: a forked subagent inside this session               | v2.1.212                                                      |
| `claude agents --json` | The supported way to read session state from a script                        | v2.1.145 (`--all`, `state`: v2.1.169; `waitingFor`: v2.1.162) |

A background session is a full Claude Code conversation that a separate
supervisor process keeps running, so you can close agent view or your
shell and the work continues. Each one uses your quota on its own, so ten
parallel sessions spend roughly ten times as fast as one.

## Quick start

```bash
# Dispatch two tasks from the shell
claude --bg --name flaky-test "investigate the flaky SettingsChangeDetector test"
claude --bg --name deps "upgrade eslint to the latest major and fix the fallout"

# See them
claude agents
```

`claude --bg` prints a short id and the commands that take it:

```text
backgrounded · 7c5dcf5d · flaky-test
  claude agents             list sessions
  claude attach 7c5dcf5d    open in this terminal
  claude logs 7c5dcf5d      show recent output
  claude stop 7c5dcf5d      stop this session
```

The prompt is a positional argument. `--bg` with `-p` is rejected, because
`-p` never starts the interactive session that agent view attaches to. To
run a plain shell command as an attachable job instead of a Claude
session, use `claude --bg --exec 'pytest -x'`.

Inside agent view, type a prompt at the bottom and press `Enter` to
dispatch another session. Every `Enter` starts a new session; it doesn't
send a follow-up to an existing one.

## Reading the list

Rows are grouped as **Ready for review** (open PR that needs review or has
failing checks), **Needs input**, **Working** and **Completed**. Pinned
sessions sit on top.

| State       | Meaning                                                                   |
| ----------- | ------------------------------------------------------------------------- |
| Working     | Running tools or writing a response                                       |
| Needs input | Waiting on a question, a permission decision, a sandbox or MCP prompt     |
| Idle        | Nothing to do, ready for your next prompt                                 |
| Completed   | Finished successfully                                                     |
| Failed      | Ended with an error                                                       |
| Stopped     | Stopped with `Ctrl+X` / `claude stop`, or ended while the service was off |

A `#1234` label at the right edge links the session's pull request. Its
color tracks the PR: yellow while checks or review are pending, green when
checks pass, purple once merged, grey for drafts and closed PRs.

## Keys worth learning first

| Key                | Action                                                      |
| ------------------ | ----------------------------------------------------------- |
| `Space`            | Peek: last output or the pending question, with a reply box |
| `Enter` / `→`      | Attach to the full session                                  |
| `←` (empty prompt) | Detach back to the list (the session keeps running)         |
| `Ctrl+T`           | Pin a session and keep its process alive while idle         |
| `Ctrl+R`           | Rename                                                      |
| `Ctrl+S`           | Group by directory instead of state                         |
| `Ctrl+X` `Ctrl+X`  | Stop, then delete (see [Cleanup](#cleanup))                 |
| `Ctrl+F`           | Find by name (v2.1.288+)                                    |
| `?`                | All shortcuts                                               |

Filters typed into the input: `s:blocked` (everything waiting on you),
`s:working`, `a:<agent>`, `n:<text>` (name or first prompt, v2.1.287+),
`o:<text>` (result text), or a PR number such as `#1234`. Combine them
with spaces, for example `s:blocked a:pr-reviewer`.

Dispatch shortcuts in the input:

- `@pr-reviewer review PR 42` or `pr-reviewer review PR 42` runs one of
  this template's subagents as the session's main agent.
- `/fix-until-green` and other commands and skills are sent as the new
  session's first prompt.
- `! npm test` runs a shell job instead of a Claude session.
- `/model`, `/effort` and `/fast` set what the next dispatched sessions
  start with.

## `/fork` vs `/subtask` vs subagents

| You want                                                                     | Use                            |
| ---------------------------------------------------------------------------- | ------------------------------ |
| Try a second approach from the same context, in parallel, as its own session | `/fork <instruction>`          |
| A side investigation inside this session that reports back                   | `/subtask` or a subagent       |
| A specialist with its own prompt and tool limits                             | A subagent (`.claude/agents/`) |
| Hand off the whole conversation and free the terminal                        | `/bg <last instruction>`       |

A `/fork` copy carries the conversation, model, permission mode, effort
and "don't ask again" grants. It's told to create its own worktree before
editing, so it can't clobber your checkout. When agent view is turned off,
`/fork` falls back to the forked-subagent behavior.

## How file edits are isolated

A session dispatched from agent view or started with `claude --bg` begins
in your working directory, then moves into its own git worktree under
`.claude/worktrees/` before its first edit. Parallel sessions read the
same checkout and each write to their own. (`.claude/worktrees/` is
gitignored in this template.)

A session you backgrounded yourself with `←` or `/bg` keeps editing where
it already was.

When a background session finishes code work in a worktree it entered, it
commits, pushes its own branch (never `main`/`master`, never force-push or
merge) and opens a draft PR when the task calls for one. Instructions in
`CLAUDE.md` or the task that say you handle git yourself take precedence.

### `worktree.baseRef`: what new worktrees start from

This template sets `worktree.baseRef` to `"head"` in
`.claude/settings.json`:

```json
"worktree": {
  "baseRef": "head"
}
```

| Value               | New worktrees branch from | Effect                                                        |
| ------------------- | ------------------------- | ------------------------------------------------------------- |
| `"fresh"` (default) | `origin/<default-branch>` | Clean tree matching the remote. Unpushed commits are missing. |
| `"head"`            | Your current local `HEAD` | Unpushed commits and feature-branch work come along.          |

It applies to `claude --worktree`, the `EnterWorktree` tool, isolated
subagents and the worktrees background sessions create. With `"fresh"`, a
background session dispatched while you're on an unpushed feature branch
starts without your work, which is rarely what you want when the task is
"finish this". Switch back to `"fresh"` (or delete the key) if your
sessions mostly start unrelated work from `main`. The key takes only these
two values, not a branch name. Inside a linked worktree, `"head"` means
that worktree's `HEAD`. Added in v2.1.133.

The related `worktree.bgIsolation: "none"` lets background sessions edit
the working copy directly, for repositories where worktrees are
impractical. The template leaves it at the default (`"worktree"`).

## Get pinged instead of watching

While agent view is open, Claude Code fires the `Notification` hook with
`agent_needs_input` when a background session starts waiting on you and
`agent_completed` when one finishes or fails (v2.1.198+). This template
wires both to [`scripts/hooks/notify-agent.sh`](../scripts/hooks/notify-agent.sh),
which returns a `terminalSequence` (OSC 9 or OSC 777) for terminals that
read it and falls back to `osascript` / `notify-send` elsewhere. See
recipe 7 in the [hooks cookbook](hooks-cookbook.md#7-desktop-notifications-for-background-agents).

A session you start on a feature branch is also named after that branch:
[`inject-context.sh`](../scripts/hooks/inject-context.sh) returns SessionStart's
`sessionTitle` (v2.1.152+), so the name shows in the prompt box, `/resume`
and, once you background the session, its agent view row. The hook leaves
the title alone for background sessions (agent view names those from the
prompt), on the default branch, and when the session already has a name.

## Scripting: `scripts/agents-status.sh`

`claude agents --json` prints one object per session. These fields are
documented and stable; the files under `~/.claude/jobs/` are not:

| Field                      | Present                    | Values                                                                                  |
| -------------------------- | -------------------------- | --------------------------------------------------------------------------------------- |
| `cwd`, `kind`, `startedAt` | Always                     | `kind` is `interactive` or `background`; `startedAt` is Unix ms                         |
| `id`                       | Background sessions        | Short id for `attach`, `logs`, `stop`                                                   |
| `state`                    | Background sessions        | `working`, `blocked`, `done`, `failed`, `stopped`                                       |
| `pid`, `status`            | While the process is alive | `status` is `busy`, `waiting` or `idle`                                                 |
| `waitingFor`               | When `status` is `waiting` | `permission prompt`, `input needed`, `sandbox request`, `worker request`, `dialog open` |
| `sessionId`, `name`        | When set                   | Full UUID for `claude --resume`, display name                                           |

`--all` adds completed background sessions and `--cwd <path>` limits the
list to one project. `blocked` always means the session needs you; a
session that finished and waits for its next prompt reads `done`.

[`scripts/agents-status.sh`](../scripts/agents-status.sh) wraps it:

```bash
scripts/agents-status.sh              # table, blocked sessions first
scripts/agents-status.sh --short      # "claude: 2 blocked · 1 working · 3 done"
scripts/agents-status.sh --blocked    # only sessions waiting on you; exit 1 if any
scripts/agents-status.sh --all --cwd ~/src/my-app
```

For a tmux status bar:

```tmux
set -g status-right '#(~/src/claude-code-template/scripts/agents-status.sh --short)'
set -g status-interval 15
```

`bash scripts/test-agents-status.sh` runs its tests against a fixture, no
sessions needed.

## Manage sessions from the shell

| Command                             | Purpose                                                                  |
| ----------------------------------- | ------------------------------------------------------------------------ |
| `claude agents`                     | Open agent view (`--cwd <path>` to scope it)                             |
| `claude attach <id\|name>`          | Open a session in this terminal (part of a name works, v2.1.290+)        |
| `claude logs <id\|name>`            | Print recent output                                                      |
| `claude stop <id>`                  | Stop a session (alias `claude kill`); the conversation is kept           |
| `claude respawn <id>`               | Restart a session, e.g. onto a newer Claude Code (`--all` for every one) |
| `claude rm <id>`                    | Remove from the list and delete its worktree when that's safe            |
| `claude --resume <session-id> --bg` | Continue a saved conversation in the background (v2.1.257+)              |

`claude agents` also takes dispatch defaults that apply to every session
you start from that view: `--permission-mode`, `--model`, `--effort`,
`--agent`, `--restricted`, plus `--settings`, `--add-dir`, `--plugin-dir`
and `--mcp-config`. For example:

```bash
claude agents --permission-mode plan --model opus --effort high
```

## Permission mode of background sessions

- Backgrounded with `/bg` or `←`: keeps the mode it was in.
- Dispatched with `claude --bg` or from `claude agents` started in a shell:
  starts the way a new `claude` in that directory would.
- A project's `.claude/settings.json` can't make a dispatched session more
  permissive than the one you came from, and `auto` / `bypassPermissions`
  only take effect from `~/.claude/settings.json`, managed settings or
  `--settings`. See [permission-modes.md](permission-modes.md).

## Cleanup

- `Ctrl+X` twice in agent view deletes the session **and its worktree,
  including uncommitted changes**. Commit first.
- `claude rm <id>` keeps a worktree that has uncommitted changes.
- Either refuses when the worktree has commits that aren't pushed
  anywhere. Push them, or copy the `claude rm ... --discard-unpushed`
  command the refusal prints (v2.1.260+).
- Transcripts stay on disk in every case, so `claude --resume` still
  finds them.
- If `.claude/worktrees/` fills up, run `git worktree list` and
  `git worktree remove <path>` for leftovers.

## Turning it off

Set `"disableAgentView": true` in settings, or export
`CLAUDE_CODE_DISABLE_AGENT_VIEW=1`, to turn off `claude agents`, `--bg`,
`/background` and the supervisor.

## See also

- [Cross-session messaging](cross-session-messaging.md): let parallel sessions pass findings to each other
- [Best practices: `/goal`](best-practices.md#keep-going-until-done-goal): keep one session working until a condition holds
- [Official: agent view](https://code.claude.com/docs/en/agent-view)
- [Official: worktrees](https://code.claude.com/docs/en/worktrees)
- [Official: run agents in parallel](https://code.claude.com/docs/en/agents)
