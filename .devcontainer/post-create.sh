#!/bin/bash

# Post-create script for Claude Code Template devcontainer
echo "Setting up Claude Code Template environment..."

# Install zsh and oh-my-zsh for better terminal experience
sudo apt-get update
sudo apt-get install -y zsh curl git jq

# Install oh-my-zsh
if [ ! -d "$HOME/.oh-my-zsh" ]; then
    sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)" "" --unattended
fi

# Install Claude Code globally
echo "Installing Claude Code..."
npm install -g @anthropic-ai/claude-code

# Create logs directory for hook outputs
mkdir -p logs
chmod 755 logs

# Create scripts directory and make hook scripts executable
mkdir -p scripts
chmod +x scripts/*.sh 2>/dev/null || true

# Set up git if not already configured
if [ -z "$(git config --global user.name)" ]; then
    echo "Git user not configured. You may want to run:"
    echo "   git config --global user.name 'Your Name'"
    echo "   git config --global user.email 'your.email@example.com'"
fi

echo "Claude Code Template environment setup complete!"
echo ""
echo "Available features:"
echo "   • Custom slash commands in .claude/commands/"
echo "   • Skills (auto-triggered) in .claude/skills/"
echo "   • Custom agents in .claude/agents/"
echo "   • Hook examples with JSON logging in .claude/settings.json"
echo "   • Log analysis in logs/ directory"
echo ""
echo "To get started:"
echo "   1. Run 'claude' to start Claude Code"
echo "   2. Try the custom command: /analyze-project"
