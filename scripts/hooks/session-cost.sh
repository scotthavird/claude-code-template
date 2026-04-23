#!/bin/bash
# Stop hook. Prints a one-line session cost summary to stderr, which
# Claude Code surfaces in the UI. Never blocks.

set -u

payload="$(cat)"

if ! command -v jq >/dev/null 2>&1; then
  exit 0
fi

cost="$(printf '%s' "$payload" | jq -r '.cost.total_cost_usd // 0' 2>/dev/null)"
dur_ms="$(printf '%s' "$payload" | jq -r '.cost.total_duration_ms // 0' 2>/dev/null)"
turns="$(printf '%s' "$payload" | jq -r '.num_turns // 0' 2>/dev/null)"

# Format seconds.
dur_s=$(( dur_ms / 1000 ))
min=$(( dur_s / 60 ))
sec=$(( dur_s % 60 ))

printf 'Session: %s turns · %dm%ds · $%s\n' "$turns" "$min" "$sec" "$cost" >&2

exit 0
