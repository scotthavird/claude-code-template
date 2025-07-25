# Claude Code Template

A barebones, customizable starter template for Claude Code projects with devcontainer support, custom commands, and comprehensive hook logging for data science analysis.

## Quick Start

### Option 1: Using VS Code
1. **Use this template** to create a new repository
2. **Install** the [Remote-Containers extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers)
3. **Open the repository** in VS Code
4. **Select "Reopen in Container"** when prompted (or use `Cmd+Shift+P` → "Remote-Containers: Reopen in Container")
5. **Wait for setup** to complete (installs dependencies and configures environment)
6. **Open a terminal** in VS Code (`Ctrl+`` or `View → Terminal`)
7. **Start Claude Code** by running: `claude`
8. **Try the example command**: `/analyze-project`

### Option 2: Using Cursor
1. **Use this template** to create a new repository
2. **Open the repository** in Cursor
3. **Look for the devcontainer notification** or use `Cmd+Shift+P` → "Dev Containers: Reopen in Container"
4. **Wait for the container to build** and setup to complete
5. **Open a terminal** in Cursor (`Ctrl+`` or `View → Terminal`)
6. **Start Claude Code** by running: `claude`
7. **Try the example command**: `/analyze-project`

## Features

### DevContainer Ready
- Pre-configured development environment with Node.js 20
- Automatic setup of tools and dependencies
- Consistent environment across team members
- Security-focused with network restrictions

### Custom Slash Commands
- **`/analyze-project`** - Analyze project structure and provide insights
- Demonstrates YAML frontmatter, bash execution, and argument handling
- Easy to extend with your own commands

### Hook Logging & Analytics
- **Comprehensive logging** of all Claude Code events (PreToolUse, PostToolUse, UserPromptSubmit)
- **JSON format** for easy data science analysis
- **Built-in analysis tools** to understand usage patterns
- **Temporal analysis** and tool usage statistics

### Data Science Analysis
Run the analysis script to gain insights:
```bash
# Analyze all logged events
python3 scripts/analyze-logs.py

# Filter by specific tool
python3 scripts/analyze-logs.py --tool "edit_file"

# Filter by event type  
python3 scripts/analyze-logs.py --event "PostToolUse"
```

## Starting Claude Code

After your devcontainer is built and running:

1. **Open a terminal** in your IDE (`Ctrl+`` or `View → Terminal`)
2. **Run the command**: `claude`
3. **Wait for Claude Code to initialize** (first run may take a moment)
4. **Start chatting** or use slash commands like `/analyze-project`

### Common Claude Code Commands
- `claude` - Start interactive session
- `claude --help` - Show available options
- `claude --version` - Check version
- `/help` - Show available slash commands (once in interactive mode)

## Project Structure

```
.claude/
├── commands/           # Custom slash commands
│   └── analyze-project.md
└── settings.json      # Hook configurations

.devcontainer/
├── devcontainer.json  # Container setup
└── post-create.sh     # Environment setup script

scripts/
├── log-hook-event.sh  # Hook logging script
└── analyze-logs.py    # Log analysis tool

logs/                  # Generated logs (gitignored)
├── all-hooks.jsonl    # All events
└── hooks-YYYY-MM-DD.jsonl  # Daily logs
```

## Customization

### Adding Custom Commands
1. Create a new `.md` file in `.claude/commands/`
2. Use YAML frontmatter for configuration:
```markdown
---
description: Your command description
argument-hint: [optional-args]
allowed-tools: Bash(command:*), FileRead, etc.
---

Your command content here with $ARGUMENTS support
```

### Modifying Hook Behavior
Edit `.claude/settings.json` to:
- Change which events are logged
- Add custom hook scripts
- Filter by specific tools or patterns

### Analyzing Your Data
The included Python analysis script provides:
- Tool usage statistics
- Temporal patterns (hourly/daily usage)
- Argument pattern analysis
- Summary reports

## IDE-Specific Notes

### VS Code
- Requires the [Remote-Containers extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers)
- Extensions are pre-configured in `devcontainer.json`
- Terminal integrates seamlessly with the container

### Cursor
- Built-in devcontainer support (no additional extensions needed)
- Claude Code integration works natively within the container
- All logging and analysis tools work the same way
- Use `Cmd+Shift+P` → "Dev Containers" to access container commands

## Security Notes

- **Log files are gitignored** - they may contain sensitive data
- **Use `.claude/settings.local.json`** for sensitive local configurations
- **Review custom commands** before sharing with team
- **DevContainer provides isolation** but always use trusted repositories

## Learn More

- [Claude Code Documentation](https://docs.anthropic.com/en/docs/claude-code)
- [Custom Slash Commands](https://docs.anthropic.com/en/docs/claude-code/slash-commands)
- [Hooks Reference](https://docs.anthropic.com/en/docs/claude-code/hooks)
- [DevContainer Guide](https://docs.anthropic.com/en/docs/claude-code/devcontainer)

## Contributing

This template is designed to be forked and customized. Feel free to:
- Add more example commands
- Enhance the logging and analysis tools
- Improve the devcontainer configuration
- Share your customizations with the community

---

**Happy coding with Claude!**
