---
description: Analyze the current project structure and provide insights
argument-hint: [optional-focus-area]
allowed-tools: Bash(find:*), Bash(wc:*), Bash(file:*)
---

# Project Analysis Command

## Context

- Project structure: !`find . -type f -name "*.js" -o -name "*.ts" -o -name "*.py" -o -name "*.md" -o -name "*.json" | head -20`
- File count by type: !`find . -type f | grep -E '\.(js|ts|py|md|json)$' | sed 's/.*\.//' | sort | uniq -c`
- Total lines of code: !`find . -name "*.js" -o -name "*.ts" -o -name "*.py" | xargs wc -l 2>/dev/null | tail -1 || echo "0 total"`

## Your Task

Based on the project structure above, provide a comprehensive analysis including:

1. **Architecture Overview**: Describe the overall project structure and organization
2. **Technology Stack**: Identify the main technologies and frameworks used
3. **Code Quality Insights**: Comment on file organization and potential improvements
4. **Development Recommendations**: Suggest next steps or areas for enhancement

$ARGUMENTS

Focus your analysis on practical insights that would help a developer understand and improve this codebase. 