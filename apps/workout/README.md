# Phoneless Hevy

Voice-controlled workout tracking for Apple Watch. Log sets by speaking naturally - no phone needed mid-workout.

## What it does

Say "bench press 225 pounds 8 reps" and it logs to Hevy. Uses OpenAI Whisper for transcription and GPT-4o for parsing natural language into structured workout data.

**Features:**
- Voice input with OpenAI Whisper transcription
- GPT-4o structured outputs for parsing workout commands
- Direct audio parsing (GPT-4o audio-preview) - single API call
- Hevy API integration (routines, exercises, workout sync)
- HealthKit workout sessions with real-time metrics
- watchOS 26 Liquid Glass UI

## How it works

1. Press mic button, speak your set
2. Audio recorded locally (16kHz AAC)
3. Sent to Whisper API for transcription
4. GPT-4o parses into structured data (exercise, weight, reps, RPE)
5. Logs to current workout, syncs to Hevy

Supports natural variations:
- "100 kilos 8 reps"
- "225 for 5"
- "same" (repeats last set)
- "RPE 8"

## Setup

1. Open `phoneless-hevy.xcodeproj` in Xcode 16+
2. Add your OpenAI API key in Settings
3. Add your Hevy API key (requires Hevy PRO)
4. Run on Apple Watch or watchOS 26 simulator

## Project Structure

```
phoneless-hevy Watch App/
├── Views/                    # SwiftUI views
├── Models/                   # Data models (WorkoutSet, Exercise, etc.)
├── Managers/
│   ├── VoiceRecognitionManager.swift   # Audio recording + Whisper
│   ├── LLMWorkoutParser.swift          # GPT-4o text parsing
│   ├── DirectAudioParser.swift         # GPT-4o audio-preview
│   ├── WorkoutManager.swift            # Workout session logic
│   ├── HevyAPIClient.swift             # Hevy API integration
│   └── HealthKitManager.swift          # HealthKit integration
├── Services/
│   ├── WorkoutHistoryService.swift     # Historical workout data
│   └── ContextResolver.swift           # Exercise context resolution
└── Parsers/
    └── CorrectionCommandParser.swift   # "undo", "fix last" commands
```

## Requirements

- macOS with Xcode 16+
- watchOS 26 SDK
- Apple Watch Series 9+ or watchOS 26 simulator
- OpenAI API key
- Hevy PRO subscription (for API access)
