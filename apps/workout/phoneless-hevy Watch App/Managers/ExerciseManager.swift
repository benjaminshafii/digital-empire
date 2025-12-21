//
//  ExerciseManager.swift
//  phoneless-hevy Watch App
//
//  Created by Claude Code on 10/22/25.
//  Manages exercise template resolution from voice input to Hevy UUIDs
//

import Foundation
import Observation

/// Manages exercise template data and name resolution
@Observable
@MainActor
final class ExerciseManager {
    static let shared = ExerciseManager()

    // MARK: - State

    /// All exercise templates fetched from Hevy API
    private(set) var exerciseTemplates: [ExerciseTemplate] = []

    /// Mapping of normalized exercise names to template IDs
    private var nameToIdMapping: [String: String] = [:]

    /// Loading state
    private(set) var isLoading: Bool = false
    private(set) var lastFetchError: Error?
    private(set) var lastFetchDate: Date?

    // MARK: - Constants

    private let cacheKey = "exerciseTemplatesCache"
    private let cacheTimestampKey = "exerciseTemplatesCacheTimestamp"
    private let cacheExpirationInterval: TimeInterval = 7 * 24 * 60 * 60 // 7 days

    // MARK: - Initialization

    private init() {
        // Load cached data on init
        loadFromCache()
    }

    // MARK: - Public Methods

    /// Fetch exercise templates from Hevy API
    /// - Parameter forceRefresh: Force refresh even if cache is valid
    func fetchExerciseTemplates(forceRefresh: Bool = false) async {
        // Check if cache is still valid
        if !forceRefresh, let lastFetch = lastFetchDate,
           Date().timeIntervalSince(lastFetch) < cacheExpirationInterval {
            print("📦 Using cached exercise templates (age: \(Int(Date().timeIntervalSince(lastFetch) / 60)) minutes)")
            return
        }

        guard !isLoading else {
            print("⚠️ Already fetching exercise templates")
            return
        }

        isLoading = true
        lastFetchError = nil

        do {
            var allTemplates: [ExerciseTemplate] = []
            var currentPage = 1
            let pageSize = 100

            // Fetch all pages
            while true {
                let response = try await HevyAPIClient.shared.fetchExerciseTemplates(
                    page: currentPage,
                    pageSize: pageSize
                )

                allTemplates.append(contentsOf: response.exerciseTemplates)

                // Check if there are more pages
                if response.exerciseTemplates.count < pageSize {
                    break
                }

                currentPage += 1
            }

            exerciseTemplates = allTemplates
            buildNameMapping()
            saveToCache()
            lastFetchDate = Date()

            print("✅ Fetched \(allTemplates.count) exercise templates from Hevy API")

        } catch {
            lastFetchError = error
            print("❌ Failed to fetch exercise templates: \(error.localizedDescription)")

            // Fall back to cache if available
            if exerciseTemplates.isEmpty {
                loadFromCache()
            }
        }

        isLoading = false
    }

    /// Resolve an exercise name to a Hevy template ID
    /// - Parameter name: Exercise name from voice input (e.g., "bench press")
    /// - Returns: Template ID if found, nil otherwise
    func resolveExerciseName(_ name: String) -> String? {
        let normalized = normalizeName(name)

        // Try exact match first
        if let id = nameToIdMapping[normalized] {
            return id
        }

        // Try fuzzy matching
        return fuzzyMatch(normalized)
    }

    /// Get exercise template by ID
    /// - Parameter id: Template ID
    /// - Returns: Exercise template if found
    func getTemplate(byId id: String) -> ExerciseTemplate? {
        return exerciseTemplates.first { $0.id == id }
    }

    /// Get exercise template by name
    /// - Parameter name: Exercise name
    /// - Returns: Exercise template if found
    func getTemplate(byName name: String) -> ExerciseTemplate? {
        guard let id = resolveExerciseName(name) else { return nil }
        return getTemplate(byId: id)
    }

    // MARK: - Private Methods

    /// Build mapping of normalized exercise names to template IDs
    private func buildNameMapping() {
        nameToIdMapping.removeAll()

        for template in exerciseTemplates {
            let normalized = normalizeName(template.title)
            nameToIdMapping[normalized] = template.id

            // Also add common variations
            addCommonVariations(for: template)
        }

        print("📋 Built name mapping with \(nameToIdMapping.count) entries")
    }

    /// Add common exercise name variations to the mapping
    private func addCommonVariations(for template: ExerciseTemplate) {
        let id = template.id
        let title = template.title.lowercased()

        // Common abbreviations and variations
        let variations: [(String, String)] = [
            ("dumbbell", "db"),
            ("barbell", "bb"),
            ("bench press", "bp"),
            ("overhead press", "ohp"),
            ("squat", "sq"),
            ("deadlift", "dl"),
            ("pull-up", "pullup"),
            ("pull up", "pullup"),
            ("push-up", "pushup"),
            ("push up", "pushup"),
        ]

        for (full, abbr) in variations {
            if title.contains(full) {
                let abbreviated = normalizeName(title.replacingOccurrences(of: full, with: abbr))
                nameToIdMapping[abbreviated] = id
            }
            if title.contains(abbr) {
                let fullForm = normalizeName(title.replacingOccurrences(of: abbr, with: full))
                nameToIdMapping[fullForm] = id
            }
        }
    }

    /// Normalize an exercise name for matching
    private func normalizeName(_ name: String) -> String {
        return name
            .lowercased()
            .trimmingCharacters(in: .whitespacesAndNewlines)
            .replacingOccurrences(of: "  ", with: " ")
            .replacingOccurrences(of: "-", with: " ")
            .replacingOccurrences(of: "_", with: " ")
    }

    /// Fuzzy match an exercise name using Levenshtein distance
    private func fuzzyMatch(_ normalizedName: String) -> String? {
        var bestMatch: (id: String, distance: Int)?
        let maxDistance = max(2, normalizedName.count / 4) // Allow 25% error

        for (name, id) in nameToIdMapping {
            let distance = levenshteinDistance(normalizedName, name)

            if distance <= maxDistance {
                if bestMatch == nil || distance < bestMatch!.distance {
                    bestMatch = (id, distance)
                }
            }
        }

        if let match = bestMatch {
            print("🔍 Fuzzy matched '\(normalizedName)' with distance \(match.distance)")
            return match.id
        }

        return nil
    }

    /// Calculate Levenshtein distance between two strings
    private func levenshteinDistance(_ s1: String, _ s2: String) -> Int {
        let s1Array = Array(s1)
        let s2Array = Array(s2)
        let m = s1Array.count
        let n = s2Array.count

        var matrix = Array(repeating: Array(repeating: 0, count: n + 1), count: m + 1)

        // Initialize first row and column
        for i in 0...m {
            matrix[i][0] = i
        }
        for j in 0...n {
            matrix[0][j] = j
        }

        // Fill the matrix
        for i in 1...m {
            for j in 1...n {
                let cost = s1Array[i - 1] == s2Array[j - 1] ? 0 : 1
                matrix[i][j] = min(
                    matrix[i - 1][j] + 1,      // deletion
                    matrix[i][j - 1] + 1,      // insertion
                    matrix[i - 1][j - 1] + cost // substitution
                )
            }
        }

        return matrix[m][n]
    }

    // MARK: - Cache Management

    /// Save exercise templates to UserDefaults cache
    private func saveToCache() {
        do {
            let encoder = JSONEncoder()
            let data = try encoder.encode(exerciseTemplates)
            UserDefaults.standard.set(data, forKey: cacheKey)
            UserDefaults.standard.set(Date(), forKey: cacheTimestampKey)
            print("💾 Saved \(exerciseTemplates.count) templates to cache")
        } catch {
            print("⚠️ Failed to cache exercise templates: \(error.localizedDescription)")
        }
    }

    /// Load exercise templates from UserDefaults cache
    private func loadFromCache() {
        guard let data = UserDefaults.standard.data(forKey: cacheKey),
              let timestamp = UserDefaults.standard.object(forKey: cacheTimestampKey) as? Date else {
            print("📭 No cached exercise templates found")
            return
        }

        do {
            let decoder = JSONDecoder()
            let templates = try decoder.decode([ExerciseTemplate].self, from: data)

            exerciseTemplates = templates
            buildNameMapping()
            lastFetchDate = timestamp

            let age = Date().timeIntervalSince(timestamp)
            print("📦 Loaded \(templates.count) templates from cache (age: \(Int(age / 3600)) hours)")

        } catch {
            print("⚠️ Failed to load cached templates: \(error.localizedDescription)")
        }
    }

    /// Clear the exercise template cache
    func clearCache() {
        UserDefaults.standard.removeObject(forKey: cacheKey)
        UserDefaults.standard.removeObject(forKey: cacheTimestampKey)
        exerciseTemplates.removeAll()
        nameToIdMapping.removeAll()
        lastFetchDate = nil
        print("🗑️ Cleared exercise template cache")
    }
}
