#!/usr/bin/env ruby
# Script to remove duplicate file references from Xcode project

require 'xcodeproj'

project_path = '../HydrationReminder.xcodeproj'
project = Xcodeproj::Project.open(project_path)
main_target = project.targets.first

puts "📦 Target: #{main_target.name}"
puts "🔍 Checking for duplicate files in Compile Sources...\n"

build_files = main_target.source_build_phase.files
file_refs = build_files.map { |bf| bf.file_ref }

seen = {}
duplicates = []

file_refs.each do |file_ref|
  next unless file_ref
  path = file_ref.path || file_ref.name || "unknown"
  
  if seen[path]
    duplicates << path
  else
    seen[path] = true
  end
end

if duplicates.any?
  puts "⚠️  Found duplicates:"
  duplicates.uniq.each { |dup| puts "   - #{dup}" }
  puts "\n➖ Removing duplicates..."
  
  duplicates.uniq.each do |dup_path|
    matching_build_files = build_files.select do |bf|
      bf.file_ref && (bf.file_ref.path == dup_path || bf.file_ref.name == dup_path)
    end
    
    if matching_build_files.count > 1
      puts "   Removing duplicate: #{dup_path}"
      matching_build_files[1..-1].each(&:remove_from_project)
    end
  end
  
  project.save
  puts "✅ Done! Duplicates removed.\n"
else
  puts "✅ No duplicates found!\n"
end
