//
//  WorkoutProgressView.swift
//  phoneless-hevy Watch App
//
//  Voice-first workout tracking with focus on the current moment
//

import SwiftUI
import Combine
import WatchKit

struct WorkoutProgressView: View {
    @Environment(WorkoutManager.self) private var workoutManager
    @State private var currentScreen = 1  // Start at logging view (middle screen)
    @Environment(\.dismiss) private var dismiss
    @Environment(\.scenePhase) private var scenePhase
    var onWorkoutEnd: (() -> Void)? = nil  // Callback to dismiss parent views

    // Mock data for preview
    @State private var elapsedTime: TimeInterval = 25
    @State private var heartRate: Double = 144
    @State private var calories: Double = 246
    @State private var timer: AnyCancellable?

    // Phase 5: Manual set navigation
    @State private var selectedExerciseId: String? = nil
    @State private var selectedSetIndex: Int? = nil

    var body: some View {
        TabView(selection: $currentScreen) {
            // Screen 0: End Workout (swipe left from main)
            EndWorkoutView(
                elapsedTime: $elapsedTime,
                onEnd: {
                    Task {
                        await workoutManager.endWorkout()
                        dismiss()
                        // Call parent dismiss to return to main menu
                        onWorkoutEnd?()
                    }
                }
            )
            .tag(0)

            // Screen 1: Logging view (main screen) - SIMPLIFIED
            LoggingView(
                elapsedTime: $elapsedTime,
                selectedExerciseId: $selectedExerciseId,
                selectedSetIndex: $selectedSetIndex
            )
            .tag(1)

            // Screen 2: Superset Context (NEW)
            SupersetContextView()
            .tag(2)

            // Screen 3: Sets history
            SetsHistoryView(
                currentScreen: $currentScreen,
                selectedExerciseId: $selectedExerciseId,
                selectedSetIndex: $selectedSetIndex
            )
                .tag(3)

            // Screen 4: Metrics
            MetricsView(
                elapsedTime: $elapsedTime,
                heartRate: $heartRate,
                calories: $calories
            )
            .tag(4)
        }
        .tabViewStyle(.page)
        .navigationBarBackButtonHidden(true)  // Remove back button - maximize space
        .onAppear {
            startTimer()
        }
        .onDisappear {
            timer?.cancel()
        }
    }

    private func startTimer() {
        timer = Timer.publish(every: 1.0, on: .main, in: .common)
            .autoconnect()
            .sink { _ in
                elapsedTime += 1
                // Simulate changing metrics
                heartRate = Double.random(in: 140...150)
                calories += 1.5
            }
    }
}

// MARK: - Screen 0: End Workout View

struct EndWorkoutView: View {
    @Environment(WorkoutManager.self) private var workoutManager
    @State private var exerciseManager = ExerciseManager.shared
    @Binding var elapsedTime: TimeInterval
    let onEnd: () -> Void

    var body: some View {
        VStack(spacing: 0) {
            // Removed header text - maximize space

            // Workout summary
            ScrollView {
                VStack(spacing: 16) {
                    // Time
                    VStack(spacing: 4) {
                        Text(formatTime(elapsedTime))
                            .font(.system(size: 32, weight: .bold, design: .rounded))
                            .foregroundColor(.blue)
                        Text("Duration")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }

                    Divider()

                    // Stats
                    HStack(spacing: 20) {
                        VStack(spacing: 4) {
                            Text("\(workoutManager.completedSets)")
                                .font(.title2)
                                .fontWeight(.semibold)
                            Text("Sets")
                                .font(.caption2)
                                .foregroundColor(.secondary)
                        }

                        VStack(spacing: 4) {
                            Text("\(workoutManager.currentExercises.count)")
                                .font(.title2)
                                .fontWeight(.semibold)
                            Text("Exercises")
                                .font(.caption2)
                                .foregroundColor(.secondary)
                        }
                    }

                    Divider()

                    // Exercise list
                    if !workoutManager.currentExercises.isEmpty {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Completed")
                                .font(.caption)
                                .fontWeight(.semibold)
                                .foregroundColor(.secondary)
                                .padding(.horizontal)

                            ForEach(Array(workoutManager.currentExercises.enumerated()), id: \.offset) { _, exercise in
                                let exerciseName = exerciseManager.getTemplate(byId: exercise.exerciseTemplateId)?.title ?? exercise.exerciseTemplateId

                                HStack {
                                    Image(systemName: "checkmark.circle.fill")
                                        .font(.caption2)
                                        .foregroundColor(.green)

                                    Text(exerciseName)
                                        .font(.caption)
                                        .lineLimit(1)

                                    Spacer()

                                    Text("\(exercise.completedSets.count) sets")
                                        .font(.caption2)
                                        .foregroundColor(.secondary)
                                }
                                .padding(.horizontal)
                            }
                        }
                    }
                }
                .padding(.vertical)
            }

            Spacer()

            // End button (reduced vertical padding by 20% for space efficiency)
            Button(role: .destructive) {
                onEnd()
            } label: {
                Text("End Workout")
                    .font(.headline)
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 10)
                    .background(.red)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
            }
            .buttonStyle(.plain)
            .padding(.horizontal)
            .padding(.bottom, 8)

            Text("Swipe right to continue")
                .font(.caption2)
                .foregroundColor(.secondary)
                .padding(.bottom, 8)
        }
    }

    private func formatTime(_ interval: TimeInterval) -> String {
        let hours = Int(interval) / 3600
        let minutes = (Int(interval) % 3600) / 60
        let seconds = Int(interval) % 60

        if hours > 0 {
            return String(format: "%d:%02d:%02d", hours, minutes, seconds)
        } else {
            return String(format: "%d:%02d", minutes, seconds)
        }
    }
}

// MARK: - Screen 1: Logging View

enum ProcessingPhase: Equatable {
    case idle
    case transcribing
    case processing
    case completed

    var icon: String {
        switch self {
        case .idle: return "mic.circle.fill"
        case .transcribing: return "waveform.circle.fill"
        case .processing: return "brain.head.profile"
        case .completed: return "checkmark.circle.fill"
        }
    }

    var label: String {
        switch self {
        case .idle: return "Ready"
        case .transcribing: return "Transcribing..."
        case .processing: return "Processing..."
        case .completed: return "Done"
        }
    }

    var stepNumber: Int {
        switch self {
        case .idle: return 0
        case .transcribing: return 1
        case .processing: return 2
        case .completed: return 3
        }
    }
}

struct LoggingView: View {
    @Environment(WorkoutManager.self) private var workoutManager
    @Environment(\.scenePhase) private var scenePhase
    @State private var settings = AppSettings.shared
    @State private var voiceManager = VoiceRecognitionManager()
    @State private var directAudioParser = DirectAudioParser()  // Single-call parser
    @State private var llmParser = LLMWorkoutParser()  // Fallback parser
    @State private var exerciseManager = ExerciseManager.shared
    @Binding var elapsedTime: TimeInterval

    // Phase 5: Manual set navigation
    @Binding var selectedExerciseId: String?
    @Binding var selectedSetIndex: Int?

    // NEW: Historical context & corrections support
    @State private var historyService = WorkoutHistoryService()
    @State private var contextResolver = ContextResolver()
    @State private var actionStack = WorkoutActionStack()

    // UNIFIED CLASSIFIER (replaces 3-call waterfall with single call)
    @State private var unifiedClassifier = UnifiedVoiceCommandClassifier()

    // OLD: Keep as fallback (commented out for now)
    // @State private var correctionClassifier = LLMCorrectionClassifier()
    // @State private var workoutModifier = LLMWorkoutModifier()

    @State private var lastTranscription: String = ""
    @State private var lastParsedExercise: String = "Ready to log"
    @State private var isLoadingExercises: Bool = false
    @State private var processingPhase: ProcessingPhase = .idle
    @State private var showSuccess: Bool = false
    @State private var showError: Bool = false
    @State private var errorMessage: String = ""
    @State private var successMessage: String = ""
    @State private var previousScenePhase: ScenePhase = .inactive
    @State private var buttonsEnabled: Bool = false  // First-load performance fix

    // MARK: - Computed Properties

    /// Get the current set to log (either manually selected or automatic next set)
    private var currentSet: (exercise: WorkoutStateExercise, setNumber: Int)? {
        guard let workoutState = workoutManager.workoutState else { return nil }

        // If user manually selected a set, use that
        if let selectedId = selectedExerciseId,
           let selectedIndex = selectedSetIndex,
           let exercise = workoutState.exercises.first(where: { $0.exerciseTemplateId == selectedId }) {
            return (exercise, selectedIndex + 1)  // Convert 0-based index to 1-based set number
        }

        // Otherwise use automatic next set
        return workoutState.nextSet()
    }

    // MARK: - Helper Views (to fix compiler timeout)

    @ViewBuilder
    private func middleSection(for nextSet: (exercise: WorkoutStateExercise, setNumber: Int)) -> some View {
        Group {
            if processingPhase != .idle && !showSuccess && !showError {
                processingIndicator
            } else if showSuccess {
                successIndicator
            } else if showError {
                errorIndicator
            } else {
                historicalContextSection(for: nextSet)
            }
        }
        .frame(height: 30)  // Very compact - just one line now
        .frame(maxWidth: .infinity)
    }

    @ViewBuilder
    private var processingIndicator: some View {
        VStack(spacing: 8) {
            // Just text, no icons or stepper
            Text(processingPhase.label)
                .font(.callout)
                .fontWeight(.medium)
                .foregroundColor(.primary)

            if !lastTranscription.isEmpty && processingPhase == .processing {
                Text(lastTranscription)
                    .font(.caption2)
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)
                    .lineLimit(2)
                    .padding(.horizontal)
            }
        }
        .padding(.vertical, 10)
        .padding(.horizontal, 12)
        .frame(maxWidth: .infinity)
        .background(Color.blue.opacity(0.1))
        .cornerRadius(10)
        .padding(.horizontal)
        .transition(.opacity.combined(with: .scale(scale: 0.95)))
    }

    @ViewBuilder
    private var successIndicator: some View {
        HStack(spacing: 8) {
            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: 20))
                .foregroundStyle(.green)
                .symbolEffect(.bounce, value: showSuccess)

            Text(successMessage)
                .font(.caption)
                .foregroundColor(.primary)
                .lineLimit(1)
                .minimumScaleFactor(0.8)
        }
        .padding(.vertical, 10)
        .padding(.horizontal, 12)
        .frame(maxWidth: .infinity)
        .background(Color.green.opacity(0.15))
        .cornerRadius(10)
        .padding(.horizontal)
        .transition(.opacity.combined(with: .scale(scale: 0.95)))
        .onAppear {
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
                withAnimation {
                    showSuccess = false
                }
            }
        }
    }

    @ViewBuilder
    private var errorIndicator: some View {
        VStack(spacing: 6) {
            HStack(spacing: 8) {
                Image(systemName: "xmark.circle.fill")
                    .font(.system(size: 20))
                    .foregroundStyle(.red)

                Text(errorMessage)
                    .font(.caption)
                    .foregroundColor(.primary)
                    .lineLimit(2)
            }
            Text("Tap to try again")
                .font(.caption2)
                .foregroundColor(.secondary)
        }
        .padding(.vertical, 10)
        .padding(.horizontal, 12)
        .frame(maxWidth: .infinity)
        .background(Color.red.opacity(0.15))
        .cornerRadius(10)
        .padding(.horizontal)
        .transition(.opacity.combined(with: .scale(scale: 0.95)))
        .onAppear {
            DispatchQueue.main.asyncAfter(deadline: .now() + 3) {
                withAnimation {
                    showError = false
                }
            }
        }
    }

    @ViewBuilder
    private func historicalContextSection(for nextSet: (exercise: WorkoutStateExercise, setNumber: Int)) -> some View {
        // Simple previous performance - one line
        if let lastSets = historyService.getLastWorkoutSets(for: nextSet.exercise.exerciseTemplateId),
           !lastSets.isEmpty {
            let relevantSet: CompletedSet? = {
                if nextSet.setNumber <= lastSets.count {
                    return lastSets[nextSet.setNumber - 1]
                }
                return lastSets.last
            }()

            if let set = relevantSet {
                HStack(spacing: 8) {
                    Text("Last:")
                        .font(.caption2)
                        .foregroundColor(.secondary)

                    if let weight = set.actualWeight {
                        Text("\(formatWeight(weight))kg")
                            .font(.caption)
                            .foregroundColor(.green)
                    }
                    if let reps = set.actualReps {
                        Text("×\(reps)")
                            .font(.caption)
                            .foregroundColor(.green)
                    }
                    if let rpe = set.actualRPE {
                        Text("RPE \(formatRPE(rpe))")
                            .font(.caption2)
                            .foregroundColor(.orange)
                    }
                }
            }
        } else {
            // No history - show set number
            if let plannedCount = nextSet.exercise.plannedSets?.count, plannedCount > 0 {
                Text("Set \(nextSet.setNumber) of \(plannedCount)")
                    .font(.caption)
                    .foregroundColor(.secondary)
            } else {
                Text("Set \(nextSet.setNumber)")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
    }

    private func formatWeight(_ weight: Double) -> String {
        if weight.truncatingRemainder(dividingBy: 1) == 0 {
            return "\(Int(weight))"
        }
        return String(format: "%.1f", weight)
    }

    private func formatRPE(_ rpe: Double) -> String {
        if rpe.truncatingRemainder(dividingBy: 1) == 0 {
            return "\(Int(rpe))"
        }
        return String(format: "%.1f", rpe)
    }

    /// Get preview text for the next set after current
    private func getNextSetPreview(after currentSet: (exercise: WorkoutStateExercise, setNumber: Int)) -> String? {
        guard let workoutState = workoutManager.workoutState else { return nil }

        // Check if there's another set in current exercise
        if let plannedSets = currentSet.exercise.plannedSets,
           currentSet.setNumber < plannedSets.count {
            let nextPlannedSet = plannedSets[currentSet.setNumber]  // 0-indexed
            var parts: [String] = []
            if let weight = nextPlannedSet.targetWeight {
                parts.append("\(Int(weight))kg")
            }
            if let reps = nextPlannedSet.targetReps {
                parts.append("×\(reps)")
            }
            return parts.isEmpty ? "Set \(currentSet.setNumber + 1)" : parts.joined(separator: " ")
        }

        // Check for next exercise in superset or sequence
        if let nextExercise = workoutState.nextExercise() {
            return nextExercise.name
        }

        return nil
    }

    /// Get the next exercise name in superset rotation (for historical context indicator)
    private func getNextExerciseInSuperset(for exercise: WorkoutStateExercise) -> String? {
        guard let supersetId = exercise.supersetId,
              let workoutState = workoutManager.workoutState else {
            return nil
        }

        // Get next exercise in superset rotation
        guard let nextExercise = workoutState.nextInSuperset(after: exercise.exerciseTemplateId) else {
            return nil
        }

        // Don't show if it's the same exercise (only one exercise in superset)
        if nextExercise.exerciseTemplateId == exercise.exerciseTemplateId {
            return nil
        }

        return nextExercise.name
    }


    var body: some View {
        // Guard against nil workout state on initial load
        if workoutManager.workoutState == nil {
            VStack {
                ProgressView()
                    .scaleEffect(0.8)
                Text("Starting workout...")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        } else {
            mainContent
        }
    }

    @ViewBuilder
    private var mainContent: some View {
        VStack(spacing: 0) {
            // Removed timer and header - maximize space for content

            // Central focus area - ALWAYS show exercise name and buttons
            VStack(spacing: 8) {  // Compact spacing to prevent overflow
                // Show next exercise/set name - ALWAYS visible
                if let nextSet = currentSet {
                    VStack(spacing: 6) {
                        Text(nextSet.exercise.name)
                            .font(.system(size: 20, weight: .bold, design: .rounded))
                            .foregroundColor(.primary)
                            .multilineTextAlignment(.center)
                            .lineLimit(2)
                            .minimumScaleFactor(0.65)

                        // DYNAMIC MIDDLE SECTION - changes based on state (FIXED HEIGHT to prevent layout shifts)
                        middleSection(for: nextSet)
                    }
                } else if let nextExercise = workoutManager.workoutState?.nextExercise() {
                    Text(nextExercise.name)
                        .font(.system(size: 24, weight: .bold, design: .rounded))
                        .foregroundColor(.primary)
                        .multilineTextAlignment(.center)
                        .lineLimit(3)
                        .minimumScaleFactor(0.7)
                } else {
                    Text("Ready")
                        .font(.system(size: 24, weight: .bold, design: .rounded))
                        .foregroundColor(.secondary)
                }

                // Action buttons row - only visible when exercise is loaded
                if currentSet != nil {
                    HStack(spacing: 16) {
                        // Microphone button - with icon
                        VStack(spacing: 6) {
                            if voiceManager.isListening {
                                WaveformView()
                                    .frame(height: 44)
                                    .transition(.scale.combined(with: .opacity))
                            } else {
                                Image(systemName: "waveform")
                                    .font(.system(size: 44, weight: .medium))
                                    .foregroundStyle(.blue)
                                    .symbolEffect(.variableColor.iterative.reversing, options: .speed(0.8).repeat(4))
                                    .transition(.scale.combined(with: .opacity))
                            }

                            Text(voiceManager.isListening ? "Tap to Stop" : "Record")
                                .font(.caption2)
                                .foregroundColor(.secondary)
                        }
                        .opacity(buttonsEnabled ? 1.0 : 0.5)

                        // Use Last button (if history available)
                        if let nextSet = currentSet,
                           historyService.getLastWorkoutSets(for: nextSet.exercise.exerciseTemplateId) != nil {
                            Button {
                                guard buttonsEnabled else { return }
                                WKInterfaceDevice.current().play(.click)

                                Task {
                                    await workoutManager.quickRepeatFromHistory(
                                        exerciseTemplateId: nextSet.exercise.exerciseTemplateId,
                                        exerciseName: nextSet.exercise.name,
                                        historyService: historyService
                                    )

                                    if let lastLogged = workoutManager.getLastLoggedSetInfo() {
                                        contextResolver.updateAfterLog(
                                            exercise: lastLogged.exercise,
                                            set: lastLogged.set,
                                            setNumber: lastLogged.setNumber
                                        )
                                    }

                                    // Quick success flash
                                    withAnimation(.spring(duration: 0.2, bounce: 0.5)) {
                                        showSuccess = true
                                        successMessage = "✓"
                                    }
                                }
                            } label: {
                                VStack(spacing: 6) {
                                    Image(systemName: "clock.arrow.circlepath")
                                        .font(.system(size: 40, weight: .medium))
                                        .foregroundStyle(.green)
                                        .symbolEffect(.bounce, value: showSuccess)

                                    Text("Use Last")
                                        .font(.caption2)
                                        .foregroundColor(.secondary)
                                }
                            }
                            .buttonStyle(.plain)
                            .opacity(buttonsEnabled ? 1.0 : 0.5)
                            .disabled(!buttonsEnabled)
                        }
                    }
                    .transition(.opacity.combined(with: .scale))
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)  // Take available space
            .contentShape(Rectangle())
            .onTapGesture {
                guard buttonsEnabled else { return }  // Prevent accidental presses during first load
                if voiceManager.isListening {
                    // INSTANT FEEDBACK: Haptic + visual feedback
                    WKInterfaceDevice.current().play(.start)
                    withAnimation(.spring(duration: 0.3, bounce: 0.4)) {
                        processingPhase = .transcribing
                    }

                    Task {
                        await voiceManager.stopListening()

                        // Move to processing phase
                        withAnimation(.spring(duration: 0.35, bounce: 0.3)) {
                            processingPhase = .processing
                        }

                        // Store transcription
                        if !voiceManager.recognizedText.isEmpty {
                            lastTranscription = voiceManager.recognizedText
                        }

                        // Use the comprehensive voice command processor
                        await processVoiceCommand(voiceManager.recognizedText)

                        // Clean up audio file
                        voiceManager.cleanupLastAudio()
                    }
                } else {
                    // INSTANT START: Begin listening immediately with smooth animation
                    withAnimation(.spring(duration: 0.25, bounce: 0.3)) {
                        voiceManager.startListening()
                    }
                }
            }

            // Note: Routine progress is now shown on the second screen (Sets History)
            // via WorkoutState which tracks the living workout document

            Spacer()
        }
        .safeAreaInset(edge: .top) {
            // Superset indicator at very top
            if let nextSet = currentSet,
               let supersetId = nextSet.exercise.supersetId,
               let position = workoutManager.workoutState?.getSupersetPosition(nextSet.exercise.exerciseTemplateId),
               let group = workoutManager.workoutState?.getSupersetGroup(for: nextSet.exercise.exerciseTemplateId) {
                HStack {
                    Spacer()
                    SupersetIndicatorCompact(context: SupersetContext(
                        id: supersetId,
                        position: position,
                        totalInSuperset: group.count
                    ))
                    Spacer()
                }
                .padding(.vertical, 4)
                .background(.ultraThinMaterial)
                .transition(.move(edge: .top).combined(with: .opacity))
            }
        }
        .handGestureShortcut(.primaryAction)
        .onAppear {
            // Delay button activation to prevent accidental presses during first-load layout shifts
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                withAnimation(.easeIn(duration: 0.2)) {
                    buttonsEnabled = true
                }
            }

            Task {
                // Fetch exercise templates if needed
                isLoadingExercises = true
                await exerciseManager.fetchExerciseTemplates()
                isLoadingExercises = false

                // Request voice authorization
                await voiceManager.requestAuthorization()

                // Prefetch workout history for all exercises in routine
                if let exercises = workoutManager.workoutState?.exercises {
                    let exerciseIds = exercises.map { $0.exerciseTemplateId }
                    await historyService.prefetchHistory(for: exerciseIds)
                }
            }
        }
        .onChange(of: scenePhase) { oldPhase, newPhase in
            guard settings.enableWristRaiseRecording else { return }

            // Wrist raise: inactive/background → active
            if previousScenePhase != .active && newPhase == .active {
                // Only auto-start if not already listening and not in middle of processing
                if !voiceManager.isListening && processingPhase == .idle && !showSuccess && !showError {
                    print("🤙 [WristRaise] Detected wrist raise - auto-starting recording")
                    WKInterfaceDevice.current().play(.start)
                    withAnimation(.spring(duration: 0.25, bounce: 0.3)) {
                        voiceManager.startListening()
                    }
                }
            }

            // Wrist lower: active → inactive/background
            if previousScenePhase == .active && newPhase != .active {
                // Only auto-stop if currently listening
                if voiceManager.isListening {
                    print("🤙 [WristLower] Detected wrist lower - auto-stopping recording")
                    WKInterfaceDevice.current().play(.start)
                    withAnimation(.spring(duration: 0.3, bounce: 0.4)) {
                        processingPhase = .transcribing
                    }

                    Task {
                        await voiceManager.stopListening()

                        withAnimation(.spring(duration: 0.35, bounce: 0.3)) {
                            processingPhase = .processing
                        }

                        // Store transcription
                        if !voiceManager.recognizedText.isEmpty {
                            lastTranscription = voiceManager.recognizedText
                        }

                        // Use the comprehensive voice command processor
                        await processVoiceCommand(voiceManager.recognizedText)

                        // Clean up audio file
                        voiceManager.cleanupLastAudio()
                    }
                }
            }

            // Update previous phase for next comparison
            previousScenePhase = newPhase
        }
    }

    private func formatSetSummary(_ parsed: ParsedWorkoutCommand) -> String {
        var parts: [String] = [parsed.exerciseName]

        if let weight = parsed.set.weightKg {
            let lbs = Int(weight / 0.453592)
            parts.append("\(lbs) lbs")
        }
        if let reps = parsed.set.reps {
            parts.append("\(reps) reps")
        }
        if let rpe = parsed.set.rpe {
            parts.append("RPE \(String(format: "%.1f", rpe))")
        }

        return parts.joined(separator: " · ")
    }

    private func formatTime(_ interval: TimeInterval) -> String {
        let minutes = Int(interval) / 60
        let seconds = Int(interval) % 60
        return String(format: "%d:%02d", minutes, seconds)
    }

    // MARK: - Voice Command Processing with Corrections

    /// Process transcribed text - check for corrections, modifications, then normal commands
    private func processVoiceCommand(_ transcription: String) async {
        // UNIFIED CLASSIFIER: Single LLM call with full context (routine + history + conversation)
        guard let command = await unifiedClassifier.classify(
            transcription,
            workoutState: workoutManager.workoutState,
            historyService: historyService,
            contextResolver: contextResolver
        ) else {
            // Parsing failed
            errorMessage = "Couldn't understand"
            WKInterfaceDevice.current().play(.failure)
            withAnimation(.spring(duration: 0.4, bounce: 0.4)) {
                processingPhase = .idle
                showError = true
            }
            return
        }

        // Dispatch based on command type
        switch command {
        case .logSet(let exerciseTemplateId, let exerciseName, let weight, let reps, let rpe, let setType):
            await handleLogSet(
                exerciseTemplateId: exerciseTemplateId,
                exerciseName: exerciseName,
                weight: weight,
                reps: reps,
                rpe: rpe,
                setType: setType
            )

        case .switchExercise(let from, let to):
            await handleSwitchExercise(from: from, to: to)

        case .addExercise(let name, let setCount, let repsTarget):
            await handleAddExercise(name: name, setCount: setCount, repsTarget: repsTarget)

        case .skipExercise:
            await handleSkipExercise()

        case .undo:
            await handleUndo()

        case .editLastSet(let changes):
            await handleEditLastSet(changes: changes)

        case .editSet(let setNumber, let exerciseName, let changes):
            await handleEditSet(setNumber: setNumber, exerciseName: exerciseName, changes: changes)

        case .deleteSet(let setNumber, let exerciseName):
            await handleDeleteSet(setNumber: setNumber, exerciseName: exerciseName)
        }
    }

    // MARK: - Unified Command Handlers

    private func handleLogSet(
        exerciseTemplateId: String,
        exerciseName: String,
        weight: Double?,
        reps: Int?,
        rpe: Double?,
        setType: SetType
    ) async {
        guard let workoutState = workoutManager.workoutState else { return }

        // Record action for undo
        let setIndex = workoutState.exercises
            .first(where: { $0.exerciseTemplateId == exerciseTemplateId })?
            .completedSets.count ?? 0

        // Log the set
        workoutManager.addSet(
            exerciseTemplateId: exerciseTemplateId,
            exerciseName: exerciseName,
            weight: weight,
            reps: reps,
            rpe: rpe,
            setType: setType
        )

        // Clear manual selection after logging
        selectedExerciseId = nil
        selectedSetIndex = nil

        // Record undo action
        actionStack.recordAddSet(
            exerciseId: exerciseTemplateId,
            setIndex: setIndex,
            set: CompletedSet(
                actualWeight: weight,
                actualReps: reps,
                actualRPE: rpe
            )
        )

        // Update context resolver
        if let exercise = workoutManager.workoutState?.exercises
            .first(where: { $0.exerciseTemplateId == exerciseTemplateId }),
           let lastSet = exercise.completedSets.last {
            contextResolver.updateAfterLog(
                exercise: exercise,
                set: lastSet,
                setNumber: exercise.completedSets.count
            )
        }

        // Show success
        var summary = exerciseName
        if let w = weight, let r = reps {
            summary += ": \(Int(w))kg × \(r)"
        } else if let w = weight {
            summary += ": \(Int(w))kg"
        } else if let r = reps {
            summary += ": ×\(r)"
        }
        if let rpe = rpe {
            summary += " @ RPE \(String(format: "%.1f", rpe))"
        }

        successMessage = summary
        WKInterfaceDevice.current().play(.success)
        withAnimation(.spring(duration: 0.4, bounce: 0.5)) {
            processingPhase = .idle
            showSuccess = true
        }
    }

    private func handleSwitchExercise(from: String, to: String) async {
        // Find current exercise
        guard let currentExercise = workoutManager.workoutState?.exercises.first(where: {
            $0.name.lowercased().contains(from.lowercased()) || from.lowercased().contains($0.name.lowercased())
        }) else {
            errorMessage = "Current exercise not found"
            withAnimation {
                processingPhase = .idle
                showError = true
            }
            return
        }

        // Match new exercise name to template with scoring
        guard let match = findBestExerciseMatch(name: to) else {
            errorMessage = "Couldn't find exercise: \(to)"
            WKInterfaceDevice.current().play(.failure)
            withAnimation {
                processingPhase = .idle
                showError = true
            }
            return
        }

        // Check match quality
        if match.score < 60.0 {
            errorMessage = "Not sure about '\(to)' - try being more specific"
            WKInterfaceDevice.current().play(.failure)
            withAnimation {
                processingPhase = .idle
                showError = true
            }
            return
        }

        // Switch exercise
        workoutManager.switchExercise(
            from: currentExercise.exerciseTemplateId,
            to: match.template.id,
            newName: match.template.title
        )

        successMessage = "Switched to \(match.template.title)"
        WKInterfaceDevice.current().play(.success)
        withAnimation {
            processingPhase = .idle
            showSuccess = true
        }
    }

    private func handleAddExercise(name: String, setCount: Int?, repsTarget: Int?) async {
        // Match exercise name to template with scoring
        guard let match = findBestExerciseMatch(name: name) else {
            errorMessage = "Couldn't find exercise: \(name)"
            WKInterfaceDevice.current().play(.failure)
            withAnimation {
                processingPhase = .idle
                showError = true
            }
            return
        }

        // Check match quality - reject poor matches
        if match.score < 60.0 {
            errorMessage = "Not sure about '\(name)' - try being more specific"
            WKInterfaceDevice.current().play(.failure)
            withAnimation {
                processingPhase = .idle
                showError = true
            }
            return
        }

        // Add to workout with planned sets
        workoutManager.addExerciseToWorkout(
            templateId: match.template.id,
            name: match.template.title,
            setCount: setCount,
            repsTarget: repsTarget
        )

        // Show set count in success message
        let setCountText = setCount.map { " (\($0) sets)" } ?? " (3 sets)"
        successMessage = "Added \(match.template.title)\(setCountText)"
        WKInterfaceDevice.current().play(.success)
        withAnimation {
            processingPhase = .idle
            showSuccess = true
        }
    }

    private func handleSkipExercise() async {
        // Mark current exercise as complete
        if let currentExercise = workoutManager.workoutState?.currentExercise() {
            workoutManager.workoutState?.completeExercise(currentExercise.exerciseTemplateId)
            successMessage = "Skipped \(currentExercise.name)"
            WKInterfaceDevice.current().play(.success)
            withAnimation {
                processingPhase = .idle
                showSuccess = true
            }
        } else {
            errorMessage = "No exercise to skip"
            withAnimation {
                processingPhase = .idle
                showError = true
            }
        }
    }

    private func handleUndo() async {
        guard let workoutState = workoutManager.workoutState else { return }

        let result = actionStack.undo(in: workoutState)

        switch result {
        case .success(let message):
            successMessage = message
            WKInterfaceDevice.current().play(.success)
            withAnimation {
                processingPhase = .idle
                showSuccess = true
            }
        case .failure(let error):
            errorMessage = error
            WKInterfaceDevice.current().play(.failure)
            withAnimation {
                processingPhase = .idle
                showError = true
            }
        }
    }

    private func handleEditLastSet(changes: SetEditChanges) async {
        guard let workoutState = workoutManager.workoutState else { return }

        // Find last logged set
        if let lastLogged = workoutManager.getLastLoggedSetInfo() {
            var updatedSet = lastLogged.set

            // Apply changes
            if let weight = changes.weightKg { updatedSet.actualWeight = weight }
            if let reps = changes.reps { updatedSet.actualReps = reps }
            if let rpe = changes.rpe { updatedSet.actualRPE = rpe }

            // Update in workout state
            workoutState.updateSet(
                lastLogged.exercise.exerciseTemplateId,
                at: lastLogged.setNumber - 1,
                with: updatedSet
            )

            successMessage = "Set updated"
            WKInterfaceDevice.current().play(.success)
            withAnimation {
                processingPhase = .idle
                showSuccess = true
            }
        } else {
            errorMessage = "No set to edit"
            withAnimation {
                processingPhase = .idle
                showError = true
            }
        }
    }

    private func handleEditSet(setNumber: Int, exerciseName: String?, changes: SetEditChanges) async {
        guard let workoutState = workoutManager.workoutState else { return }

        // Find the exercise
        var targetExercise: WorkoutStateExercise?

        if let name = exerciseName {
            // Find by name (fuzzy match)
            targetExercise = workoutState.exercises.first {
                $0.name.lowercased().contains(name.lowercased()) ||
                name.lowercased().contains($0.name.lowercased())
            }
        }

        // If no exercise found by name, or no exercise specified, use current/last exercise
        if targetExercise == nil {
            targetExercise = workoutState.currentExercise() ?? workoutState.exercises.last
        }

        guard let exercise = targetExercise else {
            errorMessage = "Exercise not found"
            withAnimation {
                processingPhase = .idle
                showError = true
            }
            return
        }

        // Determine which set to edit
        let setIndex = setNumber - 1  // Convert to 0-indexed

        // Validate set index
        guard setIndex >= 0 && setIndex < exercise.completedSets.count else {
            errorMessage = "Set \(setNumber) not found"
            withAnimation {
                processingPhase = .idle
                showError = true
            }
            return
        }

        // Get the set and apply changes
        var updatedSet = exercise.completedSets[setIndex]

        if let weight = changes.weightKg { updatedSet.actualWeight = weight }
        if let reps = changes.reps { updatedSet.actualReps = reps }
        if let rpe = changes.rpe { updatedSet.actualRPE = rpe }

        // Update in workout state
        workoutState.updateSet(
            exercise.exerciseTemplateId,
            at: setIndex,
            with: updatedSet
        )

        successMessage = "Set \(setNumber) updated"
        WKInterfaceDevice.current().play(.success)
        withAnimation {
            processingPhase = .idle
            showSuccess = true
        }
    }

    private func handleDeleteSet(setNumber: Int?, exerciseName: String?) async {
        errorMessage = "Delete not yet implemented"
        withAnimation {
            processingPhase = .idle
            showError = true
        }
    }

    // MARK: - Legacy Handlers (keep for reference, will be removed later)

    /// Handle correction commands (undo, edit, delete)
    private func handleCorrectionCommand(_ command: CorrectionCommandParser.CommandType) async {
        guard let workoutState = workoutManager.workoutState else { return }

        switch command {
        case .undo:
            let result = actionStack.undo(in: workoutState)

            switch result {
            case .success(let message):
                successMessage = message
                WKInterfaceDevice.current().play(.success)
                withAnimation {
                    showSuccess = true
                }
            case .failure(let error):
                errorMessage = error
                WKInterfaceDevice.current().play(.failure)
                withAnimation {
                    showError = true
                }
            }

        case .editLastSet(let changes):
            // Find last logged set
            if let lastLogged = workoutManager.getLastLoggedSetInfo() {
                var updatedSet = lastLogged.set

                // Apply changes
                if let weight = changes.newWeight { updatedSet.actualWeight = weight }
                if let reps = changes.newReps { updatedSet.actualReps = reps }
                if let rpe = changes.newRPE { updatedSet.actualRPE = rpe }

                // Update in workout state
                workoutState.updateSet(
                    lastLogged.exercise.exerciseTemplateId,
                    at: lastLogged.setNumber - 1,
                    with: updatedSet
                )

                successMessage = "Set updated"
                WKInterfaceDevice.current().play(.success)
                withAnimation {
                    showSuccess = true
                }
            } else {
                errorMessage = "No set to edit"
                withAnimation {
                    showError = true
                }
            }

        case .editSet(let reference, let changes):
            // Find specific set by reference
            // First, find the exercise
            var targetExercise: WorkoutStateExercise?

            if let exerciseName = reference.targetExercise {
                // Find by name (fuzzy match)
                targetExercise = workoutState.exercises.first {
                    $0.name.lowercased().contains(exerciseName.lowercased()) ||
                    exerciseName.lowercased().contains($0.name.lowercased())
                }
            }

            // If no exercise found by name, or no exercise specified, use current/last exercise
            if targetExercise == nil {
                targetExercise = workoutState.currentExercise() ?? workoutState.exercises.last
            }

            guard let exercise = targetExercise else {
                errorMessage = "Exercise not found"
                withAnimation {
                    showError = true
                }
                return
            }

            // Determine which set to edit
            let setIndex: Int
            if let specifiedSetNumber = reference.setNumber {
                setIndex = specifiedSetNumber - 1  // Convert to 0-indexed
            } else {
                // No set number specified, use last set of the exercise
                setIndex = exercise.completedSets.count - 1
            }

            // Validate set index
            guard setIndex >= 0 && setIndex < exercise.completedSets.count else {
                errorMessage = "Set \(reference.setNumber ?? 0) not found"
                withAnimation {
                    showError = true
                }
                return
            }

            // Get the set and apply changes
            var updatedSet = exercise.completedSets[setIndex]

            if let weight = changes.newWeight { updatedSet.actualWeight = weight }
            if let reps = changes.newReps { updatedSet.actualReps = reps }
            if let rpe = changes.newRPE { updatedSet.actualRPE = rpe }
            if let duration = changes.newDuration { updatedSet.actualDuration = duration }

            // Update in workout state
            workoutState.updateSet(
                exercise.exerciseTemplateId,
                at: setIndex,
                with: updatedSet
            )

            successMessage = "Set \(setIndex + 1) updated"
            WKInterfaceDevice.current().play(.success)
            withAnimation {
                showSuccess = true
            }

        case .deleteSet:
            errorMessage = "Delete not yet implemented"
            withAnimation {
                showError = true
            }

        case .replaceExercise:
            errorMessage = "Replace exercise not yet implemented"
            withAnimation {
                showError = true
            }
        }

        // Reset processing state
        withAnimation {
            processingPhase = .idle
        }
    }

    /// Handle workout modification commands (add/switch exercise) - USE CASE 2 & 4
    private func handleModificationCommand(_ modification: WorkoutModification) async {
        switch modification {
        case .addExercise(let name, let setCount, let repsTarget):
            // Match exercise name to template with scoring
            guard let match = findBestExerciseMatch(name: name) else {
                errorMessage = "Couldn't find exercise: \(name)"
                WKInterfaceDevice.current().play(.failure)
                withAnimation {
                    processingPhase = .idle
                    showError = true
                }
                return
            }

            // Check match quality - reject poor matches
            if match.score < 60.0 {
                errorMessage = "Not sure about '\(name)' - try being more specific"
                WKInterfaceDevice.current().play(.failure)
                withAnimation {
                    processingPhase = .idle
                    showError = true
                }
                return
            }

            // Add to workout with planned sets
            workoutManager.addExerciseToWorkout(
                templateId: match.template.id,
                name: match.template.title,
                setCount: setCount,
                repsTarget: repsTarget
            )

            // Show set count in success message
            let setCountText = setCount.map { " (\($0) sets)" } ?? " (3 sets)"
            successMessage = "Added \(match.template.title)\(setCountText)"
            WKInterfaceDevice.current().play(.success)
            withAnimation {
                processingPhase = .idle
                showSuccess = true
            }

        case .switchExercise(let from, let to):
            // Find current exercise
            guard let currentExercise = workoutManager.workoutState?.exercises.first(where: {
                $0.name.lowercased().contains(from.lowercased()) || from.lowercased().contains($0.name.lowercased())
            }) else {
                errorMessage = "Current exercise not found"
                withAnimation {
                    processingPhase = .idle
                    showError = true
                }
                return
            }

            // Match new exercise name to template with scoring
            guard let match = findBestExerciseMatch(name: to) else {
                errorMessage = "Couldn't find exercise: \(to)"
                WKInterfaceDevice.current().play(.failure)
                withAnimation {
                    processingPhase = .idle
                    showError = true
                }
                return
            }

            // Check match quality
            if match.score < 60.0 {
                errorMessage = "Not sure about '\(to)' - try being more specific"
                WKInterfaceDevice.current().play(.failure)
                withAnimation {
                    processingPhase = .idle
                    showError = true
                }
                return
            }

            // Switch exercise
            workoutManager.switchExercise(
                from: currentExercise.exerciseTemplateId,
                to: match.template.id,
                newName: match.template.title
            )

            successMessage = "Switched to \(match.template.title)"
            WKInterfaceDevice.current().play(.success)
            withAnimation {
                processingPhase = .idle
                showSuccess = true
            }

        case .skipExercise:
            // Mark current exercise as complete
            if let currentExercise = workoutManager.workoutState?.currentExercise() {
                workoutManager.workoutState?.completeExercise(currentExercise.exerciseTemplateId)
                successMessage = "Skipped \(currentExercise.name)"
                WKInterfaceDevice.current().play(.success)
                withAnimation {
                    processingPhase = .idle
                    showSuccess = true
                }
            } else {
                errorMessage = "No exercise to skip"
                withAnimation {
                    processingPhase = .idle
                    showError = true
                }
            }
        }
    }

    /// Find exercise template by name (fuzzy matching)
    /// Find best exercise match using scoring algorithm
    /// Returns tuple of (template, score) or nil if no good match found
    private func findBestExerciseMatch(name: String) -> (template: ExerciseTemplate, score: Double)? {
        var candidates: [(ExerciseTemplate, Double)] = []

        let queryLower = name.lowercased().trimmingCharacters(in: .whitespaces)
        let queryWords = queryLower.split(separator: " ").map(String.init)

        for template in exerciseManager.exerciseTemplates {
            let titleLower = template.title.lowercased()
            var score = 0.0

            // 1. Exact match (score: 100)
            if titleLower == queryLower {
                score = 100.0
            }
            // 2. Exact match of singular/plural (score: 95)
            else if titleLower == queryLower + "s" || titleLower + "s" == queryLower {
                score = 95.0
            }
            // 3. Title contains query as whole word (score: 80)
            else if titleLower.contains(" \(queryLower) ") ||
                    titleLower.hasPrefix("\(queryLower) ") ||
                    titleLower.hasSuffix(" \(queryLower)") {
                score = 80.0
            }
            // 4. All query words in title (score: 60 * ratio)
            else {
                let titleWords = titleLower.split(separator: " ").map(String.init)
                let matchedWords = queryWords.filter { qWord in
                    titleWords.contains { tWord in
                        tWord.contains(qWord) || qWord.contains(tWord)
                    }
                }

                if matchedWords.count == queryWords.count && queryWords.count > 0 {
                    score = 60.0 * (Double(matchedWords.count) / Double(queryWords.count))
                }
            }

            // Bonus: Prefer common exercises (+5)
            if isCommonExercise(template) {
                score += 5.0
            }

            if score > 0 {
                candidates.append((template, score))
            }
        }

        // Return highest scoring match
        return candidates.max(by: { $0.1 < $1.1 })
    }

    /// Check if exercise is a common/popular one
    private func isCommonExercise(_ template: ExerciseTemplate) -> Bool {
        let common = ["bench press", "squat", "deadlift", "pull-up", "pull up", "chin-up",
                      "row", "press", "curl", "extension", "fly", "lunge", "dip"]
        return common.contains { template.title.lowercased().contains($0) }
    }

    /// Legacy method - now calls findBestExerciseMatch
    private func findExerciseTemplate(name: String) -> ExerciseTemplate? {
        return findBestExerciseMatch(name: name)?.template
    }

    // Note: Context management functions removed - now handled by WorkoutState in WorkoutManager
    // WorkoutState.addCompletedSet() and WorkoutState.nextSet() provide this functionality
}

// MARK: - Screen 2: Superset Context View

struct SupersetContextView: View {
    @Environment(WorkoutManager.self) private var workoutManager
    @State private var exerciseManager = ExerciseManager.shared

    var body: some View {
        ScrollView {
            VStack(spacing: 12) {
                // Check if current exercise is in a superset
                if let currentExercise = workoutManager.workoutState?.currentExercise(),
                   let supersetId = currentExercise.supersetId,
                   let supersetGroup = workoutManager.workoutState?.getSupersetGroup(for: currentExercise.exerciseTemplateId) {

                    // Show all exercises in superset as cards
                    ForEach(Array(supersetGroup.enumerated()), id: \.offset) { index, exercise in
                        let isCurrent = exercise.exerciseTemplateId == currentExercise.exerciseTemplateId
                        let plannedSetCount = exercise.plannedSets?.count ?? 0
                        let completedCount = exercise.completedSets.count
                        let lastSet = exercise.completedSets.last

                        VStack(alignment: .leading, spacing: 8) {
                            // Exercise name
                            Text(exercise.name)
                                .font(.headline)
                                .foregroundColor(isCurrent ? .blue : .primary)
                                .lineLimit(2)
                                .minimumScaleFactor(0.8)

                            // Dots for sets
                            if plannedSetCount > 0 {
                                HStack(spacing: 4) {
                                    ForEach(0..<plannedSetCount, id: \.self) { setIndex in
                                        Circle()
                                            .fill(setIndex < completedCount ? Color.green : Color.secondary.opacity(0.3))
                                            .frame(width: 8, height: 8)
                                    }
                                }
                            }

                            // Last set info
                            if let lastSet = lastSet {
                                HStack(spacing: 6) {
                                    if let weight = lastSet.actualWeight {
                                        Text("\(Int(weight))kg")
                                            .font(.caption)
                                            .foregroundColor(.secondary)
                                    }
                                    if let reps = lastSet.actualReps {
                                        Text("×\(reps)")
                                            .font(.caption)
                                            .foregroundColor(.secondary)
                                    }
                                    if let rpe = lastSet.actualRPE {
                                        Text("RPE \(rpe, specifier: "%.1f")")
                                            .font(.caption)
                                            .foregroundColor(.secondary)
                                    }
                                }
                            }
                        }
                        .padding(12)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(isCurrent ? Color.blue.opacity(0.15) : Color.secondary.opacity(0.08))
                        .cornerRadius(12)
                        .overlay(
                            RoundedRectangle(cornerRadius: 12)
                                .stroke(isCurrent ? Color.blue : Color.clear, lineWidth: 2)
                        )
                    }

                } else {
                    // Not in a superset
                    VStack(spacing: 12) {
                        Image(systemName: "square.stack")
                            .font(.system(size: 40))
                            .foregroundColor(.secondary)

                        Text("Not in a superset")
                            .font(.callout)
                            .foregroundColor(.secondary)
                    }
                    .frame(maxHeight: .infinity)
                    .padding()
                }
            }
            .padding(.horizontal, 12)
            .padding(.top, 8)
        }
    }
}

// MARK: - Screen 3: Sets History View

struct SetsHistoryView: View {
    @Environment(WorkoutManager.self) private var workoutManager
    @State private var exerciseManager = ExerciseManager.shared
    @State private var reviewingSetIndex: Int?
    @State private var reviewingExerciseId: String?
    @State private var autoResumeTimer: Timer?
    @State private var historyService = WorkoutHistoryService()
    @State private var exerciseHistory: [String: [CompletedSet]] = [:]

    // Phase 5: Manual set navigation
    @Binding var currentScreen: Int
    @Binding var selectedExerciseId: String?
    @Binding var selectedSetIndex: Int?

    var body: some View {
        let headerTitle = workoutManager.currentRoutine != nil ? "Workout Plan" : "Sets"

        VStack(spacing: 0) {
            // "Back to Current" button (shown when reviewing a set)
            if reviewingSetIndex != nil && reviewingExerciseId != nil {
                Button {
                    clearReview()
                } label: {
                    HStack {
                        Image(systemName: "arrow.left")
                            .font(.caption)
                        Text("Back to Current")
                            .font(.caption)
                            .fontWeight(.medium)
                    }
                    .foregroundColor(.blue)
                    .padding(.vertical, 6)
                    .padding(.horizontal, 12)
                    .background(.ultraThinMaterial)
                    .cornerRadius(16)
                }
                .buttonStyle(.plain)
                .padding(.top, 4)
                .transition(.move(edge: .top).combined(with: .opacity))
            }

            // Remove VStack wrapper, use ScrollView directly for space efficiency
            ScrollView {
                LazyVStack(spacing: 6, pinnedViews: [.sectionHeaders]) {
                    Section {
                        // Show workout state exercises
                        ForEach(Array(workoutManager.currentExercises.enumerated()), id: \.offset) { exerciseIndex, exercise in
                            WorkoutStateExerciseRow(
                                exercise: exercise,
                                index: exerciseIndex,
                                exerciseManager: exerciseManager,
                                reviewingSetIndex: $reviewingSetIndex,
                                reviewingExerciseId: $reviewingExerciseId,
                                currentScreen: $currentScreen,
                                selectedExerciseId: $selectedExerciseId,
                                selectedSetIndex: $selectedSetIndex,
                                historicalSets: exerciseHistory[exercise.exerciseTemplateId]
                            )
                        }

                        // Empty state
                        if workoutManager.completedSets == 0 {
                            VStack(spacing: 12) {
                                Image(systemName: "list.bullet")
                                    .font(.system(size: 40))
                                    .foregroundColor(.secondary)

                                Text("No sets logged yet")
                                    .font(.callout)
                                    .foregroundColor(.secondary)

                                Text("Swipe left to start logging")
                                    .font(.caption2)
                                    .foregroundColor(.secondary.opacity(0.6))
                            }
                            .frame(maxHeight: .infinity)
                            .padding()
                        }
                    } header: {
                        // Sticky header - stays visible while scrolling, saves space
                        Text(headerTitle)
                            .font(.system(size: 18, weight: .semibold, design: .rounded))
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 6)
                            .background(.ultraThinMaterial)
                    }
                }
                .padding(.horizontal, 8)
            }
        }
        .onChange(of: reviewingSetIndex) { _, newValue in
            // Start auto-resume timer when reviewing a set
            if newValue != nil {
                startAutoResumeTimer()
            }
        }
        .onAppear {
            Task {
                await fetchAllExerciseHistory()
            }
        }
    }

    private func clearReview() {
        autoResumeTimer?.invalidate()
        autoResumeTimer = nil
        withAnimation(.spring(duration: 0.3, bounce: 0.4)) {
            reviewingSetIndex = nil
            reviewingExerciseId = nil
        }
    }

    private func startAutoResumeTimer() {
        autoResumeTimer?.invalidate()
        autoResumeTimer = Timer.scheduledTimer(withTimeInterval: 5.0, repeats: false) { _ in
            clearReview()
        }
    }

    private func fetchAllExerciseHistory() async {
        for exercise in workoutManager.currentExercises {
            if let history = try? await historyService.fetchLastWorkout(for: exercise.exerciseTemplateId) {
                exerciseHistory[exercise.exerciseTemplateId] = history
            }
        }
    }
}

// MARK: - Screen 3: Metrics View

struct MetricsView: View {
    @Binding var elapsedTime: TimeInterval
    @Binding var heartRate: Double
    @Binding var calories: Double

    var body: some View {
        // Make scrollable so all content is visible
        ScrollView {
            VStack(spacing: 24) {
                // Heart Rate
                VStack(spacing: 8) {
                    Image(systemName: "heart.fill")
                        .font(.system(size: 40))
                        .foregroundColor(.red)

                    Text("\(Int(heartRate))")
                        .font(.system(size: 32, weight: .bold, design: .rounded))

                    Text("BPM")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }

                // Calories
                VStack(spacing: 8) {
                    Image(systemName: "flame.fill")
                        .font(.system(size: 40))
                        .foregroundColor(.orange)

                    Text("\(Int(calories))")
                        .font(.system(size: 32, weight: .bold, design: .rounded))

                    Text("Calories")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }

                // Duration
                VStack(spacing: 8) {
                    Image(systemName: "timer")
                        .font(.system(size: 40))
                        .foregroundColor(.blue)

                    Text(formatTime(elapsedTime))
                        .font(.system(size: 32, weight: .bold, design: .rounded))

                    Text("Duration")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
            .padding(.vertical)
        }
    }

    private func formatTime(_ interval: TimeInterval) -> String {
        let minutes = Int(interval) / 60
        let seconds = Int(interval) % 60
        return String(format: "%d:%02d", minutes, seconds)
    }
}

// MARK: - Compact Metric Component

struct CompactMetric: View {
    let icon: String
    let value: String
    let color: Color

    var body: some View {
        HStack(spacing: 4) {
            Image(systemName: icon)
                .font(.caption2)
                .foregroundColor(color)
            Text(value)
                .font(.caption)
                .fontWeight(.medium)
        }
    }
}

// MARK: - Waveform View

struct WaveformView: View {
    @State private var amplitudes: [CGFloat] = Array(repeating: 0.3, count: 12)
    @State private var timer: Timer?

    var body: some View {
        HStack(spacing: 3) {
            ForEach(0..<12, id: \.self) { index in
                RoundedRectangle(cornerRadius: 2)
                    .fill(.blue)
                    .frame(width: 3)
                    .frame(height: amplitudes[index] * 40)
            }
        }
        .onAppear {
            startAnimation()
        }
        .onDisappear {
            timer?.invalidate()
        }
    }

    private func startAnimation() {
        timer = Timer.scheduledTimer(withTimeInterval: 0.1, repeats: true) { _ in
            withAnimation(.easeInOut(duration: 0.1)) {
                amplitudes = amplitudes.map { _ in
                    CGFloat.random(in: 0.2...1.0)
                }
            }
        }
    }
}

// MARK: - Workout State Exercise Row

struct WorkoutStateExerciseRow: View {
    let exercise: WorkoutStateExercise
    let index: Int
    let exerciseManager: ExerciseManager
    @Binding var reviewingSetIndex: Int?
    @Binding var reviewingExerciseId: String?

    // Phase 5: Manual set navigation
    @Binding var currentScreen: Int
    @Binding var selectedExerciseId: String?
    @Binding var selectedSetIndex: Int?

    // Historical data for comparison
    let historicalSets: [CompletedSet]?

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            // Exercise name with completion status
            HStack {
                Text("\(index + 1). \(exercise.name)")
                    .font(.caption)
                    .fontWeight(.semibold)

                Spacer()

                // Show completion checkmark if exercise is completed
                if exercise.isCompleted {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.caption2)
                        .foregroundColor(.green)
                }

                // Show progress
                if let plannedCount = exercise.plannedSets?.count {
                    Text("\(exercise.completedSets.count)/\(plannedCount)")
                        .font(.caption2)
                        .foregroundColor(exercise.isCompleted ? .green : .blue)
                } else {
                    Text("\(exercise.completedSets.count) sets")
                        .font(.caption2)
                        .foregroundColor(.blue)
                }
            }

            // Show completed sets
            ForEach(Array(exercise.completedSets.enumerated()), id: \.offset) { setIndex, set in
                let isReviewing = reviewingSetIndex == setIndex && reviewingExerciseId == exercise.exerciseTemplateId

                VStack(alignment: .leading, spacing: 2) {
                    HStack {
                        Text("Set \(setIndex + 1)")
                            .font(.caption2)
                            .foregroundColor(isReviewing ? .blue : .secondary)
                            .fontWeight(isReviewing ? .semibold : .regular)

                        Spacer()

                        if let weight = set.actualWeight {
                            Text("\(Int(weight)) kg")
                                .font(.caption2)
                                .fontWeight(isReviewing ? .semibold : .regular)
                        }

                        if let reps = set.actualReps {
                            Text("×\(reps)")
                                .font(.caption2)
                                .fontWeight(isReviewing ? .semibold : .regular)
                        }

                        if let rpe = set.actualRPE {
                            Text("RPE \(String(format: "%.1f", rpe))")
                                .font(.caption2)
                                .foregroundColor(isReviewing ? .blue : .orange)
                                .fontWeight(isReviewing ? .semibold : .regular)
                        }

                        Image(systemName: isReviewing ? "eye.circle.fill" : "checkmark.circle.fill")
                            .font(.caption2)
                            .foregroundColor(isReviewing ? .blue : .green)
                    }

                    // Show historical comparison (if available)
                    if let historicalSets = historicalSets,
                       setIndex < historicalSets.count {
                        let lastSet = historicalSets[setIndex]
                        HStack(spacing: 4) {
                            Text("Last:")
                                .font(.caption2)
                                .foregroundColor(.secondary.opacity(0.7))

                            if let weight = lastSet.actualWeight {
                                Text("\(Int(weight))kg")
                                    .font(.caption2)
                                    .foregroundColor(.secondary.opacity(0.7))
                            }

                            if let reps = lastSet.actualReps {
                                Text("×\(reps)")
                                    .font(.caption2)
                                    .foregroundColor(.secondary.opacity(0.7))
                            }

                            if let rpe = lastSet.actualRPE {
                                Text("RPE \(String(format: "%.1f", rpe))")
                                    .font(.caption2)
                                    .foregroundColor(.secondary.opacity(0.7))
                            }
                        }
                        .padding(.leading, 48)
                    }
                }
                .padding(.vertical, 2)
                .padding(.horizontal, 6)
                .background(
                    RoundedRectangle(cornerRadius: 6)
                        .fill(isReviewing ? Color.blue.opacity(0.15) : Color.clear)
                        .overlay(
                            RoundedRectangle(cornerRadius: 6)
                                .strokeBorder(isReviewing ? Color.blue : Color.clear, lineWidth: 2)
                        )
                )
                .contentShape(Rectangle())
                .onTapGesture {
                    WKInterfaceDevice.current().play(.click)
                    // Phase 5: Navigate to this set for logging
                    withAnimation {
                        selectedExerciseId = exercise.exerciseTemplateId
                        selectedSetIndex = setIndex
                        currentScreen = 1  // Switch to logging view
                    }
                }
            }

            // Show remaining planned sets (if any)
            if let plannedSets = exercise.plannedSets {
                let remainingCount = max(0, plannedSets.count - exercise.completedSets.count)
                if remainingCount > 0 {
                    ForEach(exercise.completedSets.count..<plannedSets.count, id: \.self) { setIndex in
                        let plannedSet = plannedSets[setIndex]
                        HStack {
                            Text("Set \(setIndex + 1)")
                                .font(.caption2)
                                .foregroundColor(.secondary.opacity(0.5))

                            Spacer()

                            if let weight = plannedSet.targetWeight {
                                Text("\(Int(weight)) kg")
                                    .font(.caption2)
                                    .foregroundColor(.secondary.opacity(0.5))
                            }

                            if let reps = plannedSet.targetReps {
                                Text("×\(reps)")
                                    .font(.caption2)
                                    .foregroundColor(.secondary.opacity(0.5))
                            }

                            Image(systemName: "circle")
                                .font(.caption2)
                                .foregroundColor(.secondary.opacity(0.3))
                        }
                        .contentShape(Rectangle())
                        .onTapGesture {
                            WKInterfaceDevice.current().play(.click)
                            // Phase 5: Navigate to this planned set for logging
                            withAnimation {
                                selectedExerciseId = exercise.exerciseTemplateId
                                selectedSetIndex = setIndex
                                currentScreen = 1  // Switch to logging view
                            }
                        }
                    }
                }
            }
        }
        .padding(.vertical, 4)
        .padding(.horizontal, 8)
        .background(Color.secondary.opacity(0.1))
        .cornerRadius(8)
    }
}

#Preview {
    WorkoutProgressView()
        .environment(WorkoutManager())
}
