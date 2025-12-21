# Hevy Sync Strategy

**Version:** 1.0
**Last Updated:** 2025-10-24
**Status:** Planning Document

A comprehensive sync strategy for integrating the phoneless-hevy Apple Watch app with the Hevy Fitness API, making the watch app a fully functional, voice-first client for Hevy.

---

## Table of Contents

1. [Sync Philosophy](#1-sync-philosophy)
2. [Data Models to Sync](#2-data-models-to-sync)
3. [API Integration Points](#3-api-integration-points)
4. [Voice-Specific Features](#4-voice-specific-features)
5. [Local Storage Strategy](#5-local-storage-strategy)
6. [Implementation Priorities](#6-implementation-priorities)
7. [Data Flow Diagrams](#7-data-flow-diagrams)
8. [Out of Scope](#8-out-of-scope-web-ui)
9. [Technical Considerations](#9-technical-considerations)

---

## 1. Sync Philosophy

### Core Principles

**Hevy as Source of Truth**
- All workout data ultimately lives in Hevy's cloud
- Watch app is a specialized client optimized for voice input
- Web/mobile apps handle complex operations (routine creation, analytics)
- Watch focuses on workout execution and voice logging

**Voice-First, Phone-Free**
- Voice is the primary input method during workouts
- All workout modifications happen via natural language
- LLM interprets commands and maps to Hevy API operations
- Watch provides haptic/visual feedback, minimal interaction

**Offline-Capable with Eventual Consistency**
- Download workout plan before starting (while online)
- Continue logging sets even if connection drops
- Queue sync operations locally
- Upload when connection restored
- Hevy always wins in conflicts (watch data merged into Hevy)

**Smart Caching**
- Exercise templates cached locally (rarely change)
- Routines fetched on-demand (before workout start)
- Historical data cached for context (last 30-90 days)
- Active workout synced incrementally in real-time

### Watch App Role

The watch app is **NOT** trying to replicate the full Hevy mobile app. Instead:

**What the Watch App DOES:**
- Execute workout routines created elsewhere
- Log sets/reps/weight via voice
- Add/switch/skip exercises mid-workout via voice
- Query exercise history during workouts ("what did I do last time?")
- Provide real-time feedback and progress tracking
- Sync workout data to Hevy immediately

**What the Watch App DOES NOT DO:**
- Create complex routines (use web UI)
- Create custom exercises (use mobile app)
- Browse workout history (use mobile app)
- Generate analytics/reports (use web UI)
- Social features (likes, comments, etc.)

---

## 2. Data Models to Sync

### 2.1 Exercise Templates

**What:** The master library of all exercises (default Hevy exercises + user's custom exercises)

**Why:** Required for voice command matching ("add pull-ups" → find template ID)

**Data Structure:**
```swift
struct ExerciseTemplate: Codable {
    let id: String                          // "3BC06AD3"
    let title: String                       // "Barbell Bench Press"
    let type: ExerciseType                  // .weightReps
    let primaryMuscleGroup: String?         // "chest"
    let secondaryMuscleGroups: [String]     // ["triceps", "shoulders"]
    let equipment: String?                  // "barbell"
    let isCustom: Bool                      // false (default) or true (user-created)
}

enum ExerciseType: String {
    case weightReps = "weight_reps"
    case weightDuration = "weight_duration"
    case bodyweightWeighted = "bodyweight_weighted"
    case bodyweightAssisted = "bodyweight_assisted"
    case distanceDuration = "distance_duration"
    case shortDistanceWeight = "short_distance_weight"
    case duration = "duration"
    case repsOnly = "reps_only"
    case stepsDuration = "steps_duration"
    case floorsDuration = "floors_duration"
}
```

**API Endpoint:**
- `GET /v1/exercise_templates?page=1&pageSize=100`
- Max page size: 100 (vs 10 for other endpoints)
- Total templates: ~435 (as of 2025-10-22)
- Pagination: 5 pages @ 100/page

**Sync Strategy:**
- **Initial Sync:** On first app launch, fetch all pages
- **Refresh:** Weekly background sync (templates rarely change)
- **Trigger:** User can manually refresh from settings
- **Storage:** CoreData with full-text search index on `title`

**Local Storage Requirements:**
- Fast fuzzy search for voice command matching
- Filter by muscle group for "find me a leg exercise"
- Filter by equipment type for "I want to use dumbbells"
- Mark favorites for quick access

**Implementation Priority:** **Phase 1** (Foundation)

---

### 2.2 Routines

**What:** User's workout routines (pre-planned exercise sequences with target sets/reps/weight)

**Why:** Most workouts start from a routine, not free-form

**Data Structure:**
```swift
struct Routine: Codable {
    let id: String                          // UUID
    let title: String                       // "Push Day A"
    let folderId: Int?                      // Organization folder
    let notes: String?                      // User notes
    let exercises: [RoutineExercise]        // Exercise list with targets
    let updatedAt: Date
    let createdAt: Date
}

struct RoutineExercise: Codable {
    let index: Int                          // Order in routine
    let title: String                       // Exercise name
    let exerciseTemplateId: String          // Reference to template
    let supersetId: Int?                    // Superset grouping
    let restSeconds: Int?                   // Target rest time
    let notes: String?                      // Per-exercise notes
    let sets: [RoutineSet]                  // Target sets
}

struct RoutineSet: Codable {
    let index: Int
    let type: SetType                       // .warmup, .normal, .failure, .dropset
    let weightKg: Double?                   // Target weight
    let reps: Int?                          // Target reps
    let repRange: RepRange?                 // Rep range (e.g., 8-12)
    let durationSeconds: Int?               // Target duration
    let distanceMeters: Int?                // Target distance
}
```

**API Endpoints:**
- `GET /v1/routines?page=1&pageSize=10` - List all routines
- `GET /v1/routines/{routineId}` - Fetch specific routine
- `GET /v1/routine_folders` - Organize routines

**Sync Strategy:**
- **Initial Sync:** Fetch all routines on app launch (list only, not full details)
- **On-Demand:** Fetch full routine details when user selects it for workout
- **Refresh:** Before workout start, re-fetch routine to get latest changes
- **Conflict Resolution:** Routines are READ-ONLY on watch (edit on web/mobile)

**Local Storage Requirements:**
- List view: Routine name + folder + exercise count
- Detail view: Full routine with all exercises and target sets
- Cache for 24 hours, then refresh
- User can force refresh before starting workout

**Implementation Priority:** **Phase 1** (Foundation)

---

### 2.3 Routine Folders

**What:** Organization structure for routines

**Why:** Users may have dozens of routines, folders provide organization

**Data Structure:**
```swift
struct RoutineFolder: Codable {
    let id: Int                             // Numeric ID (not UUID)
    let name: String                        // "Hypertrophy Programs"
    let index: Int                          // Display order
    let createdAt: Date
    let routines: [String]?                 // Routine IDs in folder
}
```

**API Endpoints:**
- `GET /v1/routine_folders` - List all folders
- `GET /v1/routine_folders/{folderId}` - Get folder with routines

**Sync Strategy:**
- **Sync with Routines:** Fetch folders when fetching routine list
- **Display:** Group routines by folder in selection UI

**Implementation Priority:** **Phase 1** (Foundation)

---

### 2.4 Workout History

**What:** Past completed workouts

**Why:** Provide context during workouts ("what did I do last time?")

**Data Structure:**
```swift
struct WorkoutData: Codable {
    let id: String                          // UUID
    let title: String                       // "Push Day A"
    let routineId: String?                  // Reference to routine (if used)
    let description: String?                // Workout notes
    let startTime: Date                     // When workout started
    let endTime: Date                       // When workout ended
    let isPrivate: Bool                     // Privacy setting
    let exercises: [WorkoutExercise]        // Completed exercises
    let updatedAt: Date
    let createdAt: Date
}

struct WorkoutExercise: Codable {
    let index: Int                          // Order in workout
    let title: String                       // Exercise name
    let exerciseTemplateId: String          // Reference to template
    let supersetId: Int?                    // Superset grouping
    let notes: String?                      // Per-exercise notes
    let sets: [WorkoutSet]                  // Completed sets
}

struct WorkoutSet: Codable {
    let index: Int
    let type: SetType
    let weightKg: Double?                   // Actual weight
    let reps: Int?                          // Actual reps
    let rpe: Double?                        // Rate of Perceived Exertion (6-10)
    let durationSeconds: Int?               // Actual duration
    let distanceMeters: Int?                // Actual distance
}
```

**API Endpoints:**
- `GET /v1/workouts?page=1&pageSize=10` - List workouts (paginated)
- `GET /v1/workouts/{workoutId}` - Get specific workout
- `GET /v1/workouts/count` - Total workout count
- `GET /v1/workout_events?since=DATE` - Incremental sync

**Sync Strategy:**
- **Initial Sync:** Last 30 days of workouts on app launch
- **Incremental Sync:** Use `/workout_events` endpoint to get changes since last sync
- **Background Sync:** Check for updates every 24 hours
- **Rolling Window:** Keep last 90 days locally, delete older

**Use Cases:**
- **Exercise History:** "What did I bench last week?" → Query local cache
- **Set Suggestions:** "You did 100kg × 10 last time" → Auto-suggest weight
- **Trend Analysis:** Show progression chart for exercise
- **Workout Context:** Display last workout date on routine selection

**Implementation Priority:** **Phase 2** (Context)

---

### 2.5 Exercise History (Per-Exercise)

**What:** Specialized endpoint for exercise-specific history

**Why:** Faster than filtering full workout history for one exercise

**API Endpoint:**
- `GET /v1/exercise_history/{exerciseTemplateId}?page=1&pageSize=10`

**Response:**
```json
{
  "page": 1,
  "page_count": 5,
  "exercise_history": [
    {
      "workout_id": "abc123",
      "workout_title": "Push Day A",
      "workout_date": "2024-10-20T10:00:00Z",
      "sets": [
        {
          "type": "normal",
          "weight_kg": 100,
          "reps": 10,
          "rpe": 8.5
        }
      ]
    }
  ]
}
```

**Sync Strategy:**
- **On-Demand:** Fetch when user asks "what did I do last time on bench press?"
- **Cache:** Store last result for 1 hour
- **No Persistent Storage:** Too granular, use full workout history instead

**Implementation Priority:** **Phase 4** (Advanced Queries)

---

### 2.6 Active Workout (Real-Time Sync)

**What:** The workout currently in progress

**Why:** Ensure data is saved immediately, even if watch crashes or battery dies

**Sync Strategy:**

#### Workout Start
```swift
// When user starts workout
let workout = WorkoutData(
    title: routine.title,
    startTime: Date(),
    endTime: Date(),  // Will update on workout end
    exercises: routine.exercises.map {
        WorkoutExercise(exerciseTemplateId: $0.exerciseTemplateId, sets: [])
    },
    description: "Logged via phoneless-hevy",
    isPrivate: false
)

// POST to create workout
let response = try await hevyAPI.createWorkout(workout)
let workoutId = response.id

// Store workoutId locally for updates
WorkoutSession.shared.hevyWorkoutId = workoutId
```

#### Set Completion (Incremental Update)
```swift
// When user completes a set via voice
let newSet = WorkoutSet(
    type: .normal,
    weightKg: 100,
    reps: 10,
    rpe: 8.0
)

// Add to local state
workoutState.addCompletedSet(to: exerciseId, set: newSet)

// Immediately PUT to Hevy (full workout replacement)
let updatedWorkout = workoutState.toWorkoutData()
try await hevyAPI.updateWorkout(id: workoutId, workout: updatedWorkout)

// If PUT fails, queue for retry
if failure {
    syncQueue.append(.updateWorkout(workoutId, updatedWorkout))
}
```

#### Workout End
```swift
// When user finishes workout
workoutState.endTime = Date()
let finalWorkout = workoutState.toWorkoutData()

// Final PUT to Hevy
try await hevyAPI.updateWorkout(id: workoutId, workout: finalWorkout)

// Mark workout complete locally
WorkoutSession.shared.complete()
```

**Key Points:**
- **POST once** at workout start (creates workout in Hevy)
- **PUT immediately** after every set (incremental sync)
- **PUT replaces entire workout** (API design, not PATCH support)
- **Offline queue:** If PUT fails, retry when connection restored
- **No conflict resolution needed:** Watch is authoritative for active workout

**Implementation Priority:** **Phase 2** (Active Workout Sync)

---

## 3. API Integration Points

Reference: See `/phoneless-hevy/HEVY-API-REFERENCE.md` for complete API documentation.

### 3.1 GET Operations (Read from Hevy)

#### Exercise Templates

**Endpoint:** `GET /v1/exercise_templates`

**Query Parameters:**
- `page`: Page number (default: 1)
- `pageSize`: Results per page (default: 5, max: 100)

**Response:**
```json
{
  "page": 1,
  "page_count": 5,
  "exercise_templates": [
    {
      "id": "3BC06AD3",
      "title": "Barbell Bench Press",
      "type": "weight_reps",
      "primary_muscle_group": "chest",
      "secondary_muscle_groups": ["triceps", "shoulders"],
      "equipment": "barbell",
      "is_custom": false
    }
  ]
}
```

**Swift Implementation:**
```swift
func fetchAllExerciseTemplates() async throws -> [ExerciseTemplate] {
    var allTemplates: [ExerciseTemplate] = []
    var currentPage = 1
    var totalPages = 1

    repeat {
        let response = try await fetchExerciseTemplates(page: currentPage, pageSize: 100)
        allTemplates.append(contentsOf: response.exerciseTemplates)
        totalPages = response.pageCount
        currentPage += 1
    } while currentPage <= totalPages

    return allTemplates
}
```

---

#### Routines

**Endpoint:** `GET /v1/routines`

**Query Parameters:**
- `page`: Page number (default: 1)
- `pageSize`: Results per page (default: 5, max: 10)

**Response:**
```json
{
  "page": 1,
  "page_count": 3,
  "routines": [
    {
      "id": "b459cba5-cd6d-463c-abd6-54f8eafcadcb",
      "title": "Push Day A",
      "folder_id": null,
      "notes": "Focus on progressive overload",
      "exercises": [...],
      "updated_at": "2024-10-20T12:00:00Z",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

**Endpoint:** `GET /v1/routines/{routineId}`

**Response:**
```json
{
  "routine": {
    "id": "b459cba5-cd6d-463c-abd6-54f8eafcadcb",
    "title": "Push Day A",
    "exercises": [
      {
        "index": 0,
        "title": "Barbell Bench Press",
        "exercise_template_id": "3BC06AD3",
        "superset_id": null,
        "rest_seconds": 120,
        "notes": "Control the eccentric",
        "sets": [
          {
            "index": 0,
            "type": "warmup",
            "weight_kg": 60,
            "reps": 10
          }
        ]
      }
    ]
  }
}
```

**Swift Implementation:**
```swift
func fetchRoutineDetail(id: String) async throws -> Routine {
    let endpoint = "\(baseURL)/routines/\(id)"
    let request = createRequest(endpoint: endpoint, method: "GET")
    let (data, _) = try await session.data(for: request)

    let decoder = JSONDecoder()
    decoder.keyDecodingStrategy = .convertFromSnakeCase
    decoder.dateDecodingStrategy = .iso8601

    let response = try decoder.decode(RoutineResponse.self, from: data)
    return response.routine
}

struct RoutineResponse: Codable {
    let routine: Routine
}
```

---

#### Workout History

**Endpoint:** `GET /v1/workouts`

**Query Parameters:**
- `page`: Page number (default: 1)
- `pageSize`: Results per page (default: 5, max: 10)

**Response:**
```json
{
  "page": 1,
  "page_count": 42,
  "workouts": [
    {
      "id": "ef4ab297-7c27-41ed-897c-96cc8857469a",
      "title": "Push Day A",
      "routine_id": "b459cba5-cd6d-463c-abd6-54f8eafcadcb",
      "description": "Logged via phoneless-hevy",
      "start_time": "2024-10-20T10:00:00Z",
      "end_time": "2024-10-20T11:15:00Z",
      "exercises": [...]
    }
  ]
}
```

**Swift Implementation (Last 30 Days):**
```swift
func fetchRecentWorkouts(days: Int = 30) async throws -> [WorkoutData] {
    var allWorkouts: [WorkoutData] = []
    var currentPage = 1
    let cutoffDate = Date().addingTimeInterval(-Double(days) * 24 * 60 * 60)

    repeat {
        let response = try await fetchWorkouts(page: currentPage, pageSize: 10)

        // Filter workouts after cutoff date
        let recentWorkouts = response.workouts.filter { workout in
            workout.startTime >= cutoffDate
        }

        allWorkouts.append(contentsOf: recentWorkouts)

        // Stop if we've gone past cutoff date
        if response.workouts.last?.startTime ?? Date() < cutoffDate {
            break
        }

        currentPage += 1
    } while currentPage <= response.pageCount

    return allWorkouts
}
```

---

#### Workout Events (Incremental Sync)

**Endpoint:** `GET /v1/workout_events`

**Query Parameters:**
- `since`: ISO 8601 date (default: 1970-01-01T00:00:00Z)
- `page`: Page number (default: 1)
- `pageSize`: Results per page (default: 5, max: 10)

**Response:**
```json
{
  "page": 1,
  "page_count": 2,
  "workout_events": [
    {
      "type": "updated",
      "event_timestamp": "2024-10-20T12:30:00Z",
      "workout": { ... }
    },
    {
      "type": "deleted",
      "event_timestamp": "2024-10-20T12:00:00Z",
      "workout_id": "abc123"
    }
  ]
}
```

**Swift Implementation:**
```swift
func syncWorkoutsSince(_ date: Date) async throws {
    let formatter = ISO8601DateFormatter()
    let sinceString = formatter.string(from: date)

    var currentPage = 1
    var totalPages = 1

    repeat {
        let endpoint = "\(baseURL)/workout_events?since=\(sinceString)&page=\(currentPage)&pageSize=10"
        let response = try await fetchWorkoutEvents(endpoint: endpoint)

        for event in response.workoutEvents {
            switch event.type {
            case "updated":
                // Update or insert workout in CoreData
                if let workout = event.workout {
                    try await localStore.upsertWorkout(workout)
                }
            case "deleted":
                // Delete workout from CoreData
                if let workoutId = event.workoutId {
                    try await localStore.deleteWorkout(id: workoutId)
                }
            }
        }

        totalPages = response.pageCount
        currentPage += 1
    } while currentPage <= totalPages

    // Update last sync timestamp
    UserDefaults.standard.set(Date(), forKey: "lastWorkoutSync")
}
```

---

### 3.2 POST/PUT Operations (Write to Hevy)

#### Create Workout

**Endpoint:** `POST /v1/workouts`

**CRITICAL:** Request must wrap payload in `"workout"` key!

**Request:**
```json
{
  "workout": {
    "title": "Push Day A",
    "description": "Logged via phoneless-hevy",
    "start_time": "2024-10-20T10:00:00Z",
    "end_time": "2024-10-20T10:00:00Z",
    "routine_id": "b459cba5-cd6d-463c-abd6-54f8eafcadcb",
    "is_private": false,
    "exercises": []
  }
}
```

**Response (201 Created):**
```json
{
  "workout": [  // ⚠️ IT'S AN ARRAY!
    {
      "id": "ef4ab297-7c27-41ed-897c-96cc8857469a",
      "title": "Push Day A",
      ...
    }
  ]
}
```

**Swift Implementation:**
```swift
func createWorkout(_ workout: WorkoutData) async throws -> WorkoutData {
    let endpoint = "\(baseURL)/workouts"
    var request = createRequest(endpoint: endpoint, method: "POST")

    // CRITICAL: Wrap in "workout" key
    let requestBody = ["workout": workout]

    let encoder = JSONEncoder()
    encoder.keyEncodingStrategy = .convertToSnakeCase
    encoder.dateEncodingStrategy = .iso8601
    request.httpBody = try encoder.encode(requestBody)

    let (data, response) = try await session.data(for: request)

    guard let httpResponse = response as? HTTPURLResponse,
          httpResponse.statusCode == 201 else {
        throw HevyAPIError.httpError(statusCode, errorMessage)
    }

    // CRITICAL: Response is {"workout": [WorkoutData]}
    let decoder = JSONDecoder()
    decoder.keyDecodingStrategy = .convertFromSnakeCase
    decoder.dateDecodingStrategy = .iso8601

    let responseWrapper = try decoder.decode(WorkoutResponse.self, from: data)
    guard let workout = responseWrapper.workout.first else {
        throw HevyAPIError.invalidResponse
    }

    return workout
}

struct WorkoutResponse: Codable {
    let workout: [WorkoutData]  // ARRAY, not single object!
}
```

---

#### Update Workout (Incremental Sync)

**Endpoint:** `PUT /v1/workouts/{workoutId}`

**CRITICAL:**
- Request must wrap payload in `"workout"` key
- Must include ALL exercises and sets (replaces entire workout)
- Response is also an array!

**Request:**
```json
{
  "workout": {
    "title": "Push Day A",
    "description": "Logged via phoneless-hevy",
    "start_time": "2024-10-20T10:00:00Z",
    "end_time": "2024-10-20T11:15:00Z",
    "is_private": false,
    "exercises": [
      {
        "exercise_template_id": "3BC06AD3",
        "superset_id": null,
        "notes": "Felt strong today",
        "sets": [
          {
            "type": "normal",
            "weight_kg": 100,
            "reps": 10,
            "rpe": 8.0
          }
        ]
      }
    ]
  }
}
```

**Response (200 OK):**
```json
{
  "workout": [  // ⚠️ IT'S AN ARRAY!
    {
      "id": "ef4ab297-7c27-41ed-897c-96cc8857469a",
      ...
    }
  ]
}
```

**Swift Implementation:**
```swift
func updateWorkout(id: String, workout: WorkoutData) async throws -> WorkoutData {
    let endpoint = "\(baseURL)/workouts/\(id)"
    var request = createRequest(endpoint: endpoint, method: "PUT")

    // CRITICAL: Wrap in "workout" key
    let requestBody = ["workout": workout]

    let encoder = JSONEncoder()
    encoder.keyEncodingStrategy = .convertToSnakeCase
    encoder.dateEncodingStrategy = .iso8601
    request.httpBody = try encoder.encode(requestBody)

    let (data, response) = try await session.data(for: request)

    guard let httpResponse = response as? HTTPURLResponse,
          httpResponse.statusCode == 200 else {
        throw HevyAPIError.httpError(statusCode, errorMessage)
    }

    let decoder = JSONDecoder()
    decoder.keyDecodingStrategy = .convertFromSnakeCase
    decoder.dateDecodingStrategy = .iso8601

    let responseWrapper = try decoder.decode(WorkoutResponse.self, from: data)
    guard let workout = responseWrapper.workout.first else {
        throw HevyAPIError.invalidResponse
    }

    return workout
}
```

**Optimization Strategy:**
```swift
// Debounce rapid updates (if user logs multiple sets quickly)
class WorkoutSyncManager {
    private var syncTimer: Timer?
    private var pendingWorkout: WorkoutData?

    func scheduleSync(workout: WorkoutData) {
        pendingWorkout = workout

        // Cancel existing timer
        syncTimer?.invalidate()

        // Sync after 2 seconds of inactivity
        syncTimer = Timer.scheduledTimer(withTimeInterval: 2.0, repeats: false) { [weak self] _ in
            guard let self = self, let workout = self.pendingWorkout else { return }

            Task {
                do {
                    try await HevyAPIClient.shared.updateWorkout(id: workout.id, workout: workout)
                    print("✅ Workout synced to Hevy")
                } catch {
                    print("❌ Sync failed, queued for retry: \(error)")
                    self.queueForRetry(workout)
                }
            }
        }
    }

    private func queueForRetry(_ workout: WorkoutData) {
        // Store in local queue for retry when connection restored
        // ... implementation details ...
    }
}
```

---

### 3.3 Sync Triggers

#### App Launch
```swift
func application(didFinishLaunchingWithOptions launchOptions) {
    Task {
        // Critical data: Exercise templates (required for voice matching)
        try await syncExerciseTemplates()

        // User data: Routines (for workout selection)
        try await syncRoutines()

        // Background: Workout history (for context)
        Task.detached(priority: .background) {
            try await syncRecentWorkouts(days: 30)
        }
    }
}
```

#### Routine Selection
```swift
func userSelectedRoutine(_ routineId: String) async {
    // Fetch latest routine details (in case user edited on web)
    let routine = try await HevyAPIClient.shared.fetchRoutineDetail(id: routineId)

    // Create WorkoutState from routine
    let workoutState = WorkoutState.fromRoutine(routine)

    // Start workout session
    WorkoutSession.shared.start(workoutState)
}
```

#### Set Completion
```swift
func didCompleteSet(exercise: String, set: CompletedSet) async {
    // Update local state
    workoutState.addCompletedSet(to: exercise, set: set)

    // Immediately sync to Hevy
    WorkoutSyncManager.shared.scheduleSync(workout: workoutState.toWorkoutData())
}
```

#### Workout End
```swift
func endWorkout() async {
    // Update end time
    workoutState.endTime = Date()

    // Final sync to Hevy (immediate, no debounce)
    do {
        let workout = workoutState.toWorkoutData()
        try await HevyAPIClient.shared.updateWorkout(id: workoutState.id, workout: workout)

        // Mark workout complete locally
        WorkoutSession.shared.complete()

        print("✅ Workout ended and synced to Hevy")
    } catch {
        print("❌ Final sync failed: \(error)")
        // Queue for retry (critical to not lose data)
        syncQueue.append(.finalizeWorkout(workoutState.id, workoutState.toWorkoutData()))
    }
}
```

#### Background Sync (Periodic)
```swift
// WatchKit extension background task
func handleBackgroundTasks(_ backgroundTasks: Set<WKRefreshBackgroundTask>) {
    for task in backgroundTasks {
        if let refreshTask = task as? WKApplicationRefreshBackgroundTask {
            Task {
                // Check for workout updates (incremental sync)
                if let lastSync = UserDefaults.standard.object(forKey: "lastWorkoutSync") as? Date {
                    try await HevyAPIClient.shared.syncWorkoutsSince(lastSync)
                }

                // Schedule next background refresh (24 hours)
                let nextRefresh = Date().addingTimeInterval(24 * 60 * 60)
                WKExtension.shared().scheduleBackgroundRefresh(withPreferredDate: nextRefresh) { _ in }

                refreshTask.setTaskCompletedWithSnapshot(false)
            }
        }
    }
}
```

---

## 4. Voice-Specific Features

Voice is the primary input method for the watch app. The LLM interprets natural language commands and translates them to Hevy API operations.

### 4.1 Mid-Workout Modifications

Voice commands that alter the active workout structure:

---

#### Add Exercise

**Voice Input:**
- "Add pull-ups"
- "I want to do some cardio"
- "Throw in some bicep curls"

**LLM Processing:**
1. Extract exercise name from voice input
2. Fuzzy match against local exercise template cache
3. Find best match or ask for clarification
4. Determine where to insert (after current exercise? at end?)

**Implementation:**
```swift
func handleAddExerciseCommand(exerciseName: String) async {
    // 1. Find exercise template
    guard let template = await ExerciseTemplateMatcher.shared.findExercise(named: exerciseName) else {
        // LLM couldn't find match
        speak("I couldn't find an exercise called \(exerciseName). Can you be more specific?")
        return
    }

    // 2. Confirm with user
    speak("Adding \(template.title). How many sets?")

    // 3. Wait for voice response
    let setsCount = await VoiceInputManager.shared.listenForNumber()

    // 4. Create planned sets (user will log actual performance)
    let plannedSets = (0..<setsCount).map { _ in
        PlannedSet(targetWeight: nil, targetReps: nil)  // To be filled
    }

    // 5. Add to workout state
    let newExercise = WorkoutStateExercise(
        exerciseTemplateId: template.id,
        name: template.title,
        supersetId: nil,
        plannedSets: plannedSets,
        isFromRoutine: false  // Added mid-workout
    )

    workoutState.exercises.append(newExercise)

    // 6. Sync to Hevy (convert to WorkoutExercise format)
    let workout = workoutState.toWorkoutData()
    try await HevyAPIClient.shared.updateWorkout(id: workoutState.id, workout: workout)

    speak("\(template.title) added. You can start when ready.")
}
```

**API Call:**
- `PUT /v1/workouts/{workoutId}` with updated exercises array
- Include new exercise with empty sets array (to be filled as user completes sets)

---

#### Switch Exercise

**Voice Input:**
- "Switch to dumbbell press"
- "Use cables instead"
- "Replace this with incline bench"

**LLM Processing:**
1. Identify current exercise being worked on
2. Extract replacement exercise name
3. Find equivalent exercise (same muscle group preferred)
4. Preserve completed sets (or discard and start fresh)

**Implementation:**
```swift
func handleSwitchExerciseCommand(replacementName: String) async {
    // 1. Get current exercise
    guard let currentExercise = workoutState.currentExercise() else {
        speak("No exercise in progress to replace")
        return
    }

    // 2. Find replacement exercise
    guard let replacement = await ExerciseReplacementService.shared.findReplacement(
        for: currentExercise.exerciseTemplateId,
        withName: replacementName
    ) else {
        speak("I couldn't find \(replacementName). Try again?")
        return
    }

    // 3. Confirm with user
    speak("Switching from \(currentExercise.name) to \(replacement.title). Keep completed sets?")
    let keepSets = await VoiceInputManager.shared.listenForYesNo()

    // 4. Update workout state
    if let index = workoutState.exercises.firstIndex(where: {
        $0.exerciseTemplateId == currentExercise.exerciseTemplateId
    }) {
        // Replace exercise but keep completed sets if user wants
        workoutState.exercises[index] = WorkoutStateExercise(
            exerciseTemplateId: replacement.id,
            name: replacement.title,
            supersetId: currentExercise.supersetId,
            plannedSets: currentExercise.plannedSets,
            completedSets: keepSets ? currentExercise.completedSets : [],
            isFromRoutine: false  // Modified from routine
        )
    }

    // 5. Sync to Hevy
    let workout = workoutState.toWorkoutData()
    try await HevyAPIClient.shared.updateWorkout(id: workoutState.id, workout: workout)

    speak("Switched to \(replacement.title)")
}

// Service to find equivalent exercises
class ExerciseReplacementService {
    func findReplacement(for exerciseId: String, withName name: String) async -> ExerciseTemplate? {
        // Get current exercise details
        guard let current = await ExerciseTemplateCache.shared.getTemplate(byId: exerciseId) else {
            return nil
        }

        // Fuzzy match by name
        let matches = await ExerciseTemplateCache.shared.search(query: name)

        // Prioritize same muscle group
        let sameMusclGroup = matches.filter {
            $0.primaryMuscleGroup == current.primaryMuscleGroup
        }

        return sameMusclGroup.first ?? matches.first
    }
}
```

**API Call:**
- `PUT /v1/workouts/{workoutId}` with updated exercise (new template ID, existing sets)

---

#### Skip Exercise

**Voice Input:**
- "Skip this"
- "Done with squats"
- "Move to next exercise"

**LLM Processing:**
1. Identify current exercise
2. Mark as completed (even if not all planned sets done)
3. Move to next exercise in workout

**Implementation:**
```swift
func handleSkipExerciseCommand() {
    // 1. Get current exercise
    guard let currentExercise = workoutState.currentExercise() else {
        speak("No exercise in progress")
        return
    }

    // 2. Confirm skip
    speak("Skip \(currentExercise.name)? You've done \(currentExercise.completedSets.count) sets.")
    let confirmed = await VoiceInputManager.shared.listenForYesNo()

    guard confirmed else {
        speak("Okay, continuing with \(currentExercise.name)")
        return
    }

    // 3. Mark exercise completed
    workoutState.completeExercise(currentExercise.exerciseTemplateId)

    // 4. Announce next exercise
    if let next = workoutState.nextExercise() {
        speak("Moving to \(next.name)")
    } else {
        speak("That was the last exercise. Workout complete!")
    }

    // 5. Sync to Hevy
    Task {
        let workout = workoutState.toWorkoutData()
        try await HevyAPIClient.shared.updateWorkout(id: workoutState.id, workout: workout)
    }
}
```

**API Call:**
- `PUT /v1/workouts/{workoutId}` with exercise marked complete (no additional sets)

---

#### Reorder Exercises

**Voice Input:**
- "Let's do deadlifts next"
- "Move bench press to the end"
- "I want to do abs first"

**LLM Processing:**
1. Identify target exercise
2. Determine new position (next? end? beginning?)
3. Reorder workout state
4. Update Hevy

**Implementation:**
```swift
func handleReorderExerciseCommand(exerciseName: String, position: Position) {
    // 1. Find exercise in workout
    guard let exerciseIndex = workoutState.exercises.firstIndex(where: {
        $0.name.lowercased().contains(exerciseName.lowercased())
    }) else {
        speak("I couldn't find \(exerciseName) in your workout")
        return
    }

    let exercise = workoutState.exercises[exerciseIndex]

    // 2. Remove from current position
    workoutState.exercises.remove(at: exerciseIndex)

    // 3. Insert at new position
    switch position {
    case .next:
        if let currentIndex = workoutState.exercises.firstIndex(where: { !$0.isCompleted }) {
            workoutState.exercises.insert(exercise, at: currentIndex)
        }
    case .end:
        workoutState.exercises.append(exercise)
    case .beginning:
        workoutState.exercises.insert(exercise, at: 0)
    }

    speak("Moved \(exercise.name)")

    // 4. Sync to Hevy
    Task {
        let workout = workoutState.toWorkoutData()
        try await HevyAPIClient.shared.updateWorkout(id: workoutState.id, workout: workout)
    }
}

enum Position {
    case next
    case end
    case beginning
}
```

**API Call:**
- `PUT /v1/workouts/{workoutId}` with reordered exercises array

---

### 4.2 Performance History Queries

Voice commands that fetch historical data for context:

---

#### Exercise History

**Voice Input:**
- "What did I do last time on bench press?"
- "Show me my last squat workout"
- "When did I hit 100kg on deadlifts?"

**LLM Processing:**
1. Extract exercise name
2. Match to exercise template
3. Query local workout history cache
4. Find most recent workout with that exercise
5. Display sets/reps/weight from that workout

**Implementation:**
```swift
func handleExerciseHistoryQuery(exerciseName: String) async {
    // 1. Find exercise template
    guard let template = await ExerciseTemplateMatcher.shared.findExercise(named: exerciseName) else {
        speak("I couldn't find an exercise called \(exerciseName)")
        return
    }

    // 2. Query local workout history
    guard let lastWorkout = await WorkoutHistoryCache.shared.findLastWorkoutWith(exerciseId: template.id) else {
        speak("You haven't logged \(template.title) recently")
        return
    }

    // 3. Find exercise in that workout
    guard let exercise = lastWorkout.exercises.first(where: {
        $0.exerciseTemplateId == template.id
    }) else {
        speak("Couldn't find exercise data")
        return
    }

    // 4. Build response
    let dateFormatter = DateFormatter()
    dateFormatter.dateStyle = .medium
    let dateString = dateFormatter.string(from: lastWorkout.startTime)

    var response = "Last time was \(dateString). You did \(exercise.sets.count) sets: "

    for (index, set) in exercise.sets.enumerated() {
        if let weight = set.weightKg, let reps = set.reps {
            response += "Set \(index + 1): \(weight)kg × \(reps)"
            if let rpe = set.rpe {
                response += " @ RPE \(rpe)"
            }
            response += ". "
        }
    }

    speak(response)

    // 5. Display on screen
    displayExerciseHistory(exercise: template, workout: lastWorkout, exerciseData: exercise)
}
```

**Data Source:**
- Local CoreData cache of last 90 days of workouts
- No API call needed (already synced)
- If not found locally, can fetch from `GET /v1/exercise_history/{templateId}`

---

#### Set Comparison

**Voice Input:**
- "How am I doing compared to last week?"
- "Is this better than last time?"
- "Show my progress on overhead press"

**LLM Processing:**
1. Get current exercise and completed sets
2. Find same exercise from previous workout
3. Compare weight/reps/volume
4. Display visual diff

**Implementation:**
```swift
func handleProgressComparison() async {
    // 1. Get current exercise
    guard let currentExercise = workoutState.currentExercise() else {
        speak("No exercise in progress")
        return
    }

    // 2. Find last workout with this exercise
    guard let lastWorkout = await WorkoutHistoryCache.shared.findLastWorkoutWith(
        exerciseId: currentExercise.exerciseTemplateId,
        before: workoutState.startTime  // Before current workout
    ) else {
        speak("This is your first time doing \(currentExercise.name)")
        return
    }

    guard let lastExercise = lastWorkout.exercises.first(where: {
        $0.exerciseTemplateId == currentExercise.exerciseTemplateId
    }) else {
        speak("No previous data found")
        return
    }

    // 3. Compare performance
    let comparison = comparePerformance(
        current: currentExercise.completedSets,
        previous: lastExercise.sets
    )

    // 4. Build response
    switch comparison.trend {
    case .improved:
        speak("You're doing better! \(comparison.details)")
    case .similar:
        speak("About the same as last time. \(comparison.details)")
    case .declined:
        speak("A bit lower than last time. \(comparison.details)")
    }

    // 5. Display visual comparison
    displayComparisonChart(current: currentExercise, previous: lastExercise)
}

struct PerformanceComparison {
    enum Trend { case improved, similar, declined }
    let trend: Trend
    let details: String
}

func comparePerformance(current: [CompletedSet], previous: [WorkoutSet]) -> PerformanceComparison {
    // Calculate total volume (weight × reps)
    let currentVolume = current.reduce(0.0) { sum, set in
        sum + (set.actualWeight ?? 0) * Double(set.actualReps ?? 0)
    }

    let previousVolume = previous.reduce(0.0) { sum, set in
        sum + (set.weightKg ?? 0) * Double(set.reps ?? 0)
    }

    let diff = currentVolume - previousVolume
    let percentChange = (diff / previousVolume) * 100

    if percentChange > 5 {
        return PerformanceComparison(
            trend: .improved,
            details: String(format: "Volume up %.1f%% (%dkg total)", percentChange, Int(diff))
        )
    } else if percentChange < -5 {
        return PerformanceComparison(
            trend: .declined,
            details: String(format: "Volume down %.1f%% (%dkg total)", abs(percentChange), Int(abs(diff)))
        )
    } else {
        return PerformanceComparison(
            trend: .similar,
            details: "Within 5% of last time"
        )
    }
}
```

**Data Source:**
- Local CoreData cache (no API call)

---

#### Trend Analysis

**Voice Input:**
- "Show my bench press progress"
- "How have my squats been trending?"
- "Am I getting stronger on deadlifts?"

**LLM Processing:**
1. Extract exercise name
2. Query last 5-10 workouts with that exercise
3. Calculate trend (linear regression or simple comparison)
4. Display chart with progression

**Implementation:**
```swift
func handleTrendAnalysis(exerciseName: String) async {
    // 1. Find exercise template
    guard let template = await ExerciseTemplateMatcher.shared.findExercise(named: exerciseName) else {
        speak("I couldn't find \(exerciseName)")
        return
    }

    // 2. Query last 10 workouts with this exercise
    let recentWorkouts = await WorkoutHistoryCache.shared.findRecentWorkoutsWith(
        exerciseId: template.id,
        limit: 10
    )

    guard recentWorkouts.count >= 2 else {
        speak("Not enough data yet. Do this exercise a few more times.")
        return
    }

    // 3. Extract max weight or volume per workout
    let dataPoints = recentWorkouts.map { workout -> (Date, Double) in
        guard let exercise = workout.exercises.first(where: {
            $0.exerciseTemplateId == template.id
        }) else {
            return (workout.startTime, 0)
        }

        // Max weight lifted
        let maxWeight = exercise.sets.compactMap { $0.weightKg }.max() ?? 0

        return (workout.startTime, maxWeight)
    }

    // 4. Calculate trend
    let trend = calculateTrend(dataPoints)

    // 5. Build response
    switch trend.direction {
    case .increasing:
        speak("Your \(template.title) is progressing! Up \(trend.percentage)% over the last \(recentWorkouts.count) workouts.")
    case .decreasing:
        speak("Your \(template.title) has decreased \(trend.percentage)% recently. Might need more recovery.")
    case .stable:
        speak("Your \(template.title) has been consistent at around \(trend.average)kg.")
    }

    // 6. Display chart
    displayProgressChart(exercise: template, dataPoints: dataPoints, trend: trend)
}

struct TrendAnalysis {
    enum Direction { case increasing, decreasing, stable }
    let direction: Direction
    let percentage: Double
    let average: Double
}

func calculateTrend(_ dataPoints: [(Date, Double)]) -> TrendAnalysis {
    let values = dataPoints.map { $0.1 }
    let average = values.reduce(0, +) / Double(values.count)

    guard let first = values.first, let last = values.last else {
        return TrendAnalysis(direction: .stable, percentage: 0, average: average)
    }

    let change = ((last - first) / first) * 100

    if change > 5 {
        return TrendAnalysis(direction: .increasing, percentage: abs(change), average: average)
    } else if change < -5 {
        return TrendAnalysis(direction: .decreasing, percentage: abs(change), average: average)
    } else {
        return TrendAnalysis(direction: .stable, percentage: 0, average: average)
    }
}
```

**Data Source:**
- Local CoreData cache
- Could also use `GET /v1/exercise_history/{templateId}` for more historical data

---

#### Exercise Search

**Voice Input:**
- "When did I last do deadlifts?"
- "Find my most recent leg workout"
- "When was my last pull day?"

**Implementation:**
```swift
func handleExerciseSearch(exerciseName: String) async {
    // 1. Find exercise template
    guard let template = await ExerciseTemplateMatcher.shared.findExercise(named: exerciseName) else {
        speak("I couldn't find \(exerciseName)")
        return
    }

    // 2. Search workout history
    guard let lastWorkout = await WorkoutHistoryCache.shared.findLastWorkoutWith(
        exerciseId: template.id
    ) else {
        speak("You haven't done \(template.title) recently")
        return
    }

    // 3. Calculate days ago
    let daysAgo = Calendar.current.dateComponents([.day], from: lastWorkout.startTime, to: Date()).day ?? 0

    // 4. Build response
    if daysAgo == 0 {
        speak("You did \(template.title) earlier today")
    } else if daysAgo == 1 {
        speak("You did \(template.title) yesterday")
    } else {
        speak("You did \(template.title) \(daysAgo) days ago")
    }

    // 5. Display workout summary
    displayWorkoutSummary(workout: lastWorkout, highlightExercise: template.id)
}
```

**Data Source:**
- Local CoreData cache

---

## 5. Local Storage Strategy

### 5.1 CoreData Models

```swift
// MARK: - Exercise Template Cache

@Model
class CachedExerciseTemplate {
    @Attribute(.unique) var id: String
    var title: String
    var type: String  // Raw value of ExerciseType enum
    var primaryMuscleGroup: String?
    var secondaryMuscleGroups: [String]
    var equipment: String?
    var isCustom: Bool
    var lastUpdated: Date

    // Search optimization
    var searchableTitle: String  // Lowercase, no special chars
}

// MARK: - Routine Cache

@Model
class CachedRoutine {
    @Attribute(.unique) var id: String
    var title: String
    var folderId: Int?
    var notes: String?
    var exerciseCount: Int  // Denormalized for list view
    var lastUpdated: Date

    @Relationship(deleteRule: .cascade) var exercises: [CachedRoutineExercise]
}

@Model
class CachedRoutineExercise {
    var index: Int
    var title: String
    var exerciseTemplateId: String
    var supersetId: Int?
    var restSeconds: Int?
    var notes: String?

    @Relationship var routine: CachedRoutine
    @Relationship(deleteRule: .cascade) var sets: [CachedRoutineSet]
}

@Model
class CachedRoutineSet {
    var index: Int
    var type: String  // Raw value of SetType enum
    var weightKg: Double?
    var reps: Int?
    var durationSeconds: Int?
    var distanceMeters: Int?

    @Relationship var exercise: CachedRoutineExercise
}

// MARK: - Workout History Cache

@Model
class CachedWorkout {
    @Attribute(.unique) var id: String
    var title: String
    var routineId: String?
    var desc: String?  // "description" is reserved keyword
    var startTime: Date
    var endTime: Date
    var isPrivate: Bool
    var updatedAt: Date
    var createdAt: Date

    @Relationship(deleteRule: .cascade) var exercises: [CachedWorkoutExercise]

    // Computed for filtering
    var daysAgo: Int {
        Calendar.current.dateComponents([.day], from: startTime, to: Date()).day ?? 0
    }
}

@Model
class CachedWorkoutExercise {
    var index: Int
    var title: String
    var exerciseTemplateId: String
    var supersetId: Int?
    var notes: String?

    @Relationship var workout: CachedWorkout
    @Relationship(deleteRule: .cascade) var sets: [CachedWorkoutSet]
}

@Model
class CachedWorkoutSet {
    var index: Int
    var type: String
    var weightKg: Double?
    var reps: Int?
    var rpe: Double?
    var durationSeconds: Int?
    var distanceMeters: Int?

    @Relationship var exercise: CachedWorkoutExercise
}
```

### 5.2 Caching Rules

#### Exercise Templates
```swift
class ExerciseTemplateCache {
    static let shared = ExerciseTemplateCache()

    // CACHE DURATION: Indefinite (until manual refresh or weekly background sync)
    func shouldRefresh() -> Bool {
        guard let lastUpdate = UserDefaults.standard.object(forKey: "lastTemplateSync") as? Date else {
            return true  // Never synced
        }

        // Refresh if older than 7 days
        return Date().timeIntervalSince(lastUpdate) > 7 * 24 * 60 * 60
    }

    // SEARCH OPTIMIZATION: Full-text search with fuzzy matching
    func search(query: String) async -> [ExerciseTemplate] {
        let context = modelContext
        let normalizedQuery = query.lowercased().trimmingCharacters(in: .whitespaces)

        // Fetch predicate with fuzzy matching
        let predicate = #Predicate<CachedExerciseTemplate> { template in
            template.searchableTitle.contains(normalizedQuery)
        }

        let descriptor = FetchDescriptor(predicate: predicate, sortBy: [SortDescriptor(\.title)])
        let results = try? context.fetch(descriptor)

        return results?.map { $0.toExerciseTemplate() } ?? []
    }
}
```

#### Routines
```swift
class RoutineCache {
    static let shared = RoutineCache()

    // CACHE DURATION: 24 hours
    func shouldRefresh(routine: CachedRoutine) -> Bool {
        return Date().timeIntervalSince(routine.lastUpdated) > 24 * 60 * 60
    }

    // FETCH ROUTINE: Check cache first, then API
    func getRoutine(id: String) async throws -> Routine {
        if let cached = try? fetchCachedRoutine(id: id),
           !shouldRefresh(routine: cached) {
            return cached.toRoutine()
        }

        // Fetch from API
        let routine = try await HevyAPIClient.shared.fetchRoutineDetail(id: id)

        // Update cache
        try await saveToCache(routine)

        return routine
    }
}
```

#### Workout History
```swift
class WorkoutHistoryCache {
    static let shared = WorkoutHistoryCache()

    // ROLLING WINDOW: Keep last 90 days
    func pruneOldWorkouts() async {
        let cutoffDate = Date().addingTimeInterval(-90 * 24 * 60 * 60)

        let context = modelContext
        let predicate = #Predicate<CachedWorkout> { workout in
            workout.startTime < cutoffDate
        }

        let descriptor = FetchDescriptor(predicate: predicate)
        let oldWorkouts = try? context.fetch(descriptor)

        oldWorkouts?.forEach { context.delete($0) }
        try? context.save()
    }

    // BACKGROUND SYNC: Incremental updates
    func syncWorkouts() async {
        guard let lastSync = UserDefaults.standard.object(forKey: "lastWorkoutSync") as? Date else {
            // First sync: Fetch last 30 days
            let workouts = try? await HevyAPIClient.shared.fetchRecentWorkouts(days: 30)
            workouts?.forEach { try? saveToCache($0) }
            UserDefaults.standard.set(Date(), forKey: "lastWorkoutSync")
            return
        }

        // Incremental sync using workout_events
        try? await HevyAPIClient.shared.syncWorkoutsSince(lastSync)
        UserDefaults.standard.set(Date(), forKey: "lastWorkoutSync")
    }
}
```

### 5.3 Offline Handling

#### Sync Queue
```swift
enum SyncOperation: Codable {
    case createWorkout(WorkoutData)
    case updateWorkout(String, WorkoutData)
    case finalizeWorkout(String, WorkoutData)
}

class SyncQueue {
    static let shared = SyncQueue()

    private let queueKey = "pendingSyncOperations"

    func enqueue(_ operation: SyncOperation) {
        var queue = loadQueue()
        queue.append(operation)
        saveQueue(queue)
    }

    func processPendingSync() async {
        guard hasNetworkConnection() else { return }

        let queue = loadQueue()

        for operation in queue {
            do {
                switch operation {
                case .createWorkout(let workout):
                    _ = try await HevyAPIClient.shared.createWorkout(workout)
                case .updateWorkout(let id, let workout):
                    _ = try await HevyAPIClient.shared.updateWorkout(id: id, workout: workout)
                case .finalizeWorkout(let id, let workout):
                    _ = try await HevyAPIClient.shared.updateWorkout(id: id, workout: workout)
                }

                // Remove from queue on success
                removeFromQueue(operation)

            } catch {
                print("❌ Sync failed: \(error)")
                // Keep in queue for retry
            }
        }
    }

    private func loadQueue() -> [SyncOperation] {
        guard let data = UserDefaults.standard.data(forKey: queueKey),
              let queue = try? JSONDecoder().decode([SyncOperation].self, from: data) else {
            return []
        }
        return queue
    }

    private func saveQueue(_ queue: [SyncOperation]) {
        if let data = try? JSONEncoder().encode(queue) {
            UserDefaults.standard.set(data, forKey: queueKey)
        }
    }
}
```

#### Network Monitoring
```swift
import Network

class NetworkMonitor {
    static let shared = NetworkMonitor()

    private let monitor = NWPathMonitor()
    private var isConnected = false

    func startMonitoring() {
        monitor.pathUpdateHandler = { [weak self] path in
            let wasDisconnected = !(self?.isConnected ?? true)
            self?.isConnected = path.status == .satisfied

            // When connection restored, process pending sync
            if wasDisconnected && self?.isConnected == true {
                Task {
                    await SyncQueue.shared.processPendingSync()
                }
            }
        }

        monitor.start(queue: DispatchQueue.global(qos: .background))
    }
}
```

#### Active Workout Protection
```swift
// Auto-save active workout to local storage every 30 seconds
class WorkoutAutoSave {
    static let shared = WorkoutAutoSave()

    private var saveTimer: Timer?

    func start(workoutState: WorkoutState) {
        saveTimer = Timer.scheduledTimer(withTimeInterval: 30.0, repeats: true) { [weak workoutState] _ in
            guard let state = workoutState else { return }

            // Save to UserDefaults as backup
            if let data = try? JSONEncoder().encode(state.toWorkoutData()) {
                UserDefaults.standard.set(data, forKey: "activeWorkoutBackup")
            }
        }
    }

    func stop() {
        saveTimer?.invalidate()
        saveTimer = nil
        UserDefaults.standard.removeObject(forKey: "activeWorkoutBackup")
    }

    func recoverActiveWorkout() -> WorkoutData? {
        guard let data = UserDefaults.standard.data(forKey: "activeWorkoutBackup"),
              let workout = try? JSONDecoder().decode(WorkoutData.self, from: data) else {
            return nil
        }
        return workout
    }
}
```

---

## 6. Implementation Priorities

### Phase 1: Read-Only Sync (Foundation)

**Goal:** Watch app can display exercise templates, routines, and workout history

**Tasks:**
1. ✅ Implement `fetchExerciseTemplates()` in HevyAPIClient (DONE)
2. Create CoreData models for exercise templates
3. Implement template cache with full-text search
4. Implement `fetchRoutines()` and `fetchRoutineDetail()`
5. Create CoreData models for routines
6. Implement routine cache (24-hour TTL)
7. Implement `fetchRecentWorkouts(days:)`
8. Create CoreData models for workout history
9. Implement workout history cache (90-day rolling window)
10. Add background sync task (daily)

**Milestone:** User can browse routines and see exercise history

**Estimated Time:** 1 week

---

### Phase 2: Active Workout Sync

**Goal:** Log workouts in real-time, sync to Hevy immediately

**Tasks:**
1. Implement `createWorkout()` in HevyAPIClient
2. Create workout when user starts routine
3. Store Hevy workout ID in WorkoutState
4. Implement `updateWorkout()` in HevyAPIClient
5. Sync workout after every set completion
6. Implement debounced sync (2-second delay)
7. Implement sync queue for offline scenarios
8. Finalize workout on end (update end_time)
9. Add network monitor to trigger pending sync
10. Implement auto-save backup (every 30 seconds)

**Milestone:** User can complete full workout, data syncs to Hevy in real-time

**Estimated Time:** 1 week

---

### Phase 3: Mid-Workout Modifications (Voice Power)

**Goal:** User can alter workout via voice (add/switch/skip exercises)

**Tasks:**
1. Implement "add exercise" voice command
2. Implement exercise fuzzy matching
3. Implement "switch exercise" voice command
4. Implement exercise replacement service (find equivalent)
5. Implement "skip exercise" voice command
6. Implement "reorder exercises" voice command
7. Update API sync to handle modified workouts
8. Add UI feedback for modifications
9. Test offline modifications + sync queue

**Milestone:** User can fully customize workout via voice

**Estimated Time:** 1 week

---

### Phase 4: Advanced Queries

**Goal:** User can query exercise history and performance during workouts

**Tasks:**
1. Implement "last time" query
2. Display last workout data on screen
3. Implement performance comparison query
4. Build comparison chart UI
5. Implement trend analysis query
6. Build progression chart UI
7. Implement exercise search query
8. Optimize local CoreData queries for speed
9. Add voice feedback for all queries

**Milestone:** User has full historical context during workouts

**Estimated Time:** 1 week

---

### Phase 5: Intelligent Suggestions

**Goal:** LLM provides context-aware suggestions based on history

**Tasks:**
1. Analyze workout patterns (routine adherence, skipped exercises)
2. Suggest progressive overload ("Try 102.5kg this time")
3. Suggest rest times based on history
4. Warn about deload needed (performance declining)
5. Suggest exercise alternatives (if gym equipment unavailable)
6. Auto-complete partial voice inputs ("bench" → "Barbell Bench Press")
7. Predict workout duration based on routine + rest times

**Milestone:** Watch app feels like an intelligent training partner

**Estimated Time:** 2 weeks

---

## 7. Data Flow Diagrams

### 7.1 Workout Start Flow

```
User selects routine
    ↓
Fetch latest routine from Hevy (or cache if fresh)
    ↓
Create WorkoutState from Routine
    ↓
POST /v1/workouts (create empty workout in Hevy)
    ↓
Store workout ID in WorkoutState
    ↓
Begin workout session (display first exercise)
```

**Swift Implementation:**
```swift
func startWorkout(routine: Routine) async throws {
    // 1. Create local workout state
    let workoutState = WorkoutState.fromRoutine(routine)

    // 2. Convert to Hevy format (empty sets)
    let workoutData = workoutState.toWorkoutData()

    // 3. POST to create workout in Hevy
    let createdWorkout = try await HevyAPIClient.shared.createWorkout(workoutData)

    // 4. Store Hevy ID
    workoutState.id = createdWorkout.id

    // 5. Start session
    WorkoutSession.shared.start(workoutState)

    // 6. Start auto-save
    WorkoutAutoSave.shared.start(workoutState: workoutState)
}
```

---

### 7.2 Set Logging Flow

```
User voice input: "100kg × 10 @ RPE 8"
    ↓
LLM parses: { weight: 100, reps: 10, rpe: 8 }
    ↓
Add set to WorkoutState (local)
    ↓
Display set on screen (immediate feedback)
    ↓
Schedule debounced PUT to Hevy (2 seconds)
    ↓
PUT /v1/workouts/{id} (full workout with new set)
    ↓
Update WorkoutState with response ID
    ↓
Haptic feedback (success)
```

**Swift Implementation:**
```swift
func didCompleteSet(exercise: String, weight: Double?, reps: Int?, rpe: Double?) async {
    // 1. Create completed set
    let set = CompletedSet(
        actualWeight: weight,
        actualReps: reps,
        actualRPE: rpe,
        timestamp: Date()
    )

    // 2. Update local state (immediate)
    workoutState.addCompletedSet(to: exercise, set: set)

    // 3. Haptic feedback
    WKInterfaceDevice.current().play(.success)

    // 4. Schedule sync (debounced)
    WorkoutSyncManager.shared.scheduleSync(workout: workoutState.toWorkoutData())
}
```

---

### 7.3 Add Exercise Flow

```
User voice: "Add pull-ups"
    ↓
LLM extracts: "pull-ups"
    ↓
Fuzzy match in local exercise template cache
    ↓
Find match: "Pull-Up (Bodyweight)" (id: ABC123)
    ↓
Ask user: "How many sets?"
    ↓
User: "3 sets"
    ↓
Add exercise to WorkoutState with 3 planned sets
    ↓
PUT /v1/workouts/{id} (full workout with new exercise)
    ↓
Voice feedback: "Pull-ups added. You can start when ready."
```

**Swift Implementation:**
```swift
func handleAddExercise(voice: String) async {
    // 1. Extract exercise name (LLM)
    let exerciseName = await LLMParser.shared.extractExerciseName(from: voice)

    // 2. Find template
    guard let template = await ExerciseTemplateCache.shared.search(query: exerciseName).first else {
        speak("Couldn't find \(exerciseName). Try again?")
        return
    }

    // 3. Ask for sets
    speak("How many sets of \(template.title)?")
    let setsCount = await VoiceInputManager.shared.listenForNumber()

    // 4. Add to workout
    let newExercise = WorkoutStateExercise(
        exerciseTemplateId: template.id,
        name: template.title,
        plannedSets: (0..<setsCount).map { _ in PlannedSet() },
        isFromRoutine: false
    )

    workoutState.exercises.append(newExercise)

    // 5. Sync to Hevy
    try? await HevyAPIClient.shared.updateWorkout(
        id: workoutState.id,
        workout: workoutState.toWorkoutData()
    )

    speak("\(template.title) added")
}
```

---

### 7.4 History Query Flow

```
User voice: "What did I do last time on bench press?"
    ↓
LLM extracts: "bench press", query type: "last workout"
    ↓
Match exercise: "Barbell Bench Press" (id: ABC123)
    ↓
Query local CoreData: workouts with exercise ABC123
    ↓
Find most recent workout (2024-10-20)
    ↓
Extract sets from that workout
    ↓
Voice response: "Last time was October 20th. You did 3 sets: 100kg × 10, 100kg × 9, 100kg × 8"
    ↓
Display on screen: Table of sets with weight/reps/RPE
```

**Swift Implementation:**
```swift
func handleHistoryQuery(voice: String) async {
    // 1. Parse query (LLM)
    guard let query = await LLMParser.shared.parseHistoryQuery(voice),
          let template = await ExerciseTemplateCache.shared.search(query: query.exerciseName).first else {
        speak("I couldn't understand that")
        return
    }

    // 2. Query local cache
    guard let lastWorkout = await WorkoutHistoryCache.shared.findLastWorkoutWith(
        exerciseId: template.id
    ) else {
        speak("You haven't done \(template.title) recently")
        return
    }

    // 3. Find exercise data
    guard let exercise = lastWorkout.exercises.first(where: {
        $0.exerciseTemplateId == template.id
    }) else {
        speak("No data found")
        return
    }

    // 4. Build response
    let dateString = lastWorkout.startTime.formatted(date: .abbreviated, time: .omitted)
    var response = "Last time was \(dateString). You did \(exercise.sets.count) sets: "

    for (i, set) in exercise.sets.enumerated() {
        if let weight = set.weightKg, let reps = set.reps {
            response += "\(weight)kg × \(reps)"
            if i < exercise.sets.count - 1 { response += ", " }
        }
    }

    speak(response)

    // 5. Display on screen
    displayExerciseHistory(template: template, workout: lastWorkout, sets: exercise.sets)
}
```

---

## 8. Out of Scope (Web UI)

The following features should **NOT** be implemented on the watch. They require complex UX better suited for web/mobile:

### Creating Routines

**Why Not Watch:**
- Requires browsing full exercise library (435+ exercises)
- Selecting multiple exercises with specific order
- Setting target weights/reps for each set
- Organizing into superset groups
- Adding detailed notes

**Where to Do It:** Hevy web app or mobile app

**Watch Role:** Execute routines created elsewhere

---

### Creating Custom Exercises

**Why Not Watch:**
- Limited number of custom exercises per account (API enforces limit)
- Requires selecting muscle groups, equipment, exercise type
- Text input cumbersome on watch

**Where to Do It:** Hevy mobile app

**Watch Role:** Access custom exercises via synced template cache

---

### Editing Routine Templates

**Why Not Watch:**
- Routines can be complex (10+ exercises, 50+ sets)
- Changing order, removing exercises, adjusting targets
- Modifying superset groupings

**Where to Do It:** Hevy web/mobile

**Watch Role:** Re-fetch routine before workout start (to get latest changes)

---

### Bulk Workout Edits

**Why Not Watch:**
- Editing past workouts (correcting mistakes)
- Deleting workouts
- Merging workouts

**Where to Do It:** Hevy web/mobile

**Watch Role:** Accept updates via incremental sync (workout_events endpoint)

---

### Complex Analytics

**Why Not Watch:**
- Volume tracking over time
- Personal records (PRs) across all exercises
- Body measurements, weight tracking
- Workout calendar view

**Where to Do It:** Hevy web/mobile

**Watch Role:** Provide simple queries during workouts ("last time" data)

---

### Social Features

**Why Not Watch:**
- Liking/commenting on others' workouts
- Following athletes
- Sharing workouts

**Where to Do It:** Hevy mobile app

**Watch Role:** None (not relevant during workout)

---

## 9. Technical Considerations

### 9.1 API Rate Limits

**Unknown Limits:**
- Hevy API documentation doesn't specify rate limits
- Assume conservative limit: 60 requests/minute

**Mitigation Strategies:**

1. **Batch Reads:** Fetch max page size (100 for templates, 10 for workouts)
2. **Debounce Writes:** Wait 2 seconds between workout updates
3. **Cache Aggressively:** Only refresh templates weekly
4. **Incremental Sync:** Use workout_events instead of fetching all workouts
5. **Exponential Backoff:** On 429 errors, retry with increasing delay

```swift
func retryWithBackoff<T>(maxAttempts: Int = 3, operation: () async throws -> T) async throws -> T {
    var attempt = 0
    var delay: TimeInterval = 1.0

    while attempt < maxAttempts {
        do {
            return try await operation()
        } catch let error as HevyAPIError {
            if case .httpError(429, _) = error {
                attempt += 1
                if attempt >= maxAttempts { throw error }

                try await Task.sleep(nanoseconds: UInt64(delay * 1_000_000_000))
                delay *= 2  // Exponential backoff
            } else {
                throw error
            }
        }
    }

    throw HevyAPIError.networkError(NSError(domain: "Max retries exceeded", code: 429))
}
```

---

### 9.2 Battery Impact

**Concerns:**
- Network requests every 2-3 minutes (set completion)
- Background sync tasks
- Voice processing (continuous listening)

**Optimizations:**

1. **Debounce Network Calls:** Wait 2 seconds after set completion
2. **Batch Updates:** If user logs 3 sets rapidly, send 1 PUT instead of 3
3. **Conservative Background Tasks:** Only sync once per 24 hours
4. **Cellular Awareness:** Prefer WiFi, but don't fail if only LTE available
5. **Screen Off = Minimal Activity:** Pause non-critical operations when screen off

```swift
// Battery-efficient sync configuration
let config = URLSessionConfiguration.default
config.timeoutIntervalForRequest = 30
config.waitsForConnectivity = true
config.allowsCellularAccess = true
config.allowsExpensiveNetworkAccess = false  // Avoid cellular unless necessary
config.allowsConstrainedNetworkAccess = true
```

---

### 9.3 Data Consistency

**Hevy as Source of Truth:**
- Watch never modifies historical workouts (read-only)
- Watch only writes active workout (authoritative during session)
- Routines read-only on watch (edited on web/mobile)

**Conflict Resolution:**

| Scenario | Resolution |
|----------|-----------|
| User edits routine on web during workout | Watch continues with cached version, next workout gets updated routine |
| User edits past workout on web | Background sync updates local cache via workout_events |
| Watch creates workout, user deletes on web | Background sync removes from cache |
| Network failure during active workout | Queue locally, sync when connection restored |
| Watch crashes mid-workout | Auto-save backup recovers workout, syncs to Hevy on restart |

**No Merging Required:**
- Active workout: Watch writes, Hevy accepts
- Historical workouts: Hevy writes, watch reads
- Routines: Hevy writes, watch reads

---

### 9.4 Data Privacy

**Hevy API Privacy:**
- User can mark workouts as private (`is_private: true`)
- Private workouts don't appear in social feed
- API key required for all requests (user authentication)

**Watch App Privacy:**
- All data stored locally in CoreData (sandboxed app container)
- API key stored in Keychain (secure storage)
- No data shared with third parties
- User can clear local cache from settings

---

### 9.5 Error Handling

**Network Errors:**
- Display user-friendly message ("Connection lost. Continuing offline.")
- Queue sync operations for retry
- Don't block workout logging (offline mode)

**API Errors:**
```swift
enum HevyAPIError: Error {
    case notConfigured              // No API key
    case invalidURL                 // Malformed URL
    case httpError(Int, String?)    // HTTP error
    case decodingError(Error)       // JSON parsing failed
    case networkError(Error)        // Network request failed
    case invalidResponse            // Not HTTPURLResponse
}
```

**User-Facing Messages:**
```swift
func userFriendlyError(_ error: HevyAPIError) -> String {
    switch error {
    case .notConfigured:
        return "API key not configured. Check settings."
    case .invalidURL:
        return "Internal error. Please contact support."
    case .httpError(401, _):
        return "Invalid API key. Check settings."
    case .httpError(404, _):
        return "Workout not found."
    case .httpError(429, _):
        return "Too many requests. Try again in a minute."
    case .httpError(let code, _):
        return "Server error (\(code)). Try again later."
    case .decodingError:
        return "Invalid response from server."
    case .networkError:
        return "Connection lost. Changes saved locally."
    case .invalidResponse:
        return "Invalid response from server."
    }
}
```

---

## 10. Testing Strategy

### 10.1 Unit Tests

**Exercise Template Matching:**
```swift
func testFuzzyMatchExercise() async {
    let matcher = ExerciseTemplateMatcher.shared

    // Exact match
    let result1 = await matcher.findExercise(named: "Barbell Bench Press")
    XCTAssertEqual(result1?.title, "Barbell Bench Press")

    // Partial match
    let result2 = await matcher.findExercise(named: "bench")
    XCTAssertEqual(result2?.title, "Barbell Bench Press")

    // Fuzzy match (typo)
    let result3 = await matcher.findExercise(named: "benc press")
    XCTAssertEqual(result3?.title, "Barbell Bench Press")
}
```

**Sync Queue:**
```swift
func testSyncQueuePersistence() {
    let queue = SyncQueue.shared

    let workout = WorkoutData(/* ... */)
    queue.enqueue(.createWorkout(workout))

    // Simulate app restart
    let loadedQueue = queue.loadQueue()

    XCTAssertEqual(loadedQueue.count, 1)
    if case .createWorkout(let loaded) = loadedQueue.first {
        XCTAssertEqual(loaded.id, workout.id)
    }
}
```

---

### 10.2 Integration Tests

**End-to-End Workout:**
```swift
func testCompleteWorkout() async throws {
    // 1. Start workout
    let routine = try await HevyAPIClient.shared.fetchRoutineDetail(id: testRoutineId)
    let workoutState = WorkoutState.fromRoutine(routine)
    let createdWorkout = try await HevyAPIClient.shared.createWorkout(workoutState.toWorkoutData())

    // 2. Log sets
    let set1 = CompletedSet(actualWeight: 100, actualReps: 10)
    workoutState.addCompletedSet(to: routine.exercises.first!.exerciseTemplateId, set: set1)

    // 3. Sync to Hevy
    _ = try await HevyAPIClient.shared.updateWorkout(id: createdWorkout.id, workout: workoutState.toWorkoutData())

    // 4. Verify on Hevy
    let fetched = try await HevyAPIClient.shared.fetchWorkout(id: createdWorkout.id)
    XCTAssertEqual(fetched.exercises.first?.sets.count, 1)
    XCTAssertEqual(fetched.exercises.first?.sets.first?.weightKg, 100)
}
```

---

### 10.3 Manual Testing Checklist

**Offline Scenario:**
- [ ] Start workout while offline
- [ ] Log 3 sets
- [ ] Verify data saved locally
- [ ] Reconnect to network
- [ ] Verify data synced to Hevy

**Voice Commands:**
- [ ] "Add pull-ups" → Exercise added
- [ ] "Switch to dumbbell press" → Exercise replaced
- [ ] "Skip this" → Exercise marked complete
- [ ] "What did I do last time on bench press?" → Historical data displayed

**Background Sync:**
- [ ] Create workout on mobile app
- [ ] Wait 24 hours (or trigger manually)
- [ ] Verify workout appears in watch app history

---

## Appendix: API Quick Reference

### Base URL
```
https://api.hevyapp.com/v1
```

### Authentication
```
Header: api-key: YOUR_API_KEY
```

### Key Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/exercise_templates` | Fetch exercise library |
| GET | `/routines` | List user's routines |
| GET | `/routines/{id}` | Get routine details |
| GET | `/workouts` | List past workouts |
| GET | `/workouts/{id}` | Get workout details |
| GET | `/workout_events` | Incremental sync |
| POST | `/workouts` | Create new workout |
| PUT | `/workouts/{id}` | Update workout |
| GET | `/exercise_history/{id}` | Exercise-specific history |

### Critical Notes
1. **Request Wrapping:** POST/PUT requests must wrap payload in `"workout"` key
2. **Response Format:** POST/PUT responses return `"workout"` as ARRAY
3. **Date Format:** ISO 8601 (e.g., `2024-10-20T10:00:00Z`)
4. **Key Strategy:** Use `convertFromSnakeCase` for decoding
5. **RPE Values:** Must be `null` or `6-10` in 0.5 increments

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-10-24 | Initial comprehensive sync strategy |

---

**END OF DOCUMENT**
