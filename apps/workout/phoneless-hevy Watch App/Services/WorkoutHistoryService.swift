//
//  WorkoutHistoryService.swift
//  phoneless-hevy Watch App
//
//  Branch 1: Historical Context & Display
//

import Foundation
import Observation

/// Performance statistics for an exercise over time
struct PerformanceStats {
    let avgWeight: Double
    let avgReps: Int
    let avgRPE: Double
    let lastWorkoutDate: Date
    let trend: Trend

    enum Trend {
        case increasing
        case stable
        case decreasing
    }
}

/// Service for fetching and caching workout history from Hevy API
@Observable
class WorkoutHistoryService {
    private let apiClient = HevyAPIClient.shared

    // Cache for last workout data per exercise (exercise ID -> sets)
    private var lastWorkoutCache: [String: [CompletedSet]] = [:]

    /// Fetch last workout that included this exercise
    /// - Parameter exerciseTemplateId: Exercise template ID from Hevy
    /// - Returns: Array of completed sets from last workout
    func fetchLastWorkout(for exerciseTemplateId: String) async throws -> [CompletedSet] {
        // Check cache first
        if let cached = lastWorkoutCache[exerciseTemplateId] {
            print("✅ [History] Using cached data for exercise \(exerciseTemplateId)")
            return cached
        }

        print("📡 [History] Fetching exercise history for \(exerciseTemplateId) using official API endpoint")

        // Use official Hevy exercise history endpoint
        let historyEntries = try await apiClient.getExerciseHistory(
            exerciseTemplateId: exerciseTemplateId
        )

        print("✅ [History] Fetched \(historyEntries.count) history entries")

        guard !historyEntries.isEmpty else {
            print("⚠️ [History] No history found for exercise \(exerciseTemplateId)")
            return []
        }

        // Group by workout and get most recent workout
        let byWorkout = Dictionary(grouping: historyEntries) { $0.workoutId }
        let mostRecentWorkoutId = historyEntries
            .sorted { $0.workoutStartTime > $1.workoutStartTime }
            .first?
            .workoutId

        guard let mostRecentWorkoutId = mostRecentWorkoutId,
              let mostRecentSets = byWorkout[mostRecentWorkoutId] else {
            print("⚠️ [History] Could not find most recent workout")
            return []
        }

        // Convert to CompletedSet format
        let sets = mostRecentSets.map { $0.toCompletedSet() }

        print("✅ [History] Found \(sets.count) sets from most recent workout on \(mostRecentSets.first?.workoutStartTime ?? Date())")

        // Cache it
        lastWorkoutCache[exerciseTemplateId] = sets
        return sets
    }

    /// Get the last workout sets for a specific exercise (cached version)
    /// - Parameter exerciseTemplateId: Exercise template ID
    /// - Returns: Cached sets or nil if not cached
    func getLastWorkoutSets(for exerciseTemplateId: String) -> [CompletedSet]? {
        return lastWorkoutCache[exerciseTemplateId]
    }

    /// Get average performance for an exercise over last N workouts
    /// - Parameters:
    ///   - exerciseTemplateId: Exercise template ID
    ///   - workoutCount: Number of recent workouts to analyze (default: 5)
    /// - Returns: Performance statistics or nil if insufficient data
    func getAveragePerformance(
        for exerciseTemplateId: String,
        over workoutCount: Int = 5
    ) async -> PerformanceStats? {
        do {
            print("📡 [History] Calculating average performance for \(exerciseTemplateId) using official API")

            // Use official exercise history endpoint
            let historyEntries = try await apiClient.getExerciseHistory(
                exerciseTemplateId: exerciseTemplateId
            )

            guard !historyEntries.isEmpty else {
                print("⚠️ [History] No history data available")
                return nil
            }

            // Group by workout and take most recent N workouts
            let byWorkout = Dictionary(grouping: historyEntries) { $0.workoutId }
            let sortedWorkoutIds = historyEntries
                .sorted { $0.workoutStartTime > $1.workoutStartTime }
                .reduce(into: [String]()) { result, entry in
                    if !result.contains(entry.workoutId) && result.count < workoutCount {
                        result.append(entry.workoutId)
                    }
                }

            guard !sortedWorkoutIds.isEmpty else {
                return nil
            }

            // Collect all sets from recent workouts
            var allSets: [(date: Date, entry: ExerciseHistoryEntry)] = []
            for workoutId in sortedWorkoutIds {
                if let entries = byWorkout[workoutId] {
                    allSets.append(contentsOf: entries.map { ($0.workoutStartTime, $0) })
                }
            }

            guard !allSets.isEmpty else {
                return nil
            }

            // Calculate averages
            let flatEntries = allSets.map { $0.entry }
            let weightsWithValues = flatEntries.compactMap { $0.weightKg }
            let repsWithValues = flatEntries.compactMap { $0.reps }
            let rpeWithValues = flatEntries.compactMap { $0.rpe }

            guard !weightsWithValues.isEmpty || !repsWithValues.isEmpty else {
                return nil
            }

            let avgWeight = weightsWithValues.isEmpty ? 0 : weightsWithValues.reduce(0, +) / Double(weightsWithValues.count)
            let avgReps = repsWithValues.isEmpty ? 0 : repsWithValues.reduce(0, +) / repsWithValues.count
            let avgRPE = rpeWithValues.isEmpty ? 0 : rpeWithValues.reduce(0, +) / Double(rpeWithValues.count)

            // Calculate trend (comparing recent half vs older half)
            let midpoint = sortedWorkoutIds.count / 2
            let recentWorkoutIds = Set(sortedWorkoutIds.prefix(midpoint))
            let olderWorkoutIds = Set(sortedWorkoutIds.suffix(from: midpoint))

            let recentWeights = flatEntries.filter { recentWorkoutIds.contains($0.workoutId) }.compactMap { $0.weightKg }
            let olderWeights = flatEntries.filter { olderWorkoutIds.contains($0.workoutId) }.compactMap { $0.weightKg }

            let trend: PerformanceStats.Trend
            if !recentWeights.isEmpty && !olderWeights.isEmpty {
                let recentAvgWeight = recentWeights.reduce(0, +) / Double(recentWeights.count)
                let olderAvgWeight = olderWeights.reduce(0, +) / Double(olderWeights.count)

                if recentAvgWeight > olderAvgWeight * 1.05 {
                    trend = .increasing
                } else if recentAvgWeight < olderAvgWeight * 0.95 {
                    trend = .decreasing
                } else {
                    trend = .stable
                }
            } else {
                trend = .stable
            }

            let lastWorkoutDate = allSets.map { $0.date }.max() ?? Date()

            print("✅ [History] Performance stats: avg weight=\(avgWeight)kg, avg reps=\(avgReps), trend=\(trend)")

            return PerformanceStats(
                avgWeight: avgWeight,
                avgReps: avgReps,
                avgRPE: avgRPE,
                lastWorkoutDate: lastWorkoutDate,
                trend: trend
            )

        } catch {
            print("⚠️ [History] Failed to calculate average performance: \(error.localizedDescription)")
            return nil
        }
    }

    /// Clear all cached data
    func clearCache() {
        lastWorkoutCache.removeAll()
        print("🧹 [History] Cache cleared")
    }

    /// Pre-fetch history for all exercises in a workout
    /// - Parameter exerciseIds: Array of exercise template IDs
    func prefetchHistory(for exerciseIds: [String]) async {
        print("📡 [History] Prefetching history for \(exerciseIds.count) exercises")

        for id in exerciseIds {
            if lastWorkoutCache[id] == nil {
                try? await fetchLastWorkout(for: id)
            }
        }

        print("✅ [History] Prefetch complete")
    }
}

// MARK: - Extensions for CompletedSet summary

extension CompletedSet {
    /// Human-readable summary of the set
    var summary: String {
        var parts: [String] = []

        if let weight = actualWeight {
            parts.append("\(Int(weight))kg")
        }
        if let reps = actualReps {
            parts.append("× \(reps)")
        }
        if let rpe = actualRPE {
            parts.append("@ RPE \(String(format: "%.1f", rpe))")
        }
        if let duration = actualDuration {
            parts.append("\(duration)s")
        }

        return parts.isEmpty ? "Empty set" : parts.joined(separator: " ")
    }
}
