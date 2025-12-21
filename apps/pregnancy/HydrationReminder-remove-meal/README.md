# Corgina - Open Source Food and Symptoms Tracker

An AI-powered iOS app for tracking pregnancy health, nutrition, and symptoms with privacy-first, on-device data storage.

> **⚠️ Note**: Currently only compatible with iOS 26. Requires iPhone running iOS 26.0 or later.

Testflight link: https://testflight.apple.com/join/5HV3CJ7x

Short demo: https://youtube.com/shorts/tOFTKZYpN6A?si=3zC5Mllkp6Y-Q0MD

<img width="500" height="auto" alt="image" src="https://github.com/user-attachments/assets/fc51c423-34a3-4fd1-9658-8d432db6c468" />


## Features

### 🎤 Voice-First AI Logging
- Natural language voice commands for logging food, water, vitamins, and symptoms
- On-device speech recognition for privacy
- AI-powered nutrition estimation using OpenAI GPT-4o
- Example: "I ate tahini for lunch" → automatically logs at 12pm with nutritional data

### 📊 Comprehensive Health Tracking
- **Food Intake**: Automatic calorie and macro estimation (protein, carbs, fat)
- **Hydration**: Water intake tracking with customizable amounts
- **Vitamins & Supplements**: Schedule and track prenatal vitamins
- **Symptoms**: Log nausea, vomiting, and other pregnancy symptoms
- **PUQE Score**: Track and monitor pregnancy-related nausea severity

### 🔒 Privacy-First
- **100% Private**: All data stored locally on device
- **No Cloud Storage**: Your health data never leaves your iPhone
- **Your Own API Key**: Bring your own OpenAI API key for AI features
- **Complete Control**: Delete any log entry with swipe or context menu

### 🎨 Modern iOS 26 Design
- Liquid Glass UI components following Apple's latest design language
- Compact pill interface for voice interactions
- Quick-select time picker for editing log timestamps
- Swipe-to-delete and context menus throughout

### ⏰ Smart Notifications
- Customizable eating and drinking reminders
- Badge notifications for missed meals
- Configurable intervals (30 minutes to multiple hours)

## Requirements

- **iOS 26.0 or later** (iOS 26 only at the moment)
- iPhone (tested on iPhone 16 Pro)
- Xcode 17+ (for building and installation)
- OpenAI API key (for AI nutrition estimation and voice command processing)

## Installation

### Method 1: Using Xcode (Recommended)

1. **Install Xcode**:
   - Download Xcode from the Mac App Store
   - Requires macOS with Xcode 17+

2. **Clone and Open**:
   ```bash
   git clone https://github.com/benjaminshafii/corgi.git
   cd corgi/HydrationReminder
   open HydrationReminder.xcodeproj
   ```

3. **Configure Signing**:
   - Select the project in Xcode
   - Go to "Signing & Capabilities"
   - Select your Apple ID team
   - Change Bundle Identifier to something unique (e.g., `com.yourname.corgina`)

4. **Add OpenAI API Key**:
   - Launch the app
   - Go to More → Settings
   - Enter your OpenAI API key
   - Key is stored securely in iOS Keychain

5. **Connect iPhone**:
   - Connect your iPhone via USB
   - Trust the computer if prompted
   - Enable Developer Mode: Settings > Privacy & Security > Developer Mode

6. **Install App**:
   - Select your iPhone from the device list in Xcode
   - Click the "Run" button (▶️)
   - Trust the developer certificate on iPhone: Settings > General > VPN & Device Management

## Usage

### First Launch
1. Accept the health disclaimer
2. Grant notification permissions for reminders
3. Grant microphone permissions for voice commands
4. Add your OpenAI API key in Settings

### Voice Commands
- **Food**: "I ate a banana for breakfast"
- **Water**: "Log 500ml of water"
- **Compound Meals**: "I had chicken with rice and broccoli"
- **Vitamins**: "Log prenatal vitamin"
- **Custom Vitamins**: "Add vitamin D3, twice daily"
- **Symptoms**: "I'm feeling nauseous, severity 7"

### Manual Logging
- Tap the floating mic button to start voice recording
- Or use the quick action buttons in the Dashboard
- Edit timestamps by tapping the time on any log entry
- Delete entries by swiping left or long-press for context menu

## Technical Details

- **Platform**: iOS 26.0+
- **Framework**: SwiftUI with iOS 26 Liquid Glass design
- **Architecture**: MVVM + Actor-based concurrency
- **AI**: OpenAI GPT-4o for nutrition estimation and voice command parsing
- **Speech**: On-device speech recognition (Speech framework)
- **Storage**: UserDefaults + local file system (100% on-device)
- **Notifications**: UserNotifications framework

## Project Structure

```
HydrationReminder/
├── CorginaApp.swift              # App entry point
├── MainTabView.swift             # Main tab navigation
├── DashboardView.swift           # Home dashboard
├── LogLedgerView.swift           # Log history view
├── VoiceLogManager.swift         # Voice recording & AI processing
├── OpenAIManager.swift           # OpenAI API integration
├── AsyncTaskManager.swift        # Background nutrition fetching
├── LogsManager.swift             # Log data management
├── NotificationManager.swift     # Reminder scheduling
├── VoiceCompactPill.swift        # iOS 26 voice UI component
├── TimeEditSheet.swift           # Time picker with quick select
└── docs/                         # Best practices documentation
```

## Privacy & Security

- **No Analytics**: Zero tracking or analytics
- **No Cloud**: All data stored locally
- **API Key Security**: OpenAI key stored in iOS Keychain
- **On-Device Speech**: Speech recognition happens on device
- **Optional AI**: App works without OpenAI key (manual logging only)

## Troubleshooting

- **Voice commands not working**: Check microphone permissions in Settings
- **No nutrition data**: Verify OpenAI API key in More → Settings
- **Notifications not working**: Check Settings > Notifications > Corgina
- **App won't install**: Ensure iPhone is in Developer Mode
- **Build errors**: Check Bundle Identifier is unique and team is selected

## OpenAI API Key Setup

1. Get an API key from [platform.openai.com](https://platform.openai.com)
2. Open Corgina app → More → Settings
3. Enter your API key
4. Key is securely stored in iOS Keychain

**Note**: The app uses GPT-4o for:
- Food nutrition estimation (~$0.01 per food item)
- Voice command parsing (~$0.005 per command)

Typical daily usage: ~$0.10-0.30 depending on voice usage.

## Contributing

This is a personal project, but suggestions and bug reports are welcome via GitHub Issues.

## License

Free to use and modify for personal use.

---

**Corgina** - Your AI pregnancy health companion 🐕
