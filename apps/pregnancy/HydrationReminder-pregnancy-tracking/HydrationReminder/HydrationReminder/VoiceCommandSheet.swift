import SwiftUI
import AVFoundation

struct VoiceCommandSheet: View {
    @ObservedObject var voiceLogManager: VoiceLogManager
    @StateObject private var openAIManager = OpenAIManager.shared
    @State private var isListening = false
    @State private var animationScale: CGFloat = 1.0
    @State private var showExamples = false
    @State private var timer: Timer?
    @State private var errorMessage: String?
    @State private var showConfigurationError = false
    let onDismiss: () -> Void
    
    var body: some View {
        NavigationView {
            VStack(spacing: 24) {
                // Microphone Button
                ZStack {
                    // Animated circles when recording
                    if isListening {
                        Circle()
                            .stroke(Color.blue.opacity(0.3), lineWidth: 2)
                            .scaleEffect(animationScale)
                            .opacity(Double(2 - animationScale))
                            .animation(
                                Animation.easeOut(duration: 1)
                                    .repeatForever(autoreverses: false),
                                value: animationScale
                            )
                        
                        Circle()
                            .stroke(Color.blue.opacity(0.3), lineWidth: 2)
                            .scaleEffect(animationScale * 0.8)
                            .opacity(Double(2 - animationScale * 0.8))
                            .animation(
                                Animation.easeOut(duration: 1)
                                    .repeatForever(autoreverses: false)
                                    .delay(0.2),
                                value: animationScale
                            )
                    }
                    
                    Button(action: toggleRecording) {
                        ZStack {
                            Circle()
                                .fill(isListening ? Color.red : Color.blue)
                                .frame(width: 120, height: 120)
                            
                            Image(systemName: isListening ? "stop.fill" : "mic.fill")
                                .font(.system(size: 40))
                                .foregroundColor(.white)
                        }
                    }
                    .scaleEffect(isListening ? 1.1 : 1.0)
                    .animation(.easeInOut(duration: 0.2), value: isListening)
                }
                .frame(height: 150)
                
                // Status Text
                VStack(spacing: 8) {
                    if isListening {
                        Text("Listening...")
                            .font(.headline)
                            .foregroundColor(.primary)
                    } else if voiceLogManager.isProcessingVoice {
                        HStack {
                            ProgressView()
                                .scaleEffect(0.8)
                            Text("Processing...")
                                .font(.headline)
                                .foregroundColor(.primary)
                        }
                    } else {
                        Text("Tap to start voice command")
                            .font(.headline)
                            .foregroundColor(.secondary)
                    }
                }
                
                // On-Device Transcription (shown during recording)
                if !voiceLogManager.onDeviceSpeechManager.liveTranscript.isEmpty && 
                   isListening {
                    VStack(spacing: 4) {
                        HStack(spacing: 4) {
                            Image(systemName: "waveform")
                                .font(.caption2)
                                .foregroundColor(.blue)
                            Text("On-device:")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                        
                        Text("\"\(voiceLogManager.onDeviceSpeechManager.liveTranscript)\"")
                            .font(.body)
                            .foregroundColor(.primary)
                            .italic()
                            .padding(.horizontal)
                            .padding(.vertical, 8)
                            .background(Color.blue.opacity(0.1))
                            .cornerRadius(8)
                            .multilineTextAlignment(.center)
                    }
                    .padding(.horizontal)
                    .transition(.opacity.combined(with: .move(edge: .top)))
                }
                
                // Refined Transcription (shown after processing)
                if let transcript = voiceLogManager.lastTranscription, 
                   !transcript.isEmpty, 
                   !isListening,
                   voiceLogManager.actionRecognitionState != .recognizing {
                    VStack(spacing: 4) {
                        HStack(spacing: 4) {
                            Image(systemName: "checkmark.circle.fill")
                                .font(.caption2)
                                .foregroundColor(.green)
                            Text("Transcribed:")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                        
                        Text("\"\(transcript)\"")
                            .font(.body)
                            .foregroundColor(.primary)
                            .italic()
                            .padding(.horizontal)
                            .padding(.vertical, 8)
                            .background(Color.green.opacity(0.1))
                            .cornerRadius(8)
                            .multilineTextAlignment(.center)
                    }
                    .padding(.horizontal)
                    .transition(.opacity.combined(with: .scale))
                }
                
                // Error or API Key Warning
                if !openAIManager.hasAPIKey && !isListening {
                    VStack(spacing: 8) {
                        Image(systemName: "exclamationmark.triangle.fill")
                            .foregroundColor(.orange)
                            .font(.title2)
                        
                        Text("OpenAI API Key Required")
                            .font(.headline)
                            .foregroundColor(.primary)
                        
                        Text("Voice transcription requires an OpenAI API key. Please add it in Settings.")
                            .font(.caption)
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.center)
                            .padding(.horizontal)
                        
                        Button(action: {
                            // Close sheet and open settings
                            onDismiss()
                        }) {
                            Text("Go to Settings")
                                .font(.caption)
                                .padding(.horizontal, 16)
                                .padding(.vertical, 8)
                                .background(Color.blue)
                                .foregroundColor(.white)
                                .cornerRadius(20)
                        }
                    }
                    .padding()
                    .background(Color(.tertiarySystemBackground))
                    .cornerRadius(10)
                    .padding(.horizontal)
                }
                
                // Detected Actions
                if !voiceLogManager.detectedActions.isEmpty && !isListening && voiceLogManager.actionRecognitionState == .executing {
                    VStack(alignment: .leading, spacing: 12) {
                        HStack(spacing: 4) {
                            Image(systemName: "list.bullet.circle.fill")
                                .font(.caption2)
                                .foregroundColor(.orange)
                            Text("Actions:")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                        
                        ForEach(voiceLogManager.detectedActions, id: \.type) { action in
                            HStack {
                                Image(systemName: iconForAction(action.type))
                                    .foregroundColor(colorForAction(action.type))
                                
                                Text(descriptionForAction(action))
                                    .font(.subheadline)
                                
                                Spacer()
                                
                                if action.confidence > 0.8 {
                                    Image(systemName: "checkmark.circle.fill")
                                        .foregroundColor(.green)
                                        .font(.caption)
                                }
                            }
                            .padding(.vertical, 4)
                        }
                    }
                    .padding()
                    .background(Color.orange.opacity(0.1))
                    .cornerRadius(10)
                    .padding(.horizontal)
                    .transition(.opacity.combined(with: .scale))
                }
                
                // Completed State
                if voiceLogManager.actionRecognitionState == .completed && !voiceLogManager.executedActions.isEmpty {
                    VStack(spacing: 8) {
                        Image(systemName: "checkmark.circle.fill")
                            .font(.system(size: 40))
                            .foregroundColor(.green)
                        
                        Text("Successfully logged!")
                            .font(.headline)
                            .foregroundColor(.primary)
                        
                        ForEach(voiceLogManager.executedActions, id: \.type) { action in
                            Text(descriptionForAction(action))
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    }
                    .padding()
                    .background(Color.green.opacity(0.1))
                    .cornerRadius(10)
                    .padding(.horizontal)
                    .transition(.opacity.combined(with: .scale))
                }
                
                // Example Commands
                Button(action: { showExamples.toggle() }) {
                    HStack {
                        Image(systemName: showExamples ? "chevron.up" : "chevron.down")
                        Text("Example Commands")
                        Spacer()
                    }
                    .font(.subheadline)
                    .foregroundColor(.blue)
                    .padding(.horizontal)
                }
                
                if showExamples {
                    VStack(alignment: .leading, spacing: 6) {
                        ExampleRow(icon: "drop.fill", text: "I drank 16 ounces of water")
                        ExampleRow(icon: "fork.knife", text: "I had eggs and toast for breakfast")
                        ExampleRow(icon: "pills.fill", text: "I took my prenatal vitamin")
                        ExampleRow(icon: "heart.text.square", text: "I'm feeling nauseous")
                        ExampleRow(icon: "face.sad", text: "I threw up after lunch")
                    }
                    .padding()
                    .background(Color(.tertiarySystemBackground))
                    .cornerRadius(10)
                    .padding(.horizontal)
                }
                
                Spacer()
            }
            .navigationTitle("Voice Command")
            .navigationBarTitleDisplayMode(.inline)
            .navigationBarItems(
                trailing: Button("Done") {
                    if isListening {
                        stopRecording()
                    }
                    onDismiss()
                }
            )
        }
        .onAppear {
            if voiceLogManager.isRecording {
                isListening = true
                startAnimations()
            }
            
            if !voiceLogManager.isConfigured {
                showConfigurationError = true
            }
        }
        .alert("Voice Logging Not Available", isPresented: $showConfigurationError) {
            Button("OK") {
                onDismiss()
            }
        } message: {
            Text("Voice logging system is not configured. Please restart the app. If the problem persists, contact support.")
        }
        .onDisappear {
            if isListening {
                stopRecording()
            }
        }
    }
    
    private func toggleRecording() {
        if isListening {
            stopRecording()
        } else {
            startRecording()
        }
    }
    
    private func startRecording() {
        // Clear ALL previous state
        voiceLogManager.lastTranscription = nil
        voiceLogManager.detectedActions = []
        voiceLogManager.showActionConfirmation = false
        
        // Add haptic feedback when starting
        let impactFeedback = UIImpactFeedbackGenerator(style: .medium)
        impactFeedback.impactOccurred()
        
        voiceLogManager.requestMicrophonePermission { granted in
            if granted {
                voiceLogManager.startRecording()
                isListening = true
                startAnimations()
            }
        }
    }
    
    private func stopRecording() {
        // Add haptic feedback when stopping
        let impactFeedback = UIImpactFeedbackGenerator(style: .light)
        impactFeedback.impactOccurred()
        
        voiceLogManager.stopRecording()
        isListening = false
        stopAnimations()
    }
    
    private func startAnimations() {
        animationScale = 1.5
    }
    
    private func stopAnimations() {
        animationScale = 1.0
    }
    
    private func iconForAction(_ type: VoiceAction.ActionType) -> String {
        switch type {
        case .logWater: return "drop.fill"
        case .logFood: return "fork.knife"
        case .logVitamin: return "pills.fill"
        case .addVitamin: return "plus.circle.fill"
        case .logSymptom: return "heart.text.square"
        case .logPUQE: return "chart.line.uptrend.xyaxis"
        case .unknown: return "questionmark.circle"
        }
    }
    
    private func colorForAction(_ type: VoiceAction.ActionType) -> Color {
        switch type {
        case .logWater: return .blue
        case .logFood: return .orange
        case .logVitamin: return .purple
        case .addVitamin: return .mint
        case .logSymptom: return .red
        case .logPUQE: return .pink
        case .unknown: return .gray
        }
    }
    
    private func descriptionForAction(_ action: VoiceAction) -> String {
        switch action.type {
        case .logWater:
            if let amount = action.details.amount, let unit = action.details.unit {
                return "Log \(amount) \(unit) of water"
            }
            return "Log water intake"
        case .logFood:
            return "Log food: \(action.details.item ?? "meal")"
        case .logVitamin:
            return "Log vitamin: \(action.details.vitaminName ?? "supplement")"
        case .addVitamin:
            return "Add supplement: \(action.details.vitaminName ?? "vitamin")"
        case .logSymptom:
            if let symptoms = action.details.symptoms {
                return "Log symptoms: \(symptoms.joined(separator: ", "))"
            }
            return "Log symptom"
        case .logPUQE:
            return "Record PUQE score"
        case .unknown:
            return "Unknown command"
        }
    }
}

struct ExampleRow: View {
    let icon: String
    let text: String
    
    var body: some View {
        HStack {
            Image(systemName: icon)
                .foregroundColor(.secondary)
                .frame(width: 20)
            Text("\"\(text)\"")
                .font(.caption)
                .foregroundColor(.secondary)
                .italic()
            Spacer()
        }
    }
}