//
//  WorkoutContext.swift
//  phoneless-hevy Watch App
//
//  Created by Claude Code on 10/22/25.
//  Manages context for conversational workout tracking
//

import Foundation

/// Workout context for LLM-aware parsing
struct WorkoutContext: Codable {
    /// Current exercise being logged
    var currentExercise: ExerciseContext?

    /// All exercises in this workout session
    var exerciseHistory: [ExerciseContext] = []

    /// Workout metadata
    let startTime: Date
    var workoutType: String?

    /// User preferences
    var preferredUnits: WeightUnit = .pounds

    /// Active routine (if following one)
    var activeRoutine: String?  // Routine ID
    var routineProgress: Int = 0  // Which exercise in routine

    init(startTime: Date = Date()) {
        self.startTime = startTime
    }
}

/// Context for a single exercise
struct ExerciseContext: Codable, Identifiable {
    let id: UUID
    let exerciseTemplateId: String
    let exerciseName: String
    var sets: [WorkoutSet]

    /// Last set logged
    var lastSet: WorkoutSet? {
        sets.last
    }

    /// Average weight for this exercise in current workout
    var averageWeight: Double? {
        let weights = sets.compactMap { $0.weightKg }
        guard !weights.isEmpty else { return nil }
        return weights.reduce(0, +) / Double(weights.count)
    }

    init(id: UUID = UUID(),
         exerciseTemplateId: String,
         exerciseName: String,
         sets: [WorkoutSet] = []) {
        self.id = id
        self.exerciseTemplateId = exerciseTemplateId
        self.exerciseName = exerciseName
        self.sets = sets
    }
}

/// Weight unit preference
enum WeightUnit: String, Codable {
    case pounds
    case kilograms
}
