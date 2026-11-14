---
description: Review the current branch or a specified PR. Uses the pr-reviewer subagent.
argument-hint: [pr-number]
allowed-tools: Bash(git:*), Bash(gh:*), Task
---

# PR Review Command

Launch the `pr-reviewer` subagent to produce a structured review.

This command was called `/review` until Claude Code v2.1.223 made the
built-in `/review` an alias of `/code-review`. The project command
shadowed the built-in, so it is now `/pr-review`. Use the built-in
`/code-review [level] [pr#]` for Claude Code's own diff review, which
also takes `--fix`, `--comment`, and `--max-findings`. Use this command
for the template's severity-tagged `pr-reviewer` write-up.

## Current state

- Current branch: !`git branch --show-current`
- Associated PR: !`gh pr view --json number,title,url 2>/dev/null | jq -r '"#\(.number) \(.title)\n\(.url)"' || echo "no PR yet"`

## Your task

$ARGUMENTS

If a PR number is provided, review that PR. Otherwise review the PR
associated with the current branch. If there's no PR yet, review the
uncommitted + unpushed diff as if it were one.

Invoke the `pr-reviewer` subagent. Output its review verbatim — do not
summarize or paraphrase.
