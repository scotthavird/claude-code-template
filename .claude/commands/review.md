---
description: Review the current branch or a specified PR. Uses the pr-reviewer subagent.
argument-hint: [pr-number]
allowed-tools: Bash(git:*), Bash(gh:*), Task
---

# Review Command

Launch the `pr-reviewer` subagent to produce a structured review.

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
