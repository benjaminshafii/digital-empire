import SwiftUI
import UserNotifications

@main
struct CorginaApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) var appDelegate
    @StateObject private var notificationManager = NotificationManager()
    @StateObject private var logsManager: LogsManager
    
    init() {
        let nm = NotificationManager()
        let lm = LogsManager(notificationManager: nm)
        _notificationManager = StateObject(wrappedValue: nm)
        _logsManager = StateObject(wrappedValue: lm)
        
        // Configure AsyncTaskManager with the shared managers
        Task {
            await AsyncTaskManager.configure(
                logsManager: lm,
                openAIManager: OpenAIManager.shared
            )
            
            // Process any pending tasks
            await AsyncTaskManager.processPending()
        }
    }
    
    var body: some Scene {
        WindowGroup {
            MainTabView()
                .environmentObject(notificationManager)
                .environmentObject(logsManager)
                .onAppear {
                    // Configure AsyncTaskManager when app appears (backup)
                    Task {
                        await AsyncTaskManager.configure(
                            logsManager: logsManager,
                            openAIManager: OpenAIManager.shared
                        )
                        await AsyncTaskManager.processPending()
                    }
                }
        }
    }
}

class AppDelegate: NSObject, UIApplicationDelegate, UNUserNotificationCenterDelegate {
    let notificationManager = NotificationManager()
    let openAIManager = OpenAIManager.shared

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey : Any]? = nil) -> Bool {
        UNUserNotificationCenter.current().delegate = self

        // Don't configure AsyncTaskManager here - it's already configured in CorginaApp.init()
        // with the correct LogsManager instance that the UI observes

        return true
    }
    
    func userNotificationCenter(_ center: UNUserNotificationCenter, willPresent notification: UNNotification, withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
        // Update badge count when notification arrives
        let userInfo = notification.request.content.userInfo
        if let type = userInfo["type"] as? String {
            if type == "eating" {
                notificationManager.incrementEatingBadge()
            } else if type == "drinking" {
                notificationManager.incrementDrinkingBadge()
            }
        }
        completionHandler([.banner, .sound, .badge])
    }
    
    func userNotificationCenter(_ center: UNUserNotificationCenter, didReceive response: UNNotificationResponse, withCompletionHandler completionHandler: @escaping () -> Void) {
        // Handle notification actions
        switch response.actionIdentifier {
        case "LOG_EATING":
            notificationManager.logEating()
        case "LOG_DRINKING":
            notificationManager.logDrinking()
        default:
            break
        }
        completionHandler()
    }
    
    func applicationDidBecomeActive(_ application: UIApplication) {
        // Check and reset daily badge when app becomes active
        notificationManager.checkAndResetDailyBadge()
        
        // Process pending async tasks when app becomes active
        Task {
            await AsyncTaskManager.processPending()
        }
    }
}