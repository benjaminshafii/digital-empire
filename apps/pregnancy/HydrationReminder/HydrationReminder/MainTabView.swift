import SwiftUI
import PhotosUI

struct MainTabView: View {
    @EnvironmentObject var notificationManager: NotificationManager
    @EnvironmentObject var logsManager: LogsManager
    @State private var showingDisclaimer = !UserDefaults.standard.bool(forKey: "hasAcceptedDisclaimer")
    @StateObject private var voiceLogManager = VoiceLogManager.shared
    @StateObject private var openAIManager = OpenAIManager.shared
    @StateObject private var supplementManager = SupplementManager()
    @StateObject private var photoLogManager = PhotoFoodLogManager()
    @State private var showAPIKeyError = false

    // Photo logging states
    @State private var showingCamera = false
    @State private var showingPhotoOptions = false
    @State private var capturedImage: UIImage?
    @State private var selectedItem: PhotosPickerItem?
    @State private var tempImageData: Data?
    @State private var notes = ""
    @State private var selectedMealType: MealType?
    @State private var selectedDate = Date()
    @State private var showingPhotoPicker = false
    @State private var isProcessingPhoto = false
    @State private var photoProcessingProgress: PhotoProcessingStage = .none

    enum PhotoProcessingStage {
        case none
        case uploading
        case analyzing
        case recognized
        case complete

        var message: String {
            switch self {
            case .none: return ""
            case .uploading: return "Uploading photo..."
            case .analyzing: return "Analyzing with AI..."
            case .recognized: return "Food recognized!"
            case .complete: return "Added to activity log"
            }
        }
    }

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
            // Floating action pill with mic and camera - hide when processing (pill shows status)
            if shouldShowFAB {
                FloatingActionPill(
                    isRecording: voiceLogManager.isRecording,
                    actionState: voiceLogManager.actionRecognitionState,
                    onMicTap: handleVoiceTap,
                    onCameraTap: handlePhotoTap
                )
                .padding(.trailing, 20)
                .padding(.bottom, 90)
                .transition(.scale.combined(with: .opacity))
            }
        }
        .animation(.spring(response: 0.4, dampingFraction: 0.8), value: shouldShowPill)
        .confirmationDialog("Add Food Photo", isPresented: $showingPhotoOptions) {
            Button("Take Photo") {
                showingCamera = true
            }
            Button("Choose from Library") {
                showingPhotoPicker = true
            }
            Button("Cancel", role: .cancel) { }
        } message: {
            Text("How would you like to add a food photo?")
        }
        .sheet(isPresented: $showingCamera) {
            CameraView(image: $capturedImage)
                .onDisappear {
                    if let image = capturedImage,
                       let data = image.jpegData(compressionQuality: 0.8) {
                        tempImageData = data
                        capturedImage = nil
                        notes = ""
                        selectedMealType = nil
                        selectedDate = Date()
                        savePhotoLog()
                    }
                }
        }
        .sheet(isPresented: $showingPhotoPicker) {
            PhotosPicker(
                selection: $selectedItem,
                matching: .images,
                photoLibrary: .shared()
            ) {
                VStack(spacing: 20) {
                    Image(systemName: "photo.on.rectangle.angled")
                        .font(.system(size: 60))
                        .foregroundColor(.blue)
                    Text("Tap to Select Photo")
                        .font(.title2)
                        .fontWeight(.semibold)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
        }
        .onChange(of: selectedItem) { oldValue, newItem in
            Task {
                if let newItem = newItem {
                    if let data = try? await newItem.loadTransferable(type: Data.self) {
                        tempImageData = data
                        selectedItem = nil
                        showingPhotoPicker = false
                        notes = ""
                        selectedMealType = nil
                        selectedDate = Date()
                        savePhotoLog()
                    }
                }
            }
        }
    }

    private var shouldShowFAB: Bool {
        // Hide during voice processing (VoiceCompactPill takes over)
        let isVoiceProcessing = voiceLogManager.actionRecognitionState == .recognizing ||
                               voiceLogManager.actionRecognitionState == .executing ||
                               voiceLogManager.actionRecognitionState == .completed

        // Hide during photo processing
        let isPhotoProcessing = isProcessingPhoto

        return !isVoiceProcessing && !isPhotoProcessing
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

    private func handlePhotoTap() {
        print("📸 Photo FAB tapped")

        // Check OpenAI API key (required for photo analysis)
        if !openAIManager.hasAPIKey {
            print("📸 ❌ No API key - showing error banner")
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

        // Show photo options dialog
        showingPhotoOptions = true

        // Haptic feedback
        let impactFeedback = UIImpactFeedbackGenerator(style: .light)
        impactFeedback.impactOccurred()
    }

    private func savePhotoLog() {
        guard let data = tempImageData else { return }

        isProcessingPhoto = true
        photoProcessingProgress = .uploading

        // Add to photo log manager
        photoLogManager.addPhotoLog(
            imageData: data,
            notes: notes,
            mealType: selectedMealType,
            date: selectedDate
        )

        // Create initial log entry
        let logId = UUID()
        let initialLog = LogEntry(
            id: logId,
            date: selectedDate,
            type: .food,
            source: .manual,
            notes: notes.isEmpty ? "Analyzing photo..." : notes,
            foodName: "Processing..."
        )
        logsManager.logEntries.append(initialLog)
        logsManager.saveLogs()

        // Async AI analysis
        Task {
            do {
                await MainActor.run {
                    photoProcessingProgress = .analyzing
                }

                let analysis = try await OpenAIManager.shared.analyzeFood(imageData: data)

                await MainActor.run {
                    photoProcessingProgress = .recognized
                }

                let totalCalories = analysis.totalCalories ?? 0
                let totalProtein = Int(analysis.totalProtein ?? 0)
                let totalCarbs = Int(analysis.totalCarbs ?? 0)
                let totalFat = Int(analysis.totalFat ?? 0)

                let foodNames = analysis.items.map { $0.name }.joined(separator: ", ")
                let finalNotes = notes.isEmpty ? "Photo: \(foodNames)" : "\(notes)\nDetected: \(foodNames)"

                await MainActor.run {
                    if let index = logsManager.logEntries.firstIndex(where: { $0.id == logId }) {
                        logsManager.logEntries[index].notes = finalNotes
                        logsManager.logEntries[index].foodName = foodNames
                        logsManager.logEntries[index].calories = totalCalories
                        logsManager.logEntries[index].protein = totalProtein
                        logsManager.logEntries[index].carbs = totalCarbs
                        logsManager.logEntries[index].fat = totalFat
                        logsManager.saveLogs()
                        logsManager.objectWillChange.send()
                    }

                    photoProcessingProgress = .complete

                    DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
                        isProcessingPhoto = false
                        photoProcessingProgress = .none
                    }
                }
            } catch {
                await MainActor.run {
                    if let index = logsManager.logEntries.firstIndex(where: { $0.id == logId }) {
                        logsManager.logEntries[index].notes = notes.isEmpty ? "Photo logged (AI analysis failed)" : notes
                        logsManager.logEntries[index].foodName = "Photo logged"
                        logsManager.saveLogs()
                        logsManager.objectWillChange.send()
                    }

                    photoProcessingProgress = .complete
                    isProcessingPhoto = false
                }
                print("Failed to analyze photo: \(error)")
            }
        }

        tempImageData = nil
        notes = ""
        selectedMealType = nil
        selectedDate = Date()
    }

}
