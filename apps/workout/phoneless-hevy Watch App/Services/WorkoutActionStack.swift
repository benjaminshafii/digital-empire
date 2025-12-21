//
//  WorkoutActionStack.swift
//  phoneless-hevy Watch App
//
//  Branch 3: Conversational Context & Corrections
//  Maintains undo stack for workout actions
//

import Foundation
import Combine
import Observation

/// Maintains undo stack for workout actions
@Observable
class WorkoutActionStack {
    private var stack: [WorkoutAction] = []
    private let maxStackSize = 20

    enum ActionType {
        case addSet
        case editSet
        case deleteSet
        case replaceExercise
    }

    struct WorkoutAction {
        let type: ActionType
        let exerciseId: String
        let setIndex: Int?
        let oldValue: ActionValue?
        let newValue: ActionValue?
        let timestamp: Date

        /// Generic value container for different action types
        enum ActionValue {
            case set(CompletedSet)
            case exercise(WorkoutStateExercise)
        }
    }

    enum UndoResult {
        case success(String)
        case failure(String)
    }

    // MARK: - Stack Operations

    /// Record an action to the undo stack
    /// - Parameter action: Action to record
    func push(_ action: WorkoutAction) {
        stack.append(action)

        // Limit stack size
        if stack.count > maxStackSize {
            stack.removeFirst()
            print("⚠️ [Undo] Stack limit reached, removed oldest action")
        }

        print("📝 [Undo] Pushed action: \(action.type) for \(action.exerciseId)")
    }

    /// Undo the last action
    /// - Parameter workoutState: Workout state to modify
    /// - Returns: Result indicating success or failure
    func undo(in workoutState: WorkoutState) -> UndoResult {
        guard let action = stack.popLast() else {
            print("⚠️ [Undo] Nothing to undo")
            return .failure("Nothing to undo")
        }

        print("↩️  [Undo] Undoing action: \(action.type)")

        switch action.type {
        case .addSet:
            // Remove the set that was added
            guard let setIndex = action.setIndex else {
                return .failure("Invalid action data")
            }

            workoutState.removeSet(action.exerciseId, at: setIndex)
            print("✅ [Undo] Removed set at index \(setIndex)")
            return .success("Removed last set")

        case .editSet:
            // Restore old value
            guard let setIndex = action.setIndex,
                  case let .set(oldSet) = action.oldValue else {
                return .failure("Invalid action data")
            }

            workoutState.updateSet(action.exerciseId, at: setIndex, with: oldSet)
            print("✅ [Undo] Reverted set to previous values")
            return .success("Reverted changes")

        case .deleteSet:
            // Re-add the deleted set
            guard let setIndex = action.setIndex,
                  case let .set(oldSet) = action.oldValue else {
                return .failure("Invalid action data")
            }

            workoutState.insertSet(action.exerciseId, at: setIndex, set: oldSet)
            print("✅ [Undo] Restored deleted set")
            return .success("Restored deleted set")

        case .replaceExercise:
            // Restore old exercise
            guard case let .exercise(oldExercise) = action.oldValue else {
                return .failure("Invalid action data")
            }

            workoutState.replaceExercise(action.exerciseId, with: oldExercise)
            print("✅ [Undo] Restored original exercise")
            return .success("Restored original exercise")
        }
    }

    /// Get the last action without removing it
    var peek: WorkoutAction? {
        stack.last
    }

    /// Check if undo stack has any actions
    var canUndo: Bool {
        !stack.isEmpty
    }

    /// Get number of undoable actions
    var undoCount: Int {
        stack.count
    }

    /// Clear all actions from the stack
    func clear() {
        stack.removeAll()
        print("🧹 [Undo] Stack cleared")
    }

    /// Get summary of recent actions
    func getRecentActionsSummary(count: Int = 5) -> String {
        let recentActions = Array(stack.suffix(count))
        guard !recentActions.isEmpty else {
            return "No recent actions"
        }

        var summary = "RECENT ACTIONS:\n"
        for (index, action) in recentActions.enumerated().reversed() {
            let timeAgo = Date().timeIntervalSince(action.timestamp)
            summary += "\(index + 1). \(action.type) (\(Int(timeAgo))s ago)\n"
        }

        return summary
    }
}

// MARK: - WorkoutState Extensions for Undo

extension WorkoutState {
    /// Remove a set from an exercise
    func removeSet(_ exerciseId: String, at index: Int) {
        guard let exerciseIndex = exercises.firstIndex(where: {
            $0.exerciseTemplateId == exerciseId
        }) else {
            print("⚠️ Exercise \(exerciseId) not found")
            return
        }

        guard index < exercises[exerciseIndex].completedSets.count else {
            print("⚠️ Set index \(index) out of bounds")
            return
        }

        exercises[exerciseIndex].completedSets.remove(at: index)
        print("🗑️  Removed set \(index) from \(exercises[exerciseIndex].name)")

        // Update completion status
        if let plannedCount = exercises[exerciseIndex].plannedSets?.count {
            exercises[exerciseIndex].isCompleted = exercises[exerciseIndex].completedSets.count >= plannedCount
        }
    }

    /// Update a set with new values
    func updateSet(_ exerciseId: String, at index: Int, with set: CompletedSet) {
        guard let exerciseIndex = exercises.firstIndex(where: {
            $0.exerciseTemplateId == exerciseId
        }) else {
            print("⚠️ Exercise \(exerciseId) not found")
            return
        }

        guard index < exercises[exerciseIndex].completedSets.count else {
            print("⚠️ Set index \(index) out of bounds")
            return
        }

        exercises[exerciseIndex].completedSets[index] = set
        print("✏️  Updated set \(index) in \(exercises[exerciseIndex].name)")
    }

    /// Insert a set at a specific index
    func insertSet(_ exerciseId: String, at index: Int, set: CompletedSet) {
        guard let exerciseIndex = exercises.firstIndex(where: {
            $0.exerciseTemplateId == exerciseId
        }) else {
            print("⚠️ Exercise \(exerciseId) not found")
            return
        }

        exercises[exerciseIndex].completedSets.insert(set, at: index)
        print("➕ Inserted set at index \(index) in \(exercises[exerciseIndex].name)")

        // Update completion status
        if let plannedCount = exercises[exerciseIndex].plannedSets?.count {
            exercises[exerciseIndex].isCompleted = exercises[exerciseIndex].completedSets.count >= plannedCount
        }
    }

    /// Replace an exercise with a new one
    func replaceExercise(_ oldExerciseId: String, with newExercise: WorkoutStateExercise) {
        guard let index = exercises.firstIndex(where: {
            $0.exerciseTemplateId == oldExerciseId
        }) else {
            print("⚠️ Exercise \(oldExerciseId) not found")
            return
        }

        let oldName = exercises[index].name
        exercises[index] = newExercise
        print("🔄 Replaced \(oldName) with \(newExercise.name)")
    }
}

// MARK: - Helper for creating actions

extension WorkoutActionStack {
    /// Create and push an "add set" action
    func recordAddSet(exerciseId: String, setIndex: Int, set: CompletedSet) {
        let action = WorkoutAction(
            type: .addSet,
            exerciseId: exerciseId,
            setIndex: setIndex,
            oldValue: nil,
            newValue: .set(set),
            timestamp: Date()
        )
        push(action)
    }

    /// Create and push an "edit set" action
    func recordEditSet(exerciseId: String, setIndex: Int, oldSet: CompletedSet, newSet: CompletedSet) {
        let action = WorkoutAction(
            type: .editSet,
            exerciseId: exerciseId,
            setIndex: setIndex,
            oldValue: .set(oldSet),
            newValue: .set(newSet),
            timestamp: Date()
        )
        push(action)
    }

    /// Create and push a "delete set" action
    func recordDeleteSet(exerciseId: String, setIndex: Int, deletedSet: CompletedSet) {
        let action = WorkoutAction(
            type: .deleteSet,
            exerciseId: exerciseId,
            setIndex: setIndex,
            oldValue: .set(deletedSet),
            newValue: nil,
            timestamp: Date()
        )
        push(action)
    }

    /// Create and push a "replace exercise" action
    func recordReplaceExercise(
        exerciseId: String,
        oldExercise: WorkoutStateExercise,
        newExercise: WorkoutStateExercise
    ) {
        let action = WorkoutAction(
            type: .replaceExercise,
            exerciseId: exerciseId,
            setIndex: nil,
            oldValue: .exercise(oldExercise),
            newValue: .exercise(newExercise),
            timestamp: Date()
        )
        push(action)
    }
}
