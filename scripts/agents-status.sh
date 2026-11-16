#!/bin/bash
# Summarize Claude Code sessions from `claude agents --json` (v2.1.145+).
#
# `claude agents --json` is the supported way to read session state from a
# script (the files under ~/.claude/jobs/ are not a stable interface). See
# docs/agent-view.md and https://code.claude.com/docs/en/agent-view.
#
# Usage:
#   scripts/agents-status.sh                 table of live sessions
#   scripts/agents-status.sh --all           include completed background sessions
#   scripts/agents-status.sh --cwd <path>    only sessions started under <path>
#   scripts/agents-status.sh --short         one line for a tmux/status bar,
#                                            e.g. "claude: 2 blocked · 1 working · 3 done"
#   scripts/agents-status.sh --blocked       only sessions waiting on you;
#                                            exits 1 when there are any
#   scripts/agents-status.sh --from <file>   read JSON from a file ('-' = stdin)
#                                            instead of running claude
#
# tmux example (~/.tmux.conf):
#   set -g status-right '#(~/path/to/repo/scripts/agents-status.sh --short)'
#   set -g status-interval 15
#
# Fields used (all documented): kind, id, name, cwd, state
# (working|blocked|done|failed|stopped, background only), status
# (busy|waiting|idle, while the process is alive) and waitingFor
# (when status is waiting).

set -u

mode=table
all=0
cwd=""
from=""

while [ $# -gt 0 ]; do
  case "$1" in
    --all) all=1 ;;
    --cwd) cwd="${2:-}"; shift ;;
    --short) mode=short ;;
    --blocked) mode=blocked ;;
    --from) from="${2:-}"; shift ;;
    -h | --help) sed -n '2,27p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "agents-status: unknown option '$1' (try --help)" >&2; exit 2 ;;
  esac
  shift
done

if ! command -v jq >/dev/null 2>&1; then
  echo "agents-status: jq is required" >&2
  exit 2
fi

if [ -n "$from" ]; then
  if [ "$from" = "-" ]; then json="$(cat)"; else json="$(cat "$from")"; fi
else
  if ! command -v claude >/dev/null 2>&1; then
    echo "agents-status: claude not on PATH" >&2
    exit 2
  fi
  args=(agents --json)
  [ "$all" = 1 ] && args+=(--all)
  [ -n "$cwd" ] && args+=(--cwd "$cwd")
  if ! json="$(claude "${args[@]}" 2>/dev/null)"; then
    [ "$mode" = short ] && { echo "claude: ?"; exit 0; }
    echo "agents-status: 'claude ${args[*]}' failed (agent view needs v2.1.145+ and can be turned off with disableAgentView)" >&2
    exit 2
  fi
fi

if ! printf '%s' "$json" | jq -e 'type == "array"' >/dev/null 2>&1; then
  echo "agents-status: expected a JSON array from claude agents --json" >&2
  exit 2
fi

# One normalized state per session: background sessions report `state`;
# interactive ones only have `status` (busy|waiting|idle).
normalize='
  map(. + {
    st: (
      if .state then .state
      elif .status == "waiting" then "blocked"
      elif .status == "busy" then "working"
      elif .status == "idle" then "idle"
      else "unknown" end
    )
  })'

case "$mode" in
  short)
    printf '%s' "$json" | jq -r "$normalize"'
      | group_by(.st) | map({key: .[0].st, n: length})
      | (["blocked","working","done","failed","stopped","idle","unknown"]) as $order
      | sort_by(.key as $k | ($order | index($k)) // 99)
      | if length == 0 then "claude: no sessions"
        else "claude: " + (map("\(.n) \(.key)") | join(" · ")) end'
    ;;

  blocked)
    out="$(printf '%s' "$json" | jq -r "$normalize"'
      | map(select(.st == "blocked"))
      | .[]
      | [(.id // (.sessionId // "" | .[0:8])), (.name // "-"), (.waitingFor // "needs you"), .cwd]
      | @tsv')"
    if [ -z "$out" ]; then
      echo "No sessions are waiting on you."
      exit 0
    fi
    printf 'ID\tNAME\tWAITING FOR\tCWD\n%s\n' "$out" | column -t -s "$(printf '\t')"
    echo
    echo "Open one with: claude attach <id>   (or press Space on its row in claude agents)"
    exit 1
    ;;

  table)
    out="$(printf '%s' "$json" | jq -r "$normalize"'
      | (["blocked","working","done","failed","stopped","idle","unknown"]) as $order
      | sort_by(.st as $k | ($order | index($k)) // 99)
      | .[]
      | [(.id // (.sessionId // "" | .[0:8])),
         .kind,
         .st + (if .waitingFor then " (" + .waitingFor + ")" else "" end),
         (.name // "-"),
         (.cwd | sub("^" + (env.HOME // "~"); "~"))]
      | @tsv')"
    if [ -z "$out" ]; then
      echo "No sessions. Start one with: claude --bg \"<task>\"  or open: claude agents"
      exit 0
    fi
    printf 'ID\tKIND\tSTATE\tNAME\tCWD\n%s\n' "$out" | column -t -s "$(printf '\t')"
    ;;
esac
