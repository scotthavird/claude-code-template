---
description: Run tests with coverage analysis and fix failing tests
argument-hint: [test-pattern] [--watch] [--coverage]
allowed-tools: Bash(npm:*), Bash(npx:*), Bash(yarn:*), Bash(pytest:*), Bash(go test:*), Read, Edit
---

# Test Command

## Project Test Configuration

- Package.json scripts: !`cat package.json 2>/dev/null | grep -A 20 '"scripts"' | head -25 || echo "No package.json found"`
- Test files: !`find . -name "*.test.*" -o -name "*.spec.*" -o -name "test_*.py" | head -15`
- Test config: !`ls -la jest.config.* vitest.config.* pytest.ini pyproject.toml 2>/dev/null | head -5 || echo "No test config found"`

## Your Task

Based on the arguments provided, execute tests and analyze results:

$ARGUMENTS

## Test Commands by Framework

### JavaScript/TypeScript

```bash
# Jest
npm test
npm test -- --coverage
npm test -- --watch
npm test -- path/to/test.spec.ts

# Vitest
npx vitest
npx vitest --coverage
npx vitest --watch

# Specific file
npm test -- --testPathPattern="filename"
```

### Python

```bash
# Pytest
pytest
pytest --cov=src
pytest -v test_file.py
pytest -k "test_name"

# Unittest
python -m unittest discover
```

### Go

```bash
go test ./...
go test -v ./...
go test -cover ./...
```

## Analysis Steps

1. **Run Tests**: Execute appropriate test command
2. **Analyze Failures**: If tests fail, identify root cause
3. **Check Coverage**: Report coverage metrics if available
4. **Suggest Fixes**: Propose solutions for failing tests

## Coverage Guidelines

| Coverage | Rating |
|----------|--------|
| > 80% | Good |
| 60-80% | Acceptable |
| < 60% | Needs improvement |

## Output Format

```markdown
## Test Results

### Summary
- Total: X tests
- Passed: X
- Failed: X
- Skipped: X

### Failed Tests (if any)
- `test_name`: Reason for failure

### Coverage Report
- Overall: X%
- Uncovered areas: ...

### Recommendations
- Suggested improvements
```
