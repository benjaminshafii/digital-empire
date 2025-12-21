//
//  DateExtensions.swift
//  phoneless-hevy Watch App
//
//  Created by Claude Code
//

import Foundation

/// Extensions for Date and ISO8601DateFormatter to handle Hevy API date formatting
extension ISO8601DateFormatter {
    /// Formatter WITH fractional seconds for encoding (sending to API)
    /// Format: "2024-10-22T14:30:00.000Z"
    static let hevyFormatter: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        formatter.timeZone = TimeZone(identifier: "UTC")
        return formatter
    }()

    /// Formatter WITHOUT fractional seconds for decoding (receiving from API)
    /// API returns: "2025-10-23T02:24:25+00:00"
    static let hevyResponseFormatter: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime]
        formatter.timeZone = TimeZone(identifier: "UTC")
        return formatter
    }()

    /// Flexible date parsing - tries both formats
    static func parseHevyDate(_ string: String) -> Date? {
        // Try with fractional seconds first
        if let date = hevyFormatter.date(from: string) {
            return date
        }
        // Fallback to without fractional seconds
        if let date = hevyResponseFormatter.date(from: string) {
            return date
        }
        print("❌ [DateExtensions] Failed to parse date: \(string)")
        return nil
    }
}

extension Date {
    /// Convert Date to ISO 8601 string for Hevy API
    /// Returns format: "2024-10-22T14:30:00.000Z"
    func toHevyAPIString() -> String {
        ISO8601DateFormatter.hevyFormatter.string(from: self)
    }

    /// Create Date from ISO 8601 string from Hevy API
    /// - Parameter string: ISO 8601 formatted date string
    /// - Returns: Date if parsing succeeds, nil otherwise
    static func fromHevyAPIString(_ string: String) -> Date? {
        ISO8601DateFormatter.hevyFormatter.date(from: string)
    }

    /// Format date for display in workout list (e.g., "Oct 22, 2024")
    func toWorkoutListFormat() -> String {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .none
        return formatter.string(from: self)
    }

    /// Format time for display (e.g., "2:30 PM")
    func toTimeFormat() -> String {
        let formatter = DateFormatter()
        formatter.dateStyle = .none
        formatter.timeStyle = .short
        return formatter.string(from: self)
    }

    /// Format duration between dates as "HH:MM:SS"
    static func formatDuration(from start: Date, to end: Date) -> String {
        let interval = end.timeIntervalSince(start)
        let hours = Int(interval) / 3600
        let minutes = (Int(interval) % 3600) / 60
        let seconds = Int(interval) % 60

        if hours > 0 {
            return String(format: "%d:%02d:%02d", hours, minutes, seconds)
        } else {
            return String(format: "%d:%02d", minutes, seconds)
        }
    }
}

extension TimeInterval {
    /// Format TimeInterval as "HH:MM:SS" or "MM:SS"
    func toDurationString() -> String {
        let hours = Int(self) / 3600
        let minutes = (Int(self) % 3600) / 60
        let seconds = Int(self) % 60

        if hours > 0 {
            return String(format: "%d:%02d:%02d", hours, minutes, seconds)
        } else {
            return String(format: "%d:%02d", minutes, seconds)
        }
    }

    /// Format TimeInterval in minutes (e.g., "45 min")
    func toMinutesString() -> String {
        let minutes = Int(self) / 60
        return "\(minutes) min"
    }
}
