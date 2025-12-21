import Foundation
import SwiftUI

// MARK: - Task Types
enum AsyncTaskType: String, Codable {
    case fetchFoodMacros = "fetch_food_macros"
    case analyzeFoodImage = "analyze_food_image"
    case fetchPUQESuggestions = "fetch_puqe_suggestions"
    case processVoiceCommand = "process_voice_command"
}

// MARK: - Task Status
enum AsyncTaskStatus: String, Codable {
    case pending = "pending"
    case processing = "processing"
    case completed = "completed"
    case failed = "failed"
}

// MARK: - Async Task Model
struct AsyncTask: Codable, Identifiable {
    let id: UUID
    let type: AsyncTaskType
    var status: AsyncTaskStatus
    let data: [String: String] // Generic data storage
    let createdAt: Date
    var updatedAt: Date
    var retryCount: Int
    var result: String? // JSON encoded result
    var error: String?
    
    init(type: AsyncTaskType, data: [String: String]) {
        self.id = UUID()
        self.type = type
        self.status = .pending
        self.data = data
        self.createdAt = Date()
        self.updatedAt = Date()
        self.retryCount = 0
        self.result = nil
        self.error = nil
    }
}

// MARK: - Global Actor for Task Management
@globalActor
actor AsyncTaskManager {
    static let shared = AsyncTaskManager()
    
    private var activeTasks: [UUID: Task<Void, Never>] = [:]
    private var taskQueue: [AsyncTask] = []
    private let maxRetries = 3
    private let userDefaultsKey = "AsyncTaskQueue"
    
    // Dependencies (will be injected)
    private var logsManager: LogsManager?
    private var openAIManager: OpenAIManager?
    
    private init() {
        Task {
            await loadPersistedTasks()
        }
    }
    
    // MARK: - Configuration
    func configure(logsManager: LogsManager, openAIManager: OpenAIManager) {
        print("🔧 AsyncTaskManager.configure() called")
        print("🔧 LogsManager: \(logsManager)")
        print("🔧 OpenAIManager: \(openAIManager)")
        self.logsManager = logsManager
        self.openAIManager = openAIManager
        print("🔧 AsyncTaskManager configured successfully")
    }
    
    // MARK: - Task Queue Management
    func addTask(_ task: AsyncTask) {
        print("📋 AsyncTaskManager.addTask() - Adding task: \(task.type) for \(task.data)")
        taskQueue.append(task)
        persistTasks()
        print("📋 Task queued, starting processing...")
        processTask(task)
    }
    
    func processPendingTasks() {
        let pendingTasks = taskQueue.filter { $0.status == .pending || ($0.status == .failed && $0.retryCount < maxRetries) }
        
        for task in pendingTasks {
            processTask(task)
        }
    }
    
    private func processTask(_ task: AsyncTask) {
        // Cancel any existing task for this ID
        activeTasks[task.id]?.cancel()
        
        // Create new processing task
        activeTasks[task.id] = Task { [weak self] in
            guard let self = self else { return }
            
            await self.updateTaskStatus(task.id, status: .processing)
            
            switch task.type {
            case .fetchFoodMacros:
                await self.processFoodMacros(task)
            case .analyzeFoodImage:
                await self.processImageAnalysis(task)
            case .fetchPUQESuggestions:
                await self.processPUQESuggestions(task)
            case .processVoiceCommand:
                await self.processVoiceCommand(task)
            }
            
            await self.updateTaskStatus(task.id, status: .completed)
            await self.removeActiveTask(task.id)
        }
    }
    
    // MARK: - Task Processing
    private func processFoodMacros(_ task: AsyncTask) async {
        print("🍔🍔🍔 ============================================")
        print("🍔🍔🍔 processFoodMacros STARTED")
        print("🍔🍔🍔 ============================================")
        print("🍔 Processing food macros task for: \(task.data)")

        guard let foodName = task.data["foodName"],
              let logId = task.data["logId"],
              let logUUID = UUID(uuidString: logId) else {
            print("❌ Invalid task data: \(task.data)")
            await handleTaskFailure(task, error: TaskError.invalidData)
            return
        }

        print("🍔 Food: \(foodName), LogID: \(logUUID)")

        guard let openAI = openAIManager else {
            print("❌ OpenAIManager not configured!")
            await handleTaskFailure(task, error: TaskError.managerNotConfigured)
            return
        }

        guard let logsManager = logsManager else {
            print("❌ LogsManager not configured!")
            await handleTaskFailure(task, error: TaskError.managerNotConfigured)
            return
        }

        do {
            print("🍔 Step 1: Fetching macros from OpenAI for: '\(foodName)'")
            // Fetch macros from OpenAI (this is the slow part - 2-3 seconds)
            let macros = try await openAI.estimateFoodMacros(foodName: foodName)
            print("🍔 ✅ Received macros from OpenAI:")
            print("🍔    calories=\(macros.calories)")
            print("🍔    protein=\(macros.protein)g")
            print("🍔    carbs=\(macros.carbs)g")
            print("🍔    fat=\(macros.fat)g")

            print("🍔 Step 2: Updating LogEntry on MainActor...")
            // Update the log entry directly on MainActor to maintain observation chain
            await updateLogEntryOnMainActor(logsManager: logsManager, logId: logUUID, macros: macros)

            print("🍔 Step 3: Recording task result...")
            let resultData = [
                "calories": String(macros.calories),
                "protein": String(macros.protein),
                "carbs": String(macros.carbs),
                "fat": String(macros.fat)
            ]
            await updateTaskResult(task.id, result: resultData)
            print("🍔🍔🍔 ============================================")
            print("🍔🍔🍔 processFoodMacros COMPLETED SUCCESSFULLY")
            print("🍔🍔🍔 ============================================")
        } catch {
            print("❌❌❌ processFoodMacros FAILED: \(error)")
            await handleTaskFailure(task, error: error)
        }
    }

    @MainActor
    private func updateLogEntryOnMainActor(logsManager: LogsManager, logId: UUID, macros: OpenAIManager.FoodMacros) {
        print("🍔📍 updateLogEntryOnMainActor called on MainActor")
        print("🍔📍 LogsManager instance: \(ObjectIdentifier(logsManager))")
        print("🍔📍 Looking for log entry with ID: \(logId)")
        print("🍔📍 Current log count: \(logsManager.logEntries.count)")

        // Find and update the log entry
        if let index = logsManager.logEntries.firstIndex(where: { $0.id == logId }) {
            print("🍔📍 ✅ Found log entry at index \(index)")
            print("🍔📍 BEFORE update: calories=\(logsManager.logEntries[index].calories ?? 0)")

            logsManager.logEntries[index].calories = macros.calories
            logsManager.logEntries[index].protein = macros.protein
            logsManager.logEntries[index].carbs = macros.carbs
            logsManager.logEntries[index].fat = macros.fat
            logsManager.logEntries[index].notes = "Via voice command"

            print("🍔📍 AFTER update: calories=\(logsManager.logEntries[index].calories ?? 0)")

            // Save and notify - this should trigger UI update
            print("🍔📍 Calling saveLogs()...")
            logsManager.saveLogs()
            print("🍔📍 Calling objectWillChange.send()...")
            logsManager.objectWillChange.send()
            print("🍔📍 ✅✅✅ Log entry updated and UI notified!")
        } else {
            print("🍔📍 ❌❌❌ Could not find log entry with ID: \(logId)")
            print("🍔📍 Available IDs: \(logsManager.logEntries.map { $0.id })")
        }
    }
    
    private func processImageAnalysis(_ task: AsyncTask) async {
        // Implementation for image analysis
        // Similar pattern to processFoodMacros
    }
    
    private func processPUQESuggestions(_ task: AsyncTask) async {
        // Implementation for PUQE suggestions
        // Similar pattern to processFoodMacros
    }
    
    private func processVoiceCommand(_ task: AsyncTask) async {
        // Implementation for voice command processing
        // Similar pattern to processFoodMacros
    }
    
    // MARK: - Task Status Management
    private func updateTaskStatus(_ taskId: UUID, status: AsyncTaskStatus) {
        if let index = taskQueue.firstIndex(where: { $0.id == taskId }) {
            taskQueue[index].status = status
            taskQueue[index].updatedAt = Date()
            persistTasks()
        }
    }
    
    private func updateTaskResult(_ taskId: UUID, result: [String: String]) async {
        if let index = taskQueue.firstIndex(where: { $0.id == taskId }) {
            if let jsonData = try? JSONEncoder().encode(result),
               let jsonString = String(data: jsonData, encoding: .utf8) {
                taskQueue[index].result = jsonString
                taskQueue[index].updatedAt = Date()
                persistTasks()
            }
        }
    }
    
    private func handleTaskFailure(_ task: AsyncTask, error: Error) async {
        if let index = taskQueue.firstIndex(where: { $0.id == task.id }) {
            taskQueue[index].retryCount += 1
            taskQueue[index].error = error.localizedDescription
            taskQueue[index].updatedAt = Date()
            
            if taskQueue[index].retryCount < maxRetries {
                // Retry with exponential backoff
                let delay = Double(taskQueue[index].retryCount) * 2.0
                Task {
                    try? await Task.sleep(nanoseconds: UInt64(delay * 1_000_000_000))
                    self.processTask(taskQueue[index])
                }
            } else {
                taskQueue[index].status = .failed
            }
            
            persistTasks()
        }
    }
    
    private func removeActiveTask(_ taskId: UUID) {
        activeTasks.removeValue(forKey: taskId)
    }
    
    // MARK: - Persistence
    private func persistTasks() {
        if let encoded = try? JSONEncoder().encode(taskQueue) {
            UserDefaults.standard.set(encoded, forKey: userDefaultsKey)
        }
    }
    
    private func loadPersistedTasks() {
        if let data = UserDefaults.standard.data(forKey: userDefaultsKey),
           let decoded = try? JSONDecoder().decode([AsyncTask].self, from: data) {
            taskQueue = decoded
        }
    }
    
    // MARK: - Cleanup
    func cleanupCompletedTasks(olderThan days: Int = 7) {
        let cutoffDate = Calendar.current.date(byAdding: .day, value: -days, to: Date()) ?? Date()
        taskQueue.removeAll { task in
            task.status == .completed && task.updatedAt < cutoffDate
        }
        persistTasks()
    }
    
    // MARK: - Error Types
    enum TaskError: LocalizedError {
        case invalidData
        case managerNotConfigured
        case networkError
        
        var errorDescription: String? {
            switch self {
            case .invalidData:
                return "Invalid task data"
            case .managerNotConfigured:
                return "Manager not configured"
            case .networkError:
                return "Network error occurred"
            }
        }
    }
}

// MARK: - Public API for Easy Access
extension AsyncTaskManager {
    static func queueFoodMacrosFetch(foodName: String, logId: UUID) async {
        let task = AsyncTask(
            type: .fetchFoodMacros,
            data: ["foodName": foodName, "logId": logId.uuidString]
        )
        await shared.addTask(task)
    }
    
    static func processPending() async {
        await shared.processPendingTasks()
    }
    
    static func configure(logsManager: LogsManager, openAIManager: OpenAIManager) async {
        await shared.configure(logsManager: logsManager, openAIManager: openAIManager)
    }
}