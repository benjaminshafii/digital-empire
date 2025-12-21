//
//  Routine.swift
//  phoneless-hevy Watch App
//
//  Created by Claude Code on 10/22/25.
//  Routine models for Hevy API integration
//

import Foundation

struct Routine: Codable, Identifiable, Hashable {
    let id: String
    let title: String
    let folderId: Int?
    let notes: String?
    let exercises: [RoutineExercise]
    let updatedAt: Date
    let createdAt: Date

    enum CodingKeys: String, CodingKey {
        case id, title, notes, exercises
        case folderId = "folder_id"
        case updatedAt = "updated_at"
        case createdAt = "created_at"
    }
}

struct RoutineExercise: Codable, Identifiable, Hashable {
    var id: String { exerciseTemplateId }
    let index: Int
    let title: String
    let restSeconds: Int?
    let notes: String?
    let exerciseTemplateId: String
    let supersetId: Int?
    let sets: [RoutineSet]

    enum CodingKeys: String, CodingKey {
        case index, title, notes, sets
        case restSeconds = "rest_seconds"
        case exerciseTemplateId = "exercise_template_id"
        case supersetId = "superset_id"
    }
}

struct RoutineSet: Codable, Hashable {
    let index: Int
    let type: SetType
    let weightKg: Double?
    let reps: Int?
    let repRange: RepRange?
    let distanceMeters: Int?
    let durationSeconds: Int?
    let customMetric: Double?

    enum CodingKeys: String, CodingKey {
        case index, type, reps
        case weightKg = "weight_kg"
        case repRange = "rep_range"
        case distanceMeters = "distance_meters"
        case durationSeconds = "duration_seconds"
        case customMetric = "custom_metric"
    }
}

struct RepRange: Codable, Hashable {
    let start: Int
    let end: Int
}

struct RoutinesResponse: Codable {
    let routines: [Routine]
    let page: Int
    let pageCount: Int

    enum CodingKeys: String, CodingKey {
        case routines, page
        case pageCount = "page_count"
    }
}
