import Foundation
import SwiftUI
import Combine

// MARK: - Unified Log Protocol
protocol LoggableEntry {
    var id: UUID { get }
    var date: Date { get }
    var logCategory: LogCategory { get }
    var source: LogSource { get }
    var displayTitle: String { get }
    var displaySubtitle: String? { get }
    var nutritionInfo: NutritionInfo? { get }
}

struct NutritionInfo {
    let calories: Int?
    let protein: Double?
    let carbs: Double?
    let fat: Double?
    let fiber: Double?
}

// MARK: - Unified Activity Entry
struct UnifiedActivityEntry: Identifiable {
    let id: UUID
    let date: Date
    let category: LogCategory
    let source: LogSource
    let title: String
    let subtitle: String?
    let nutrition: NutritionInfo?
    let originalEntry: Any // Keep reference to original entry
}

// MARK: - Unified Activity View Model
class UnifiedActivityViewModel: ObservableObject {
    @Published var allActivities: [UnifiedActivityEntry] = []
    @Published var todaysNutrition: NutritionTotals = NutritionTotals()
    @Published var todaysWaterIntake: Int = 0
    @Published var todaysFoodCount: Int = 0
    @Published var todaysSupplementCount: Int = 0
    @Published var recentActivities: [UnifiedActivityEntry] = []
    
    private var cancellables = Set<AnyCancellable>()
    private let logsManager: LogsManager
    private let photoFoodLogManager: PhotoFoodLogManager
    private let voiceLogManager: VoiceLogManager
    private let supplementManager: SupplementManager
    
    struct NutritionTotals {
        var calories: Int = 0
        var protein: Double = 0
        var carbs: Double = 0
        var fat: Double = 0
        var fiber: Double = 0
        
        mutating func reset() {
            calories = 0
            protein = 0
            carbs = 0
            fat = 0
            fiber = 0
        }
        
        mutating func add(nutrition: NutritionInfo?) {
            guard let nutrition = nutrition else { return }
            calories += nutrition.calories ?? 0
            protein += nutrition.protein ?? 0
            carbs += nutrition.carbs ?? 0
            fat += nutrition.fat ?? 0
            fiber += nutrition.fiber ?? 0
        }
    }
    
    init(logsManager: LogsManager,
         photoFoodLogManager: PhotoFoodLogManager = PhotoFoodLogManager(),
         voiceLogManager: VoiceLogManager = VoiceLogManager.shared,
         supplementManager: SupplementManager) {
        self.logsManager = logsManager
        self.photoFoodLogManager = photoFoodLogManager
        self.voiceLogManager = voiceLogManager
        self.supplementManager = supplementManager
        
        setupObservers()
        refreshAllData()
    }
    
    private func setupObservers() {
        // Observe LogsManager changes
        logsManager.objectWillChange
            .debounce(for: .milliseconds(100), scheduler: RunLoop.main)
            .sink { [weak self] _ in
                self?.refreshAllData()
            }
            .store(in: &cancellables)
        
        // Observe PhotoFoodLogManager changes
        photoFoodLogManager.$photoLogs
            .debounce(for: .milliseconds(100), scheduler: RunLoop.main)
            .sink { [weak self] _ in
                self?.refreshAllData()
            }
            .store(in: &cancellables)
        
        // Observe VoiceLogManager changes
        voiceLogManager.$voiceLogs
            .debounce(for: .milliseconds(100), scheduler: RunLoop.main)
            .sink { [weak self] _ in
                self?.refreshAllData()
            }
            .store(in: &cancellables)
        
        // Observe SupplementManager changes
        supplementManager.$supplements
            .debounce(for: .milliseconds(100), scheduler: RunLoop.main)
            .sink { [weak self] _ in
                self?.refreshAllData()
            }
            .store(in: &cancellables)
    }
    
    func refreshAllData() {
        DispatchQueue.main.async { [weak self] in
            self?.aggregateAllActivities()
            self?.calculateTodaysNutrition()
            self?.updateDailyCounts()
            self?.updateRecentActivities()
        }
    }
    
    private func aggregateAllActivities() {
        var activities: [UnifiedActivityEntry] = []
        let calendar = Calendar.current
        let today = Date()
        
        // Add LogsManager entries
        for entry in logsManager.logEntries {
            if calendar.isDate(entry.date, inSameDayAs: today) {
                let nutrition: NutritionInfo? = entry.type == .food ? 
                    NutritionInfo(
                        calories: entry.calories,
                        protein: entry.protein.map { Double($0) },
                        carbs: entry.carbs.map { Double($0) },
                        fat: entry.fat.map { Double($0) },
                        fiber: nil
                    ) : nil
                
                let title = entry.foodName ?? entry.type.rawValue
                let subtitle = buildSubtitle(for: entry)
                
                activities.append(UnifiedActivityEntry(
                    id: entry.id,
                    date: entry.date,
                    category: mapToLogCategory(entry.type),
                    source: entry.source,
                    title: title,
                    subtitle: subtitle,
                    nutrition: nutrition,
                    originalEntry: entry
                ))
            }
        }
        
        // Add PhotoFoodLog entries
        for photo in photoFoodLogManager.photoLogs {
            if calendar.isDate(photo.date, inSameDayAs: today) {
                let nutrition = photo.aiAnalysis.map { analysis in
                    NutritionInfo(
                        calories: analysis.totalCalories,
                        protein: analysis.totalProtein,
                        carbs: analysis.totalCarbs,
                        fat: analysis.totalFat,
                        fiber: analysis.totalFiber
                    )
                }
                
                let title = photo.aiAnalysis?.items.first?.name ?? "Photo Food"
                let subtitle = photo.notes ?? photo.mealType?.rawValue
                
                activities.append(UnifiedActivityEntry(
                    id: photo.id,
                    date: photo.date,
                    category: .food,
                    source: .manual,
                    title: title,
                    subtitle: subtitle,
                    nutrition: nutrition,
                    originalEntry: photo
                ))
            }
        }
        
        // Add VoiceLog food entries (that might not be in LogsManager yet due to async)
        for voiceLog in voiceLogManager.voiceLogs {
            if calendar.isDate(voiceLog.date, inSameDayAs: today) && voiceLog.category == .food {
                // Check if this voice log already has a corresponding LogEntry
                let hasLogEntry = logsManager.logEntries.contains { 
                    $0.voiceLogId == voiceLog.id 
                }
                
                if !hasLogEntry {
                    // This is a pending voice log that hasn't been processed yet
                    let title = voiceLog.transcription ?? "Voice Food Log"
                    activities.append(UnifiedActivityEntry(
                        id: voiceLog.id,
                        date: voiceLog.date,
                        category: .food,
                        source: .voice,
                        title: title,
                        subtitle: "Processing...",
                        nutrition: nil,
                        originalEntry: voiceLog
                    ))
                }
            }
        }
        
        // Add Supplement entries for today
        let todaysSupplements = supplementManager.getTodaysIntake()
        for (supplement, taken, _) in todaysSupplements {
            if taken {
                activities.append(UnifiedActivityEntry(
                    id: supplement.id,
                    date: Date(), // Today's date for supplements
                    category: .supplements,
                    source: .manual,
                    title: supplement.name,
                    subtitle: supplement.dosage,
                    nutrition: nil,
                    originalEntry: supplement
                ))
            }
        }
        
        // Sort by date (newest first)
        activities.sort { $0.date > $1.date }
        self.allActivities = activities
    }
    
    private func calculateTodaysNutrition() {
        var totals = NutritionTotals()
        
        for activity in allActivities {
            if activity.category == .food {
                totals.add(nutrition: activity.nutrition)
            }
        }
        
        self.todaysNutrition = totals
    }
    
    private func updateDailyCounts() {
        let waterCount = allActivities.filter { 
            $0.category == .hydration 
        }.count
        
        let foodCount = allActivities.filter { 
            $0.category == .food 
        }.count
        
        let supplementCount = allActivities.filter { 
            $0.category == .supplements 
        }.count
        
        self.todaysWaterIntake = waterCount
        self.todaysFoodCount = foodCount
        self.todaysSupplementCount = supplementCount
    }
    
    private func updateRecentActivities() {
        // Show last 10 activities
        recentActivities = Array(allActivities.prefix(10))
    }
    
    private func mapToLogCategory(_ type: LogType) -> LogCategory {
        switch type {
        case .food:
            return .food
        case .water, .drink:
            return .hydration
        case .symptom, .puke:
            return .symptoms
        case .supplement:
            return .supplements
        }
    }
    
    private func buildSubtitle(for entry: LogEntry) -> String? {
        var parts: [String] = []
        
        if let amount = entry.amount {
            parts.append(amount)
        }
        
        if entry.type == .food {
            var macros: [String] = []
            if let cal = entry.calories { macros.append("\(cal) cal") }
            if let p = entry.protein { macros.append("\(p)g protein") }
            if let c = entry.carbs { macros.append("\(c)g carbs") }
            if let f = entry.fat { macros.append("\(f)g fat") }
            if !macros.isEmpty {
                parts.append(macros.joined(separator: " • "))
            }
        }
        
        if let notes = entry.notes {
            parts.append(notes)
        }
        
        return parts.isEmpty ? nil : parts.joined(separator: " - ")
    }
    
    // MARK: - Public Methods
    
    func getTodaysActivities(category: LogCategory? = nil) -> [UnifiedActivityEntry] {
        if let category = category {
            return allActivities.filter { $0.category == category }
        }
        return allActivities
    }
    
    func getRecentActivities(limit: Int = 5) -> [UnifiedActivityEntry] {
        return Array(allActivities.prefix(limit))
    }
    
    func forceRefresh() {
        refreshAllData()
    }
}

// LogCategory already has all needed cases: food, hydration, supplements, symptoms