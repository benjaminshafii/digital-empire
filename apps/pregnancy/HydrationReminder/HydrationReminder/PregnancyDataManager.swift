import SwiftUI
import Foundation

// MARK: - Pregnancy Data Model

struct PregnancyData: Codable {
    var dueDate: Date?
    var lmpDate: Date?
    var conceptionDate: Date?
    var entryMethod: EntryMethod

    enum EntryMethod: String, Codable {
        case dueDate = "Due Date"
        case lmp = "Last Menstrual Period"
        case ultrasound = "Ultrasound"
    }

    // Calculate current week based on LMP
    var currentWeek: Int? {
        guard let lmp = lmpDate else { return nil }
        let daysSinceLMP = Calendar.current.dateComponents([.day], from: lmp, to: Date()).day ?? 0
        return min(max(daysSinceLMP / 7, 0), 42)
    }

    // Calculate days remaining until due date
    var daysRemaining: Int? {
        guard let due = dueDate else { return nil }
        return Calendar.current.dateComponents([.day], from: Date(), to: due).day
    }

    // Calculate current trimester
    var currentTrimester: Int? {
        guard let week = currentWeek else { return nil }
        if week <= 13 { return 1 }
        if week <= 27 { return 2 }
        return 3
    }

    // Calculate pregnancy completion percentage
    var completionPercentage: Double? {
        guard let week = currentWeek else { return nil }
        return min(Double(week) / 40.0, 1.0)
    }
}

// MARK: - Baby Size Data

struct BabySizeInfo {
    let week: Int
    let fruit: String
    let emoji: String
    let lengthCM: Double
    let weightGrams: Double

    var lengthInches: Double {
        lengthCM / 2.54
    }

    var weightOunces: Double {
        weightGrams / 28.35
    }

    static let weeklyData: [Int: BabySizeInfo] = [
        4: BabySizeInfo(week: 4, fruit: "Poppy Seed", emoji: "🌱", lengthCM: 0.2, weightGrams: 0.1),
        5: BabySizeInfo(week: 5, fruit: "Sesame Seed", emoji: "🫘", lengthCM: 0.3, weightGrams: 0.1),
        6: BabySizeInfo(week: 6, fruit: "Lentil", emoji: "🫘", lengthCM: 0.6, weightGrams: 0.2),
        7: BabySizeInfo(week: 7, fruit: "Blueberry", emoji: "🫐", lengthCM: 1.3, weightGrams: 0.5),
        8: BabySizeInfo(week: 8, fruit: "Raspberry", emoji: "🍓", lengthCM: 1.6, weightGrams: 1.0),
        9: BabySizeInfo(week: 9, fruit: "Cherry", emoji: "🍒", lengthCM: 2.3, weightGrams: 2.0),
        10: BabySizeInfo(week: 10, fruit: "Strawberry", emoji: "🍓", lengthCM: 3.1, weightGrams: 4.0),
        11: BabySizeInfo(week: 11, fruit: "Fig", emoji: "🍇", lengthCM: 4.1, weightGrams: 7.0),
        12: BabySizeInfo(week: 12, fruit: "Lime", emoji: "🍋", lengthCM: 5.4, weightGrams: 14.0),
        13: BabySizeInfo(week: 13, fruit: "Peapod", emoji: "🫛", lengthCM: 7.4, weightGrams: 23.0),
        14: BabySizeInfo(week: 14, fruit: "Lemon", emoji: "🍋", lengthCM: 8.7, weightGrams: 43.0),
        15: BabySizeInfo(week: 15, fruit: "Apple", emoji: "🍎", lengthCM: 10.1, weightGrams: 70.0),
        16: BabySizeInfo(week: 16, fruit: "Avocado", emoji: "🥑", lengthCM: 11.6, weightGrams: 100.0),
        17: BabySizeInfo(week: 17, fruit: "Pear", emoji: "🍐", lengthCM: 13.0, weightGrams: 140.0),
        18: BabySizeInfo(week: 18, fruit: "Bell Pepper", emoji: "🫑", lengthCM: 14.2, weightGrams: 190.0),
        19: BabySizeInfo(week: 19, fruit: "Tomato", emoji: "🍅", lengthCM: 15.3, weightGrams: 240.0),
        20: BabySizeInfo(week: 20, fruit: "Banana", emoji: "🍌", lengthCM: 25.6, weightGrams: 300.0),
        21: BabySizeInfo(week: 21, fruit: "Carrot", emoji: "🥕", lengthCM: 26.7, weightGrams: 360.0),
        22: BabySizeInfo(week: 22, fruit: "Papaya", emoji: "🥭", lengthCM: 27.8, weightGrams: 430.0),
        23: BabySizeInfo(week: 23, fruit: "Grapefruit", emoji: "🍊", lengthCM: 28.9, weightGrams: 501.0),
        24: BabySizeInfo(week: 24, fruit: "Corn", emoji: "🌽", lengthCM: 30.0, weightGrams: 600.0),
        25: BabySizeInfo(week: 25, fruit: "Cauliflower", emoji: "🥦", lengthCM: 34.6, weightGrams: 660.0),
        26: BabySizeInfo(week: 26, fruit: "Lettuce", emoji: "🥬", lengthCM: 35.6, weightGrams: 760.0),
        27: BabySizeInfo(week: 27, fruit: "Cabbage", emoji: "🥬", lengthCM: 36.6, weightGrams: 875.0),
        28: BabySizeInfo(week: 28, fruit: "Eggplant", emoji: "🍆", lengthCM: 37.6, weightGrams: 1005.0),
        29: BabySizeInfo(week: 29, fruit: "Butternut Squash", emoji: "🫚", lengthCM: 38.6, weightGrams: 1153.0),
        30: BabySizeInfo(week: 30, fruit: "Cabbage", emoji: "🥬", lengthCM: 39.9, weightGrams: 1319.0),
        31: BabySizeInfo(week: 31, fruit: "Coconut", emoji: "🥥", lengthCM: 41.1, weightGrams: 1502.0),
        32: BabySizeInfo(week: 32, fruit: "Squash", emoji: "🫚", lengthCM: 42.4, weightGrams: 1702.0),
        33: BabySizeInfo(week: 33, fruit: "Pineapple", emoji: "🍍", lengthCM: 43.7, weightGrams: 1918.0),
        34: BabySizeInfo(week: 34, fruit: "Cantaloupe", emoji: "🍈", lengthCM: 45.0, weightGrams: 2146.0),
        35: BabySizeInfo(week: 35, fruit: "Honeydew", emoji: "🍈", lengthCM: 46.2, weightGrams: 2383.0),
        36: BabySizeInfo(week: 36, fruit: "Papaya", emoji: "🥭", lengthCM: 47.4, weightGrams: 2622.0),
        37: BabySizeInfo(week: 37, fruit: "Swiss Chard", emoji: "🥬", lengthCM: 48.6, weightGrams: 2859.0),
        38: BabySizeInfo(week: 38, fruit: "Leek", emoji: "🫛", lengthCM: 49.8, weightGrams: 3083.0),
        39: BabySizeInfo(week: 39, fruit: "Mini Watermelon", emoji: "🍉", lengthCM: 50.7, weightGrams: 3288.0),
        40: BabySizeInfo(week: 40, fruit: "Pumpkin", emoji: "🎃", lengthCM: 51.2, weightGrams: 3462.0),
        41: BabySizeInfo(week: 41, fruit: "Pumpkin", emoji: "🎃", lengthCM: 51.7, weightGrams: 3597.0),
        42: BabySizeInfo(week: 42, fruit: "Watermelon", emoji: "🍉", lengthCM: 51.7, weightGrams: 3685.0)
    ]

    static func forWeek(_ week: Int) -> BabySizeInfo? {
        return weeklyData[week]
    }
}

// MARK: - Pregnancy Data Manager

class PregnancyDataManager: ObservableObject {
    @Published var pregnancyData: PregnancyData?

    private let userDefaults = UserDefaults.standard
    private let pregnancyDataKey = "pregnancyData"

    init() {
        loadPregnancyData()
    }

    // MARK: - Data Persistence

    func savePregnancyData(_ data: PregnancyData) {
        pregnancyData = data

        if let encoded = try? JSONEncoder().encode(data) {
            userDefaults.set(encoded, forKey: pregnancyDataKey)
        }
    }

    func loadPregnancyData() {
        if let data = userDefaults.data(forKey: pregnancyDataKey),
           let decoded = try? JSONDecoder().decode(PregnancyData.self, from: data) {
            pregnancyData = decoded
        }
    }

    func clearPregnancyData() {
        pregnancyData = nil
        userDefaults.removeObject(forKey: pregnancyDataKey)
    }

    // MARK: - Date Calculations

    // Calculate due date from LMP (Last Menstrual Period)
    static func calculateDueDateFromLMP(_ lmpDate: Date) -> Date? {
        return Calendar.current.date(byAdding: .day, value: 280, to: lmpDate)
    }

    // Calculate LMP from due date
    static func calculateLMPFromDueDate(_ dueDate: Date) -> Date? {
        return Calendar.current.date(byAdding: .day, value: -280, to: dueDate)
    }

    // Calculate due date from ultrasound measurements
    static func calculateDueDateFromUltrasound(ultrasoundDate: Date, gestationalAgeWeeks: Int, gestationalAgeDays: Int) -> Date? {
        let totalDays = (gestationalAgeWeeks * 7) + gestationalAgeDays
        let daysUntilDue = 280 - totalDays
        return Calendar.current.date(byAdding: .day, value: daysUntilDue, to: ultrasoundDate)
    }

    // MARK: - Validation

    static func validateDueDate(_ date: Date) -> String? {
        let today = Date()
        let calendar = Calendar.current

        // Due date should be in the future
        if date < today {
            return "Due date should be in the future"
        }

        // Due date should be within reasonable range (max 42 weeks from now)
        if let maxDate = calendar.date(byAdding: .day, value: 294, to: today),
           date > maxDate {
            return "Due date seems too far in the future"
        }

        return nil
    }

    static func validateLMPDate(_ date: Date) -> String? {
        let today = Date()
        let calendar = Calendar.current

        // LMP should be in the past
        if date > today {
            return "LMP date should be in the past"
        }

        // LMP should be within reasonable range (max 42 weeks ago)
        if let minDate = calendar.date(byAdding: .day, value: -294, to: today),
           date < minDate {
            return "LMP date seems too far in the past"
        }

        return nil
    }

    // MARK: - Helper Methods

    var isPregnancyDataSet: Bool {
        pregnancyData != nil && (pregnancyData?.dueDate != nil || pregnancyData?.lmpDate != nil)
    }

    var currentBabySize: BabySizeInfo? {
        guard let week = pregnancyData?.currentWeek else { return nil }
        return BabySizeInfo.forWeek(week)
    }
}

// MARK: - Calorie Range Support

/// Represents the recommended calorie range for a specific trimester
struct CalorieRange: Equatable {
    let minimum: Int
    let maximum: Int
    let midpoint: Int
    let trimester: Int
    let week: Int

    var description: String {
        "\(minimum)-\(maximum) cal/day (Trimester \(trimester))"
    }

    func status(for calories: Int) -> CalorieStatus {
        if calories == 0 {
            return .noData
        } else if calories < minimum - 200 {
            return .wellBelow
        } else if calories < minimum {
            return .slightlyBelow
        } else if calories <= maximum {
            return .optimal
        } else if calories <= maximum + 200 {
            return .slightlyAbove
        } else {
            return .wellAbove
        }
    }
}

enum CalorieStatus {
    case noData
    case wellBelow
    case slightlyBelow
    case optimal
    case slightlyAbove
    case wellAbove

    var color: Color {
        switch self {
        case .noData: return .gray.opacity(0.5)
        case .wellBelow: return Color(hex: "#FFB347")
        case .slightlyBelow: return Color(hex: "#FFD700")
        case .optimal: return Color(hex: "#7FE0C0")
        case .slightlyAbove: return Color(hex: "#FFCC99")
        case .wellAbove: return Color(hex: "#FF9999")
        }
    }

    var icon: String {
        switch self {
        case .noData: return "questionmark.circle"
        case .wellBelow: return "arrow.down.circle.fill"
        case .slightlyBelow: return "arrow.down.circle"
        case .optimal: return "checkmark.circle.fill"
        case .slightlyAbove: return "arrow.up.circle"
        case .wellAbove: return "arrow.up.circle.fill"
        }
    }

    var message: String {
        switch self {
        case .noData: return "No data yet today"
        case .wellBelow: return "Below recommended range"
        case .slightlyBelow: return "Slightly below range"
        case .optimal: return "Within recommended range"
        case .slightlyAbove: return "Slightly above range"
        case .wellAbove: return "Above recommended range"
        }
    }
}

// MARK: - Calorie Range Calculations

extension PregnancyDataManager {
    /// Get the current calorie range based on the user's trimester
    /// - Parameter baselineCalories: The user's pre-pregnancy baseline (default 2100)
    /// - Returns: CalorieRange if pregnancy data is available, nil otherwise
    func currentCalorieRange(baselineCalories: Int = 2100) -> CalorieRange? {
        guard let week = pregnancyData?.currentWeek,
              let trimester = pregnancyData?.currentTrimester else {
            return nil
        }

        let additionalCalories: Int
        switch trimester {
        case 1: additionalCalories = 0
        case 2: additionalCalories = 340
        case 3: additionalCalories = 450
        default: additionalCalories = 0
        }

        // Range assumes sedentary (1800) to active (2400) baseline
        let minCalories = 1800 + additionalCalories
        let maxCalories = 2400 + additionalCalories
        let midCalories = baselineCalories + additionalCalories

        return CalorieRange(
            minimum: minCalories,
            maximum: maxCalories,
            midpoint: midCalories,
            trimester: trimester,
            week: week
        )
    }

    /// Get the calorie range for a specific date (useful for historical data)
    /// - Parameters:
    ///   - date: The date to calculate the range for
    ///   - baselineCalories: The user's pre-pregnancy baseline (default 2100)
    /// - Returns: CalorieRange for that date
    func getCalorieRange(for date: Date, baselineCalories: Int = 2100) -> CalorieRange {
        guard let lmpDate = pregnancyData?.lmpDate else {
            // Default to first trimester range if no pregnancy data
            return CalorieRange(minimum: 1800, maximum: 2400, midpoint: 2100, trimester: 1, week: 0)
        }

        let daysSinceLMP = Calendar.current.dateComponents([.day], from: lmpDate, to: date).day ?? 0
        let week = daysSinceLMP / 7
        let trimester = week <= 13 ? 1 : (week <= 27 ? 2 : 3)

        let additionalCal: Int
        switch trimester {
        case 1: additionalCal = 0
        case 2: additionalCal = 340
        case 3: additionalCal = 450
        default: additionalCal = 0
        }

        return CalorieRange(
            minimum: 1800 + additionalCal,
            maximum: 2400 + additionalCal,
            midpoint: baselineCalories + additionalCal,
            trimester: trimester,
            week: week
        )
    }
}
