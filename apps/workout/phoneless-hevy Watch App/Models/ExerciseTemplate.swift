//
//  ExerciseTemplate.swift
//  phoneless-hevy Watch App
//
//  Created by Claude Code
//  Updated to match Hevy API v1 response format
//

import Foundation

/// Exercise type from Hevy API
/// Determines how the exercise is logged (weight/reps, duration, etc.)
///
/// **VERIFIED FROM ACTUAL API (curl test on 2025-10-22)**
/// Tested all 435 exercise templates across 5 pages
enum ExerciseType: String, Codable, Sendable {
    case weightReps = "weight_reps"                     // Weight + reps (bench press)
    case weightDuration = "weight_duration"             // Weight + time (farmer's walk)
    case bodyweightWeighted = "bodyweight_weighted"     // Weighted bodyweight (weighted dips)
    case bodyweightAssisted = "bodyweight_assisted"     // Assisted bodyweight (assisted pull-ups)
    case distanceDuration = "distance_duration"         // Distance + time (running, rowing)
    case shortDistanceWeight = "short_distance_weight"  // Short distance + weight (sled push)
    case duration = "duration"                          // Time only (plank)
    case repsOnly = "reps_only"                         // Reps without weight (air squats)
    case stepsDuration = "steps_duration"               // Steps + time (stair climbing)
    case floorsDuration = "floors_duration"             // Floors climbed + time (stair climbing)
}

/// Model for an exercise template from the Hevy API
/// Exercise templates are the master list of exercises that can be performed
///
/// **Actual API Response Format (snake_case):**
/// ```json
/// {
///   "id": "3BC06AD3",
///   "title": "21s Bicep Curl",
///   "type": "weight_reps",
///   "primary_muscle_group": "biceps",
///   "secondary_muscle_groups": [],
///   "equipment": "barbell",
///   "is_custom": false
/// }
/// ```
///
/// **Note:** Uses `JSONDecoder.keyDecodingStrategy = .convertFromSnakeCase`
struct ExerciseTemplate: Codable, Sendable, Identifiable {
    let id: String
    let title: String
    let type: ExerciseType
    let primaryMuscleGroup: String?
    let secondaryMuscleGroups: [String]
    let equipment: String?
    let isCustom: Bool

    // Manual init for testing
    init(
        id: String,
        title: String,
        type: ExerciseType,
        primaryMuscleGroup: String? = nil,
        secondaryMuscleGroups: [String] = [],
        equipment: String? = nil,
        isCustom: Bool = false
    ) {
        self.id = id
        self.title = title
        self.type = type
        self.primaryMuscleGroup = primaryMuscleGroup
        self.secondaryMuscleGroups = secondaryMuscleGroups
        self.equipment = equipment
        self.isCustom = isCustom
    }
}

/// Response wrapper for exercise templates API
///
/// **Actual API Response Format:**
/// ```json
/// {
///   "exercise_templates": [...],
///   "page": 1,
///   "page_count": 10
/// }
/// ```
///
/// **Note:** Uses `JSONDecoder.keyDecodingStrategy = .convertFromSnakeCase`
/// So NO custom CodingKeys needed - automatic conversion handles it!
struct ExerciseTemplatesResponse: Codable, Sendable {
    let exerciseTemplates: [ExerciseTemplate]
    let page: Int
    let pageCount: Int
}
