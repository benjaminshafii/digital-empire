//
//  AppSettings.swift
//  phoneless-hevy Watch App
//
//  Created by Claude Code on 10/22/25.
//  Application settings including Hevy API configuration
//

import Foundation

@Observable
class AppSettings {
    static let shared = AppSettings()

    private init() {}

    var hevyAPIKey: String? {
        get {
            // Get from Keychain - set via Settings UI or environment
            if let key = KeychainHelper.load(key: "hevyAPIKey") {
                return String(data: key, encoding: .utf8)
            }
            // Fallback to environment variable for development
            return ProcessInfo.processInfo.environment["HEVY_API_KEY"]
        }
        set {
            if let newValue = newValue {
                let data = Data(newValue.utf8)
                KeychainHelper.save(data, key: "hevyAPIKey")
            } else {
                KeychainHelper.delete(key: "hevyAPIKey")
            }
        }
    }

    var openAIKey: String? {
        get {
            // Get from Keychain - set via Settings UI or environment
            if let key = KeychainHelper.load(key: "openAIKey") {
                return String(data: key, encoding: .utf8)
            }
            // Fallback to environment variable for development
            return ProcessInfo.processInfo.environment["OPENAI_API_KEY"]
        }
        set {
            if let newValue = newValue {
                let data = Data(newValue.utf8)
                KeychainHelper.save(data, key: "openAIKey")
            } else {
                KeychainHelper.delete(key: "openAIKey")
            }
        }
    }

    var enableAutoSync: Bool {
        get { UserDefaults.standard.bool(forKey: "enableAutoSync") }
        set { UserDefaults.standard.set(newValue, forKey: "enableAutoSync") }
    }

    var syncInterval: TimeInterval {
        get {
            let interval = UserDefaults.standard.double(forKey: "syncInterval")
            return interval > 0 ? interval : 86400  // Default: 24 hours
        }
        set {
            UserDefaults.standard.set(newValue, forKey: "syncInterval")
        }
    }

    var lastSyncDate: Date? {
        get {
            UserDefaults.standard.object(forKey: "lastSyncDate") as? Date
        }
        set {
            UserDefaults.standard.set(newValue, forKey: "lastSyncDate")
        }
    }

    var enableWristRaiseRecording: Bool {
        get { UserDefaults.standard.bool(forKey: "enableWristRaiseRecording") }
        set { UserDefaults.standard.set(newValue, forKey: "enableWristRaiseRecording") }
    }
}
