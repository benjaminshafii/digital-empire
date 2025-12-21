import SwiftUI

struct MainTabView: View {
    @EnvironmentObject var notificationManager: NotificationManager
    @EnvironmentObject var logsManager: LogsManager
    @State private var showingDisclaimer = !UserDefaults.standard.bool(forKey: "hasAcceptedDisclaimer")
    @StateObject private var voiceLogManager = VoiceLogManager.shared
    @StateObject private var openAIManager = OpenAIManager.shared
    @StateObject private var supplementManager = SupplementManager()
    @State private var showAPIKeyError = false

    var body: some View {
        mainView
            .overlay(alignment: .top) {
                if showAPIKeyError {
                    APIKeyErrorBanner(onDismiss: {
                        showAPIKeyError = false
                    })
                    .transition(.move(edge: .top).combined(with: .opacity))
                    .padding(.top, 50)
                }
            }
            .fullScreenCover(isPresented: $showingDisclaimer) {
                DisclaimerView(isPresented: $showingDisclaimer)
            }
            .onAppear {
                voiceLogManager.configure(logsManager: logsManager, supplementManager: supplementManager)
            }
    }

    @ViewBuilder
    private var mainView: some View {
        ZStack(alignment: .bottom) {
            tabView
        }
        .overlay(alignment: .bottom) {
            // Compact pill that appears above tab bar during voice interactions
            if shouldShowPill {
                VoiceCompactPill(voiceLogManager: voiceLogManager)
                    .padding(.horizontal, 16)
                    .padding(.bottom, 100)
                    .transition(.move(edge: .bottom).combined(with: .opacity))
                    .onTapGesture {
                        if voiceLogManager.actionRecognitionState == .completed {
                            withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                                voiceLogManager.clearExecutedActions()
                            }
                        }
                    }
            }
        }
        .overlay(alignment: .bottomTrailing) {
            // Floating mic button - hide when processing (pill shows status)
            if voiceLogManager.actionRecognitionState == .idle || voiceLogManager.isRecording {
                FloatingMicButton(
                    isRecording: voiceLogManager.isRecording,
                    actionState: voiceLogManager.actionRecognitionState,
                    onTap: handleVoiceTap
                )
                .padding(.trailing, 20)
                .padding(.bottom, 90)
                .transition(.scale.combined(with: .opacity))
            }
        }
        .animation(.spring(response: 0.4, dampingFraction: 0.8), value: shouldShowPill)
    }

    private var shouldShowPill: Bool {
        voiceLogManager.isRecording ||
        voiceLogManager.actionRecognitionState == .recognizing ||
        voiceLogManager.actionRecognitionState == .executing ||
        voiceLogManager.isProcessingVoice ||
        (voiceLogManager.actionRecognitionState == .completed && !voiceLogManager.executedActions.isEmpty)
    }

    private var tabView: some View {
        TabView {
            Tab("Dashboard", systemImage: "house.fill") {
                DashboardView()
            }

            Tab("Logs", systemImage: "list.clipboard") {
                LogLedgerView(logsManager: logsManager)
            }

            Tab("PUQE", systemImage: "chart.line.uptrend.xyaxis") {
                PUQEScoreView()
            }

            Tab("More", systemImage: "ellipsis.circle") {
                MoreView()
                    .environmentObject(logsManager)
                    .environmentObject(notificationManager)
            }
        }
        .tint(.blue)
        .tabViewStyle(.sidebarAdaptable)
        .tabBarMinimizeBehavior(.onScrollDown)
    }


    private func handleVoiceTap() {
        print("🎯🎯🎯 ============================================")
        print("🎯🎯🎯 handleVoiceTap() CALLED")
        print("🎯🎯🎯 ============================================")
        print("🎯 Current state - isRecording: \(voiceLogManager.isRecording)")
        print("🎯 Current state - actionRecognitionState: \(voiceLogManager.actionRecognitionState)")

        if !openAIManager.hasAPIKey {
            print("🎯 ❌ No API key - showing error banner")
            withAnimation(.spring(response: 0.3)) {
                showAPIKeyError = true
            }
            DispatchQueue.main.asyncAfter(deadline: .now() + 4) {
                withAnimation {
                    showAPIKeyError = false
                }
            }
            return
        }

        if voiceLogManager.isRecording {
            print("🎯 Currently recording - calling stopRecording()")
            voiceLogManager.stopRecording()
            print("🎯 stopRecording() returned")
        } else {
            print("🎯 Not recording - calling startRecording()")
            voiceLogManager.startRecording()
            print("🎯 startRecording() returned")
        }

        let impactFeedback = UIImpactFeedbackGenerator(style: voiceLogManager.isRecording ? .medium : .light)
        impactFeedback.impactOccurred()
        print("🎯 Haptic feedback triggered")
        print("🎯🎯🎯 ============================================")
        print("🎯🎯🎯 handleVoiceTap() COMPLETE")
        print("🎯🎯🎯 ============================================")
    }

}
