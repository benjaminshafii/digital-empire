# Hevy API Reference & Integration Guide

**API Version:** 0.0.1
**Base URL:** `https://api.hevyapp.com/v1`
**Authentication:** API Key (Header: `api-key`)
**Format:** JSON
**Date Format:** ISO 8601 (e.g., `2024-08-14T12:00:00Z`)

---

## Quick Reference

### Common Issues & Solutions

#### ❌ Issue: `HTTP 400: {"error":"\"workout\" is required"}`
**Cause:** Request body not wrapped in required key
**Solution:** Wrap payload in `"workout"` key for POST/PUT requests

**Wrong:**
```json
{
  "title": "My Workout",
  "start_time": "2024-08-14T12:00:00Z",
  ...
}
```

**Correct:**
```json
{
  "workout": {
    "title": "My Workout",
    "start_time": "2024-08-14T12:00:00Z",
    ...
  }
}
```

#### ❌ Issue: `Failed to decode response: The data couldn't be read because it isn't in the correct format`
**Cause:** POST/PUT responses return `"workout"` as an ARRAY, not a single object
**Solution:** Decode response as `{"workout": [WorkoutData]}` and extract first element

**Response format (CRITICAL):**
```json
{
  "workout": [  // <-- IT'S AN ARRAY!
    {
      "id": "...",
      "title": "...",
      ...
    }
  ]
}
```

**Swift implementation:**
```swift
struct WorkoutResponse: Codable {
    let workout: [WorkoutData]  // Array, not single object!
}

// Extract first element
let response = try decoder.decode(WorkoutResponse.self, from: data)
guard let workout = response.workout.first else { throw error }
```

#### ❌ Issue: `Invalid rpe for set: 3 must be null or 6, 7, 7.5, 8, 8.5, 9, 9.5, 10`
**Cause:** RPE value outside accepted range
**Solution:** Clamp RPE values to 6-10 range, round to nearest 0.5

**Valid RPE values:** `null`, `6`, `6.5`, `7`, `7.5`, `8`, `8.5`, `9`, `9.5`, `10`

**Swift normalization:**
```swift
func normalizeRPE(_ rpe: Double?) -> Double? {
    guard let rpe = rpe else { return nil }
    if rpe < 6 { return 6 }
    if rpe > 10 { return 10 }
    return (rpe * 2).rounded() / 2  // Round to nearest 0.5
}
```

#### ❌ Issue: Date format mismatch in responses
**Cause:** Request dates have fractional seconds, response dates don't
**Solution:** Use flexible date parsing that handles both formats

**We send (with fractional seconds):**
```json
"start_time": "2025-10-23T02:24:25.739Z"
```

**API returns (without fractional seconds):**
```json
"start_time": "2025-10-23T02:24:25+00:00"
```

**Swift flexible parsing:**
```swift
extension ISO8601DateFormatter {
    static let hevyFormatter: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter
    }()

    static let hevyResponseFormatter: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime]
        return formatter
    }()

    static func parseHevyDate(_ string: String) -> Date? {
        return hevyFormatter.date(from: string) ?? hevyResponseFormatter.date(from: string)
    }
}
```

---

## Authentication

All requests require an API key in the header:

```
api-key: $HEVY_API_KEY
```

**How to get API key:**
1. Requires Hevy PRO subscription
2. Visit https://hevy.com/settings?developer
3. Copy your API key
4. Store it in environment variable `HEVY_API_KEY`

---

## Workouts API

### POST `/v1/workouts` - Create Workout

**Request Format:**
```json
{
  "workout": {
    "title": "Friday Leg Day 🔥",
    "description": "Medium intensity leg day focusing on quads.",
    "start_time": "2024-08-14T12:00:00Z",
    "end_time": "2024-08-14T12:30:00Z",
    "routine_id": "b459cba5-cd6d-463c-abd6-54f8eafcadcb",  // Optional
    "is_private": false,
    "exercises": [
      {
        "exercise_template_id": "D04AC939",
        "superset_id": null,
        "notes": "Felt good today. Form was on point.",
        "sets": [
          {
            "type": "normal",         // "warmup" | "normal" | "failure" | "dropset"
            "weight_kg": 100,
            "reps": 10,
            "distance_meters": null,
            "duration_seconds": null,
            "custom_metric": null,
            "rpe": null              // Rate of Perceived Exertion (6-10 scale)
          }
        ]
      }
    ]
  }
}
```

**Response (201 Created):**
```json
{
  "workout": [  // ⚠️ ARRAY with 1 element, not a single object!
    {
      "id": "ef4ab297-7c27-41ed-897c-96cc8857469a",
      "title": "Friday Leg Day 🔥",
      "routine_id": null,
      "description": "Medium intensity leg day focusing on quads.",
      "start_time": "2024-08-14T12:00:00+00:00",
      "end_time": "2024-08-14T12:30:00+00:00",
      "updated_at": "2025-10-23T01:44:48.340Z",
      "created_at": "2025-10-23T01:44:48.340Z",
      "exercises": [...]
    }
  ]
}
```

**Key Points:**
- ✅ Request body **must** be wrapped in `"workout"` key
- ⚠️ Response `"workout"` is an **ARRAY**, not a single object! Extract `.first` element
- ✅ `start_time` and `end_time` are **required**
- ✅ Exercises array is **required** (must have at least 1 exercise)
- ✅ Each exercise must have at least 1 set
- ✅ RPE values must be null or 6-10 (in 0.5 increments)

---

### PUT `/v1/workouts/{workoutId}` - Update Workout

**Request Format:**
```json
{
  "workout": {
    "title": "Friday Leg Day 🔥 (Updated)",
    "description": "Medium intensity leg day focusing on quads.",
    "start_time": "2024-08-14T12:00:00Z",
    "end_time": "2024-08-14T12:30:00Z",
    "is_private": false,
    "exercises": [...]  // Complete updated exercises list
  }
}
```

**Response (200 OK):**
```json
{
  "workout": [  // ⚠️ ARRAY with 1 element, not a single object!
    {
      "id": "ef4ab297-7c27-41ed-897c-96cc8857469a",
      ...
    }
  ]
}
```

**Key Points:**
- ✅ Must include **all** exercises (replaces entire workout)
- ✅ Cannot change `workout_id` (it's in the URL path)
- ✅ Request body wrapped in `"workout"` key
- ⚠️ Response `"workout"` is an **ARRAY**, not a single object! Extract `.first` element

---

### GET `/v1/workouts` - List Workouts

**Request:**
```
GET /v1/workouts?page=1&pageSize=5
Headers:
  api-key: {your-key}
  Content-Type: application/json
```

**Response:**
```json
{
  "page": 1,
  "page_count": 42,
  "workouts": [
    {
      "id": "...",
      "title": "...",
      ...
    }
  ]
}
```

**Key Points:**
- ✅ Default page size: 5
- ✅ Max page size: 10
- ✅ Returns array of workouts (not wrapped in individual keys)

---

### GET `/v1/workouts/{workoutId}` - Get Single Workout

**Response:**
```json
{
  "workout": {
    "id": "...",
    "title": "...",
    "exercises": [...]
  }
}
```

**Key Points:**
- ✅ Response **is** wrapped in `"workout"` key
- ✅ Includes full exercise details

---

### GET `/v1/workouts/count` - Get Workout Count

**Response:**
```json
{
  "workout_count": 123
}
```

---

### GET `/v1/workouts/events` - Get Workout Events

Track changes to workouts since a specific date.

**Request:**
```
GET /v1/workouts/events?since=1970-01-01T00:00:00Z&page=1&pageSize=5
```

**Response:**
```json
{
  "page": 1,
  "page_count": 5,
  "workout_events": [
    {
      "type": "updated",
      "event_timestamp": "2024-08-15T10:30:00Z",
      "workout": { ... }
    },
    {
      "type": "deleted",
      "event_timestamp": "2024-08-15T09:00:00Z",
      "workout_id": "abc123"
    }
  ]
}
```

**Key Points:**
- ✅ Use for syncing local cache
- ✅ Events ordered newest to oldest
- ✅ Types: `"updated"` or `"deleted"`

---

## Routines API

### POST `/v1/routines` - Create Routine

**Request Format:**
```json
{
  "routine": {
    "title": "Push Day A",
    "notes": "Focus on progressive overload",
    "folder_id": null,  // Optional routine folder ID
    "exercises": [
      {
        "exercise_template_id": "D04AC939",
        "superset_id": null,
        "notes": "Control the eccentric",
        "rest_seconds": 120,
        "sets": [
          {
            "type": "warmup",
            "weight_kg": 60,
            "reps": 10,
            "distance_meters": null,
            "duration_seconds": null,
            "custom_metric": null
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
  "routine": {
    "id": "b459cba5-cd6d-463c-abd6-54f8eafcadcb",
    "title": "Push Day A",
    ...
  }
}
```

**Key Points:**
- ✅ Request wrapped in `"routine"` key
- ✅ Response wrapped in `"routine"` key
- ✅ Sets in routines are **targets** (not actual performance)

---

### GET `/v1/routines` - List Routines

**Response:**
```json
{
  "page": 1,
  "page_count": 3,
  "routines": [...]
}
```

---

### GET `/v1/routines/{routineId}` - Get Single Routine

**Response:**
```json
{
  "routine": {
    "id": "...",
    "title": "...",
    "exercises": [...]
  }
}
```

---

### PUT `/v1/routines/{routineId}` - Update Routine

**Request:**
```json
{
  "routine": {
    "title": "Push Day A (Updated)",
    "exercises": [...]  // Complete updated list
  }
}
```

---

## Exercise Templates API

### GET `/v1/exercise_templates` - List Exercise Templates

**Request:**
```
GET /v1/exercise_templates?page=1&pageSize=100
```

**Response:**
```json
{
  "page": 1,
  "page_count": 87,
  "exercise_templates": [
    {
      "id": "3BC06AD3",
      "title": "21s Bicep Curl",
      "type": "weight_reps",
      "primary_muscle_group": "biceps",
      "secondary_muscle_groups": [],
      "equipment": "barbell",
      "is_custom": false
    }
  ]
}
```

**Exercise Types:**
- `weight_reps` - Weight and reps (e.g., bench press)
- `reps_only` - Bodyweight (e.g., push-ups)
- `duration` - Time-based (e.g., plank)
- `weight_duration` - Weight and time (e.g., farmer's walk)
- `distance_duration` - Distance and time (e.g., running)

**Equipment Categories:**
- `barbell`, `dumbbell`, `cable`, `machine`, `bodyweight`
- `kettlebell`, `band`, `medicine_ball`, `other`, `none`

**Key Points:**
- ✅ Max page size: 100 (vs 10 for workouts/routines)
- ✅ Includes both default and custom exercises
- ✅ Use `is_custom: true` to identify user-created exercises

---

### GET `/v1/exercise_templates/{exerciseTemplateId}` - Get Single Exercise

**Response:**
```json
{
  "id": "3BC06AD3",
  "title": "21s Bicep Curl",
  "type": "weight_reps",
  "primary_muscle_group": "biceps",
  "secondary_muscle_groups": ["forearms"],
  "equipment": "barbell",
  "is_custom": false
}
```

---

### POST `/v1/exercise_templates` - Create Custom Exercise

**Request:**
```json
{
  "exercise": {
    "title": "Custom Cable Fly Variation",
    "exercise_type": "weight_reps",
    "equipment_category": "cable",
    "muscle_group": "chest",
    "other_muscles": ["shoulders", "triceps"]
  }
}
```

**Response:**
```json
{
  "id": "d646f8eb-b5ec-41f9-8271-fee3f073b49d"
}
```

**Key Points:**
- ✅ Request wrapped in `"exercise"` key
- ✅ Limited number of custom exercises per account
- ❌ Error 403 if limit exceeded: `{"error": "exceeds-custom-exercise-limit"}`

---

## Exercise History API

### GET `/v1/exercise_history/{exerciseTemplateId}` - Get Exercise History

**Request:**
```
GET /v1/exercise_history/D04AC939?page=1&pageSize=10
```

**Response:**
```json
{
  "page": 1,
  "page_count": 5,
  "exercise_history": [
    {
      "workout_id": "abc123",
      "workout_title": "Leg Day",
      "workout_date": "2024-08-14T12:00:00Z",
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

**Key Points:**
- ✅ Shows historical performance for specific exercise
- ✅ Useful for tracking progress and volume
- ✅ Max page size: 10

---

## Routine Folders API

### GET `/v1/routine_folders` - List Folders

**Response:**
```json
{
  "page": 1,
  "page_count": 1,
  "routine_folders": [
    {
      "id": 1,
      "name": "Strength Training",
      "index": 0,
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

---

### POST `/v1/routine_folders` - Create Folder

**Request:**
```json
{
  "folder": {
    "name": "Hypertrophy Programs"
  }
}
```

**Response:**
```json
{
  "id": 2,
  "name": "Hypertrophy Programs",
  "index": 0
}
```

**Key Points:**
- ✅ New folder created at index 0
- ✅ All other folders' indexes incremented

---

### GET `/v1/routine_folders/{folderId}` - Get Folder

**Response:**
```json
{
  "id": 1,
  "name": "Strength Training",
  "index": 0,
  "created_at": "2024-01-01T00:00:00Z",
  "routines": [...]  // Array of routine IDs in this folder
}
```

---

## Webhooks API

### POST `/v1/webhook-subscription` - Create Webhook

**Request:**
```json
{
  "url": "https://myapp.com/hevy-webhook",
  "auth_token": "my-secret-token"  // Optional
}
```

**Response:**
```json
{
  "url": "https://myapp.com/hevy-webhook",
  "auth_token": "my-secret-token"
}
```

**Webhook Payload (when workout created):**
```json
{
  "event": "workout.created",
  "timestamp": "2024-08-14T12:30:00Z",
  "workout": { ... }
}
```

**Key Points:**
- ✅ Webhook URL must respond with 200 OK within 5 seconds
- ✅ Auth token sent as `Authorization` header if provided
- ✅ Currently supports: `workout.created` events

---

### GET `/v1/webhook-subscription` - Get Current Webhook

**Response:**
```json
{
  "url": "https://myapp.com/hevy-webhook",
  "auth_token": "my-secret-token"
}
```

---

### DELETE `/v1/webhook-subscription` - Delete Webhook

**Response:**
```
204 No Content
```

---

## Data Models

### Workout

```typescript
{
  id: string (UUID),
  title: string,
  routine_id: string | null,
  description: string | null,
  start_time: string (ISO 8601),
  end_time: string (ISO 8601),
  is_private: boolean,
  updated_at: string (ISO 8601),
  created_at: string (ISO 8601),
  exercises: Exercise[]
}
```

### Exercise (in Workout)

```typescript
{
  index: number,
  title: string,
  notes: string | null,
  exercise_template_id: string,
  superset_id: number | null,
  sets: Set[]
}
```

### Set

```typescript
{
  index: number,
  type: "warmup" | "normal" | "failure" | "dropset",
  weight_kg: number | null,
  reps: number | null,
  distance_meters: number | null,
  duration_seconds: number | null,
  rpe: number | null,        // 6-10 scale
  custom_metric: number | null
}
```

### Routine

```typescript
{
  id: string (UUID),
  title: string,
  folder_id: number | null,
  notes: string | null,
  updated_at: string (ISO 8601),
  created_at: string (ISO 8601),
  exercises: RoutineExercise[]
}
```

### Routine Exercise

```typescript
{
  index: number,
  title: string,
  notes: string | null,
  exercise_template_id: string,
  superset_id: number | null,
  rest_seconds: number | null,
  sets: RoutineSet[]
}
```

### Exercise Template

```typescript
{
  id: string,
  title: string,
  type: "weight_reps" | "reps_only" | "duration" | "weight_duration" | "distance_duration",
  primary_muscle_group: string,
  secondary_muscle_groups: string[],
  equipment: string,
  is_custom: boolean
}
```

---

## Common Patterns

### Pattern 1: Create Workout from Scratch

```swift
let workout = WorkoutData(
    title: "My Workout",
    startTime: Date(),
    endTime: Date().addingTimeInterval(3600), // 1 hour later
    exercises: [
        WorkoutExercise(
            exerciseTemplateId: "D04AC939",
            sets: [
                WorkoutSet(
                    type: .normal,
                    weightKg: 100,
                    reps: 10,
                    rpe: 8.0
                )
            ],
            notes: "Felt strong today"
        )
    ],
    description: "Logged via phoneless-hevy",
    isPrivate: false
)

// Wrap in "workout" key
let requestBody = ["workout": workout]
let jsonData = try encoder.encode(requestBody)

// Send POST to /v1/workouts
```

---

### Pattern 2: Update Existing Workout

```swift
// 1. Fetch current workout
let current = try await api.getWorkout(id: workoutId)

// 2. Modify it
var updated = current
updated.exercises.append(newExercise)

// 3. Send PUT with complete workout
let requestBody = ["workout": updated]
let jsonData = try encoder.encode(requestBody)

// Send PUT to /v1/workouts/{workoutId}
```

---

### Pattern 3: Start Workout from Routine

```swift
// 1. Fetch routine
let routine = try await api.getRoutine(id: routineId)

// 2. Convert routine sets to workout sets (as user completes them)
let workoutExercises = routine.exercises.map { routineEx in
    WorkoutExercise(
        exerciseTemplateId: routineEx.exerciseTemplateId,
        sets: [],  // Empty - user will log sets as they go
        notes: routineEx.notes
    )
}

// 3. Create workout with routine_id reference
let workout = WorkoutData(
    title: routine.title,
    startTime: Date(),
    endTime: Date(),  // Update when workout ends
    exercises: workoutExercises,
    description: "From routine: \(routine.title)",
    isPrivate: false
)

// Include routine_id in the initial POST if desired
```

---

## Error Handling

### Common HTTP Status Codes

| Code | Meaning | Common Cause |
|------|---------|--------------|
| 200 | OK | Successful GET/PUT |
| 201 | Created | Successful POST |
| 204 | No Content | Successful DELETE |
| 400 | Bad Request | Missing required field, invalid JSON |
| 401 | Unauthorized | Invalid API key |
| 403 | Forbidden | Exceeds limits (e.g., custom exercises) |
| 404 | Not Found | Invalid workout/routine/exercise ID |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Hevy server issue |

### Error Response Format

```json
{
  "error": "\"workout\" is required"
}
```

or

```json
{
  "error": "exceeds-custom-exercise-limit"
}
```

---

## Rate Limiting

**Not officially documented**, but recommended practice:
- Max 60 requests per minute per API key
- Cache exercise templates (they rarely change)
- Batch workout fetches using pagination
- Use webhooks instead of polling for new workouts

---

## Best Practices

### ✅ DO

1. **Wrap request bodies correctly**
   - POST/PUT workouts: `{"workout": {...}}`
   - POST/PUT routines: `{"routine": {...}}`
   - POST folders: `{"folder": {...}}`

2. **Use ISO 8601 dates**
   ```swift
   let formatter = ISO8601DateFormatter()
   formatter.formatOptions = [.withInternetDateTime]
   let dateString = formatter.string(from: date)
   ```

3. **Cache exercise templates**
   - Fetch once on app launch
   - Store locally
   - They rarely change

4. **Include descriptions**
   - Help identify workouts logged from your app
   - Example: `"Logged via phoneless-hevy"`

5. **Handle errors gracefully**
   - Parse error messages
   - Show user-friendly error text
   - Retry on 429/500 errors

### ❌ DON'T

1. **Don't forget wrapper keys**
   - Most common error: `{"error":"\"workout\" is required"}`

2. **Don't send partial updates**
   - PUT replaces entire workout/routine
   - Must include all exercises and sets

3. **Don't hardcode exercise IDs**
   - Fetch from `/exercise_templates`
   - IDs may differ between accounts for custom exercises

4. **Don't poll excessively**
   - Use webhooks when possible
   - Cache aggressively
   - Implement exponential backoff

5. **Don't ignore response structure**
   - Single items: `{"workout": {...}}`
   - Lists: `{"workouts": [...]}`
   - Count: `{"workout_count": 123}`

---

## Swift Implementation Reference

### Encoder Configuration

```swift
let encoder = JSONEncoder()
encoder.dateEncodingStrategy = .iso8601
encoder.keyEncodingStrategy = .convertToSnakeCase
```

### Decoder Configuration

```swift
let decoder = JSONDecoder()
decoder.dateDecodingStrategy = .iso8601
decoder.keyDecodingStrategy = .convertFromSnakeCase
```

### Request Wrapper Helper

```swift
struct WorkoutRequest: Encodable {
    let workout: WorkoutData
}

struct RoutineRequest: Encodable {
    let routine: Routine
}

// Usage
let requestBody = WorkoutRequest(workout: myWorkout)
let jsonData = try encoder.encode(requestBody)
```

### Response Wrapper Helper

```swift
struct WorkoutResponse: Decodable {
    let workout: WorkoutData?
}

struct WorkoutsListResponse: Decodable {
    let page: Int
    let pageCount: Int
    let workouts: [WorkoutData]

    enum CodingKeys: String, CodingKey {
        case page
        case pageCount = "page_count"
        case workouts
    }
}

// Usage
let response = try decoder.decode(WorkoutResponse.self, from: data)
guard let workout = response.workout else {
    throw Error.missingWorkout
}
```

---

## Testing Tips

### Use Hevy API Playground

1. Go to https://api.hevyapp.com/docs
2. Click "Try it out" on any endpoint
3. Enter your API key
4. Test requests and see exact JSON format

### Test with Curl

```bash
# Create workout
curl -X POST 'https://api.hevyapp.com/v1/workouts' \
  -H 'api-key: YOUR-KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "workout": {
      "title": "Test Workout",
      "start_time": "2024-08-14T12:00:00Z",
      "end_time": "2024-08-14T12:30:00Z",
      "is_private": false,
      "exercises": [{
        "exercise_template_id": "D04AC939",
        "sets": [{
          "type": "normal",
          "weight_kg": 100,
          "reps": 10
        }]
      }]
    }
  }'
```

---

## Changelog & Migration Notes

### Fixed in phoneless-hevy

**Issue:** `HTTP 400: {"error":"\"workout\" is required"}`

**Root Cause:**
```swift
// ❌ WRONG - sends workout directly
let jsonData = try encoder.encode(workout)
```

**Fix:**
```swift
// ✅ CORRECT - wraps in "workout" key
let requestBody = ["workout": workout]
let jsonData = try encoder.encode(requestBody)
```

**Applied to:**
- `createWorkout()` - HevyAPIClient.swift:172
- `updateWorkout()` - HevyAPIClient.swift:236

**Also fixed response decoding:**
```swift
// Response also wrapped
let response = try decoder.decode(WorkoutResponse.self, from: data)
guard let workout = response.workout else { throw Error }
```

---

## Quick Troubleshooting

| Error | Check This |
|-------|------------|
| `"workout" is required` | Wrap request in `{"workout": {...}}` |
| `401 Unauthorized` | Verify API key in header |
| `404 Not Found` | Check UUID format, verify ID exists |
| `400 Bad Request` | Validate all required fields present |
| Dates parsing wrong | Use ISO 8601 format with `Z` suffix |
| Exercise not found | Fetch valid IDs from `/exercise_templates` |
| Workout incomplete | Include at least 1 exercise with 1 set |

---

## Resources

- **API Docs:** https://api.hevyapp.com/docs
- **Web Settings:** https://hevy.com/settings?developer
- **Support Email:** pedro@hevyapp.com
- **Hevy App:** https://www.hevyapp.com

---

**Document Version:** 1.0
**Last Updated:** 2025-10-22
**Author:** Based on Hevy API v0.0.1 (OAS 3.0)
