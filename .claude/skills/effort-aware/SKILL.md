---
name: effort-aware
description: Demonstrates branching skill behavior on the current effort level using ${CLAUDE_EFFORT} (Claude Code v2.1.120+). Activates when discussing how to scope work across effort levels.
allowed-tools: Read, Grep, Glob
---

# Effort-Aware Skill

Demonstrates how a skill can adapt its instructions to the current effort
level. Claude Code injects `${CLAUDE_EFFORT}` into skill text at load
time (v2.1.120+), so the same skill can give terse advice on `low` and
exhaustive advice on `xhigh` without needing separate skills.

## Current effort: `${CLAUDE_EFFORT}`

### Guidance for this effort level

**If `${CLAUDE_EFFORT}` is `low` or `medium`:**
- Make the smallest correct change. Don't refactor surrounding code.
- Skip exploring alternatives — pick the obvious path.
- One pass, no self-review beyond a re-read.
- Don't write tests for trivial changes (one-liner config, doc fix).

**If `${CLAUDE_EFFORT}` is `high`:**
- Sketch 2–3 approaches before picking one. Note the tradeoffs in your
  response.
- Add tests for new behavior.
- Self-review the diff before reporting done.

**If `${CLAUDE_EFFORT}` is `xhigh` or `max`:**
- Map invariants the change must preserve. Read enough surrounding code
  to be confident.
- Build a sequence of small, reversible commits if the change is large.
- Tests cover happy path, error path, and at least two boundary cases.
- Run a `pr-reviewer` self-review pass before reporting done.
- Note follow-ups (debt, deferred work) explicitly so the human can
  triage.

## Why this exists

Older Claude Code versions had no way for skills to adapt their tone to
the user's effort setting. You either had to write conservatively (and
under-deliver on `xhigh`) or aggressively (and over-engineer on `low`).
Effort interpolation closes that gap.

## When this skill activates

When the user discusses scoping, planning a change, or asks how
thoroughly to do something. The skill helps you calibrate effort to
match `${CLAUDE_EFFORT}` rather than picking a single fixed default.

## See also

- `/effort` slash command — interactive slider to change effort mid-session.
- [Effort levels in the official docs](https://code.claude.com/docs/en/model-config).
