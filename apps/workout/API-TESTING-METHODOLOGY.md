# Hevy API Testing Methodology

**Created:** October 22, 2025
**Purpose:** Document how to test and verify Hevy API responses using curl

---

## 🎯 Why Test with curl?

**Don't rely solely on:**
- ❌ MCP tools (may abstract or transform data)
- ❌ Documentation (may be outdated)
- ❌ Assumptions (API changes without notice)

**Instead:**
- ✅ **Test the actual API directly** with curl
- ✅ **Verify exact response format** with real data
- ✅ **Extract all possible enum values** from production data
- ✅ **Document findings** for future reference

---

## 📡 Testing Exercise Templates

### Fetch Single Page

```bash
curl -s -X GET \
  'https://api.hevyapp.com/v1/exercise_templates?page=1&pageSize=10' \
  -H 'api-key: YOUR_API_KEY' \
  -H 'Content-Type: application/json' \
  | python3 -m json.tool
```

### Extract All Unique Exercise Types

```bash
# Fetch all pages (adjust based on page_count from first request)
for i in {1..5}; do
  curl -s -X GET \
    "https://api.hevyapp.com/v1/exercise_templates?page=$i&pageSize=100" \
    -H 'api-key: YOUR_API_KEY' \
    > /tmp/ex_p$i.json
done

# Extract unique types
python3 -c "
import json
all_types = set()
for i in range(1, 6):
    with open(f'/tmp/ex_p{i}.json') as f:
        data = json.load(f)
        for ex in data['exercise_templates']:
            all_types.add(ex['type'])
for t in sorted(all_types):
    print(t)
"
```

### Results (2025-10-22)

**Tested:** 435 exercise templates across 5 pages

**Exercise Types Found (10 total):**
```
bodyweight_assisted
bodyweight_weighted
distance_duration
duration
floors_duration
reps_only
short_distance_weight
steps_duration
weight_duration
weight_reps
```

**Equipment Values Found (9 total):**
```
barbell
dumbbell
kettlebell
machine
none
other
plate
resistance_band
suspension
```

---

## 📋 Testing Routines

### Fetch Routines

```bash
curl -s -X GET \
  'https://api.hevyapp.com/v1/routines?page=1&pageSize=5' \
  -H 'api-key: YOUR_API_KEY' \
  | python3 -m json.tool
```

### Response Structure (Verified)

```json
{
  "page": 1,
  "page_count": 2,
  "routines": [
    {
      "id": "uuid",
      "title": "Push Day",
      "folder_id": 123456,
      "updated_at": "2024-09-09T08:48:24.563Z",
      "created_at": "2024-06-30T20:51:44.563Z",
      "exercises": [
        {
          "index": 0,
          "title": "Bench Press",
          "notes": "4x5-8 @RPE 8",
          "exercise_template_id": "ABC123",
          "superset_id": null,
          "sets": [
            {
              "index": 0,
              "type": "normal",
              "weight_kg": 65,
              "reps": 4,
              "distance_meters": null,
              "duration_seconds": null,
              "custom_metric": null
            }
          ],
          "rest_seconds": 180
        }
      ]
    }
  ]
}
```

**Key Findings:**
- ✅ Uses snake_case (`folder_id`, `exercise_template_id`)
- ✅ Dates are ISO8601 strings
- ✅ All optional fields are `null` (not omitted)
- ✅ `page_count` not `pageSize` in response

---

## 🔍 Common Issues Discovered

### Issue 1: Wrong Exercise Type Name

**Problem:**
```swift
case durationDistance = "duration_distance"  // ❌ WRONG
```

**Fix (verified with curl):**
```swift
case distanceDuration = "distance_duration"  // ✅ CORRECT
```

### Issue 2: Missing Exercise Types

**Before (had 10 types, but 4 were wrong):**
```swift
enum ExerciseType: String, Codable {
    case bodyweightReps = "bodyweight_reps"  // ❌ Doesn't exist!
    case distance = "distance"               // ❌ Doesn't exist!
    case assisted = "assisted"               // ❌ Doesn't exist!
    case weighted = "weighted"               // ❌ Doesn't exist!
}
```

**After (verified all 10 from API):**
```swift
enum ExerciseType: String, Codable {
    case weightReps = "weight_reps"
    case weightDuration = "weight_duration"
    case bodyweightWeighted = "bodyweight_weighted"
    case bodyweightAssisted = "bodyweight_assisted"     // ✅ NEW
    case distanceDuration = "distance_duration"         // ✅ FIXED
    case shortDistanceWeight = "short_distance_weight"  // ✅ NEW
    case duration = "duration"
    case repsOnly = "reps_only"
    case stepsDuration = "steps_duration"               // ✅ NEW
    case floorsDuration = "floors_duration"             // ✅ NEW
}
```

### Issue 3: CodingKeys vs convertFromSnakeCase Conflict

**Problem:**
Using BOTH approaches at once causes decoder to fail:
```swift
decoder.keyDecodingStrategy = .convertFromSnakeCase
// AND
enum CodingKeys: String, CodingKey {
    case exerciseTemplates = "exercise_templates"  // Conflict!
}
```

**Fix:**
Choose ONE approach - use `.convertFromSnakeCase` and remove `CodingKeys`

---

## 🧪 Testing Workflow

### 1. Make Initial Request

```bash
curl -s -X GET 'https://api.hevyapp.com/v1/ENDPOINT?page=1&pageSize=10' \
  -H 'api-key: YOUR_KEY' | python3 -m json.tool | head -100
```

**Look for:**
- Response structure (nested objects, arrays)
- Field naming convention (snake_case, camelCase)
- Optional vs required fields
- Data types (strings, numbers, booleans, nulls)

### 2. Extract Enum Values

For any field that looks like an enum (type, equipment, category):

```python
import json
values = set()
for item in data['items']:
    values.add(item['field_name'])
print(sorted(values))
```

### 3. Verify Page Count

```bash
# Get first page to see total pages
curl -s -X GET 'URL?page=1&pageSize=100' -H 'api-key: KEY' \
  | python3 -c "import json, sys; print(json.load(sys.stdin)['page_count'])"
```

### 4. Fetch All Data

```bash
PAGES=5  # From step 3
for i in $(seq 1 $PAGES); do
  curl -s -X GET "URL?page=$i&pageSize=100" \
    -H 'api-key: KEY' > /tmp/page_$i.json
done
```

### 5. Aggregate and Analyze

```python
import json
from pathlib import Path

all_types = set()
all_equipment = set()

for file in Path('/tmp').glob('page_*.json'):
    data = json.load(file.open())
    for item in data['items']:
        all_types.add(item['type'])
        all_equipment.add(item['equipment'])

print("Types:", sorted(all_types))
print("Equipment:", sorted(all_equipment))
```

---

## 📝 Updating Swift Models

### 1. Update Enum

```swift
/// VERIFIED FROM ACTUAL API (curl test on YYYY-MM-DD)
/// Tested X items across Y pages
enum ExerciseType: String, Codable, Sendable {
    case value1 = "api_value_1"  // Description
    case value2 = "api_value_2"  // Description
    // ... all values from testing
}
```

### 2. Update Documentation

Add verification note to CLAUDE.md:
```markdown
**Exercise Types (Verified via curl YYYY-MM-DD):**
- `type_name` - Description
```

### 3. Test Build

```bash
xcodebuild -project PROJECT.xcodeproj \
  -scheme SCHEME \
  -destination "id=DEVICE_ID" \
  build
```

---

## ✅ Checklist for New Endpoints

When testing a new endpoint:

- [ ] Fetch single page to see structure
- [ ] Check `page_count` for total pages
- [ ] Fetch ALL pages to get complete data set
- [ ] Extract all unique enum values
- [ ] Verify field names (snake_case vs camelCase)
- [ ] Check null handling (null vs omitted)
- [ ] Document findings in this file
- [ ] Update Swift models to match exactly
- [ ] Update CLAUDE.md with verified values
- [ ] Add "Verified via curl YYYY-MM-DD" notes
- [ ] Build and test with real data

---

## 🔗 Quick Reference

**API Base:** `https://api.hevyapp.com/v1`

**Authentication:**
```bash
-H 'api-key: YOUR_API_KEY'
```

**Common Endpoints:**
- `GET /exercise_templates?page=N&pageSize=M`
- `GET /routines?page=N&pageSize=M`
- `GET /workouts?page=N&pageSize=M`
- `POST /workouts` (with JSON body)
- `PUT /workouts/{id}` (with JSON body)

**Pretty Print JSON:**
```bash
| python3 -m json.tool
```

**Extract Field:**
```bash
| python3 -c "import json, sys; print(json.load(sys.stdin)['field'])"
```

---

## 📊 Testing History

### 2025-10-22: Exercise Templates

- **Tested:** All 435 templates across 5 pages
- **Found:** 10 exercise types, 9 equipment values
- **Fixed:** Wrong type name (`duration_distance` → `distance_duration`)
- **Added:** 4 missing types (`bodyweight_assisted`, `short_distance_weight`, `steps_duration`, `floors_duration`)
- **Removed:** 4 non-existent types from enum

---

**Remember:** Always test with real API data. Don't trust documentation or assumptions!
