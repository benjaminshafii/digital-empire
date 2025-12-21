import SwiftUI

struct AboutView: View {
    @Environment(\.dismiss) var dismiss
    @State private var showingDeleteConfirmation = false
    @State private var showingDeleteSuccess = false
    
    var appVersion: String {
        Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "1.0"
    }
    
    var buildNumber: String {
        Bundle.main.infoDictionary?["CFBundleVersion"] as? String ?? "1"
    }
    
    var body: some View {
        NavigationView {
            List {
                Section {
                    HStack {
                        Image(systemName: "heart.circle.fill")
                            .font(.system(size: 60))
                            .foregroundColor(.pink)
                        
                        VStack(alignment: .leading, spacing: 4) {
                            Text("Corgina")
                                .font(.title2)
                                .fontWeight(.bold)
                            Text("Pregnancy Wellness Tracker")
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                            Text("Version \(appVersion) (\(buildNumber))")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    }
                    .padding(.vertical, 8)
                }
                
                Section(header: Text("Support")) {
                    Link(destination: URL(string: "mailto:support@corgina.app")!) {
                        HStack {
                            Image(systemName: "envelope.fill")
                                .foregroundColor(.blue)
                            Text("Contact Support")
                            Spacer()
                            Image(systemName: "arrow.up.right")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    }
                    
                    Link(destination: URL(string: "https://corgina.app/privacy")!) {
                        HStack {
                            Image(systemName: "hand.raised.fill")
                                .foregroundColor(.green)
                            Text("Privacy Policy")
                            Spacer()
                            Image(systemName: "arrow.up.right")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    }
                }
                
                Section(header: Text("Medical Disclaimer")) {
                    VStack(alignment: .leading, spacing: 12) {
                        HStack(spacing: 8) {
                            Image(systemName: "exclamationmark.triangle.fill")
                                .foregroundColor(.orange)
                            Text("Important Information")
                                .font(.headline)
                        }
                        
                        Text("Corgina is a wellness tracker and is NOT intended to diagnose, treat, cure, or prevent any disease or medical condition.")
                            .font(.body)
                            .foregroundColor(.secondary)
                        
                        Text("Always consult your healthcare provider for medical advice. In case of emergency, call emergency services immediately.")
                            .font(.body)
                            .foregroundColor(.secondary)
                    }
                    .padding(.vertical, 4)
                }
                
                Section(header: Text("Data Management")) {
                    Button(action: {
                        showingDeleteConfirmation = true
                    }) {
                        HStack {
                            Image(systemName: "trash.fill")
                                .foregroundColor(.red)
                            Text("Delete All Data")
                                .foregroundColor(.red)
                        }
                    }
                    .alert("Delete All Data?", isPresented: $showingDeleteConfirmation) {
                        Button("Cancel", role: .cancel) { }
                        Button("Delete", role: .destructive) {
                            deleteAllData()
                            showingDeleteSuccess = true
                        }
                    } message: {
                        Text("This will permanently delete all your logs, photos, voice recordings, and settings. This action cannot be undone.")
                    }
                    
                    Text("This will permanently delete all logs, photos, voice recordings, supplements, and PUQE scores stored in the app.")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                Section(header: Text("Legal")) {
                    HStack {
                        Text("Copyright")
                        Spacer()
                        Text("© 2025 Corgina")
                            .foregroundColor(.secondary)
                    }
                    .font(.callout)
                    
                    Text("All rights reserved.")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                Section(header: Text("Acknowledgments")) {
                    Text("Made with ❤️ for expecting parents")
                        .font(.callout)
                        .foregroundColor(.secondary)
                }
            }
            .navigationTitle("About")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") {
                        dismiss()
                    }
                }
            }
            .alert("Data Deleted", isPresented: $showingDeleteSuccess) {
                Button("OK") {
                    dismiss()
                }
            } message: {
                Text("All your data has been permanently deleted.")
            }
        }
    }
    
    private func deleteAllData() {
        let defaults = UserDefaults.standard
        let keys = [
            "UnifiedLogEntries",
            "SavedSupplements",
            "PUQEScore",
            "hasAcceptedDisclaimer"
        ]
        
        keys.forEach { defaults.removeObject(forKey: $0) }
        
        defaults.synchronize()
    }
}

#Preview {
    AboutView()
}
