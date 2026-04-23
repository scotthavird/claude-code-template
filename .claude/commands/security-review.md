---
description: Run a security audit via the security-auditor subagent on the current diff or a specified path.
argument-hint: [path]
allowed-tools: Bash(git:*), Bash(grep:*), Bash(rg:*), Task, Read, Glob
---

# Security Review Command

Launch the `security-auditor` subagent. Default scope: the diff against
`origin/main` (i.e., what this branch changes). If `$ARGUMENTS` provides
a path, scope to that path instead.

## Current state

- Changed files: !`git diff --name-only origin/main...HEAD 2>/dev/null || git diff --name-only HEAD`

## Your task

$ARGUMENTS

Produce a report in the agent's canonical shape (Critical / High / Medium
/ Low / Informational / Positive practices). Include file:line for every
finding.
