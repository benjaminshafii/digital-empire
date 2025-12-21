#!/bin/bash
#
# Script to check Xcode project build status
#
# This script:
# 1. Runs xcodebuild to check for compilation errors
# 2. Reports any errors found
# 3. Provides summary of what needs to be fixed
#

set -e

PROJECT="phoneless-hevy.xcodeproj"
SCHEME="phoneless-hevy Watch App"

echo "🔨 Building Xcode Project"
echo "=========================="
echo "Project: $PROJECT"
echo "Scheme: $SCHEME"
echo ""

# Create build log directory
LOG_DIR="build_logs"
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/build_$(date +%Y%m%d_%H%M%S).log"

echo "📝 Build output will be saved to: $LOG_FILE"
echo ""

# Try to build
echo "⏳ Building... (this may take a minute)"
echo ""

if xcodebuild \
    -project "$PROJECT" \
    -scheme "$SCHEME" \
    -destination "generic/platform=watchOS" \
    clean build \
    2>&1 | tee "$LOG_FILE"; then

    echo ""
    echo "=================================="
    echo "✅ BUILD SUCCEEDED!"
    echo "=================================="
    exit 0
else
    echo ""
    echo "=================================="
    echo "❌ BUILD FAILED"
    echo "=================================="
    echo ""
    echo "Errors found:"
    echo ""

    # Extract error messages
    grep -i "error:" "$LOG_FILE" || echo "No specific error messages found"

    echo ""
    echo "Full build log saved to: $LOG_FILE"
    echo ""
    echo "Common fixes:"
    echo "  1. Add missing files to Xcode project (File > Add Files to...)"
    echo "  2. Check file paths in project navigator"
    echo "  3. Verify all files are included in target"
    echo ""
    exit 1
fi
