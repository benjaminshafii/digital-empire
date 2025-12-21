//
//  HistoricalContextView.swift
//  phoneless-hevy Watch App
//
//  Branch 1: Historical Context & Display
//  Component to display last workout stats for current exercise
//

import SwiftUI

/// View displaying historical context from last workout
struct HistoricalContextView: View {
    let currentSetNumber: Int
    let lastWorkoutSets: [CompletedSet]
    let lastWorkoutDate: Date?
    let plannedSetCount: Int?  // Total planned sets (optional)
    let nextExerciseInSuperset: String?  // Next exercise in superset (if any)

    /// Get the relevant set from last workout (matching set number or closest)
    private var relevantSet: CompletedSet? {
        // Try to match set number
        if currentSetNumber <= lastWorkoutSets.count {
            return lastWorkoutSets[currentSetNumber - 1]
        }
        // Use last set if current set number exceeds history
        return lastWorkoutSets.last
    }

    /// Calculate trend indicator based on comparison
    private func trendIndicator(for set: CompletedSet) -> String {
        // For now, just return neutral indicator
        // TODO: Compare with even older workout data to show trend
        return "→"
    }

    var body: some View {
        if let set = relevantSet {
            VStack(alignment: .center, spacing: 6) {
                // Header - smaller and centered with planned set count
                if let plannedCount = plannedSetCount {
                    Text("Previous \(currentSetNumber) of \(plannedCount)")
                        .font(.caption2)
                        .foregroundColor(.secondary.opacity(0.8))
                        .lineLimit(1)
                } else {
                    Text("Last time • Set \(currentSetNumber)")
                        .font(.caption2)
                        .foregroundColor(.secondary.opacity(0.8))
                        .lineLimit(1)
                }

                // Stats - BIGGER and more prominent
                HStack(spacing: 12) {
                    if let weight = set.actualWeight {
                        VStack(spacing: 2) {
                            Text("\(formatWeight(weight))")
                                .font(.system(size: 18, weight: .bold))
                                .foregroundColor(.primary)
                                .lineLimit(1)
                            Text("kg")
                                .font(.caption2)
                                .foregroundColor(.secondary)
                        }
                    }

                    if let reps = set.actualReps {
                        VStack(spacing: 2) {
                            HStack(spacing: 3) {
                                Text("×")
                                    .font(.system(size: 14, weight: .regular))
                                    .foregroundColor(.secondary)
                                Text("\(reps)")
                                    .font(.system(size: 18, weight: .bold))
                                    .foregroundColor(.primary)
                            }
                            Text("reps")
                                .font(.caption2)
                                .foregroundColor(.secondary)
                        }
                    }

                    if let rpe = set.actualRPE {
                        VStack(spacing: 2) {
                            Text("\(formatRPE(rpe))")
                                .font(.system(size: 18, weight: .bold))
                                .foregroundColor(.orange)
                                .lineLimit(1)
                            Text("RPE")
                                .font(.caption2)
                                .foregroundColor(.secondary)
                        }
                    }

                    if let duration = set.actualDuration {
                        VStack(spacing: 2) {
                            Text("\(duration)")
                                .font(.system(size: 18, weight: .bold))
                                .foregroundColor(.blue)
                                .lineLimit(1)
                            Text("sec")
                                .font(.caption2)
                                .foregroundColor(.secondary)
                        }
                    }
                }

                // Show next exercise in superset (if applicable)
                if let nextExercise = nextExerciseInSuperset {
                    HStack(spacing: 4) {
                        Image(systemName: "arrow.down")
                            .font(.caption2)
                            .foregroundColor(.blue)
                        Text("Next: \(nextExercise)")
                            .font(.caption2)
                            .foregroundColor(.blue)
                            .lineLimit(1)
                            .minimumScaleFactor(0.7)
                    }
                    .padding(.top, 4)
                }
            }
            .padding(.vertical, 10)
            .padding(.horizontal, 12)
            .frame(maxWidth: .infinity)
            .background(Color.green.opacity(0.15))
            .cornerRadius(10)
        }
    }

    // MARK: - Formatting Helpers

    private func formatWeight(_ weight: Double) -> String {
        if weight.truncatingRemainder(dividingBy: 1) == 0 {
            return "\(Int(weight))"
        }
        return String(format: "%.1f", weight)
    }

    private func formatRPE(_ rpe: Double) -> String {
        if rpe.truncatingRemainder(dividingBy: 1) == 0 {
            return "\(Int(rpe))"
        }
        return String(format: "%.1f", rpe)
    }

    private func formatRelativeDate(_ date: Date) -> String {
        let calendar = Calendar.current
        let now = Date()

        let components = calendar.dateComponents([.day], from: date, to: now)
        guard let days = components.day else { return "" }

        switch days {
        case 0:
            return "today"
        case 1:
            return "yesterday"
        case 2...6:
            return "\(days)d ago"
        case 7...13:
            return "1w ago"
        case 14...20:
            return "2w ago"
        default:
            return date.formatted(.dateTime.month(.abbreviated).day())
        }
    }
}

// MARK: - Preview

#Preview("With Full Stats") {
    HistoricalContextView(
        currentSetNumber: 2,
        lastWorkoutSets: [
            CompletedSet(
                actualWeight: 100,
                actualReps: 8,
                actualRPE: 8.5
            ),
            CompletedSet(
                actualWeight: 100,
                actualReps: 7,
                actualRPE: 9
            ),
            CompletedSet(
                actualWeight: 95,
                actualReps: 8,
                actualRPE: 8
            )
        ],
        lastWorkoutDate: Calendar.current.date(byAdding: .day, value: -3, to: Date()),
        plannedSetCount: 3,
        nextExerciseInSuperset: "Dumbbell Fly"
    )
    .padding()
}

#Preview("With Duration") {
    HistoricalContextView(
        currentSetNumber: 1,
        lastWorkoutSets: [
            CompletedSet(
                actualWeight: nil,
                actualReps: nil,
                actualRPE: nil,
                actualDuration: 60
            )
        ],
        lastWorkoutDate: Date(),
        plannedSetCount: nil,
        nextExerciseInSuperset: nil
    )
    .padding()
}

#Preview("No History") {
    HistoricalContextView(
        currentSetNumber: 1,
        lastWorkoutSets: [],
        lastWorkoutDate: nil,
        plannedSetCount: nil,
        nextExerciseInSuperset: nil
    )
    .padding()
}
