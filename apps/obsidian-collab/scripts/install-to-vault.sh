#!/usr/bin/env bash
set -euo pipefail

VAULT_PATH="${1:-/Users/benjaminshafii/Documents/hello/test}"
PLUGIN_ID="obsidian-collab"

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PLUGIN_DIR="$VAULT_PATH/.obsidian/plugins/$PLUGIN_ID"

mkdir -p "$PLUGIN_DIR"

(
  cd "$REPO_ROOT"
  pnpm --filter @digital-empire/obsidian-collab build
)

ln -sf "$REPO_ROOT/apps/obsidian-collab/main.js" "$PLUGIN_DIR/main.js"
ln -sf "$REPO_ROOT/apps/obsidian-collab/manifest.json" "$PLUGIN_DIR/manifest.json"
