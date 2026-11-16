#!/bin/bash
# Notification hook: ping the desktop when a session (or a background agent
# in `claude agents`) needs you or has finished.
#
# Wired in .claude/settings.json on the Notification event with matcher
#   permission_prompt|idle_prompt|elicitation_dialog|agent_needs_input|agent_completed
# `agent_needs_input` / `agent_completed` fire for background sessions while
# agent view is open (v2.1.198+).
#
# How it notifies:
#   Hooks have no controlling terminal, so writing escape sequences to
#   /dev/tty fails. Instead the hook prints {"terminalSequence": "..."} and
#   Claude Code emits the sequence itself (v2.1.141+). Claude Code accepts
#   only OSC 0/1/2/9/99/777 and BEL there, and only in interactive sessions.
#   Terminals that don't read any of those get an OS notification instead
#   (osascript on macOS, notify-send on Linux), then a bare bell.
#
#   Method by terminal (auto):
#     WezTerm, Windows Terminal, ConEmu       -> OSC 9
#     Warp, urxvt                             -> OSC 777
#     iTerm2, Ghostty, Kitty                  -> nothing: Claude Code's own
#                                                preferredNotifChannel "auto"
#                                                already notifies there
#     anything else (Terminal.app, VS Code,   -> osascript / notify-send,
#     tmux without a known outer terminal)       else BEL
#
#   Override with NOTIFY_AGENT_METHOD (a variable of this script, not a
#   Claude Code setting): auto | osc9 | osc777 | osc99 | desktop | bell | none
#
# Notification hooks can't block anything, so this always exits 0.

set -u

input="$(cat 2>/dev/null || true)"

field() {
  # Read a top-level string field from the payload. Empty if jq is missing
  # or the payload isn't JSON.
  command -v jq >/dev/null 2>&1 || return 0
  printf '%s' "$input" | jq -r --arg k "$1" '.[$k] // empty | tostring' 2>/dev/null || true
}

clean() {
  # Strip control characters (ESC, BEL, newlines) so the sequence stays
  # inside Claude Code's allowlist, collapse whitespace, cap the length.
  printf '%s' "$1" | tr '\000-\037\177' ' ' | tr -s ' ' | sed 's/^ //; s/ $//' | cut -c1-200
}

ntype="$(field notification_type)"
message="$(field message)"
title="$(field title)"
cwd="$(field cwd)"

if [ -z "$title" ]; then
  case "$ntype" in
    agent_needs_input) title="Agent needs input" ;;
    agent_completed) title="Agent finished" ;;
    permission_prompt) title="Permission needed" ;;
    idle_prompt) title="Waiting for you" ;;
    elicitation_dialog) title="Input requested" ;;
    *) title="Claude Code" ;;
  esac
fi
[ -n "$cwd" ] && title="$title · $(basename "$cwd")"
[ -n "$message" ] || message="Claude Code needs your attention"

title="$(clean "$title")"
message="$(clean "$message")"

detect_method() {
  local term="${TERM_PROGRAM:-}" lc="${LC_TERMINAL:-}"
  # Inside tmux/screen TERM_PROGRAM names the multiplexer; iTerm2 also
  # exports LC_TERMINAL, which survives into tmux.
  case "$lc" in iTerm2) echo none; return ;; esac
  case "$term" in
    iTerm.app | ghostty) echo none; return ;;
    WezTerm) echo osc9; return ;;
    WarpTerminal) echo osc777; return ;;
  esac
  if [ -n "${KITTY_WINDOW_ID:-}" ] || [ "${TERM:-}" = "xterm-kitty" ]; then
    echo none
    return
  fi
  if [ -n "${WT_SESSION:-}" ] || [ -n "${ConEmuPID:-}" ]; then
    echo osc9
    return
  fi
  case "${TERM:-}" in rxvt*) echo osc777; return ;; esac
  echo desktop
}

method="${NOTIFY_AGENT_METHOD:-auto}"
[ "$method" = "auto" ] && method="$(detect_method)"

emit_sequence() {
  # Print the hook JSON that asks Claude Code to write the sequence.
  # Needs jq to JSON-escape ESC/BEL; without it, fall back to the desktop.
  if ! command -v jq >/dev/null 2>&1; then
    desktop_notify
    return
  fi
  jq -nc --arg seq "$1" '{terminalSequence: $seq}'
}

desktop_notify() {
  case "$(uname -s 2>/dev/null)" in
    Darwin)
      if command -v osascript >/dev/null 2>&1; then
        # Pass text as argv so quotes in the message can't break the script.
        osascript - "$title" "$message" >/dev/null 2>&1 <<'APPLESCRIPT' && return
on run argv
  display notification (item 2 of argv) with title (item 1 of argv)
end run
APPLESCRIPT
      fi
      ;;
    *)
      if command -v notify-send >/dev/null 2>&1; then
        notify-send --app-name="Claude Code" -- "$title" "$message" >/dev/null 2>&1 && return
      fi
      ;;
  esac
  # No OS notifier: ring the bell through Claude Code.
  command -v jq >/dev/null 2>&1 && jq -nc --arg seq "$(printf '\007')" '{terminalSequence: $seq}'
}

ESC="$(printf '\033')"
BEL="$(printf '\007')"

case "$method" in
  osc9) emit_sequence "${ESC}]9;${title}: ${message}${BEL}" ;;
  # OSC 777 fields are ';'-separated, so keep ';' out of title and body.
  osc777) emit_sequence "${ESC}]777;notify;${title//;/,};${message//;/,}${BEL}" ;;
  osc99) emit_sequence "${ESC}]99;;${title}: ${message}${BEL}" ;;
  bell) emit_sequence "$BEL" ;;
  desktop) desktop_notify ;;
  none) ;;
  *) echo "notify-agent: unknown NOTIFY_AGENT_METHOD '$method'" >&2 ;;
esac

exit 0
