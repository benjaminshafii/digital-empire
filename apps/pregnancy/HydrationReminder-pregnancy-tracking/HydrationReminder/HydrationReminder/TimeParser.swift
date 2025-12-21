import Foundation

struct TimeParser {
    
    /// Parses a time string and returns a Date
    /// - Parameter timeString: String like "2pm", "morning", "yesterday 3pm", "2 hours ago"
    /// - Returns: Parsed date or nil if unable to parse
    static func parseTimeString(_ timeString: String?) -> Date? {
        guard let timeString = timeString?.lowercased().trimmingCharacters(in: .whitespacesAndNewlines),
              !timeString.isEmpty else {
            return nil
        }
        
        let calendar = Calendar.current
        let now = Date()
        var baseDate = now
        
        // Handle relative day references
        if timeString.contains("yesterday") {
            baseDate = calendar.date(byAdding: .day, value: -1, to: now) ?? now
        } else if timeString.contains("today") {
            baseDate = now
        } else if timeString.contains("tomorrow") {
            baseDate = calendar.date(byAdding: .day, value: 1, to: now) ?? now
        }
        
        // Handle relative time references
        if timeString.contains("ago") {
            return parseRelativeTime(timeString, from: now)
        }
        
        // Handle meal times
        if let mealTime = parseMealTime(timeString, on: baseDate) {
            return mealTime
        }
        
        // Handle general time periods
        if let periodTime = parseTimePeriod(timeString, on: baseDate) {
            return periodTime
        }
        
        // Handle specific times (e.g., "2pm", "14:30", "2:30pm")
        if let specificTime = parseSpecificTime(timeString, on: baseDate) {
            return specificTime
        }
        
        // Handle "last night"
        if timeString.contains("last night") {
            return calendar.dateInterval(of: .day, for: calendar.date(byAdding: .day, value: -1, to: now)!)
                .map { calendar.date(bySettingHour: 21, minute: 0, second: 0, of: $0.start)! }
        }
        
        return nil
    }
    
    private static func parseRelativeTime(_ timeString: String, from date: Date) -> Date? {
        let calendar = Calendar.current
        
        // Extract number and unit
        let components = timeString.components(separatedBy: .whitespaces)
        
        for (index, component) in components.enumerated() {
            if let value = Int(component) ?? parseNumberWord(component) {
                // Look for the unit
                let remainingComponents = components.suffix(from: index + 1)
                
                for unit in remainingComponents {
                    if unit.contains("hour") {
                        return calendar.date(byAdding: .hour, value: -value, to: date)
                    } else if unit.contains("minute") || unit.contains("min") {
                        return calendar.date(byAdding: .minute, value: -value, to: date)
                    } else if unit.contains("day") {
                        return calendar.date(byAdding: .day, value: -value, to: date)
                    } else if unit.contains("week") {
                        return calendar.date(byAdding: .weekOfYear, value: -value, to: date)
                    }
                }
            }
        }
        
        // Handle "a/an hour ago", "a day ago" etc.
        if timeString.contains("an hour ago") || timeString.contains("a hour ago") {
            return calendar.date(byAdding: .hour, value: -1, to: date)
        }
        if timeString.contains("a day ago") {
            return calendar.date(byAdding: .day, value: -1, to: date)
        }
        
        return nil
    }
    
    private static func parseNumberWord(_ word: String) -> Int? {
        let numbers = [
            "one": 1, "two": 2, "three": 3, "four": 4, "five": 5,
            "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10,
            "a": 1, "an": 1
        ]
        return numbers[word.lowercased()]
    }
    
    private static func parseMealTime(_ timeString: String, on date: Date) -> Date? {
        let calendar = Calendar.current
        let mealTimes: [String: (hour: Int, minute: Int)] = [
            "breakfast": (8, 0),
            "lunch": (12, 30),
            "dinner": (18, 30),
            "snack": (15, 0)
        ]
        
        for (meal, time) in mealTimes {
            if timeString.contains(meal) {
                return calendar.date(bySettingHour: time.hour, minute: time.minute, second: 0, of: date)
            }
        }
        
        return nil
    }
    
    private static func parseTimePeriod(_ timeString: String, on date: Date) -> Date? {
        let calendar = Calendar.current
        
        let periods: [String: (hour: Int, minute: Int)] = [
            "morning": (9, 0),
            "noon": (12, 0),
            "afternoon": (14, 0),
            "evening": (18, 0),
            "night": (21, 0),
            "midnight": (0, 0)
        ]
        
        for (period, time) in periods {
            if timeString.contains(period) {
                return calendar.date(bySettingHour: time.hour, minute: time.minute, second: 0, of: date)
            }
        }
        
        return nil
    }
    
    private static func parseSpecificTime(_ timeString: String, on date: Date) -> Date? {
        let calendar = Calendar.current
        
        // Clean the time string
        let cleanTime = timeString
            .replacingOccurrences(of: "at ", with: "")
            .replacingOccurrences(of: "yesterday ", with: "")
            .replacingOccurrences(of: "today ", with: "")
            .replacingOccurrences(of: "tomorrow ", with: "")
            .trimmingCharacters(in: .whitespacesAndNewlines)
        
        // Try various time formats
        let formats = [
            "h:mma",      // 2:30pm
            "h:mm a",     // 2:30 pm
            "ha",         // 2pm
            "h a",        // 2 pm
            "HH:mm",      // 14:30
            "H:mm",       // 14:30 or 2:30
            "hmma",       // 230pm
            "hmm a",      // 230 pm
        ]
        
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        
        for format in formats {
            formatter.dateFormat = format
            if let parsedTime = formatter.date(from: cleanTime) {
                // Combine the parsed time with the base date
                let timeComponents = calendar.dateComponents([.hour, .minute], from: parsedTime)
                if let hour = timeComponents.hour, let minute = timeComponents.minute {
                    return calendar.date(bySettingHour: hour, minute: minute, second: 0, of: date)
                }
            }
        }
        
        // Try parsing just numbers (e.g., "2" for 2pm, "14" for 2pm)
        if let hour = Int(cleanTime) {
            if hour >= 1 && hour <= 12 {
                // Assume PM for afternoon hours (1-6), AM for morning (7-12)
                let adjustedHour = (hour >= 1 && hour <= 6) ? hour + 12 : hour
                return calendar.date(bySettingHour: adjustedHour, minute: 0, second: 0, of: date)
            } else if hour >= 13 && hour <= 23 {
                // 24-hour format
                return calendar.date(bySettingHour: hour, minute: 0, second: 0, of: date)
            }
        }
        
        return nil
    }
    
    /// Formats a date for display based on how it was parsed
    static func formatDateForDisplay(_ date: Date, originalTimeString: String? = nil) -> String {
        let formatter = DateFormatter()
        let calendar = Calendar.current
        
        // If it's today, just show the time
        if calendar.isDateInToday(date) {
            formatter.dateFormat = "h:mm a"
            return "Today at \(formatter.string(from: date))"
        }
        
        // If it's yesterday
        if calendar.isDateInYesterday(date) {
            formatter.dateFormat = "h:mm a"
            return "Yesterday at \(formatter.string(from: date))"
        }
        
        // Otherwise show date and time
        formatter.dateFormat = "MMM d 'at' h:mm a"
        return formatter.string(from: date)
    }
}