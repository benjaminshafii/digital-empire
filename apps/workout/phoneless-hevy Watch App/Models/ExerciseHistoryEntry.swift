//
//  ExerciseHistoryEntry.swift
//  phoneless-hevy Watch App
//
//  Created by Claude Code
//  Model for exercise history from Hevy API /v1/exercise_history endpoint
//

import Foundation

/// Response from GET /v1/exercise_history/{exerciseTemplateId}
struct ExerciseHistoryResponse: Codable {
    let exerciseHistory: [ExerciseHistoryEntry]
}

/// Single entry in exercise history
/// Represents one set from a past workout for a specific exercise
struct ExerciseHistoryEntry: Codable, Identifiable {
    let workoutId: String
    let workoutTitle: String
    let workoutStartTime: Date
    let workoutEndTime: Date
    let exerciseTemplateId: String
    let weightKg: Double?
    let reps: Int?
    let distanceMeters: Int?
    let durationSeconds: Int?
    let rpe: Double?
    let customMetric: Double?
    let setType: SetType

    /// Generate unique ID from workout + exercise + set index
    var id: String {
        workoutId + exerciseTemplateId + String(describing: workoutStartTime)
    }

    /// Convert to CompletedSet format for compatibility
    func toCompletedSet() -> CompletedSet {
        CompletedSet(
            actualWeight: weightKg,
            actualReps: reps,
            actualRPE: rpe,
            actualDuration: durationSeconds,
            timestamp: workoutStartTime,
            setType: setType
        )
    }
}

/// Response wrapper for exercise history endpoint
/// Used for decoding API responses
extension ExerciseHistoryResponse {
    /// Get all unique workout IDs from history
    var workoutIds: [String] {
        Array(Set(exerciseHistory.map { $0.workoutId }))
    }

    /// Group entries by workout
    var byWorkout: [String: [ExerciseHistoryEntry]] {
        Dictionary(grouping: exerciseHistory) { $0.workoutId }
    }

    /// Get most recent workout date
    var mostRecentWorkoutDate: Date? {
        exerciseHistory.map { $0.workoutStartTime }.max()
    }
}
