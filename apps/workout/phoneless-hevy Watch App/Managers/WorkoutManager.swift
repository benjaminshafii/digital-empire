//
//  WorkoutManager.swift
//  phoneless-hevy Watch App
//
//  Created by Claude Code on 10/22/25.
//

import Foundation
import HealthKit
import Observation

@Observable
class WorkoutManager: NSObject {
    // MARK: - Published Properties
    var workoutSession: HKWorkoutSession?
    var builder: HKLiveWorkoutBuilder?

    // Workout metrics
    var heartRate: Double = 0
    var activeCalories: Double = 0
    var elapsedTime: TimeInterval = 0

    // Workout state
    var isWorkoutActive: Bool = false
    var isPaused: Bool = false
    var workoutStartDate: Date?

    // THE WORKOUT - Living document that gets modified by voice
    var workoutState: WorkoutState?
    var currentWorkoutId: String?  // Track Hevy workout ID for updates

    // MARK: - Convenience Accessors
    var completedSets: Int {
        workoutState?.totalCompletedSets() ?? 0
    }

    var currentExercises: [WorkoutStateExercise] {
        workoutState?.exercises ?? []
    }

    var currentRoutine: Routine? {
        // Check if workout was started from a routine
        workoutState?.exercises.first?.isFromRoutine == true ? nil : nil
        // TODO: Store original routine reference if needed
    }

    // MARK: - Private Properties
    private let healthStore = HKHealthStore()
    private var startDate: Date?

    // MARK: - Initialization
    override init() {
        super.init()
    }

    // MARK: - Workout Control Methods

    /// Start a new workout session
    /// - Parameter routine: Optional routine to follow
    func startWorkout(routine: Routine? = nil) {
        // Initialize workout state
        if let routine = routine {
            workoutState = WorkoutState.fromRoutine(routine)
            print("✅ Started workout from routine: \(routine.title)")
        } else {
            workoutState = WorkoutState.freeWorkout()
            print("✅ Started free workout")
        }

        let configuration = HKWorkoutConfiguration()
        configuration.activityType = .traditionalStrengthTraining
        configuration.locationType = .indoor

        do {
            workoutSession = try HKWorkoutSession(healthStore: healthStore, configuration: configuration)
            builder = workoutSession?.associatedWorkoutBuilder()

            workoutSession?.delegate = self
            builder?.delegate = self

            // Set data source for workout builder
            builder?.dataSource = HKLiveWorkoutDataSource(
                healthStore: healthStore,
                workoutConfiguration: configuration
            )

            // Start the workout session
            startDate = Date()
            workoutStartDate = startDate
            workoutSession?.startActivity(with: startDate)

            // Begin collecting data
            builder?.beginCollection(withStart: startDate!) { success, error in
                if success {
                    self.isWorkoutActive = true
                    self.isPaused = false

                    // 🔥 USE CASE 3: Create workout in Hevy immediately
                    Task { @MainActor in
                        await self.createWorkoutInHevy()
                    }
                }
            }
        } catch {
            print("Failed to start workout: \(error.localizedDescription)")
        }
    }

    /// Pause the current workout
    func pauseWorkout() {
        guard let session = workoutSession else { return }
        session.pause()
        isPaused = true
    }

    /// Resume a paused workout
    func resumeWorkout() {
        guard let session = workoutSession else { return }
        session.resume()
        isPaused = false
    }

    /// End the current workout session
    func endWorkout() async {
        guard let session = workoutSession,
              let builder = builder,
              let _ = workoutStartDate else { return }

        // End the workout session
        session.end()

        do {
            // Finish collecting data and save to HealthKit
            try await builder.endCollection(at: Date())
            let healthKitWorkout = try await builder.finishWorkout()
            print("HealthKit workout saved: \(String(describing: healthKitWorkout))")

            // Convert workout state to Hevy API format
            guard let workoutData = toHevyWorkoutData() else {
                print("⚠️ No workout data to save")
                return
            }

            do {
                if let workoutId = currentWorkoutId {
                    // Update existing workout
                    let updatedWorkout = try await HevyAPIClient.shared.updateWorkout(id: workoutId, workout: workoutData)
                    print("✅ Hevy workout updated with ID: \(updatedWorkout.id ?? workoutId)")
                } else {
                    // Create new workout
                    let savedWorkout = try await HevyAPIClient.shared.createWorkout(workoutData)
                    currentWorkoutId = savedWorkout.id
                    print("✅ Hevy workout created with ID: \(savedWorkout.id ?? "unknown")")
                }
            } catch {
                print("⚠️ Failed to save to Hevy: \(error.localizedDescription)")
                // Continue anyway - HealthKit save succeeded
            }

            // Reset state
            isWorkoutActive = false
            isPaused = false
            workoutSession = nil
            self.builder = nil
            clearWorkoutData()

        } catch {
            print("Failed to end workout: \(error.localizedDescription)")
        }
    }

    // MARK: - Workout Data Management

    /// Add a completed set to the current workout (modifies WorkoutState)
    func addSet(exerciseTemplateId: String, exerciseName: String, weight: Double?, reps: Int?, rpe: Double?, setType: SetType = .normal) {
        guard let workoutState = workoutState else {
            print("⚠️ No workout state")
            return
        }

        let completedSet = CompletedSet(
            actualWeight: weight,
            actualReps: reps,
            actualRPE: rpe,
            setType: setType
        )

        // Check if exercise exists in workout
        if workoutState.exercises.contains(where: { $0.exerciseTemplateId == exerciseTemplateId }) {
            // Add to existing exercise
            workoutState.addCompletedSet(to: exerciseTemplateId, set: completedSet)
            print("✅ Added set to \(exerciseName)")
        } else {
            // Add new exercise (not in routine)
            workoutState.addNewExercise(templateId: exerciseTemplateId, name: exerciseName, firstSet: completedSet)
            print("✅ Added new exercise: \(exerciseName)")
        }

        // 🔥 USE CASE 3: Sync to Hevy immediately after every set
        Task { @MainActor in
            await syncWorkoutToHevy()
        }
    }

    /// Clear current workout data
    func clearWorkoutData() {
        workoutState = nil
        heartRate = 0
        activeCalories = 0
        elapsedTime = 0
        workoutStartDate = nil
        currentWorkoutId = nil
    }

    // MARK: - Hevy Sync Methods (USE CASE 3)

    /// Create workout in Hevy on workout start
    private func createWorkoutInHevy() async {
        guard let workoutData = toHevyWorkoutData() else {
            print("⚠️ No workout data to create")
            return
        }

        do {
            let savedWorkout = try await HevyAPIClient.shared.createWorkout(workoutData)
            currentWorkoutId = savedWorkout.id
            print("✅ [Hevy Sync] Workout created with ID: \(savedWorkout.id ?? "unknown")")
        } catch {
            print("❌ [Hevy Sync] Failed to create workout: \(error.localizedDescription)")
            // TODO: Add to offline queue
        }
    }

    /// Sync workout to Hevy after every set
    private func syncWorkoutToHevy() async {
        guard let workoutData = toHevyWorkoutData() else {
            print("⚠️ No workout data to sync")
            return
        }

        guard let workoutId = currentWorkoutId else {
            // No workout ID yet, create it
            await createWorkoutInHevy()
            return
        }

        do {
            _ = try await HevyAPIClient.shared.updateWorkout(id: workoutId, workout: workoutData)
            print("✅ [Hevy Sync] Workout updated (ID: \(workoutId))")
        } catch {
            print("❌ [Hevy Sync] Failed to update workout: \(error.localizedDescription)")
            // TODO: Add to offline queue
        }
    }

    // MARK: - Exercise Modification Methods (USE CASE 2 & 4)

    /// Add new exercise to workout mid-session with planned sets
    /// - Parameters:
    ///   - templateId: Exercise template ID
    ///   - name: Exercise name
    ///   - setCount: Number of sets to plan (default: 3)
    ///   - repsTarget: Target reps per set (optional, uses historical data if nil)
    func addExerciseToWorkout(templateId: String, name: String, setCount: Int? = nil, repsTarget: Int? = nil) {
        guard let workoutState = workoutState else {
            print("⚠️ No workout state")
            return
        }

        // Check if exercise already exists
        if workoutState.exercises.contains(where: { $0.exerciseTemplateId == templateId }) {
            print("⚠️ Exercise \(name) already in workout")
            return
        }

        let finalSetCount = setCount ?? 3  // Default to 3 sets

        // Create planned sets with historical data or defaults
        Task { @MainActor in
            let plannedSets = await createPlannedSets(
                for: templateId,
                count: finalSetCount,
                targetReps: repsTarget
            )

            let newExercise = WorkoutStateExercise(
                exerciseTemplateId: templateId,
                name: name,
                supersetId: nil,
                plannedSets: plannedSets,
                completedSets: [],
                isFromRoutine: false
            )

            workoutState.exercises.append(newExercise)
            print("✅ Added exercise to workout: \(name) with \(finalSetCount) planned sets")

            // Sync to Hevy
            await syncWorkoutToHevy()
        }
    }

    /// Create planned sets using historical data or defaults
    private func createPlannedSets(for exerciseId: String, count: Int, targetReps: Int?) async -> [PlannedSet] {
        // Try to fetch historical data
        let historyService = WorkoutHistoryService()
        let historicalSets = try? await historyService.fetchLastWorkout(for: exerciseId)

        var plannedSets: [PlannedSet] = []

        for i in 0..<count {
            // Use historical data if available, fallback to user-specified or nil
            let targetWeight: Double?
            let targetRepsValue: Int?
            let targetRPE: Double?

            if let historicalSets = historicalSets, !historicalSets.isEmpty {
                // Use historical data from corresponding set (or last set if index out of bounds)
                let historicalSet = historicalSets[min(i, historicalSets.count - 1)]
                targetWeight = historicalSet.actualWeight
                targetRepsValue = targetReps ?? historicalSet.actualReps  // Prefer user-specified reps
                targetRPE = historicalSet.actualRPE
                print("📊 [Planned Set \(i+1)] Using historical: \(targetWeight ?? 0)kg × \(targetRepsValue ?? 0) reps RPE \(targetRPE ?? 0)")
            } else {
                // No historical data, use user-specified or nil
                targetWeight = nil
                targetRepsValue = targetReps
                targetRPE = nil
                print("📝 [Planned Set \(i+1)] No history, using targets: reps=\(targetRepsValue?.description ?? "nil")")
            }

            let plannedSet = PlannedSet(
                targetWeight: targetWeight,
                targetReps: targetRepsValue,
                targetRPE: targetRPE,
                targetDuration: nil
            )

            plannedSets.append(plannedSet)
        }

        return plannedSets
    }

    /// Switch current exercise to different variation
    func switchExercise(from oldTemplateId: String, to newTemplateId: String, newName: String) {
        guard let workoutState = workoutState else {
            print("⚠️ No workout state")
            return
        }

        guard let index = workoutState.exercises.firstIndex(where: { $0.exerciseTemplateId == oldTemplateId }) else {
            print("⚠️ Exercise \(oldTemplateId) not found")
            return
        }

        let oldExercise = workoutState.exercises[index]

        // Create new exercise preserving both completed sets AND planned sets structure
        let newExercise = WorkoutStateExercise(
            exerciseTemplateId: newTemplateId,
            name: newName,
            supersetId: oldExercise.supersetId,
            plannedSets: oldExercise.plannedSets, // Preserve planned sets (same count/structure)
            completedSets: oldExercise.completedSets, // Preserve completed sets
            isCompleted: oldExercise.isCompleted,
            isFromRoutine: false
        )

        workoutState.exercises[index] = newExercise
        print("✅ Switched exercise from \(oldExercise.name) to \(newName), preserved \(oldExercise.completedSets.count) completed sets and \(oldExercise.plannedSets?.count ?? 0) planned sets")

        // Sync to Hevy
        Task { @MainActor in
            await syncWorkoutToHevy()
        }
    }

    /// Replace an exercise with a new one (used by voice replacement system)
    /// - Parameters:
    ///   - currentExerciseId: ID of the exercise to replace
    ///   - newExercise: The replacement exercise
    func replaceExercise(currentExerciseId: String, with newExercise: WorkoutStateExercise) {
        guard let state = workoutState,
              let index = state.exercises.firstIndex(where: {
                  $0.exerciseTemplateId == currentExerciseId
              }) else {
            print("⚠️ Exercise \(currentExerciseId) not found")
            return
        }

        let oldExercise = state.exercises[index]

        // Replace exercise in workout state
        var updatedState = state
        updatedState.exercises[index] = newExercise
        workoutState = updatedState

        print("✅ Replaced exercise from \(oldExercise.name) to \(newExercise.name)")

        // Sync to Hevy
        Task { @MainActor in
            await syncWorkoutToHevy()
        }
    }

    /// Normalize RPE to Hevy API-compliant values
    /// Hevy API accepts: null, 6, 7, 7.5, 8, 8.5, 9, 9.5, 10
    private func normalizeRPE(_ rpe: Double?) -> Double? {
        guard let rpe = rpe else { return nil }

        // Clamp below 6 to 6 (Hevy minimum)
        if rpe < 6 { return 6 }

        // Clamp above 10 to 10 (Hevy maximum)
        if rpe > 10 { return 10 }

        // Round to nearest 0.5 for values between 6-10
        let rounded = (rpe * 2).rounded() / 2
        return rounded
    }

    /// Convert WorkoutState to Hevy API format
    private func toHevyWorkoutData() -> WorkoutData? {
        guard let state = workoutState else { return nil }

        // Convert WorkoutState exercises to Hevy API format
        let hevyExercises = state.exercises.map { stateExercise -> WorkoutExercise in
            // Convert completed sets to Hevy format
            let hevySets = stateExercise.completedSets.map { completedSet in
                WorkoutSet(
                    type: completedSet.setType,
                    weightKg: completedSet.actualWeight,
                    reps: completedSet.actualReps,
                    rpe: normalizeRPE(completedSet.actualRPE),  // 🔥 Normalize RPE to Hevy-compliant values
                    distanceMeters: nil,
                    durationSeconds: completedSet.actualDuration,
                    customMetric: nil
                )
            }

            return WorkoutExercise(
                exerciseTemplateId: stateExercise.exerciseTemplateId,
                sets: hevySets,
                notes: stateExercise.notes,
                supersetId: nil
            )
        }

        return WorkoutData(
            title: state.title,
            startTime: state.startTime,
            endTime: Date(),
            exercises: hevyExercises,
            description: "Logged via phoneless-hevy",
            isPrivate: false
        )
    }

    // MARK: - Metrics Update

    private func updateMetrics(statistics: HKStatistics?) {
        guard let statistics = statistics else { return }

        switch statistics.quantityType {
        case HKQuantityType.quantityType(forIdentifier: .heartRate):
            let heartRateUnit = HKUnit(from: "count/min")
            if let quantity = statistics.mostRecentQuantity() {
                heartRate = quantity.doubleValue(for: heartRateUnit)
            }

        case HKQuantityType.quantityType(forIdentifier: .activeEnergyBurned):
            if let quantity = statistics.sumQuantity() {
                activeCalories = quantity.doubleValue(for: .kilocalorie())
            }

        default:
            break
        }
    }
}

// MARK: - HKWorkoutSessionDelegate

extension WorkoutManager: HKWorkoutSessionDelegate {
    func workoutSession(
        _ workoutSession: HKWorkoutSession,
        didChangeTo toState: HKWorkoutSessionState,
        from fromState: HKWorkoutSessionState,
        date: Date
    ) {
        DispatchQueue.main.async {
            switch toState {
            case .running:
                self.isWorkoutActive = true
                self.isPaused = false

            case .paused:
                self.isPaused = true

            case .ended:
                self.isWorkoutActive = false
                self.isPaused = false

            case .stopped:
                self.isWorkoutActive = false

            default:
                break
            }
        }
    }

    func workoutSession(
        _ workoutSession: HKWorkoutSession,
        didFailWithError error: Error
    ) {
        print("Workout session failed: \(error.localizedDescription)")
    }
}

// MARK: - HKLiveWorkoutBuilderDelegate

extension WorkoutManager: HKLiveWorkoutBuilderDelegate {
    func workoutBuilder(
        _ workoutBuilder: HKLiveWorkoutBuilder,
        didCollectDataOf collectedTypes: Set<HKSampleType>
    ) {
        // Update metrics as data is collected
        for type in collectedTypes {
            guard let quantityType = type as? HKQuantityType else { continue }

            let statistics = workoutBuilder.statistics(for: quantityType)
            updateMetrics(statistics: statistics)
        }
    }

    func workoutBuilderDidCollectEvent(_ workoutBuilder: HKLiveWorkoutBuilder) {
        // Handle workout events if needed
    }
}
