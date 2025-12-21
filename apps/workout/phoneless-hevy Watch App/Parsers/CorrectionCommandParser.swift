//
//  CorrectionCommandParser.swift
//  phoneless-hevy Watch App
//
//  Branch 3: Conversational Context & Corrections
//  Parses correction/undo commands from voice input
//

import Foundation

/// Parses correction and undo commands from voice input
struct CorrectionCommandParser {

    enum CommandType {
        case undo
        case editLastSet(changes: EditChanges)
        case editSet(reference: SetReference, changes: EditChanges)  // Edit specific set by reference
        case deleteSet(reference: SetReference)
        case replaceExercise(constraint: String?)
    }

    struct EditChanges {
        var newWeight: Double?
        var newReps: Int?
        var newRPE: Double?
        var newDuration: Int?

        var hasChanges: Bool {
            newWeight != nil || newReps != nil || newRPE != nil || newDuration != nil
        }
    }

    struct SetReference {
        let targetExercise: String?
        let setNumber: Int?
    }

    // MARK: - Parsing

    /// Parse a voice input string to detect correction commands
    /// - Parameter input: User's voice input
    /// - Returns: Parsed command type or nil if not a correction command
    func parse(_ input: String) -> CommandType? {
        let lowercased = input.lowercased()

        // Detect undo commands
        if isUndoCommand(lowercased) {
            print("🔍 [Parser] Detected undo command")
            return .undo
        }

        // Detect edit commands
        if isEditCommand(lowercased) {
            let changes = extractEditChanges(from: input)
            if changes.hasChanges {
                // Check if there's a specific set reference
                let reference = parseSetReference(from: input)

                // If reference has exercise name or set number, it's a specific set edit
                if reference.targetExercise != nil || reference.setNumber != nil {
                    print("🔍 [Parser] Detected edit command for specific set: \(reference), changes: \(changes)")
                    return .editSet(reference: reference, changes: changes)
                } else {
                    // No specific reference, edit last set
                    print("🔍 [Parser] Detected edit command with changes: \(changes)")
                    return .editLastSet(changes: changes)
                }
            }
        }

        // Detect delete commands
        if isDeleteCommand(lowercased) {
            let reference = parseSetReference(from: input)
            print("🔍 [Parser] Detected delete command for set: \(reference)")
            return .deleteSet(reference: reference)
        }

        // Detect exercise replacement commands
        if isReplaceCommand(lowercased) {
            let constraint = extractReplacementConstraint(from: input)
            print("🔍 [Parser] Detected replace exercise command with constraint: \(constraint ?? "none")")
            return .replaceExercise(constraint: constraint)
        }

        return nil
    }

    // MARK: - Command Detection

    private func isUndoCommand(_ input: String) -> Bool {
        return input.contains("undo") ||
               input.contains("go back") ||
               input.contains("cancel") ||
               input.contains("nevermind")
    }

    private func isEditCommand(_ input: String) -> Bool {
        return input.contains("last set was wrong") ||
               input.contains("change last set") ||
               input.contains("fix last set") ||
               input.contains("correct last set") ||
               input.contains("actually") ||
               input.contains("made mistake") ||
               input.contains("mistake on") ||
               input.contains("edit") ||
               (input.contains("prev") && input.contains("set")) ||
               (input.contains("previous") && input.contains("set")) ||
               (input.contains("change") && input.contains("to"))
    }

    private func isDeleteCommand(_ input: String) -> Bool {
        return input.contains("delete") ||
               input.contains("remove") ||
               input.contains("erase")
    }

    private func isReplaceCommand(_ input: String) -> Bool {
        return input.contains("replace") ||
               input.contains("switch") ||
               input.contains("swap") ||
               input.contains("change exercise")
    }

    // MARK: - Value Extraction

    /// Extract edit changes from voice input
    private func extractEditChanges(from input: String) -> EditChanges {
        var changes = EditChanges()

        // Extract weight
        if let weight = extractWeight(from: input) {
            changes.newWeight = weight
        }

        // Extract reps
        if let reps = extractReps(from: input) {
            changes.newReps = reps
        }

        // Extract RPE
        if let rpe = extractRPE(from: input) {
            changes.newRPE = rpe
        }

        // Extract duration
        if let duration = extractDuration(from: input) {
            changes.newDuration = duration
        }

        return changes
    }

    /// Extract weight from voice input
    /// Patterns: "20 lbs", "90 kg", "135 pounds", "62.5 kg"
    private func extractWeight(from input: String) -> Double? {
        let patterns = [
            #"(\d+\.?\d*)\s*(?:lbs?|pounds?)"#,  // Pounds
            #"(\d+\.?\d*)\s*(?:kg|kilos?)"#       // Kilograms
        ]

        for pattern in patterns {
            if let regex = try? NSRegularExpression(pattern: pattern, options: .caseInsensitive),
               let match = regex.firstMatch(in: input, range: NSRange(input.startIndex..., in: input)) {

                if let numberRange = Range(match.range(at: 1), in: input) {
                    let numberString = String(input[numberRange])
                    if let number = Double(numberString) {
                        // Convert lbs to kg if necessary
                        if pattern.contains("lbs") || pattern.contains("pounds") {
                            return number * 0.453592
                        }
                        return number
                    }
                }
            }
        }

        return nil
    }

    /// Extract reps from voice input
    /// Patterns: "8 reps", "10 repetitions", "12x", "five reps"
    private func extractReps(from input: String) -> Int? {
        let patterns = [
            #"(\d+)\s*(?:reps?|repetitions?)"#,
            #"(\d+)x"#
        ]

        for pattern in patterns {
            if let regex = try? NSRegularExpression(pattern: pattern, options: .caseInsensitive),
               let match = regex.firstMatch(in: input, range: NSRange(input.startIndex..., in: input)) {

                if let numberRange = Range(match.range(at: 1), in: input) {
                    let numberString = String(input[numberRange])
                    if let number = Int(numberString) {
                        return number
                    }
                }
            }
        }

        return nil
    }

    /// Extract RPE from voice input
    /// Patterns: "RPE 8", "at 7.5", "effort 9", "rate 8.5"
    private func extractRPE(from input: String) -> Double? {
        let pattern = #"(?:rpe|effort|rate)\s*(\d+\.?\d*)"#

        if let regex = try? NSRegularExpression(pattern: pattern, options: .caseInsensitive),
           let match = regex.firstMatch(in: input, range: NSRange(input.startIndex..., in: input)) {

            if let numberRange = Range(match.range(at: 1), in: input) {
                let numberString = String(input[numberRange])
                if let number = Double(numberString) {
                    // Clamp to valid RPE range (6-10)
                    return max(6.0, min(10.0, number))
                }
            }
        }

        return nil
    }

    /// Extract duration from voice input
    /// Patterns: "30 seconds", "1 minute", "90s"
    private func extractDuration(from input: String) -> Int? {
        let patterns = [
            #"(\d+)\s*(?:seconds?|secs?|s)\b"#,  // Seconds
            #"(\d+)\s*(?:minutes?|mins?|m)\b"#   // Minutes
        ]

        for (index, pattern) in patterns.enumerated() {
            if let regex = try? NSRegularExpression(pattern: pattern, options: .caseInsensitive),
               let match = regex.firstMatch(in: input, range: NSRange(input.startIndex..., in: input)) {

                if let numberRange = Range(match.range(at: 1), in: input) {
                    let numberString = String(input[numberRange])
                    if let number = Int(numberString) {
                        // Convert minutes to seconds
                        if index == 1 {
                            return number * 60
                        }
                        return number
                    }
                }
            }
        }

        return nil
    }

    /// Parse set reference from voice input
    /// Patterns: "set 2", "2nd set", "second set", "last set", "prev set", "2nd set of incline press"
    private func parseSetReference(from input: String) -> SetReference {
        let lowercased = input.lowercased()
        var exerciseName: String? = nil
        var setNumber: Int? = nil

        // Check for "last set", "prev set", "previous set" (means most recent)
        if lowercased.contains("last set") ||
           lowercased.contains("prev set") ||
           lowercased.contains("previous set") {
            return SetReference(targetExercise: nil, setNumber: nil)
        }

        // Pattern: "2nd set of [exercise]" or "set 2 of [exercise]"
        // Extract exercise name after "of"
        if let ofRange = lowercased.range(of: " of ") {
            let afterOf = String(input[ofRange.upperBound...])
            // Take everything after "of" as exercise name, clean up
            exerciseName = afterOf.trimmingCharacters(in: .whitespacesAndNewlines)
            if exerciseName?.isEmpty == true {
                exerciseName = nil
            }
        }

        // Try to extract ordinal set number (1st, 2nd, 3rd, etc.)
        let ordinalPattern = #"(\d+)(?:st|nd|rd|th)\s+set"#
        if let regex = try? NSRegularExpression(pattern: ordinalPattern, options: .caseInsensitive),
           let match = regex.firstMatch(in: input, range: NSRange(input.startIndex..., in: input)) {
            if let numberRange = Range(match.range(at: 1), in: input) {
                let numberString = String(input[numberRange])
                setNumber = Int(numberString)
            }
        }

        // Try to extract numeric set number "set 2"
        if setNumber == nil {
            let pattern = #"set\s*(\d+)"#
            if let regex = try? NSRegularExpression(pattern: pattern, options: .caseInsensitive),
               let match = regex.firstMatch(in: input, range: NSRange(input.startIndex..., in: input)) {
                if let numberRange = Range(match.range(at: 1), in: input) {
                    let numberString = String(input[numberRange])
                    setNumber = Int(numberString)
                }
            }
        }

        return SetReference(targetExercise: exerciseName, setNumber: setNumber)
    }

    /// Extract replacement constraint from voice input
    /// Patterns: "with dumbbell", "bodyweight version", "machine press"
    private func extractReplacementConstraint(from input: String) -> String? {
        let lowercased = input.lowercased()

        // Common equipment types
        let equipment = ["dumbbell", "barbell", "kettlebell", "machine", "cable", "bodyweight", "band"]
        for equip in equipment {
            if lowercased.contains(equip) {
                return equip
            }
        }

        // Try to extract constraint after "with" or "using"
        let patterns = [
            #"(?:with|using)\s+(\w+)"#,
            #"(\w+)\s+(?:version|variation)"#
        ]

        for pattern in patterns {
            if let regex = try? NSRegularExpression(pattern: pattern, options: .caseInsensitive),
               let match = regex.firstMatch(in: input, range: NSRange(input.startIndex..., in: input)) {

                if let constraintRange = Range(match.range(at: 1), in: input) {
                    return String(input[constraintRange])
                }
            }
        }

        return nil
    }
}

// MARK: - Extensions

extension CorrectionCommandParser.EditChanges: CustomStringConvertible {
    var description: String {
        var parts: [String] = []
        if let weight = newWeight { parts.append("weight: \(weight)kg") }
        if let reps = newReps { parts.append("reps: \(reps)") }
        if let rpe = newRPE { parts.append("RPE: \(rpe)") }
        if let duration = newDuration { parts.append("duration: \(duration)s") }
        return parts.isEmpty ? "no changes" : parts.joined(separator: ", ")
    }
}

extension CorrectionCommandParser.SetReference: CustomStringConvertible {
    var description: String {
        if let exercise = targetExercise, let setNum = setNumber {
            return "\(exercise) Set \(setNum)"
        } else if let setNum = setNumber {
            return "Set \(setNum)"
        } else if let exercise = targetExercise {
            return exercise
        } else {
            return "last set"
        }
    }
}
