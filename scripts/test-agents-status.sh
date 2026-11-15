#!/bin/bash
# Smoke tests for scripts/agents-status.sh.
# Run from repo root: bash scripts/test-agents-status.sh
#
# Feeds a `claude agents --json` array built from the documented fields
# (https://code.claude.com/docs/en/agent-view#list-sessions-as-json)
# through --from, so it needs no running sessions.
set -u

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SCRIPT="$REPO_ROOT/scripts/agents-status.sh"

if ! command -v jq >/dev/null 2>&1; then
  echo "SKIP  jq not installed"
  exit 0
fi

FIXTURE='[
  {"cwd":"/home/u/app","kind":"background","startedAt":1794228100608,"id":"7c5dcf5d","sessionId":"7c5dcf5d-0000-4000-8000-000000000001","name":"flaky-test-fix","state":"blocked","pid":4242,"status":"waiting","waitingFor":"permission prompt"},
  {"cwd":"/home/u/app","kind":"background","startedAt":1794228100609,"id":"1a2b3c4d","sessionId":"1a2b3c4d-0000-4000-8000-000000000002","name":"auth refactor","state":"working","pid":4243,"status":"busy"},
  {"cwd":"/home/u/app","kind":"background","startedAt":1794228100610,"id":"99887766","sessionId":"99887766-0000-4000-8000-000000000003","name":"sound effects","state":"done"},
  {"cwd":"/home/u/api","kind":"background","startedAt":1794228100611,"id":"55443322","name":"expired login","state":"blocked"},
  {"cwd":"/home/u/web","kind":"interactive","startedAt":1794228100612,"sessionId":"abcdef01-0000-4000-8000-000000000004","name":"web-3f","pid":5000,"status":"idle"},
  {"cwd":"/home/u/web","kind":"interactive","startedAt":1794228100613,"sessionId":"abcdef02-0000-4000-8000-000000000005","name":"web-4a","pid":5001,"status":"waiting","waitingFor":"input needed"}
]'

pass=0
fail=0
ok() { printf '  PASS  %s\n' "$1"; pass=$((pass + 1)); }
ko() { printf '  FAIL  %s\n        %s\n' "$1" "$2"; fail=$((fail + 1)); }

run() { printf '%s' "$FIXTURE" | bash "$SCRIPT" --from - "$@"; }

# 1. --short counts by normalized state, blocked first.
out="$(run --short)"
[ "$out" = "claude: 3 blocked · 1 working · 1 done · 1 idle" ] && ok '--short summary' || ko '--short summary' "got: $out"

# 2. --blocked lists both background and interactive waiters, exits 1.
out="$(run --blocked)"
rc=$?
if [ "$rc" -eq 1 ] && printf '%s' "$out" | grep -q 'flaky-test-fix.*permission prompt' &&
  printf '%s' "$out" | grep -q 'web-4a.*input needed' &&
  printf '%s' "$out" | grep -q 'expired login.*needs you' &&
  ! printf '%s' "$out" | grep -q 'auth refactor'; then
  ok '--blocked lists waiters and exits 1'
else
  ko '--blocked lists waiters and exits 1' "rc=$rc out=$out"
fi

# 3. Table: header, blocked rows sorted first, waitingFor shown, short ids.
out="$(run)"
first_row="$(printf '%s\n' "$out" | sed -n 2p)"
if printf '%s' "$out" | head -1 | grep -q '^ID *KIND *STATE *NAME *CWD' &&
  printf '%s' "$first_row" | grep -q 'blocked' &&
  printf '%s' "$out" | grep -q 'blocked (permission prompt)' &&
  printf '%s' "$out" | grep -q 'abcdef01  *interactive  *idle'; then
  ok 'table output'
else
  ko 'table output' "got: $out"
fi

# 4. Nothing blocked -> exit 0 with a message.
out="$(printf '[{"cwd":"/x","kind":"background","startedAt":1,"id":"aa","state":"done"}]' | bash "$SCRIPT" --from - --blocked)"
rc=$?
[ "$rc" -eq 0 ] && printf '%s' "$out" | grep -q 'No sessions are waiting' && ok '--blocked with none -> exit 0' || ko '--blocked with none -> exit 0' "rc=$rc out=$out"

# 5. Empty list.
out="$(printf '[]' | bash "$SCRIPT" --from - --short)"
[ "$out" = "claude: no sessions" ] && ok 'empty array -> no sessions' || ko 'empty array -> no sessions' "got: $out"

# 6. Bad input and bad flags exit 2.
printf '{"not":"an array"}' | bash "$SCRIPT" --from - >/dev/null 2>&1
rc=$?
[ "$rc" -eq 2 ] && ok 'non-array JSON -> exit 2' || ko 'non-array JSON -> exit 2' "rc=$rc"
bash "$SCRIPT" --bogus >/dev/null 2>&1
rc=$?
[ "$rc" -eq 2 ] && ok 'unknown flag -> exit 2' || ko 'unknown flag -> exit 2' "rc=$rc"

printf '\n%d passed, %d failed\n' "$pass" "$fail"
exit "$fail"
