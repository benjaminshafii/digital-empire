//
//  AppSettings.swift
//  HA Watch App
//
//  Application-wide settings and API keys
//

import Foundation

@Observable
class AppSettings {
    static let shared = AppSettings()
    
    // API Keys
    var openAIKey: String? {
        get { KeychainHelper.load(key: "openai_api_key") }
        set {
            if let value = newValue {
                KeychainHelper.save(key: "openai_api_key", value: value)
            } else {
                KeychainHelper.delete(key: "openai_api_key")
            }
        }
    }
    
    var homeAssistantURL: String? {
        get { KeychainHelper.load(key: "ha_url") }
        set {
            if let value = newValue {
                KeychainHelper.save(key: "ha_url", value: value)
            } else {
                KeychainHelper.delete(key: "ha_url")
            }
        }
    }
    
    var homeAssistantToken: String? {
        get { KeychainHelper.load(key: "ha_token") }
        set {
            if let value = newValue {
                KeychainHelper.save(key: "ha_token", value: value)
            } else {
                KeychainHelper.delete(key: "ha_token")
            }
        }
    }
    
    private init() {}
}
