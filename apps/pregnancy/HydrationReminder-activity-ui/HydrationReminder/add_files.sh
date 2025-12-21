#!/bin/bash
# Simple script to trigger Xcode file recognition

# Get absolute paths
DAILY_FILE="$(pwd)/HydrationReminder/DailyCalorieTrackerCard.swift"
WEEKLY_FILE="$(pwd)/HydrationReminder/WeeklyCalorieTrackerCard.swift"

# Use xed to open and let Xcode discover the files
xed --create "$DAILY_FILE"
xed --create "$WEEKLY_FILE"

echo "Files have been opened in Xcode. Please add them to the project manually."
echo "1. In Xcode, right-click on the HydrationReminder folder"
echo "2. Select 'Add Files to HydrationReminder...'"
echo "3. Select DailyCalorieTrackerCard.swift and WeeklyCalorieTrackerCard.swift"
echo "4. Make sure 'Copy items if needed' is checked"
echo "5. Click 'Add'"
