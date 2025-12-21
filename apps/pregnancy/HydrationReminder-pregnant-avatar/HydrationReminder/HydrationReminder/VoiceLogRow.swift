import SwiftUI

struct VoiceLogRow: View {
    let log: VoiceLog
    @ObservedObject var manager: VoiceLogManager
    @State private var showingTimeEdit = false
    @State private var editableDate: Date
    
    init(log: VoiceLog, manager: VoiceLogManager) {
        self.log = log
        self.manager = manager
        self._editableDate = State(initialValue: log.date)
    }
    
    var isPlaying: Bool {
        manager.isPlaying && manager.currentPlayingID == log.id
    }
    
    var body: some View {
        HStack(spacing: 12) {
            // Category Icon
            Image(systemName: log.category.icon)
                .font(.title2)
                .foregroundColor(Color(log.category.color))
                .frame(width: 40)
            
            // Log Info
            VStack(alignment: .leading, spacing: 4) {
                Text(log.category.rawValue)
                    .font(.headline)
                
                HStack {
                    Button(action: {
                        editableDate = log.date
                        showingTimeEdit = true
                    }) {
                        HStack(spacing: 4) {
                            Image(systemName: "clock")
                                .font(.caption2)
                            Text(log.formattedDate)
                                .font(.caption)
                        }
                        .foregroundColor(.secondary)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(Color.gray.opacity(0.1))
                        .cornerRadius(12)
                    }
                    .buttonStyle(PlainButtonStyle())
                    
                    Text("•")
                        .foregroundColor(.secondary)
                    
                    Text(log.formattedDuration)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                // Show live transcription first if available, then final transcription
                if let transcription = log.transcription {
                    Text(transcription)
                        .font(.caption)
                        .foregroundColor(.primary)
                        .lineLimit(2)
                        .padding(.top, 2)
                } else if let liveTranscription = log.liveTranscription {
                    HStack(spacing: 4) {
                        Image(systemName: "mic.fill")
                            .font(.caption2)
                            .foregroundColor(.blue)
                        Text(liveTranscription)
                            .font(.caption)
                            .foregroundColor(.secondary)
                            .italic()
                            .lineLimit(2)
                    }
                    .padding(.top, 2)
                }
            }
            
            Spacer()
            
            // Play/Pause Button
            Button(action: {
                if isPlaying {
                    manager.stopAudio()
                } else {
                    manager.playAudio(log: log)
                }
            }) {
                Image(systemName: isPlaying ? "pause.circle.fill" : "play.circle.fill")
                    .font(.title)
                    .foregroundColor(.blue)
            }
            .buttonStyle(PlainButtonStyle())
        }
        .padding(.vertical, 8)
        .sheet(isPresented: $showingTimeEdit) {
            TimeEditSheet(date: $editableDate)
                .onDisappear {
                    // Update the log when sheet is dismissed
                    if editableDate != log.date {
                        if let index = manager.voiceLogs.firstIndex(where: { $0.id == log.id }) {
                            manager.voiceLogs[index].date = editableDate
                            manager.saveLogs()
                        }
                    }
                }
        }
    }
}