# Home Assistant Watch Voice Control - Possible Actions

## Overview
This document outlines the voice-controlled actions possible with the HA Watch app, leveraging Home Assistant's REST API, Conversation API, and iOS 26's new SpeechAnalyzer framework.

## Technology Stack

### Audio Processing (from workout app)
- **VoiceRecognitionManager**: Records audio using AVAudioRecorder
- **DirectAudioParser**: Uses OpenAI Whisper + GPT-4o audio-preview for single-call transcription+parsing
- **UnifiedVoiceCommandClassifier**: LLM-based command classification with structured outputs

### iOS 26 New Features
- **SpeechAnalyzer API**: New on-device speech-to-text (iOS 26+)
  - On-device transcription with system-managed language models
  - Privacy-first (no data leaves device)
  - Multiple language support
  - Live transcription capabilities
- **AVFoundation**: Audio recording and processing

### Home Assistant Integration
- **REST API**: `/api/services/<domain>/<service>` for direct device control
- **Conversation API**: `/api/conversation/process` for natural language processing
- **Intent API**: `/api/intent/handle` for structured intent firing
- **State API**: `/api/states/<entity_id>` for reading/writing entity states

## Voice Action Categories

### 1. Lighting Control

#### Basic Commands
```
"Turn on kitchen lights"
"Turn off bedroom lights"
"Toggle living room lamp"
"Dim office lights to 50%"
"Set bathroom brightness to maximum"
```

#### Advanced Lighting
```
"Change bedroom lights to blue"
"Set kitchen to warm white"
"Turn on movie mode" (scene)
"Activate night mode"
```

**API Calls:**
```
POST /api/services/light/turn_on
{
  "entity_id": "light.kitchen",
  "brightness_pct": 50,
  "rgb_color": [255, 0, 0]
}

POST /api/services/light/turn_off
{
  "entity_id": "light.bedroom"
}
```

### 2. Climate Control

#### Temperature
```
"Set thermostat to 72 degrees"
"What's the temperature in the living room?"
"Turn on bedroom AC"
"Set heat to 68"
```

#### Modes
```
"Set thermostat to auto mode"
"Turn on fan"
"Set AC to cool mode"
```

**API Calls:**
```
POST /api/services/climate/set_temperature
{
  "entity_id": "climate.living_room",
  "temperature": 72
}

POST /api/services/climate/set_hvac_mode
{
  "entity_id": "climate.bedroom",
  "hvac_mode": "heat"
}
```

### 3. Switches & Plugs

```
"Turn on coffee maker"
"Turn off TV"
"Switch on Christmas lights"
"Power cycle router"
```

**API Calls:**
```
POST /api/services/switch/turn_on
{
  "entity_id": "switch.coffee_maker"
}
```

### 4. Locks & Security

```
"Lock front door"
"Unlock back door"
"Is the garage door open?"
"Arm security system"
"Disarm alarm"
```

**API Calls:**
```
POST /api/services/lock/lock
{
  "entity_id": "lock.front_door"
}

POST /api/services/alarm_control_panel/alarm_arm_home
{
  "entity_id": "alarm_control_panel.home"
}
```

### 5. Media Control

```
"Play music in kitchen"
"Pause living room TV"
"Volume up"
"Volume down"
"Next track"
"What's playing?"
```

**API Calls:**
```
POST /api/services/media_player/play_media
{
  "entity_id": "media_player.kitchen",
  "media_content_type": "music",
  "media_content_id": "spotify:playlist:xxxxx"
}

POST /api/services/media_player/volume_set
{
  "entity_id": "media_player.living_room",
  "volume_level": 0.5
}
```

### 6. Scenes & Automations

```
"Activate good morning scene"
"Run bedtime routine"
"Start movie mode"
"Execute leaving home"
```

**API Calls:**
```
POST /api/services/scene/turn_on
{
  "entity_id": "scene.good_morning"
}

POST /api/services/script/turn_on
{
  "entity_id": "script.bedtime_routine"
}
```

### 7. Information Queries

```
"What's the temperature outside?"
"Is anyone home?"
"What's the humidity level?"
"How much power am I using?"
"When is sunset?"
```

**API Calls:**
```
GET /api/states/sensor.outdoor_temperature
GET /api/states/binary_sensor.motion_living_room
```

### 8. Covers & Blinds

```
"Open bedroom blinds"
"Close garage door"
"Set living room shades to 50%"
"Open all blinds"
```

**API Calls:**
```
POST /api/services/cover/open_cover
{
  "entity_id": "cover.bedroom_blinds"
}

POST /api/services/cover/set_cover_position
{
  "entity_id": "cover.living_room_shades",
  "position": 50
}
```

### 9. Fans

```
"Turn on bedroom fan"
"Set fan to medium speed"
"Oscillate the fan"
"Turn off all fans"
```

**API Calls:**
```
POST /api/services/fan/turn_on
{
  "entity_id": "fan.bedroom",
  "percentage": 66
}
```

### 10. Notifications & Timers

```
"Remind me to check the oven in 10 minutes"
"Set a timer for 5 minutes"
"Cancel all timers"
```

**API Calls:**
```
POST /api/services/timer/start
{
  "entity_id": "timer.oven",
  "duration": "00:10:00"
}
```

## Voice Processing Architecture

### Option 1: iOS 26 SpeechAnalyzer (On-Device) + Home Assistant Conversation API

```swift
// Flow:
// 1. SpeechAnalyzer transcribes audio on-device
// 2. Send transcribed text to HA Conversation API
// 3. HA processes intent and returns response

let analyzer = SpeechAnalyzer()
let transcription = await analyzer.transcribe(audioURL)

// Send to HA
POST /api/conversation/process
{
  "text": transcription,
  "language": "en"
}

// Response:
{
  "response": {
    "speech": {
      "plain": "I've turned on the kitchen lights"
    }
  },
  "conversation_id": "xxx"
}
```

### Option 2: OpenAI Whisper + GPT-4o (Existing from workout app)

```swift
// Flow:
// 1. Whisper transcribes audio
// 2. GPT-4o with structured outputs classifies intent
// 3. Direct API call to HA

// Unified classifier returns structured command
let command = await UnifiedVoiceCommandClassifier.classify(text)

// Execute against HA API
switch command {
case .controlDevice(let entity, let action):
    POST /api/services/{domain}/{action}
    { "entity_id": entity }
}
```

### Option 3: Hybrid Approach (RECOMMENDED)

```swift
// Best of both worlds:
// - SpeechAnalyzer for privacy-first transcription (no API cost)
// - LLM for complex command classification (when needed)
// - Direct API calls for simple commands (fastest)

// 1. Transcribe on-device with SpeechAnalyzer
let text = await SpeechAnalyzer.transcribe(audio)

// 2. Simple pattern matching for common commands
if let simpleCommand = PatternMatcher.match(text) {
    // Fast path: direct API call
    executeCommand(simpleCommand)
} else {
    // Complex path: use HA Conversation API or GPT-4o
    let intent = await HAConversationAPI.process(text)
    executeIntent(intent)
}
```

## Implementation Priorities

### Phase 1: Core Voice Control (MVP)
1. ✅ Audio recording (VoiceRecognitionManager)
2. 🔄 iOS 26 SpeechAnalyzer integration (on-device transcription)
3. 🔄 Home Assistant API client
4. 🔄 Basic lighting control
5. 🔄 Simple switches/plugs

### Phase 2: Enhanced Control
1. ⏳ Climate control
2. ⏳ Scene activation
3. ⏳ Media player control
4. ⏳ Information queries

### Phase 3: Advanced Features
1. ⏳ Complex intent parsing with LLM
2. ⏳ Multi-room control
3. ⏳ Contextual conversations
4. ⏳ Automation triggers

### Phase 4: Watch Optimization
1. ⏳ Haptic feedback
2. ⏳ Watch complications for status
3. ⏳ Quick actions via Digital Crown
4. ⏳ Raise-to-speak with always-on microphone

## MCP Server Custom Implementation

Based on the official Home Assistant MCP server (2025.2+), we can create a custom implementation that:

### Custom MCP Actions via Exa Research

Using Exa AI to dynamically discover and integrate with HA capabilities:

```swift
// Pseudo-code for dynamic capability discovery
class HAExaDiscovery {
    // Use Exa to find latest HA integrations and capabilities
    func discoverAvailableServices() async -> [HAService] {
        let query = "Home Assistant available services and integrations 2025"
        let results = await ExaSearch(query)
        
        // Parse and cache available services
        return parseServices(results)
    }
    
    // Use Exa to find best practices for specific devices
    func discoverDeviceControl(deviceType: String) async -> [VoicePattern] {
        let query = "Home Assistant \(deviceType) voice control examples"
        let results = await ExaSearch(query)
        
        return parseVoicePatterns(results)
    }
}
```

### MCP Integration Flow

```
Watch App (Voice)
    ↓ (audio)
SpeechAnalyzer (iOS 26)
    ↓ (text)
Command Classifier
    ↓ (intent)
Home Assistant MCP Server
    ↓ (action)
HA Core (execute)
    ↓ (result)
Watch App (haptic + audio feedback)
```

## Key Advantages of This Approach

1. **Privacy-First**: iOS 26 SpeechAnalyzer keeps transcription on-device
2. **Low Latency**: On-device transcription is faster than cloud APIs
3. **Cost-Effective**: No Whisper API costs for transcription
4. **Fallback**: Can use OpenAI for complex parsing when needed
5. **Proven Architecture**: Audio processing already validated in workout app
6. **Native watchOS**: Full access to haptics, complications, Digital Crown

## Technical Notes

### watchOS Limitations
- No native SpeechRecognizer on watchOS (need iPhone companion or iOS 26 SpeechAnalyzer)
- Limited processing power (prefer server-side LLM)
- Battery constraints (optimize audio recording settings)

### Recommended Stack
- **Transcription**: iOS 26 SpeechAnalyzer (on-device)
- **Simple Commands**: Pattern matching + direct HA API
- **Complex Commands**: HA Conversation API or OpenAI GPT-4o
- **API Client**: URLSession with long-lived access token
- **Storage**: Keychain for tokens, UserDefaults for preferences

### Audio Settings (Optimized for Watch)
```swift
let settings: [String: Any] = [
    AVFormatIDKey: Int(kAudioFormatMPEG4AAC),
    AVSampleRateKey: 16000,      // 16kHz optimal for speech
    AVNumberOfChannelsKey: 1,     // Mono
    AVEncoderAudioQualityKey: AVAudioQuality.medium.rawValue,
    AVEncoderBitRateKey: 32000    // 32kbps for low latency & battery
]
```

## Next Steps

1. Implement iOS 26 SpeechAnalyzer integration
2. Create Home Assistant API client (REST + Conversation)
3. Build simple pattern matcher for common commands
4. Design watchOS UI with voice button + live transcription
5. Add haptic feedback for command confirmation
6. Test with real Home Assistant instance
