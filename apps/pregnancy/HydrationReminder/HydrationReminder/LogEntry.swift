import Foundation

enum LogType: String, Codable, CaseIterable {
    case food = "Food"
    case water = "Water"
    case drink = "Drink"
    case puke = "Puke"
    case symptom = "Symptom"
    case supplement = "Supplement"
    
    var icon: String {
        switch self {
        case .food:
            return "fork.knife"
        case .water, .drink:
            return "drop.fill"
        case .puke:
            return "exclamationmark.triangle.fill"
        case .symptom:
            return "heart.text.square"
        case .supplement:
            return "pills.fill"
        }
    }
    
    var color: String {
        switch self {
        case .food:
            return "orange"
        case .water, .drink:
            return "blue"
        case .puke:
            return "red"
        case .symptom:
            return "purple"
        case .supplement:
            return "green"
        }
    }
}

enum LogSource: String, Codable {
    case manual = "Manual"
    case voice = "Voice"
    case reminder = "Reminder"
    case quick = "Quick"
}

struct LogEntry: Identifiable, Codable {
    let id: UUID
    var date: Date
    let type: LogType
    let source: LogSource
    var notes: String?
    var voiceLogId: UUID?
    var relatedLogIds: [UUID]
    var amount: String?  // For drinks: "8 oz", "250ml", etc.
    var severity: Int?   // For symptoms/puke: 1-5 scale
    
    // Food macros
    var foodName: String?
    var calories: Int?
    var protein: Int?
    var carbs: Int?
    var fat: Int?
    
    // Supplement info
    var supplementName: String?
    
    init(
        id: UUID = UUID(),
        date: Date = Date(),
        type: LogType,
        source: LogSource,
        notes: String? = nil,
        voiceLogId: UUID? = nil,
        relatedLogIds: [UUID] = [],
        amount: String? = nil,
        severity: Int? = nil,
        foodName: String? = nil,
        calories: Int? = nil,
        protein: Int? = nil,
        carbs: Int? = nil,
        fat: Int? = nil,
        supplementName: String? = nil
    ) {
        self.id = id
        self.date = date
        self.type = type
        self.source = source
        self.notes = notes
        self.voiceLogId = voiceLogId
        self.relatedLogIds = relatedLogIds
        self.amount = amount
        self.severity = severity
        self.foodName = foodName
        self.calories = calories
        self.protein = protein
        self.carbs = carbs
        self.fat = fat
        self.supplementName = supplementName
    }
    
    var formattedDate: String {
        let formatter = DateFormatter()
        formatter.dateStyle = .none
        formatter.timeStyle = .short
        return formatter.string(from: date)
    }
    
    var formattedDateLong: String {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .short
        return formatter.string(from: date)
    }
    
    var timeSince: String {
        let interval = Date().timeIntervalSince(date)
        let hours = Int(interval / 3600)
        let minutes = Int((interval.truncatingRemainder(dividingBy: 3600)) / 60)
        
        if hours > 24 {
            let days = hours / 24
            return "\(days) day\(days == 1 ? "" : "s") ago"
        } else if hours > 0 {
            return "\(hours)h \(minutes)m ago"
        } else {
            return "\(minutes)m ago"
        }
    }
    
    var severityText: String? {
        guard let severity = severity else { return nil }
        switch severity {
        case 1: return "Mild"
        case 2: return "Light"
        case 3: return "Moderate"
        case 4: return "Severe"
        case 5: return "Extreme"
        default: return nil
        }
    }
}

// Daily summary for insights
struct DailySummary {
    let date: Date
    let foodCount: Int
    let drinkCount: Int
    let pukeCount: Int
    let symptomCount: Int
    let totalFluidIntake: String?
    let keptDownPercentage: Double?  // Meals kept down vs vomited
    
    var dateString: String {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        return formatter.string(from: date)
    }
}