import SwiftUI

struct SettingsView: View {
    @ObservedObject var notificationManager: NotificationManager
    @StateObject private var openAIManager = OpenAIManager.shared
    @StateObject private var cloudBackupManager = CloudBackupManager.shared
    @State private var showingAlert = false
    @State private var alertMessage = ""
    @State private var showingResetConfirmation = false
    @State private var apiKeyInput = ""
    @State private var showAPIKey = false
    @State private var showingRestoreConfirmation = false
    @State private var showingExportSheet = false
    @State private var exportURL: URL?
    @State private var hasUnsavedChanges = false
    @AppStorage("openAIKey") private var savedAPIKey: String = ""
    @Environment(\.dismiss) var dismiss
    
    func formatHour(_ hour: Int) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "ha"
        var components = DateComponents()
        components.hour = hour
        let date = Calendar.current.date(from: components) ?? Date()
        return formatter.string(from: date)
    }
    
    var body: some View {
        NavigationStack {
            ZStack(alignment: .top) {
                LinearGradient(
                    colors: [
                        Color.gray.opacity(0.1),
                        Color(.systemGroupedBackground)
                    ],
                    startPoint: .top,
                    endPoint: .center
                )
                .ignoresSafeArea()

                ScrollView {
                    VStack(spacing: 20) {
                        apiKeySection
                        testNotificationsSection
                        quietHoursSection
                        iCloudBackupSection
                        dailyResetSection
                        troubleshootingSection
                        settingsButtonSection
                        Spacer()
                    }
                    .padding()
                }
            }
            .navigationTitle("Settings")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Back") {
                        dismiss()
                    }
                }

                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") {
                        if hasUnsavedChanges && !apiKeyInput.isEmpty {
                            openAIManager.setAPIKey(apiKeyInput)
                        }
                        dismiss()
                    }
                }
            }
            .toolbarBackground(.ultraThinMaterial, for: .navigationBar)
            .toolbarBackground(.visible, for: .navigationBar)
            .alert("Settings", isPresented: $showingAlert) {
                Button("OK", role: .cancel) { }
            } message: {
                Text(alertMessage)
            }
            .onAppear {
                apiKeyInput = savedAPIKey
            }
        }
    }

    // MARK: - Section Views

    private var apiKeySection: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("AI Food Analysis")
                .font(.headline)
                .padding(.horizontal)

            Text("Add your OpenAI API key to enable AI-powered food analysis")
                .font(.caption)
                .foregroundColor(.secondary)
                .padding(.horizontal)

            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    if showAPIKey {
                        TextField("Enter OpenAI API Key", text: $apiKeyInput)
                            .textFieldStyle(RoundedBorderTextFieldStyle())
                            .autocapitalization(.none)
                            .disableAutocorrection(true)
                            .onChange(of: apiKeyInput) { _, newValue in
                                hasUnsavedChanges = newValue != savedAPIKey
                            }
                    } else {
                        SecureField("Enter OpenAI API Key", text: $apiKeyInput)
                            .textFieldStyle(RoundedBorderTextFieldStyle())
                            .autocapitalization(.none)
                            .disableAutocorrection(true)
                            .onChange(of: apiKeyInput) { _, newValue in
                                hasUnsavedChanges = newValue != savedAPIKey
                            }
                    }

                    Button(action: {
                        showAPIKey.toggle()
                    }) {
                        Image(systemName: showAPIKey ? "eye.slash.fill" : "eye.fill")
                            .foregroundColor(.secondary)
                    }
                }

                HStack {
                    if openAIManager.hasAPIKey {
                        Label("API Key Configured", systemImage: "checkmark.circle.fill")
                            .font(.caption)
                            .foregroundColor(.green)
                    } else {
                        Label("No API Key Set", systemImage: "xmark.circle.fill")
                            .font(.caption)
                            .foregroundColor(.orange)
                    }

                    Spacer()

                    Button(action: {
                        if !apiKeyInput.isEmpty {
                            openAIManager.setAPIKey(apiKeyInput)
                            alertMessage = "API Key saved successfully!"
                            showingAlert = true
                            apiKeyInput = ""
                        }
                    }) {
                        Text("Save Key")
                            .font(.caption)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 6)
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(.blue)
                    .disabled(apiKeyInput.isEmpty)
                }

                Link("Get your API key from OpenAI", destination: URL(string: "https://platform.openai.com/api-keys")!)
                    .font(.caption2)
                    .foregroundColor(.blue)
            }
            .padding(.horizontal)
        }
        .padding(.vertical)
        .background(.regularMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }

    private var testNotificationsSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Test Notifications")
                .font(.headline)
                .padding(.horizontal)

            Text("Send test notifications to verify everything is working")
                .font(.caption)
                .foregroundColor(.secondary)
                .padding(.horizontal)

            HStack(spacing: 15) {
                Button(action: {
                    notificationManager.checkPermissionAndSendTest(type: "eating") { status in
                        if status == .denied {
                            alertMessage = "Notifications are disabled! Go to Settings > Notifications > Health Tracker and enable them."
                            showingAlert = true
                        } else if status == .notDetermined {
                            notificationManager.requestPermission()
                            alertMessage = "Please allow notifications and try again."
                            showingAlert = true
                        } else {
                            alertMessage = "Test eating notification sent! Minimize the app and check in 5 seconds."
                            showingAlert = true
                        }
                    }
                }) {
                    HStack {
                        Image(systemName: "fork.knife")
                        Text("Test Eating")
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                }
                .buttonStyle(.borderedProminent)
                .tint(.orange)

                Button(action: {
                    notificationManager.checkPermissionAndSendTest(type: "water") { status in
                        if status == .denied {
                            alertMessage = "Notifications are disabled! Go to Settings > Notifications > Health Tracker and enable them."
                            showingAlert = true
                        } else if status == .notDetermined {
                            notificationManager.requestPermission()
                            alertMessage = "Please allow notifications and try again."
                            showingAlert = true
                        } else {
                            alertMessage = "Test water notification sent! Minimize the app and check in 5 seconds."
                            showingAlert = true
                        }
                    }
                }) {
                    HStack {
                        Image(systemName: "drop.fill")
                        Text("Test Water")
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                }
                .buttonStyle(.borderedProminent)
                .tint(.blue)
            }
            .padding(.horizontal)
        }
        .padding(.vertical)
        .background(.regularMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }

    private var quietHoursSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Quiet Hours")
                .font(.headline)
                .padding(.horizontal)

            Text("Notifications won't be sent during these hours")
                .font(.caption)
                .foregroundColor(.secondary)
                .padding(.horizontal)

            HStack {
                VStack(alignment: .leading) {
                    Text("Quiet Starts")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    Picker("End Hour", selection: $notificationManager.endHour) {
                        ForEach(0..<24) { hour in
                            Text(formatHour(hour)).tag(hour)
                        }
                    }
                    .pickerStyle(.menu)
                    .labelsHidden()
                }

                Spacer()

                VStack(alignment: .leading) {
                    Text("Quiet Ends")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    Picker("Start Hour", selection: $notificationManager.startHour) {
                        ForEach(0..<24) { hour in
                            Text(formatHour(hour)).tag(hour)
                        }
                    }
                    .pickerStyle(.menu)
                    .labelsHidden()
                }
            }
            .padding(.horizontal)

            Text("Quiet time: \(formatHour(notificationManager.endHour)) - \(formatHour(notificationManager.startHour))")
                .font(.caption2)
                .foregroundColor(.secondary)
                .padding(.horizontal)
        }
        .padding(.vertical)
        .background(.regularMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }

    private var iCloudBackupSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("iCloud Backup")
                .font(.headline)
                .padding(.horizontal)

            Text("Automatically backup your data to iCloud")
                .font(.caption)
                .foregroundColor(.secondary)
                .padding(.horizontal)

            Toggle("Enable iCloud Backup", isOn: $cloudBackupManager.isBackupEnabled)
                .padding(.horizontal)
                .onChange(of: cloudBackupManager.isBackupEnabled) { oldValue, newValue in
                    cloudBackupManager.enableBackup(newValue)
                }

            if cloudBackupManager.isBackupEnabled {
                VStack(alignment: .leading, spacing: 8) {
                    if let lastBackup = cloudBackupManager.lastBackupDate {
                        Label("Last backup: \(lastBackup.formatted(date: .abbreviated, time: .shortened))", systemImage: "checkmark.circle.fill")
                            .font(.caption)
                            .foregroundColor(.green)
                    }

                    HStack(spacing: 12) {
                        Button(action: {
                            cloudBackupManager.performBackup()
                        }) {
                            HStack {
                                if cloudBackupManager.backupStatus == .backing {
                                    ProgressView()
                                        .scaleEffect(0.8)
                                } else {
                                    Image(systemName: "arrow.up.circle.fill")
                                }
                                Text("Backup Now")
                            }
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 8)
                        }
                        .buttonStyle(.borderedProminent)
                        .tint(.blue)
                        .disabled(cloudBackupManager.backupStatus == .backing)

                        Button(action: {
                            showingRestoreConfirmation = true
                        }) {
                            HStack {
                                if cloudBackupManager.backupStatus == .restoring {
                                    ProgressView()
                                        .scaleEffect(0.8)
                                } else {
                                    Image(systemName: "arrow.down.circle.fill")
                                }
                                Text("Restore")
                            }
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 8)
                        }
                        .buttonStyle(.borderedProminent)
                        .tint(.green)
                        .disabled(cloudBackupManager.backupStatus == .restoring)
                    }

                    if cloudBackupManager.backupStatus == .backing || cloudBackupManager.backupStatus == .restoring {
                        ProgressView(value: cloudBackupManager.backupProgress)
                            .progressViewStyle(LinearProgressViewStyle())
                    }

                    if let error = cloudBackupManager.errorMessage {
                        Label(error, systemImage: "exclamationmark.triangle.fill")
                            .font(.caption)
                            .foregroundColor(.red)
                    }
                }
                .padding(.horizontal)
            }

            Button(action: {
                do {
                    exportURL = try cloudBackupManager.exportToFile()
                    showingExportSheet = true
                } catch {
                    alertMessage = "Export failed: \(error.localizedDescription)"
                    showingAlert = true
                }
            }) {
                HStack {
                    Image(systemName: "square.and.arrow.up")
                    Text("Export Data")
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 8)
            }
            .buttonStyle(.borderedProminent)
            .tint(.purple)
            .padding(.horizontal)
        }
        .padding(.vertical)
        .background(.regularMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .confirmationDialog("Restore from iCloud", isPresented: $showingRestoreConfirmation) {
            Button("Restore", role: .destructive) {
                Task {
                    do {
                        try await cloudBackupManager.performRestore()
                        alertMessage = "Data restored successfully!"
                        showingAlert = true
                    } catch {
                        alertMessage = "Restore failed: \(error.localizedDescription)"
                        showingAlert = true
                    }
                }
            }
            Button("Cancel", role: .cancel) { }
        } message: {
            Text("This will replace all current data with your iCloud backup. This action cannot be undone.")
        }
        .sheet(isPresented: $showingExportSheet) {
            if let url = exportURL {
                ShareSheet(items: [url])
            }
        }
    }

    private var dailyResetSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Daily Reset")
                .font(.headline)
                .padding(.horizontal)

            Text("Clear all logs and start fresh for a new day")
                .font(.caption)
                .foregroundColor(.secondary)
                .padding(.horizontal)

            Button(action: {
                showingResetConfirmation = true
            }) {
                HStack {
                    Image(systemName: "sunrise.fill")
                    Text("Reset for New Day")
                }
                .frame(maxWidth: .infinity)
                .padding()
            }
            .buttonStyle(.borderedProminent)
            .tint(.indigo)
            .padding(.horizontal)
            .confirmationDialog("Reset Daily Logs", isPresented: $showingResetConfirmation) {
                Button("Reset All Logs", role: .destructive) {
                    notificationManager.resetForNextDay()
                    alertMessage = "All logs cleared! Starting fresh for the new day."
                    showingAlert = true
                }
                Button("Cancel", role: .cancel) { }
            } message: {
                Text("This will clear all eating and drinking logs for today. Notifications will be rescheduled from your start hour.")
            }
        }
        .padding(.vertical)
        .background(.regularMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }

    private var troubleshootingSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Troubleshooting")
                .font(.headline)
                .padding(.horizontal)

            VStack(alignment: .leading, spacing: 8) {
                Label("Notifications must be enabled in Settings", systemImage: "1.circle.fill")
                    .font(.caption)
                Label("App must be in background to see notifications", systemImage: "2.circle.fill")
                    .font(.caption)
                Label("Check that Focus/DND mode is off", systemImage: "3.circle.fill")
                    .font(.caption)
                Label("Make sure phone is not on silent", systemImage: "4.circle.fill")
                    .font(.caption)
            }
            .padding(.horizontal)
            .foregroundColor(.secondary)
        }
        .padding(.vertical)
        .background(.regularMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }

    private var settingsButtonSection: some View {
        Button(action: {
            if let url = URL(string: UIApplication.openSettingsURLString) {
                UIApplication.shared.open(url)
            }
        }) {
            HStack {
                Image(systemName: "gear")
                Text("Open App Settings")
            }
            .frame(maxWidth: .infinity)
            .padding()
        }
        .buttonStyle(.bordered)
        .tint(.gray)
    }
}

#Preview {
    SettingsView(notificationManager: NotificationManager())
}