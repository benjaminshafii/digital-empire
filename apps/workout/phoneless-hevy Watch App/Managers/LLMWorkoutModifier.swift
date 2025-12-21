//
//  LLMWorkoutModifier.swift
//  phoneless-hevy Watch App
//
//  LLM-based workout modification classifier (add/switch exercises)
//

import Foundation

// MARK: - Structured Output Models

/// Workout modification command parsed by LLM
struct LLMModificationCommand: Codable {
    let isModification: Bool
    let modificationType: String  // "add", "switch", "skip", "none"
    let exerciseName: String?
    let setCount: Int?          // NEW: Number of sets to add
    let repsTarget: Int?         // NEW: Target reps per set (optional)
    let switchFrom: String?  // For switch: current exercise name
    let confidence: Double
    let reasoning: String?
}

/// Response format for structured outputs
struct LLMModificationResponse: Codable {
    let command: LLMModificationCommand
}

// MARK: - Modification Command Type

enum WorkoutModification {
    case addExercise(name: String, setCount: Int?, repsTarget: Int?)
    case switchExercise(from: String, to: String)
    case skipExercise
}

// MARK: - LLM Workout Modifier

@MainActor
class LLMWorkoutModifier {

    /// Classify if input is a workout modification command
    /// - Parameters:
    ///   - text: Transcribed voice input
    ///   - workoutState: Current workout state for context
    /// - Returns: Parsed modification command or nil if not a modification
    func classify(_ text: String, workoutState: WorkoutState?) async -> WorkoutModification? {
        print("🤖 [LLMModifier] Classifying: \"\(text)\"")

        guard let apiKey = AppSettings.shared.openAIKey else {
            print("❌ [LLMModifier] OpenAI API key not found")
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

        // Not a modification
        guard command.isModification else {
            print("📝 [LLMModifier] Not a modification command")
            return nil
        }

        print("✅ [LLMModifier] Detected: \(command.modificationType)")
        if let reasoning = command.reasoning {
            print("💭 [LLMModifier] Reasoning: \(reasoning)")
        }

        // Convert to app's modification type
        return convertToModificationType(command)
    }

    // MARK: - Private Methods

    private func buildContextInfo(workoutState: WorkoutState?) -> String {
        guard let workoutState = workoutState else {
            return "No active workout."
        }

        // Use WorkoutState's built-in LLM context generation
        return workoutState.toLLMContext()
    }

    private func convertToModificationType(_ command: LLMModificationCommand) -> WorkoutModification? {
        switch command.modificationType {
        case "add":
            guard let exerciseName = command.exerciseName else {
                print("⚠️ [LLMModifier] Add command missing exercise name")
                return nil
            }
            return .addExercise(name: exerciseName, setCount: command.setCount, repsTarget: command.repsTarget)

        case "switch":
            guard let exerciseName = command.exerciseName,
                  let switchFrom = command.switchFrom else {
                print("⚠️ [LLMModifier] Switch command missing exercise names")
                return nil
            }
            return .switchExercise(from: switchFrom, to: exerciseName)

        case "skip":
            return .skipExercise

        default:
            return nil
        }
    }

    private func sendClassificationRequest(
        text: String,
        contextInfo: String,
        apiKey: String
    ) async -> LLMModificationResponse? {
        let endpoint = "https://api.openai.com/v1/chat/completions"

        // Define JSON schema for structured outputs
        let schema: [String: Any] = [
            "type": "json_schema",
            "json_schema": [
                "name": "modification_classification",
                "strict": true,
                "schema": [
                    "type": "object",
                    "properties": [
                        "command": [
                            "type": "object",
                            "properties": [
                                "isModification": ["type": "boolean"],
                                "modificationType": [
                                    "type": "string",
                                    "enum": ["add", "switch", "skip", "none"]
                                ],
                                "exerciseName": ["type": ["string", "null"]],
                                "setCount": ["type": ["integer", "null"]],
                                "repsTarget": ["type": ["integer", "null"]],
                                "switchFrom": ["type": ["string", "null"]],
                                "confidence": ["type": "number"],
                                "reasoning": ["type": ["string", "null"]]
                            ],
                            "required": ["isModification", "modificationType", "exerciseName", "setCount", "repsTarget", "switchFrom", "confidence", "reasoning"],
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
        You are a workout modification classifier. Determine if the user wants to add or switch exercises mid-workout.

        CURRENT WORKOUT STATE:
        \(contextInfo)

        MODIFICATION TYPES:
        1. "add" - User wants to add a new exercise to the workout
           - Patterns: "add pull-ups", "add 3 sets of bench press", "add 4 sets of 10 reps pull-ups"
           - Extract: exerciseName, setCount (default: 3 if not specified), repsTarget (optional)

        2. "switch" - User wants to replace current exercise with different variation
           - Patterns: "switch to dumbbells", "use cables instead", "barbell version"
           - Extract: exerciseName (new exercise), switchFrom (current exercise from context)

        3. "skip" - User wants to skip current exercise
           - Patterns: "skip this", "done with squats", "move to next"

        4. "none" - Not a modification, regular workout command

        EXAMPLES:
        - "add pull-ups" → add, exerciseName: "pull-ups", setCount: 3 (default), repsTarget: null
        - "add 4 sets of bench press" → add, exerciseName: "bench press", setCount: 4, repsTarget: null
        - "add 3 sets of 10 reps pull-ups" → add, exerciseName: "pull-ups", setCount: 3, repsTarget: 10
        - "add some cardio" → add, exerciseName: "cardio", setCount: 1, repsTarget: null
        - "I want to do pull ups" → add, exerciseName: "pull ups", setCount: 3 (default), repsTarget: null
        - "switch to dumbbell press" → switch, exerciseName: "dumbbell press", switchFrom: current exercise
        - "use cables instead" → switch, exerciseName: "cable", switchFrom: current exercise
        - "skip this" → skip
        - "100kg 8 reps" → NOT a modification (isModification: false)

        For "add" commands:
        - Extract setCount from phrases like "3 sets", "4 sets of", "5 sets"
        - Extract repsTarget from phrases like "10 reps", "12 reps", "8-10 reps"
        - If no set count specified, default to 3
        - If no reps specified, set repsTarget to null

        For "switch" commands, use the NEXT UP exercise from context as "switchFrom".
        Be liberal with interpretation - if user mentions equipment change, it's likely a switch.

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

        print("📡 [LLMModifier] Sending classification request...")

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
                print("❌ [LLMModifier] Invalid response type")
                return nil
            }

            print("📥 [LLMModifier] Response status: \(httpResponse.statusCode)")

            if httpResponse.statusCode != 200 {
                let errorText = String(data: data, encoding: .utf8) ?? "Unknown error"
                print("❌ [LLMModifier] API error: \(errorText)")
                return nil
            }

            // Parse response
            let responseJSON = try JSONSerialization.jsonObject(with: data) as? [String: Any]
            guard let choices = responseJSON?["choices"] as? [[String: Any]],
                  let firstChoice = choices.first,
                  let message = firstChoice["message"] as? [String: Any],
                  let contentString = message["content"] as? String else {
                print("❌ [LLMModifier] Invalid response structure")
                return nil
            }

            print("📄 [LLMModifier] Response: \(contentString)")

            // Decode structured output
            let contentData = contentString.data(using: .utf8)!
            let decoder = JSONDecoder()
            let parsedResponse = try decoder.decode(LLMModificationResponse.self, from: contentData)

            return parsedResponse

        } catch {
            print("❌ [LLMModifier] Error: \(error.localizedDescription)")
            return nil
        }
    }
}
