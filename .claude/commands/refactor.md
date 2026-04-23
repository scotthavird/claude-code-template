---
description: Plan a refactor before touching code. Uses the refactor-planner subagent.
argument-hint: [goal]
allowed-tools: Task, Read, Grep, Glob, Bash(git:*)
---

# Refactor Command

Launch the `refactor-planner` subagent. It produces a sequenced plan —
ordered commits, each shippable and reversible — not a diff.

## Your task

$ARGUMENTS

Pass the refactor goal to the planner subagent. Once the plan is
produced, stop. The human decides which step to execute first; you do not
start editing code from this command.
