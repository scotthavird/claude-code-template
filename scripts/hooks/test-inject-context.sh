#!/bin/bash
# Smoke tests for scripts/hooks/inject-context.sh.
# Run from repo root: bash scripts/hooks/test-inject-context.sh
#
# Builds throwaway git repos, pipes SessionStart payloads shaped like the
# ones Claude Code sends (https://code.claude.com/docs/en/hooks#sessionstart-input)
# into the hook, and checks the JSON it prints. `gh` is stubbed out so the
# tests make no network calls.
set -u

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
HOOK="$REPO_ROOT/scripts/hooks/inject-context.sh"

if ! command -v jq >/dev/null 2>&1; then
  echo "SKIP  jq not installed"
  exit 0
fi

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
mkdir -p "$TMP/bin"
printf '#!/bin/bash\nexit 1\n' >"$TMP/bin/gh"
chmod +x "$TMP/bin/gh"

repo="$TMP/repo"
mkdir -p "$repo"
(
  cd "$repo" &&
    git init -q -b main &&
    git -c user.email=t@example.com -c user.name=t commit -q --allow-empty -m "init" &&
    git -c user.email=t@example.com -c user.name=t commit -q --allow-empty -m "second"
) || { echo "FAIL  could not create test repo"; exit 1; }

pass=0
fail=0
ok() { printf '  PASS  %s\n' "$1"; pass=$((pass + 1)); }
ko() { printf '  FAIL  %s\n        %s\n' "$1" "$2"; fail=$((fail + 1)); }

# run_hook <dir> <payload> [env...]
run_hook() {
  local dir="$1" payload="$2"
  shift 2
  (cd "$dir" && printf '%s' "$payload" | env -u CLAUDE_JOB_DIR -u INJECT_CONTEXT_NO_TITLE PATH="$TMP/bin:$PATH" "$@" bash "$HOOK")
}

STARTUP='{"session_id":"abc123","transcript_path":"/tmp/t.jsonl","cwd":"/tmp/repo","hook_event_name":"SessionStart","source":"startup","model":"claude-opus-5-5"}'
NAMED='{"session_id":"abc123","transcript_path":"/tmp/t.jsonl","cwd":"/tmp/repo","hook_event_name":"SessionStart","source":"startup","session_title":"my-custom-name"}'

# 1. Feature branch -> sessionTitle is the branch, context is attached.
git -C "$repo" checkout -q -b feature/parallel-agents
out="$(run_hook "$repo" "$STARTUP")"
if printf '%s' "$out" | jq -e '.hookSpecificOutput.hookEventName == "SessionStart"
    and .hookSpecificOutput.sessionTitle == "feature/parallel-agents"
    and (.hookSpecificOutput.additionalContext | contains("Branch: `feature/parallel-agents`"))
    and (.hookSpecificOutput.additionalContext | contains("second"))' >/dev/null; then
  ok 'feature branch -> sessionTitle + additionalContext'
else
  ko 'feature branch -> sessionTitle + additionalContext' "got: $out"
fi

# 2. Existing custom title (--name, /rename) is never overwritten.
out="$(run_hook "$repo" "$NAMED")"
printf '%s' "$out" | jq -e '.hookSpecificOutput | has("sessionTitle") | not' >/dev/null &&
  ok 'session_title present -> no sessionTitle' || ko 'session_title present -> no sessionTitle' "got: $out"

# 3. Background session (CLAUDE_JOB_DIR set) keeps agent view's name.
out="$(run_hook "$repo" "$STARTUP" CLAUDE_JOB_DIR="$HOME/.claude/jobs/7c5dcf5d")"
printf '%s' "$out" | jq -e '(.hookSpecificOutput | has("sessionTitle") | not) and (.hookSpecificOutput.additionalContext | length > 0)' >/dev/null &&
  ok 'background session -> context but no sessionTitle' || ko 'background session -> context but no sessionTitle' "got: $out"

# 4. Opt-out variable.
out="$(run_hook "$repo" "$STARTUP" INJECT_CONTEXT_NO_TITLE=1)"
printf '%s' "$out" | jq -e '.hookSpecificOutput | has("sessionTitle") | not' >/dev/null &&
  ok 'INJECT_CONTEXT_NO_TITLE=1 -> no sessionTitle' || ko 'INJECT_CONTEXT_NO_TITLE=1 -> no sessionTitle' "got: $out"

# 5. Default branch -> no title.
git -C "$repo" checkout -q main
out="$(run_hook "$repo" "$STARTUP")"
printf '%s' "$out" | jq -e '.hookSpecificOutput | has("sessionTitle") | not' >/dev/null &&
  ok 'main -> no sessionTitle' || ko 'main -> no sessionTitle' "got: $out"

# 6. Detached HEAD -> no title, context says so.
git -C "$repo" checkout -q --detach HEAD~1
out="$(run_hook "$repo" "$STARTUP")"
printf '%s' "$out" | jq -e '(.hookSpecificOutput | has("sessionTitle") | not) and (.hookSpecificOutput.additionalContext | contains("detached HEAD"))' >/dev/null &&
  ok 'detached HEAD -> no sessionTitle' || ko 'detached HEAD -> no sessionTitle' "got: $out"

# 7. Empty stdin (run by hand) still works.
git -C "$repo" checkout -q feature/parallel-agents
out="$(run_hook "$repo" '')"
printf '%s' "$out" | jq -e '.hookSpecificOutput.sessionTitle == "feature/parallel-agents"' >/dev/null &&
  ok 'empty payload -> still titled' || ko 'empty payload -> still titled' "got: $out"

# 8. Outside a git repo -> no output, exit 0.
mkdir -p "$TMP/not-a-repo"
out="$(run_hook "$TMP/not-a-repo" "$STARTUP")"
rc=$?
[ "$rc" -eq 0 ] && [ -z "$out" ] && ok 'not a git repo -> silent, exit 0' || ko 'not a git repo -> silent, exit 0' "rc=$rc out=$out"

printf '\n%d passed, %d failed\n' "$pass" "$fail"
exit "$fail"
