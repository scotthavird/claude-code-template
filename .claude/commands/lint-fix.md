---
description: Run linters and auto-fix code style issues
argument-hint: [path] [--check-only]
allowed-tools: Bash(npm:*), Bash(npx:*), Bash(yarn:*), Read, Edit
---

# Lint Fix Command

## Linter Configuration

- ESLint config: !`ls -la .eslintrc* eslint.config.* 2>/dev/null || echo "No ESLint config"`
- Prettier config: !`ls -la .prettierrc* prettier.config.* 2>/dev/null || echo "No Prettier config"`
- Package scripts: !`cat package.json 2>/dev/null | grep -E "(lint|format|prettier|eslint)" | head -10 || echo "No lint scripts"`

## Your Task

Run linters and fix code style issues:

$ARGUMENTS

## Linting Commands

### ESLint (JavaScript/TypeScript)

```bash
# Check for issues
npx eslint . --ext .js,.jsx,.ts,.tsx

# Auto-fix issues
npx eslint . --ext .js,.jsx,.ts,.tsx --fix

# Specific directory
npx eslint src/ --fix
```

### Prettier (Formatting)

```bash
# Check formatting
npx prettier --check .

# Fix formatting
npx prettier --write .

# Specific files
npx prettier --write "src/**/*.{ts,tsx}"
```

### Combined (Common Setup)

```bash
# Run both
npm run lint
npm run lint:fix
npm run format
```

### Python

```bash
# Black (formatting)
black .
black --check .

# Ruff (linting + formatting)
ruff check .
ruff check . --fix
ruff format .

# isort (imports)
isort .
```

## Execution Steps

1. **Detect Linters**: Identify which linters are configured
2. **Run Check**: First run in check-only mode to see issues
3. **Auto-Fix**: Apply automatic fixes where possible
4. **Report Remaining**: List issues that need manual attention

## Output Format

```markdown
## Lint Results

### Auto-Fixed Issues
- X files modified
- Types of fixes applied

### Remaining Issues (Manual Fix Required)
| File | Line | Issue | Rule |
|------|------|-------|------|
| src/file.ts | 15 | Description | rule-name |

### Commands Run
- `command 1`
- `command 2`
```

## Common Issues and Fixes

| Issue | Auto-fixable | Solution |
|-------|--------------|----------|
| Trailing whitespace | Yes | Prettier/ESLint --fix |
| Missing semicolons | Yes | ESLint --fix |
| Unused imports | Yes | ESLint --fix |
| Type errors | No | Manual fix required |
| Logic errors | No | Manual fix required |
