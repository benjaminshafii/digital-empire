#!/usr/bin/env bash
set -euo pipefail

APP=openjob

MUTED='\033[0;2m'
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

echo -e "${MUTED}Installing ${NC}openjob${MUTED} - OpenCode Job Runner${NC}"
echo ""

# Detect OS and architecture
raw_os=$(uname -s)
os=$(echo "$raw_os" | tr '[:upper:]' '[:lower:]')
case "$raw_os" in
  Darwin*) os="darwin" ;;
  Linux*) os="linux" ;;
  *)
    echo -e "${RED}Unsupported OS: $raw_os${NC}"
    exit 1
    ;;
esac

arch=$(uname -m)
case "$arch" in
  aarch64|arm64) arch="arm64" ;;
  x86_64) arch="x64" ;;
  *)
    echo -e "${RED}Unsupported architecture: $arch${NC}"
    exit 1
    ;;
esac

# Handle Rosetta
if [ "$os" = "darwin" ] && [ "$arch" = "x64" ]; then
  rosetta_flag=$(sysctl -n sysctl.proc_translated 2>/dev/null || echo 0)
  if [ "$rosetta_flag" = "1" ]; then
    arch="arm64"
  fi
fi

target="$os-$arch"

# Check for tmux
if ! command -v tmux >/dev/null 2>&1; then
  echo -e "${RED}Error: tmux is required but not installed.${NC}"
  if [ "$os" = "darwin" ]; then
    echo "Install with: brew install tmux"
  else
    echo "Install with: apt install tmux (or your package manager)"
  fi
  exit 1
fi

# Check for opencode
if ! command -v opencode >/dev/null 2>&1; then
  echo -e "${RED}Error: opencode is required but not installed.${NC}"
  echo "Install with: curl -fsSL https://opencode.ai/install | bash"
  exit 1
fi

# Installation directory
INSTALL_DIR=$HOME/.local/bin
mkdir -p "$INSTALL_DIR"

# Requires bun to be installed
if ! command -v bun >/dev/null 2>&1; then
  echo -e "${MUTED}Installing bun...${NC}"
  curl -fsSL https://bun.sh/install | bash
  export PATH="$HOME/.bun/bin:$PATH"
fi

# Clone and build from source
REPO_DIR="${TMPDIR:-/tmp}/openjob-install-$$"
REPO_URL="${OPENJOB_SOURCE:-https://github.com/benjaminshafii/digital-empire}"

echo -e "${MUTED}Building from source...${NC}"

# For development: use local source if available (when running install.sh directly from repo)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -f "$SCRIPT_DIR/src/cli/index.ts" ]; then
  echo -e "${MUTED}Using local source${NC}"
  cd "$SCRIPT_DIR"
  bun install
  bun build src/cli/index.ts --compile --outfile "$INSTALL_DIR/$APP"
else
  # Clone and build from GitHub
  echo -e "${MUTED}Cloning $REPO_URL...${NC}"
  git clone --depth 1 "$REPO_URL" "$REPO_DIR"
  cd "$REPO_DIR/packages/openjob"
  bun install
  bun build src/cli/index.ts --compile --outfile "$INSTALL_DIR/$APP"
  rm -rf "$REPO_DIR"
fi

chmod +x "$INSTALL_DIR/$APP"

# Add to PATH if needed
add_to_path() {
  local config_file=$1
  local command=$2

  if grep -Fxq "$command" "$config_file" 2>/dev/null; then
    return 0
  fi

  if [[ -w $config_file ]]; then
    echo -e "\n# openjob" >> "$config_file"
    echo "$command" >> "$config_file"
    echo -e "${MUTED}Added to PATH in ${NC}$config_file"
  fi
}

if [[ ":$PATH:" != *":$INSTALL_DIR:"* ]]; then
  current_shell=$(basename "$SHELL")
  case $current_shell in
    fish)
      add_to_path "$HOME/.config/fish/config.fish" "fish_add_path $INSTALL_DIR"
      ;;
    zsh)
      add_to_path "$HOME/.zshrc" "export PATH=$INSTALL_DIR:\$PATH"
      ;;
    bash)
      add_to_path "$HOME/.bashrc" "export PATH=$INSTALL_DIR:\$PATH"
      ;;
  esac
fi

echo ""
echo -e "${GREEN}openjob installed successfully!${NC}"
echo ""
echo -e "${MUTED}Quick start:${NC}"
echo ""
echo -e "  openjob                    # Start interactive TUI"
echo -e "  openjob serve              # Start web UI + scheduler"
echo -e "  openjob --help             # Show all commands"
echo ""
echo -e "${MUTED}For more info: https://github.com/benjaminshafii/digital-empire/tree/master/packages/openjob${NC}"
echo ""
