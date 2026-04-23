#!/bin/bash
# Claude Code status line.
# Receives a JSON payload on stdin with fields like:
#   { "model": { "id": "...", "display_name": "..." },
#     "workspace": { "current_dir": "..." },
#     "cost": { "total_cost_usd": 0.12, "total_duration_ms": 45000 },
#     "session_id": "..." }
#
# Outputs a single line to stdout. First line is rendered; ANSI colors OK.

set -euo pipefail

payload="$(cat)"

# Fields (with fallbacks if jq is missing or fields absent).
if command -v jq >/dev/null 2>&1; then
  model="$(printf '%s' "$payload" | jq -r '.model.display_name // .model.id // "claude"' 2>/dev/null || echo claude)"
  cwd="$(printf '%s' "$payload"   | jq -r '.workspace.current_dir // "."'        2>/dev/null || echo .)"
  cost="$(printf '%s' "$payload"  | jq -r '.cost.total_cost_usd   // 0'          2>/dev/null || echo 0)"
else
  model="claude"
  cwd="$(pwd)"
  cost="0"
fi

# Git info.
branch=""
dirty=""
if git -C "$cwd" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  branch="$(git -C "$cwd" branch --show-current 2>/dev/null || echo detached)"
  if ! git -C "$cwd" diff --quiet 2>/dev/null || ! git -C "$cwd" diff --cached --quiet 2>/dev/null; then
    dirty="*"
  fi
fi

# Colors.
C_RESET="\033[0m"
C_BLUE="\033[34m"
C_YELLOW="\033[33m"
C_GREEN="\033[32m"
C_DIM="\033[2m"

dir_short="$(basename "$cwd")"

printf "${C_BLUE}%s${C_RESET}" "$model"
printf " ${C_DIM}·${C_RESET} ${C_GREEN}%s${C_RESET}" "$dir_short"
if [ -n "$branch" ]; then
  printf " ${C_DIM}·${C_RESET} ${C_YELLOW}⎇ %s%s${C_RESET}" "$branch" "$dirty"
fi
printf " ${C_DIM}·${C_RESET} ${C_DIM}\$%.3f${C_RESET}" "$cost"
