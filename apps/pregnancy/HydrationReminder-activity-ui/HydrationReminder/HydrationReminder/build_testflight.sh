#!/bin/bash

# TestFlight Build Script
# Usage: ./build_testflight.sh

set -e

PROJECT_DIR="/Users/benjaminshafii/preg-app/HydrationReminder"
PROJECT_NAME="HydrationReminder"
SCHEME="HydrationReminder"
ARCHIVE_PATH="$PROJECT_DIR/build/$SCHEME.xcarchive"
EXPORT_PATH="$PROJECT_DIR/build"
EXPORT_OPTIONS="$PROJECT_DIR/HydrationReminder/ExportOptions.plist"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}📦 Starting TestFlight build process...${NC}"

# Clean build directory
echo -e "${BLUE}🧹 Cleaning build directory...${NC}"
rm -rf "$PROJECT_DIR/build"
mkdir -p "$PROJECT_DIR/build"

# Archive
echo -e "${BLUE}🔨 Building archive...${NC}"
cd "$PROJECT_DIR"
xcodebuild archive \
  -project "$PROJECT_NAME.xcodeproj" \
  -scheme "$SCHEME" \
  -configuration Release \
  -archivePath "$ARCHIVE_PATH" \
  -sdk iphoneos \
  -allowProvisioningUpdates \
  DEVELOPMENT_TEAM=DV5GMRMSLK \
  CODE_SIGN_STYLE=Automatic \
  ONLY_ACTIVE_ARCH=NO

echo -e "${GREEN}✅ Archive created successfully${NC}"

# Export IPA
echo -e "${BLUE}📦 Exporting IPA...${NC}"
xcodebuild -exportArchive \
  -archivePath "$ARCHIVE_PATH" \
  -exportPath "$EXPORT_PATH" \
  -exportOptionsPlist "$EXPORT_OPTIONS"

echo -e "${GREEN}✅ IPA exported successfully${NC}"
echo -e "${BLUE}📍 IPA location: $EXPORT_PATH/$SCHEME.ipa${NC}"

# Upload to TestFlight
echo -e "${BLUE}☁️  Ready to upload to TestFlight${NC}"
echo -e "${BLUE}Run this command to upload:${NC}"
echo -e "xcrun altool --upload-app \\"
echo -e "  --type ios \\"
echo -e "  --file \"$EXPORT_PATH/$SCHEME.ipa\" \\"
echo -e "  --username benjamin.shafii@gmail.com \\"
echo -e "  --password YOUR_APP_SPECIFIC_PASSWORD"
echo ""
echo -e "${BLUE}💡 Get app-specific password from: https://appleid.apple.com/account/manage${NC}"
