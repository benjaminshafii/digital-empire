//
//  LLMWorkoutParser.swift
//  phoneless-hevy Watch App
//
//  Created by Claude Code on 10/22/25.
//  LLM-based workout command parser using GPT-4o structured outputs
//

import Foundation

// MARK: - Structured Output Models

/// Workout set parsed by LLM
struct LLMWorkoutSet: Codable {
    let exerciseTemplateId: String
    let exerciseName: String
    let weightKg: Double?
    let reps: Int?
    let rpe: Double?
    let durationSeconds: Int?
    let setType: String  // "warmup", "normal", "failure", "dropset"
    let confidence: Double
    let reasoning: String?  // Optional: LLM's explanation
}

/// Response format for structured outputs
struct LLMWorkoutParseResponse: Codable {
    let success: Bool
    let workoutSet: LLMWorkoutSet?
    let error: String?
}

// MARK: - LLM Workout Parser

@MainActor
class LLMWorkoutParser {
    private let exerciseManager = ExerciseManager.shared

    /// Parse workout command using GPT-4o structured outputs
    /// - Parameters:
    ///   - text: Transcribed voice input
    ///   - workoutState: Current workout state (living document) (optional)
    /// - Returns: Parsed workout command
    func parse(_ text: String, workoutState: WorkoutState? = nil) async -> ParsedWorkoutCommand? {
        print("🤖 [LLMParser] Parsing: \"\(text)\"")

        guard let apiKey = AppSettings.shared.openAIKey else {
            print("❌ [LLMParser] OpenAI API key not found")
            return nil
        }

        // Build exercise list for context
        let exerciseList = buildExerciseList(workoutState: workoutState)

        // Build context information from workout state
        let contextInfo = buildContextInfo(workoutState: workoutState)

        // Create structured output request
        let response = await sendStructuredOutputRequest(
            text: text,
            exerciseList: exerciseList,
            contextInfo: contextInfo,
            apiKey: apiKey
        )

        guard let llmSet = response?.workoutSet else {
            print("❌ [LLMParser] No workout set parsed")
            return nil
        }

        print("✅ [LLMParser] Parsed: \(llmSet.exerciseName), \(llmSet.weightKg ?? 0)kg × \(llmSet.reps ?? 0)")
        if let reasoning = llmSet.reasoning {
            print("💭 [LLMParser] Reasoning: \(reasoning)")
        }

        // Convert to app's WorkoutSet model
        let setType = SetType(rawValue: llmSet.setType) ?? .normal
        let workoutSet = WorkoutSet(
            type: setType,
            weightKg: llmSet.weightKg,
            reps: llmSet.reps,
            rpe: llmSet.rpe,
            distanceMeters: nil,
            durationSeconds: llmSet.durationSeconds,
            customMetric: nil
        )

        return ParsedWorkoutCommand(
            exerciseTemplateId: llmSet.exerciseTemplateId,
            exerciseName: llmSet.exerciseName,
            set: workoutSet,
            confidence: llmSet.confidence
        )
    }

    // MARK: - Private Methods

    /// Build exercise list for LLM context
    private func buildExerciseList(workoutState: WorkoutState?) -> String {
        var exercises: [(id: String, name: String, inWorkout: Bool)] = []

        // Prioritize exercises from current workout state
        if let workoutState = workoutState {
            for exercise in workoutState.exercises {
                exercises.append((exercise.exerciseTemplateId, exercise.name, true))
            }
        }

        // Add all other exercises (up to 100 most common)
        let allTemplates = exerciseManager.exerciseTemplates.prefix(100)
        for template in allTemplates {
            if !exercises.contains(where: { $0.id == template.id }) {
                exercises.append((template.id, template.title, false))
            }
        }

        // Format as JSON for LLM
        let exerciseList = exercises.map { exercise in
            """
            {"id": "\(exercise.id)", "name": "\(exercise.name)", "in_workout": \(exercise.inWorkout)}
            """
        }.joined(separator: ",\n  ")

        return "[\n  \(exerciseList)\n]"
    }

    /// Build context information string from workout state
    private func buildContextInfo(workoutState: WorkoutState?) -> String {
        guard let workoutState = workoutState else {
            return "No active workout."
        }

        // Use WorkoutState's built-in LLM context generation
        return workoutState.toLLMContext()
    }

    /// Send structured output request to GPT-4o
    private func sendStructuredOutputRequest(
        text: String,
        exerciseList: String,
        contextInfo: String,
        apiKey: String
    ) async -> LLMWorkoutParseResponse? {
        let endpoint = "https://api.openai.com/v1/chat/completions"

        // Define JSON schema for structured outputs
        let schema: [String: Any] = [
            "type": "json_schema",
            "json_schema": [
                "name": "workout_parse_response",
                "strict": true,
                "schema": [
                    "type": "object",
                    "properties": [
                        "success": ["type": "boolean"],
                        "workoutSet": [
                            "type": "object",
                            "properties": [
                                "exerciseTemplateId": ["type": "string"],
                                "exerciseName": ["type": "string"],
                                "weightKg": ["type": ["number", "null"]],
                                "reps": ["type": ["integer", "null"]],
                                "rpe": ["type": ["number", "null"]],
                                "durationSeconds": ["type": ["integer", "null"]],
                                "setType": [
                                    "type": "string",
                                    "enum": ["warmup", "normal", "failure", "dropset"]
                                ],
                                "confidence": ["type": "number"],
                                "reasoning": ["type": ["string", "null"]]
                            ],
                            "required": [
                                "exerciseTemplateId",
                                "exerciseName",
                                "weightKg",
                                "reps",
                                "rpe",
                                "durationSeconds",
                                "setType",
                                "confidence",
                                "reasoning"
                            ],
                            "additionalProperties": false
                        ],
                        "error": ["type": ["string", "null"]]
                    ],
                    "required": ["success", "workoutSet", "error"],
                    "additionalProperties": false
                ]
            ]
        ]

        // Build system message
        let systemMessage = """
        You are a workout tracking assistant. Parse voice commands into structured workout data.

        AVAILABLE EXERCISES:
        \(exerciseList)

        CURRENT WORKOUT STATE:
        \(contextInfo)

        INSTRUCTIONS:
        1. Match exercise names to the exercise ID from the list (prioritize in_workout:true exercises)
        2. Extract weight (convert pounds to kg: 1 lb = 0.453592 kg)
        3. Extract reps, RPE (6-10 scale), and duration if mentioned
        4. If user says "same", use the last completed set from the current workout context
        5. If no exercise name is mentioned, use the "NEXT UP" exercise from context or current exercise
        6. Determine setType: "warmup", "normal", "failure", or "dropset"
        7. Return confidence (0.0-1.0) based on clarity of input
        8. Optionally provide reasoning for your parse

        COMMON PATTERNS:
        - "bench press 100 kilos 8 reps" → weightKg:100, reps:8
        - "225 pounds 5" → weightKg:102.06, reps:5
        - "same" → repeat last set from current exercise
        - "8 reps" → reps:8 (use NEXT UP exercise from context)
        - "RPE 8" → rpe:8.0

        If you cannot parse the command, set success:false and provide an error message.
        """

        // Build user message
        let userMessage = "Parse this workout command: \"\(text)\""

        // Create request body
        let requestBody: [String: Any] = [
            "model": "gpt-4o",
            "messages": [
                ["role": "system", "content": systemMessage],
                ["role": "user", "content": userMessage]
            ],
            "response_format": schema,
            "temperature": 0.0,  // Deterministic outputs
            "max_tokens": 500
        ]

        print("📡 [LLMParser] Sending request to GPT-4o...")

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
                print("❌ [LLMParser] Invalid response type")
                return nil
            }

            print("📥 [LLMParser] Response status: \(httpResponse.statusCode)")

            if httpResponse.statusCode != 200 {
                let errorText = String(data: data, encoding: .utf8) ?? "Unknown error"
                print("❌ [LLMParser] API error: \(errorText)")
                return nil
            }

            // Parse response
            let responseJSON = try JSONSerialization.jsonObject(with: data) as? [String: Any]
            guard let choices = responseJSON?["choices"] as? [[String: Any]],
                  let firstChoice = choices.first,
                  let message = firstChoice["message"] as? [String: Any],
                  let contentString = message["content"] as? String else {
                print("❌ [LLMParser] Invalid response structure")
                return nil
            }

            print("📄 [LLMParser] Response content: \(contentString)")

            // Decode structured output
            let contentData = contentString.data(using: .utf8)!
            let decoder = JSONDecoder()
            let parsedResponse = try decoder.decode(LLMWorkoutParseResponse.self, from: contentData)

            return parsedResponse

        } catch {
            print("❌ [LLMParser] Error: \(error.localizedDescription)")
            return nil
        }
    }
}
