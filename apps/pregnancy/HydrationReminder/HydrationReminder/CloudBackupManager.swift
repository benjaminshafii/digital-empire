import Foundation
import CloudKit
import SwiftUI

class CloudBackupManager: ObservableObject {
    static let shared = CloudBackupManager()
    
    @Published var isBackupEnabled = false
    @Published var lastBackupDate: Date?
    @Published var backupStatus: BackupStatus = .idle
    @Published var backupProgress: Double = 0
    @Published var errorMessage: String?
    
    private let container = CKContainer.default()
    private let database: CKDatabase
    private let recordZone = CKRecordZone(zoneName: "PregnancyData")
    private let userDefaultsKey = "CloudBackupEnabled"
    private let lastBackupKey = "LastCloudBackupDate"
    private var isZoneReady = false
    private var zoneSetupTask: Task<Void, Error>?
    
    enum BackupStatus {
        case idle
        case backing
        case restoring
        case error
        case complete
    }
    
    private init() {
        self.database = container.privateCloudDatabase
        loadSettings()
        
        // Only setup CloudKit if explicitly enabled by user
        if isBackupEnabled {
            setupCloudKit()
        }
    }
    
    private func setupCloudKit() {
        zoneSetupTask = Task {
            do {
                let status = try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<CKAccountStatus, Error>) in
                    CKContainer.default().accountStatus { accountStatus, error in
                        if let error = error {
                            continuation.resume(throwing: error)
                        } else {
                            continuation.resume(returning: accountStatus)
                        }
                    }
                }
                
                await MainActor.run {
                    guard status == .available else {
                        if status == .noAccount {
                            self.isBackupEnabled = false
                            self.errorMessage = "Please sign in to iCloud in Settings to enable backup."
                        } else {
                            self.isBackupEnabled = false
                            self.errorMessage = "iCloud not available. Status: \(status.rawValue)"
                        }
                        return
                    }
                }
                
                guard status == .available else {
                    throw BackupError.iCloudNotAvailable
                }
                
                do {
                    let zone = try await database.save(self.recordZone)
                    await MainActor.run {
                        self.isZoneReady = true
                        print("✅ iCloud zone ready: \(zone.zoneID)")
                    }
                } catch let error as CKError {
                    if error.code == .serverRecordChanged || error.code == .zoneNotFound {
                        await MainActor.run {
                            self.isZoneReady = true
                            print("✅ iCloud zone already exists")
                        }
                    } else {
                        print("❌ Error creating zone: \(error)")
                        throw error
                    }
                }
                
                self.setupSubscriptions()
                
            } catch {
                await MainActor.run {
                    self.errorMessage = "Failed to setup iCloud: \(error.localizedDescription)"
                    print("❌ CloudKit setup failed: \(error)")
                }
            }
        }
    }
    
    private func setupSubscriptions() {
        // Set up push notifications for changes
        let subscription = CKQuerySubscription(
            recordType: "BackupData",
            predicate: NSPredicate(value: true),
            subscriptionID: "backup-data-changes",
            options: [.firesOnRecordCreation, .firesOnRecordUpdate]
        )
        
        let notificationInfo = CKSubscription.NotificationInfo()
        notificationInfo.shouldSendContentAvailable = true
        subscription.notificationInfo = notificationInfo
        
        database.save(subscription) { _, error in
            if let error = error {
                print("Subscription error: \(error)")
            }
        }
    }
    
    func enableBackup(_ enable: Bool) {
        isBackupEnabled = enable
        UserDefaults.standard.set(enable, forKey: userDefaultsKey)
        
        if enable {
            performBackup()
        }
    }
    
    func performBackup() {
        guard isBackupEnabled else { return }
        
        Task { @MainActor in
            backupStatus = .backing
            backupProgress = 0
            errorMessage = nil
            
            do {
                if !isZoneReady {
                    if let setupTask = zoneSetupTask {
                        try? await setupTask.value
                    } else {
                        setupCloudKit()
                        try? await zoneSetupTask?.value
                    }
                }
                
                guard isZoneReady else {
                    errorMessage = "iCloud zone not ready. Please try again."
                    backupStatus = .error
                    return
                }
                
                let backupData = try await collectAllData()
                let records = try createBackupRecords(from: backupData)
                
                let totalRecords = Double(records.count)
                var uploadedCount = 0.0
                
                for record in records {
                    try await database.save(record)
                    uploadedCount += 1
                    backupProgress = uploadedCount / totalRecords
                }
                
                lastBackupDate = Date()
                UserDefaults.standard.set(lastBackupDate, forKey: lastBackupKey)
                backupStatus = .complete
                
                backupToKeyValueStore(backupData)
                
            } catch {
                backupStatus = .error
                errorMessage = error.localizedDescription
            }
        }
    }
    
    func performRestore() async throws {
        backupStatus = .restoring
        backupProgress = 0
        
        do {
            // First try to restore from Key-Value store (faster)
            if let quickData = restoreFromKeyValueStore() {
                try await applyRestoredData(quickData)
            }
            
            // Then fetch full data from CloudKit
            let query = CKQuery(recordType: "BackupData", predicate: NSPredicate(value: true))
            let results = try await database.records(matching: query)
            
            let records = results.matchResults.compactMap { try? $0.1.get() }
            let restoredData = try parseBackupRecords(records)
            
            try await applyRestoredData(restoredData)
            
            backupStatus = .complete
            
        } catch {
            backupStatus = .error
            errorMessage = error.localizedDescription
            throw error
        }
    }
    
    private func collectAllData() async throws -> BackupData {
        return BackupData(
            voiceLogs: VoiceLogManager.shared.voiceLogs,
            photoLogs: PhotoFoodLogManager().photoLogs,
            logEntries: LogsManager(notificationManager: NotificationManager()).logEntries,
            puqeScores: PUQEManager().scores,
            supplements: SupplementManager().supplements,
            settings: collectSettings(),
            backupDate: Date()
        )
    }
    
    private func createBackupRecords(from data: BackupData) throws -> [CKRecord] {
        guard isZoneReady else {
            throw BackupError.zoneNotReady
        }
        
        var records: [CKRecord] = []
        
        let mainRecord = CKRecord(recordType: "BackupData", recordID: CKRecord.ID(recordName: "MainBackup", zoneID: recordZone.zoneID))
        mainRecord["backupDate"] = data.backupDate
        mainRecord["deviceName"] = UIDevice.current.name
        
        // Encode and store data
        if let voiceData = try? JSONEncoder().encode(data.voiceLogs) {
            mainRecord["voiceLogs"] = voiceData as CKRecordValue
        }
        
        if let photoData = try? JSONEncoder().encode(data.photoLogs) {
            mainRecord["photoLogs"] = photoData as CKRecordValue
        }
        
        if let logData = try? JSONEncoder().encode(data.logEntries) {
            mainRecord["logEntries"] = logData as CKRecordValue
        }
        
        if let puqeData = try? JSONEncoder().encode(data.puqeScores) {
            mainRecord["puqeScores"] = puqeData as CKRecordValue
        }
        
        if let supplementData = try? JSONEncoder().encode(data.supplements) {
            mainRecord["supplements"] = supplementData as CKRecordValue
        }
        
        if let settingsData = try? JSONEncoder().encode(data.settings) {
            mainRecord["settings"] = settingsData as CKRecordValue
        }
        
        records.append(mainRecord)
        
        // Create separate records for large files (photos, audio)
        for photoLog in data.photoLogs {
            let imageData = photoLog.imageData
            if !imageData.isEmpty {
                let photoRecord = CKRecord(recordType: "PhotoBackup", recordID: CKRecord.ID(recordName: photoLog.id.uuidString, zoneID: recordZone.zoneID))
                
                // Store image as CKAsset
                let tempURL = FileManager.default.temporaryDirectory.appendingPathComponent("\(photoLog.id.uuidString).jpg")
                try imageData.write(to: tempURL)
                photoRecord["image"] = CKAsset(fileURL: tempURL)
                photoRecord["photoLogId"] = photoLog.id.uuidString
                
                records.append(photoRecord)
            }
        }
        
        return records
    }
    
    private func parseBackupRecords(_ records: [CKRecord]) throws -> BackupData {
        guard let mainRecord = records.first(where: { $0.recordType == "BackupData" }) else {
            throw BackupError.noDataFound
        }
        
        var data = BackupData(
            voiceLogs: [],
            photoLogs: [],
            logEntries: [],
            puqeScores: [],
            supplements: [],
            settings: [:],
            backupDate: mainRecord["backupDate"] as? Date ?? Date()
        )
        
        if let voiceData = mainRecord["voiceLogs"] as? Data {
            data.voiceLogs = (try? JSONDecoder().decode([VoiceLog].self, from: voiceData)) ?? []
        }
        
        if let photoData = mainRecord["photoLogs"] as? Data {
            data.photoLogs = (try? JSONDecoder().decode([PhotoFoodLog].self, from: photoData)) ?? []
        }
        
        if let logData = mainRecord["logEntries"] as? Data {
            data.logEntries = (try? JSONDecoder().decode([LogEntry].self, from: logData)) ?? []
        }
        
        if let puqeData = mainRecord["puqeScores"] as? Data {
            data.puqeScores = (try? JSONDecoder().decode([PUQEScore].self, from: puqeData)) ?? []
        }
        
        if let supplementData = mainRecord["supplements"] as? Data {
            data.supplements = (try? JSONDecoder().decode([Supplement].self, from: supplementData)) ?? []
        }
        
        if let settingsData = mainRecord["settings"] as? Data {
            data.settings = (try? JSONDecoder().decode([String: String].self, from: settingsData)) ?? [:]
        }
        
        // Restore photo images
        let photoRecords = records.filter { $0.recordType == "PhotoBackup" }
        for photoRecord in photoRecords {
            if let photoLogId = photoRecord["photoLogId"] as? String,
               let asset = photoRecord["image"] as? CKAsset,
               let url = asset.fileURL,
               let imageData = try? Data(contentsOf: url) {
                
                // Find corresponding photo log and update with image data
                if let index = data.photoLogs.firstIndex(where: { $0.id.uuidString == photoLogId }) {
                    // Need to create a new instance since imageData is immutable
                    let updatedLog = data.photoLogs[index]
                    data.photoLogs[index] = PhotoFoodLog(
                        id: updatedLog.id,
                        date: updatedLog.date,
                        imageData: imageData,
                        notes: updatedLog.notes,
                        mealType: updatedLog.mealType,
                        aiAnalysis: updatedLog.aiAnalysis
                    )
                }
            }
        }
        
        return data
    }
    
    private func applyRestoredData(_ data: BackupData) async throws {
        // Restore voice logs
        if let encoded = try? JSONEncoder().encode(data.voiceLogs) {
            UserDefaults.standard.set(encoded, forKey: "SavedVoiceLogs")
        }
        
        // Restore photo logs
        let photoLogManager = PhotoFoodLogManager()
        photoLogManager.photoLogs = data.photoLogs
        photoLogManager.savePhotoLogs()
        
        // Restore log entries
        let logsManager = LogsManager(notificationManager: NotificationManager())
        logsManager.logEntries = data.logEntries
        
        // Restore PUQE scores
        let puqeManager = PUQEManager()
        puqeManager.scores = data.puqeScores
        
        // Restore supplements
        let supplementManager = SupplementManager()
        supplementManager.supplements = data.supplements
        
        // Restore settings
        for (key, value) in data.settings {
            UserDefaults.standard.set(value, forKey: key)
        }
        
        NotificationCenter.default.post(name: Notification.Name("DataRestored"), object: nil)
    }
    
    private func backupToKeyValueStore(_ data: BackupData) {
        let store = NSUbiquitousKeyValueStore.default
        
        // Store essential data in key-value store for quick sync
        if let encoded = try? JSONEncoder().encode(data.supplements) {
            store.set(encoded, forKey: "supplements_backup")
        }
        
        if let encoded = try? JSONEncoder().encode(data.puqeScores.suffix(30)) {
            store.set(encoded, forKey: "recent_puqe_backup")
        }
        
        store.set(data.backupDate, forKey: "last_backup_date")
        store.synchronize()
    }
    
    private func restoreFromKeyValueStore() -> BackupData? {
        let store = NSUbiquitousKeyValueStore.default
        
        var data = BackupData(
            voiceLogs: [],
            photoLogs: [],
            logEntries: [],
            puqeScores: [],
            supplements: [],
            settings: [:],
            backupDate: store.object(forKey: "last_backup_date") as? Date ?? Date()
        )
        
        if let supplementData = store.data(forKey: "supplements_backup"),
           let supplements = try? JSONDecoder().decode([Supplement].self, from: supplementData) {
            data.supplements = supplements
        }
        
        if let puqeData = store.data(forKey: "recent_puqe_backup"),
           let scores = try? JSONDecoder().decode([PUQEScore].self, from: puqeData) {
            data.puqeScores = scores
        }
        
        return data.supplements.isEmpty && data.puqeScores.isEmpty ? nil : data
    }
    
    private func collectSettings() -> [String: String] {
        var settings: [String: String] = [:]
        
        // Collect relevant settings
        if let openAIKey = UserDefaults.standard.string(forKey: "openAIKey") {
            settings["openAIKey"] = openAIKey
        }
        
        settings["notificationsEnabled"] = String(UserDefaults.standard.bool(forKey: "notificationsEnabled"))
        settings["reminderInterval"] = String(UserDefaults.standard.integer(forKey: "reminderInterval"))
        
        return settings
    }
    
    func exportToFile() throws -> URL {
        let data = try collectAllDataSync()
        let encoded = try JSONEncoder().encode(data)
        
        let fileName = "pregnancy_tracker_backup_\(Date().timeIntervalSince1970).json"
        let url = FileManager.default.temporaryDirectory.appendingPathComponent(fileName)
        
        try encoded.write(to: url)
        return url
    }
    
    private func collectAllDataSync() throws -> BackupData {
        return BackupData(
            voiceLogs: VoiceLogManager.shared.voiceLogs,
            photoLogs: PhotoFoodLogManager().photoLogs,
            logEntries: LogsManager(notificationManager: NotificationManager()).logEntries,
            puqeScores: PUQEManager().scores,
            supplements: SupplementManager().supplements,
            settings: collectSettings(),
            backupDate: Date()
        )
    }
    
    private func loadSettings() {
        isBackupEnabled = UserDefaults.standard.bool(forKey: userDefaultsKey)
        lastBackupDate = UserDefaults.standard.object(forKey: lastBackupKey) as? Date
    }
    
    struct BackupData: Codable {
        var voiceLogs: [VoiceLog]
        var photoLogs: [PhotoFoodLog]
        var logEntries: [LogEntry]
        var puqeScores: [PUQEScore]
        var supplements: [Supplement]
        var settings: [String: String]
        var backupDate: Date
    }
    
    enum BackupError: LocalizedError {
        case noDataFound
        case iCloudNotAvailable
        case zoneNotReady
        
        var errorDescription: String? {
            switch self {
            case .noDataFound:
                return "No backup data found in iCloud"
            case .iCloudNotAvailable:
                return "iCloud is not available. Please sign in to iCloud in Settings."
            case .zoneNotReady:
                return "iCloud zone is not ready. Please wait and try again."
            }
        }
    }
}