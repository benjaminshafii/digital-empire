import Foundation
import SwiftUI
import UserNotifications

class SupplementManager: ObservableObject {
    @Published var supplements: [Supplement] = []
    @Published var todaysSummary: SupplementSummary?
    
    private let userDefaultsKey = "SavedSupplements"
    private let notificationManager: NotificationManager
    private let dataQueue = DispatchQueue(label: "com.corgina.supplementmanager", qos: .userInitiated)
    
    struct SupplementSummary {
        let totalSupplements: Int
        let takenToday: Int
        let missedToday: Int
        let upcomingReminders: [Date]
        let complianceRate: Double
    }
    
    init(notificationManager: NotificationManager? = nil) {
        self.notificationManager = notificationManager ?? NotificationManager()
        loadSupplements()
        updateTodaysSummary()
        scheduleReminders()
    }
    
    func addSupplement(_ supplement: Supplement) {
        supplements.append(supplement)
        saveSupplements()
        scheduleReminders()
        updateTodaysSummary()
    }
    
    func updateSupplement(_ supplement: Supplement) {
        if let index = supplements.firstIndex(where: { $0.id == supplement.id }) {
            supplements[index] = supplement
            saveSupplements()
            scheduleReminders()
            updateTodaysSummary()
        }
    }
    
    func deleteSupplement(_ supplement: Supplement) {
        supplements.removeAll { $0.id == supplement.id }
        saveSupplements()
        cancelReminders(for: supplement)
        updateTodaysSummary()
    }
    
    func logIntake(supplementId: UUID, taken: Bool = true, notes: String? = nil) {
        guard let index = supplements.firstIndex(where: { $0.id == supplementId }) else { return }
        
        let record = Supplement.IntakeRecord(taken: taken, notes: notes)
        supplements[index].intakeHistory.append(record)
        saveSupplements()
        updateTodaysSummary()
        
        if taken && supplements[index].isEssential {
            NotificationCenter.default.post(
                name: Notification.Name("EssentialSupplementTaken"),
                object: nil,
                userInfo: ["supplement": supplements[index]]
            )
        }
    }
    
    func logIntakeByName(_ name: String, taken: Bool = true) {
        // Try to find the supplement by various matching strategies
        let normalizedName = name.lowercased()
            .replacingOccurrences(of: "vitamin", with: "")
            .replacingOccurrences(of: "vitamins", with: "")
            .replacingOccurrences(of: "supplement", with: "")
            .replacingOccurrences(of: "supplements", with: "")
            .trimmingCharacters(in: .whitespacesAndNewlines)
        
        // First try exact match
        var supplement = supplements.first(where: { 
            $0.name.lowercased() == normalizedName 
        })
        
        // Then try contains match
        if supplement == nil {
            supplement = supplements.first(where: { 
                $0.name.lowercased().contains(normalizedName) ||
                normalizedName.contains($0.name.lowercased())
            })
        }
        
        // Try common variations
        if supplement == nil && normalizedName.contains("prenatal") {
            supplement = supplements.first(where: { 
                $0.name.lowercased().contains("prenatal") 
            })
        }
        
        if let supplement = supplement {
            print("💊 Found supplement match: \(supplement.name) for query: \(name)")
            logIntake(supplementId: supplement.id, taken: taken)
        } else {
            print("⚠️ No supplement found matching: \(name)")
            print("⚠️ Available supplements: \(supplements.map { $0.name }.joined(separator: ", "))")
            
            // If no match found but it's a common supplement, add it automatically
            if normalizedName.contains("prenatal") || 
               normalizedName.contains("iron") || 
               normalizedName.contains("folic") ||
               normalizedName.contains("calcium") ||
               normalizedName.contains("vitamin d") ||
               normalizedName.contains("dha") ||
               normalizedName.contains("omega") {
                // Auto-add the supplement
                let newSupplement = Supplement(
                    name: name.capitalized,
                    dosage: "1 tablet",
                    frequency: .daily,
                    reminderTimes: [],
                    remindersEnabled: false,
                    notes: "Added via voice command",
                    isEssential: normalizedName.contains("prenatal")
                )
                addSupplement(newSupplement)
                print("✅ Auto-added new supplement: \(name)")
                
                // Now log the intake
                logIntake(supplementId: newSupplement.id, taken: taken)
            }
        }
    }
    
    func getTodaysIntake() -> [(supplement: Supplement, taken: Bool, timesNeeded: Int)] {
        var result: [(Supplement, Bool, Int)] = []
        
        for supplement in supplements {
            let timesNeeded = supplement.frequency.timesPerDay
            let timesTaken = supplement.todaysTaken()
            let taken = timesNeeded > 0 ? timesTaken >= timesNeeded : timesTaken > 0
            result.append((supplement, taken, timesNeeded))
        }
        
        return result
    }
    
    func getMissedSupplements() -> [Supplement] {
        supplements.filter { supplement in
            let needed = supplement.frequency.timesPerDay
            let taken = supplement.todaysTaken()
            return supplement.shouldTakeToday() && taken < needed
        }
    }
    
    func getUpcomingReminders() -> [(Supplement, Date)] {
        var reminders: [(Supplement, Date)] = []
        let now = Date()
        let endOfDay = Calendar.current.date(bySettingHour: 23, minute: 59, second: 59, of: now)!
        
        for supplement in supplements where supplement.remindersEnabled {
            for reminderTime in supplement.reminderTimes {
                if reminderTime > now && reminderTime <= endOfDay {
                    reminders.append((supplement, reminderTime))
                }
            }
        }
        
        return reminders.sorted { $0.1 < $1.1 }
    }
    
    private func updateTodaysSummary() {
        let intake = getTodaysIntake()
        let taken = intake.filter { $0.taken }.count
        let total = intake.count
        let missed = intake.filter { !$0.taken && $0.supplement.shouldTakeToday() }.count
        
        let overallCompliance = supplements.isEmpty ? 0.0 : 
            supplements.map { $0.complianceRate(days: 7) }.reduce(0, +) / Double(supplements.count)
        
        todaysSummary = SupplementSummary(
            totalSupplements: total,
            takenToday: taken,
            missedToday: missed,
            upcomingReminders: getUpcomingReminders().map { $0.1 },
            complianceRate: overallCompliance
        )
    }
    
    private func scheduleReminders() {
        UNUserNotificationCenter.current().removeAllPendingNotificationRequests()
        
        for supplement in supplements where supplement.remindersEnabled {
            for reminderTime in supplement.reminderTimes {
                scheduleReminder(for: supplement, at: reminderTime)
            }
        }
    }
    
    func scheduleReminder(for supplement: Supplement) {
        // Cancel existing reminders for this supplement
        cancelReminders(for: supplement)
        
        // Schedule new reminders if enabled
        if supplement.remindersEnabled {
            for reminderTime in supplement.reminderTimes {
                scheduleReminder(for: supplement, at: reminderTime)
            }
        }
    }
    
    private func scheduleReminder(for supplement: Supplement, at time: Date) {
        let content = UNMutableNotificationContent()
        content.title = "Time for \(supplement.name)"
        content.body = "Remember to take your \(supplement.dosage) of \(supplement.name)"
        content.sound = .default
        content.categoryIdentifier = "SUPPLEMENT_REMINDER"
        content.userInfo = ["supplementId": supplement.id.uuidString]
        
        let calendar = Calendar.current
        let components = calendar.dateComponents([.hour, .minute], from: time)
        let trigger = UNCalendarNotificationTrigger(dateMatching: components, repeats: true)
        
        let request = UNNotificationRequest(
            identifier: "supplement_\(supplement.id.uuidString)_\(time.timeIntervalSince1970)",
            content: content,
            trigger: trigger
        )
        
        UNUserNotificationCenter.current().add(request) { error in
            if let error = error {
                print("Error scheduling supplement reminder: \(error)")
            }
        }
    }
    
    private func cancelReminders(for supplement: Supplement) {
        let identifierPrefix = "supplement_\(supplement.id.uuidString)"
        UNUserNotificationCenter.current().getPendingNotificationRequests { requests in
            let identifiersToRemove = requests
                .filter { $0.identifier.hasPrefix(identifierPrefix) }
                .map { $0.identifier }
            
            UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: identifiersToRemove)
        }
    }
    
    func addFromTemplate(_ templateName: String) {
        // First try exact match
        var template = PregnancySupplements.commonSupplements.first(where: {
            $0.name.lowercased() == templateName.lowercased()
        })

        // Then try partial match (e.g., "Prenatal" matches "Prenatal Vitamin")
        if template == nil {
            let normalizedName = templateName.lowercased()
            template = PregnancySupplements.commonSupplements.first(where: {
                $0.name.lowercased().contains(normalizedName) ||
                normalizedName.contains($0.name.lowercased())
            })
        }

        if let template = template {
            print("💊 Adding supplement from template: \(template.name)")
            let newSupplement = Supplement(
                name: template.name,
                dosage: template.dosage,
                frequency: template.frequency,
                reminderTimes: [Calendar.current.date(bySettingHour: 9, minute: 0, second: 0, of: Date())!],
                remindersEnabled: true,
                notes: template.notes,
                isEssential: template.isEssential
            )
            addSupplement(newSupplement)
        } else {
            print("💊 ⚠️ No template found for: \(templateName)")
        }
    }
    
    func checkInteractions(_ supplement: Supplement) -> [String] {
        var warnings: [String] = []
        
        if supplement.name.contains("Iron") {
            if supplements.contains(where: { $0.name.contains("Calcium") }) {
                warnings.append("Iron and Calcium can interfere with each other's absorption. Take at different times.")
            }
        }
        
        if supplement.name.contains("Vitamin D") {
            if supplements.contains(where: { $0.name.contains("Magnesium") }) {
                warnings.append("Vitamin D and Magnesium work well together for better absorption.")
            }
        }
        
        return warnings
    }
    
    private func saveSupplements() {
        dataQueue.async { [weak self] in
            guard let self = self else { return }
            
            let supplementsToSave = self.supplements
            
            do {
                let encoded = try JSONEncoder().encode(supplementsToSave)
                UserDefaults.standard.set(encoded, forKey: self.userDefaultsKey)
                
                if !UserDefaults.standard.synchronize() {
                    print("💊 ⚠️ UserDefaults synchronize failed")
                }
                
                print("💊 Saved \(supplementsToSave.count) supplements successfully")
            } catch {
                print("💊 ❌ Failed to encode supplements: \(error.localizedDescription)")
                
                DispatchQueue.main.async {
                    NotificationCenter.default.post(
                        name: NSNotification.Name("DataSaveError"),
                        object: nil,
                        userInfo: ["error": "Failed to save supplements: \(error.localizedDescription)"]
                    )
                }
            }
        }
    }
    
    private func loadSupplements() {
        guard let data = UserDefaults.standard.data(forKey: userDefaultsKey) else {
            print("💊 No saved supplements found")
            return
        }
        
        do {
            let decoded = try JSONDecoder().decode([Supplement].self, from: data)
            supplements = decoded
            print("💊 Loaded \(supplements.count) supplements successfully")
        } catch {
            print("💊 ❌ Failed to decode supplements: \(error.localizedDescription)")
            
            supplements = []
            
            DispatchQueue.main.async {
                NotificationCenter.default.post(
                    name: NSNotification.Name("DataLoadError"),
                    object: nil,
                    userInfo: ["error": "Failed to load supplements. Your data may be corrupted."]
                )
            }
        }
    }
}