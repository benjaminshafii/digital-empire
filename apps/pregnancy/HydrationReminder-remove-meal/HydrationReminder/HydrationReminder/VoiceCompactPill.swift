import SwiftUI

// MARK: - Voice Compact Pill (iOS 26 Liquid Glass Design)
struct VoiceCompactPill: View {
    @ObservedObject var voiceLogManager: VoiceLogManager

    var body: some View {
        HStack(spacing: 12) {
            // Status icon
            statusIcon

            // Content
            VStack(alignment: .leading, spacing: 2) {
                Text(statusTitle)
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .foregroundColor(.primary)

                if let subtitle = statusSubtitle {
                    Text(subtitle)
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .lineLimit(nil)
                        .fixedSize(horizontal: false, vertical: true)
                        .multilineTextAlignment(.leading)
                }
            }

            Spacer()

            // Trailing indicator
            trailingContent
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background(
            RoundedRectangle(cornerRadius: 20, style: .continuous)
                .fill(.ultraThinMaterial)
                .shadow(color: statusColor.opacity(0.2), radius: 12, y: 4)
                .overlay(
                    RoundedRectangle(cornerRadius: 20, style: .continuous)
                        .strokeBorder(statusColor.opacity(0.3), lineWidth: 1.5)
                        .blendMode(.overlay)
                )
        )
        .overlay(
            // Accent border
            RoundedRectangle(cornerRadius: 20, style: .continuous)
                .strokeBorder(
                    LinearGradient(
                        colors: [statusColor.opacity(0.6), statusColor.opacity(0.2)],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    ),
                    lineWidth: 1
                )
        )
    }

    // MARK: - Status Icon
    @ViewBuilder
    private var statusIcon: some View {
        ZStack {
            Circle()
                .fill(statusColor.opacity(0.15))
                .frame(width: 36, height: 36)

            Image(systemName: statusIconName)
                .font(.system(size: 16, weight: .semibold))
                .foregroundStyle(statusColor)
        }
    }

    // MARK: - Trailing Content
    @ViewBuilder
    private var trailingContent: some View {
        // Only show ONE indicator based on state priority
        // CRITICAL: Don't use statusColor here - it causes duplicate views during transitions
        let isProcessing = voiceLogManager.actionRecognitionState == .recognizing ||
                          voiceLogManager.actionRecognitionState == .executing

        if isProcessing {
            // Fixed color - no dynamic dependencies that could cause recreation
            ProgressView()
                .progressViewStyle(CircularProgressViewStyle())
                .scaleEffect(0.9)
                .tint(.blue)  // Fixed blue color - never changes
        } else if voiceLogManager.actionRecognitionState == .completed {
            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: 20, weight: .semibold))
                .foregroundStyle(.green)
        } else {
            // Explicitly return EmptyView for all other states (including .idle and when recording)
            EmptyView()
        }
    }

    // MARK: - Computed Properties
    private var statusColor: Color {
        if voiceLogManager.isRecording {
            return .red
        } else if voiceLogManager.actionRecognitionState == .recognizing {
            return .blue
        } else if voiceLogManager.actionRecognitionState == .executing {
            return .orange
        } else if voiceLogManager.actionRecognitionState == .completed {
            return .green
        }
        return .gray
    }

    private var statusIconName: String {
        if voiceLogManager.isRecording {
            return "waveform"
        } else if voiceLogManager.actionRecognitionState == .recognizing {
            return "sparkles"
        } else if voiceLogManager.actionRecognitionState == .executing {
            return "gearshape.2.fill"
        } else if voiceLogManager.actionRecognitionState == .completed {
            return "checkmark.circle.fill"
        }
        return "mic.fill"
    }

    private var statusTitle: String {
        if voiceLogManager.isRecording {
            return "Recording..."
        } else if voiceLogManager.actionRecognitionState == .recognizing {
            return "Analyzing"
        } else if voiceLogManager.actionRecognitionState == .executing {
            return "Logging entries"
        } else if voiceLogManager.actionRecognitionState == .completed {
            let count = voiceLogManager.executedActions.count
            return "Logged \(count) item\(count == 1 ? "" : "s")"
        }
        return "Ready"
    }

    private var statusSubtitle: String? {
        if voiceLogManager.isRecording {
            if !voiceLogManager.onDeviceSpeechManager.liveTranscript.isEmpty {
                return voiceLogManager.onDeviceSpeechManager.liveTranscript
            }
            return "Tap mic to stop"
        } else if voiceLogManager.actionRecognitionState == .recognizing {
            if !voiceLogManager.onDeviceSpeechManager.liveTranscript.isEmpty {
                return voiceLogManager.onDeviceSpeechManager.liveTranscript
            }
            return "Processing with AI..."
        } else if voiceLogManager.actionRecognitionState == .executing {
            return voiceLogManager.lastTranscription
        } else if voiceLogManager.actionRecognitionState == .completed {
            // Show summary of first action
            if let firstAction = voiceLogManager.executedActions.first {
                return getActionSummary(firstAction)
            }
            return "Success!"
        }
        return nil
    }

    private func getActionSummary(_ action: VoiceAction) -> String {
        switch action.type {
        case .logFood:
            return action.details.item ?? "Food"
        case .logWater:
            if let amount = action.details.amount, let unit = action.details.unit {
                return "\(amount) \(unit) water"
            }
            return "Water"
        case .logVitamin:
            return action.details.vitaminName ?? action.details.item ?? "Supplement"
        case .addVitamin:
            return "New: \(action.details.vitaminName ?? "supplement")"
        case .logSymptom:
            if let symptoms = action.details.symptoms {
                return symptoms.joined(separator: ", ")
            }
            return "Symptoms"
        case .logPUQE:
            return "PUQE Score"
        case .unknown:
            return "Unknown"
        }
    }
}
