# HA Watch - Home Assistant Voice Control for Apple Watch

A fully voice-controlled Apple Watch app for Home Assistant, leveraging iOS 26's new SpeechAnalyzer framework and proven audio processing technology from the workout tracking app.

## Features

- **Privacy-First Voice Recognition**: Uses iOS 26 SpeechAnalyzer for on-device transcription
- **Natural Language Control**: Speak naturally to control your smart home
- **Fast & Efficient**: Optimized audio settings for watchOS battery life
- **Proven Technology**: Audio processing adapted from production workout app
- **Multiple Processing Modes**:
  - On-device transcription with SpeechAnalyzer (iOS 26+)
  - Fallback to OpenAI Whisper for complex scenarios
  - Direct Home Assistant Conversation API integration

## Voice Commands

See [VOICE_ACTIONS_SPEC.md](VOICE_ACTIONS_SPEC.md) for complete list of supported commands.

### Examples

- "Turn on kitchen lights"
- "Set thermostat to 72 degrees"
- "Lock front door"
- "Activate movie mode"
- "What's the temperature outside?"

## Architecture

```
┌─────────────────────┐
│   Apple Watch       │
│  Voice Input        │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  SpeechAnalyzer     │
│  (iOS 26 On-Device) │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Command Classifier  │
│ (Pattern/LLM)       │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Home Assistant API  │
│ (REST/Conversation) │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│   Smart Home        │
│   Control           │
└─────────────────────┘
```

## Requirements

- watchOS 11.0+
- iOS 18.0+ (for companion app features)
- Home Assistant instance with REST API enabled
- OpenAI API key (optional, for complex intent parsing)

## Setup

1. Configure Home Assistant URL and access token in Settings
2. (Optional) Add OpenAI API key for advanced parsing
3. Grant microphone permissions
4. Start speaking!

## Project Structure

```
HA Watch App/
├── Managers/
│   ├── VoiceRecognitionManager.swift    # Audio recording
│   ├── HAAPIClient.swift                # Home Assistant API
│   └── CommandClassifier.swift          # Intent parsing
├── Models/
│   ├── AppSettings.swift                # Configuration
│   └── HACommand.swift                  # Command models
├── Views/
│   ├── VoiceControlView.swift           # Main voice interface
│   └── SettingsView.swift               # Configuration
└── Utilities/
    └── KeychainHelper.swift             # Secure storage
```

## Technology Stack

- **Audio Processing**: AVFoundation (from workout app)
- **Speech-to-Text**: iOS 26 SpeechAnalyzer
- **Intent Classification**: Pattern matching + OpenAI GPT-4o (optional)
- **Home Assistant**: REST API + Conversation API
- **Storage**: Keychain for sensitive data

## Development Status

See [VOICE_ACTIONS_SPEC.md](VOICE_ACTIONS_SPEC.md) for implementation roadmap.

### Phase 1: MVP (Current)
- [x] Project setup
- [x] Audio recording infrastructure
- [ ] iOS 26 SpeechAnalyzer integration
- [ ] Home Assistant API client
- [ ] Basic lighting control

### Coming Soon
- Climate control
- Scene activation
- Media player control
- Advanced LLM parsing

## Credits

Audio processing technology adapted from the phoneless-hevy workout tracking app, which uses:
- OpenAI Whisper for transcription
- GPT-4o audio-preview for direct audio parsing
- Unified command classification with structured outputs

## License

MIT
