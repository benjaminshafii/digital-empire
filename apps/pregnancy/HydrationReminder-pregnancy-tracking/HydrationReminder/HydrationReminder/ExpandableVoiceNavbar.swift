import SwiftUI

struct VoiceMiniPlayer: View {
    @ObservedObject var voiceLogManager: VoiceLogManager
    let onDismiss: () -> Void

    var body: some View {
        VStack(spacing: 0) {
            // Expanded content (appears above collapsed bar)
            if voiceLogManager.isRecording {
                recordingStateView
                    .transition(.move(edge: .bottom).combined(with: .opacity))
            } else if voiceLogManager.actionRecognitionState == .recognizing ||
                      voiceLogManager.actionRecognitionState == .executing ||
                      voiceLogManager.isProcessingVoice {
                processingStateView
                    .transition(.move(edge: .bottom).combined(with: .opacity))
            } else if voiceLogManager.actionRecognitionState == .completed &&
                      !voiceLogManager.executedActions.isEmpty {
                successStateView
                    .transition(.move(edge: .bottom).combined(with: .opacity))
            }

            // Collapsed status bar (always visible - no button)
            collapsedStatusBar
        }
        .background(Color(.systemBackground))
        .shadow(color: .black.opacity(0.08), radius: 8, y: -2)
        .animation(.spring(response: 0.35, dampingFraction: 0.8), value: voiceLogManager.isRecording)
        .animation(.spring(response: 0.35, dampingFraction: 0.8), value: voiceLogManager.actionRecognitionState)
        .onChange(of: voiceLogManager.actionRecognitionState) { _, newState in
            if newState == .completed {
                // Auto-dismiss success state after 4 seconds
                DispatchQueue.main.asyncAfter(deadline: .now() + 4) {
                    if voiceLogManager.actionRecognitionState == .completed {
                        onDismiss()
                    }
                }
            }
        }
    }

    // MARK: - Collapsed Status Bar (Always Visible - Info Only)
    private var collapsedStatusBar: some View {
        HStack(spacing: 12) {
            // Status icon
            ZStack {
                Circle()
                    .fill(iconBackgroundColor)
                    .frame(width: 44, height: 44)

                Image(systemName: iconName)
                    .font(.system(size: 20, weight: .semibold))
                    .foregroundStyle(iconColor)
            }

            // Status text
            VStack(alignment: .leading, spacing: 2) {
                Text(statusTitle)
                    .font(.subheadline.weight(.semibold))
                    .foregroundColor(.primary)

                if let subtitle = statusSubtitle {
                    Text(subtitle)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }

            Spacer()
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .frame(height: 68)
    }

    // MARK: - Recording State View
    private var recordingStateView: some View {
        VStack(spacing: 12) {
            // Show live transcription if available
            if !voiceLogManager.onDeviceSpeechManager.liveTranscript.isEmpty {
                HStack(alignment: .top, spacing: 12) {
                    // Audio wave icon
                    Image(systemName: "waveform")
                        .font(.system(size: 20, weight: .medium))
                        .foregroundStyle(.blue)
                        .frame(width: 24, height: 24)

                    VStack(alignment: .leading, spacing: 4) {
                        Text("Listening...")
                            .font(.caption.weight(.medium))
                            .foregroundColor(.secondary)

                        Text(voiceLogManager.onDeviceSpeechManager.liveTranscript)
                            .font(.body)
                            .foregroundColor(.primary)
                            .fixedSize(horizontal: false, vertical: true)
                            .animation(.easeInOut(duration: 0.2), value: voiceLogManager.onDeviceSpeechManager.liveTranscript)
                    }

                    Spacer()
                }
                .padding(16)
                .background(
                    RoundedRectangle(cornerRadius: 16)
                        .fill(Color(.secondarySystemBackground))
                )
                .padding(.horizontal, 16)
                .padding(.vertical, 12)
                .transition(.opacity.combined(with: .scale))
            }
        }
    }

    // MARK: - Processing State View
    private var processingStateView: some View {
        VStack(spacing: 12) {
            HStack(spacing: 12) {
                ProgressView()
                    .progressViewStyle(CircularProgressViewStyle(tint: .blue))
                    .scaleEffect(1.2)

                VStack(alignment: .leading, spacing: 4) {
                    Text(processingTitle)
                        .font(.subheadline.weight(.semibold))
                    Text(processingSubtitle)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }

                Spacer()
            }
            .padding(.horizontal, 20)
            .padding(.top, 16)

            // Show transcription if available
            if let transcription = voiceLogManager.lastTranscription, !transcription.isEmpty {
                VStack(alignment: .leading, spacing: 6) {
                    Text("What I heard:")
                        .font(.caption.weight(.medium))
                        .foregroundColor(.secondary)
                    
                    Text(transcription)
                        .font(.subheadline)
                        .foregroundColor(.primary)
                        .fixedSize(horizontal: false, vertical: true)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(12)
                .background(
                    RoundedRectangle(cornerRadius: 10)
                        .fill(Color.blue.opacity(0.08))
                )
                .padding(.horizontal, 20)
            }

            // Activity indicator bars
            HStack(spacing: 4) {
                ForEach(0..<3) { index in
                    RoundedRectangle(cornerRadius: 2)
                        .fill(Color.blue.opacity(0.3))
                        .frame(height: 4)
                        .overlay(
                            GeometryReader { geometry in
                                RoundedRectangle(cornerRadius: 2)
                                    .fill(Color.blue)
                                    .frame(width: geometry.size.width * progressForBar(index))
                            }
                        )
                }
            }
            .padding(.horizontal, 20)
            .padding(.bottom, 16)
        }
    }

    // MARK: - Success State View
    private var successStateView: some View {
        VStack(spacing: 12) {
            HStack {
                Image(systemName: "checkmark.circle.fill")
                    .font(.title3)
                    .foregroundStyle(.green)

                Text("Successfully Logged")
                    .font(.subheadline.weight(.semibold))

                Spacer()

                Button(action: onDismiss) {
                    Image(systemName: "xmark.circle.fill")
                        .font(.title3)
                        .foregroundStyle(.secondary)
                }
            }
            .padding(.horizontal, 20)
            .padding(.top, 16)

            // Show what was said
            if let transcription = voiceLogManager.lastTranscription, !transcription.isEmpty {
                VStack(alignment: .leading, spacing: 6) {
                    Text("What you said:")
                        .font(.caption.weight(.medium))
                        .foregroundColor(.secondary)
                    
                    Text(transcription)
                        .font(.subheadline)
                        .foregroundColor(.primary)
                        .fixedSize(horizontal: false, vertical: true)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(12)
                .background(
                    RoundedRectangle(cornerRadius: 10)
                        .fill(Color.green.opacity(0.08))
                )
                .padding(.horizontal, 20)
            }

            // Action cards
            if !voiceLogManager.executedActions.isEmpty {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Actions completed:")
                        .font(.caption.weight(.medium))
                        .foregroundColor(.secondary)
                        .padding(.horizontal, 20)
                    
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 10) {
                            ForEach(Array(voiceLogManager.executedActions.enumerated()), id: \.offset) { index, action in
                                ActionSuccessNavbarCard(action: action)
                                    .transition(.asymmetric(
                                        insertion: .scale.combined(with: .opacity)
                                            .animation(.spring().delay(Double(index) * 0.1)),
                                        removal: .opacity
                                    ))
                            }
                        }
                        .padding(.horizontal, 20)
                    }
                    .frame(height: 70)
                }
            }
            
            Spacer().frame(height: 8)
        }
        .padding(.bottom, 16)
    }

    // MARK: - Computed Properties for Collapsed Mini Bar
    private var iconName: String {
        if voiceLogManager.isRecording {
            return "stop.circle.fill"
        } else if voiceLogManager.actionRecognitionState == .recognizing ||
                  voiceLogManager.actionRecognitionState == .executing {
            return "waveform"
        } else if voiceLogManager.actionRecognitionState == .completed {
            return "checkmark.circle.fill"
        }
        return "mic.fill"
    }

    private var iconColor: Color {
        if voiceLogManager.isRecording {
            return .red
        } else if voiceLogManager.actionRecognitionState == .completed {
            return .green
        }
        return .blue
    }

    private var iconBackgroundColor: Color {
        if voiceLogManager.isRecording {
            return Color.red.opacity(0.15)
        } else if voiceLogManager.actionRecognitionState == .completed {
            return Color.green.opacity(0.15)
        }
        return Color.blue.opacity(0.15)
    }

    private var statusTitle: String {
        if voiceLogManager.isRecording {
            return "Recording..."
        } else if voiceLogManager.actionRecognitionState == .recognizing {
            return "Analyzing Audio"
        } else if voiceLogManager.actionRecognitionState == .executing {
            return "Creating Logs"
        } else if voiceLogManager.actionRecognitionState == .completed {
            return "Successfully Logged"
        }
        return "Voice Assistant"
    }

    private var statusSubtitle: String? {
        if voiceLogManager.isRecording {
            return "Speak now"
        } else if voiceLogManager.actionRecognitionState == .recognizing ||
                  voiceLogManager.actionRecognitionState == .executing {
            return "Please wait..."
        } else if voiceLogManager.actionRecognitionState == .completed {
            let count = voiceLogManager.executedActions.count
            return "\(count) action\(count == 1 ? "" : "s") completed"
        }
        return "Ready to record"
    }

    private var processingTitle: String {
        switch voiceLogManager.actionRecognitionState {
        case .recognizing:
            return "Analyzing Audio..."
        case .executing:
            return "Creating Logs..."
        default:
            return "Processing..."
        }
    }

    private var processingSubtitle: String {
        switch voiceLogManager.actionRecognitionState {
        case .recognizing:
            return "Understanding what you said"
        case .executing:
            return "Adding entries to your log"
        default:
            return "Please wait"
        }
    }

    // MARK: - Helper Methods
    private func progressForBar(_ index: Int) -> CGFloat {
        // Simulated progress animation
        switch voiceLogManager.actionRecognitionState {
        case .recognizing:
            return index == 0 ? 1.0 : (index == 1 ? 0.5 : 0.0)
        case .executing:
            return index <= 1 ? 1.0 : 0.5
        default:
            return 0.0
        }
    }
}

// MARK: - Action Success Navbar Card
struct ActionSuccessNavbarCard: View {
    let action: VoiceAction

    var body: some View {
        HStack(spacing: 8) {
            Image(systemName: actionIcon)
                .font(.body)
                .foregroundColor(actionColor)
                .frame(width: 36, height: 36)
                .background(Circle().fill(actionColor.opacity(0.15)))

            VStack(alignment: .leading, spacing: 2) {
                Text(actionTitle)
                    .font(.subheadline.weight(.semibold))
                    .foregroundColor(.primary)

                if let detail = actionDetail {
                    Text(detail)
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }
            }

            Image(systemName: "checkmark.circle.fill")
                .font(.body)
                .foregroundStyle(.green)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(Color(.systemBackground))
        )
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .strokeBorder(actionColor.opacity(0.3), lineWidth: 1.5)
        )
        .shadow(color: .black.opacity(0.08), radius: 4, y: 2)
    }

    private var actionIcon: String {
        switch action.type {
        case .logFood: return "fork.knife"
        case .logWater: return "drop.fill"
        case .logVitamin: return "pills.fill"
        case .addVitamin: return "plus.circle.fill"
        case .logSymptom: return "heart.text.square"
        case .logPUQE: return "chart.line.uptrend.xyaxis"
        case .unknown: return "questionmark.circle"
        }
    }

    private var actionColor: Color {
        switch action.type {
        case .logFood: return .orange
        case .logWater: return .blue
        case .logVitamin: return .green
        case .addVitamin: return .mint
        case .logSymptom: return .purple
        case .logPUQE: return .pink
        case .unknown: return .gray
        }
    }

    private var actionTitle: String {
        switch action.type {
        case .logFood: return action.details.item ?? "Food"
        case .logWater:
            if let amount = action.details.amount, let unit = action.details.unit {
                return "\(amount)\(unit)"
            }
            return "Water"
        case .logVitamin: return action.details.vitaminName ?? action.details.item ?? "Vitamin"
        case .addVitamin: return action.details.vitaminName ?? "New Supplement"
        case .logSymptom: return "Symptom"
        case .logPUQE: return "PUQE"
        case .unknown: return "Unknown"
        }
    }

    private var actionDetail: String? {
        switch action.type {
        case .logFood:
            if let mealType = action.details.mealType {
                return mealType.capitalized
            }
            return nil
        case .logWater:
            return "Water logged"
        case .logVitamin:
            return "Supplement taken"
        case .addVitamin:
            if let frequency = action.details.frequency {
                return "Added - \(frequency.capitalized)"
            }
            return "Added to tracker"
        case .logSymptom:
            if let symptoms = action.details.symptoms {
                return symptoms.joined(separator: ", ")
            }
            return nil
        case .logPUQE:
            return "Score updated"
        default:
            return nil
        }
    }
}

// MARK: - Floating Mic Button (Like Apple Music Search Button)
struct FloatingMicButton: View {
    let isRecording: Bool
    let actionState: VoiceLogManager.ActionRecognitionState
    let onTap: () -> Void

    @State private var pulseAnimation = false
    @State private var lastTapTime: Date = .distantPast
    @State private var instantFeedback = false

    var body: some View {
        Button(action: handleTapWithDebounce) {
            ZStack {
                // Liquid glass circle background (Apple Music style)
                Circle()
                    .fill(.ultraThinMaterial)
                    .frame(width: 56, height: 56)
                    .shadow(color: .black.opacity(0.15), radius: 6, y: 1)

                // Icon with state (24pt icons)
                if isRecording {
                    // Red square for stop
                    RoundedRectangle(cornerRadius: 4)
                        .fill(Color.red)
                        .frame(width: 18, height: 18)
                } else if actionState == .recognizing || actionState == .executing {
                    // Spinner for processing
                    ProgressView()
                        .progressViewStyle(CircularProgressViewStyle(tint: .primary))
                        .scaleEffect(1.1)
                } else if actionState == .completed {
                    // Green checkmark
                    Image(systemName: "checkmark")
                        .font(.system(size: 24, weight: .semibold))
                        .foregroundStyle(.green)
                } else {
                    // Default mic icon (24pt)
                    Image(systemName: "mic.fill")
                        .font(.system(size: 24, weight: .medium))
                        .foregroundStyle(.primary)
                }

                // Pulse ring during recording
                if isRecording {
                    Circle()
                        .stroke(Color.red.opacity(0.4), lineWidth: 3)
                        .frame(width: 70, height: 70)
                        .scaleEffect(pulseAnimation ? 1.2 : 1.0)
                        .opacity(pulseAnimation ? 0 : 0.8)
                        .animation(
                            .easeOut(duration: 1.5).repeatForever(autoreverses: false),
                            value: pulseAnimation
                        )
                        .onAppear {
                            pulseAnimation = true
                        }
                        .onDisappear {
                            pulseAnimation = false
                        }
                }
            }
            .scaleEffect(instantFeedback ? 0.85 : 1.0)
            .animation(.spring(response: 0.3, dampingFraction: 0.6), value: instantFeedback)
            .frame(width: 72, height: 72)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .disabled(actionState == .recognizing || actionState == .executing)
    }
    
    private func handleTapWithDebounce() {
        let now = Date()
        guard now.timeIntervalSince(lastTapTime) > 0.5 else {
            print("🚫 Tap debounced - too soon after last tap")
            return
        }
        lastTapTime = now

        // Instant visual feedback
        instantFeedback = true
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.15) {
            instantFeedback = false
        }

        onTap()
    }
}
