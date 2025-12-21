//
//  RoutineManager.swift
//  phoneless-hevy Watch App
//
//  Created by Claude Code on 10/22/25.
//  Manages fetching and caching of workout routines from Hevy API
//

import Foundation
import Observation

@Observable
@MainActor
class RoutineManager {
    static let shared = RoutineManager()

    private(set) var routines: [Routine] = []
    private(set) var isLoading: Bool = false
    private(set) var selectedRoutine: Routine?

    private let cacheKey = "routinesCache"
    private let cacheTimestampKey = "routinesCacheTimestamp"
    private let cacheExpirationInterval: TimeInterval = 7 * 24 * 60 * 60  // 7 days

    private init() {
        loadFromCache()
    }

    /// Fetch all routines from Hevy API
    func fetchRoutines(forceRefresh: Bool = false) async {
        // Check cache validity
        if !forceRefresh, let lastFetch = UserDefaults.standard.object(forKey: cacheTimestampKey) as? Date,
           Date().timeIntervalSince(lastFetch) < cacheExpirationInterval {
            print("📦 Using cached routines")
            return
        }

        guard !isLoading else { return }
        isLoading = true

        do {
            var allRoutines: [Routine] = []
            var currentPage = 1
            let pageSize = 10  // Max allowed by API

            // Fetch all pages
            while true {
                let response = try await HevyAPIClient.shared.fetchRoutines(page: currentPage, pageSize: pageSize)
                allRoutines.append(contentsOf: response.routines)

                // Check if we have more pages
                if response.routines.count < pageSize {
                    break
                }

                currentPage += 1
            }

            routines = allRoutines
            saveToCache()

            print("✅ Fetched \(routines.count) routines from Hevy")

        } catch {
            print("❌ Failed to fetch routines: \(error)")
        }

        isLoading = false
    }

    /// Select a routine to start
    func selectRoutine(_ routine: Routine) {
        selectedRoutine = routine
    }

    /// Clear selected routine
    func clearSelection() {
        selectedRoutine = nil
    }

    // MARK: - Caching

    private func saveToCache() {
        do {
            let encoder = JSONEncoder()
            encoder.dateEncodingStrategy = .iso8601
            let data = try encoder.encode(routines)
            UserDefaults.standard.set(data, forKey: cacheKey)
            UserDefaults.standard.set(Date(), forKey: cacheTimestampKey)
            print("💾 Cached \(routines.count) routines")
        } catch {
            print("❌ Failed to cache routines: \(error)")
        }
    }

    private func loadFromCache() {
        guard let data = UserDefaults.standard.data(forKey: cacheKey) else {
            print("📦 No cached routines found")
            return
        }

        do {
            let decoder = JSONDecoder()
            decoder.dateDecodingStrategy = .iso8601
            routines = try decoder.decode([Routine].self, from: data)
            print("📦 Loaded \(routines.count) routines from cache")
        } catch {
            print("❌ Failed to load cached routines: \(error)")
        }
    }
}
