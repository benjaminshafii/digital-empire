# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Corgina** is a pregnancy tracking and health logging iOS app built with SwiftUI for iOS 26. The app helps expectant mothers track hydration, nutrition, symptoms, supplements, and pregnancy milestones. It features AI-powered voice logging using OpenAI's Whisper and GPT-4o, on-device speech recognition, photo-based food logging, and Apple Health integration.

## Development Commands

### Building and Running
```bash
# Open in Xcode
open HydrationReminder.xcodeproj

# Build from command line (if xcodebuild is available)
xcodebuild -project HydrationReminder.xcodeproj -scheme HydrationReminder -configuration Debug build

# Run tests
xcodebuild test -project HydrationReminder.xcodeproj -scheme HydrationReminder -destination 'platform=iOS Simulator,name=iPhone 15'
```

### Running Single Tests
```bash
# Run specific test class
xcodebuild test -project HydrationReminder.xcodeproj -scheme HydrationReminder -only-testing:HydrationReminderTests/AsyncTaskManagerTests

# Run specific test method
xcodebuild test -project HydrationReminder.xcodeproj -scheme HydrationReminder -only-testing:HydrationReminderTests/VoiceLogTests/testVoiceLogCreation
```

## Architecture

### App Entry Point
- **CorginaApp.swift**: Main app entry point using SwiftUI App lifecycle
- Initializes core managers (`NotificationManager`, `LogsManager`) as `@StateObject`
- Configures `AsyncTaskManager` for background processing
- Uses `AppDelegate` for notification handling

### Core Manager Pattern
The app uses a centralized manager architecture with dependency injection:

1. **LogsManager** - Unified logging system for all user activities
   - Manages food, water, symptoms, and supplement logs
   - Persists to UserDefaults with JSON encoding
   - Provides filtering, analytics, and export capabilities
   - Thread-safe with dispatch queues

2. **VoiceLogManager** (Singleton) - Voice recording and AI processing
   - On-device speech recognition via `OnDeviceSpeechManager`
   - OpenAI Whisper transcription (optional)
   - GPT-4o action extraction with structured outputs
   - State machine: idle → recording → recognizing → executing → completed
   - Must be configured with `LogsManager` and `SupplementManager`

3. **OpenAIManager** (Singleton) - AI services wrapper
   - Food image analysis with GPT-4o Vision
   - Voice transcription with Whisper API
   - Action extraction from voice with structured JSON outputs
   - Macro estimation for food items
   - Uses OpenAI structured outputs for type-safe responses
   - Retry logic with exponential backoff

4. **AsyncTaskManager** (Actor) - Background task queue
   - Processes long-running OpenAI requests asynchronously
   - Persists pending tasks to UserDefaults
   - Retries failed tasks (max 3 attempts)
   - Key task: fetching food macros after voice logging
   - Must be configured with `LogsManager` and `OpenAIManager`

5. **PregnancyDataManager** - Pregnancy tracking calculations
   - Stores due date, LMP, conception date
   - Calculates current week, trimester, baby size
   - Maps weeks to fruit size comparisons

6. **HealthKitManager** - Apple Health integration
   - Weight tracking (read/write)
   - Unit conversion (kg ↔ lbs)
   - Authorization handling

7. **NotificationManager** - Local notifications
   - Hydration and meal reminders
   - Badge count management
   - Daily reset logic

### View Hierarchy
```
MainTabView
├── DashboardView (home)
│   ├── Next reminders card
│   ├── Pregnancy tracking cards (CurrentWeekCard, BabySizeCard)
│   ├── Hydration/Food/Weight cards
│   ├── Calorie tracker cards (daily/weekly)
│   ├── PUQE score card
│   └── Recent activity section
├── LogLedgerView (activity log)
├── PUQEScoreView (nausea tracking)
└── MoreView (settings/about)
```

### Voice Recognition Flow
Critical understanding for debugging voice features:

1. **Recording Start** (`VoiceLogManager.startRecording()`):
   - Requests speech permission
   - Starts on-device live transcription (`OnDeviceSpeechManager`)
   - Records audio file to Documents directory
   - Sets `isRecording = true`

2. **Recording Stop** (`VoiceLogManager.stopRecording()`):
   - **CRITICAL**: Immediately sets `isProcessingVoice = true` and `actionRecognitionState = .recognizing` BEFORE async work
   - This prevents UI flicker when transitioning states
   - Validates recording file exists and has content
   - Creates `VoiceLog` entry with metadata
   - Passes to `processOnDeviceTranscription()`

3. **Transcription Processing**:
   - Uses on-device transcript (skips Whisper API for speed)
   - Sets up 20-second timeout task
   - Calls OpenAI GPT-4o to extract actions (structured output)
   - State: recognizing → executing

4. **Action Execution**:
   - Parses timestamps and meal types
   - For food: creates log entry immediately, queues macro fetch via `AsyncTaskManager`
   - For water/vitamins: logs directly to `LogsManager`
   - State: executing → completed

5. **Completion**:
   - Shows success state for 4 seconds
   - Auto-dismisses and resets to idle
   - Clears executed actions on tap

### Async Food Logging Pattern
When voice/manual food logging occurs without nutrition data:

1. Log entry created immediately with `calories = 0`
2. `AsyncTaskManager.queueFoodMacrosFetch(foodName, logId)` called
3. Background task fetches macros from OpenAI (2-3 seconds)
4. Updates log entry on MainActor via `LogsManager` reference
5. Triggers UI update via `objectWillChange.send()`

**Why this pattern?** Voice responses must feel instant. Food macro estimation is slow (2-3s), so we show placeholder and update UI when ready.

### iOS 26 Design Patterns
The app implements iOS 26 Liquid Glass design language:

- **Materials**: `.ultraThinMaterial`, `.regularMaterial` for card backgrounds
- **Corners**: `RoundedRectangle(cornerRadius: 16-24, style: .continuous)`
- **Shadows**: Subtle `shadow(color: .black.opacity(0.05), radius: 8)`
- **Colors**: Gradient backgrounds, semantic colors (`.blue`, `.orange`, `.purple`)
- **Animations**: `.spring()` with custom response and dampingFraction
- **Charts**: Native Swift Charts with iOS 26 enhancements (`EnhancedWeightChart`)
- **Navigation**: iOS 26 tab bar with `.tabBarMinimizeBehavior(.onScrollDown)`
- **Empty States**: `ContentUnavailableView` with actions

### Data Models

#### LogEntry
The core data model for all activities:
```swift
struct LogEntry: Codable, Identifiable {
    let id: UUID
    var date: Date
    let type: LogType  // .water, .food, .puke, .symptom, .drink
    let source: LogSource  // .manual, .voice, .reminder, .quick
    var notes: String?

    // Food-specific
    var foodName: String?
    var calories: Int?
    var protein: Int?
    var carbs: Int?
    var fat: Int?

    // Other metadata
    var amount: String?
    var severity: Int?
    var relatedLogIds: [UUID]
}
```

#### VoiceAction
Structured output from OpenAI action extraction:
```swift
struct VoiceAction: Codable {
    enum ActionType {
        case logWater, logFood, logSymptom, logVitamin, logPUQE, addVitamin
    }

    let type: ActionType
    let details: ActionDetails
    let confidence: Double

    struct ActionDetails {
        let item: String?
        let amount: String?
        let mealType: String?  // maps to specific times (breakfast=8am, lunch=12pm, dinner=6pm)
        let isCompoundMeal: Bool?  // "chicken with rice" vs separate items
        let components: [MealComponent]?  // for compound meals
        // ... other fields
    }
}
```

### OpenAI Integration Details

#### Structured Outputs Pattern
All OpenAI requests use structured outputs for type-safe responses:

```swift
// Define strict JSON schema
let jsonSchema: [String: Any] = [
    "name": "response_name",
    "strict": true,
    "schema": [
        "type": "object",
        "properties": [...],
        "required": [...],
        "additionalProperties": false
    ]
]

// Request with schema
let requestBody: [String: Any] = [
    "model": "gpt-4o",
    "messages": messages,
    "response_format": [
        "type": "json_schema",
        "json_schema": jsonSchema
    ]
]
```

#### Key AI Workflows

1. **Voice Action Extraction** (`extractVoiceActions`):
   - Step 1: Fast classification with gpt-4o-mini (200-300ms)
   - Step 2: If action detected, full extraction with gpt-4o (800-1200ms)
   - Handles compound meals vs separate items
   - Parses natural time references

2. **Food Macro Estimation** (`estimateFoodMacros`):
   - Model: gpt-4o
   - Validates calorie math: (P×4) + (C×4) + (F×9) ≈ calories
   - Handles quantities ("3 bananas" → 315 cal)
   - Never returns zero values

3. **Photo Food Analysis** (`analyzeFood`):
   - Model: gpt-4o with vision
   - Returns per-item and total nutrition
   - Considers cooking methods and condiments

### Thread Safety & Concurrency

- **LogsManager**: Uses `dataQueue` (background QoS) for file I/O, updates UI on MainActor
- **AsyncTaskManager**: Global actor, serializes all task operations
- **VoiceLogManager**: `@unchecked Sendable` with MainActor methods for UI updates
- **State updates**: Always use `@MainActor` or `DispatchQueue.main.async` for Published properties

### Configuration Requirements

**OpenAI API Key**: Required for all AI features
- Stored via `@AppStorage("openAIKey")`
- Set in MoreView → Settings
- Validated before API calls with `OpenAIManager.hasAPIKey`

**Permissions**:
- Microphone: Required for voice logging
- Speech recognition: Required for on-device transcription
- Notifications: Required for reminders
- Apple Health: Optional, for weight tracking

## Research Files

The repository includes comprehensive research documents:

- **ios26-charts-research-2025.md**: iOS 26 Swift Charts best practices, Liquid Glass design patterns
- **ios26-navigation-research-2025.md**: iOS 26 navigation patterns and tab bar behavior
- **pregnancy-exercise-research.md**: Exercise guidelines for pregnancy
- **baby-photo-logging-research.md**: Photo logging patterns
- **pregnancy-dating-ui-research.md**: Pregnancy date tracking UI patterns

These documents contain current best practices as of 2025 and should be consulted when implementing new features.

## Important Implementation Notes

### Voice Feature Debugging
If voice features aren't working:
1. Check `voiceLogManager.isConfigured` - must be true
2. Verify `logsManager` is the same instance used by views (check `ObjectIdentifier`)
3. Enable debug prints - extensive logging in `VoiceLogManager` and `AsyncTaskManager`
4. State transitions must occur on MainActor
5. Audio file must exist and have size > 1000 bytes

### UI State Management
- All `@Published` properties must be updated on MainActor
- Use `objectWillChange.send()` after programmatic updates
- LogsManager auto-saves on every change (background queue)
- Voice state machine prevents UI flicker by setting state before async work

### Testing
- Test files: `AsyncTaskManagerTests.swift`, `VoiceLogTests.swift`
- Managers are designed to be testable with dependency injection
- Mock data available via factory methods

## Common Patterns

### Adding a New Log Type
1. Add case to `LogType` enum in `LogEntry.swift`
2. Update `LogsManager` filtering methods
3. Add UI card in `DashboardView`
4. Update `LogEntryRow` icon/color
5. Add voice action type if needed

### Adding New AI Features
1. Define strict JSON schema in `OpenAIManager`
2. Implement `makeStructuredRequest<T>` call
3. Add task type to `AsyncTaskManager` if long-running
4. Update error handling with user-friendly messages
5. Add retry logic for network failures

### iOS 26 Component Updates
When updating UI components:
- Follow Liquid Glass design: translucent materials, rounded corners, subtle shadows
- Use `.spring()` animations with appropriate response/damping
- Implement dark mode support via semantic colors
- Add VoiceOver labels and accessibility modifiers
- Test with Dynamic Type sizes
- Consult ios26-*-research-2025.md files for current best practices
