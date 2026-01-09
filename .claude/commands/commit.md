---
description: Create a conventional commit with smart message generation
argument-hint: [type] [optional-scope]
allowed-tools: Bash(git:*)
---

# Smart Commit Command

## Current State

- Staged changes: !`git diff --staged --stat`
- Unstaged changes: !`git diff --stat`
- Untracked files: !`git status --porcelain | grep "^??" | head -10`

## Commit Types

Use conventional commit format: `type(scope): description`

| Type | Description |
|------|-------------|
| feat | New feature |
| fix | Bug fix |
| docs | Documentation only |
| style | Formatting, no code change |
| refactor | Code change, no feature/fix |
| perf | Performance improvement |
| test | Adding tests |
| chore | Maintenance tasks |
| ci | CI/CD changes |

## Your Task

Based on the staged changes above, create a commit with:

1. **Analyze Changes**: Understand what was modified
2. **Select Type**: Choose appropriate commit type
3. **Write Message**: Create clear, concise commit message
4. **Stage if Needed**: Stage relevant files if nothing is staged
5. **Commit**: Execute the commit

$ARGUMENTS

## Message Guidelines

- Start with lowercase after the type
- No period at the end
- Keep under 72 characters
- Focus on "why" not "what"
- Reference issue numbers if applicable

## Examples

```
feat(auth): add OAuth2 login support
fix(api): handle null response from user service
docs(readme): update installation instructions
refactor(utils): simplify date formatting logic
```
