#!/bin/bash
# Start opencode serve with the correct project directory
cd /Users/benjaminshafii/git/personal/cool-website/apps/marketplace-tracker-v2
export OPENCODE_CONFIG_DIR="/Users/benjaminshafii/git/personal/cool-website/apps/marketplace-tracker-v2/.opencode"
exec opencode serve --port 4096
