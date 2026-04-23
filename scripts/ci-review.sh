#!/bin/bash
# Run Claude Code in headless mode to review the current diff.
# Usage:
#   scripts/ci-review.sh                      # review uncommitted diff
#   scripts/ci-review.sh origin/main...HEAD   # review branch diff
#
# Requires ANTHROPIC_API_KEY in the environment.

set -euo pipefail

range="${1:-HEAD}"

if [ -z "${ANTHROPIC_API_KEY:-}" ]; then
  echo "ANTHROPIC_API_KEY not set" >&2
  exit 1
fi

diff_text="$(git diff "$range")"

if [ -z "$diff_text" ]; then
  echo "No diff to review for range: $range"
  exit 0
fi

# Pipe the diff + instructions into headless mode. -p => one-shot print mode.
printf '%s\n\n---\n\n%s\n' \
  "Review the following git diff. Focus on correctness, security, and test coverage.
Produce a structured review: BLOCKER / MAJOR / MINOR / QUESTION / PRAISE,
each with file:line references. No preamble." \
  "$diff_text" \
  | claude -p --output-format text --permission-mode plan
