# Claude Code Template Project Memory

## Project Overview

This is a comprehensive Claude Code template designed for rapid prototyping and development. It includes:

- **DevContainer Support**: Full containerized development environment
- **Custom Slash Commands**: Multiple workflow commands (commit, pr, test, lint-fix, analyze-project)
- **Skills**: Auto-triggered contextual helpers (code-review, db-migration)
- **Custom Agents**: Specialized task delegation (security-auditor, doc-generator)
- **MCP Integration**: External tool connections
- **Hook System**: Comprehensive event logging and automation
- **Permission Rules**: Security-first defaults
- **Analysis Tools**: Python scripts for analyzing usage patterns

## Architecture

### Directory Structure

```
.claude/
├── commands/              # Custom slash commands
│   ├── analyze-project.md # Project structure analysis
│   ├── commit.md          # Smart conventional commits
│   ├── pr.md              # Pull request creation
│   ├── test.md            # Test runner with coverage
│   └── lint-fix.md        # Auto-fix code style
├── skills/                # Auto-triggered contextual helpers
│   ├── code-review/       # Activates for code reviews
│   │   └── SKILL.md
│   └── db-migration/      # Activates for database work
│       └── SKILL.md
├── agents/                # Custom AI agents
│   ├── security-auditor.md  # Security vulnerability scanning
│   └── doc-generator.md     # Documentation generation
├── settings.json          # Project-level Claude settings
└── settings.local.json.example  # Template for local settings

.devcontainer/
├── devcontainer.json      # Container configuration
└── post-create.sh         # Setup script

.mcp.json                  # MCP server configuration

scripts/
├── log-hook-event.sh      # Hook logging script
└── analyze-logs.py        # Log analysis tool

logs/                      # Generated log files (gitignored)
├── all-hooks.jsonl        # All events
├── hooks-YYYY-MM-DD.jsonl # Daily logs
└── {event-type}-events.jsonl  # Event-specific logs
```

## Features

### 1. Custom Slash Commands

| Command | Description | Usage |
|---------|-------------|-------|
| `/analyze-project` | Analyze project structure | `/analyze-project [focus-area]` |
| `/commit` | Smart conventional commits | `/commit [type] [scope]` |
| `/pr` | Create pull request | `/pr [base-branch]` |
| `/test` | Run tests with coverage | `/test [pattern] [--watch]` |
| `/lint-fix` | Auto-fix code style | `/lint-fix [path]` |

### 2. Skills (Auto-Triggered)

Skills automatically activate based on context:

| Skill | Triggers When |
|-------|---------------|
| **code-review** | Reviewing PRs, checking code quality, preparing commits |
| **db-migration** | Working with migrations, schema changes, ORM models |

### 3. Custom Agents

Invoke agents for specialized tasks:

| Agent | Purpose | Usage |
|-------|---------|-------|
| **security-auditor** | Scan for vulnerabilities, secrets, OWASP issues | Proactive security reviews |
| **doc-generator** | Generate README, API docs, JSDoc comments | Documentation tasks |

### 4. Hook System

Configured hooks (in `settings.json`):

| Hook Type | Purpose |
|-----------|---------|
| SessionStart | Initialize session, load context |
| PreToolUse | Log before tool execution |
| PostToolUse | Log after execution, validate edits |
| UserPromptSubmit | Log user prompts |
| Notification | Log system notifications |
| Stop | Log session end |

### 5. Permission Rules

Security-first permission configuration:

**Allowed:**
- npm, yarn, npx commands
- git and gh (GitHub CLI)
- docker commands
- File reading and common utilities

**Denied:**
- Reading `.env` files
- Reading secrets directories
- Destructive commands (`rm -rf`)

### 6. MCP Integration

Pre-configured MCP servers (in `.mcp.json`):

| Server | Purpose |
|--------|---------|
| github | Repository management, issues, PRs |
| filesystem | Enhanced file operations |
| memory | Persistent memory across sessions |

## Usage Instructions

### Getting Started

#### VS Code
1. Install Remote-Containers extension
2. Open repository in VS Code
3. Select "Reopen in Container" when prompted
4. Wait for post-create script to complete setup

#### Cursor
1. Open repository in Cursor
2. Use Cmd+Shift+P → "Dev Containers: Reopen in Container"
3. Wait for container build and setup to complete

### Using Commands

```bash
# Analyze project
/analyze-project
/analyze-project security

# Create commits
/commit               # Auto-detect type
/commit feat auth     # Feature in auth scope

# Create PR
/pr                   # Default to main
/pr develop           # PR to develop branch

# Run tests
/test
/test --coverage
/test auth.spec.ts

# Fix linting
/lint-fix
/lint-fix src/
```

### Using Agents

Agents are automatically invoked when relevant, or you can request them:
- "Run a security audit on this codebase"
- "Generate documentation for the API"

### Log Analysis

```bash
# Analyze all logs
python3 scripts/analyze-logs.py

# Filter by specific tool
python3 scripts/analyze-logs.py --tool "Edit"

# Filter by event type
python3 scripts/analyze-logs.py --event "PostToolUse"
```

## Development Guidelines

### Adding Custom Commands

1. Create `.md` file in `.claude/commands/`
2. Add YAML frontmatter:
   ```yaml
   ---
   description: Brief description
   argument-hint: [arg1] [arg2]
   allowed-tools: Bash(git:*), Read, Edit
   ---
   ```
3. Use `$ARGUMENTS` for dynamic content
4. Use `!` prefix for bash command execution

### Adding Skills

1. Create directory in `.claude/skills/`
2. Add `SKILL.md` with frontmatter:
   ```yaml
   ---
   name: skill-name
   description: When this skill activates
   allowed-tools: Read, Grep, Glob
   ---
   ```
3. Include comprehensive instructions

### Adding Agents

1. Create `.md` file in `.claude/agents/`
2. Add YAML frontmatter:
   ```yaml
   ---
   name: agent-name
   description: What this agent does
   tools: Read, Grep, Glob, Bash
   model: sonnet
   ---
   ```

### Modifying Hooks

1. Edit `.claude/settings.json`
2. Use matchers to target specific tools:
   - `"*"` matches all
   - `"Edit|Write"` matches multiple
   - `"Bash"` matches exact tool
3. Commands receive JSON input via stdin
4. Return exit code 0 for success, 2 for blocking error

### Local Configuration

1. Copy `.claude/settings.local.json.example` to `.claude/settings.local.json`
2. Add personal API keys, tokens, custom permissions
3. This file is gitignored for security

## Security Considerations

- Logs may contain sensitive data - they're gitignored
- Hook scripts run with project permissions
- Review custom commands before sharing
- Use `.claude/settings.local.json` for sensitive local config
- Permission deny rules protect secrets by default
- Never commit `.env` files or credentials

## Best Practices

- Keep commands focused and well-documented
- Use descriptive names for hook scripts
- Regularly analyze logs to optimize workflows
- Test hooks thoroughly before deployment
- Use skills for repeatable contextual tasks
- Use agents for complex specialized workflows
- Leverage MCP servers for external integrations
