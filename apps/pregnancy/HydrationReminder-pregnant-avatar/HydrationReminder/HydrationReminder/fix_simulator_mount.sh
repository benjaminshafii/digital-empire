#!/bin/bash

# Fix iOS 26 Simulator Mount Error
# Run with: chmod +x fix_simulator_mount.sh && ./fix_simulator_mount.sh

echo "🔧 Fixing iOS 26 Simulator Mount Issues..."
echo ""

# Check disk space
echo "📊 Current disk space:"
df -h / | grep -v Filesystem
echo ""

# Option 1: Clean old simulator data (frees up space)
echo "Option 1: Clean old simulator data"
echo "This will remove old iOS device support files and simulator caches"
read -p "Clean old data? (y/n): " clean
if [ "$clean" = "y" ]; then
    echo "Cleaning..."
    rm -rf ~/Library/Developer/Xcode/iOS\ DeviceSupport/*/Symbols
    rm -rf ~/Library/Caches/com.apple.dt.Xcode
    xcrun simctl delete unavailable
    echo "✅ Cleaned old data"
fi
echo ""

# Option 2: Delete existing simulators and reinstall
echo "Option 2: Remove existing simulators"
read -p "Delete all simulators and reinstall? (y/n): " delete
if [ "$delete" = "y" ]; then
    echo "Deleting simulators..."
    xcrun simctl delete all
    rm -rf ~/Library/Developer/CoreSimulator/Caches
    echo "✅ Deleted simulators"
    echo ""
    echo "Now run: xcodebuild -downloadPlatform iOS"
fi
echo ""

# Option 3: Try alternative download method
echo "Option 3: Download simulator via Xcode Settings"
echo "1. Open Xcode"
echo "2. Xcode → Settings → Platforms"
echo "3. Click '+' to download iOS 26 Simulator"
echo "4. OR delete and re-download the simulator runtime"
echo ""

# Option 4: Check for disk/permission issues
echo "Option 4: Check for underlying issues"
read -p "Run disk utility checks? (y/n): " check
if [ "$check" = "y" ]; then
    echo "Checking CoreSimulator permissions..."
    ls -la ~/Library/Developer/CoreSimulator/Volumes/
    echo ""
    echo "Checking diskutil..."
    diskutil list
    echo ""
    echo "If you see permission errors, run:"
    echo "sudo chown -R $(whoami):staff ~/Library/Developer/CoreSimulator"
fi
echo ""

# Option 5: Free up more space
echo "💾 Current disk usage:"
du -sh ~/Library/Developer/CoreSimulator
du -sh ~/Library/Developer/Xcode
echo ""
echo "To free up space:"
echo "  - Empty Trash"
echo "  - Remove old Xcode archives: ~/Library/Developer/Xcode/Archives"
echo "  - Remove derived data: rm -rf ~/Library/Developer/Xcode/DerivedData/*"
echo ""

# IMPORTANT NOTE
echo "⚠️  IMPORTANT: For TestFlight, you DON'T need simulators!"
echo "Simulators are only for testing on Mac. TestFlight uses real device builds."
echo "You can safely ignore the simulator error and proceed with:"
echo "  1. In Xcode, select 'Any iOS Device (arm64)'"
echo "  2. Product → Archive"
echo "  3. Upload to TestFlight"
echo ""
echo "The simulator mount error won't affect your TestFlight upload."
