import SwiftUI
import AVFoundation

struct VoiceLogsView: View {
    @StateObject private var voiceLogManager = VoiceLogManager.shared
    @EnvironmentObject var logsManager: LogsManager
    @EnvironmentObject var supplementManager: SupplementManager
    @State private var selectedFilter: LogCategory? = nil
    @State private var showingMicrophoneAlert = false
    @State private var microphonePermissionDenied = false
    
    var filteredLogs: [VoiceLog] {
        voiceLogManager.filteredLogs(by: selectedFilter)
    }
    
    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // Recording Section
                recordingSection
                
                Divider()
                
                // Filter Section
                filterSection
                
                // Logs List
                logsListSection
            }
            .navigationTitle("Voice Logs")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: {
                        // Could add settings or info here
                    }) {
                        Image(systemName: "info.circle")
                    }
                }
            }
        }
        .alert("Microphone Permission Required", isPresented: $showingMicrophoneAlert) {
            Button("OK") { }
        } message: {
            Text("Please enable microphone access in Settings to record voice logs.")
        }
        .onAppear {
            checkMicrophonePermission()
            // Configure VoiceLogManager with shared managers
            voiceLogManager.configure(logsManager: logsManager, supplementManager: supplementManager)
        }
    }
    
    private var recordingSection: some View {
        VStack(spacing: 16) {
            // Category Selector
            VStack(spacing: 8) {
                Text("Select Category")
                    .font(.caption)
                    .foregroundColor(.secondary)
                
                HStack(spacing: 12) {
                    ForEach(LogCategory.allCases, id: \.self) { category in
                        categoryButton(for: category)
                    }
                }
            }
            .padding(.horizontal)
            
            // Record Button
            HStack(spacing: 30) {
                // Record Button
                Button(action: toggleRecording) {
                    ZStack {
                        Circle()
                            .fill(voiceLogManager.isRecording ? Color.red : Color.blue)
                            .frame(width: 80, height: 80)
                        
                        Image(systemName: voiceLogManager.isRecording ? "stop.fill" : "mic.fill")
                            .font(.system(size: 30))
                            .foregroundColor(.white)
                    }
                }
                .scaleEffect(voiceLogManager.isRecording ? 1.1 : 1.0)
                .animation(.easeInOut(duration: 0.3), value: voiceLogManager.isRecording)
                
                // Spacer for balance
                Spacer()
                    .frame(width: 100)
            }
            

        }
        .padding(.vertical)
        .background(Color(UIColor.systemBackground))
    }
    
    private var filterSection: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 10) {
                FilterChip(title: "All", isSelected: selectedFilter == nil) {
                    selectedFilter = nil
                }
                
                ForEach(LogCategory.allCases, id: \.self) { category in
                    FilterChip(
                        title: category.rawValue,
                        icon: category.icon,
                        isSelected: selectedFilter == category
                    ) {
                        selectedFilter = category
                    }
                }
            }
            .padding(.horizontal)
        }
        .padding(.vertical, 10)
        .background(Color(UIColor.secondarySystemBackground))
    }
    
    private var logsListSection: some View {
        Group {
            if filteredLogs.isEmpty {
                VStack(spacing: 20) {
                    Spacer()
                    Image(systemName: "mic.slash")
                        .font(.system(size: 60))
                        .foregroundColor(.gray)
                    Text("No voice logs yet")
                        .font(.title3)
                        .foregroundColor(.secondary)
                    Text("Tap the record button to start")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    Spacer()
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                ScrollView {
                    LazyVStack(spacing: 10) {
                        ForEach(filteredLogs) { log in
                            VoiceLogRow(log: log, manager: voiceLogManager)
                                .padding(.horizontal)
                        }
                    }
                    .padding(.vertical, 10)
                }
            }
        }
    }
    
    private func categoryButton(for category: LogCategory) -> some View {
        Button(action: {
            voiceLogManager.currentCategory = category
        }) {
            HStack(spacing: 6) {
                Image(systemName: category.icon)
                    .font(.title3)
                Text(category.rawValue)
                    .font(.subheadline)
                    .fontWeight(voiceLogManager.currentCategory == category ? .semibold : .regular)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 14)
            .padding(.horizontal, 8)
            .background(
                RoundedRectangle(cornerRadius: 10)
                    .fill(voiceLogManager.currentCategory == category ?
                          getCategoryColor(category).opacity(0.15) :
                          Color.gray.opacity(0.05))
            )
            .overlay(
                RoundedRectangle(cornerRadius: 10)
                    .stroke(voiceLogManager.currentCategory == category ?
                           getCategoryColor(category) :
                           Color.gray.opacity(0.3),
                           lineWidth: voiceLogManager.currentCategory == category ? 2 : 1)
            )
            .foregroundColor(
                voiceLogManager.currentCategory == category ?
                getCategoryColor(category) :
                .primary
            )
        }
        .buttonStyle(PlainButtonStyle())
    }
    
    private func checkMicrophonePermission() {
        AVAudioApplication.requestRecordPermission { granted in
            DispatchQueue.main.async {
                if !granted {
                    microphonePermissionDenied = true
                }
            }
        }
    }
    
    private func toggleRecording() {
        if voiceLogManager.isRecording {
            voiceLogManager.stopRecording()
        } else {
            voiceLogManager.requestMicrophonePermission { granted in
                if granted {
                    voiceLogManager.startRecording()
                } else {
                    showingMicrophoneAlert = true
                }
            }
        }
    }
    
    private func getCategoryColor(_ category: LogCategory) -> Color {
        switch category {
        case .food:
            return .orange
        case .hydration:
            return .blue
        case .supplements:
            return .green
        case .symptoms:
            return .purple
        }
    }
    
    private func actionRecognitionColor() -> Color {
        switch voiceLogManager.actionRecognitionState {
        case .idle:
            return .gray
        case .recognizing:
            return .orange
        case .executing:
            return .blue
        case .completed:
            return .green
        }
    }
    
    private func getActionSummary(_ action: VoiceAction) -> String {
        var summary = ""

        switch action.type {
        case .logFood:
            summary = "Added \(action.details.item ?? "food")"
            if let mealType = action.details.mealType {
                summary += " for \(mealType)"
            }
        case .logWater:
            if let amount = action.details.amount, let unit = action.details.unit {
                summary = "Logged \(amount) \(unit) of water"
            } else {
                summary = "Logged water"
            }
        case .logVitamin:
            summary = "Took \(action.details.vitaminName ?? action.details.item ?? "supplement")"
        case .addVitamin:
            summary = "Added \(action.details.vitaminName ?? "supplement") to tracker"
        case .logSymptom:
            if let symptoms = action.details.symptoms {
                summary = "Logged: \(symptoms.joined(separator: ", "))"
            } else {
                summary = "Logged symptoms"
            }
        case .logPUQE:
            summary = "Updated PUQE score"
        case .unknown:
            summary = "Unknown action"
        }
        
        // Add time if parsed and different from current
        if let timestampString = action.details.timestamp {
            let formatter = ISO8601DateFormatter()
            formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
            
            if let parsedDate = formatter.date(from: timestampString) ?? {
                formatter.formatOptions = [.withInternetDateTime]
                return formatter.date(from: timestampString)
            }() {
                // If time is more than 5 minutes different from now, show it
                if abs(parsedDate.timeIntervalSinceNow) > 300 {
                    let timeFormatter = DateFormatter()
                    if Calendar.current.isDateInToday(parsedDate) {
                        timeFormatter.dateFormat = "h:mm a"
                        summary += " at \(timeFormatter.string(from: parsedDate))"
                    } else if Calendar.current.isDateInYesterday(parsedDate) {
                        timeFormatter.dateFormat = "h:mm a"
                        summary += " yesterday at \(timeFormatter.string(from: parsedDate))"
                    } else {
                        timeFormatter.dateFormat = "MMM d, h:mm a"
                        summary += " on \(timeFormatter.string(from: parsedDate))"
                    }
                }
            }
        }
        
        return summary
    }
}

struct FilterChip: View {
    let title: String
    var icon: String? = nil
    let isSelected: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            HStack(spacing: 4) {
                if let icon = icon {
                    Image(systemName: icon)
                        .font(.caption)
                }
                Text(title)
                    .font(.subheadline)
                    .fontWeight(isSelected ? .semibold : .regular)
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .background(
                Capsule()
                    .fill(isSelected ? Color.blue.opacity(0.15) : Color.gray.opacity(0.1))
            )
            .overlay(
                Capsule()
                    .stroke(isSelected ? Color.blue : Color.clear, lineWidth: 1.5)
            )
            .foregroundColor(isSelected ? .blue : .primary)
        }
        .buttonStyle(PlainButtonStyle())
    }
}