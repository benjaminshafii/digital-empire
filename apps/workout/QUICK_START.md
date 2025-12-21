# Quick Start Guide - Phoneless Workout App

## ✅ Status: Ready to Run!

The app is fully built and ready to run on Apple Watch simulators or your Apple Watch Series 9.

---

## Running in Xcode

### Option 1: Open and Run
```bash
cd /Users/benjaminshafii/git/phoneless-workout/phoneless-hevy
open phoneless-hevy.xcodeproj
```

Then in Xcode:
1. Select **"phoneless-hevy Watch App"** scheme (top toolbar)
2. Choose a destination:
   - **Apple Watch Series 11 (46mm)** - watchOS 26 Simulator ✅
   - **Apple Watch Ultra 3 (49mm)** - watchOS 26 Simulator ✅
   - **Benjamin's Apple Watch** - Your physical device (requires watchOS 26)
3. Press **Cmd+R** or click the Play button

### Option 2: Command Line
```bash
cd /Users/benjaminshafii/git/phoneless-workout/phoneless-hevy

# Build for simulator
xcodebuild -scheme "phoneless-hevy Watch App" \
  -destination 'platform=watchOS Simulator,name=Apple Watch Series 11 (46mm)' \
  build
```

---

## What to Expect

### 1. Launch Screen
- App opens to **WorkoutStartView**
- Shows 5 preset workout types:
  - Push Day 💪
  - Pull Day 🏋️
  - Leg Day 🦵
  - Upper Body 💪
  - Full Body 🏃

### 2. Start a Workout
- Tap any workout type
- App navigates to **WorkoutProgressView**
- You'll see:
  - Elapsed time (large display)
  - Heart rate (BPM)
  - Calories burned
  - Sets completed

### 3. Voice Input (Bottom-Left Button)
- Tap the microphone icon
- Say commands like:
  - "Bench press, 135 pounds, 8 reps"
  - "Squat, 225 pounds, 5 reps, RPE 8"
  - "Deadlift, 315 pounds, 3 reps, to failure"

**Note:** Voice recognition uses a stub on watchOS. For production:
- Implement watchOS-specific voice input
- Or use OpenAI Whisper API ($0.006/min)

### 4. Controls
- **Microphone Button (Bottom-Left):** Voice input
- **Menu Button (Bottom-Right):** Pause or End workout
- **Double Tap:** Quick access to voice input (Series 9+)

---

## Current Limitations

### 1. Voice Recognition
- Currently a **stub implementation**
- watchOS doesn't support Speech framework the same way iOS does
- **Solutions:**
  - Use OpenAI Whisper API (cloud-based, $0.006/min)
  - Use GPT-4o Realtime API (real-time, ~$0.83/conversation)
  - Implement custom watchOS solution

### 2. Testing on Simulator
- ❌ Voice input won't work (requires hardware)
- ❌ Real heart rate data (uses mock data)
- ✅ UI and navigation work perfectly
- ✅ Timers and animations work

### 3. Physical Device Testing Needed For
- Voice recognition accuracy
- Heart rate sensor accuracy
- Battery consumption
- Real-world UX
- Cellular/WiFi connectivity

---

## Troubleshooting

### "Missing bundle ID" Error
**Fixed!** The Info.plist now includes all required bundle keys.

### "Benjamin's Apple Watch's watchOS doesn't match"
Your watch needs watchOS 26. Options:
1. Update your watch to watchOS 26 (if available)
2. Lower deployment target in Xcode:
   - Open project settings
   - Select "phoneless-hevy Watch App" target
   - Change "watchOS Deployment Target" to your watch's OS version

### Simulator Not Showing Up
If you don't see watchOS simulators:
1. Open **Xcode → Settings → Platforms**
2. Download **watchOS 26 Simulator** if missing
3. Restart Xcode

### Build Errors
```bash
# Clean build folder
cd /Users/benjaminshafii/git/phoneless-workout/phoneless-hevy
xcodebuild clean

# Or in Xcode: Product → Clean Build Folder (Cmd+Shift+K)
```

---

## Testing the MVP Features

### ✅ What Works Now

**1. Workout Session Management**
- Start workout → Creates HealthKit workout session
- Pause/Resume → Controls workout state
- End workout → Saves to HealthKit and prepares for Hevy sync

**2. UI & Navigation**
- Liquid Glass design (watchOS 26)
- Corner button layout
- Always-on display optimization
- Double Tap gesture support

**3. Data Models**
- Complete workout data structures
- Hevy API compatible formats
- Offline storage ready

**4. API Integration (Ready)**
- Hevy API client configured
- Exercise templates can be fetched
- Workout creation/update ready
- API Key: Set via `HEVY_API_KEY` environment variable

### ⏳ What Needs Implementation

**1. Voice Recognition**
Replace stub in `VoiceRecognitionManager.swift`:
```swift
// Current: Stub implementation
// TODO: Implement watchOS-specific voice input
// Options:
// - OpenAI Whisper API
// - GPT-4o Realtime API
// - Custom solution
```

**2. Real Sensor Data**
Currently uses mock data. Connect to actual HealthKit sensors:
```swift
// WorkoutManager.swift already has HealthKit integration
// Test on physical device to see real heart rate, calories
```

**3. Network Sync**
Test Hevy API sync:
```swift
// HevyAPIClient is ready
// Test: Create a workout and sync to Hevy
let workout = WorkoutData(...)
try await HevyAPIClient.shared.createWorkout(workout)
```

---

## Next Development Steps

### Phase 1: Voice Recognition (1-2 days)
1. Choose voice input solution:
   - **Whisper API:** Best for MVP (simple, cheap)
   - **Realtime API:** Best for coaching features
2. Implement in `VoiceRecognitionManager.swift`
3. Test on physical Apple Watch

### Phase 2: Real-World Testing (1 week)
1. Deploy to your Apple Watch Series 9
2. Take to gym for actual workout
3. Test voice commands during exercise
4. Measure battery consumption
5. Validate HealthKit accuracy

### Phase 3: Hevy Sync (2-3 days)
1. Test exercise template fetching
2. Log a workout and sync to Hevy
3. Verify workout appears in Hevy app
4. Test offline → online sync

### Phase 4: Polish (1 week)
1. Add Smart Stack widget
2. Add Control Center controls
3. Create app icon
4. Add complications
5. Optimize battery usage

---

## Useful Commands

### View Git History
```bash
git log --oneline --graph --all
```

### Check Current Branch
```bash
git status
```

### View All Files
```bash
tree phoneless-hevy\ Watch\ App/
```

### Run Tests (when added)
```bash
xcodebuild test -scheme "phoneless-hevy Watch App" \
  -destination 'platform=watchOS Simulator,name=Apple Watch Series 11 (46mm)'
```

---

## Resources

### Documentation
- `MVP_COMPLETE.md` - Full build summary
- `TECHNICAL_DESIGN.md` - Architecture guide
- `HEVY-API-INTEGRATION.md` - Hevy API reference
- `GPT4O-AUDIO-RESEARCH.md` - Voice AI research
- `CLAUDE.md` - Project instructions
- `GOAL.md` - Project vision

### API Keys
- **Hevy API Key:** Set via `HEVY_API_KEY` environment variable (get from https://hevy.com/settings?developer)
- **OpenAI API Key:** Set via `OPENAI_API_KEY` environment variable (get from https://platform.openai.com/api-keys)

### Helpful Links
- [watchOS Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/watchos)
- [HealthKit Documentation](https://developer.apple.com/documentation/healthkit)
- [Hevy API Docs](https://api.hevyapp.com/docs/)
- [OpenAI Whisper API](https://platform.openai.com/docs/guides/speech-to-text)

---

## Ready to Go! 🚀

Your phoneless workout app is ready to run. Open Xcode and hit **Cmd+R**!

For questions or issues, check the documentation files or review the code architecture in `TECHNICAL_DESIGN.md`.

**Happy coding and crushing those workouts!** 💪⌚️
