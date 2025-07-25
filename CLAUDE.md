# Claude Code Template Project Memory

## Project Overview
This is a barebones Claude Code template designed for rapid prototyping and development. It includes:

- **DevContainer Support**: Full containerized development environment
- **Custom Slash Commands**: Example project analysis command
- **Hook Logging**: JSON logging of all Claude Code events for data science analysis
- **Analysis Tools**: Python scripts for analyzing usage patterns

## Architecture

### Directory Structure
```
.claude/
├── commands/           # Custom slash commands
│   └── analyze-project.md
└── settings.json      # Project-level Claude settings with hooks

.devcontainer/
├── devcontainer.json  # Container configuration
└── post-create.sh     # Setup script

scripts/
├── log-hook-event.sh  # Hook logging script
└── analyze-logs.py    # Log analysis tool

logs/                  # Generated log files (gitignored)
├── all-hooks.jsonl    # All events
├── hooks-YYYY-MM-DD.jsonl  # Daily logs
└── {event-type}-events.jsonl  # Event-specific logs
```

### Key Features

1. **Custom Commands**: The `/analyze-project` command demonstrates:
   - YAML frontmatter configuration
   - Bash command execution with `!` prefix
   - Dynamic argument handling with `$ARGUMENTS`
   - Tool permissions with `allowed-tools`

2. **Hook System**: Configured to log:
   - PreToolUse events (before tool execution)
   - PostToolUse events (after tool execution)  
   - UserPromptSubmit events (when user submits prompts)

3. **Data Science Ready**: All events logged as structured JSON for analysis

## Usage Instructions

### Getting Started

#### VS Code
1. Install Remote-Containers extension
2. Open repository in VS Code
3. Select "Reopen in Container" when prompted
4. Wait for post-create script to complete setup

#### Cursor
1. Open repository in Cursor
2. Look for devcontainer notification or use Cmd+Shift+P → "Dev Containers: Reopen in Container"
3. Wait for container build and setup to complete
4. Claude Code works natively within the container environment

### Available Commands
- `/analyze-project` - Analyze current project structure
- `/analyze-project security` - Focus analysis on security aspects

### Log Analysis
```bash
# Analyze all logs
python3 scripts/analyze-logs.py

# Filter by specific tool
python3 scripts/analyze-logs.py --tool "edit_file"

# Filter by event type
python3 scripts/analyze-logs.py --event "PostToolUse"
```

## Development Guidelines

### Adding Custom Commands
1. Create `.md` file in `.claude/commands/`
2. Use YAML frontmatter for configuration
3. Include `allowed-tools` for security
4. Use `$ARGUMENTS` for dynamic content

### Modifying Hooks
1. Edit `.claude/settings.json`
2. Use matchers to target specific tools
3. Commands receive JSON input via stdin
4. Return exit code 0 for success

### Security Considerations
- Logs may contain sensitive data - they're gitignored
- Hook scripts run with project permissions
- Review custom commands before sharing
- Use `.claude/settings.local.json` for sensitive local config

## Best Practices
- Keep commands focused and well-documented
- Use descriptive names for hook scripts
- Regularly analyze logs to optimize workflows
- Test hooks thoroughly before deployment 