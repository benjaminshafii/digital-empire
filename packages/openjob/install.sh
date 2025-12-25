#!/usr/bin/env bash
#
# openjob installer
# 
# Installs the OpenCode job scheduler plugin.
# Uses launchd (Mac) or systemd (Linux) for reliable scheduling.
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/benjaminshafii/digital-empire/master/packages/openjob/install.sh | bash
#
set -eo pipefail

REPO="benjaminshafii/digital-empire"
BRANCH="master"
BASE_URL="https://raw.githubusercontent.com/$REPO/$BRANCH/packages/openjob"

# Colors
MUTED='\033[0;2m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}openjob${NC} - OpenCode Job Scheduler"
echo ""

# Check platform
OS="$(uname -s)"
case "$OS" in
  Darwin)
    PLATFORM="mac"
    echo -e "${MUTED}Platform: macOS (using launchd)${NC}"
    ;;
  Linux)
    PLATFORM="linux"
    echo -e "${MUTED}Platform: Linux (using systemd)${NC}"
    ;;
  *)
    echo -e "${RED}Error: Unsupported platform: $OS${NC}"
    echo "Only macOS and Linux are supported."
    exit 1
    ;;
esac

# Check for opencode
if ! command -v opencode >/dev/null 2>&1; then
  echo -e "${RED}Error: opencode is required but not installed.${NC}"
  echo "Install with: curl -fsSL https://opencode.ai/install | bash"
  exit 1
fi

echo -e "${MUTED}Creating directories...${NC}"

# Create directories
mkdir -p ~/.config/opencode/plugin
mkdir -p ~/.config/opencode/jobs
mkdir -p ~/.config/opencode/logs

# Download plugin
echo -e "${MUTED}Downloading scheduler plugin...${NC}"
curl -fsSL "$BASE_URL/plugin/scheduler.ts" -o ~/.config/opencode/plugin/scheduler.ts

echo ""
echo -e "${GREEN}openjob installed${NC}"
echo ""
echo "Plugin: ~/.config/opencode/plugin/scheduler.ts"
echo "Jobs:   ~/.config/opencode/jobs/"
echo "Logs:   ~/.config/opencode/logs/"
echo ""
echo "Usage (in OpenCode):"
echo -e "  ${MUTED}\"Schedule a daily job at 9am to search for standing desks\"${NC}"
echo -e "  ${MUTED}\"Show my jobs\"${NC}"
echo -e "  ${MUTED}\"Run the standing desk job\"${NC}"
echo -e "  ${MUTED}\"Show logs for standing desk job\"${NC}"
echo -e "  ${MUTED}\"Delete the standing desk job\"${NC}"
echo ""
echo "Jobs will run even if your computer was asleep - they catch up when it wakes."
echo ""
echo "Restart OpenCode to load the plugin."
