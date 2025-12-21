//
//  WorkoutSet.swift
//  phoneless-hevy Watch App
//
//  Created by Claude Code
//

import Foundation

/// Represents the type of set being performed
enum SetType: String, Codable, Sendable {
    case warmup
    case normal
    case failure
    case dropset
}

/// Model for a single set in a workout exercise
struct WorkoutSet: Codable, Sendable, Identifiable {
    let id: UUID
    let type: SetType
    let weightKg: Double?
    let reps: Int?
    let rpe: Double?                    // Rate of Perceived Exertion (1-10)
    let distanceMeters: Int?
    let durationSeconds: Int?
    let customMetric: Double?

    enum CodingKeys: String, CodingKey {
        case type
        case weightKg = "weight_kg"
        case reps
        case rpe
        case distanceMeters = "distance_meters"
        case durationSeconds = "duration_seconds"
        case customMetric = "custom_metric"
    }

    init(
        id: UUID = UUID(),
        type: SetType = .normal,
        weightKg: Double? = nil,
        reps: Int? = nil,
        rpe: Double? = nil,
        distanceMeters: Int? = nil,
        durationSeconds: Int? = nil,
        customMetric: Double? = nil
    ) {
        self.id = id
        self.type = type
        self.weightKg = weightKg
        self.reps = reps
        self.rpe = rpe
        self.distanceMeters = distanceMeters
        self.durationSeconds = durationSeconds
        self.customMetric = customMetric
    }

    // Custom decoder to handle the id field which is not in API responses
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        self.id = UUID()
        self.type = try container.decode(SetType.self, forKey: .type)
        self.weightKg = try container.decodeIfPresent(Double.self, forKey: .weightKg)
        self.reps = try container.decodeIfPresent(Int.self, forKey: .reps)
        self.rpe = try container.decodeIfPresent(Double.self, forKey: .rpe)
        self.distanceMeters = try container.decodeIfPresent(Int.self, forKey: .distanceMeters)
        self.durationSeconds = try container.decodeIfPresent(Int.self, forKey: .durationSeconds)
        self.customMetric = try container.decodeIfPresent(Double.self, forKey: .customMetric)
    }

    // Custom encoder to exclude id field from API requests
    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(type, forKey: .type)
        try container.encodeIfPresent(weightKg, forKey: .weightKg)
        try container.encodeIfPresent(reps, forKey: .reps)
        try container.encodeIfPresent(rpe, forKey: .rpe)
        try container.encodeIfPresent(distanceMeters, forKey: .distanceMeters)
        try container.encodeIfPresent(durationSeconds, forKey: .durationSeconds)
        try container.encodeIfPresent(customMetric, forKey: .customMetric)
    }
}
