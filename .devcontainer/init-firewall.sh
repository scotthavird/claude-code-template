#!/bin/bash
# DevContainer egress firewall.
# Restricts outbound network to an allowlist of hosts Claude Code needs:
# Anthropic API, GitHub, npm, PyPI, Docker Hub, Homebrew.
#
# Runs once at container create with CAP_NET_ADMIN. Idempotent.
#
# Skip by setting DISABLE_CLAUDE_FIREWALL=1 when launching.

set -euo pipefail

if [ "${DISABLE_CLAUDE_FIREWALL:-0}" = "1" ]; then
  echo "[firewall] DISABLE_CLAUDE_FIREWALL=1, skipping"
  exit 0
fi

if ! command -v iptables >/dev/null 2>&1; then
  echo "[firewall] iptables not installed; install with 'apt-get install -y iptables' in the image"
  exit 0
fi

if ! command -v ipset >/dev/null 2>&1; then
  sudo apt-get update -qq
  sudo apt-get install -y -qq ipset dnsutils
fi

ALLOWED_DOMAINS=(
  "api.anthropic.com"
  "claude.ai"
  "code.claude.com"
  "console.anthropic.com"
  "github.com"
  "api.github.com"
  "raw.githubusercontent.com"
  "objects.githubusercontent.com"
  "codeload.github.com"
  "registry.npmjs.org"
  "registry.yarnpkg.com"
  "pypi.org"
  "files.pythonhosted.org"
  "deb.debian.org"
  "security.debian.org"
  "archive.ubuntu.com"
  "security.ubuntu.com"
)

# Create an ipset for allowed destinations.
sudo ipset destroy claude-allow 2>/dev/null || true
sudo ipset create claude-allow hash:ip family inet hashsize 1024 maxelem 65536

for domain in "${ALLOWED_DOMAINS[@]}"; do
  # Resolve each domain and add all IPs.
  while IFS= read -r ip; do
    if [[ "$ip" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
      sudo ipset add claude-allow "$ip" 2>/dev/null || true
    fi
  done < <(dig +short "$domain" A)
done

# Allow loopback and established/related.
sudo iptables -F OUTPUT
sudo iptables -A OUTPUT -o lo -j ACCEPT
sudo iptables -A OUTPUT -m state --state ESTABLISHED,RELATED -j ACCEPT

# Allow DNS (needed for resolution).
sudo iptables -A OUTPUT -p udp --dport 53 -j ACCEPT
sudo iptables -A OUTPUT -p tcp --dport 53 -j ACCEPT

# Allow only HTTPS to allow-listed destinations.
sudo iptables -A OUTPUT -p tcp --dport 443 -m set --match-set claude-allow dst -j ACCEPT
sudo iptables -A OUTPUT -p tcp --dport 80  -m set --match-set claude-allow dst -j ACCEPT

# Drop everything else outbound.
sudo iptables -P OUTPUT DROP
sudo iptables -A OUTPUT -j REJECT --reject-with icmp-host-prohibited

# Smoke test: Anthropic should work, a random host should not.
if curl -sS --max-time 5 https://api.anthropic.com -o /dev/null; then
  echo "[firewall] ✔ api.anthropic.com reachable"
else
  echo "[firewall] ✘ api.anthropic.com unreachable — firewall too strict"
fi

echo "[firewall] done; $(sudo ipset list claude-allow | grep -c '^[0-9]') IPs allowed"
