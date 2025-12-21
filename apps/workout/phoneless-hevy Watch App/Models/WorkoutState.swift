//
//  WorkoutState.swift
//  phoneless-hevy Watch App
//
//  Workout as a living document - the single source of truth
//  Voice commands modify this state, LLM uses it for context
//
//  Branch 2: Added superset support
//

import Foundation
import Observation

// MARK: - Workout State (Living Document)

@Observable
class WorkoutState {
    var id: String
    var title: String
    var startTime: Date
    var exercises: [WorkoutStateExercise]
    var notes: String?

    init(id: String = UUID().uuidString, title: String, startTime: Date = Date(), exercises: [WorkoutStateExercise] = []) {
        self.id = id
        self.title = title
        self.startTime = startTime
        self.exercises = exercises
        self.notes = nil
    }

    /// Create from a routine (planned workout)
    static func fromRoutine(_ routine: Routine) -> WorkoutState {
        let exercises = routine.exercises.map { routineEx -> WorkoutStateExercise in
            WorkoutStateExercise(
                exerciseTemplateId: routineEx.exerciseTemplateId,
                name: routineEx.title,
                supersetId: routineEx.supersetId,  // 🔥 Preserve superset from routine
                plannedSets: routineEx.sets.map { routineSet in
                    PlannedSet(
                        targetWeight: routineSet.weightKg,
                        targetReps: routineSet.reps,
                        targetRPE: nil,
                        targetDuration: routineSet.durationSeconds
                    )
                },
                notes: routineEx.notes,
                isFromRoutine: true
            )
        }

        return WorkoutState(
            title: routine.title,
            exercises: exercises
        )
    }

    /// Create empty workout (free-form)
    static func freeWorkout() -> WorkoutState {
        WorkoutState(title: "Strength Training", exercises: [])
    }

    // MARK: - State Queries

    /// Get the next incomplete exercise
    func nextExercise() -> WorkoutStateExercise? {
        exercises.first { !$0.isCompleted }
    }

    /// Get the next set to complete (exercise + set number)
    /// Handles superset alternation - cycles through all exercises in superset
    func nextSet() -> (exercise: WorkoutStateExercise, setNumber: Int)? {
        // Find current exercise (one with completed sets but not done)
        let currentExercise = exercises.first { ex in
            !ex.completedSets.isEmpty && !ex.isCompleted
        }

        // If current exercise is in a superset, handle alternation
        if let current = currentExercise,
           let supersetId = current.supersetId {

            // Get all exercises in this superset
            guard let supersetGroup = getSupersetGroup(for: current.exerciseTemplateId) else {
                // Fallback if something's wrong
                return firstIncompleteExercise()
            }

            // Find exercise with least completed sets in superset
            let minSets = supersetGroup.map { $0.completedSets.count }.min() ?? 0
            let exercisesWithMinSets = supersetGroup.filter {
                $0.completedSets.count == minSets && !$0.isCompleted
            }

            // If multiple exercises tied, pick next in rotation after current
            if exercisesWithMinSets.count > 1 {
                if let nextInRotation = nextInSuperset(after: current.exerciseTemplateId),
                   !nextInRotation.isCompleted {
                    let setNumber = nextInRotation.completedSets.count + 1
                    return (nextInRotation, setNumber)
                }
            }

            // Otherwise pick first incomplete exercise with min sets
            if let nextExercise = exercisesWithMinSets.first {
                let setNumber = nextExercise.completedSets.count + 1
                return (nextExercise, setNumber)
            }
        }

        // Not in superset, or superset complete - get first incomplete exercise
        return firstIncompleteExercise()
    }

    /// Helper: Get first incomplete exercise
    private func firstIncompleteExercise() -> (exercise: WorkoutStateExercise, setNumber: Int)? {
        guard let exercise = exercises.first(where: { !$0.isCompleted }) else {
            return nil
        }
        let setNumber = exercise.completedSets.count + 1
        return (exercise, setNumber)
    }

    /// Get current exercise being worked on
    func currentExercise() -> WorkoutStateExercise? {
        // Exercise with completed sets but not fully completed
        exercises.first { ex in
            !ex.completedSets.isEmpty && !ex.isCompleted
        } ?? nextExercise()  // Or next exercise if nothing started
    }

    /// Total completed sets across all exercises
    func totalCompletedSets() -> Int {
        exercises.reduce(0) { $0 + $1.completedSets.count }
    }

    /// Number of completed exercises
    func completedExerciseCount() -> Int {
        exercises.filter { $0.isCompleted }.count
    }

    // MARK: - Superset Support (Branch 2)

    /// Get all exercises in the same superset as given exercise
    /// - Parameter exerciseId: Exercise template ID
    /// - Returns: Array of exercises in the superset, sorted by template ID
    func getSupersetGroup(for exerciseId: String) -> [WorkoutStateExercise]? {
        guard let exercise = exercises.first(where: { $0.exerciseTemplateId == exerciseId }),
              let supersetId = exercise.supersetId else {
            return nil
        }

        return exercises.filter { $0.supersetId == supersetId }
            .sorted { $0.exerciseTemplateId < $1.exerciseTemplateId }  // Stable order
    }

    /// Get next exercise in superset rotation (circular)
    /// - Parameter exerciseId: Current exercise template ID
    /// - Returns: Next exercise in superset cycle
    func nextInSuperset(after exerciseId: String) -> WorkoutStateExercise? {
        guard let supersetGroup = getSupersetGroup(for: exerciseId) else {
            return nil
        }

        guard let currentIndex = supersetGroup.firstIndex(where: {
            $0.exerciseTemplateId == exerciseId
        }) else {
            return nil
        }

        // Circular: wrap to 0 if at end
        let nextIndex = (currentIndex + 1) % supersetGroup.count
        return supersetGroup[nextIndex]
    }

    /// Check if ALL exercises in superset have completed current round
    /// - Parameter supersetId: Superset ID
    /// - Returns: True if all exercises have same number of completed sets
    func isSupersetRoundComplete(supersetId: Int) -> Bool {
        let group = exercises.filter { $0.supersetId == supersetId }

        guard !group.isEmpty else { return false }

        // Get minimum completed sets count
        let minCompleted = group.map { $0.completedSets.count }.min() ?? 0

        // Check if all exercises have at least minCompleted sets
        return group.allSatisfy { $0.completedSets.count >= minCompleted }
    }

    /// Get position of exercise within its superset (1-indexed)
    /// - Parameter exerciseId: Exercise template ID
    /// - Returns: Position (1, 2, 3...) or nil if not in superset
    func getSupersetPosition(_ exerciseId: String) -> Int? {
        guard let group = getSupersetGroup(for: exerciseId),
              let index = group.firstIndex(where: { $0.exerciseTemplateId == exerciseId }) else {
            return nil
        }
        return index + 1  // 1-indexed
    }

    // MARK: - State Modifications

    /// Add a completed set to an existing exercise
    func addCompletedSet(to exerciseTemplateId: String, set: CompletedSet) {
        if let index = exercises.firstIndex(where: { $0.exerciseTemplateId == exerciseTemplateId }) {
            exercises[index].completedSets.append(set)

            // Auto-complete exercise if all planned sets are done
            if let plannedCount = exercises[index].plannedSets?.count,
               exercises[index].completedSets.count >= plannedCount {
                exercises[index].isCompleted = true
            }
        } else {
            print("⚠️ Exercise \(exerciseTemplateId) not found in workout")
        }
    }

    /// Add a new exercise to the workout (not in original plan)
    func addNewExercise(templateId: String, name: String, firstSet: CompletedSet) {
        let newExercise = WorkoutStateExercise(
            exerciseTemplateId: templateId,
            name: name,
            supersetId: nil,  // Not in superset unless specified
            plannedSets: nil,  // Not planned
            completedSets: [firstSet],
            isFromRoutine: false
        )
        exercises.append(newExercise)
        print("✅ Added new exercise: \(name)")
    }

    /// Mark an exercise as completed
    func completeExercise(_ exerciseTemplateId: String) {
        if let index = exercises.firstIndex(where: { $0.exerciseTemplateId == exerciseTemplateId }) {
            exercises[index].isCompleted = true
        }
    }

    // MARK: - LLM Context Generation

    /// Convert workout state to context string for LLM
    func toLLMContext() -> String {
        var context = """
        CURRENT WORKOUT: \(title)
        Started: \(startTime.formatted(date: .omitted, time: .shortened))
        Total Sets Completed: \(totalCompletedSets())

        """

        if exercises.isEmpty {
            context += "This is a free-form workout. No exercises logged yet.\n"
        } else {
            context += "EXERCISES:\n"
            for (index, exercise) in exercises.enumerated() {
                let status = exercise.isCompleted ? "✓" : exercise.completedSets.isEmpty ? "○" : "●"
                context += "\n\(index + 1). [\(status)] \(exercise.name)"

                // Show superset info
                if let supersetId = exercise.supersetId,
                   let position = getSupersetPosition(exercise.exerciseTemplateId),
                   let group = getSupersetGroup(for: exercise.exerciseTemplateId) {
                    context += " [Superset \(supersetId): \(position)/\(group.count)]"
                }
                context += "\n"

                // Show planned sets if available
                if let planned = exercise.plannedSets, !planned.isEmpty {
                    context += "   Planned: \(planned.count) sets"
                    if let firstSet = planned.first {
                        if let weight = firstSet.targetWeight, let reps = firstSet.targetReps {
                            context += " (\(Int(weight))kg × \(reps))"
                        }
                    }
                    context += "\n"
                }

                // Show completed sets
                if !exercise.completedSets.isEmpty {
                    context += "   Completed: \(exercise.completedSets.count) sets\n"
                    for (setIndex, set) in exercise.completedSets.enumerated() {
                        context += "     Set \(setIndex + 1): "
                        if let weight = set.actualWeight {
                            context += "\(weight)kg "
                        }
                        if let reps = set.actualReps {
                            context += "× \(reps) "
                        }
                        if let rpe = set.actualRPE {
                            context += "@ RPE \(rpe)"
                        }
                        context += "\n"
                    }
                }

                // Show progress
                if let plannedCount = exercise.plannedSets?.count {
                    let progress = exercise.completedSets.count
                    context += "   Progress: \(progress)/\(plannedCount) sets\n"
                }
            }
        }

        // Next up suggestion
        if let next = nextSet() {
            context += "\nNEXT UP: \(next.exercise.name) - Set \(next.setNumber)"
            if let supersetId = next.exercise.supersetId {
                context += " (Superset \(supersetId))"
            }
            context += "\n"
        }

        return context
    }
}

// MARK: - Workout State Exercise

struct WorkoutStateExercise: Identifiable {
    let id: String
    let exerciseTemplateId: String
    let name: String
    var supersetId: Int?  // 🔥 NEW: nil = not in superset
    var plannedSets: [PlannedSet]?  // nil if added during workout
    var completedSets: [CompletedSet]
    var isCompleted: Bool
    var notes: String?
    var isFromRoutine: Bool  // 🔥 NEW: Track if from routine

    init(
        id: String = UUID().uuidString,
        exerciseTemplateId: String,
        name: String,
        supersetId: Int? = nil,
        plannedSets: [PlannedSet]? = nil,
        completedSets: [CompletedSet] = [],
        isCompleted: Bool = false,
        notes: String? = nil,
        isFromRoutine: Bool = false
    ) {
        self.id = id
        self.exerciseTemplateId = exerciseTemplateId
        self.name = name
        self.supersetId = supersetId
        self.plannedSets = plannedSets
        self.completedSets = completedSets
        self.isCompleted = isCompleted
        self.notes = notes
        self.isFromRoutine = isFromRoutine
    }

    /// Progress percentage (0.0 to 1.0)
    var progress: Double {
        guard let plannedCount = plannedSets?.count, plannedCount > 0 else {
            return completedSets.isEmpty ? 0.0 : 1.0
        }
        return Double(completedSets.count) / Double(plannedCount)
    }
}

// MARK: - Planned Set (Target from Routine)

struct PlannedSet: Identifiable {
    let id: String
    var targetWeight: Double?
    var targetReps: Int?
    var targetRPE: Double?
    var targetDuration: Int?

    init(
        id: String = UUID().uuidString,
        targetWeight: Double? = nil,
        targetReps: Int? = nil,
        targetRPE: Double? = nil,
        targetDuration: Int? = nil
    ) {
        self.id = id
        self.targetWeight = targetWeight
        self.targetReps = targetReps
        self.targetRPE = targetRPE
        self.targetDuration = targetDuration
    }
}

// MARK: - Completed Set (Actual Performance)

struct CompletedSet: Identifiable {
    let id: String
    var actualWeight: Double?
    var actualReps: Int?
    var actualRPE: Double?
    var actualDuration: Int?
    var timestamp: Date
    var setType: SetType

    init(
        id: String = UUID().uuidString,
        actualWeight: Double? = nil,
        actualReps: Int? = nil,
        actualRPE: Double? = nil,
        actualDuration: Int? = nil,
        timestamp: Date = Date(),
        setType: SetType = .normal
    ) {
        self.id = id
        self.actualWeight = actualWeight
        self.actualReps = actualReps
        self.actualRPE = actualRPE
        self.actualDuration = actualDuration
        self.timestamp = timestamp
        self.setType = setType
    }
}
