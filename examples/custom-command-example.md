---
description: Generate a comprehensive security review of the codebase
argument-hint: [focus-area]
allowed-tools: Bash(find:*), Bash(grep:*), Bash(cat:*)
---

# Security Review Command Example

This is an example of how to create a custom security-focused command.

## Context

- Find potential security issues: !`find . -name "*.js" -o -name "*.ts" -o -name "*.py" | xargs grep -l "password\|secret\|token\|api_key" | head -10`
- Check for hardcoded credentials: !`grep -r "password\s*=" . --include="*.js" --include="*.ts" --include="*.py" | head -5`
- Look for SQL injection risks: !`grep -r "SELECT.*\+" . --include="*.js" --include="*.ts" --include="*.py" | head -5`

## Your Task

Based on the security scan above, provide a detailed security review focusing on:

1. **Credential Management**: Check for hardcoded secrets or insecure storage
2. **Input Validation**: Look for potential injection vulnerabilities  
3. **Authentication**: Review authentication and authorization patterns
4. **Data Exposure**: Identify potential data leakage risks

$ARGUMENTS

Provide specific recommendations for improving security posture. 