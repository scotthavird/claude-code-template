---
description: Create a pull request with auto-generated description
argument-hint: [base-branch]
allowed-tools: Bash(git:*), Bash(gh:*)
---

# Pull Request Command

## Current Branch State

- Current branch: !`git branch --show-current`
- Base branch: !`git remote show origin | grep 'HEAD branch' | cut -d' ' -f5`
- Commits ahead: !`git log --oneline origin/main..HEAD 2>/dev/null | head -20 || git log --oneline origin/master..HEAD 2>/dev/null | head -20`
- Files changed: !`git diff --stat origin/main..HEAD 2>/dev/null || git diff --stat origin/master..HEAD 2>/dev/null`

## Your Task

Create a pull request with:

1. **Analyze Changes**: Review all commits and file changes
2. **Generate Title**: Create concise, descriptive PR title
3. **Write Description**: Generate comprehensive PR description
4. **Create PR**: Use `gh pr create` command

$ARGUMENTS

## PR Description Template

```markdown
## Summary
<!-- 2-3 bullet points describing the changes -->

## Changes
<!-- Detailed list of what was modified -->

## Testing
<!-- How this was tested -->

## Checklist
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] No breaking changes (or documented)
```

## Commands

```bash
# Create PR
gh pr create --title "Title" --body "Description" --base main

# Create draft PR
gh pr create --draft --title "Title" --body "Description"

# Push and create PR
git push -u origin $(git branch --show-current) && gh pr create
```

## Guidelines

- Title should be clear and actionable
- Reference related issues with "Fixes #123" or "Relates to #123"
- Include breaking change notices if applicable
- Add reviewers if you know who should review
