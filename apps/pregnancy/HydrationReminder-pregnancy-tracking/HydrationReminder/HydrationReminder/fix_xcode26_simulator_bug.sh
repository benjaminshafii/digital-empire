#!/bin/bash

# Xcode 26 Beta Simulator Mount Bug Workaround
# This is a KNOWN BUG in Xcode 26.0.1 on macOS 26 beta
# Multiple users reporting same issue: https://developer.apple.com/forums/thread/803376

echo "🐛 Xcode 26 Beta + macOS 26 Beta Simulator Mount Bug"
echo ""
echo "This is a KNOWN BUG in beta software. Options:"
echo ""

# Option 1: Use older iOS simulator
echo "Option 1: Try iOS 18 simulator instead"
echo "1. Open Xcode → Settings → Platforms"
echo "2. Delete iOS 26 simulator"
echo "3. Download iOS 18.x simulator instead"
echo ""

# Option 2: Report to Apple
echo "Option 2: Report to Apple"
echo "File a bug report at: https://feedbackassistant.apple.com"
echo "Reference: FB15977453 (similar reported bugs)"
echo ""

# Option 3: Downgrade (not recommended)
echo "Option 3: Downgrade (if critical)"
echo "- Downgrade to Xcode 15 + macOS 15 Sequoia"
echo "- Or wait for next beta release"
echo ""

# Option 4: Manual cleanup attempt
echo "Option 4: Try nuclear cleanup (may not work)"
read -p "Attempt full simulator cleanup? (y/n): " cleanup
if [ "$cleanup" = "y" ]; then
    echo "Killing simdiskimaged..."
    sudo killall -9 simdiskimaged 2>/dev/null
    
    echo "Removing CoreSimulator..."
    rm -rf ~/Library/Developer/CoreSimulator/Volumes/*
    rm -rf ~/Library/Developer/CoreSimulator/Caches/*
    
    echo "Removing Xcode caches..."
    rm -rf ~/Library/Caches/com.apple.dt.Xcode/*
    
    echo "Resetting simdiskimaged..."
    sudo rm -rf /Library/Developer/CoreSimulator/Volumes/*
    
    echo "✅ Cleanup done. Restart Mac and try again."
    echo "Then run: xcodebuild -downloadPlatform iOS"
fi
echo ""

# MOST IMPORTANT
echo "⚠️  CRITICAL: You DON'T need simulators for TestFlight!"
echo ""
echo "✅ FOR TESTFLIGHT (what you actually need):"
echo "1. In Xcode, select 'Any iOS Device (arm64)' - NOT a simulator"
echo "2. Product → Archive"
echo "3. Upload to TestFlight"
echo ""
echo "Simulators are ONLY for testing on Mac."
echo "Real device archives work fine despite this simulator bug."
echo ""
echo "📝 Known issues thread:"
echo "https://developer.apple.com/forums/thread/803376"
echo "https://github.com/actions/runner-images/issues/12757"
