import SwiftUI

struct MoreView: View {
    @EnvironmentObject var logsManager: LogsManager
    @EnvironmentObject var notificationManager: NotificationManager
    @State private var showingSettings = false
    
    var body: some View {
        NavigationStack {
            ZStack(alignment: .top) {
                LinearGradient(
                    colors: [
                        Color.blue.opacity(0.1),
                        Color(.systemGroupedBackground)
                    ],
                    startPoint: .topLeading,
                    endPoint: .center
                )
                .ignoresSafeArea()
                
                List {
                Section("Health Tracking") {
                    NavigationLink(destination: ContentView()
                        .environmentObject(logsManager)
                        .environmentObject(notificationManager)) {
                        HStack {
                            Image(systemName: "bell.fill")
                                .foregroundColor(.orange)
                                .frame(width: 30)
                            Text("Notification Reminders")
                            Spacer()
                        }
                    }
                    
                    NavigationLink(destination: SupplementTrackerView()) {
                        HStack {
                            Image(systemName: "pills.fill")
                                .foregroundColor(.green)
                                .frame(width: 30)
                            Text("Vitamins & Supplements")
                            Spacer()
                        }
                    }
                    
                    NavigationLink(destination: LogLedgerView(logsManager: logsManager)) {
                        HStack {
                            Image(systemName: "list.clipboard")
                                .foregroundColor(.blue)
                                .frame(width: 30)
                            Text("Activity Logs")
                            Spacer()
                        }
                    }
                    
                    NavigationLink(destination: VoiceLogsView()) {
                        HStack {
                            Image(systemName: "mic.fill")
                                .foregroundColor(.purple)
                                .frame(width: 30)
                            Text("Voice Recordings")
                            Spacer()
                        }
                    }
                    
                    NavigationLink(destination: PhotoFoodLogView()) {
                        HStack {
                            Image(systemName: "camera.fill")
                                .foregroundColor(.orange)
                                .frame(width: 30)
                            Text("Food Photo Log")
                            Spacer()
                        }
                    }
                }
                
                Section {
                    Button(action: { showingSettings = true }) {
                        HStack {
                            Image(systemName: "gear")
                                .foregroundColor(.gray)
                                .frame(width: 30)
                            Text("Settings")
                            Spacer()
                            Image(systemName: "chevron.right")
                                .foregroundColor(.gray)
                                .font(.caption)
                        }
                    }
                    .foregroundColor(.primary)
                }
                
                Section {
                    NavigationLink(destination: AboutView()) {
                        HStack {
                            Image(systemName: "info.circle")
                                .foregroundColor(.green)
                                .frame(width: 30)
                            Text("About & Settings")
                            Spacer()
                        }
                    }
                }
            }
                .listStyle(InsetGroupedListStyle())
                .scrollContentBackground(.hidden)
            }
            .navigationTitle("More")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .principal) {
                    VStack(spacing: 2) {
                        Text("More")
                            .font(.headline)
                            .fontWeight(.bold)
                        Text("Settings & Tools")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
                
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        showingSettings = true
                    } label: {
                        Image(systemName: "gear")
                    }
                }
                
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        // Show help
                    } label: {
                        Image(systemName: "questionmark.circle")
                    }
                }
            }
            .toolbarBackground(.ultraThinMaterial, for: .navigationBar)
            .toolbarBackground(.visible, for: .navigationBar)
            .sheet(isPresented: $showingSettings) {
                SettingsView(notificationManager: notificationManager)
            }
        }
    }
}