#!/usr/bin/env ruby
# Script to remove missing file references from Xcode project

require 'xcodeproj'

project_path = '../HydrationReminder.xcodeproj'
file_to_remove = 'SplitGlassNavBar.swift'

project = Xcodeproj::Project.open(project_path)
main_target = project.targets.first
main_group = project.main_group['HydrationReminder']

unless main_group
  puts "❌ Could not find HydrationReminder group"
  exit 1
end

puts "🔍 Looking for: #{file_to_remove}"

file_ref = main_group.files.find { |f| f.path == file_to_remove }

if file_ref
  puts "   ✅ Found file reference"
  
  main_target.source_build_phase.files.each do |build_file|
    if build_file.file_ref == file_ref
      puts "   ➖ Removing from target..."
      build_file.remove_from_project
    end
  end
  
  puts "   ➖ Removing file reference..."
  file_ref.remove_from_project
  
  project.save
  puts "✅ Done! #{file_to_remove} removed from project.\n"
else
  puts "   ℹ️  File reference not found in project"
end
