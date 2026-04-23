#!/bin/bash
# SessionStart hook. Emits context Claude should see at the start of every
# session (current branch, recent commits, unstaged file count, open PRs).
#
# Anything written to stdout is injected into the conversation as a system
# message. Keep it terse — this eats context budget.

set -u

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  exit 0
fi

branch="$(git branch --show-current 2>/dev/null || echo unknown)"
ahead_behind="$(git status -sb 2>/dev/null | head -1)"
dirty_count="$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')"
recent_commits="$(git log --oneline -5 2>/dev/null)"

printf '## Session context (auto-injected)\n\n'
printf 'Branch: `%s`\n' "$branch"
printf 'Status: `%s`\n' "$ahead_behind"
printf 'Uncommitted files: %s\n\n' "$dirty_count"

if [ -n "$recent_commits" ]; then
  printf 'Recent commits:\n```\n%s\n```\n\n' "$recent_commits"
fi

if command -v gh >/dev/null 2>&1; then
  open_prs="$(gh pr list --author @me --state open --limit 5 --json number,title 2>/dev/null | jq -r '.[] | "#\(.number) \(.title)"' 2>/dev/null || true)"
  if [ -n "$open_prs" ]; then
    printf 'Your open PRs:\n```\n%s\n```\n' "$open_prs"
  fi
fi

exit 0
