# Hevy API Integration Guide

**Last Updated:** October 22, 2025
**API Base URL:** `https://api.hevyapp.com/v1`
**Official Docs:** [https://api.hevyapp.com/docs/](https://api.hevyapp.com/docs/)

---

## 🔑 Authentication

### ⚠️ CRITICAL: Use API Key Header (NOT Bearer Token)

The Hevy API uses **`api-key` header** authentication (NOT `Authorization: Bearer`).

**✅ CORRECT:**
```swift
request.setValue(apiKey, forHTTPHeaderField: "api-key")
request.setValue("application/json", forHTTPHeaderField: "Content-Type")
```

**❌ WRONG (This was the bug):**
```swift
request.setValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")
```

**How to Get API Key:**
1. Subscribe to **Hevy PRO** (required)
2. Go to https://hevy.com/settings?developer
3. Generate API key
4. Store in Keychain via `AppSettings.shared.hevyAPIKey`

---

## 📚 API Endpoints

### 1. Exercise Templates

**Endpoint:** `GET /v1/exercise_templates`

**Query Parameters:**
- `page` (int, default: 1)
- `pageSize` (int, default: 100, max: 100)

**Actual API Response Format:**
```json
{
  "exercise_templates": [
    {
      "id": "3BC06AD3",
      "title": "21s Bicep Curl",
      "type": "weight_reps",
      "primaryMuscleGroup": "biceps",
      "secondaryMuscleGroups": [],
      "isCustom": false
    }
  ],
  "page": 1,
  "page_count": 10
}
```

**Exercise Types:**
- `weight_reps` - Weight + reps (bench press)
- `weight_duration` - Weight + time (farmer's walk)
- `bodyweight_reps` - Bodyweight reps (pull-ups)
- `duration_distance` - Time + distance (running)
- `duration` - Time only (plank)
- `distance` - Distance only
- `assisted` - Assisted bodyweight
- `weighted` - Weighted bodyweight

**Swift Usage:**
```swift
let response = try await HevyAPIClient.shared.fetchExerciseTemplates(page: 1, pageSize: 100)
// response.exerciseTemplates: [ExerciseTemplate]
// response.page: Int
// response.pageCount: Int
```

### 2. Routines

**Endpoint:** `GET /v1/routines`

**Query Parameters:**
- `page` (int, default: 1)
- `pageSize` (int, default: 10, max: 10)

**Response Format:**
```json
{
  "routines": [
    {
      "id": "routine-123",
      "title": "Push Day",
      "folder_id": null,
      "notes": "Focus on chest",
      "exercises": [...],
      "updated_at": "2025-10-22T10:30:00Z",
      "created_at": "2025-10-15T08:00:00Z"
    }
  ],
  "page": 1,
  "page_count": 3
}
```

**Swift Usage:**
```swift
let response = try await HevyAPIClient.shared.fetchRoutines(page: 1, pageSize: 10)
// Use ISO8601 date decoder for dates
```

### 3. Create Workout

**Endpoint:** `POST /v1/workouts`

**Request Body:**
```json
{
  "title": "Morning Push",
  "description": "Chest and shoulders",
  "start_time": "2025-10-22T08:00:00Z",
  "end_time": "2025-10-22T09:30:00Z",
  "exercises": [
    {
      "exercise_template_id": "ABC123",
      "superset_id": null,
      "notes": "Felt strong",
      "sets": [
        {
          "type": "normal",
          "weight_kg": 80,
          "reps": 10,
          "rpe": 8
        }
      ]
    }
  ],
  "is_private": false
}
```

**Response:** Created workout with `id`

### 4. Update Workout

**Endpoint:** `PUT /v1/workouts/{workout_id}`

**Request Body:** Same as create workout

**Response:** Updated workout

## API Client Structure

```swift
final class HevyAPIClient {
    static let shared = HevyAPIClient()
    private let baseURL = "https://api.hevyapp.com/v1"

    func getRoutines() async throws -> RoutinesResponse
    func getRoutine(id: String) async throws -> Routine
    func createWorkout(_ request: CreateWorkoutRequest) async throws -> Workout
    func updateWorkout(id: String, _ request: UpdateWorkoutRequest) async throws -> Workout
}
```

## API Key Storage

**Use Keychain** (never hardcode)

```swift
final class KeychainService {
    func saveAPIKey(_ key: String)
    func getAPIKey() -> String?
    func deleteAPIKey()
}
```

**First-time setup:**
1. Show TextFieldLink on watch for API key input
2. Save to Keychain with `kSecAttrAccessibleAfterFirstUnlock`
3. Auto-load on subsequent launches

## Caching Strategy

```swift
CacheManager {
    // Cache routines (1 hour TTL)
    func cacheRoutines([Routine])
    func getCachedRoutines() -> [Routine]?

    // Cache exercise templates (1 hour TTL)
    func cacheExerciseTemplates([ExerciseTemplate])

    // Active workout (persistent until complete)
    func saveActiveWorkout(Workout)
    func getActiveWorkout() -> Workout?
}
```

**Why:** watchOS has unreliable connectivity (Bluetooth → WiFi → LTE). Cache aggressively.

## Data Models

```swift
struct Routine: Codable, Identifiable {
    let id: String              // routine_id
    let title: String
    let exercises: [RoutineExercise]
}

struct RoutineExercise: Codable {
    let exerciseTemplateId: String
    let sets: [RoutineSet]
    let supersetId: Int?
}

struct RoutineSet: Codable {
    let type: SetType           // warmup, normal, failure, dropset
    let weightKg: Double?
    let reps: Int?
    let distanceMeters: Int?
    let durationSeconds: Int?
}

struct Workout: Codable, Identifiable {
    let id: String              // workout_id
    let title: String
    let startTime: Date         // ISO8601
    let endTime: Date
    let exercises: [WorkoutExercise]
}

struct WorkoutSet: Codable {
    let type: SetType
    let weightKg: Double?
    let reps: Int?
    let rpe: Double?            // Rate of Perceived Exertion
}
```

## Workout Flow

```swift
// 1. Load routines at app start
let routines = try await apiClient.getRoutines()
cache.cacheRoutines(routines.routines)

// 2. User selects routine, start workout
let routine = routines[0]
let workout = try await apiClient.createWorkout(
    CreateWorkoutRequest(
        title: routine.title,
        startTime: Date(),
        endTime: Date(),
        exercises: routine.exercises.map { ... }
    )
)
cache.saveActiveWorkout(workout)

// 3. After each set, update workout
var updated = workout
updated.exercises[0].sets[0].reps = 8
updated.exercises[0].sets[0].rpe = 7
try await apiClient.updateWorkout(workout.id, UpdateWorkoutRequest(...))

// 4. Complete workout
updated.endTime = Date()
try await apiClient.updateWorkout(workout.id, UpdateWorkoutRequest(...))
cache.clearActiveWorkout()
```

## Error Handling

```swift
enum APIError: Error {
    case notConfigured          // No API key
    case invalidURL
    case httpError(Int)         // 401, 404, 500, etc.
    case decodingError(Error)
    case networkError(Error)
}
```

## watchOS Networking Best Practices

```swift
let config = URLSessionConfiguration.default
config.timeoutIntervalForRequest = 30
config.waitsForConnectivity = true      // Don't fail immediately
config.allowsCellularAccess = true      // Use LTE if no WiFi
```

- Always cache locally first
- Update server asynchronously
- Handle stale data gracefully
- Save active workout to UserDefaults (survives crashes)

## API Key Input Options

**Option A: First-time setup on watch** (RECOMMENDED)
- Show TextFieldLink for API key
- Store in Keychain
- Simple, secure, works on watch-only

**Option B: Hardcode for prototype**
```swift
let apiKey = "YOUR_KEY_HERE"  // NEVER ship this
```

**Option C: Sync from iPhone**
- Use iCloud Keychain
- Share API key via keychain groups
- Requires paired iPhone app
