import XCTest
@testable import HydrationReminder

class VoiceLogTests: XCTestCase {
    
    var voiceLogManager: VoiceLogManager!
    var logsManager: LogsManager!
    var supplementManager: SupplementManager!
    var notificationManager: NotificationManager!
    
    override func setUp() {
        super.setUp()
        
        // Clear UserDefaults for clean test environment
        UserDefaults.standard.removeObject(forKey: "UnifiedLogEntries")
        UserDefaults.standard.removeObject(forKey: "SavedVoiceLogs")
        UserDefaults.standard.removeObject(forKey: "AsyncTaskQueue")
        
        // Initialize managers
        notificationManager = NotificationManager()
        logsManager = LogsManager(notificationManager: notificationManager)
        supplementManager = SupplementManager(notificationManager: notificationManager)
        voiceLogManager = VoiceLogManager.makeForTesting()
        
        // Configure VoiceLogManager with shared managers
        voiceLogManager.configure(logsManager: logsManager, supplementManager: supplementManager)
    }
    
    override func tearDown() {
        voiceLogManager = nil
        logsManager = nil
        supplementManager = nil
        notificationManager = nil
        super.tearDown()
    }
    
    // MARK: - Test Water Logging
    
    func testWaterLoggingImmediatelyAppearsInLogs() {
        // Given
        let action = VoiceAction(
            type: .logWater,
            details: VoiceAction.ActionDetails(
                item: nil,
                amount: "16",
                unit: "oz",
                severity: nil,
                mealType: nil,
                symptoms: nil,
                vitaminName: nil,
                notes: nil
            ),
            confidence: 0.95
        )
        
        // When
        voiceLogManager.executeVoiceActions([action])
        
        // Then
        XCTAssertEqual(logsManager.logEntries.count, 1, "Should have exactly one log entry")
        
        let entry = logsManager.logEntries.first!
        XCTAssertEqual(entry.type, .water)
        XCTAssertEqual(entry.source, .voice)
        XCTAssertEqual(entry.amount, "16 oz")
    }
    
    // MARK: - Test Food Logging with Immediate Persistence
    
    func testFoodLoggingCreatesImmediateEntry() {
        // Given
        let action = VoiceAction(
            type: .logFood,
            details: VoiceAction.ActionDetails(
                item: "chicken breast",
                amount: nil,
                unit: nil,
                severity: nil,
                mealType: "lunch",
                symptoms: nil,
                vitaminName: nil,
                notes: nil
            ),
            confidence: 0.90
        )
        
        // When
        voiceLogManager.executeVoiceActions([action])
        
        // Then
        XCTAssertEqual(logsManager.logEntries.count, 1, "Should create entry immediately")
        
        let entry = logsManager.logEntries.first!
        XCTAssertEqual(entry.type, .food)
        XCTAssertEqual(entry.source, .voice)
        XCTAssertEqual(entry.foodName, "chicken breast")
        XCTAssertEqual(entry.notes, "Processing nutrition data...")
        XCTAssertEqual(entry.calories, 0, "Should have placeholder calories")
    }
    
    // MARK: - Test Supplement Logging
    
    func testSupplementLoggingMarksSupplementAsTaken() {
        // Given - Add a test supplement
        let supplement = Supplement(
            name: "Prenatal Vitamin",
            dosage: "1 tablet",
            frequency: .daily,
            reminderTimes: [Date()],
            remindersEnabled: true
        )
        supplementManager.addSupplement(supplement)
        
        let action = VoiceAction(
            type: .logVitamin,
            details: VoiceAction.ActionDetails(
                item: nil,
                amount: nil,
                unit: nil,
                severity: nil,
                mealType: nil,
                symptoms: nil,
                vitaminName: "prenatal",
                notes: nil
            ),
            confidence: 0.88
        )
        
        // When
        voiceLogManager.executeVoiceActions([action])
        
        // Then
        let todaysIntake = supplementManager.getTodaysIntake()
        XCTAssertEqual(todaysIntake.count, 1)
        XCTAssertTrue(todaysIntake.first?.taken ?? false, "Supplement should be marked as taken")
    }
    
    // MARK: - Test Multiple Actions
    
    func testMultipleActionsAllGetProcessed() {
        // Given
        let actions = [
            VoiceAction(
                type: .logWater,
                details: VoiceAction.ActionDetails(
                    item: nil,
                    amount: "8",
                    unit: "oz",
                    severity: nil,
                    mealType: nil,
                    symptoms: nil,
                    vitaminName: nil,
                    notes: nil
                ),
                confidence: 0.95
            ),
            VoiceAction(
                type: .logFood,
                details: VoiceAction.ActionDetails(
                    item: "apple",
                    amount: nil,
                    unit: nil,
                    severity: nil,
                    mealType: "snack",
                    symptoms: nil,
                    vitaminName: nil,
                    notes: nil
                ),
                confidence: 0.92
            ),
            VoiceAction(
                type: .logFood,
                details: VoiceAction.ActionDetails(
                    item: "sandwich",
                    amount: nil,
                    unit: nil,
                    severity: nil,
                    mealType: "lunch",
                    symptoms: nil,
                    vitaminName: nil,
                    notes: nil
                ),
                confidence: 0.89
            )
        ]
        
        // When
        voiceLogManager.executeVoiceActions(actions)
        
        // Then
        XCTAssertEqual(logsManager.logEntries.count, 3, "Should have all three entries")
        
        let waterEntries = logsManager.logEntries.filter { $0.type == .water }
        let foodEntries = logsManager.logEntries.filter { $0.type == .food }
        
        XCTAssertEqual(waterEntries.count, 1, "Should have one water entry")
        XCTAssertEqual(foodEntries.count, 2, "Should have two food entries")
        
        let foodNames = foodEntries.compactMap { $0.foodName }
        XCTAssertTrue(foodNames.contains("apple"), "Should have apple entry")
        XCTAssertTrue(foodNames.contains("sandwich"), "Should have sandwich entry")
    }
    
    // MARK: - Test Dashboard Calculations
    
    func testDashboardShowsCorrectTotals() {
        // Given - Add various log entries
        logsManager.logWater(amount: 8, unit: "oz")
        logsManager.logWater(amount: 12, unit: "oz")
        
        logsManager.logFood(
            notes: "Test",
            source: .voice,
            foodName: "chicken",
            calories: 200,
            protein: 30,
            carbs: 0,
            fat: 8
        )
        
        logsManager.logFood(
            notes: "Test",
            source: .voice,
            foodName: "rice",
            calories: 150,
            protein: 3,
            carbs: 35,
            fat: 1
        )
        
        // When - Calculate totals
        let todayLogs = logsManager.getTodayLogs()
        let waterCount = logsManager.getTodayWaterCount()
        let foodCount = logsManager.getTodayFoodCount()
        
        var totalCalories = 0
        var totalProtein = 0
        var totalCarbs = 0
        var totalFat = 0
        
        for log in todayLogs where log.type == .food {
            totalCalories += log.calories ?? 0
            totalProtein += log.protein ?? 0
            totalCarbs += log.carbs ?? 0
            totalFat += log.fat ?? 0
        }
        
        // Then
        XCTAssertEqual(waterCount, 2, "Should have 2 water entries")
        XCTAssertEqual(foodCount, 2, "Should have 2 food entries")
        XCTAssertEqual(totalCalories, 350, "Should have 350 total calories")
        XCTAssertEqual(totalProtein, 33, "Should have 33g total protein")
        XCTAssertEqual(totalCarbs, 35, "Should have 35g total carbs")
        XCTAssertEqual(totalFat, 9, "Should have 9g total fat")
    }
    
    // MARK: - Test Persistence
    
    func testLogsPersistAcrossSessions() {
        // Given - Add logs
        logsManager.logWater(amount: 16, unit: "oz")
        logsManager.logFood(
            notes: "Test",
            source: .voice,
            foodName: "test food",
            calories: 100
        )
        
        let originalCount = logsManager.logEntries.count
        
        // When - Create new manager (simulating app restart)
        let newLogsManager = LogsManager(notificationManager: notificationManager)
        
        // Then
        XCTAssertEqual(newLogsManager.logEntries.count, originalCount, "Logs should persist")
        XCTAssertEqual(newLogsManager.getTodayWaterCount(), 1)
        XCTAssertEqual(newLogsManager.getTodayFoodCount(), 1)
    }
    
    // MARK: - Test Voice Log Storage
    
    func testVoiceLogsAreStoredWithTranscription() {
        // Given
        let voiceLog = VoiceLog(
            duration: 3.5,
            category: .food,
            fileName: "test_audio.m4a"
        )
        
        // When
        voiceLogManager.voiceLogs.append(voiceLog)
        voiceLogManager.saveLogs()
        
        // Create new manager to test persistence
        let newVoiceManager = VoiceLogManager.makeForTesting()
        
        // Then
        XCTAssertEqual(newVoiceManager.voiceLogs.count, 1)
        XCTAssertEqual(newVoiceManager.voiceLogs.first?.category, .food)
        XCTAssertEqual(newVoiceManager.voiceLogs.first?.duration, 3.5)
    }
    
    // MARK: - Test Empty/Nil Handling
    
    func testHandlesNilAndEmptyValues() {
        // Given - Action with minimal data
        let action = VoiceAction(
            type: .logFood,
            details: VoiceAction.ActionDetails(
                item: "",  // Empty food name
                amount: nil,
                unit: nil,
                severity: nil,
                mealType: nil,
                symptoms: nil,
                vitaminName: nil,
                notes: nil
            ),
            confidence: 0.5
        )
        
        // When
        voiceLogManager.executeVoiceActions([action])
        
        // Then - Should handle gracefully
        let foodEntries = logsManager.logEntries.filter { $0.type == .food }
        if !foodEntries.isEmpty {
            XCTAssertEqual(foodEntries.first?.foodName, "", "Should handle empty food name")
        }
    }
}