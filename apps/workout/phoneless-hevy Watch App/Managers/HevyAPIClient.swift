//
//  HevyAPIClient.swift
//  phoneless-hevy Watch App
//
//  Created by Claude Code
//

import Foundation

/// Errors that can occur when interacting with the Hevy API
enum HevyAPIError: Error, LocalizedError {
    case notConfigured              // No API key configured
    case invalidURL                 // Malformed URL
    case httpError(Int, String?)    // HTTP error with status code and message
    case decodingError(Error)       // JSON decoding failed
    case networkError(Error)        // Network request failed
    case invalidResponse            // Response was not HTTPURLResponse

    var errorDescription: String? {
        switch self {
        case .notConfigured:
            return "API key not configured"
        case .invalidURL:
            return "Invalid API URL"
        case .httpError(let code, let message):
            return "HTTP \(code): \(message ?? "Unknown error")"
        case .decodingError(let error):
            return "Failed to decode response: \(error.localizedDescription)"
        case .networkError(let error):
            return "Network error: \(error.localizedDescription)"
        case .invalidResponse:
            return "Invalid response from server"
        }
    }
}

/// API client for interacting with the Hevy fitness API
@MainActor
final class HevyAPIClient: Sendable {
    static let shared = HevyAPIClient()

    private let baseURL = "https://api.hevyapp.com/v1"
    private let apiKey: String

    // URLSession configuration optimized for watchOS
    private let session: URLSession = {
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 30
        config.waitsForConnectivity = true      // Don't fail immediately on poor connection
        config.allowsCellularAccess = true      // Use LTE if no WiFi
        return URLSession(configuration: config)
    }()

    private init() {
        // Load from settings (Keychain or environment variable)
        if let key = AppSettings.shared.hevyAPIKey {
            self.apiKey = key
        } else {
            // No API key configured - will fail on first request
            self.apiKey = ""
        }
    }

    // MARK: - Exercise Templates

    /// Fetch all exercise templates from Hevy API
    /// - Parameters:
    ///   - page: Page number (default: 1)
    ///   - pageSize: Number of results per page (default: 100)
    /// - Returns: Exercise templates response with pagination info
    func fetchExerciseTemplates(page: Int = 1, pageSize: Int = 100) async throws -> ExerciseTemplatesResponse {
        let endpoint = "\(baseURL)/exercise_templates?page=\(page)&pageSize=\(pageSize)"

        guard let url = URL(string: endpoint) else {
            print("❌ [HevyAPI] Invalid URL: \(endpoint)")
            throw HevyAPIError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue((apiKey), forHTTPHeaderField: "api-key")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        print("📡 [HevyAPI] Fetching exercise templates...")
        print("   URL: \(endpoint)")
        print("   Headers: \(request.allHTTPHeaderFields ?? [:])")

        do {
            let (data, response) = try await session.data(for: request)

            guard let httpResponse = response as? HTTPURLResponse else {
                print("❌ [HevyAPI] Invalid response type")
                throw HevyAPIError.invalidResponse
            }

            print("✅ [HevyAPI] Response status: \(httpResponse.statusCode)")

            guard httpResponse.statusCode == 200 else {
                let errorMessage = String(data: data, encoding: .utf8)
                print("❌ [HevyAPI] HTTP Error \(httpResponse.statusCode): \(errorMessage ?? "nil")")
                throw HevyAPIError.httpError(httpResponse.statusCode, errorMessage)
            }

            // Log raw response for debugging
            if let jsonString = String(data: data, encoding: .utf8) {
                print("📦 [HevyAPI] Raw response length: \(data.count) bytes")
                print("📦 [HevyAPI] First 500 chars: \(String(jsonString.prefix(500)))")
            }

            let decoder = JSONDecoder()
            decoder.keyDecodingStrategy = .convertFromSnakeCase  // 🔥 CRITICAL FIX

            do {
                let result = try decoder.decode(ExerciseTemplatesResponse.self, from: data)
                print("✅ [HevyAPI] Successfully decoded \(result.exerciseTemplates.count) templates")
                return result
            } catch let decodingError as DecodingError {
                print("❌ [HevyAPI] Decoding error details:")
                switch decodingError {
                case .keyNotFound(let key, let context):
                    print("   Missing key: \(key.stringValue)")
                    print("   Context: \(context.debugDescription)")
                    print("   Coding path: \(context.codingPath.map { $0.stringValue }.joined(separator: " -> "))")
                case .typeMismatch(let type, let context):
                    print("   Type mismatch: expected \(type)")
                    print("   Context: \(context.debugDescription)")
                    print("   Coding path: \(context.codingPath.map { $0.stringValue }.joined(separator: " -> "))")
                case .valueNotFound(let type, let context):
                    print("   Value not found: \(type)")
                    print("   Context: \(context.debugDescription)")
                    print("   Coding path: \(context.codingPath.map { $0.stringValue }.joined(separator: " -> "))")
                case .dataCorrupted(let context):
                    print("   Data corrupted: \(context.debugDescription)")
                    print("   Coding path: \(context.codingPath.map { $0.stringValue }.joined(separator: " -> "))")
                @unknown default:
                    print("   Unknown decoding error: \(decodingError)")
                }
                throw HevyAPIError.decodingError(decodingError)
            }

        } catch let error as HevyAPIError {
            throw error
        } catch let error as DecodingError {
            throw HevyAPIError.decodingError(error)
        } catch {
            print("❌ [HevyAPI] Network error: \(error.localizedDescription)")
            throw HevyAPIError.networkError(error)
        }
    }

    // MARK: - Workouts

    /// Create a new workout in Hevy
    /// - Parameter workout: The workout data to create
    /// - Returns: Created workout with assigned ID
    func createWorkout(_ workout: WorkoutData) async throws -> WorkoutData {
        let endpoint = "\(baseURL)/workouts"

        guard let url = URL(string: endpoint) else {
            throw HevyAPIError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue((apiKey), forHTTPHeaderField: "api-key")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        do {
            let encoder = JSONEncoder()
            // Hevy API requires workout to be wrapped in a "workout" key
            let requestBody = ["workout": workout]
            let jsonData = try encoder.encode(requestBody)
            request.httpBody = jsonData

            // Debug: print request body
            if let jsonString = String(data: jsonData, encoding: .utf8) {
                print("📤 [Hevy API] POST /workouts request body:")
                print(jsonString)
            }

            let (data, response) = try await session.data(for: request)

            guard let httpResponse = response as? HTTPURLResponse else {
                throw HevyAPIError.invalidResponse
            }

            guard httpResponse.statusCode == 200 || httpResponse.statusCode == 201 else {
                let errorMessage = String(data: data, encoding: .utf8)
                print("❌ [Hevy API] Create workout failed: \(httpResponse.statusCode)")
                print("Response: \(errorMessage ?? "No response body")")
                throw HevyAPIError.httpError(httpResponse.statusCode, errorMessage)
            }

            // Log raw response for debugging
            if let responseString = String(data: data, encoding: .utf8) {
                print("📥 [Hevy API] Response body (first 500 chars):")
                print(String(responseString.prefix(500)))
            }

            // Hevy API returns workout wrapped in "workout" key as an ARRAY
            let decoder = JSONDecoder()
            print("🔄 [Hevy API] Decoding WorkoutResponse...")
            let responseBody = try decoder.decode(WorkoutResponse.self, from: data)
            print("✅ [Hevy API] Decoded WorkoutResponse, array count: \(responseBody.workout.count)")

            guard let result = responseBody.workout.first else {
                print("❌ [Hevy API] Workout array was empty!")
                throw HevyAPIError.decodingError(DecodingError.dataCorrupted(
                    DecodingError.Context(codingPath: [], debugDescription: "Workout array was empty in response")
                ))
            }
            print("✅ [Hevy API] Successfully created workout with ID: \(result.id ?? "nil")")
            return result

        } catch let error as HevyAPIError {
            print("❌ [Hevy API] HevyAPIError: \(error.errorDescription ?? "Unknown")")
            throw error
        } catch let error as DecodingError {
            print("❌ [Hevy API] DecodingError: \(error.localizedDescription)")
            switch error {
            case .keyNotFound(let key, let context):
                print("   Key '\(key.stringValue)' not found: \(context.debugDescription)")
            case .typeMismatch(let type, let context):
                print("   Type mismatch for \(type): \(context.debugDescription)")
            case .valueNotFound(let type, let context):
                print("   Value not found for \(type): \(context.debugDescription)")
            case .dataCorrupted(let context):
                print("   Data corrupted: \(context.debugDescription)")
            @unknown default:
                print("   Unknown decoding error")
            }
            throw HevyAPIError.decodingError(error)
        } catch let error as EncodingError {
            print("❌ [Hevy API] EncodingError: \(error.localizedDescription)")
            throw HevyAPIError.decodingError(error)
        } catch {
            print("❌ [Hevy API] NetworkError: \(error.localizedDescription)")
            throw HevyAPIError.networkError(error)
        }
    }

    /// Update an existing workout in Hevy
    /// - Parameters:
    ///   - workoutId: The ID of the workout to update
    ///   - workout: The updated workout data
    /// - Returns: Updated workout
    func updateWorkout(id workoutId: String, workout: WorkoutData) async throws -> WorkoutData {
        let endpoint = "\(baseURL)/workouts/\(workoutId)"

        guard let url = URL(string: endpoint) else {
            throw HevyAPIError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = "PUT"
        request.setValue((apiKey), forHTTPHeaderField: "api-key")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        do {
            let encoder = JSONEncoder()
            // Hevy API requires workout to be wrapped in a "workout" key
            let requestBody = ["workout": workout]
            let jsonData = try encoder.encode(requestBody)
            request.httpBody = jsonData

            // Debug: print request body
            if let jsonString = String(data: jsonData, encoding: .utf8) {
                print("📤 [Hevy API] PUT /workouts/\(workoutId) request body:")
                print(jsonString)
            }

            let (data, response) = try await session.data(for: request)

            guard let httpResponse = response as? HTTPURLResponse else {
                throw HevyAPIError.invalidResponse
            }

            guard httpResponse.statusCode == 200 else {
                let errorMessage = String(data: data, encoding: .utf8)
                print("❌ [Hevy API] Update workout failed: \(httpResponse.statusCode)")
                print("Response: \(errorMessage ?? "No response body")")
                throw HevyAPIError.httpError(httpResponse.statusCode, errorMessage)
            }

            // Hevy API returns workout wrapped in "workout" key as an ARRAY
            let decoder = JSONDecoder()
            let responseBody = try decoder.decode(WorkoutResponse.self, from: data)
            guard let result = responseBody.workout.first else {
                throw HevyAPIError.decodingError(DecodingError.dataCorrupted(
                    DecodingError.Context(codingPath: [], debugDescription: "Workout array was empty in response")
                ))
            }
            return result

        } catch let error as HevyAPIError {
            print("❌ [Hevy API] HevyAPIError: \(error.errorDescription ?? "Unknown")")
            throw error
        } catch let error as DecodingError {
            print("❌ [Hevy API] DecodingError: \(error.localizedDescription)")
            switch error {
            case .keyNotFound(let key, let context):
                print("   Key '\(key.stringValue)' not found: \(context.debugDescription)")
            case .typeMismatch(let type, let context):
                print("   Type mismatch for \(type): \(context.debugDescription)")
            case .valueNotFound(let type, let context):
                print("   Value not found for \(type): \(context.debugDescription)")
            case .dataCorrupted(let context):
                print("   Data corrupted: \(context.debugDescription)")
            @unknown default:
                print("   Unknown decoding error")
            }
            throw HevyAPIError.decodingError(error)
        } catch let error as EncodingError {
            print("❌ [Hevy API] EncodingError: \(error.localizedDescription)")
            throw HevyAPIError.decodingError(error)
        } catch {
            print("❌ [Hevy API] NetworkError: \(error.localizedDescription)")
            throw HevyAPIError.networkError(error)
        }
    }

    /// Fetch routines from Hevy API
    /// - Parameters:
    ///   - page: Page number (default: 1)
    ///   - pageSize: Number of results per page (default: 10, max: 10)
    /// - Returns: Routines response with pagination info
    func fetchRoutines(page: Int = 1, pageSize: Int = 10) async throws -> RoutinesResponse {
        let endpoint = "\(baseURL)/routines?page=\(page)&pageSize=\(pageSize)"

        guard let url = URL(string: endpoint) else {
            throw HevyAPIError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue((apiKey), forHTTPHeaderField: "api-key")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        print(request.allHTTPHeaderFields)
        do {
            let (data, response) = try await session.data(for: request)

            guard let httpResponse = response as? HTTPURLResponse else {
                throw HevyAPIError.invalidResponse
            }

            guard httpResponse.statusCode == 200 else {
                let errorMessage = String(data: data, encoding: .utf8)
                throw HevyAPIError.httpError(httpResponse.statusCode, errorMessage)
            }

            let decoder = JSONDecoder()
            decoder.dateDecodingStrategy = .iso8601
            let result = try decoder.decode(RoutinesResponse.self, from: data)
            return result

        } catch let error as HevyAPIError {
            throw error
        } catch let error as DecodingError {
            throw HevyAPIError.decodingError(error)
        } catch {
            throw HevyAPIError.networkError(error)
        }
    }

    /// Fetch recent workouts
    /// - Parameters:
    ///   - page: Page number (default: 1)
    ///   - pageSize: Number of results per page (default: 10)
    /// - Returns: Array of workouts
    func fetchWorkouts(page: Int = 1, pageSize: Int = 10) async throws -> [WorkoutData] {
        let endpoint = "\(baseURL)/workouts?page=\(page)&pageSize=\(pageSize)"

        guard let url = URL(string: endpoint) else {
            throw HevyAPIError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue((apiKey), forHTTPHeaderField: "api-key")

        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        do {
            let (data, response) = try await session.data(for: request)

            guard let httpResponse = response as? HTTPURLResponse else {
                throw HevyAPIError.invalidResponse
            }

            guard httpResponse.statusCode == 200 else {
                let errorMessage = String(data: data, encoding: .utf8)
                throw HevyAPIError.httpError(httpResponse.statusCode, errorMessage)
            }

            let decoder = JSONDecoder()

            // Hevy API returns { "workouts": [...] }
            struct WorkoutsResponse: Codable {
                let workouts: [WorkoutData]
            }

            let result = try decoder.decode(WorkoutsResponse.self, from: data)
            return result.workouts

        } catch let error as HevyAPIError {
            throw error
        } catch let error as DecodingError {
            throw HevyAPIError.decodingError(error)
        } catch {
            throw HevyAPIError.networkError(error)
        }
    }

    // MARK: - Exercise History

    /// Fetch exercise history for a specific exercise template
    /// - Parameters:
    ///   - exerciseTemplateId: Exercise template ID
    ///   - startDate: Optional start date filter (ISO 8601)
    ///   - endDate: Optional end date filter (ISO 8601)
    /// - Returns: Array of exercise history entries
    func getExerciseHistory(
        exerciseTemplateId: String,
        startDate: Date? = nil,
        endDate: Date? = nil
    ) async throws -> [ExerciseHistoryEntry] {
        var endpoint = "\(baseURL)/exercise_history/\(exerciseTemplateId)"

        // Add query parameters if dates are provided
        var queryItems: [String] = []
        if let startDate = startDate {
            let iso8601String = ISO8601DateFormatter().string(from: startDate)
            queryItems.append("start_date=\(iso8601String)")
        }
        if let endDate = endDate {
            let iso8601String = ISO8601DateFormatter().string(from: endDate)
            queryItems.append("end_date=\(iso8601String)")
        }

        if !queryItems.isEmpty {
            endpoint += "?" + queryItems.joined(separator: "&")
        }

        guard let url = URL(string: endpoint) else {
            print("❌ [HevyAPI] Invalid URL: \(endpoint)")
            throw HevyAPIError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue((apiKey), forHTTPHeaderField: "api-key")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        print("📡 [HevyAPI] Fetching exercise history for template \(exerciseTemplateId)...")
        print("   URL: \(endpoint)")

        do {
            let (data, response) = try await session.data(for: request)

            guard let httpResponse = response as? HTTPURLResponse else {
                print("❌ [HevyAPI] Invalid response type")
                throw HevyAPIError.invalidResponse
            }

            print("✅ [HevyAPI] Response status: \(httpResponse.statusCode)")

            guard httpResponse.statusCode == 200 else {
                let errorMessage = String(data: data, encoding: .utf8)
                print("❌ [HevyAPI] HTTP Error \(httpResponse.statusCode): \(errorMessage ?? "nil")")
                throw HevyAPIError.httpError(httpResponse.statusCode, errorMessage)
            }

            // Log raw response for debugging
            if let jsonString = String(data: data, encoding: .utf8) {
                print("📦 [HevyAPI] Raw response length: \(data.count) bytes")
                print("📦 [HevyAPI] First 500 chars: \(String(jsonString.prefix(500)))")
            }

            let decoder = JSONDecoder()
            decoder.keyDecodingStrategy = .convertFromSnakeCase  // 🔥 CRITICAL: Hevy API uses snake_case
            decoder.dateDecodingStrategy = .iso8601

            do {
                let result = try decoder.decode(ExerciseHistoryResponse.self, from: data)
                print("✅ [HevyAPI] Successfully decoded \(result.exerciseHistory.count) history entries")
                return result.exerciseHistory
            } catch let decodingError as DecodingError {
                print("❌ [HevyAPI] Decoding error details:")
                switch decodingError {
                case .keyNotFound(let key, let context):
                    print("   Missing key: \(key.stringValue)")
                    print("   Context: \(context.debugDescription)")
                    print("   Coding path: \(context.codingPath.map { $0.stringValue }.joined(separator: " -> "))")
                case .typeMismatch(let type, let context):
                    print("   Type mismatch: expected \(type)")
                    print("   Context: \(context.debugDescription)")
                    print("   Coding path: \(context.codingPath.map { $0.stringValue }.joined(separator: " -> "))")
                case .valueNotFound(let type, let context):
                    print("   Value not found: \(type)")
                    print("   Context: \(context.debugDescription)")
                    print("   Coding path: \(context.codingPath.map { $0.stringValue }.joined(separator: " -> "))")
                case .dataCorrupted(let context):
                    print("   Data corrupted: \(context.debugDescription)")
                    print("   Coding path: \(context.codingPath.map { $0.stringValue }.joined(separator: " -> "))")
                @unknown default:
                    print("   Unknown decoding error: \(decodingError)")
                }
                throw HevyAPIError.decodingError(decodingError)
            }

        } catch let error as HevyAPIError {
            throw error
        } catch let error as DecodingError {
            throw HevyAPIError.decodingError(error)
        } catch {
            print("❌ [HevyAPI] Network error: \(error.localizedDescription)")
            throw HevyAPIError.networkError(error)
        }
    }

    // MARK: - Health Check

    /// Test API connection and authentication
    /// - Returns: True if connection successful
    func testConnection() async throws -> Bool {
        // Try to fetch a single page of exercise templates as a health check
        _ = try await fetchExerciseTemplates(page: 1, pageSize: 1)
        return true
    }
}
