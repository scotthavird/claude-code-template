---
description: Generate or update documentation via the doc-generator subagent.
argument-hint: [target-path-or-"readme"]
allowed-tools: Task, Read, Write, Edit, Glob, Grep
---

# Doc Command

Delegate to the `doc-generator` subagent.

## Your task

$ARGUMENTS

Default target: if no argument, generate/update the top-level `README.md`.
If a file path is given, add or refresh JSDoc/TSDoc/docstrings for the
public API in that file. If the argument is `architecture`, produce
`docs/architecture.md` with a Mermaid system diagram.

Never overwrite human-authored prose without preserving a diff; show the
proposed changes first.
