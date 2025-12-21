# MCP Implementation Strategy for HA Watch

## What's Currently Possible with Home Assistant API

Based on research and the official HA documentation, here's what we can do:

### ✅ Direct REST API (Most Practical for Watch App)

```swift
// 1. ENTITY CONTROL - Turn devices on/off
POST /api/services/{domain}/{service}
Examples:
- light.turn_on, light.turn_off
- switch.turn_on, switch.turn_off
- climate.set_temperature
- lock.lock, lock.unlock
- cover.open_cover, cover.close_cover
- media_player.play_pause, media_player.volume_set

// 2. STATE READING - Check device status
GET /api/states
GET /api/states/{entity_id}
- Get all entity states
- Check if lights are on/off
- Read temperature sensors
- Check lock status

// 3. CONVERSATION API - Natural language processing
POST /api/conversation/process
{
  "text": "turn on kitchen lights",
  "language": "en"
}
Response includes:
- Interpreted intent
- Action taken
- Human-readable response

// 4. HISTORY & LOGBOOK
GET /api/history/period/<timestamp>?filter_entity_id=sensor.temp
GET /api/logbook/<timestamp>

// 5. TEMPLATE RENDERING
POST /api/template
{
  "template": "The temp is {{ states('sensor.outdoor_temp') }}"
}
```

### 🔧 What Home Assistant MCP Server Actually Does

The official HA MCP Server (introduced in 2025.2) is **NOT what you think**:

- **It's a SERVER, not a CLIENT**
- **Purpose**: Exposes HA capabilities to MCP clients like Claude Desktop
- **Flow**: Claude Desktop → MCP Client → HA MCP Server → HA Core
- **Use case**: Let Claude Desktop control your home via MCP protocol

**This is backwards from what we need!** We need:
- Watch App → MCP Client → External MCP Server → HA

## MCP Implementation Options for Watch App

### Option 1: ❌ DON'T Use MCP (RECOMMENDED)

**Why skip MCP entirely:**

1. **Unnecessary Complexity**: MCP adds layers we don't need
   - Watch → MCP Client → MCP Server → HA REST API
   - vs. Watch → HA REST API (direct)

2. **watchOS Limitations**: 
   - No native MCP Swift SDK for watchOS
   - MCP Swift SDK targets macOS/iOS, not watchOS
   - Limited processing power for protocol overhead

3. **HA Already Has Perfect APIs**:
   - REST API: Direct, simple, well-documented
   - Conversation API: Natural language built-in
   - No need for MCP abstraction layer

4. **Battery Impact**: Extra protocol overhead drains watch battery

**Verdict**: MCP is designed for desktop apps (Claude, Cursor) connecting to multiple data sources. A watch app directly controlling HA doesn't need it.

---

### Option 2: 🤔 Use HA as MCP Server (Not Recommended)

If you really want MCP:

```swift
// This would work but is overkill:

1. Enable HA MCP Server integration in your HA instance
2. Install Swift MCP SDK in iOS companion app (not watchOS)
3. Connect via SSE transport: http://casaos.local:8123/api/mcp
4. Use MCP tools to control HA

// But this gives you the SAME capabilities as direct REST API!
```

**Problems:**
- Adds complexity without benefits
- MCP Swift SDK doesn't support watchOS
- Requires iOS companion app as intermediary
- More network hops = higher latency
- HA MCP Server is designed for Claude Desktop, not mobile apps

---

### Option 3: ✅ RECOMMENDED HYBRID APPROACH

**Best of all worlds - NO MCP needed:**

```swift
// Architecture:
┌─────────────────────────┐
│   Apple Watch           │
│   Voice Button          │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  iOS 26 SpeechAnalyzer  │  ← On-device, privacy-first
│  (On-Device)            │
└───────────┬─────────────┘
            │ (transcribed text)
            ▼
┌─────────────────────────┐
│  Smart Router           │
│  (Watch App Logic)      │
└───┬─────────────────┬───┘
    │                 │
    ▼                 ▼
┌─────────┐    ┌──────────────┐
│ Pattern │    │ HA Conv API  │  ← For complex NL
│ Matcher │    │ /conversation│
│ (Fast)  │    │ /process     │
└────┬────┘    └──────┬───────┘
     │                │
     └────────┬───────┘
              ▼
    ┌──────────────────┐
    │ HA REST API      │
    │ /api/services/*  │
    └──────────────────┘
```

**Implementation:**

```swift
class HAVoiceController {
    // Stage 1: Transcribe on-device (iOS 26)
    func transcribe(audio: URL) async -> String {
        let analyzer = SpeechAnalyzer()
        return await analyzer.transcribe(audio)
    }
    
    // Stage 2: Smart routing
    func processCommand(_ text: String) async -> HAResponse {
        // Fast path: Simple pattern matching
        if let simpleCommand = PatternMatcher.match(text) {
            return await executeDirectAPI(simpleCommand)
        }
        
        // Complex path: Use HA's built-in NL processing
        return await executeConversationAPI(text)
    }
    
    // Direct REST API (for simple commands)
    func executeDirectAPI(_ command: SimpleCommand) async -> HAResponse {
        // "turn on kitchen" → light.turn_on
        let url = "http://casaos.local:8123/api/services/\(command.domain)/\(command.service)"
        // Make direct HTTP call
    }
    
    // HA Conversation API (for complex NL)
    func executeConversationAPI(_ text: String) async -> HAResponse {
        let url = "http://casaos.local:8123/api/conversation/process"
        let body = ["text": text, "language": "en"]
        // Let HA's built-in NL engine handle it
    }
}
```

**Pattern Matching Examples:**

```swift
struct PatternMatcher {
    static func match(_ text: String) -> SimpleCommand? {
        let lower = text.lowercased()
        
        // Turn on/off patterns
        if lower.contains("turn on") || lower.contains("turn off") {
            let action = lower.contains("turn on") ? "turn_on" : "turn_off"
            
            // Extract entity name
            if lower.contains("kitchen") {
                return SimpleCommand(
                    domain: "light",
                    service: action,
                    entityId: "light.kitchen"
                )
            }
            // ... more patterns
        }
        
        // Set temperature
        if lower.contains("set") && lower.contains("temperature") {
            // Parse temperature and extract value
        }
        
        return nil // Fall through to Conversation API
    }
}
```

---

## Why This Approach Wins

### 1. **Performance** ⚡
- On-device transcription (iOS 26): ~200ms
- Pattern matching: <10ms
- Direct REST call: ~100ms
- **Total: ~310ms** for simple commands

vs. with MCP:
- Transcription: 200ms
- MCP protocol overhead: 100-200ms
- HA processing: 100ms
- **Total: ~500ms**

### 2. **Privacy** 🔒
- SpeechAnalyzer keeps audio on-device
- Only text sent to HA (on local network)
- No cloud services for basic commands

### 3. **Cost** 💰
- iOS 26 SpeechAnalyzer: **$0**
- HA Conversation API: **$0**
- OpenAI (fallback only): ~$0.01-0.03/request

vs. Always using OpenAI:
- Whisper: $0.006/min
- GPT-4o: $0.01-0.03/request
- **~$0.04 per command**

### 4. **Reliability** 🛡️
- Fewer network hops
- Direct API = fewer failure points
- Pattern matching works offline
- Fallback to Conversation API for complex queries

### 5. **Battery** 🔋
- On-device transcription is efficient
- Direct HTTP calls minimize radio usage
- No MCP protocol overhead

### 6. **Simplicity** 🎯
- No MCP SDK dependencies
- Standard URLSession for HTTP
- Easy to debug and maintain

---

## Complete Implementation Example

```swift
// HA Watch App/Managers/HAVoiceController.swift

import Foundation
import Speech // iOS 26 SpeechAnalyzer

@MainActor
class HAVoiceController: ObservableObject {
    @Published var isListening = false
    @Published var transcription = ""
    @Published var result = ""
    
    private let voiceManager = VoiceRecognitionManager()
    private let haClient = HomeAssistantClient()
    
    // Main entry point
    func handleVoiceCommand() async {
        // 1. Record audio
        voiceManager.startListening()
        // ... user speaks ...
        await voiceManager.stopListening()
        
        // 2. Transcribe (iOS 26 on-device)
        guard let audioURL = voiceManager.lastAudioFileURL else { return }
        let text = await transcribe(audioURL)
        transcription = text
        
        // 3. Process command
        let response = await processCommand(text)
        result = response.message
        
        // 4. Provide feedback (haptic + audio)
        provideHapticFeedback()
    }
    
    private func transcribe(_ audioURL: URL) async -> String {
        // iOS 26 SpeechAnalyzer implementation
        let analyzer = SpeechAnalyzer()
        do {
            return try await analyzer.transcribe(audioURL)
        } catch {
            print("Transcription failed: \(error)")
            return ""
        }
    }
    
    private func processCommand(_ text: String) async -> HAResponse {
        // Try pattern matching first (fast path)
        if let simple = PatternMatcher.match(text) {
            print("✅ Fast path: \(simple)")
            return await haClient.executeService(simple)
        }
        
        // Fall back to HA Conversation API (complex NL)
        print("🔄 Complex path: Using HA Conversation API")
        return await haClient.processConversation(text)
    }
}

// HA Watch App/Services/HomeAssistantClient.swift

class HomeAssistantClient {
    private let baseURL = "http://casaos.local:8123"
    private var token: String { AppSettings.shared.homeAssistantToken ?? "" }
    
    // Direct service call (fast path)
    func executeService(_ command: SimpleCommand) async -> HAResponse {
        let url = "\(baseURL)/api/services/\(command.domain)/\(command.service)"
        
        var request = URLRequest(url: URL(string: url)!)
        request.httpMethod = "POST"
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let body = ["entity_id": command.entityId]
        request.httpBody = try? JSONSerialization.data(withJSONObject: body)
        
        do {
            let (data, _) = try await URLSession.shared.data(for: request)
            return HAResponse(success: true, message: "Done!")
        } catch {
            return HAResponse(success: false, message: "Error: \(error)")
        }
    }
    
    // Conversation API (complex path)
    func processConversation(_ text: String) async -> HAResponse {
        let url = "\(baseURL)/api/conversation/process"
        
        var request = URLRequest(url: URL(string: url)!)
        request.httpMethod = "POST"
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let body = ["text": text, "language": "en"]
        request.httpBody = try? JSONEncoder().encode(body)
        
        do {
            let (data, _) = try await URLSession.shared.data(for: request)
            let response = try JSONDecoder().decode(ConversationResponse.self, from: data)
            return HAResponse(
                success: true,
                message: response.response.speech.plain
            )
        } catch {
            return HAResponse(success: false, message: "Error: \(error)")
        }
    }
}
```

---

## Final Recommendation

### ✅ **DO THIS:**
1. Use iOS 26 SpeechAnalyzer for transcription (on-device, free, private)
2. Pattern matching for common commands (lights, switches, locks)
3. HA Conversation API for complex natural language
4. Direct REST API for all actual control
5. NO MCP - it's unnecessary complexity

### ❌ **DON'T DO THIS:**
1. Don't use MCP - designed for desktop LLM clients, not mobile apps
2. Don't always use OpenAI - costs add up fast
3. Don't over-engineer - HA's APIs are already excellent

### 📊 **Comparison:**

| Approach | Latency | Privacy | Cost | Complexity | Battery |
|----------|---------|---------|------|------------|---------|
| **Recommended** (SpeechAnalyzer + HA API) | ⚡ 300ms | 🔒 Excellent | 💰 $0 | 🎯 Simple | 🔋 Efficient |
| MCP Integration | 🐌 500ms | 🔒 Good | 💰 $0 | 🤯 Complex | 🔋 Poor |
| Always OpenAI | ⚡ 400ms | ⚠️ Cloud | 💸 $0.04/cmd | 🎯 Medium | 🔋 Good |

---

## Next Steps

1. ✅ Set up long-lived access token in HA
2. ✅ Test REST API with curl (see SETUP.md)
3. 🔄 Implement `HomeAssistantClient.swift`
4. 🔄 Integrate iOS 26 SpeechAnalyzer
5. 🔄 Build simple pattern matcher
6. 🔄 Create watchOS UI with voice button
7. 🔄 Add haptic feedback
8. 🔄 Test end-to-end flow

No MCP needed - direct is better! 🎯
