#!/bin/bash
# PreCompact hook (Claude Code v2.1.105+).
# Fires before context compaction. Saves a tiny note about what was
# happening so the post-compact session can pick up where the pre-compact
# session left off.
#
# Exit codes:
#   0 = allow compaction
#   2 = block compaction (printed message goes to the model)
#
# This default implementation is permissive (always exits 0) and just
# writes a checkpoint file. Customize block-conditions to fit your team
# (e.g., block if there's an in-progress refactor with no tests yet).

set -u

payload="$(cat)"

if ! command -v jq >/dev/null 2>&1; then
  exit 0
fi

mkdir -p .claude/checkpoints

# Pull useful context from the payload to drop a checkpoint.
session_id="$(printf '%s' "$payload" | jq -r '.session_id // "unknown"')"
ts="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
checkpoint=".claude/checkpoints/pre-compact-${ts}-${session_id:0:8}.md"

# Best-effort git context for the checkpoint.
branch="$(git branch --show-current 2>/dev/null || echo unknown)"
dirty="$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')"
last_commit="$(git log -1 --oneline 2>/dev/null || echo none)"

cat > "$checkpoint" <<EOF
# Pre-compact checkpoint

Session: $session_id
Timestamp: $ts
Branch: $branch
Uncommitted files: $dirty
Last commit: $last_commit

(Compaction is about to drop earlier context. Use this checkpoint plus
the conversation transcript to reconstruct what was in flight.)
EOF

# Tell the model that a checkpoint was saved (optional notice).
echo "Pre-compact checkpoint saved to $checkpoint" >&2

exit 0
