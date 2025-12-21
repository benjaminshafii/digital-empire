//
//  WorkoutManagerExtensions.swift
//  phoneless-hevy Watch App
//
//  Branch 1: Quick Repeat and Historical Context Extensions
//

import Foundation

extension WorkoutManager {

    /// Log a set using values from last workout (Quick Repeat)
    /// - Parameters:
    ///   - exerciseTemplateId: Exercise template ID
    ///   - exerciseName: Exercise name
    ///   - historyService: History service to fetch last workout data
    func quickRepeatFromHistory(
        exerciseTemplateId: String,
        exerciseName: String,
        historyService: WorkoutHistoryService
    ) async {
        print("⚡ [Quick Repeat] Fetching history for \(exerciseName)")

        // Fetch historical data
        guard let lastSets = try? await historyService.fetchLastWorkout(
            for: exerciseTemplateId
        ), !lastSets.isEmpty else {
            print("⚠️ [Quick Repeat] No history available")
            return
        }

        // Get current set number
        guard let nextSet = workoutState?.nextSet(),
              nextSet.exercise.exerciseTemplateId == exerciseTemplateId else {
            print("⚠️ [Quick Repeat] Exercise mismatch")
            return
        }

        // Match set number or use last set
        let setNumber = nextSet.setNumber
        let referenceSet: CompletedSet = lastSets.indices.contains(setNumber - 1) ?
            lastSets[setNumber - 1] : lastSets.last!

        print("⚡ [Quick Repeat] Using reference: \(referenceSet.summary)")

        // Log it using the addSet method
        addSet(
            exerciseTemplateId: exerciseTemplateId,
            exerciseName: exerciseName,
            weight: referenceSet.actualWeight,
            reps: referenceSet.actualReps,
            rpe: referenceSet.actualRPE,
            setType: referenceSet.setType
        )

        print("✅ [Quick Repeat] Logged: \(referenceSet.summary)")
    }

    /// Get last logged set info for current exercise
    /// - Returns: Last logged set or nil
    func getLastLoggedSetInfo() -> (exercise: WorkoutStateExercise, set: CompletedSet, setNumber: Int)? {
        guard let workoutState = workoutState else { return nil }

        // Find most recent completed set across all exercises
        for exercise in workoutState.exercises.reversed() {
            if let lastSet = exercise.completedSets.last {
                let setNumber = exercise.completedSets.count
                return (exercise, lastSet, setNumber)
            }
        }

        return nil
    }

    /// Check if quick repeat is available for current exercise
    /// - Parameter historyService: History service
    /// - Returns: True if history exists
    func canQuickRepeat(historyService: WorkoutHistoryService) -> Bool {
        guard let nextSet = workoutState?.nextSet() else {
            return false
        }

        // Check cache
        return historyService.getLastWorkoutSets(for: nextSet.exercise.exerciseTemplateId) != nil
    }
}
