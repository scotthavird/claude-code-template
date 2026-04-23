---
description: Read a GitHub issue, plan the implementation, and execute it end-to-end.
argument-hint: [issue-number]
allowed-tools: Bash(gh:*), Bash(git:*), Read, Write, Edit, Glob, Grep, Task
---

# Implement-Issue Command

## Issue context

- Issue: !`gh issue view $ARGUMENTS --json number,title,body,labels 2>/dev/null | jq -r '"#\(.number) \(.title)\n\nLabels: \(.labels | map(.name) | join(","))\n\n\(.body)"'`
- Current branch: !`git branch --show-current`

## Your task

Implement the issue above end-to-end:

1. **Understand.** Re-read the issue. Identify: the user-visible outcome,
   explicit constraints, and anything ambiguous. If ambiguous, ask the
   user before touching code.
2. **Plan.** List the files to change and why. Consider using the
   `refactor-planner` subagent if the scope is large.
3. **Branch.** If you're on `main`/`master`, create a branch named
   `<type>/issue-<number>-<slug>` (e.g. `feat/issue-123-oauth-refresh`).
4. **Implement.** Make the change. Do not over-scope — the rule is:
   smallest diff that closes the issue.
5. **Test.** Run the existing test suite. Add tests for new behavior.
6. **Self-review.** Run `/review` (or the `pr-reviewer` subagent) on your
   own diff. Fix BLOCKER/MAJOR findings before opening a PR.
7. **Commit and PR.** Commit with `Closes #<number>` in the footer.
   Open a draft PR via `gh pr create --draft`.

Stop and ask the user for input if:
- The issue requires a schema migration.
- The issue touches auth, billing, or anything labeled `security`.
- The estimated diff is > 500 lines.
