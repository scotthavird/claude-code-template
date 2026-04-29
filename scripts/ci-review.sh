#!/bin/bash
# Run Claude Code in headless mode to review the current diff.
# Usage:
#   scripts/ci-review.sh                      # review uncommitted diff
#   scripts/ci-review.sh origin/main...HEAD   # review branch diff
#   scripts/ci-review.sh --ultrareview <pr>   # delegate to /ultrareview cloud agents
#
# Requires ANTHROPIC_API_KEY in the environment.

set -euo pipefail

# Mode 1: ultrareview — delegate to the cloud-based parallel reviewer
# (Claude Code v2.1.120+). Shorter, cheaper for the runner, slower for
# the user; runs more agents than a single -p invocation can.
if [ "${1:-}" = "--ultrareview" ]; then
  target="${2:-HEAD}"
  if [ -z "${ANTHROPIC_API_KEY:-}" ]; then
    echo "ANTHROPIC_API_KEY not set" >&2
    exit 1
  fi
  exec claude ultrareview "$target"
fi

# Mode 2: classic headless review with -p.
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
