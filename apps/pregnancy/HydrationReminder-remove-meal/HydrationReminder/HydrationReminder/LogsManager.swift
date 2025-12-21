import Foundation
import SwiftUI

class LogsManager: ObservableObject {
    @Published var logEntries: [LogEntry] = []
    @Published var todaysSummary: DailySummary?
    
    private let userDefaultsKey = "UnifiedLogEntries"
    private let versionKey = "LogsDataVersion"
    private let currentVersion = 1
    private let notificationManager: NotificationManager
    private let dataQueue = DispatchQueue(label: "com.corgina.logsmanager", qos: .userInitiated)
    
    init(notificationManager: NotificationManager) {
        self.notificationManager = notificationManager
        loadLogs()
        updateTodaysSummary()
    }
    
    // MARK: - Quick Logging Methods
    
    func logFood(notes: String? = nil, source: LogSource = .manual, foodName: String? = nil, calories: Int? = nil, protein: Int? = nil, carbs: Int? = nil, fat: Int? = nil) {
        let entry = LogEntry(
            type: .food,
            source: source,
            notes: notes,
            foodName: foodName,
            calories: calories,
            protein: protein,
            carbs: carbs,
            fat: fat
        )
        addLog(entry)
        
        // Also update notification manager if from reminder
        if source == .reminder || source == .manual {
            notificationManager.logEating()
        }
    }
    
    func logWater(amount: Int? = nil, unit: String? = nil, notes: String? = nil, source: LogSource = .manual, date: Date = Date()) {
        let amountText = amount != nil && unit != nil ? "\(amount!) \(unit!)" : nil
        let entry = LogEntry(
            date: date,
            type: .water,
            source: source,
            notes: notes,
            amount: amountText
        )
        addLog(entry)

        // Also update notification manager if from reminder
        if source == .reminder || source == .manual {
            notificationManager.logDrinking()
        }
    }
    
    func logDrink(amount: String? = nil, notes: String? = nil, source: LogSource = .manual) {
        let entry = LogEntry(
            type: .drink,
            source: source,
            notes: notes,
            amount: amount
        )
        addLog(entry)
        
        // Also update notification manager if from reminder
        if source == .reminder || source == .manual {
            notificationManager.logDrinking()
        }
    }
    
    func logPuke(severity: Int = 3, notes: String? = nil, relatedToLastMeal: Bool = false) {
        var relatedIds: [UUID] = []
        
        // If related to last meal, find the most recent food log
        if relatedToLastMeal {
            if let lastFoodLog = logEntries
                .filter({ $0.type == .food })
                .sorted(by: { $0.date > $1.date })
                .first {
                relatedIds.append(lastFoodLog.id)
            }
        }
        
        let entry = LogEntry(
            type: .puke,
            source: .quick,
            notes: notes,
            relatedLogIds: relatedIds,
            severity: severity
        )
        addLog(entry)
        
        // Send alert if multiple pukes in short time
        checkPukeFrequency()
    }
    
    func logSymptom(notes: String, severity: Int = 3, source: LogSource = .manual) {
        let entry = LogEntry(
            type: .symptom,
            source: source,
            notes: notes,
            severity: severity
        )
        addLog(entry)
    }
    
    // MARK: - Voice Log Integration
    
    func addVoiceLog(_ voiceLog: VoiceLog, type: LogType, notes: String? = nil) {
        let entry = LogEntry(
            type: type,
            source: .voice,
            notes: notes ?? "Voice log: \(voiceLog.formattedDuration)",
            voiceLogId: voiceLog.id
        )
        addLog(entry)
    }
    
    // MARK: - Data Management
    
    private func addLog(_ entry: LogEntry) {
        print("📌 LogsManager.addLog called - Type: \(entry.type), Source: \(entry.source)")
        
        dataQueue.async { [weak self] in
            guard let self = self else { return }
            
            let countBefore = self.logEntries.count
            
            DispatchQueue.main.async {
                self.logEntries.insert(entry, at: 0)
                let countAfter = self.logEntries.count
                print("📌 LogsManager entries: \(countBefore) -> \(countAfter)")
                
                self.dataQueue.async {
                    self.saveLogs()
                    
                    DispatchQueue.main.async {
                        self.updateTodaysSummary()
                        print("📌 LogsManager.addLog completed")
                    }
                }
            }
        }
    }
    
    func deleteLog(_ entry: LogEntry) {
        dataQueue.async { [weak self] in
            guard let self = self else { return }
            
            DispatchQueue.main.async {
                self.logEntries.removeAll { $0.id == entry.id }
                
                self.dataQueue.async {
                    self.saveLogs()
                    
                    DispatchQueue.main.async {
                        self.updateTodaysSummary()
                    }
                }
            }
        }
    }
    
    func getRelatedLogs(for entry: LogEntry) -> [LogEntry] {
        return logEntries.filter { entry.relatedLogIds.contains($0.id) }
    }
    
    // MARK: - Filtering
    
    func filteredLogs(by type: LogType? = nil, date: Date? = nil) -> [LogEntry] {
        print("🔍 filteredLogs called - Total entries: \(logEntries.count)")
        var filtered = logEntries
        
        if let type = type {
            filtered = filtered.filter { $0.type == type }
            print("🔍 After type filter (\(type)): \(filtered.count) entries")
        }
        
        if let date = date {
            let calendar = Calendar.current
            let beforeCount = filtered.count
            filtered = filtered.filter { 
                calendar.isDate($0.date, inSameDayAs: date)
            }
            print("🔍 After date filter (today): \(beforeCount) -> \(filtered.count) entries")
        }
        
        let sorted = filtered.sorted { $0.date > $1.date }
        print("🔍 Returning \(sorted.count) filtered entries")
        return sorted
    }
    
    func logsForToday() -> [LogEntry] {
        return filteredLogs(date: Date())
    }
    
    func logsForLastHours(_ hours: Int) -> [LogEntry] {
        let cutoffDate = Date().addingTimeInterval(-Double(hours * 3600))
        return logEntries.filter { $0.date >= cutoffDate }
    }
    
    func getTodayLogs() -> [LogEntry] {
        return logsForToday()
    }
    
    func getTodayWaterCount() -> Int {
        return logsForToday().filter { $0.type == .water || $0.type == .drink }.count
    }
    
    func getTodayFoodCount() -> Int {
        return logsForToday().filter { $0.type == .food }.count
    }
    
    // MARK: - Analytics
    
    private func updateTodaysSummary() {
        let todaysLogs = logsForToday()
        
        let foodCount = todaysLogs.filter { $0.type == .food }.count
        let drinkCount = todaysLogs.filter { $0.type == .drink }.count
        let pukeCount = todaysLogs.filter { $0.type == .puke }.count
        let symptomCount = todaysLogs.filter { $0.type == .symptom }.count
        
        // Calculate kept down percentage
        var keptDownPercentage: Double?
        if foodCount > 0 {
            let mealsKeptDown = foodCount - pukeCount
            keptDownPercentage = Double(max(0, mealsKeptDown)) / Double(foodCount) * 100
        }
        
        todaysSummary = DailySummary(
            date: Date(),
            foodCount: foodCount,
            drinkCount: drinkCount,
            pukeCount: pukeCount,
            symptomCount: symptomCount,
            totalFluidIntake: calculateTotalFluid(from: todaysLogs),
            keptDownPercentage: keptDownPercentage
        )
    }
    
    private func calculateTotalFluid(from logs: [LogEntry]) -> String? {
        let drinkLogs = logs.filter { $0.type == .drink }
        if drinkLogs.isEmpty { return nil }
        
        // Simple count for now, could parse amounts later
        return "\(drinkLogs.count) drinks"
    }
    
    private func checkPukeFrequency() {
        let recentPukes = logsForLastHours(3).filter { $0.type == .puke }
        if recentPukes.count >= 3 {
            // Could trigger an alert or notification
            print("Warning: \(recentPukes.count) vomiting episodes in last 3 hours")
        }
    }
    
    func getMostCommonSymptomTime() -> String? {
        let symptoms = logEntries.filter { $0.type == .symptom || $0.type == .puke }
        guard !symptoms.isEmpty else { return nil }
        
        let calendar = Calendar.current
        let hourCounts = symptoms.reduce(into: [Int: Int]()) { counts, log in
            let hour = calendar.component(.hour, from: log.date)
            counts[hour, default: 0] += 1
        }
        
        if let mostCommonHour = hourCounts.max(by: { $0.value < $1.value })?.key {
            let formatter = DateFormatter()
            formatter.dateFormat = "ha"
            var components = DateComponents()
            components.hour = mostCommonHour
            if let date = calendar.date(from: components) {
                return formatter.string(from: date)
            }
        }
        
        return nil
    }
    
    // MARK: - Time Editing
    
    func updateLogTime(_ log: LogEntry, newDate: Date) {
        guard let index = logEntries.firstIndex(where: { $0.id == log.id }) else { return }
        logEntries[index].date = newDate
        saveLogs()
        updateTodaysSummary()
        objectWillChange.send()
    }
    
    // MARK: - Persistence
    
    func saveLogs() {
        dataQueue.async { [weak self] in
            guard let self = self else { return }
            
            let entriesToSave = self.logEntries
            print("💾 LogsManager.saveLogs called with \(entriesToSave.count) entries")
            
            do {
                let encoded = try JSONEncoder().encode(entriesToSave)
                UserDefaults.standard.set(encoded, forKey: self.userDefaultsKey)
                
                if !UserDefaults.standard.synchronize() {
                    print("💾 ⚠️ UserDefaults synchronize failed")
                }
                
                print("💾 Saved \(entriesToSave.count) entries to UserDefaults")
            } catch {
                print("💾 ❌ Failed to encode log entries: \(error.localizedDescription)")
                
                DispatchQueue.main.async {
                    NotificationCenter.default.post(
                        name: NSNotification.Name("DataSaveError"),
                        object: nil,
                        userInfo: ["error": "Failed to save logs: \(error.localizedDescription)"]
                    )
                }
            }
        }
    }
    
    private func loadLogs() {
        let savedVersion = UserDefaults.standard.integer(forKey: versionKey)
        
        guard let data = UserDefaults.standard.data(forKey: userDefaultsKey) else {
            print("💾 No saved logs found")
            UserDefaults.standard.set(currentVersion, forKey: versionKey)
            return
        }
        
        do {
            if savedVersion < currentVersion {
                print("💾 Migrating data from version \(savedVersion) to \(currentVersion)")
                try migrateData(from: savedVersion, data: data)
            } else {
                let decoded = try JSONDecoder().decode([LogEntry].self, from: data)
                
                if validateLogEntries(decoded) {
                    logEntries = decoded
                    print("💾 Loaded \(logEntries.count) log entries successfully")
                } else {
                    throw DataError.validationFailed
                }
            }
            
            UserDefaults.standard.set(currentVersion, forKey: versionKey)
        } catch {
            print("💾 ❌ Failed to decode log entries: \(error.localizedDescription)")
            
            createBackupBeforeReset(data)
            logEntries = []
            
            DispatchQueue.main.async {
                NotificationCenter.default.post(
                    name: NSNotification.Name("DataLoadError"),
                    object: nil,
                    userInfo: ["error": "Failed to load saved logs. A backup has been created and data has been reset."]
                )
            }
        }
    }
    
    private func migrateData(from oldVersion: Int, data: Data) throws {
        switch oldVersion {
        case 0:
            let decoded = try JSONDecoder().decode([LogEntry].self, from: data)
            logEntries = decoded
            print("💾 Migrated \(logEntries.count) entries from v0 to v\(currentVersion)")
        default:
            throw DataError.unsupportedVersion(oldVersion)
        }
    }
    
    private func validateLogEntries(_ entries: [LogEntry]) -> Bool {
        for entry in entries {
            if entry.date > Date().addingTimeInterval(86400) {
                print("💾 ⚠️ Found entry with future date: \(entry.date)")
                return false
            }
        }
        return true
    }
    
    private func createBackupBeforeReset(_ data: Data) {
        let timestamp = Int(Date().timeIntervalSince1970)
        let backupKey = "\(userDefaultsKey)_backup_\(timestamp)"
        UserDefaults.standard.set(data, forKey: backupKey)
        print("💾 Created backup at key: \(backupKey)")
    }
    
    enum DataError: LocalizedError {
        case validationFailed
        case unsupportedVersion(Int)
        case corruptedData
        
        var errorDescription: String? {
            switch self {
            case .validationFailed:
                return "Data validation failed. The data may be corrupted."
            case .unsupportedVersion(let version):
                return "Unsupported data version: \(version)"
            case .corruptedData:
                return "Data is corrupted and cannot be loaded."
            }
        }
    }
    
    // MARK: - Export
    
    func exportLogsAsText() -> String {
        let dateFormatter = DateFormatter()
        dateFormatter.dateStyle = .short
        dateFormatter.timeStyle = .short
        
        var export = "Health Logs Export\n"
        export += "Generated: \(Date())\n\n"
        
        let groupedByDate = Dictionary(grouping: logEntries) { entry in
            Calendar.current.startOfDay(for: entry.date)
        }
        
        for date in groupedByDate.keys.sorted(by: >) {
            dateFormatter.dateStyle = .full
            dateFormatter.timeStyle = .none
            export += "\n--- \(dateFormatter.string(from: date)) ---\n"
            
            dateFormatter.dateStyle = .none
            dateFormatter.timeStyle = .short
            
            if let logs = groupedByDate[date] {
                for log in logs.sorted(by: { $0.date > $1.date }) {
                    export += "\(dateFormatter.string(from: log.date)) - \(log.type.rawValue)"
                    if let notes = log.notes {
                        export += ": \(notes)"
                    }
                    if let severity = log.severityText {
                        export += " (\(severity))"
                    }
                    if let amount = log.amount {
                        export += " - \(amount)"
                    }
                    export += "\n"
                }
            }
        }
        
        return export
    }

    // MARK: - Calorie Tracking

    /// Get total calories for a specific date (includes photo logs via DashboardView aggregation)
    func getCalories(for date: Date) -> Int {
        let calendar = Calendar.current
        let logs = logEntries.filter {
            calendar.isDate($0.date, inSameDayAs: date) && $0.type == .food
        }
        return logs.reduce(0) { $0 + ($1.calories ?? 0) }
    }

    /// Get calories for the last N days
    func getCaloriesForLastDays(_ days: Int) -> [(date: Date, calories: Int)] {
        let calendar = Calendar.current
        var result: [(date: Date, calories: Int)] = []

        for dayOffset in 0..<days {
            guard let date = calendar.date(byAdding: .day, value: -dayOffset, to: Date()) else { continue }
            let startOfDay = calendar.startOfDay(for: date)
            let calories = getCalories(for: startOfDay)
            result.append((startOfDay, calories))
        }

        return result.reversed()
    }

    /// Get meals grouped by time of day for a specific date
    func getMealsByTimeOfDay(for date: Date) -> [MealCategory: [(log: LogEntry, calories: Int)]] {
        let calendar = Calendar.current
        let logs = logEntries.filter {
            calendar.isDate($0.date, inSameDayAs: date) && $0.type == .food
        }

        var grouped: [MealCategory: [(log: LogEntry, calories: Int)]] = [:]

        for log in logs {
            let hour = calendar.component(.hour, from: log.date)
            let category = MealCategory.from(hour: hour)
            let calories = log.calories ?? 0

            if grouped[category] == nil {
                grouped[category] = []
            }
            grouped[category]?.append((log, calories))
        }

        return grouped
    }

    /// Get nutrition data for a specific date
    func getNutritionData(for date: Date) -> NutritionData {
        let calendar = Calendar.current
        let logs = logEntries.filter {
            calendar.isDate($0.date, inSameDayAs: date) && $0.type == .food
        }

        let calories = logs.reduce(0) { $0 + ($1.calories ?? 0) }
        let protein = logs.reduce(0) { $0 + ($1.protein ?? 0) }
        let carbs = logs.reduce(0) { $0 + ($1.carbs ?? 0) }
        let fat = logs.reduce(0) { $0 + ($1.fat ?? 0) }

        return NutritionData(
            calories: calories,
            protein: protein,
            carbs: carbs,
            fat: fat
        )
    }
}

// MARK: - Supporting Data Models

enum MealCategory: String, CaseIterable {
    case breakfast = "Breakfast"
    case lunch = "Lunch"
    case dinner = "Dinner"
    case snacks = "Snacks"

    static func from(hour: Int) -> MealCategory {
        switch hour {
        case 5..<11: return .breakfast
        case 11..<15: return .lunch
        case 15..<20: return .dinner
        default: return .snacks
        }
    }

    var icon: String {
        switch self {
        case .breakfast: return "sunrise.fill"
        case .lunch: return "sun.max.fill"
        case .dinner: return "moon.stars.fill"
        case .snacks: return "leaf.fill"
        }
    }

    var color: Color {
        switch self {
        case .breakfast: return .orange
        case .lunch: return .yellow
        case .dinner: return .purple
        case .snacks: return .green
        }
    }
}

struct NutritionData {
    let calories: Int
    let protein: Int
    let carbs: Int
    let fat: Int

    var isEmpty: Bool {
        calories == 0 && protein == 0 && carbs == 0 && fat == 0
    }
}