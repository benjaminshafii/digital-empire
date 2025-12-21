import Foundation
import SwiftUI

struct BackupData: Codable {
    let version: Int
    let exportDate: Date
    let logs: [LogEntry]
    let supplements: [Supplement]
    let voiceLogs: [VoiceLog]
    let settings: UserSettings
    
    struct UserSettings: Codable {
        let openAIKey: String?
        let notificationSettings: NotificationSettings
        
        struct NotificationSettings: Codable {
            let startHour: Int
            let endHour: Int
            let eatingInterval: Double
            let drinkingInterval: Double
            let eatingEnabled: Bool
            let drinkingEnabled: Bool
        }
    }
    
    static let currentVersion = 1
}

class DataBackupManager: ObservableObject {
    @Published var isExporting = false
    @Published var isImporting = false
    @Published var lastBackupDate: Date?
    @Published var lastError: String?
    
    private let backupVersionKey = "BackupDataVersion"
    private let lastBackupDateKey = "LastBackupDate"
    
    init() {
        lastBackupDate = UserDefaults.standard.object(forKey: lastBackupDateKey) as? Date
    }
    
    func createBackup(logsManager: LogsManager, supplementManager: SupplementManager, notificationManager: NotificationManager) -> BackupData {
        let settings = BackupData.UserSettings(
            openAIKey: nil,
            notificationSettings: BackupData.UserSettings.NotificationSettings(
                startHour: notificationManager.startHour,
                endHour: notificationManager.endHour,
                eatingInterval: notificationManager.eatingInterval,
                drinkingInterval: notificationManager.drinkingInterval,
                eatingEnabled: notificationManager.eatingEnabled,
                drinkingEnabled: notificationManager.drinkingEnabled
            )
        )
        
        return BackupData(
            version: BackupData.currentVersion,
            exportDate: Date(),
            logs: logsManager.logEntries,
            supplements: supplementManager.supplements,
            voiceLogs: VoiceLogManager.shared.voiceLogs,
            settings: settings
        )
    }
    
    func exportToJSON(logsManager: LogsManager, supplementManager: SupplementManager, notificationManager: NotificationManager) throws -> Data {
        isExporting = true
        defer { isExporting = false }
        
        let backup = createBackup(
            logsManager: logsManager,
            supplementManager: supplementManager,
            notificationManager: notificationManager
        )
        
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
        
        do {
            let data = try encoder.encode(backup)
            
            lastBackupDate = Date()
            UserDefaults.standard.set(lastBackupDate, forKey: lastBackupDateKey)
            
            print("💾 Backup created successfully: \(data.count) bytes")
            return data
        } catch {
            lastError = "Failed to create backup: \(error.localizedDescription)"
            throw error
        }
    }
    
    func importFromJSON(data: Data, logsManager: LogsManager, supplementManager: SupplementManager, notificationManager: NotificationManager) throws {
        isImporting = true
        defer { isImporting = false }
        
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        
        do {
            let backup = try decoder.decode(BackupData.self, from: data)
            
            if backup.version > BackupData.currentVersion {
                throw BackupError.unsupportedVersion(backup.version)
            }
            
            logsManager.logEntries = backup.logs
            logsManager.saveLogs()
            
            supplementManager.supplements.removeAll()
            for supplement in backup.supplements {
                supplementManager.addSupplement(supplement)
            }
            
            VoiceLogManager.shared.voiceLogs = backup.voiceLogs
            
            notificationManager.startHour = backup.settings.notificationSettings.startHour
            notificationManager.endHour = backup.settings.notificationSettings.endHour
            notificationManager.eatingInterval = backup.settings.notificationSettings.eatingInterval
            notificationManager.drinkingInterval = backup.settings.notificationSettings.drinkingInterval
            notificationManager.eatingEnabled = backup.settings.notificationSettings.eatingEnabled
            notificationManager.drinkingEnabled = backup.settings.notificationSettings.drinkingEnabled
            
            print("💾 Backup restored successfully")
            print("💾 Restored \(backup.logs.count) logs, \(backup.supplements.count) supplements")
            
            DispatchQueue.main.async {
                NotificationCenter.default.post(
                    name: NSNotification.Name("DataRestoreCompleted"),
                    object: nil
                )
            }
        } catch {
            lastError = "Failed to restore backup: \(error.localizedDescription)"
            throw error
        }
    }
    
    func getBackupFileName() -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd_HHmm"
        return "Corgina_Backup_\(formatter.string(from: Date())).json"
    }
    
    enum BackupError: LocalizedError {
        case unsupportedVersion(Int)
        case corruptedData
        case importFailed(String)
        
        var errorDescription: String? {
            switch self {
            case .unsupportedVersion(let version):
                return "This backup file is from a newer version of Corgina (v\(version)). Please update the app to restore this backup."
            case .corruptedData:
                return "The backup file is corrupted and cannot be restored."
            case .importFailed(let reason):
                return "Failed to restore backup: \(reason)"
            }
        }
    }
}

extension LogsManager {
    func createJSONExport() -> Data? {
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
        
        do {
            return try encoder.encode(logEntries)
        } catch {
            print("❌ Failed to create JSON export: \(error)")
            return nil
        }
    }
}
