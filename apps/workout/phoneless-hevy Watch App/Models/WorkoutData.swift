//
//  WorkoutData.swift
//  phoneless-hevy Watch App
//
//  Created by Claude Code
//

import Foundation

/// Complete workout model containing all exercises and metadata
struct WorkoutData: Codable, Sendable, Identifiable {
    let id: String?                     // workout_id from API, nil for new workouts
    let title: String
    var startTime: Date
    var endTime: Date
    var exercises: [WorkoutExercise]
    let description: String?
    let isPrivate: Bool

    enum CodingKeys: String, CodingKey {
        case id = "workout_id"
        case title
        case startTime = "start_time"
        case endTime = "end_time"
        case exercises
        case description
        case isPrivate = "is_private"
    }

    init(
        id: String? = nil,
        title: String,
        startTime: Date = Date(),
        endTime: Date = Date(),
        exercises: [WorkoutExercise] = [],
        description: String? = nil,
        isPrivate: Bool = false
    ) {
        self.id = id
        self.title = title
        self.startTime = startTime
        self.endTime = endTime
        self.exercises = exercises
        self.description = description
        self.isPrivate = isPrivate
    }

    // Custom decoder to handle ISO8601 date formats from Hevy API
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        self.id = try container.decodeIfPresent(String.self, forKey: .id)
        self.title = try container.decode(String.self, forKey: .title)

        // Decode dates using flexible ISO8601 format (handles both with/without fractional seconds)
        let startTimeString = try container.decode(String.self, forKey: .startTime)
        let endTimeString = try container.decode(String.self, forKey: .endTime)

        print("📅 [WorkoutData] Decoding start_time: \(startTimeString)")
        print("📅 [WorkoutData] Decoding end_time: \(endTimeString)")

        guard let start = ISO8601DateFormatter.parseHevyDate(startTimeString),
              let end = ISO8601DateFormatter.parseHevyDate(endTimeString) else {
            print("❌ [WorkoutData] Failed to parse dates!")
            throw DecodingError.dataCorruptedError(
                forKey: .startTime,
                in: container,
                debugDescription: "Invalid date format: start=\(startTimeString), end=\(endTimeString)"
            )
        }

        print("✅ [WorkoutData] Successfully decoded dates")

        self.startTime = start
        self.endTime = end
        self.exercises = try container.decode([WorkoutExercise].self, forKey: .exercises)
        self.description = try container.decodeIfPresent(String.self, forKey: .description)
        self.isPrivate = try container.decodeIfPresent(Bool.self, forKey: .isPrivate) ?? false
    }

    // Custom encoder to format dates as ISO8601 strings for Hevy API
    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encodeIfPresent(id, forKey: .id)
        try container.encode(title, forKey: .title)

        // Encode dates as ISO8601 strings
        let startTimeString = ISO8601DateFormatter.hevyFormatter.string(from: startTime)
        let endTimeString = ISO8601DateFormatter.hevyFormatter.string(from: endTime)

        try container.encode(startTimeString, forKey: .startTime)
        try container.encode(endTimeString, forKey: .endTime)
        try container.encode(exercises, forKey: .exercises)
        try container.encodeIfPresent(description, forKey: .description)
        try container.encode(isPrivate, forKey: .isPrivate)
    }

    /// Calculate workout duration in seconds
    var duration: TimeInterval {
        endTime.timeIntervalSince(startTime)
    }

    /// Add a new exercise to the workout
    mutating func addExercise(_ exercise: WorkoutExercise) {
        exercises.append(exercise)
    }

    /// Update a specific exercise
    mutating func updateExercise(at index: Int, with exercise: WorkoutExercise) {
        guard index >= 0 && index < exercises.count else { return }
        exercises[index] = exercise
    }

    /// Remove an exercise at the specified index
    mutating func removeExercise(at index: Int) {
        guard index >= 0 && index < exercises.count else { return }
        exercises.remove(at: index)
    }

    /// Mark workout as completed with current time
    mutating func complete() {
        endTime = Date()
    }
}

/// Response wrapper for workout API responses
/// NOTE: Hevy API returns "workout" as an ARRAY containing 1 element, not a single object
struct WorkoutResponse: Codable, Sendable {
    let workout: [WorkoutData]  // API returns array, not single object!

    enum CodingKeys: String, CodingKey {
        case workout
    }
}
