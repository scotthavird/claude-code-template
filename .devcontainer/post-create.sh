#!/bin/bash
# Post-create setup for the Claude Code Template devcontainer.

set -euo pipefail

echo "[post-create] Setting up Claude Code Template environment..."

# Base packages.
sudo apt-get update -qq
sudo apt-get install -y -qq zsh curl git jq iptables ipset dnsutils ripgrep

# Oh-my-zsh for a nicer terminal.
if [ ! -d "$HOME/.oh-my-zsh" ]; then
  sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)" "" --unattended
fi

# Claude Code CLI.
echo "[post-create] Installing Claude Code CLI..."
if ! command -v claude >/dev/null 2>&1; then
  npm install -g @anthropic-ai/claude-code
fi

# Egress firewall (restricts outbound network to an allowlist).
if [ -x .devcontainer/init-firewall.sh ]; then
  echo "[post-create] Initializing egress firewall..."
  bash .devcontainer/init-firewall.sh || echo "[post-create] firewall init skipped/failed (non-fatal)"
fi

# Make project hook scripts executable.
chmod +x scripts/*.sh scripts/hooks/*.sh .claude/statusline/*.sh 2>/dev/null || true

# Create logs directory.
mkdir -p logs && chmod 755 logs

# Git config hint.
if [ -z "$(git config --global user.name 2>/dev/null || true)" ]; then
  echo
  echo "[post-create] ⚠ Git user not configured. Run:"
  echo "   git config --global user.name 'Your Name'"
  echo "   git config --global user.email 'your.email@example.com'"
fi

cat <<'EOF'

[post-create] ✔ Setup complete.

Available features:
  • Slash commands         .claude/commands/     (/commit, /pr, /review, /debug, …)
  • Subagents              .claude/agents/       (security-auditor, debugger, …)
  • Skills (auto-trigger)  .claude/skills/       (code-review, test-writing, …)
  • Output styles          .claude/output-styles/  (concise, educational, review)
  • Status line            .claude/statusline/
  • Hooks                  scripts/hooks/        (format-on-save, block-dangerous, …)
  • MCP servers            .mcp.json
  • Agent SDK starter      sdk/

Get started:
  1. Export your API key:  export ANTHROPIC_API_KEY=...
  2. Run 'claude' to start a session.
  3. Try '/analyze-project' or '/review'.

Docs:
  • README.md
  • docs/best-practices.md
  • docs/permission-modes.md
  • docs/hooks-cookbook.md
EOF
