//
//  ContextResolver.swift
//  phoneless-hevy Watch App
//
//  Branch 3: Conversational Context & Corrections
//  Resolves referential language ("this", "that", "last one") to concrete entities
//

import Foundation
import Observation

/// Resolves anaphora (referential expressions) in voice commands
@Observable
class ContextResolver {

    // Dialogue state tracking
    private var dialogueState: DialogueState

    struct DialogueState {
        var currentExercise: WorkoutStateExercise?
        var currentSetNumber: Int = 1
        var lastLoggedSet: LoggedSetReference?
        var lastMentionedWeight: Double?
        var lastMentionedReps: Int?
        var conversationHistory: [ConversationTurn] = []
    }

    struct LoggedSetReference {
        let exercise: WorkoutStateExercise
        let set: CompletedSet
        let setNumber: Int
        let timestamp: Date
    }

    struct ConversationTurn {
        let userInput: String
        let assistantResponse: String
        let timestamp: Date
    }

    init() {
        self.dialogueState = DialogueState()
    }

    // MARK: - Referent Resolution

    /// Resolve referential expressions in user input
    /// - Parameters:
    ///   - input: User's voice input
    ///   - workoutState: Current workout state
    /// - Returns: Resolved context with identified referents
    func resolve(_ input: String, workoutState: WorkoutState) -> ResolvedContext {
        var resolved = ResolvedContext()

        // Update dialogue state
        if let nextSet = workoutState.nextSet() {
            dialogueState.currentExercise = nextSet.exercise
            dialogueState.currentSetNumber = nextSet.setNumber
        }

        let lowercased = input.lowercased()

        // Detect "this set" - refers to current exercise/set
        if lowercased.contains("this set") || lowercased.contains("current set") {
            resolved.targetExercise = dialogueState.currentExercise
            resolved.targetSetNumber = dialogueState.currentSetNumber
            print("🔍 [Context] Resolved 'this set' -> \(dialogueState.currentExercise?.name ?? "nil") Set \(dialogueState.currentSetNumber)")
        }

        // Detect "last set" - refers to most recently logged set
        if lowercased.contains("last set") || lowercased.contains("previous set") {
            resolved.targetExercise = dialogueState.lastLoggedSet?.exercise
            resolved.targetSetNumber = dialogueState.lastLoggedSet?.setNumber
            resolved.referenceValues = dialogueState.lastLoggedSet?.set
            print("🔍 [Context] Resolved 'last set' -> \(dialogueState.lastLoggedSet?.exercise.name ?? "nil") Set \(dialogueState.lastLoggedSet?.setNumber ?? 0)")
        }

        // Detect "last workout" - use historical data
        if lowercased.contains("last workout") || lowercased.contains("previous workout") {
            resolved.useHistoricalData = true
            print("🔍 [Context] Detected reference to 'last workout'")
        }

        // Detect "same as" / "like before" - copy values from reference
        if lowercased.contains("same as") || lowercased.contains("like before") ||
           lowercased.contains("same weight") || lowercased.contains("same reps") {
            resolved.copyValues = true
            resolved.referenceValues = dialogueState.lastLoggedSet?.set
            print("🔍 [Context] Detected 'same as' - will copy values from last set")
        }

        // Detect "that weight" / "that many" - use last mentioned value
        if lowercased.contains("that weight") || lowercased.contains("that much") {
            resolved.weightReference = dialogueState.lastMentionedWeight
            print("🔍 [Context] Resolved 'that weight' -> \(dialogueState.lastMentionedWeight ?? 0)kg")
        }

        if lowercased.contains("that many") || lowercased.contains("same reps") {
            resolved.repsReference = dialogueState.lastMentionedReps
            print("🔍 [Context] Resolved 'that many' -> \(dialogueState.lastMentionedReps ?? 0) reps")
        }

        // Detect temporal references
        if lowercased.contains("again") || lowercased.contains("repeat") {
            resolved.copyValues = true
            resolved.referenceValues = dialogueState.lastLoggedSet?.set
            print("🔍 [Context] Detected 'again' - will repeat last set")
        }

        return resolved
    }

    /// Update dialogue state after logging a set
    /// - Parameters:
    ///   - exercise: Exercise that was logged
    ///   - set: Completed set data
    ///   - setNumber: Set number (1-indexed)
    func updateAfterLog(
        exercise: WorkoutStateExercise,
        set: CompletedSet,
        setNumber: Int
    ) {
        dialogueState.lastLoggedSet = LoggedSetReference(
            exercise: exercise,
            set: set,
            setNumber: setNumber,
            timestamp: Date()
        )

        // Track mentioned values
        if let weight = set.actualWeight {
            dialogueState.lastMentionedWeight = weight
        }
        if let reps = set.actualReps {
            dialogueState.lastMentionedReps = reps
        }

        let completedSet: CompletedSet = set
        print("📝 [Context] Updated after log: \(exercise.name) Set \(setNumber) - \(completedSet.summary)")
    }

    /// Add a conversation turn to history
    /// - Parameters:
    ///   - userInput: What the user said
    ///   - assistantResponse: How the assistant responded
    func addConversationTurn(userInput: String, assistantResponse: String) {
        let turn = ConversationTurn(
            userInput: userInput,
            assistantResponse: assistantResponse,
            timestamp: Date()
        )

        dialogueState.conversationHistory.append(turn)

        // Keep only last 10 turns to avoid memory bloat
        if dialogueState.conversationHistory.count > 10 {
            dialogueState.conversationHistory.removeFirst()
        }
    }

    /// Clear all dialogue state (e.g., when starting new workout)
    func reset() {
        dialogueState = DialogueState()
        print("🧹 [Context] Dialogue state reset")
    }

    /// Get conversation history as a string for LLM context
    func getConversationHistoryString() -> String {
        guard !dialogueState.conversationHistory.isEmpty else {
            return "No previous conversation."
        }

        var history = "RECENT CONVERSATION:\n"
        for (index, turn) in dialogueState.conversationHistory.enumerated() {
            history += "\n[\(index + 1)] User: \(turn.userInput)\n"
            history += "    Assistant: \(turn.assistantResponse)\n"
        }

        return history
    }

    /// Get current dialogue state summary
    func getCurrentStateSummary() -> String {
        var summary = "CURRENT CONTEXT STATE:\n"

        if let exercise = dialogueState.currentExercise {
            summary += "- Current Exercise: \(exercise.name) (Set \(dialogueState.currentSetNumber))\n"
        }

        if let lastLogged = dialogueState.lastLoggedSet {
            let loggedSet: CompletedSet = lastLogged.set
            summary += "- Last Logged: \(lastLogged.exercise.name) Set \(lastLogged.setNumber) - \(loggedSet.summary)\n"
        }

        if let weight = dialogueState.lastMentionedWeight {
            summary += "- Last Mentioned Weight: \(weight)kg\n"
        }

        if let reps = dialogueState.lastMentionedReps {
            summary += "- Last Mentioned Reps: \(reps)\n"
        }

        return summary
    }

    /// Get the last logged set reference
    /// - Returns: Last logged set info or nil
    func getLastLoggedSet() -> LoggedSetReference? {
        return dialogueState.lastLoggedSet
    }
}

// MARK: - Resolved Context Result

struct ResolvedContext {
    var targetExercise: WorkoutStateExercise?
    var targetSetNumber: Int?
    var referenceValues: CompletedSet?
    var useHistoricalData: Bool = false
    var copyValues: Bool = false
    var weightReference: Double?
    var repsReference: Int?

    /// Check if any context was resolved
    var hasContext: Bool {
        return targetExercise != nil ||
               referenceValues != nil ||
               useHistoricalData ||
               copyValues ||
               weightReference != nil ||
               repsReference != nil
    }
}

// Note: CompletedSet.summary extension is defined in WorkoutHistoryService.swift
