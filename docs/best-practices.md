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

| Mode | When |
|---|---|
| `default` | Unknown repo, first session, risky changes |
| `acceptEdits` | Trusted repo, trusted task, you'll review the diff |
| `plan` | You want Claude to plan before acting |
| `bypassPermissions` | Only in ephemeral sandboxes/containers |

## Reviewing Claude's output

- **Trust but verify.** Claude reports what it *intended* to do; always
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
