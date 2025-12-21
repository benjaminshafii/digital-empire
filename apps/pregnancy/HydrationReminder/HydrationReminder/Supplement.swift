import Foundation

struct Supplement: Codable, Identifiable {
    let id: UUID
    var name: String
    var dosage: String
    var frequency: SupplementFrequency
    var reminderTimes: [Date]
    var remindersEnabled: Bool
    var intakeHistory: [IntakeRecord]
    var notes: String?
    var isEssential: Bool
    
    init(name: String, dosage: String, frequency: SupplementFrequency = .daily, reminderTimes: [Date] = [], remindersEnabled: Bool = true, notes: String? = nil, isEssential: Bool = false) {
        self.id = UUID()
        self.name = name
        self.dosage = dosage
        self.frequency = frequency
        self.reminderTimes = reminderTimes
        self.remindersEnabled = remindersEnabled
        self.intakeHistory = []
        self.notes = notes
        self.isEssential = isEssential
    }
    
    enum SupplementFrequency: String, Codable, CaseIterable {
        case daily = "Daily"
        case twiceDaily = "Twice Daily"
        case thriceDaily = "Three Times Daily"
        case everyOtherDay = "Every Other Day"
        case weekly = "Weekly"
        case asNeeded = "As Needed"
        
        var timesPerDay: Int {
            switch self {
            case .daily: return 1
            case .twiceDaily: return 2
            case .thriceDaily: return 3
            case .everyOtherDay: return 0
            case .weekly: return 0
            case .asNeeded: return 0
            }
        }
    }
    
    struct IntakeRecord: Codable, Identifiable {
        let id: UUID
        let date: Date
        let taken: Bool
        let missedReason: String?
        let notes: String?
        
        init(date: Date = Date(), taken: Bool = true, missedReason: String? = nil, notes: String? = nil) {
            self.id = UUID()
            self.date = date
            self.taken = taken
            self.missedReason = missedReason
            self.notes = notes
        }
    }
    
    func todaysTaken() -> Int {
        let calendar = Calendar.current
        let today = calendar.startOfDay(for: Date())
        let tomorrow = calendar.date(byAdding: .day, value: 1, to: today)!
        
        return intakeHistory.filter { record in
            record.taken && record.date >= today && record.date < tomorrow
        }.count
    }
    
    func shouldTakeToday() -> Bool {
        let calendar = Calendar.current
        
        switch frequency {
        case .daily, .twiceDaily, .thriceDaily, .asNeeded:
            return true
        case .everyOtherDay:
            if let lastTaken = intakeHistory.filter({ $0.taken }).last {
                let daysSince = calendar.dateComponents([.day], from: lastTaken.date, to: Date()).day ?? 0
                return daysSince >= 2
            }
            return true
        case .weekly:
            if let lastTaken = intakeHistory.filter({ $0.taken }).last {
                let daysSince = calendar.dateComponents([.day], from: lastTaken.date, to: Date()).day ?? 0
                return daysSince >= 7
            }
            return true
        }
    }
    
    func complianceRate(days: Int = 7) -> Double {
        let calendar = Calendar.current
        let startDate = calendar.date(byAdding: .day, value: -days, to: Date())!
        
        let relevantRecords = intakeHistory.filter { $0.date >= startDate }
        
        guard !relevantRecords.isEmpty else { return 0 }
        
        let takenCount = relevantRecords.filter { $0.taken }.count
        let expectedCount: Int
        
        switch frequency {
        case .daily:
            expectedCount = days
        case .twiceDaily:
            expectedCount = days * 2
        case .thriceDaily:
            expectedCount = days * 3
        case .everyOtherDay:
            expectedCount = (days + 1) / 2
        case .weekly:
            expectedCount = (days + 6) / 7
        case .asNeeded:
            return takenCount > 0 ? 1.0 : 0.0
        }
        
        return min(Double(takenCount) / Double(expectedCount), 1.0)
    }
}

class PregnancySupplements {
    static let commonSupplements = [
        Supplement(name: "Prenatal Vitamin", dosage: "1 tablet", frequency: .daily, isEssential: true),
        Supplement(name: "Folic Acid", dosage: "400-800 mcg", frequency: .daily, isEssential: true),
        Supplement(name: "Iron", dosage: "27 mg", frequency: .daily, isEssential: true),
        Supplement(name: "Vitamin D", dosage: "600-1000 IU", frequency: .daily),
        Supplement(name: "DHA Omega-3", dosage: "200-300 mg", frequency: .daily),
        Supplement(name: "Calcium", dosage: "1000 mg", frequency: .daily),
        Supplement(name: "Vitamin B6", dosage: "10-25 mg", frequency: .daily, notes: "May help with nausea"),
        Supplement(name: "Ginger", dosage: "250 mg", frequency: .asNeeded, notes: "For nausea relief"),
        Supplement(name: "Probiotics", dosage: "1 capsule", frequency: .daily)
    ]
}