//
//  LLMWorkoutParserEnhanced.swift
//  phoneless-hevy Watch App
//
//  Branch 1: Enhanced LLM parser with historical context
//  This extends the base LLMWorkoutParser with history-aware prompts
//

import Foundation

extension LLMWorkoutParser {

    /// Build contextual prompt with historical workout data
    /// - Parameters:
    ///   - transcription: User's voice input
    ///   - workoutState: Current workout state
    ///   - historyService: History service for fetching last workout data
    /// - Returns: Enhanced prompt string with historical context
    func buildContextualPrompt(
        transcription: String,
        workoutState: WorkoutState,
        historyService: WorkoutHistoryService
    ) async -> String {

        // Get current context
        guard let nextSet = workoutState.nextSet() else {
            return buildBasicPrompt(transcription: transcription)
        }

        var prompt = """
        You are a workout logging assistant. Parse the user's voice input into structured workout data.

        CURRENT CONTEXT:
        - Exercise: \(nextSet.exercise.name)
        - Set Number: \(nextSet.setNumber)
        - Template ID: \(nextSet.exercise.exerciseTemplateId)

        """

        // Add last workout context if available
        let lastWorkoutSets = try? await historyService.fetchLastWorkout(
            for: nextSet.exercise.exerciseTemplateId
        )

        if let lastSets = lastWorkoutSets, !lastSets.isEmpty {
            // Get matching set from last workout
            let matchingSet: CompletedSet = lastSets.indices.contains(nextSet.setNumber - 1) ?
                lastSets[nextSet.setNumber - 1] : lastSets.last!

            prompt += """

            LAST WORKOUT DATA (for reference):
            - Exercise: \(nextSet.exercise.name)
            - Set \(nextSet.setNumber): \(matchingSet.summary)

            """

            // Add trend information if available
            if let stats = await historyService.getAveragePerformance(for: nextSet.exercise.exerciseTemplateId) {
                let trendSymbol = stats.trend == .increasing ? "↗" : stats.trend == .decreasing ? "↘" : "→"
                prompt += """
                - Average Performance: \(Int(stats.avgWeight))kg × \(stats.avgReps) @ RPE \(String(format: "%.1f", stats.avgRPE))
                - Trend: \(trendSymbol) \(stats.trend)

                """
            }
        }

        // Add "just logged" context from current workout
        if let lastLogged = getLastLoggedSet(from: workoutState) {
            let loggedSet: CompletedSet = lastLogged.set
            prompt += """

            JUST LOGGED (current workout):
            - Exercise: \(lastLogged.exercise.name)
            - Set: \(loggedSet.summary)

            """
        }

        // Add referential resolution instructions
        prompt += """

        USER INPUT: "\(transcription)"

        REFERENTIAL RESOLUTION RULES:
        - "same" or "like before" → Use values from JUST LOGGED
        - "last workout" or "previous workout" → Use values from LAST WORKOUT DATA
        - "heavier" or "more weight" → Increase weight from reference
        - "lighter" or "less weight" → Decrease weight from reference

        OUTPUT FORMAT (JSON):
        {
          "exerciseTemplateId": "\(nextSet.exercise.exerciseTemplateId)",
          "exerciseName": "\(nextSet.exercise.name)",
          "set": {
            "weightKg": <number or null>,
            "reps": <number or null>,
            "rpe": <number 6-10 or null>,
            "type": "normal"
          }
        }

        IMPORTANT RULES:
        1. Always output valid JSON
        2. If user references "same" or "before", copy those values
        3. RPE must be between 6-10
        4. Weight must be in kilograms
        5. If uncertain, use null for optional fields
        """

        return prompt
    }

    /// Build basic prompt without historical context
    private func buildBasicPrompt(transcription: String) -> String {
        return """
        You are a workout logging assistant. Parse the user's voice input into structured workout data.

        USER INPUT: "\(transcription)"

        OUTPUT FORMAT (JSON):
        {
          "exerciseTemplateId": "<id>",
          "exerciseName": "<name>",
          "set": {
            "weightKg": <number or null>,
            "reps": <number or null>,
            "rpe": <number 6-10 or null>,
            "type": "normal"
          }
        }

        Extract any weight, reps, and RPE mentioned. Use null for missing values.
        """
    }

    /// Get the last logged set from current workout
    private func getLastLoggedSet(from workoutState: WorkoutState) -> (exercise: WorkoutStateExercise, set: CompletedSet)? {
        // Find exercise with most recent completed set
        for exercise in workoutState.exercises.reversed() {
            if let lastSet = exercise.completedSets.last {
                return (exercise, lastSet)
            }
        }
        return nil
    }
}

// Note: CompletedSet.summary extension is defined in WorkoutHistoryService.swift
