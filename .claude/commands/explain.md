---
description: Explain a file, function, or concept in the codebase at a chosen depth.
argument-hint: [path-or-symbol] [--depth=shallow|deep]
allowed-tools: Read, Grep, Glob, Bash(git:*)
---

# Explain Command

## Your task

$ARGUMENTS

Explain the target in three layers:

1. **What it does** — one paragraph, plain language.
2. **Why it exists** — what problem does it solve? Check `git log --diff-filter=A -- <path>` for the introduction commit to find original intent.
3. **How it works** — the interesting implementation details. Point out
   non-obvious choices and invariants the reader must preserve.

End with:
- **Callers** — who uses this? (quick grep)
- **Dependencies** — what does it use?
- **Danger zones** — what's easy to break if you edit this?

Default depth is shallow (3–4 paragraphs). Use `--depth=deep` for a
comprehensive walkthrough.
