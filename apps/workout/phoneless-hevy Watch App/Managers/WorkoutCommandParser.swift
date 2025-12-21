//
//  WorkoutCommandParser.swift
//  phoneless-hevy Watch App
//
//  Created by Benjamin Shafii on 10/22/25.
//

import Foundation

// MARK: - Parser Result Models
struct ParsedWorkoutCommand {
    let exerciseTemplateId: String   // Hevy UUID
    let exerciseName: String          // Display name
    let set: WorkoutSet
    let confidence: Double
}

// MARK: - Command Parser
class WorkoutCommandParser {
    // MARK: - Regular Expression Patterns
    private let patterns = CommandPatterns()
    private let exerciseManager = ExerciseManager.shared

    // MARK: - Public Parsing Method
    func parse(_ text: String, context: WorkoutContext? = nil) -> ParsedWorkoutCommand? {
        let lowercased = text.lowercased().trimmingCharacters(in: .whitespacesAndNewlines)

        // Check for "same" - repeat last set
        if lowercased == "same", let lastExercise = context?.currentExercise,
           let lastSet = lastExercise.lastSet {
            print("✅ Repeating last set")
            return ParsedWorkoutCommand(
                exerciseTemplateId: lastExercise.exerciseTemplateId,
                exerciseName: lastExercise.exerciseName,
                set: lastSet,
                confidence: 1.0
            )
        }

        // Extract exercise name OR use context
        var templateId: String?
        var properName: String?

        if let extracted = extractExerciseName(from: lowercased) {
            // Exercise name found in input
            templateId = exerciseManager.resolveExerciseName(extracted)
            properName = exerciseManager.getTemplate(byId: templateId ?? "")?.title ?? extracted
        } else if let current = context?.currentExercise {
            // No exercise name in input - assume current exercise
            print("✅ Using current exercise from context: \(current.exerciseName)")
            templateId = current.exerciseTemplateId
            properName = current.exerciseName
        } else {
            // No exercise name and no context
            print("❌ No exercise name found and no context available")
            return nil
        }

        guard let finalTemplateId = templateId,
              let finalName = properName else {
            print("⚠️ Could not resolve exercise")
            return nil
        }

        // Extract all workout set data
        var weightKg: Double? = nil
        if let weight = extractWeight(from: lowercased) {
            // Convert to kg
            if weight.unit == .pounds {
                weightKg = weight.value * 0.453592
            } else {
                weightKg = weight.value
            }
        }

        let reps = extractReps(from: lowercased)
        let rpe = extractRPE(from: lowercased)
        let durationSeconds = extractDuration(from: lowercased)
        let setType = extractSetType(from: lowercased)

        // Create workout set with extracted data
        let set = WorkoutSet(
            type: setType,
            weightKg: weightKg,
            reps: reps,
            rpe: rpe,
            distanceMeters: nil,
            durationSeconds: durationSeconds,
            customMetric: nil
        )

        // Calculate confidence
        let confidence = calculateConfidence(set: set, originalText: text)

        return ParsedWorkoutCommand(
            exerciseTemplateId: finalTemplateId,
            exerciseName: finalName,
            set: set,
            confidence: confidence
        )
    }

    // MARK: - Extraction Methods
    private func extractExerciseName(from text: String) -> String? {
        // Look for exercise name at the start of the command
        // Common patterns: "bench press", "squat", "bicep curl", etc.

        let exercisePattern = "^([a-z\\s]+?)(?=,|\\d|\\b(?:pounds?|lbs?|kgs?|kilograms?|reps?|rpe|sets?)\\b)"

        if let regex = try? NSRegularExpression(pattern: exercisePattern, options: []),
           let match = regex.firstMatch(in: text, range: NSRange(text.startIndex..., in: text)),
           let range = Range(match.range(at: 1), in: text) {
            return String(text[range]).trimmingCharacters(in: .whitespaces).capitalized
        }

        // Fallback: Take first 1-3 words
        let words = text.split(separator: " ")
        if words.count >= 1 {
            let exerciseWords = words.prefix(min(3, words.count))
            return exerciseWords.joined(separator: " ").capitalized
        }

        return nil
    }

    private func extractWeight(from text: String) -> (value: Double, unit: WeightUnit)? {
        // Pattern: "135 pounds", "60 kg", "100 lbs", etc.
        let weightPatterns = [
            "(\\d+(?:\\.\\d+)?)\\s*(?:pounds?|lbs?)",
            "(\\d+(?:\\.\\d+)?)\\s*(?:kilograms?|kgs?)"
        ]

        for (index, pattern) in weightPatterns.enumerated() {
            if let regex = try? NSRegularExpression(pattern: pattern, options: .caseInsensitive),
               let match = regex.firstMatch(in: text, range: NSRange(text.startIndex..., in: text)),
               let range = Range(match.range(at: 1), in: text),
               let value = Double(String(text[range])) {
                let unit: WeightUnit = index == 0 ? .pounds : .kilograms
                return (value, unit)
            }
        }

        return nil
    }

    private func extractReps(from text: String) -> Int? {
        // Pattern: "8 reps", "12 rep", "10", etc.
        let repsPattern = "(\\d+)\\s*(?:reps?)?(?:\\s|,|$)"

        if let regex = try? NSRegularExpression(pattern: repsPattern, options: .caseInsensitive),
           let match = regex.firstMatch(in: text, range: NSRange(text.startIndex..., in: text)),
           let range = Range(match.range(at: 1), in: text),
           let reps = Int(String(text[range])) {
            return reps
        }

        return nil
    }

    private func extractRPE(from text: String) -> Double? {
        // Pattern: "RPE 7", "rate of perceived exertion 8", "rpe 7.5"
        let rpePattern = "(?:rpe|rate of perceived exertion)\\s*(\\d+(?:\\.\\d+)?)"

        if let regex = try? NSRegularExpression(pattern: rpePattern, options: .caseInsensitive),
           let match = regex.firstMatch(in: text, range: NSRange(text.startIndex..., in: text)),
           let range = Range(match.range(at: 1), in: text),
           let rpe = Double(String(text[range])) {
            // Validate RPE range (6-10)
            return max(6.0, min(10.0, rpe))
        }

        return nil
    }

    private func extractDuration(from text: String) -> Int? {
        // Pattern: "30 seconds", "1 minute", "45 sec"
        let durationPattern = "(\\d+)\\s*(?:seconds?|secs?|minutes?|mins?)"

        if let regex = try? NSRegularExpression(pattern: durationPattern, options: .caseInsensitive),
           let match = regex.firstMatch(in: text, range: NSRange(text.startIndex..., in: text)),
           let valueRange = Range(match.range(at: 1), in: text),
           let value = Int(String(text[valueRange])) {

            // Check if it's minutes
            let fullMatch = text[Range(match.range, in: text)!]
            if fullMatch.lowercased().contains("minute") || fullMatch.lowercased().contains("min") {
                return value * 60
            }

            return value
        }

        return nil
    }

    private func extractSetType(from text: String) -> SetType {
        if text.contains("warmup") || text.contains("warm up") {
            return .warmup
        } else if text.contains("failure") || text.contains("to failure") {
            return .failure
        } else if text.contains("dropset") || text.contains("drop set") {
            return .dropset
        }
        return .normal
    }

    // MARK: - Confidence Calculation
    private func calculateConfidence(set: WorkoutSet, originalText: String) -> Double {
        var confidence = 0.0

        // Exercise name is checked in the outer parse() function
        // If we got here, exercise name exists
        confidence += 0.4

        // Weight
        if set.weightKg != nil {
            confidence += 0.2
        }

        // Reps
        if set.reps != nil {
            confidence += 0.2
        }

        // RPE
        if set.rpe != nil {
            confidence += 0.1
        }

        // Duration (alternative to reps)
        if set.durationSeconds != nil {
            confidence += 0.1
        }

        return min(1.0, confidence)
    }
}

// MARK: - Supporting Types
private struct CommandPatterns {
    // Reusable regex patterns can be stored here
}
