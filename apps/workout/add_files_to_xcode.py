#!/usr/bin/env python3
"""
Script to add new Swift files to the Xcode project and verify build.

This script:
1. Uses pbxproj library to add files to the Xcode project
2. Runs xcodebuild to check for compilation errors
3. Reports any errors found

Usage:
    python3 add_files_to_xcode.py

Requirements:
    pip3 install pbxproj
"""

import sys
import subprocess
import os
from pathlib import Path

# Try to import pbxproj
try:
    from pbxproj import XcodeProject
except ImportError:
    print("❌ pbxproj library not found. Installing...")
    subprocess.run([sys.executable, "-m", "pip", "install", "pbxproj"], check=True)
    from pbxproj import XcodeProject

# Project paths
SCRIPT_DIR = Path(__file__).parent
PROJECT_PATH = SCRIPT_DIR / "phoneless-hevy.xcodeproj" / "project.pbxproj"
WATCH_APP_DIR = SCRIPT_DIR / "phoneless-hevy Watch App"

# List of new files to add (relative to WATCH_APP_DIR)
NEW_FILES = [
    "Services/WorkoutHistoryService.swift",
    "Services/ContextResolver.swift",
    "Services/WorkoutActionStack.swift",
    "Services/ExerciseReplacementService.swift",
    "Views/Components/HistoricalContextView.swift",
    "Views/Components/SupersetIndicator.swift",
    "Parsers/CorrectionCommandParser.swift",
    "Managers/LLMWorkoutParserEnhanced.swift",
    "Managers/WorkoutManagerExtensions.swift",
]

TARGET_NAME = "phoneless-hevy Watch App"


def add_files_to_project():
    """Add new Swift files to the Xcode project."""
    print(f"📂 Opening Xcode project: {PROJECT_PATH}")

    if not PROJECT_PATH.exists():
        print(f"❌ Project file not found: {PROJECT_PATH}")
        return False

    try:
        project = XcodeProject.load(str(PROJECT_PATH))
        print("✅ Loaded Xcode project")
    except Exception as e:
        print(f"❌ Failed to load project: {e}")
        return False

    # Add each file
    added_count = 0
    skipped_count = 0

    for file_path in NEW_FILES:
        full_path = WATCH_APP_DIR / file_path

        if not full_path.exists():
            print(f"⚠️  File not found: {file_path}")
            continue

        # Check if file is already in project
        existing = project.get_files_by_name(full_path.name)
        if existing:
            print(f"⏭️  Already in project: {file_path}")
            skipped_count += 1
            continue

        try:
            # Add file to project
            # Path should be relative to project root
            rel_path = f"phoneless-hevy Watch App/{file_path}"
            project.add_file(rel_path, parent=None, target_name=TARGET_NAME)
            print(f"✅ Added: {file_path}")
            added_count += 1
        except Exception as e:
            print(f"❌ Failed to add {file_path}: {e}")

    # Save project
    if added_count > 0:
        try:
            project.save()
            print(f"\n💾 Saved project with {added_count} new files")
        except Exception as e:
            print(f"❌ Failed to save project: {e}")
            return False
    else:
        print(f"\n⏭️  No files added ({skipped_count} already in project)")

    return True


def verify_build():
    """Run xcodebuild to check for compilation errors."""
    print("\n🔨 Verifying build with xcodebuild...")
    print("   (This may take a minute...)\n")

    try:
        # Try to build the Watch App scheme
        result = subprocess.run(
            [
                "xcodebuild",
                "-project", str(PROJECT_PATH.parent),
                "-scheme", "phoneless-hevy Watch App",
                "-destination", "generic/platform=watchOS",
                "clean", "build"
            ],
            cwd=SCRIPT_DIR,
            capture_output=True,
            text=True,
            timeout=300  # 5 minute timeout
        )

        if result.returncode == 0:
            print("✅ Build succeeded!")
            return True
        else:
            print("❌ Build failed with errors:\n")
            # Print errors
            if result.stderr:
                print(result.stderr)
            # Look for error lines in stdout
            for line in result.stdout.split('\n'):
                if 'error:' in line.lower() or 'warning:' in line.lower():
                    print(line)
            return False

    except subprocess.TimeoutExpired:
        print("⏱️  Build timed out after 5 minutes")
        return False
    except Exception as e:
        print(f"❌ Build verification failed: {e}")
        return False


def main():
    """Main entry point."""
    print("🚀 Xcode Project File Manager\n")
    print(f"Project: {PROJECT_PATH.parent.name}")
    print(f"Target: {TARGET_NAME}\n")

    # Step 1: Add files to project
    if not add_files_to_project():
        print("\n❌ Failed to add files to project")
        sys.exit(1)

    # Step 2: Verify build
    print("\n" + "="*60)
    if not verify_build():
        print("\n⚠️  Build verification failed. Check errors above.")
        sys.exit(1)

    print("\n" + "="*60)
    print("✅ All done! Files added and build verified.")


if __name__ == "__main__":
    main()
