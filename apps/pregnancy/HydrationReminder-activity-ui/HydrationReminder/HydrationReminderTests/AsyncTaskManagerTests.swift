import XCTest
@testable import HydrationReminder

class AsyncTaskManagerTests: XCTestCase {
    
    var logsManager: LogsManager!
    var openAIManager: OpenAIManager!
    
    override func setUp() async throws {
        try await super.setUp()
        
        // Clear UserDefaults
        UserDefaults.standard.removeObject(forKey: "AsyncTaskQueue")
        UserDefaults.standard.removeObject(forKey: "UnifiedLogEntries")
        
        // Initialize managers
        let notificationManager = NotificationManager()
        logsManager = LogsManager(notificationManager: notificationManager)
        openAIManager = OpenAIManager.shared
        
        // Configure AsyncTaskManager
        await AsyncTaskManager.configure(
            logsManager: logsManager,
            openAIManager: openAIManager
        )
    }
    
    override func tearDown() async throws {
        logsManager = nil
        openAIManager = nil
        try await super.tearDown()
    }
    
    // MARK: - Test Task Creation
    
    func testTaskCreationAndPersistence() async {
        // Given
        let foodName = "test food"
        let logId = UUID()
        
        // When
        await AsyncTaskManager.queueFoodMacrosFetch(foodName: foodName, logId: logId)
        
        // Give it a moment to persist
        try? await Task.sleep(nanoseconds: 100_000_000) // 0.1 second
        
        // Then - Check UserDefaults for persisted task
        if let data = UserDefaults.standard.data(forKey: "AsyncTaskQueue"),
           let tasks = try? JSONDecoder().decode([AsyncTask].self, from: data) {
            XCTAssertGreaterThan(tasks.count, 0, "Should have at least one task")
            
            if let task = tasks.first {
                XCTAssertEqual(task.type, .fetchFoodMacros)
                XCTAssertEqual(task.status, .pending)
                XCTAssertEqual(task.data["foodName"], foodName)
                XCTAssertEqual(task.data["logId"], logId.uuidString)
            }
        } else {
            XCTFail("No tasks found in UserDefaults")
        }
    }
    
    // MARK: - Test Immediate Log Creation
    
    func testFoodLogCreatedImmediatelyWithPlaceholders() {
        // Given
        let voiceManager = VoiceLogManager.makeForTesting()
        voiceManager.configure(logsManager: logsManager, supplementManager: SupplementManager(notificationManager: NotificationManager()))
        
        let action = VoiceAction(
            type: .logFood,
            details: VoiceAction.ActionDetails(
                item: "test burger",
                amount: nil,
                unit: nil,
                severity: nil,
                mealType: nil,
                symptoms: nil,
                vitaminName: nil,
                notes: nil
            ),
            confidence: 0.9
        )
        
        // When
        voiceManager.executeVoiceActions([action])
        
        // Then
        XCTAssertEqual(logsManager.logEntries.count, 1, "Should have one entry immediately")
        
        let entry = logsManager.logEntries.first!
        XCTAssertEqual(entry.type, .food)
        XCTAssertEqual(entry.foodName, "test burger")
        XCTAssertEqual(entry.calories, 0, "Should have placeholder calories")
        XCTAssertEqual(entry.protein, 0, "Should have placeholder protein")
        XCTAssertEqual(entry.carbs, 0, "Should have placeholder carbs")
        XCTAssertEqual(entry.fat, 0, "Should have placeholder fat")
        XCTAssertEqual(entry.notes, "Processing nutrition data...")
    }
    
    // MARK: - Test Task Processing on App Lifecycle
    
    func testPendingTasksProcessOnAppLaunch() async {
        // Given - Create a task directly
        let task = AsyncTask(
            type: .fetchFoodMacros,
            data: [
                "foodName": "pending food",
                "logId": UUID().uuidString
            ]
        )
        
        // Save to UserDefaults to simulate pending task from previous session
        if let encoded = try? JSONEncoder().encode([task]) {
            UserDefaults.standard.set(encoded, forKey: "AsyncTaskQueue")
        }
        
        // When - Process pending tasks
        await AsyncTaskManager.processPending()
        
        // Give it time to process
        try? await Task.sleep(nanoseconds: 500_000_000) // 0.5 seconds
        
        // Then - Task should be picked up for processing
        if let data = UserDefaults.standard.data(forKey: "AsyncTaskQueue"),
           let tasks = try? JSONDecoder().decode([AsyncTask].self, from: data),
           let processedTask = tasks.first(where: { $0.data["foodName"] == "pending food" }) {
            
            // Status should change from pending
            XCTAssertTrue(
                processedTask.status == .processing || 
                processedTask.status == .completed ||
                processedTask.status == .failed,
                "Task should no longer be pending"
            )
        }
    }
    
    // MARK: - Test Multiple Tasks
    
    func testMultipleFoodTasksQueued() async {
        // Given
        let foods = ["chicken", "rice", "broccoli"]
        let logIds = foods.map { _ in UUID() }
        
        // When - Queue multiple tasks
        for (food, logId) in zip(foods, logIds) {
            await AsyncTaskManager.queueFoodMacrosFetch(foodName: food, logId: logId)
        }
        
        // Give time to persist
        try? await Task.sleep(nanoseconds: 200_000_000) // 0.2 seconds
        
        // Then
        if let data = UserDefaults.standard.data(forKey: "AsyncTaskQueue"),
           let tasks = try? JSONDecoder().decode([AsyncTask].self, from: data) {
            
            XCTAssertGreaterThanOrEqual(tasks.count, 3, "Should have at least 3 tasks")
            
            let foodNames = tasks.compactMap { $0.data["foodName"] }
            for food in foods {
                XCTAssertTrue(foodNames.contains(food), "Should have task for \(food)")
            }
        } else {
            XCTFail("No tasks found")
        }
    }
    
    // MARK: - Test Error Handling
    
    func testTaskWithInvalidDataHandledGracefully() async {
        // Given - Task with invalid log ID
        let task = AsyncTask(
            type: .fetchFoodMacros,
            data: [
                "foodName": "test",
                "logId": "invalid-uuid"  // Invalid UUID
            ]
        )
        
        // When - Add and process task
        await AsyncTaskManager.shared.addTask(task)
        
        // Give time to process
        try? await Task.sleep(nanoseconds: 500_000_000) // 0.5 seconds
        
        // Then - Task should fail gracefully
        if let data = UserDefaults.standard.data(forKey: "AsyncTaskQueue"),
           let tasks = try? JSONDecoder().decode([AsyncTask].self, from: data),
           let failedTask = tasks.first(where: { $0.data["logId"] == "invalid-uuid" }) {
            
            XCTAssertEqual(failedTask.status, .failed, "Task should be marked as failed")
            XCTAssertNotNil(failedTask.error, "Should have error message")
        }
    }
    
    // MARK: - Test Cleanup
    
    func testOldCompletedTasksGetCleaned() async {
        // Given - Create old completed task
        var oldTask = AsyncTask(
            type: .fetchFoodMacros,
            data: ["foodName": "old food", "logId": UUID().uuidString]
        )
        
        // Set to completed and old date
        oldTask.status = .completed
        oldTask.updatedAt = Calendar.current.date(byAdding: .day, value: -8, to: Date())!
        
        // Also create recent task
        var recentTask = AsyncTask(
            type: .fetchFoodMacros,
            data: ["foodName": "recent food", "logId": UUID().uuidString]
        )
        recentTask.status = .completed
        recentTask.updatedAt = Date()
        
        // Save both
        let tasks = [oldTask, recentTask]
        if let encoded = try? JSONEncoder().encode(tasks) {
            UserDefaults.standard.set(encoded, forKey: "AsyncTaskQueue")
        }
        
        // When - Cleanup old tasks
        await AsyncTaskManager.shared.cleanupCompletedTasks(olderThan: 7)
        
        // Then
        if let data = UserDefaults.standard.data(forKey: "AsyncTaskQueue"),
           let remainingTasks = try? JSONDecoder().decode([AsyncTask].self, from: data) {
            
            XCTAssertEqual(remainingTasks.count, 1, "Should have only recent task")
            XCTAssertEqual(remainingTasks.first?.data["foodName"], "recent food")
        }
    }
}