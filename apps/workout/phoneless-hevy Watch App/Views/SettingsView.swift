//
//  SettingsView.swift
//  phoneless-hevy Watch App
//
//  Created by Claude Code on 10/22/25.
//  Settings UI for API configuration (Hevy & OpenAI)
//

import SwiftUI

struct SettingsView: View {
    @State private var settings = AppSettings.shared
    @State private var apiKey: String = ""
    @State private var showHevyAPIKeyInput: Bool = false
    @State private var showOpenAIKeyInput: Bool = false

    var body: some View {
        List {
            Section("Hevy Integration") {
                if settings.hevyAPIKey != nil {
                    HStack {
                        Text("API Key")
                        Spacer()
                        Image(systemName: "checkmark.circle.fill")
                            .foregroundColor(.green)
                    }

                    Button("Change API Key") {
                        showHevyAPIKeyInput = true
                    }

                    Button("Remove API Key", role: .destructive) {
                        settings.hevyAPIKey = nil
                    }
                } else {
                    Button("Add API Key") {
                        showHevyAPIKeyInput = true
                    }
                }

                Toggle("Auto Sync", isOn: $settings.enableAutoSync)

                if settings.enableAutoSync {
                    Picker("Sync Interval", selection: $settings.syncInterval) {
                        Text("Every Hour").tag(3600.0)
                        Text("Every 6 Hours").tag(21600.0)
                        Text("Daily").tag(86400.0)
                    }
                }

                if let lastSync = settings.lastSyncDate {
                    Text("Last sync: \(lastSync.formatted(date: .abbreviated, time: .shortened))")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }
            }

            Section("OpenAI Integration") {
                if settings.openAIKey != nil {
                    HStack {
                        Text("API Key")
                        Spacer()
                        Image(systemName: "checkmark.circle.fill")
                            .foregroundColor(.green)
                    }

                    Button("Change API Key") {
                        showOpenAIKeyInput = true
                    }

                    Button("Remove API Key", role: .destructive) {
                        settings.openAIKey = nil
                    }
                } else {
                    Button("Add API Key") {
                        showOpenAIKeyInput = true
                    }
                }
            }

            Section("Voice Recording") {
                Toggle("Wrist Raise Auto-Start", isOn: $settings.enableWristRaiseRecording)

                if settings.enableWristRaiseRecording {
                    Text("Automatically starts recording when you raise your wrist during a workout")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }
            }
        }
        .sheet(isPresented: $showHevyAPIKeyInput) {
            APIKeyInputView(title: "Enter Hevy API Key", apiKey: $apiKey) { key in
                settings.hevyAPIKey = key
                showHevyAPIKeyInput = false
            }
        }
        .sheet(isPresented: $showOpenAIKeyInput) {
            APIKeyInputView(title: "Enter OpenAI API Key", apiKey: $apiKey) { key in
                settings.openAIKey = key
                showOpenAIKeyInput = false
            }
        }
    }
}

struct APIKeyInputView: View {
    let title: String
    @Binding var apiKey: String
    let onSave: (String) -> Void
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        VStack(spacing: 16) {
            Text(title)
                .font(.headline)
                .padding(.top)
                .lineLimit(2)
                .minimumScaleFactor(0.8)
                .multilineTextAlignment(.center)

            TextField("API Key", text: $apiKey)
                .padding(.horizontal)

            HStack(spacing: 12) {
                Button("Cancel") {
                    dismiss()
                }
                .buttonStyle(.bordered)

                Button("Save") {
                    onSave(apiKey)
                }
                .buttonStyle(.borderedProminent)
                .disabled(apiKey.isEmpty)
            }
            .padding(.bottom)
        }
        .padding()
    }
}

#Preview {
    SettingsView()
}
