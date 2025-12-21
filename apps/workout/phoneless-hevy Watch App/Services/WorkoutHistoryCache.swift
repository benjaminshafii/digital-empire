//
//  WorkoutHistoryCache.swift
//  phoneless-hevy Watch App
//
//  Pulls and caches workout history from Hevy for intelligent context
//

import Foundation
import Combine

/// Cached workout history for fast lookups and context queries
@MainActor
class WorkoutHistoryCache: ObservableObject {
    static let shared = WorkoutHistoryCache()

    @Published var isLoading = false
    @Published var lastSyncDate: Date?
    @Published var cachedWorkouts: [WorkoutData] = []

    private let hevyAPI = HevyAPIClient.shared
    private let cacheKey = "workout_history_cache"
    private let lastSyncKey = "last_history_sync"

    // Index for fast exercise lookups
    private var exerciseIndex: [String: [WorkoutExercise]] = [:]

    init() {
        loadFromDisk()
    }

    // MARK: - Sync from Hevy

    /// Sync last 90 days of workout history from Hevy
    func syncFromHevy() async {
        guard !isLoading else { return }

        isLoading = true
        print("🔄 [HistoryCache] Starting sync from Hevy...")

        do {
            var allWorkouts: [WorkoutData] = []
            var currentPage = 1
            let pageSize = 10 // Hevy API max

            // Calculate date 90 days ago
            let ninetyDaysAgo = Calendar.current.date(byAdding: .day, value: -90, to: Date()) ?? Date()

            // Fetch pages until we hit 90-day boundary or no more data
            while true {
                let workouts = try await hevyAPI.fetchWorkouts(page: currentPage, pageSize: pageSize)

                if workouts.isEmpty {
                    print("✅ [HistoryCache] No more workouts, stopping at page \(currentPage)")
                    break
                }

                // Filter to last 90 days
                let recentWorkouts = workouts.filter { workout in
                    workout.startTime >= ninetyDaysAgo
                }

                allWorkouts.append(contentsOf: recentWorkouts)

                print("📦 [HistoryCache] Page \(currentPage): fetched \(workouts.count), \(recentWorkouts.count) within 90 days")

                // Stop if we found workouts older than 90 days
                if recentWorkouts.count < workouts.count {
                    print("✅ [HistoryCache] Reached 90-day boundary")
                    break
                }

                // Stop if page wasn't full (last page)
                if workouts.count < pageSize {
                    print("✅ [HistoryCache] Last page reached")
                    break
                }

                currentPage += 1
            }

            cachedWorkouts = allWorkouts.sorted { ($0.startTime ?? Date.distantPast) > ($1.startTime ?? Date.distantPast) }
            lastSyncDate = Date()

            print("✅ [HistoryCache] Synced \(cachedWorkouts.count) workouts from last 90 days")

            // Build exercise index
            buildExerciseIndex()

            // Save to disk
            saveToDisk()

        } catch {
            print("❌ [HistoryCache] Sync failed: \(error.localizedDescription)")
        }

        isLoading = false
    }

    /// Refresh cache if stale (older than 24 hours)
    func refreshIfNeeded() async {
        guard let lastSync = lastSyncDate else {
            print("📝 [HistoryCache] No previous sync, syncing now...")
            await syncFromHevy()
            return
        }

        let hoursSinceSync = Date().timeIntervalSince(lastSync) / 3600
        if hoursSinceSync > 24 {
            print("📝 [HistoryCache] Cache stale (\(Int(hoursSinceSync))h old), refreshing...")
            await syncFromHevy()
        } else {
            print("✅ [HistoryCache] Cache fresh (\(Int(hoursSinceSync))h old)")
        }
    }

    // MARK: - Exercise Index

    /// Build fast lookup index by exercise template ID
    private func buildExerciseIndex() {
        exerciseIndex.removeAll()

        for workout in cachedWorkouts {
            for exercise in workout.exercises {
                if exerciseIndex[exercise.exerciseTemplateId] == nil {
                    exerciseIndex[exercise.exerciseTemplateId] = []
                }
                exerciseIndex[exercise.exerciseTemplateId]?.append(exercise)
            }
        }

        print("📊 [HistoryCache] Indexed \(exerciseIndex.keys.count) unique exercises")
    }

    // MARK: - Query Methods

    /// Get last workout containing this exercise
    func lastWorkout(for exerciseTemplateId: String) -> WorkoutData? {
        cachedWorkouts.first { workout in
            workout.exercises.contains { $0.exerciseTemplateId == exerciseTemplateId }
        }
    }

    /// Get last time this specific exercise was performed
    func lastPerformance(for exerciseTemplateId: String) -> WorkoutExercise? {
        exerciseIndex[exerciseTemplateId]?.first
    }

    /// Get exercise progression (last N workouts for this exercise)
    func progression(for exerciseTemplateId: String, limit: Int = 10) -> [WorkoutExercise] {
        guard let history = exerciseIndex[exerciseTemplateId] else { return [] }
        return Array(history.prefix(limit))
    }

    /// Get all workouts in date range
    func workouts(from startDate: Date, to endDate: Date) -> [WorkoutData] {
        cachedWorkouts.filter { workout in
            workout.startTime >= startDate && workout.startTime <= endDate
        }
    }

    /// Calculate PR (personal record) for exercise
    func personalRecord(for exerciseTemplateId: String) -> (weight: Double, reps: Int)? {
        guard let history = exerciseIndex[exerciseTemplateId] else { return nil }

        var bestWeight: Double = 0
        var bestReps: Int = 0

        for exercise in history {
            for set in exercise.sets {
                if let weight = set.weightKg, let reps = set.reps {
                    // Use 1RM formula: weight × (1 + reps/30)
                    let estimated1RM = weight * (1 + Double(reps) / 30.0)
                    let currentBest = bestWeight * (1 + Double(bestReps) / 30.0)

                    if estimated1RM > currentBest {
                        bestWeight = weight
                        bestReps = reps
                    }
                }
            }
        }

        return bestWeight > 0 ? (bestWeight, bestReps) : nil
    }

    /// Check if current set is a new PR
    func isPR(exerciseTemplateId: String, weight: Double, reps: Int) -> Bool {
        guard let currentPR = personalRecord(for: exerciseTemplateId) else {
            return true // First time doing this exercise
        }

        let current1RM = weight * (1 + Double(reps) / 30.0)
        let best1RM = currentPR.weight * (1 + Double(currentPR.reps) / 30.0)

        return current1RM > best1RM
    }

    /// Get comparison to last workout
    func comparison(exerciseTemplateId: String, setNumber: Int, weight: Double, reps: Int) -> String? {
        guard let lastExercise = lastPerformance(for: exerciseTemplateId) else {
            return nil
        }

        // Try to find matching set number
        let setIndex = setNumber - 1
        guard setIndex < lastExercise.sets.count else { return nil }

        let lastSet = lastExercise.sets[setIndex]
        guard let lastWeight = lastSet.weightKg, let lastReps = lastSet.reps else {
            return nil
        }

        // Compare
        let weightDiff = weight - lastWeight
        let repsDiff = reps - lastReps

        if weightDiff > 0 && repsDiff >= 0 {
            return "💪 \(formatWeight(weightDiff)) heavier"
        } else if weightDiff == 0 && repsDiff > 0 {
            return "📈 \(repsDiff) more reps"
        } else if weightDiff < 0 && repsDiff <= 0 {
            return "📉 Lighter workout"
        } else if weightDiff == 0 && repsDiff == 0 {
            return "→ Same as last time"
        } else {
            return nil // Mixed signals
        }
    }

    /// Get total volume for last N days
    func totalVolume(days: Int = 7) -> Double {
        let startDate = Calendar.current.date(byAdding: .day, value: -days, to: Date()) ?? Date()
        let recentWorkouts = workouts(from: startDate, to: Date())

        var volume: Double = 0
        for workout in recentWorkouts {
            for exercise in workout.exercises {
                for set in exercise.sets {
                    if let weight = set.weightKg, let reps = set.reps {
                        volume += weight * Double(reps)
                    }
                }
            }
        }

        return volume
    }

    // MARK: - Persistence

    private func saveToDisk() {
        do {
            let encoder = JSONEncoder()
            let data = try encoder.encode(cachedWorkouts)
            UserDefaults.standard.set(data, forKey: cacheKey)
            UserDefaults.standard.set(lastSyncDate, forKey: lastSyncKey)
            print("💾 [HistoryCache] Saved \(cachedWorkouts.count) workouts to disk")
        } catch {
            print("❌ [HistoryCache] Failed to save: \(error.localizedDescription)")
        }
    }

    private func loadFromDisk() {
        guard let data = UserDefaults.standard.data(forKey: cacheKey) else {
            print("📝 [HistoryCache] No cached data on disk")
            return
        }

        do {
            let decoder = JSONDecoder()
            cachedWorkouts = try decoder.decode([WorkoutData].self, from: data)
            lastSyncDate = UserDefaults.standard.object(forKey: lastSyncKey) as? Date

            print("💾 [HistoryCache] Loaded \(cachedWorkouts.count) workouts from disk")
            print("   Last sync: \(lastSyncDate?.formatted() ?? "never")")

            buildExerciseIndex()
        } catch {
            print("❌ [HistoryCache] Failed to load: \(error.localizedDescription)")
        }
    }

    // MARK: - Helpers

    private func formatWeight(_ weight: Double) -> String {
        if weight.truncatingRemainder(dividingBy: 1) == 0 {
            return "\(Int(weight))kg"
        }
        return String(format: "%.1fkg", weight)
    }
}
