#!/usr/bin/env ruby
# Script to automatically add Swift files to Xcode project target
# Based on: https://github.com/CocoaPods/Xcodeproj

require 'xcodeproj'

# Configuration
project_path = '../HydrationReminder.xcodeproj'
files_to_add = [
  'AboutView.swift',
  'DataBackupManager.swift',
  'DisclaimerView.swift',
  'ExpandableVoiceNavbar.swift',
  'LiquidGlassHelpers.swift',
  'OnDeviceSpeechManager.swift',
  'PregnancyDataManager.swift',
  'PregnancyDateEntryView.swift',
  'CurrentWeekCard.swift',
  'BabySizeCard.swift'
]

# Open the Xcode project
project = Xcodeproj::Project.open(project_path)

# Get the main target (first target is usually the app)
main_target = project.targets.first
puts "📦 Target: #{main_target.name}"

# Get the HydrationReminder group (main source folder)
main_group = project.main_group['HydrationReminder']

unless main_group
  puts "❌ Could not find HydrationReminder group"
  exit 1
end

files_to_add.each do |filename|
  puts "\n🔍 Processing: #{filename}"
  
  # Check if file already exists in project
  existing_file = main_group.files.find { |f| f.path == filename }
  
  if existing_file
    puts "   ✅ File reference already exists"
    
    # Check if it's in the target
    is_in_target = main_target.source_build_phase.files.any? do |build_file|
      build_file.file_ref == existing_file
    end
    
    if is_in_target
      puts "   ✅ Already in target membership"
    else
      puts "   ➕ Adding to target membership..."
      main_target.add_file_references([existing_file])
      puts "   ✅ Added to target!"
    end
  else
    puts "   ➕ Adding file reference..."
    file = main_group.new_file(filename)
    main_target.add_file_references([file])
    puts "   ✅ File added to project and target!"
  end
end

# Save the project
puts "\n💾 Saving project..."
project.save
puts "✅ Done! All files are now in the Xcode target.\n"
