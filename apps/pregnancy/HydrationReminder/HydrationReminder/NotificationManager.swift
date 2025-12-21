import Foundation
import UserNotifications
import Combine

class NotificationManager: ObservableObject {
    @Published var startHour: Int = 7 {
        didSet {
            UserDefaults.standard.set(startHour, forKey: "startHour")
            if eatingEnabled || drinkingEnabled {
                rescheduleAllNotifications()
            }
        }
    }
    
    @Published var endHour: Int = 22 {
        didSet {
            UserDefaults.standard.set(endHour, forKey: "endHour")
            if eatingEnabled || drinkingEnabled {
                rescheduleAllNotifications()
            }
        }
    }
    
    @Published var currentBadgeCount: Int = 0 {
        didSet {
            UserDefaults.standard.set(currentBadgeCount, forKey: "currentBadgeCount")
            UNUserNotificationCenter.current().setBadgeCount(currentBadgeCount)
        }
    }
    
    @Published var pendingEatingCount: Int = 0 {
        didSet {
            UserDefaults.standard.set(pendingEatingCount, forKey: "pendingEatingCount")
        }
    }
    
    @Published var pendingDrinkingCount: Int = 0 {
        didSet {
            UserDefaults.standard.set(pendingDrinkingCount, forKey: "pendingDrinkingCount")
        }
    }
    
    @Published var eatingInterval: Double = 3 {
        didSet {
            UserDefaults.standard.set(eatingInterval, forKey: "eatingInterval")
        }
    }
    
    @Published var drinkingInterval: Double = 1 {
        didSet {
            UserDefaults.standard.set(drinkingInterval, forKey: "drinkingInterval")
        }
    }
    
    @Published var eatingEnabled: Bool = false {
        didSet {
            UserDefaults.standard.set(eatingEnabled, forKey: "eatingEnabled")
        }
    }
    
    @Published var drinkingEnabled: Bool = false {
        didSet {
            UserDefaults.standard.set(drinkingEnabled, forKey: "drinkingEnabled")
        }
    }
    
    @Published var lastEatingTime: Date? {
        didSet {
            if let date = lastEatingTime {
                UserDefaults.standard.set(date, forKey: "lastEatingTime")
            }
        }
    }
    
    @Published var lastDrinkingTime: Date? {
        didSet {
            if let date = lastDrinkingTime {
                UserDefaults.standard.set(date, forKey: "lastDrinkingTime")
            }
        }
    }
    
    @Published var nextEatingNotification: Date?
    @Published var nextDrinkingNotification: Date?

    // Calorie reminder settings
    @Published var calorieRemindersEnabled: Bool = false {
        didSet {
            UserDefaults.standard.set(calorieRemindersEnabled, forKey: "calorieRemindersEnabled")
            if calorieRemindersEnabled {
                scheduleEveningCalorieCheck()
            } else {
                cancelCalorieNotifications()
            }
        }
    }

    @Published var lowCalorieCheckTime: Date = {
        let calendar = Calendar.current
        var components = calendar.dateComponents([.year, .month, .day], from: Date())
        components.hour = 18
        components.minute = 0
        return calendar.date(from: components) ?? Date()
    }() {
        didSet {
            UserDefaults.standard.set(lowCalorieCheckTime, forKey: "lowCalorieCheckTime")
            if calorieRemindersEnabled {
                scheduleEveningCalorieCheck()
            }
        }
    }

    private var lastLowCalorieNotificationDate: Date?
    private var lastHighCalorieNotificationDate: Date?

    private var lastScheduledEatingTime: Date?
    private var lastScheduledDrinkingTime: Date?
    private var timer: Timer?
    
    init() {
        startHour = UserDefaults.standard.object(forKey: "startHour") as? Int ?? 7
        endHour = UserDefaults.standard.object(forKey: "endHour") as? Int ?? 22
        eatingInterval = UserDefaults.standard.object(forKey: "eatingInterval") as? Double ?? 3
        drinkingInterval = UserDefaults.standard.object(forKey: "drinkingInterval") as? Double ?? 1
        eatingEnabled = UserDefaults.standard.bool(forKey: "eatingEnabled")
        drinkingEnabled = UserDefaults.standard.bool(forKey: "drinkingEnabled")
        currentBadgeCount = UserDefaults.standard.object(forKey: "currentBadgeCount") as? Int ?? 0
        pendingEatingCount = UserDefaults.standard.object(forKey: "pendingEatingCount") as? Int ?? 0
        pendingDrinkingCount = UserDefaults.standard.object(forKey: "pendingDrinkingCount") as? Int ?? 0
        calorieRemindersEnabled = UserDefaults.standard.bool(forKey: "calorieRemindersEnabled")

        if let savedCheckTime = UserDefaults.standard.object(forKey: "lowCalorieCheckTime") as? Date {
            lowCalorieCheckTime = savedCheckTime
        }
        
        if let eatingDate = UserDefaults.standard.object(forKey: "lastEatingTime") as? Date {
            lastEatingTime = eatingDate
        }
        if let drinkingDate = UserDefaults.standard.object(forKey: "lastDrinkingTime") as? Date {
            lastDrinkingTime = drinkingDate
        }
        
        updateNextNotificationTimes()
        startTimer()
        setupNotificationCategories()
        checkAndResetDailyBadge()
        
        verifyAndSyncBadgeCount()
    }
    
    func verifyAndSyncBadgeCount() {
        UNUserNotificationCenter.current().getDeliveredNotifications { notifications in
            let deliveredCount = notifications.filter { notification in
                let type = notification.request.content.userInfo["type"] as? String
                return type == "eating" || type == "drinking"
            }.count
            
            DispatchQueue.main.async {
                if deliveredCount != self.currentBadgeCount {
                    print("🔔 Badge count mismatch: stored=\(self.currentBadgeCount), actual=\(deliveredCount)")
                    print("🔔 Syncing badge count to match delivered notifications")
                    self.currentBadgeCount = deliveredCount
                }
                
                UNUserNotificationCenter.current().setBadgeCount(self.currentBadgeCount)
            }
        }
    }
    
    func startTimer() {
        timer?.invalidate()
        timer = Timer.scheduledTimer(withTimeInterval: 60, repeats: true) { _ in
            // Only update the display times, don't reschedule notifications
            self.updateNextNotificationTimes()
        }
    }
    
    func requestPermission() {
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .badge, .sound]) { success, error in
            if success {
                print("Notification permission granted")
            } else if let error = error {
                print("Error: \(error.localizedDescription)")
            }
        }
    }
    
    func logEating() {
        lastEatingTime = Date()
        cancelEatingNotifications()
        lastScheduledEatingTime = nil  // Reset so we can schedule new notification
        if pendingEatingCount > 0 {
            pendingEatingCount = 0
        }
        updateBadgeCount()
        updateNextNotificationTimes()  // Update UI first
        if eatingEnabled {
            scheduleNextEatingNotification()  // Then schedule
        }
    }
    
    func logDrinking() {
        lastDrinkingTime = Date()
        cancelDrinkingNotifications()
        lastScheduledDrinkingTime = nil  // Reset so we can schedule new notification
        if pendingDrinkingCount > 0 {
            pendingDrinkingCount = 0
        }
        updateBadgeCount()
        updateNextNotificationTimes()  // Update UI first
        if drinkingEnabled {
            scheduleNextDrinkingNotification()  // Then schedule
        }
    }
    
    func resetForNextDay() {
        lastEatingTime = nil
        lastDrinkingTime = nil
        UserDefaults.standard.removeObject(forKey: "lastEatingTime")
        UserDefaults.standard.removeObject(forKey: "lastDrinkingTime")
        pendingEatingCount = 0
        pendingDrinkingCount = 0
        currentBadgeCount = 0
        lastScheduledEatingTime = nil
        lastScheduledDrinkingTime = nil
        cancelAllNotifications()  // Clear everything first
        updateNextNotificationTimes()  // Update UI
        // Then reschedule based on new day
        if eatingEnabled {
            scheduleNextEatingNotification()
        }
        if drinkingEnabled {
            scheduleNextDrinkingNotification()
        }
    }
    
    private func getNextScheduledTime(from baseTime: Date, interval: Double) -> Date {
        return baseTime.addingTimeInterval(interval * 3600)
    }
    
    private func getTodayStartTime() -> Date {
        let calendar = Calendar.current
        let now = Date()
        var components = calendar.dateComponents([.year, .month, .day], from: now)
        components.hour = startHour
        components.minute = 0
        components.second = 0
        return calendar.date(from: components) ?? now
    }
    
    private func updateNextNotificationTimes() {
        let now = Date()
        let todayStart = getTodayStartTime()
        let todayEnd = getTodayEndTime()
        
        if eatingEnabled {
            if let lastEating = lastEatingTime {
                // Always calculate from last eating time
                var nextTime = getNextScheduledTime(from: lastEating, interval: eatingInterval)
                
                // Only adjust if the calculated time is in the past (shouldn't happen)
                if nextTime <= now {
                    nextTime = getNextScheduledTime(from: now, interval: eatingInterval)
                }
                
                // Skip to next day start if in night time
                if isInNightTime(nextTime) {
                    nextTime = getNextDayStartTime()
                }
                nextEatingNotification = nextTime
            } else if now < todayStart {
                nextEatingNotification = todayStart
            } else if now >= todayEnd {
                nextEatingNotification = getNextDayStartTime()
            } else {
                // First notification of the day - schedule from now, not from pattern
                var nextTime = now.addingTimeInterval(eatingInterval * 3600)
                if nextTime >= todayEnd {
                    nextTime = getNextDayStartTime()
                }
                nextEatingNotification = nextTime
            }
        } else {
            nextEatingNotification = nil
        }
        
        if drinkingEnabled {
            if let lastDrinking = lastDrinkingTime {
                // Always calculate from last drinking time
                var nextTime = getNextScheduledTime(from: lastDrinking, interval: drinkingInterval)
                
                // Only adjust if the calculated time is in the past (shouldn't happen)
                if nextTime <= now {
                    nextTime = getNextScheduledTime(from: now, interval: drinkingInterval)
                }
                
                // Skip to next day start if in night time
                if isInNightTime(nextTime) {
                    nextTime = getNextDayStartTime()
                }
                nextDrinkingNotification = nextTime
            } else if now < todayStart {
                nextDrinkingNotification = todayStart
            } else if now >= todayEnd {
                nextDrinkingNotification = getNextDayStartTime()
            } else {
                // First notification of the day - schedule from now, not from pattern
                var nextTime = now.addingTimeInterval(drinkingInterval * 3600)
                if nextTime >= todayEnd {
                    nextTime = getNextDayStartTime()
                }
                nextDrinkingNotification = nextTime
            }
        } else {
            nextDrinkingNotification = nil
        }
    }
    
    func scheduleNextEatingNotification() {
        cancelEatingNotifications()
        
        guard let nextTime = nextEatingNotification else { return }
        let timeInterval = nextTime.timeIntervalSinceNow
        
        // Only schedule if it's actually in the future
        guard timeInterval > 0 else {
            print("Skipping eating notification - time is in the past")
            return
        }
        
        checkPermission { status in
            guard status == .authorized || status == .provisional else {
                print("⚠️ Notifications not authorized - cannot schedule")
                DispatchQueue.main.async {
                    NotificationCenter.default.post(
                        name: NSNotification.Name("NotificationPermissionDenied"),
                        object: nil
                    )
                }
                return
            }
            
            let content = UNMutableNotificationContent()
            content.title = "Time to Eat! 🍽️"
            content.body = "It's been \(self.formatHours(self.eatingInterval)). Time for a healthy meal! Tap to log your meal."
            content.sound = .default
            content.badge = NSNumber(value: self.currentBadgeCount + 1)
            content.categoryIdentifier = "EATING_REMINDER"
            content.userInfo = ["type": "eating"]
            
            // Add eating notification image attachment
            if let imagePath = Bundle.main.path(forResource: "eating_notification", ofType: "png"),
               let imageUrl = URL(fileURLWithPath: imagePath) as URL? {
                do {
                    let attachment = try UNNotificationAttachment(identifier: "eating", url: imageUrl, options: nil)
                    content.attachments = [attachment]
                } catch {
                    print("Error adding image attachment: \(error)")
                }
            }
            
            // Check if we already scheduled for this exact time
            if let lastScheduled = self.lastScheduledEatingTime,
               abs(lastScheduled.timeIntervalSince(nextTime)) < 60 {
                print("Eating notification already scheduled for \(nextTime), skipping duplicate")
                return
            }
            
            let trigger = UNTimeIntervalNotificationTrigger(timeInterval: timeInterval, repeats: false)
            let request = UNNotificationRequest(identifier: "eating_reminder", content: content, trigger: trigger)
            
            UNUserNotificationCenter.current().add(request) { error in
                if let error = error {
                    print("❌ Error scheduling eating notification: \(error)")
                    DispatchQueue.main.async {
                        NotificationCenter.default.post(
                            name: NSNotification.Name("NotificationScheduleError"),
                            object: nil,
                            userInfo: ["error": error.localizedDescription, "type": "eating"]
                        )
                    }
                } else {
                    print("✅ Eating notification scheduled for \(nextTime)")
                    self.lastScheduledEatingTime = nextTime
                    
                    self.verifyNotificationScheduled(identifier: "eating_reminder")
                }
            }
        }
    }
    
    private func verifyNotificationScheduled(identifier: String) {
        UNUserNotificationCenter.current().getPendingNotificationRequests { requests in
            let found = requests.contains { $0.identifier == identifier }
            if found {
                print("✅ Verified notification '\(identifier)' is scheduled")
            } else {
                print("⚠️ Notification '\(identifier)' not found in pending requests")
            }
        }
    }
    
    func scheduleNextDrinkingNotification() {
        cancelDrinkingNotifications()
        
        guard let nextTime = nextDrinkingNotification else { return }
        let timeInterval = nextTime.timeIntervalSinceNow
        
        // Only schedule if it's actually in the future
        guard timeInterval > 0 else {
            print("Skipping drinking notification - time is in the past")
            return
        }
        
        checkPermission { status in
            guard status == .authorized || status == .provisional else {
                print("⚠️ Notifications not authorized - cannot schedule")
                return
            }
            
            let content = UNMutableNotificationContent()
            content.title = "Hydration Time! 💧"
            content.body = "It's been \(self.formatHours(self.drinkingInterval)). Time to drink some water! Tap to log your drink."
            content.sound = .default
            content.badge = NSNumber(value: self.currentBadgeCount + 1)
            content.categoryIdentifier = "DRINKING_REMINDER"
            content.userInfo = ["type": "drinking"]
            
            // Add drinking notification image attachment
            if let imagePath = Bundle.main.path(forResource: "drinking_notification", ofType: "png"),
               let imageUrl = URL(fileURLWithPath: imagePath) as URL? {
                do {
                    let attachment = try UNNotificationAttachment(identifier: "drinking", url: imageUrl, options: nil)
                    content.attachments = [attachment]
                } catch {
                    print("Error adding image attachment: \(error)")
                }
            }
            
            // Check if we already scheduled for this exact time
            if let lastScheduled = self.lastScheduledDrinkingTime,
               abs(lastScheduled.timeIntervalSince(nextTime)) < 60 {
                print("Drinking notification already scheduled for \(nextTime), skipping duplicate")
                return
            }
            
            let trigger = UNTimeIntervalNotificationTrigger(timeInterval: timeInterval, repeats: false)
            let request = UNNotificationRequest(identifier: "drinking_reminder", content: content, trigger: trigger)
            
            UNUserNotificationCenter.current().add(request) { error in
                if let error = error {
                    print("❌ Error scheduling drinking notification: \(error)")
                    DispatchQueue.main.async {
                        NotificationCenter.default.post(
                            name: NSNotification.Name("NotificationScheduleError"),
                            object: nil,
                            userInfo: ["error": error.localizedDescription, "type": "drinking"]
                        )
                    }
                } else {
                    print("✅ Drinking notification scheduled for \(nextTime)")
                    self.lastScheduledDrinkingTime = nextTime
                    
                    self.verifyNotificationScheduled(identifier: "drinking_reminder")
                }
            }
        }
    }
    
    func rescheduleAllNotifications() {
        updateNextNotificationTimes()
        if eatingEnabled {
            scheduleNextEatingNotification()
        }
        if drinkingEnabled {
            scheduleNextDrinkingNotification()
        }
    }
    
    func enableEatingReminders() {
        eatingEnabled = true
        updateNextNotificationTimes()
        scheduleNextEatingNotification()
    }
    
    func enableDrinkingReminders() {
        drinkingEnabled = true
        updateNextNotificationTimes()
        scheduleNextDrinkingNotification()
    }
    
    func disableEatingReminders() {
        eatingEnabled = false
        cancelEatingNotifications()
        nextEatingNotification = nil
        lastScheduledEatingTime = nil
    }
    
    func disableDrinkingReminders() {
        drinkingEnabled = false
        cancelDrinkingNotifications()
        nextDrinkingNotification = nil
        lastScheduledDrinkingTime = nil
    }
    
    func cancelEatingNotifications() {
        UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: ["eating_reminder"])
        print("Eating notifications cancelled")
    }
    
    func cancelDrinkingNotifications() {
        UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: ["drinking_reminder"])
        print("Drinking notifications cancelled")
    }
    
    func cancelAllNotifications() {
        UNUserNotificationCenter.current().removeAllPendingNotificationRequests()
        print("All notifications cancelled")
    }
    
    func sendTestEatingNotification() {
        let content = UNMutableNotificationContent()
        content.title = "🧪 TEST: Time to Eat! 🍽️"
        content.body = "This is a test eating reminder - notifications are working!"
        content.sound = .default
        content.badge = 0  // Don't change badge for test notifications
        content.categoryIdentifier = "EATING_REMINDER"
        content.interruptionLevel = .timeSensitive
        
        // Add eating notification image attachment
        if let imagePath = Bundle.main.path(forResource: "eating_notification", ofType: "png"),
           let imageUrl = URL(fileURLWithPath: imagePath) as URL? {
            do {
                let attachment = try UNNotificationAttachment(identifier: "eating", url: imageUrl, options: nil)
                content.attachments = [attachment]
            } catch {
                print("Error adding image attachment: \(error)")
            }
        }
        
        let trigger = UNTimeIntervalNotificationTrigger(timeInterval: 5, repeats: false)
        let request = UNNotificationRequest(identifier: UUID().uuidString, content: content, trigger: trigger)
        
        UNUserNotificationCenter.current().add(request) { error in
            if let error = error {
                print("Error sending test eating notification: \(error)")
            } else {
                print("Test eating notification scheduled for 5 seconds")
            }
        }
    }
    
    func sendTestDrinkingNotification() {
        let content = UNMutableNotificationContent()
        content.title = "🧪 TEST: Hydration Time! 💧"
        content.body = "This is a test water reminder - notifications are working!"
        content.sound = .default
        content.badge = 0  // Don't change badge for test notifications
        content.categoryIdentifier = "DRINKING_REMINDER"
        content.interruptionLevel = .timeSensitive
        
        // Add drinking notification image attachment
        if let imagePath = Bundle.main.path(forResource: "drinking_notification", ofType: "png"),
           let imageUrl = URL(fileURLWithPath: imagePath) as URL? {
            do {
                let attachment = try UNNotificationAttachment(identifier: "drinking", url: imageUrl, options: nil)
                content.attachments = [attachment]
            } catch {
                print("Error adding image attachment: \(error)")
            }
        }
        
        let trigger = UNTimeIntervalNotificationTrigger(timeInterval: 5, repeats: false)
        let request = UNNotificationRequest(identifier: UUID().uuidString, content: content, trigger: trigger)
        
        UNUserNotificationCenter.current().add(request) { error in
            if let error = error {
                print("Error sending test drinking notification: \(error)")
            } else {
                print("Test drinking notification scheduled for 5 seconds")
            }
        }
    }
    
    func checkPermission(completion: @escaping (UNAuthorizationStatus) -> Void) {
        UNUserNotificationCenter.current().getNotificationSettings { settings in
            DispatchQueue.main.async {
                completion(settings.authorizationStatus)
            }
        }
    }
    
    func checkPermissionAndSendTest(type: String, completion: @escaping (UNAuthorizationStatus) -> Void) {
        UNUserNotificationCenter.current().getNotificationSettings { settings in
            DispatchQueue.main.async {
                switch settings.authorizationStatus {
                case .authorized:
                    if type == "eating" {
                        self.sendTestEatingNotification()
                    } else {
                        self.sendTestDrinkingNotification()
                    }
                    completion(.authorized)
                case .denied:
                    completion(.denied)
                case .notDetermined:
                    completion(.notDetermined)
                case .provisional:
                    if type == "eating" {
                        self.sendTestEatingNotification()
                    } else {
                        self.sendTestDrinkingNotification()
                    }
                    completion(.authorized)
                case .ephemeral:
                    completion(.denied)
                @unknown default:
                    completion(.denied)
                }
            }
        }
    }
    
    private func formatHours(_ hours: Double) -> String {
        if hours == 1.0 {
            return "1 hour"
        } else if hours < 1.0 {
            let minutes = Int(hours * 60)
            return "\(minutes) minutes"
        } else if hours.truncatingRemainder(dividingBy: 1) == 0 {
            return "\(Int(hours)) hours"
        } else {
            return String(format: "%.1f hours", hours)
        }
    }
    
    private func getTodayEndTime() -> Date {
        let calendar = Calendar.current
        let now = Date()
        var components = calendar.dateComponents([.year, .month, .day], from: now)
        components.hour = endHour
        components.minute = 0
        components.second = 0
        return calendar.date(from: components) ?? now
    }
    
    private func getNextDayStartTime() -> Date {
        let calendar = Calendar.current
        let tomorrow = calendar.date(byAdding: .day, value: 1, to: Date()) ?? Date()
        var components = calendar.dateComponents([.year, .month, .day], from: tomorrow)
        components.hour = startHour
        components.minute = 0
        components.second = 0
        return calendar.date(from: components) ?? tomorrow
    }
    
    private func isInNightTime(_ date: Date) -> Bool {
        let calendar = Calendar.current
        let hour = calendar.component(.hour, from: date)
        
        if endHour > startHour {
            // Normal case: e.g., 7am to 10pm
            return hour >= endHour || hour < startHour
        } else {
            // Overnight case: e.g., 7am to 2am next day
            return hour >= endHour && hour < startHour
        }
    }
    
    func updateBadgeCount() {
        let newCount = pendingEatingCount + pendingDrinkingCount
        
        if newCount != currentBadgeCount {
            print("🔔 Updating badge count: \(currentBadgeCount) -> \(newCount)")
            currentBadgeCount = newCount
            UNUserNotificationCenter.current().setBadgeCount(currentBadgeCount)
        }
    }
    
    func incrementEatingBadge() {
        pendingEatingCount += 1
        updateBadgeCount()
    }
    
    func incrementDrinkingBadge() {
        pendingDrinkingCount += 1
        updateBadgeCount()
    }
    
    func clearBadge() {
        print("🔔 Clearing all badge counts")
        pendingEatingCount = 0
        pendingDrinkingCount = 0
        currentBadgeCount = 0
        UNUserNotificationCenter.current().setBadgeCount(0)
        
        UNUserNotificationCenter.current().removeAllDeliveredNotifications()
    }
    
    private func setupNotificationCategories() {
        let logEatingAction = UNNotificationAction(
            identifier: "LOG_EATING",
            title: "Log Meal",
            options: [.foreground]
        )

        let logDrinkingAction = UNNotificationAction(
            identifier: "LOG_DRINKING",
            title: "Log Drink",
            options: [.foreground]
        )

        let eatingCategory = UNNotificationCategory(
            identifier: "EATING_REMINDER",
            actions: [logEatingAction],
            intentIdentifiers: [],
            options: []
        )

        let drinkingCategory = UNNotificationCategory(
            identifier: "DRINKING_REMINDER",
            actions: [logDrinkingAction],
            intentIdentifiers: [],
            options: []
        )

        // Calorie reminder categories
        let calorieLowCategory = UNNotificationCategory(
            identifier: "CALORIE_LOW_REMINDER",
            actions: [],
            intentIdentifiers: [],
            options: []
        )

        let calorieHighCategory = UNNotificationCategory(
            identifier: "CALORIE_HIGH_NOTICE",
            actions: [],
            intentIdentifiers: [],
            options: []
        )

        UNUserNotificationCenter.current().setNotificationCategories([
            eatingCategory,
            drinkingCategory,
            calorieLowCategory,
            calorieHighCategory
        ])
    }
    
    func checkAndResetDailyBadge() {
        let calendar = Calendar.current
        let now = Date()
        let lastResetKey = "lastBadgeResetDate"

        if let lastResetDate = UserDefaults.standard.object(forKey: lastResetKey) as? Date {
            if !calendar.isDateInToday(lastResetDate) {
                // It's a new day, reset the badge
                clearBadge()
                UserDefaults.standard.set(now, forKey: lastResetKey)
            }
        } else {
            // First time, set the date
            UserDefaults.standard.set(now, forKey: lastResetKey)
        }
    }

    // MARK: - Calorie Notifications

    /// Schedule the evening low calorie check notification
    func scheduleEveningCalorieCheck() {
        guard calorieRemindersEnabled else { return }

        // Cancel existing
        UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: ["calorie_evening_check"])

        let calendar = Calendar.current
        let now = Date()

        // Get the check time components (hour and minute only)
        let checkTimeComponents = calendar.dateComponents([.hour, .minute], from: lowCalorieCheckTime)

        // Create date components for today at the check time
        var components = calendar.dateComponents([.year, .month, .day], from: now)
        components.hour = checkTimeComponents.hour
        components.minute = checkTimeComponents.minute
        components.second = 0

        guard let scheduledTime = calendar.date(from: components) else { return }

        // If the time has already passed today, schedule for tomorrow
        let targetTime: Date
        if scheduledTime <= now {
            targetTime = calendar.date(byAdding: .day, value: 1, to: scheduledTime) ?? scheduledTime
        } else {
            targetTime = scheduledTime
        }

        // Schedule daily repeating notification
        var dateComponents = calendar.dateComponents([.hour, .minute], from: targetTime)
        dateComponents.second = 0

        let trigger = UNCalendarNotificationTrigger(dateMatching: dateComponents, repeats: true)

        // Note: The actual content will be determined when triggered based on actual intake
        // For now, we'll use a placeholder that prompts the user to check the app
        let content = UNMutableNotificationContent()
        content.title = "Daily Nutrition Check"
        content.body = "Open the app to see your calorie intake for today."
        content.categoryIdentifier = "CALORIE_LOW_REMINDER"
        content.sound = .default

        let request = UNNotificationRequest(
            identifier: "calorie_evening_check",
            content: content,
            trigger: trigger
        )

        UNUserNotificationCenter.current().add(request) { error in
            if let error = error {
                print("❌ Error scheduling calorie check: \(error)")
            } else {
                print("✅ Scheduled daily calorie check for \(checkTimeComponents.hour ?? 18):\(String(format: "%02d", checkTimeComponents.minute ?? 0))")
            }
        }
    }

    /// Check if current calorie intake exceeds the high threshold and send notification if needed
    /// - Parameters:
    ///   - currentCalories: Total calories consumed today
    ///   - range: The recommended calorie range for current trimester
    func checkCalorieThreshold(currentCalories: Int, range: CalorieRange) {
        guard calorieRemindersEnabled else { return }

        // Check if already notified today
        if let lastNotification = lastHighCalorieNotificationDate,
           Calendar.current.isDateInToday(lastNotification) {
            return // Already notified today
        }

        // Check if over threshold (110% of maximum)
        let threshold = Int(Double(range.maximum) * 1.1)
        guard currentCalories > threshold else { return }

        // Send notification
        let content = UNMutableNotificationContent()
        content.title = "Calorie Awareness"
        content.body = "You've reached \(currentCalories) calories today. Your recommended range is \(range.minimum)-\(range.maximum) cal. Listen to your body and focus on nutrient-dense choices."
        content.categoryIdentifier = "CALORIE_HIGH_NOTICE"
        content.sound = nil // Silent notification

        let request = UNNotificationRequest(
            identifier: "calorie_high_\(Date().timeIntervalSince1970)",
            content: content,
            trigger: nil // Immediate
        )

        UNUserNotificationCenter.current().add(request) { error in
            if error == nil {
                self.lastHighCalorieNotificationDate = Date()
                print("✅ Sent high calorie notice: \(currentCalories) cal (threshold: \(threshold))")
            } else {
                print("❌ Error sending high calorie notice: \(error?.localizedDescription ?? "unknown")")
            }
        }
    }

    /// Send a low calorie reminder notification
    /// - Parameters:
    ///   - currentCalories: Total calories consumed today
    ///   - range: The recommended calorie range for current trimester
    func sendLowCalorieReminder(currentCalories: Int, range: CalorieRange) {
        guard calorieRemindersEnabled else { return }

        // Check if already notified today
        if let lastNotification = lastLowCalorieNotificationDate,
           Calendar.current.isDateInToday(lastNotification) {
            return // Already notified today
        }

        // Check if below threshold (70% of minimum)
        let threshold = Int(Double(range.minimum) * 0.7)
        guard currentCalories < threshold else { return }

        let content = UNMutableNotificationContent()
        content.title = "Nutrition Check-In"
        content.body = "You've consumed \(currentCalories) calories today. Your recommended range is \(range.minimum)-\(range.maximum) cal. Consider having a nutritious snack or meal."
        content.sound = .default
        content.categoryIdentifier = "CALORIE_LOW_REMINDER"

        let request = UNNotificationRequest(
            identifier: "calorie_low_\(Date().timeIntervalSince1970)",
            content: content,
            trigger: nil // Immediate
        )

        UNUserNotificationCenter.current().add(request) { error in
            if error == nil {
                self.lastLowCalorieNotificationDate = Date()
                print("✅ Sent low calorie reminder: \(currentCalories) cal (threshold: \(threshold))")
            } else {
                print("❌ Error sending low calorie reminder: \(error?.localizedDescription ?? "unknown")")
            }
        }
    }

    /// Cancel all calorie-related notifications
    func cancelCalorieNotifications() {
        UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: ["calorie_evening_check"])
        print("🔔 Cancelled calorie notifications")
    }
}