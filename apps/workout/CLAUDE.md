# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the **phoneless-workout** repository - an exploration space for building better phoneless workout tracking using Apple Watch, voice LLMs, and sensors.

## MCP Integration

This repository uses the **hevy-mcp** integration to connect Claude with the Hevy Fitness API.

### Installation

To install hevy-mcp for Claude Code, run this command (replace `YOUR_HEVY_API_KEY` with your actual key):

```bash
claude mcp add hevy-mcp "npx -y hevy-mcp" --transport stdio --scope user -e HEVY_API_KEY=YOUR_HEVY_API_KEY
```

You'll need a Hevy API key (requires Hevy PRO subscription).

After installation, restart Claude Code and verify with:
```bash
claude mcp list
```

### Available MCP Tools

Through hevy-mcp, Claude has access to:
- `get-workouts` - Fetch workout history
- `get-workout` - Get specific workout details
- `create-workout` - Log new workouts
- `update-workout` - Modify existing workouts
- `get-routines` - Access workout routines
- `create-routine` - Create new routines
- `get-exercise-templates` - Browse exercise library
- Webhook subscriptions for workout events

## Project Goals

See GOAL.md for the full vision and exploration goals. This is an early-stage exploration focused on:
- Eliminating phone dependency during workouts
- Using voice and Apple Watch for workout tracking
- Leveraging LLMs for intelligent workout planning and analysis

### Detailed Goals (from GOAL.md)

**Core Problems Being Solved:**
1. **Phone Dependency** - Current workout apps require phone interaction, breaking focus and flow
2. **Data Entry Friction** - Logging sets, reps, weight, and RPE is cumbersome mid-workout
3. **Workout Modification** - Adjusting routines on the fly should be natural and quick

**Key Metrics to Track:**
- Sets and reps
- RPE (Rate of Perceived Exertion)
- Weight/resistance
- Rest times (potentially automatic via sensors)
- Heart rate and other biometrics (Apple Watch sensors)

**Technical Approach:**
- Phase 1: Integration with Hevy via MCP for Claude-powered workout analysis and planning
- Future: Voice-based workout logging, automatic set detection, real-time coaching, adaptive workouts

## Repository Structure

### `/phoneless-hevy/`

This is the **Apple Watch app** directory - the main application being developed. It contains:
- `phoneless-hevy Watch App/` - Main Apple Watch app source code
- `phoneless-hevy Watch AppTests/` - Unit tests
- `phoneless-hevy Watch AppUITests/` - UI tests
- `phoneless-hevy.xcodeproj` - Xcode project configuration

This Xcode project is where the phoneless workout tracking app is being built, integrating:
- Apple Watch native UI
- Sensor data from Apple Watch (motion, heart rate, etc.)
- Voice LLM integration for workout logging
- Hevy API integration for workout data storage and sync

When working on the app code, all development happens in this directory.

## Hevy API Integration

**CRITICAL:** The Hevy API uses **`api-key` header authentication**, NOT `Authorization: Bearer` tokens.

**Correct authentication:**
```swift
request.setValue(apiKey, forHTTPHeaderField: "api-key")
```

### API Response Format

The Hevy API returns **snake_case** JSON. Always use:
```swift
decoder.keyDecodingStrategy = .convertFromSnakeCase
```

### Exercise Templates Response Structure

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

**Exercise Types (Verified via curl 2025-10-22):**
- `weight_reps` - Weight + reps (bench press)
- `weight_duration` - Weight + time (farmer's walk)
- `bodyweight_weighted` - Weighted bodyweight (weighted dips)
- `bodyweight_assisted` - Assisted bodyweight (assisted pull-ups)
- `distance_duration` - Distance + time (running, rowing)
- `short_distance_weight` - Short distance + weight (sled push)
- `duration` - Time only (plank)
- `reps_only` - Reps without weight (air squats)
- `steps_duration` - Steps + time (stair climbing)
- `floors_duration` - Floors climbed + time

**Equipment Values (Verified via curl):**
`barbell`, `dumbbell`, `kettlebell`, `machine`, `none`, `other`, `plate`, `resistance_band`, `suspension`

### Complete API Documentation

**CRITICAL:** See `phoneless-hevy/HEVY-API-REFERENCE.md` for complete API documentation.

**Key Integration Points:**

1. **POST/PUT Response Format** - Response `"workout"` is an **ARRAY**, not a single object:
   ```swift
   struct WorkoutResponse: Codable {
       let workout: [WorkoutData]  // ARRAY!
   }
   let response = try decoder.decode(WorkoutResponse.self, from: data)
   guard let workout = response.workout.first else { throw error }
   ```

2. **RPE Validation** - Valid values: `null`, `6`, `6.5`, `7`, `7.5`, `8`, `8.5`, `9`, `9.5`, `10`
   - Values below 6 must be clamped to 6
   - Values above 10 must be clamped to 10
   - Round to nearest 0.5

3. **Request Wrapping** - All POST/PUT requests must wrap payload in `"workout"` key:
   ```json
   {"workout": { "title": "...", "exercises": [...] }}
   ```

See `phoneless-hevy/HEVY-API-REFERENCE.md` for:
- All endpoint structures with verified request/response formats
- Common error messages and solutions
- Data models in TypeScript notation
- Swift implementation examples
- Testing tips with curl commands

### API Testing Strategy

**CRITICAL: Always test with curl before implementing!**

When integrating new API endpoints:

1. **Test with curl first** - Don't trust documentation or assumptions
   ```bash
   curl -s 'https://api.hevyapp.com/v1/ENDPOINT?page=1&pageSize=100' \
     -H 'api-key: KEY' | python3 -m json.tool
   ```

2. **Extract all enum values** from actual API responses
   ```python
   # Fetch all pages
   for i in range(1, page_count + 1):
       curl ... > /tmp/page_$i.json

   # Extract unique values
   python3 -c "
   import json
   types = set()
   for file in Path('/tmp').glob('page_*.json'):
       data = json.load(file.open())
       for item in data['items']:
           types.add(item['type_field'])
   print(sorted(types))
   "
   ```

3. **Verify field names** - API uses snake_case, Swift uses camelCase
   - Use `decoder.keyDecodingStrategy = .convertFromSnakeCase`
   - Don't mix with custom `CodingKeys` - they conflict!

4. **Document verified values** with date
   ```swift
   /// VERIFIED FROM ACTUAL API (curl test on YYYY-MM-DD)
   /// Tested X items across Y pages
   enum MyType: String, Codable {
       case value1 = "api_value_1"  // Description
   }
   ```

5. **Update CLAUDE.md** with verified enum values for future reference

See `phoneless-hevy/API-TESTING-METHODOLOGY.md` for complete testing guide.

## Design Guidelines

This project follows strict **watchOS 26 design best practices**. See `phoneless-hevy/WATCHOS-DESIGN-BEST-PRACTICES.md` for comprehensive guidelines including:

- **Typography**: SF Compact font, proper sizing, text overflow prevention
- **Layout**: Liquid Glass design, z-index management, touch targets (≥44pt)
- **Text Handling**: ALWAYS use `.minimumScaleFactor()` and `.lineLimit()` to prevent truncation
- **Performance**: Battery optimization, efficient rendering
- **Accessibility**: Dynamic Type, VoiceOver support

**CRITICAL: Text Overflow Prevention**

ALL text elements must include overflow protection:
```swift
Text("Any Text")
    .lineLimit(1-3)                    // Set explicit limit
    .minimumScaleFactor(0.7-0.9)       // Allow scaling
```

Refer to the design guide before implementing any UI components.
