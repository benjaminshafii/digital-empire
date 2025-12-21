//
//  UnifiedVoiceCommandClassifier.swift
//  phoneless-hevy Watch App
//
//  Unified LLM classifier using structured outputs to replace the sequential waterfall
//  of Correction → Modification → Set Parsing with a single API call
//
//  Based on production research: 66% latency reduction (2400ms → 800ms)
//

import Foundation

// MARK: - Unified Command Schema (Discriminated Union)

/// All possible voice commands in a single schema
struct UnifiedVoiceCommand: Codable {
    let commandType: String  // "log_set", "switch_exercise", "add_exercise", "undo", "edit_last_set", "edit_set", "delete_set", "skip_exercise"

    // For log_set
    let exerciseTemplateId: String?
    let exerciseName: String?
    let weightKg: Double?
    let reps: Int?
    let rpe: Double?
    let setType: String?  // "normal", "warmup", "failure", "dropset"

    // For switch_exercise
    let switchFrom: String?
    let switchTo: String?

    // For add_exercise
    let setCount: Int?
    let repsTarget: Int?

    // For edit_set (specific)
    let targetSetNumber: Int?
    let targetExerciseName: String?

    // Metadata
    let confidence: Double
    let reasoning: String?
}

struct UnifiedVoiceCommandResponse: Codable {
    let command: UnifiedVoiceCommand
}

// MARK: - Application Command Types

/// Result of unified classification
enum UnifiedCommandResult {
    // Set logging
    case logSet(exerciseTemplateId: String, exerciseName: String, weight: Double?, reps: Int?, rpe: Double?, setType: SetType)

    // Workout modifications
    case switchExercise(from: String, to: String)
    case addExercise(name: String, setCount: Int?, repsTarget: Int?)
    case skipExercise

    // Corrections
    case undo
    case editLastSet(changes: SetEditChanges)
    case editSet(setNumber: Int, exerciseName: String?, changes: SetEditChanges)
    case deleteSet(setNumber: Int?, exerciseName: String?)
}

struct SetEditChanges {
    let weightKg: Double?
    let reps: Int?
    let rpe: Double?
}

// MARK: - Unified Voice Command Classifier

@MainActor
class UnifiedVoiceCommandClassifier {

    /// Parse voice command with single LLM call with full context
    /// - Parameters:
    ///   - text: Transcribed voice input
    ///   - workoutState: Current workout state for context
    ///   - historyService: Service to fetch historical workout data
    ///   - contextResolver: Service to track conversation and referents
    /// - Returns: Parsed command or nil if parsing failed
    func classify(
        _ text: String,
        workoutState: WorkoutState?,
        historyService: WorkoutHistoryService? = nil,
        contextResolver: ContextResolver? = nil
    ) async -> UnifiedCommandResult? {
        print("🚀 [UnifiedClassifier] Processing: \"\(text)\"")

        guard let apiKey = AppSettings.shared.openAIKey else {
            print("❌ [UnifiedClassifier] OpenAI API key not found")
            return nil
        }

        // Build comprehensive context information
        let contextInfo = await buildEnhancedContext(
            text: text,
            workoutState: workoutState,
            historyService: historyService,
            contextResolver: contextResolver
        )

        // Send single unified classification request
        guard let response = await sendUnifiedRequest(
            text: text,
            contextInfo: contextInfo,
            apiKey: apiKey
        ) else {
            return nil
        }

        let command = response.command

        print("✅ [UnifiedClassifier] Detected: \(command.commandType) (confidence: \(command.confidence))")
        if let reasoning = command.reasoning {
            print("💭 [UnifiedClassifier] Reasoning: \(reasoning)")
        }

        // Convert to application command type
        return convertToCommandResult(command, workoutState: workoutState)
    }

    // MARK: - Private Methods

    private func buildEnhancedContext(
        text: String,
        workoutState: WorkoutState?,
        historyService: WorkoutHistoryService?,
        contextResolver: ContextResolver?
    ) async -> String {
        guard let workoutState = workoutState else {
            return "No active workout."
        }

        var context = workoutState.toLLMContext()

        // Add historical context if available
        if let historyService = historyService,
           let nextSet = workoutState.nextSet() {

            if let lastWorkoutSets = historyService.getLastWorkoutSets(for: nextSet.exercise.exerciseTemplateId),
               !lastWorkoutSets.isEmpty {

                // Get matching set from last workout
                let matchingSet: CompletedSet
                if nextSet.setNumber <= lastWorkoutSets.count {
                    matchingSet = lastWorkoutSets[nextSet.setNumber - 1]
                } else {
                    matchingSet = lastWorkoutSets.last!
                }

                context += """

                LAST WORKOUT (for \(nextSet.exercise.name)):
                - Set \(nextSet.setNumber): \(formatSetSummary(matchingSet))

                """
            }
        }

        // Add conversation context (last logged set) if available
        if let contextResolver = contextResolver,
           let lastLogged = contextResolver.getLastLoggedSet() {

            context += """

            JUST LOGGED (current workout):
            - Exercise: \(lastLogged.exercise.name)
            - Set \(lastLogged.setNumber): \(formatSetSummary(lastLogged.set))

            """
        }

        // Add referential resolution hints
        if let contextResolver = contextResolver {
            let resolved = contextResolver.resolve(text, workoutState: workoutState)

            if resolved.copyValues || resolved.useHistoricalData {
                context += """

                REFERENTIAL HINTS:
                """

                if resolved.copyValues, let ref = resolved.referenceValues {
                    context += "\n- User said 'same as before' → Reference values: \(formatSetSummary(ref))"
                }

                if resolved.useHistoricalData {
                    context += "\n- User mentioned 'last workout' → Use historical data above"
                }

                if let weight = resolved.weightReference {
                    context += "\n- 'That weight' refers to: \(weight)kg"
                }

                context += "\n"
            }
        }

        return context
    }

    private func formatSetSummary(_ set: CompletedSet) -> String {
        var parts: [String] = []

        if let weight = set.actualWeight {
            parts.append("\(weight)kg")
        }
        if let reps = set.actualReps {
            parts.append("×\(reps)")
        }
        if let rpe = set.actualRPE {
            parts.append("RPE \(rpe)")
        }
        if let duration = set.actualDuration {
            parts.append("\(duration)sec")
        }

        return parts.isEmpty ? "No data" : parts.joined(separator: " ")
    }

    private func convertToCommandResult(_ command: UnifiedVoiceCommand, workoutState: WorkoutState?) -> UnifiedCommandResult? {
        switch command.commandType {
        case "log_set":
            // For log_set, we need exerciseTemplateId and exerciseName
            // Priority: 1) NEXT UP from workout, 2) explicit name (requires lookup), 3) fail
            let exerciseTemplateId: String
            let exerciseName: String

            if let nextSet = workoutState?.nextSet() {
                // PREFERRED: Use NEXT UP exercise (most common case)
                exerciseTemplateId = nextSet.exercise.exerciseTemplateId
                exerciseName = nextSet.exercise.name
            } else if let name = command.exerciseName {
                // FALLBACK: User explicitly mentioned exercise name
                // This happens in free-form workouts or when user specifies "80kg bench press"
                // Note: We'll need to look up the template ID from the name
                // For now, use a placeholder - handleLogSet will need to handle this
                exerciseTemplateId = ""  // Empty = needs lookup
                exerciseName = name
            } else {
                print("⚠️ [UnifiedClassifier] log_set missing exercise context")
                return nil
            }

            let setType = SetType(rawValue: command.setType ?? "normal") ?? .normal

            return .logSet(
                exerciseTemplateId: exerciseTemplateId,
                exerciseName: exerciseName,
                weight: command.weightKg,
                reps: command.reps,
                rpe: command.rpe,
                setType: setType
            )

        case "switch_exercise":
            guard let from = command.switchFrom, let to = command.switchTo else {
                print("⚠️ [UnifiedClassifier] switch_exercise missing from/to")
                return nil
            }
            return .switchExercise(from: from, to: to)

        case "add_exercise":
            guard let name = command.exerciseName else {
                print("⚠️ [UnifiedClassifier] add_exercise missing name")
                return nil
            }
            return .addExercise(name: name, setCount: command.setCount, repsTarget: command.repsTarget)

        case "skip_exercise":
            return .skipExercise

        case "undo":
            return .undo

        case "edit_last_set":
            let changes = SetEditChanges(
                weightKg: command.weightKg,
                reps: command.reps,
                rpe: command.rpe
            )
            return .editLastSet(changes: changes)

        case "edit_set":
            guard let setNumber = command.targetSetNumber else {
                print("⚠️ [UnifiedClassifier] edit_set missing setNumber")
                return nil
            }
            let changes = SetEditChanges(
                weightKg: command.weightKg,
                reps: command.reps,
                rpe: command.rpe
            )
            return .editSet(setNumber: setNumber, exerciseName: command.targetExerciseName, changes: changes)

        case "delete_set":
            return .deleteSet(setNumber: command.targetSetNumber, exerciseName: command.targetExerciseName)

        default:
            print("⚠️ [UnifiedClassifier] Unknown command type: \(command.commandType)")
            return nil
        }
    }

    private func sendUnifiedRequest(
        text: String,
        contextInfo: String,
        apiKey: String
    ) async -> UnifiedVoiceCommandResponse? {
        let endpoint = "https://api.openai.com/v1/chat/completions"

        // Define comprehensive JSON schema for all command types
        let schema: [String: Any] = [
            "type": "json_schema",
            "json_schema": [
                "name": "unified_voice_command",
                "strict": true,
                "schema": [
                    "type": "object",
                    "properties": [
                        "command": [
                            "type": "object",
                            "properties": [
                                "commandType": [
                                    "type": "string",
                                    "enum": ["log_set", "switch_exercise", "add_exercise", "skip_exercise", "undo", "edit_last_set", "edit_set", "delete_set"]
                                ],
                                "exerciseTemplateId": ["type": ["string", "null"]],
                                "exerciseName": ["type": ["string", "null"]],
                                "weightKg": ["type": ["number", "null"]],
                                "reps": ["type": ["integer", "null"]],
                                "rpe": ["type": ["number", "null"]],
                                "setType": ["type": ["string", "null"]],
                                "switchFrom": ["type": ["string", "null"]],
                                "switchTo": ["type": ["string", "null"]],
                                "setCount": ["type": ["integer", "null"]],
                                "repsTarget": ["type": ["integer", "null"]],
                                "targetSetNumber": ["type": ["integer", "null"]],
                                "targetExerciseName": ["type": ["string", "null"]],
                                "confidence": ["type": "number"],
                                "reasoning": ["type": ["string", "null"]]
                            ],
                            "required": [
                                "commandType", "exerciseTemplateId", "exerciseName", "weightKg", "reps", "rpe", "setType",
                                "switchFrom", "switchTo", "setCount", "repsTarget", "targetSetNumber", "targetExerciseName",
                                "confidence", "reasoning"
                            ],
                            "additionalProperties": false
                        ]
                    ],
                    "required": ["command"],
                    "additionalProperties": false
                ]
            ]
        ]

        // Build comprehensive system message
        let systemMessage = """
        You are a unified workout voice command classifier with FULL WORKOUT CONTEXT.

        You can see:
        - The complete routine structure with all exercises and supersets
        - What the user did in their LAST WORKOUT for this exercise
        - What they JUST LOGGED in the current workout
        - Referential hints when they say "same as before" or "last workout"

        Parse ANY voice command into ONE of these types, using ALL available context.

        \(contextInfo)

        COMMAND TYPES:

        1. "log_set" - User is logging a new set (MOST COMMON)
           - Patterns: "80 kg 8 reps", "100 for 10", "85 times 8 RPE 8", "80kg bench press"
           - Extract: weightKg, reps, rpe (optional), setType (default: "normal")
           - exerciseName: Extract ONLY if user explicitly mentions exercise name (rare)
           - exerciseTemplateId: Always null (app will look up template from name)
           - Most commands won't mention exercise - in that case, set exerciseName to null

        2. "switch_exercise" - Replace current exercise with different one
           - Patterns: "replace this with incline bench", "switch to dumbbells", "use cables instead"
           - Extract switchFrom: Use the exercise name from "NEXT UP" in context above
           - Extract switchTo: The new exercise name the user mentioned

        3. "add_exercise" - Add new exercise to workout
           - Patterns: "add pull-ups", "add 3 sets of bench press"
           - Extract: exerciseName, setCount (default: 3), repsTarget (optional)

        4. "skip_exercise" - Skip current exercise
           - Patterns: "skip this", "move to next", "done with squats"

        5. "undo" - Undo last action
           - Patterns: "undo", "go back", "cancel", "scratch that"

        6. "edit_last_set" - Modify the most recent set
           - Patterns: "actually that was 12 reps", "change last to 90kg"
           - Extract: weightKg, reps, rpe (what changed)

        7. "edit_set" - Modify a specific set
           - Patterns: "edit 2nd set to 100kg", "change set 3 of bench press"
           - Extract: targetSetNumber, targetExerciseName (optional), weightKg, reps, rpe

        8. "delete_set" - Remove a set
           - Patterns: "delete last set", "remove set 2"
           - Extract: targetSetNumber (optional), targetExerciseName (optional)

        EXAMPLES:

        Normal logging:
        - "80 for 8" → log_set, weightKg: 80, reps: 8
        - "100 kg 10 reps RPE 8.5" → log_set, weightKg: 100, reps: 10, rpe: 8.5

        Referential language (use JUST LOGGED or LAST WORKOUT context):
        - "same as before" → log_set, copy values from JUST LOGGED
        - "same weight 10 reps" → log_set, copy weight from JUST LOGGED, reps: 10
        - "last workout" → log_set, copy values from LAST WORKOUT section
        - "repeat" → log_set, copy values from JUST LOGGED

        Exercise modifications:
        - "replace this with incline bench" → switch_exercise, switchFrom: [NEXT UP exercise], switchTo: "incline bench"
        - "add pull-ups" → add_exercise, exerciseName: "pull-ups", setCount: 3

        Corrections:
        - "undo" → undo
        - "actually 12 reps" → edit_last_set, reps: 12
        - "change last set to 90kg" → edit_last_set, weightKg: 90
        - "edit set 2 to 90kg 8 reps" → edit_set, targetSetNumber: 2, weightKg: 90, reps: 8

        IMPORTANT RULES:
        - When user says "same"/"repeat"/"again", look at JUST LOGGED section and copy those values
        - When user says "last workout", look at LAST WORKOUT section and copy those values
        - When REFERENTIAL HINTS section exists, follow those instructions exactly
        - For "log_set", leave exerciseTemplateId and exerciseName as null (inferred from NEXT UP)
        - For "switch_exercise", extract current exercise name from "NEXT UP" line
        - RPE must be between 6-10 if specified
        - Return confidence 0.0-1.0 and reasoning for your classification
        """

        let userMessage = "Classify this command: \"\(text)\""

        let requestBody: [String: Any] = [
            "model": "gpt-4o",
            "messages": [
                ["role": "system", "content": systemMessage],
                ["role": "user", "content": userMessage]
            ],
            "response_format": schema,
            "temperature": 0.0,
            "max_tokens": 500
        ]

        print("📡 [UnifiedClassifier] Sending request...")

        do {
            let jsonData = try JSONSerialization.data(withJSONObject: requestBody)

            var request = URLRequest(url: URL(string: endpoint)!)
            request.httpMethod = "POST"
            request.setValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.httpBody = jsonData
            request.timeoutInterval = 30

            let (data, response) = try await URLSession.shared.data(for: request)

            guard let httpResponse = response as? HTTPURLResponse else {
                print("❌ [UnifiedClassifier] Invalid response type")
                return nil
            }

            print("📥 [UnifiedClassifier] Response status: \(httpResponse.statusCode)")

            if httpResponse.statusCode != 200 {
                let errorText = String(data: data, encoding: .utf8) ?? "Unknown error"
                print("❌ [UnifiedClassifier] API error: \(errorText)")
                return nil
            }

            // Parse response
            let responseJSON = try JSONSerialization.jsonObject(with: data) as? [String: Any]
            guard let choices = responseJSON?["choices"] as? [[String: Any]],
                  let firstChoice = choices.first,
                  let message = firstChoice["message"] as? [String: Any],
                  let contentString = message["content"] as? String else {
                print("❌ [UnifiedClassifier] Invalid response structure")
                return nil
            }

            print("📄 [UnifiedClassifier] Response: \(contentString)")

            // Decode structured output
            let contentData = contentString.data(using: .utf8)!
            let decoder = JSONDecoder()
            let parsedResponse = try decoder.decode(UnifiedVoiceCommandResponse.self, from: contentData)

            return parsedResponse

        } catch {
            print("❌ [UnifiedClassifier] Error: \(error.localizedDescription)")
            return nil
        }
    }
}
