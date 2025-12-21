//
//  WorkoutExercise.swift
//  phoneless-hevy Watch App
//
//  Created by Claude Code
//

import Foundation

/// Model for an exercise within a workout, containing multiple sets
struct WorkoutExercise: Codable, Sendable, Identifiable {
    let id: UUID
    let exerciseTemplateId: String
    var sets: [WorkoutSet]
    let notes: String?
    let supersetId: Int?

    enum CodingKeys: String, CodingKey {
        case exerciseTemplateId = "exercise_template_id"
        case sets
        case notes
        case supersetId = "superset_id"
    }

    init(
        id: UUID = UUID(),
        exerciseTemplateId: String,
        sets: [WorkoutSet] = [],
        notes: String? = nil,
        supersetId: Int? = nil
    ) {
        self.id = id
        self.exerciseTemplateId = exerciseTemplateId
        self.sets = sets
        self.notes = notes
        self.supersetId = supersetId
    }

    // Custom decoder to handle the id field which is not in API responses
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        self.id = UUID()
        self.exerciseTemplateId = try container.decode(String.self, forKey: .exerciseTemplateId)
        self.sets = try container.decode([WorkoutSet].self, forKey: .sets)
        self.notes = try container.decodeIfPresent(String.self, forKey: .notes)
        self.supersetId = try container.decodeIfPresent(Int.self, forKey: .supersetId)
    }

    // Custom encoder to exclude id field from API requests
    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(exerciseTemplateId, forKey: .exerciseTemplateId)
        try container.encode(sets, forKey: .sets)
        try container.encodeIfPresent(notes, forKey: .notes)
        try container.encodeIfPresent(supersetId, forKey: .supersetId)
    }

    /// Add a new set to the exercise
    mutating func addSet(_ set: WorkoutSet) {
        sets.append(set)
    }

    /// Update a specific set
    mutating func updateSet(at index: Int, with set: WorkoutSet) {
        guard index >= 0 && index < sets.count else { return }
        sets[index] = set
    }

    /// Remove a set at the specified index
    mutating func removeSet(at index: Int) {
        guard index >= 0 && index < sets.count else { return }
        sets.remove(at: index)
    }
}
