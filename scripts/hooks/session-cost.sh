#!/bin/bash
# Stop hook. Prints a one-line session cost summary to stderr (which
# Claude Code surfaces in the UI) plus a per-tool breakdown if the
# corresponding JSONL log file exists.
#
# Per-tool breakdown uses the duration_ms field added to PostToolUse
# payloads in v2.1.121. The hook never blocks (always exit 0).

set -u

payload="$(cat)"

if ! command -v jq >/dev/null 2>&1; then
  exit 0
fi

cost="$(printf '%s' "$payload"   | jq -r '.cost.total_cost_usd   // 0' 2>/dev/null)"
dur_ms="$(printf '%s' "$payload" | jq -r '.cost.total_duration_ms // 0' 2>/dev/null)"
turns="$(printf '%s' "$payload"  | jq -r '.num_turns              // 0' 2>/dev/null)"

dur_s=$(( dur_ms / 1000 ))
min=$(( dur_s / 60 ))
sec=$(( dur_s % 60 ))

printf 'Session: %s turns · %dm%ds · $%s' "$turns" "$min" "$sec" "$cost" >&2

# Per-tool timing breakdown using duration_ms from PostToolUse log.
posttool_log="logs/PostToolUse-events.jsonl"
if [ -f "$posttool_log" ]; then
  top="$(jq -rs '
      [.[] | select(.duration_ms != null) | {tool: .tool_name, ms: .duration_ms}]
      | group_by(.tool)
      | map({tool: .[0].tool, total_ms: (map(.ms) | add), count: length})
      | sort_by(-.total_ms)
      | .[0:3]
      | map("\(.tool):\(.total_ms)ms×\(.count)")
      | join(" ")
    ' "$posttool_log" 2>/dev/null)"
  if [ -n "$top" ] && [ "$top" != "null" ]; then
    printf ' · top tools: %s' "$top" >&2
  fi
fi

printf '\n' >&2
exit 0
