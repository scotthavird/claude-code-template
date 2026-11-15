#!/bin/bash
# Smoke tests for scripts/hooks/notify-agent.sh.
# Run from repo root: bash scripts/hooks/test-notify-agent.sh
#
# Pipes Notification payloads shaped like the ones Claude Code sends
# (https://code.claude.com/docs/en/hooks#notification-input) into the hook
# under different terminals, then checks the JSON it prints. osascript and
# notify-send are replaced by stubs on $PATH, so no real notification pops.
set -u

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$REPO_ROOT" || exit 1

if ! command -v jq >/dev/null 2>&1; then
  echo "SKIP  jq not installed"
  exit 0
fi

STUBS="$(mktemp -d)"
trap 'rm -rf "$STUBS"' EXIT
for bin in osascript notify-send; do
  printf '#!/bin/bash\necho "%s $*" >> "%s/calls"\ncat >/dev/null\n' "$bin" "$STUBS" >"$STUBS/$bin"
  chmod +x "$STUBS/$bin"
done

pass=0
fail=0

ok() { printf '  PASS  %s\n' "$1"; pass=$((pass + 1)); }
ko() { printf '  FAIL  %s\n        %s\n' "$1" "$2"; fail=$((fail + 1)); }

# run_hook <payload> <env...>: run the hook with a clean terminal environment.
run_hook() {
  local payload="$1"
  shift
  rm -f "$STUBS/calls"
  printf '%s' "$payload" | env -i PATH="$STUBS:/usr/bin:/bin:/usr/local/bin:/opt/homebrew/bin" HOME="$HOME" "$@" \
    bash scripts/hooks/notify-agent.sh
}

NEEDS_INPUT='{"session_id":"7c5dcf5d-0000-4000-8000-000000000000","transcript_path":"/tmp/t.jsonl","cwd":"/Users/me/src/my-app","hook_event_name":"Notification","message":"flaky-test-fix: double jump or wall climb?","notification_type":"agent_needs_input"}'
COMPLETED='{"session_id":"abc123","transcript_path":"/tmp/t.jsonl","cwd":"/Users/me/src/my-app","hook_event_name":"Notification","message":"flaky-test-fix finished","notification_type":"agent_completed"}'
PERMISSION='{"session_id":"abc123","transcript_path":"/tmp/t.jsonl","cwd":"/Users/me/src/my-app","hook_event_name":"Notification","message":"Claude needs your permission to use Bash","title":"Permission needed","notification_type":"permission_prompt"}'
HOSTILE='{"session_id":"abc123","cwd":"/x/repo","hook_event_name":"Notification","message":"line1\nline2 \"quoted\" ; semi \u001b[31mred\u0007","notification_type":"agent_completed"}'

ESC="$(printf '\033')"
BEL="$(printf '\007')"

# 1. WezTerm -> OSC 9 terminalSequence with title, repo name and message.
out="$(run_hook "$NEEDS_INPUT" TERM_PROGRAM=WezTerm)"
seq="$(printf '%s' "$out" | jq -r '.terminalSequence // empty')"
want="${ESC}]9;Agent needs input · my-app: flaky-test-fix: double jump or wall climb?${BEL}"
[ "$seq" = "$want" ] && ok 'WezTerm agent_needs_input -> OSC 9' || ko 'WezTerm agent_needs_input -> OSC 9' "got: $(printf '%q' "$seq")"

# 2. Windows Terminal (WT_SESSION) -> OSC 9.
out="$(run_hook "$COMPLETED" WT_SESSION=1)"
printf '%s' "$out" | jq -e '.terminalSequence | startswith("\u001b]9;Agent finished")' >/dev/null &&
  ok 'Windows Terminal agent_completed -> OSC 9' || ko 'Windows Terminal agent_completed -> OSC 9' "got: $out"

# 3. Warp -> OSC 777 notify;title;body, using the payload's own title.
out="$(run_hook "$PERMISSION" TERM_PROGRAM=WarpTerminal)"
seq="$(printf '%s' "$out" | jq -r '.terminalSequence // empty')"
want="${ESC}]777;notify;Permission needed · my-app;Claude needs your permission to use Bash${BEL}"
[ "$seq" = "$want" ] && ok 'Warp permission_prompt -> OSC 777' || ko 'Warp permission_prompt -> OSC 777' "got: $(printf '%q' "$seq")"

# 4. iTerm2 / Ghostty / Kitty -> no output (Claude Code notifies natively).
for env_pair in TERM_PROGRAM=iTerm.app TERM_PROGRAM=ghostty KITTY_WINDOW_ID=1 LC_TERMINAL=iTerm2; do
  out="$(run_hook "$COMPLETED" "$env_pair")"
  [ -z "$out" ] && [ ! -f "$STUBS/calls" ] && ok "native terminal ($env_pair) -> silent" || ko "native terminal ($env_pair) -> silent" "got: $out"
done

# 5. Unknown terminal (Terminal.app) -> OS notifier, no terminalSequence.
out="$(run_hook "$NEEDS_INPUT" TERM_PROGRAM=Apple_Terminal)"
if [ -z "$out" ] && grep -q 'Agent needs input · my-app' "$STUBS/calls" 2>/dev/null; then
  ok 'Terminal.app -> osascript/notify-send fallback'
else
  ko 'Terminal.app -> osascript/notify-send fallback' "out=$out calls=$(cat "$STUBS/calls" 2>/dev/null)"
fi

# 6. Control characters and quotes are stripped/escaped; ';' kept out of OSC 777 fields.
out="$(run_hook "$HOSTILE" TERM_PROGRAM=WarpTerminal)"
seq="$(printf '%s' "$out" | jq -r '.terminalSequence // empty')"
inner="${seq#"${ESC}"]777;}"
inner="${inner%"${BEL}"}"
if [ -n "$seq" ] && ! printf '%s' "$inner" | LC_ALL=C grep -q "$(printf '[\001-\037]')" && [ "$(printf '%s' "$inner" | tr -cd ';' | wc -c | tr -d ' ')" = "2" ]; then
  ok 'hostile message sanitized'
else
  ko 'hostile message sanitized' "got: $(printf '%q' "$seq")"
fi

# 7. NOTIFY_AGENT_METHOD overrides detection.
out="$(run_hook "$COMPLETED" TERM_PROGRAM=iTerm.app NOTIFY_AGENT_METHOD=bell)"
[ "$(printf '%s' "$out" | jq -r '.terminalSequence')" = "$BEL" ] && ok 'override: bell' || ko 'override: bell' "got: $out"
out="$(run_hook "$COMPLETED" TERM_PROGRAM=WezTerm NOTIFY_AGENT_METHOD=none)"
[ -z "$out" ] && ok 'override: none' || ko 'override: none' "got: $out"
out="$(run_hook "$COMPLETED" NOTIFY_AGENT_METHOD=osc99)"
printf '%s' "$out" | jq -e '.terminalSequence | startswith("\u001b]99;;")' >/dev/null && ok 'override: osc99' || ko 'override: osc99' "got: $out"

# 8. Empty / non-JSON stdin never fails.
out="$(run_hook '' TERM_PROGRAM=WezTerm)"
rc=$?
[ "$rc" -eq 0 ] && printf '%s' "$out" | jq -e '.terminalSequence | contains("Claude Code")' >/dev/null &&
  ok 'empty payload -> generic notification, exit 0' || ko 'empty payload -> generic notification, exit 0' "rc=$rc out=$out"
out="$(run_hook 'not json' TERM_PROGRAM=WezTerm)"
rc=$?
[ "$rc" -eq 0 ] && ok 'garbage payload -> exit 0' || ko 'garbage payload -> exit 0' "rc=$rc"

printf '\n%d passed, %d failed\n' "$pass" "$fail"
exit "$fail"
