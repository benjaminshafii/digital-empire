import SwiftUI

// MARK: - Floating Action Pill
/// A vertically-oriented pill containing two circular action buttons:
/// - Top: Microphone for voice logging
/// - Bottom: Camera for photo food logging
///
/// Follows iOS 26 Liquid Glass design patterns with:
/// - .ultraThinMaterial background
/// - Capsule shape for pill container
/// - Individual circular buttons (56pt)
/// - Touch targets (72pt minimum)
/// - Debouncing (0.5 second)
/// - Haptic feedback
/// - Scale animations

struct FloatingActionPill: View {
    // MARK: - Dependencies
    let isRecording: Bool
    let actionState: VoiceLogManager.ActionRecognitionState
    let onMicTap: () -> Void
    let onCameraTap: () -> Void

    // MARK: - State
    @State private var micPulseAnimation = false
    @State private var lastMicTapTime: Date = .distantPast
    @State private var lastCameraTapTime: Date = .distantPast
    @State private var micFeedback = false
    @State private var cameraFeedback = false

    var body: some View {
        VStack(spacing: 12) {
            // Top: Microphone button
            micButton

            // Bottom: Camera button
            cameraButton
        }
        .padding(.vertical, 8)
        .padding(.horizontal, 8)
        .background(
            Capsule()
                .fill(.ultraThinMaterial)
                .shadow(color: .black.opacity(0.15), radius: 8, y: 2)
        )
        .frame(width: 72, height: 160)
    }

    // MARK: - Mic Button
    private var micButton: some View {
        Button(action: handleMicTap) {
            ZStack {
                Circle()
                    .fill(.ultraThinMaterial)
                    .frame(width: 56, height: 56)

                // Icon based on voice state
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
                    // Default mic icon
                    Image(systemName: "mic.fill")
                        .font(.system(size: 24, weight: .medium))
                        .foregroundStyle(.primary)
                }

                // Pulse ring during recording
                if isRecording {
                    Circle()
                        .stroke(Color.red.opacity(0.4), lineWidth: 3)
                        .frame(width: 70, height: 70)
                        .scaleEffect(micPulseAnimation ? 1.2 : 1.0)
                        .opacity(micPulseAnimation ? 0 : 0.8)
                        .animation(
                            .easeOut(duration: 1.5).repeatForever(autoreverses: false),
                            value: micPulseAnimation
                        )
                        .onAppear {
                            micPulseAnimation = true
                        }
                        .onDisappear {
                            micPulseAnimation = false
                        }
                }
            }
            .scaleEffect(micFeedback ? 0.85 : 1.0)
            .animation(.spring(response: 0.3, dampingFraction: 0.6), value: micFeedback)
        }
        .buttonStyle(.plain)
        .disabled(actionState == .recognizing || actionState == .executing)
        .accessibilityLabel("Voice recording")
        .accessibilityHint("Double tap to start recording food and water intake")
        .accessibilityValue(isRecording ? "Recording" : actionState == .recognizing || actionState == .executing ? "Processing" : "Idle")
    }

    // MARK: - Camera Button
    private var cameraButton: some View {
        Button(action: handleCameraTap) {
            ZStack {
                Circle()
                    .fill(.ultraThinMaterial)
                    .frame(width: 56, height: 56)

                Image(systemName: "camera.fill")
                    .font(.system(size: 24, weight: .medium))
                    .foregroundStyle(.orange)
            }
            .scaleEffect(cameraFeedback ? 0.85 : 1.0)
            .animation(.spring(response: 0.3, dampingFraction: 0.6), value: cameraFeedback)
        }
        .buttonStyle(.plain)
        .accessibilityLabel("Photo food logging")
        .accessibilityHint("Double tap to take a photo or choose from library")
    }

    // MARK: - Handlers
    private func handleMicTap() {
        let now = Date()
        guard now.timeIntervalSince(lastMicTapTime) > 0.5 else {
            print("🚫 Mic tap debounced")
            return
        }
        lastMicTapTime = now

        // Visual feedback
        micFeedback = true
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.15) {
            micFeedback = false
        }

        // Haptic feedback
        let impactFeedback = UIImpactFeedbackGenerator(style: .medium)
        impactFeedback.impactOccurred()

        onMicTap()
    }

    private func handleCameraTap() {
        let now = Date()
        guard now.timeIntervalSince(lastCameraTapTime) > 0.5 else {
            print("🚫 Camera tap debounced")
            return
        }
        lastCameraTapTime = now

        // Visual feedback
        cameraFeedback = true
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.15) {
            cameraFeedback = false
        }

        // Haptic feedback
        let impactFeedback = UIImpactFeedbackGenerator(style: .light)
        impactFeedback.impactOccurred()

        onCameraTap()
    }
}

// MARK: - Preview
#Preview {
    ZStack {
        Color(.systemGroupedBackground)
            .ignoresSafeArea()

        VStack {
            Spacer()
            HStack {
                Spacer()
                FloatingActionPill(
                    isRecording: false,
                    actionState: .idle,
                    onMicTap: {
                        print("Mic tapped")
                    },
                    onCameraTap: {
                        print("Camera tapped")
                    }
                )
                .padding(.trailing, 20)
                .padding(.bottom, 90)
            }
        }
    }
}
