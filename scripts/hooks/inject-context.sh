#!/bin/bash
# SessionStart hook. Emits context Claude should see at the start of every
# session (current branch, recent commits, unstaged file count, open PRs)
# and names the session after the branch.
#
# Output is SessionStart hook JSON:
#   hookSpecificOutput.additionalContext  -> added to Claude's context
#   hookSpecificOutput.sessionTitle       -> same effect as /rename
#                                            (v2.1.152+), shown in the prompt
#                                            box, /resume and `claude agents`
# Without jq it falls back to plain stdout, which SessionStart also adds to
# Claude's context (no title in that case). Keep it terse — this eats
# context budget.
#
# The title is skipped when:
#   - the session already has a custom title (`session_title` in the payload,
#     set by --name, /rename, or an earlier hook)
#   - it's a background session (CLAUDE_JOB_DIR is set): agent view gives
#     those a name from the prompt, and every session dispatched from the
#     main checkout would otherwise get the same branch name
#   - the branch is the default branch, or HEAD is detached
#   - INJECT_CONTEXT_NO_TITLE=1 (a variable of this script)

set -u

input="$(cat 2>/dev/null || true)"

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  exit 0
fi

branch="$(git branch --show-current 2>/dev/null)"
ahead_behind="$(git status -sb 2>/dev/null | head -1)"
dirty_count="$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')"
recent_commits="$(git log --oneline -5 2>/dev/null)"

context="$(
  printf '## Session context (auto-injected)\n\n'
  printf 'Branch: `%s`\n' "${branch:-detached HEAD}"
  printf 'Status: `%s`\n' "$ahead_behind"
  printf 'Uncommitted files: %s\n\n' "$dirty_count"

  if [ -n "$recent_commits" ]; then
    printf 'Recent commits:\n```\n%s\n```\n\n' "$recent_commits"
  fi

  if command -v gh >/dev/null 2>&1 && command -v jq >/dev/null 2>&1; then
    open_prs="$(gh pr list --author @me --state open --limit 5 --json number,title 2>/dev/null | jq -r '.[] | "#\(.number) \(.title)"' 2>/dev/null || true)"
    if [ -n "$open_prs" ]; then
      printf 'Your open PRs:\n```\n%s\n```\n' "$open_prs"
    fi
  fi
)"

if ! command -v jq >/dev/null 2>&1; then
  printf '%s\n' "$context"
  exit 0
fi

# Decide on a session title.
title=""
existing_title="$(printf '%s' "$input" | jq -r '.session_title // empty' 2>/dev/null || true)"
default_branch="$(git symbolic-ref --quiet --short refs/remotes/origin/HEAD 2>/dev/null)"
default_branch="${default_branch#origin/}"
if [ -n "$branch" ] &&
  [ -z "$existing_title" ] &&
  [ -z "${CLAUDE_JOB_DIR:-}" ] &&
  [ "${INJECT_CONTEXT_NO_TITLE:-0}" != "1" ] &&
  [ "$branch" != "${default_branch:-main}" ] &&
  [ "$branch" != "main" ] && [ "$branch" != "master" ]; then
  title="$branch"
fi

jq -n --arg ctx "$context" --arg title "$title" '{
  hookSpecificOutput: (
    {hookEventName: "SessionStart", additionalContext: $ctx}
    + (if $title != "" then {sessionTitle: $title} else {} end)
  )
}'

exit 0
