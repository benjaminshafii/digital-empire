import SwiftUI

// Shared MealType enum for meal categorization across the app
enum MealType: String, Codable, CaseIterable {
    case breakfast = "Breakfast"
    case lunch = "Lunch"
    case snack = "Snack"
    case dinner = "Dinner"

    var icon: String {
        switch self {
        case .breakfast: return "cup.and.saucer.fill"
        case .lunch: return "fork.knife"
        case .snack: return "carrot.fill"
        case .dinner: return "moon.stars.fill"
        }
    }

    // Default times for meal-based time selection
    var defaultTime: (hour: Int, minute: Int) {
        switch self {
        case .breakfast: return (7, 30)
        case .lunch: return (12, 15)
        case .snack: return (15, 30)
        case .dinner: return (18, 30)
        }
    }

    // Time ranges for smart meal time detection
    var timeRange: ClosedRange<Int> {
        switch self {
        case .breakfast: return 6...10
        case .lunch: return 11...14
        case .snack: return 14...17
        case .dinner: return 17...21
        }
    }
}
