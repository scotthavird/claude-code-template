# Best Practices

A condensed checklist mirroring the [official best-practices doc](https://code.claude.com/docs/en/best-practices),
with the pieces most worth internalizing for this template.

## Give Claude context deliberately

- **CLAUDE.md is persistent system prompt.** Use it for coding standards,
  architectural decisions, and review checklists. Don't use it for
  ephemeral task notes.
- **Let auto-memory work.** Claude builds its own memory files at
  `~/.claude/projects/.../memory/` as it learns about the project. You
  don't have to pre-populate this — let it grow.
- **Reference files with paths** (e.g. `src/auth/login.ts:42`) so Claude
  can open them; don't paste large snippets unless necessary.

## Scope tasks well

- Big task? Ask for a plan first (`/refactor` or "plan this before touching code").
- Small task? Describe the outcome in one sentence.
- Ambiguous? Don't promise Claude you'll accept anything — it'll pick a
  direction that might not match yours. Narrow the requirements.

## Use subagents for protection

Subagents run in separate context windows. Delegate to them when:

- Research or exploration would pollute the main context
- You want an independent review (use `pr-reviewer`)
- The subtask needs a different persona (e.g. `debugger`)

## Permission modes, picked intentionally

| Mode                 | When                                                                                                          |
| -------------------- | ------------------------------------------------------------------------------------------------------------- |
| `auto`               | The built-in default in the terminal (v2.1.284+). A classifier approves routine work and blocks risky actions |
| `manual` (`default`) | Unknown repo, first session, risky changes. You approve every unlisted call                                   |
| `acceptEdits`        | Trusted repo, trusted task, you'll review the diff                                                            |
| `plan`               | You want Claude to plan before acting                                                                         |
| `bypassPermissions`  | Only in ephemeral sandboxes/containers                                                                        |

See [permission-modes.md](permission-modes.md) for why this template doesn't
pin a mode.

## Reviewing a branch: `/code-review` vs `/pr-review`

- **`/code-review [level] [pr#]`** is built in. It reviews the current diff
  or a PR at the effort level you choose, for example `/code-review high`.
  `/code-review ultra` runs a deep review in the cloud. `--fix` applies the
  findings, `--comment` posts them as inline PR comments, and
  `--max-findings <n>|all` changes how many are reported (v2.1.288).
  Since v2.1.223, `/review` is an alias of it.
- **`/pr-review [pr#]`** is the template's command. It runs the
  `pr-reviewer` subagent, which tags each finding with a severity and
  posts one structured write-up. It used to be called `/review` and was
  renamed so it no longer shadows the built-in alias.

## Keep going until done: `/goal`

`/goal <condition>` (v2.1.139+) keeps Claude taking turns until the
condition holds. After every turn a separate small, fast model reads the
conversation and decides "met", "not yet" (Claude continues, guided by the
reason) or "impossible" (the goal clears). It replaces typing "keep going"
five times.

```text
/goal `npm test` exits 0 with every test passing. Don't skip or weaken tests. Or stop after 20 turns.
```

- **Write a checkable condition.** The evaluator doesn't run commands or
  read files. It judges what Claude showed in the conversation, so name
  the proof: "`npm test` exits 0", "`git status` is clean".
- **One end state, plus constraints.** Say what must not change on the
  way ("no other test file is modified").
- **Bound it.** Add "or stop after 20 turns". The condition can be up to
  4,000 characters.
- **Pair it with auto mode.** A goal doesn't change the permission mode.
  In Manual mode Claude still asks before each unlisted tool call.
- `/goal` alone shows status (turns, tokens, the evaluator's last
  reason). `/goal clear` stops it. A goal survives `--resume`.
- Headless: `claude -p "/goal CHANGELOG.md has an entry for every PR merged this week"`
  runs the loop to completion in one invocation. Add
  `--output-format stream-json --verbose` to watch progress.
- While a subagent or background shell is still running, evaluation waits.
  After 30 minutes of waiting Claude checks in on that work;
  `CLAUDE_CODE_GOAL_CHECKIN_MINUTES` changes the interval and `0` turns
  check-ins off.

This template's `/fix-until-green [test-command]` does the setup for the
most common goal: it finds the test command, records the failing
baseline, flags tests that will stall the loop (network, secrets,
services), and hands back a ready-to-paste `/goal` line. It stops there,
because a custom command's text is a prompt to Claude and can't run a
built-in command like `/goal` itself.

`/goal` vs the alternatives:

| Approach  | Next turn starts when      | Stops when                                                        |
| --------- | -------------------------- | ----------------------------------------------------------------- |
| `/goal`   | The previous turn finishes | The evaluator says met or impossible, or `/goal clear`            |
| `/loop`   | A time interval elapses    | You stop it, or Claude decides it's done                          |
| Stop hook | The previous turn finishes | Your script or prompt decides (applies to every session in scope) |

## Run sessions in parallel

- Dispatch independent tasks as background sessions (`claude --bg`, or
  type them into `claude agents`) and step in only when a row needs you.
  See [agent-view.md](agent-view.md).
- `/fork <instruction>` tries a second approach from the same context in
  its own session and worktree, while you keep working.
- Let the notification hook ping you rather than watching the list:
  `scripts/hooks/notify-agent.sh` handles `agent_needs_input` and
  `agent_completed`.
- When one session learns something another needs, have Claude message
  it. See [cross-session-messaging.md](cross-session-messaging.md).
- Every session spends quota on its own. Ten in parallel cost about ten
  times as much as one.

## Reviewing Claude's output

- **Trust but verify.** Claude reports what it _intended_ to do; always
  check the diff.
- **Don't merge what you don't understand.** Ask "/explain <path>" if a
  change is opaque.
- **Run tests.** Type checks and unit tests verify correctness, not
  feature behavior — you still have to exercise the feature.

## Anti-patterns

- Feeding Claude a 2,000-line diff and asking "is this good?" — break it up.
- Chained "now also do X, now also do Y" prompts that bury the original goal.
- Adding CLAUDE.md rules for every mistake Claude makes — over time this
  becomes a ruleset no one can follow. Prefer fixing the root cause in
  the code (linters, types, tests).
- Skipping pre-commit hooks to "save time" — you lose all the guardrails
  they provide.
