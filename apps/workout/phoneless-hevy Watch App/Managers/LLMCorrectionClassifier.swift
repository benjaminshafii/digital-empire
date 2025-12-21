//
//  LLMCorrectionClassifier.swift
//  phoneless-hevy Watch App
//
//  LLM-based correction command classifier using GPT-4o structured outputs
//

import Foundation

// MARK: - Structured Output Models

/// Correction command parsed by LLM
struct LLMCorrectionCommand: Codable {
    let isCorrection: Bool
    let correctionType: String  // "undo", "edit", "delete", "none"
    let targetSet: SetTarget?
    let changes: SetChanges?
    let confidence: Double
    let reasoning: String?
}

struct SetTarget: Codable {
    let exerciseName: String?  // nil = current/last exercise
    let setNumber: Int?  // nil = last set of exercise
    let reference: String  // "last", "prev", "2nd", "specific number", etc.
}

struct SetChanges: Codable {
    let weightKg: Double?
    let reps: Int?
    let rpe: Double?
    let durationSeconds: Int?
}

/// Response format for structured outputs
struct LLMCorrectionResponse: Codable {
    let command: LLMCorrectionCommand
}

// MARK: - LLM Correction Classifier

@MainActor
class LLMCorrectionClassifier {

    /// Classify if input is a correction command and extract details
    /// - Parameters:
    ///   - text: Transcribed voice input
    ///   - workoutState: Current workout state for context
    /// - Returns: Parsed correction command or nil if not a correction
    func classify(_ text: String, workoutState: WorkoutState?) async -> CorrectionCommandParser.CommandType? {
        print("🤖 [LLMCorrection] Classifying: \"\(text)\"")

        guard let apiKey = AppSettings.shared.openAIKey else {
            print("❌ [LLMCorrection] OpenAI API key not found")
            return nil
        }

        // Build context information from workout state
        let contextInfo = buildContextInfo(workoutState: workoutState)

        // Send structured output request
        guard let response = await sendClassificationRequest(
            text: text,
            contextInfo: contextInfo,
            apiKey: apiKey
        ) else {
            return nil
        }

        let command = response.command

        // Not a correction
        guard command.isCorrection else {
            print("📝 [LLMCorrection] Not a correction command")
            return nil
        }

        print("✅ [LLMCorrection] Detected: \(command.correctionType)")
        if let reasoning = command.reasoning {
            print("💭 [LLMCorrection] Reasoning: \(reasoning)")
        }

        // Convert to app's command type
        return convertToCommandType(command)
    }

    // MARK: - Private Methods

    private func buildContextInfo(workoutState: WorkoutState?) -> String {
        guard let workoutState = workoutState else {
            return "No active workout."
        }

        // Use WorkoutState's built-in LLM context generation
        return workoutState.toLLMContext()
    }

    private func convertToCommandType(_ command: LLMCorrectionCommand) -> CorrectionCommandParser.CommandType? {
        switch command.correctionType {
        case "undo":
            return .undo

        case "edit":
            guard let changes = command.changes else {
                print("⚠️ [LLMCorrection] Edit command missing changes")
                return nil
            }

            let editChanges = CorrectionCommandParser.EditChanges(
                newWeight: changes.weightKg,
                newReps: changes.reps,
                newRPE: changes.rpe,
                newDuration: changes.durationSeconds
            )

            // Check if there's a specific target
            if let target = command.targetSet,
               target.exerciseName != nil || target.setNumber != nil {
                let reference = CorrectionCommandParser.SetReference(
                    targetExercise: target.exerciseName,
                    setNumber: target.setNumber
                )
                return .editSet(reference: reference, changes: editChanges)
            } else {
                // No specific target, edit last set
                return .editLastSet(changes: editChanges)
            }

        case "delete":
            let reference = CorrectionCommandParser.SetReference(
                targetExercise: command.targetSet?.exerciseName,
                setNumber: command.targetSet?.setNumber
            )
            return .deleteSet(reference: reference)

        default:
            return nil
        }
    }

    private func sendClassificationRequest(
        text: String,
        contextInfo: String,
        apiKey: String
    ) async -> LLMCorrectionResponse? {
        let endpoint = "https://api.openai.com/v1/chat/completions"

        // Define JSON schema for structured outputs
        let schema: [String: Any] = [
            "type": "json_schema",
            "json_schema": [
                "name": "correction_classification",
                "strict": true,
                "schema": [
                    "type": "object",
                    "properties": [
                        "command": [
                            "type": "object",
                            "properties": [
                                "isCorrection": ["type": "boolean"],
                                "correctionType": [
                                    "type": "string",
                                    "enum": ["undo", "edit", "delete", "none"]
                                ],
                                "targetSet": [
                                    "type": ["object", "null"],
                                    "properties": [
                                        "exerciseName": ["type": ["string", "null"]],
                                        "setNumber": ["type": ["integer", "null"]],
                                        "reference": ["type": "string"]
                                    ],
                                    "required": ["exerciseName", "setNumber", "reference"],
                                    "additionalProperties": false
                                ],
                                "changes": [
                                    "type": ["object", "null"],
                                    "properties": [
                                        "weightKg": ["type": ["number", "null"]],
                                        "reps": ["type": ["integer", "null"]],
                                        "rpe": ["type": ["number", "null"]],
                                        "durationSeconds": ["type": ["integer", "null"]]
                                    ],
                                    "required": ["weightKg", "reps", "rpe", "durationSeconds"],
                                    "additionalProperties": false
                                ],
                                "confidence": ["type": "number"],
                                "reasoning": ["type": ["string", "null"]]
                            ],
                            "required": ["isCorrection", "correctionType", "targetSet", "changes", "confidence", "reasoning"],
                            "additionalProperties": false
                        ]
                    ],
                    "required": ["command"],
                    "additionalProperties": false
                ]
            ]
        ]

        // Build system message
        let systemMessage = """
        You are a workout correction classifier. Determine if the user wants to correct/undo a previous action.

        CURRENT WORKOUT STATE:
        \(contextInfo)

        CORRECTION TYPES:
        1. "undo" - User wants to undo the last action
           - Patterns: "undo", "go back", "cancel", "nevermind", "scratch that"

        2. "edit" - User wants to modify a previous set
           - Patterns: "actually", "made mistake", "change", "fix", "correct", "prev/previous set", "2nd set"
           - Extract what changed: weight, reps, RPE, duration
           - Extract which set: "prev/last" (nil setNumber), "2nd set" (setNumber: 2), etc.
           - Extract which exercise: "of [exercise name]" or nil for current/last

        3. "delete" - User wants to remove a set
           - Patterns: "delete", "remove", "erase"

        4. "none" - Not a correction, regular workout command

        SET REFERENCE PATTERNS:
        - "last set", "prev set", "previous set" → setNumber: nil (means most recent)
        - "2nd set", "second set", "set 2" → setNumber: 2
        - "3rd set of bench press" → setNumber: 3, exerciseName: "bench press"
        - No mention → setNumber: nil, exerciseName: nil (last set of current exercise)

        EXAMPLES:
        - "actually that was 12 reps" → edit, setNumber: nil, changes: {reps: 12}
        - "made mistake on prev set did 100kg" → edit, setNumber: nil, changes: {weightKg: 100}
        - "edit 2nd set of incline press i did rpe 8" → edit, setNumber: 2, exerciseName: "incline press", changes: {rpe: 8}
        - "undo" → undo
        - "100kg 8 reps" → NOT a correction (isCorrection: false)

        Return confidence 0.0-1.0 and optional reasoning for your classification.
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

        print("📡 [LLMCorrection] Sending classification request...")

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
                print("❌ [LLMCorrection] Invalid response type")
                return nil
            }

            print("📥 [LLMCorrection] Response status: \(httpResponse.statusCode)")

            if httpResponse.statusCode != 200 {
                let errorText = String(data: data, encoding: .utf8) ?? "Unknown error"
                print("❌ [LLMCorrection] API error: \(errorText)")
                return nil
            }

            // Parse response
            let responseJSON = try JSONSerialization.jsonObject(with: data) as? [String: Any]
            guard let choices = responseJSON?["choices"] as? [[String: Any]],
                  let firstChoice = choices.first,
                  let message = firstChoice["message"] as? [String: Any],
                  let contentString = message["content"] as? String else {
                print("❌ [LLMCorrection] Invalid response structure")
                return nil
            }

            print("📄 [LLMCorrection] Response: \(contentString)")

            // Decode structured output
            let contentData = contentString.data(using: .utf8)!
            let decoder = JSONDecoder()
            let parsedResponse = try decoder.decode(LLMCorrectionResponse.self, from: contentData)

            return parsedResponse

        } catch {
            print("❌ [LLMCorrection] Error: \(error.localizedDescription)")
            return nil
        }
    }
}
