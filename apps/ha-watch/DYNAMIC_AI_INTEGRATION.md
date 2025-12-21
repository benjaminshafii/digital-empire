# Dynamic AI Integration for Home Assistant Watch App

## The Problem You Want to Solve

You want to say things like:
- "Use my Roborock to go to the kitchen and clean"
- "Turn off all lights in the bedroom"
- "Turn off light X" (without pre-configuring which light)
- **Dynamic Discovery**: "Hey, this light I just turned on/off, assign it to the bedroom"

Instead of hardcoding every entity, you want the AI to:
1. Discover all available devices dynamically
2. Understand context and relationships
3. Work with ANY device instantly
4. Learn and adapt to your setup

## The Solution: GPT-4o Function Calling + Dynamic Tool Discovery

Based on research, here's the proven approach:

### Architecture

```swift
┌─────────────────────────────┐
│  Voice Input                │
│  "Clean the kitchen"        │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│  iOS 26 SpeechAnalyzer      │ ← On-device transcription
│  Returns: "Clean kitchen"   │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│  GPT-4o Function Calling    │ ← THE MAGIC
│  With Dynamic Tools         │
└──────────────┬──────────────┘
               │
               ▼
      ┌────────┴─────────┐
      │                  │
      ▼                  ▼
┌──────────┐      ┌─────────────┐
│ Discover │      │ Execute     │
│ Tools    │      │ Action      │
│ (GET)    │      │ (POST)      │
└──────────┘      └─────────────┘
      │                  │
      ▼                  ▼
┌────────────────────────────────┐
│   Home Assistant REST API      │
│   - GET /api/states (all)      │
│   - GET /api/services (all)    │
│   - POST /api/services/vacuum  │
│   - POST /api/services/light   │
└────────────────────────────────┘
```

### How It Works

#### 1. **Dynamic Tool Discovery**

Instead of hardcoding tools, fetch them dynamically from Home Assistant:

```swift
class HADynamicTools {
    // Step 1: Discover all available entities
    func discoverEntities() async -> [Entity] {
        let url = "http://casaos.local:8123/api/states"
        let entities = await fetch(url) // Returns ALL entities
        
        // Group by domain
        let grouped = entities.groupBy { $0.domain }
        
        return grouped
        // Returns:
        // {
        //   "light": ["light.kitchen", "light.bedroom", ...],
        //   "vacuum": ["vacuum.roborock"],
        //   "switch": ["switch.coffee_maker"],
        //   ...
        // }
    }
    
    // Step 2: Discover all available services/actions
    func discoverServices() async -> [Service] {
        let url = "http://casaos.local:8123/api/services"
        let services = await fetch(url)
        
        return services
        // Returns:
        // {
        //   "vacuum": {
        //     "start": {...},
        //     "send_command": {
        //       "description": "Send a command to the vacuum",
        //       "fields": {
        //         "entity_id": {...},
        //         "command": {
        //           "description": "Command to execute",
        //           "example": "app_segment_clean"
        //         },
        //         "params": {...}
        //       }
        //     }
        //   },
        //   "light": {
        //     "turn_on": {...},
        //     "turn_off": {...}
        //   }
        // }
    }
    
    // Step 3: Get area/room assignments
    func getAreas() async -> [Area] {
        // Note: No direct REST API, need to use WebSocket or entity attributes
        // Workaround: Parse entity names or use HA Conversation API context
        
        let entities = await discoverEntities()
        let areas = entities
            .filter { $0.area_id != nil }
            .map { (entity: $0.entity_id, area: $0.area_id) }
        
        return areas
        // Returns:
        // [
        //   {entity: "light.kitchen_main", area: "kitchen"},
        //   {entity: "vacuum.roborock", area: "kitchen"}
        // ]
    }
}
```

#### 2. **Convert to GPT-4o Function Tools**

Transform HA services into GPT-4o function calling schema:

```swift
class GPT4oToolGenerator {
    func generateTools(from services: [Service], entities: [Entity]) -> [GPT4oTool] {
        var tools: [GPT4oTool] = []
        
        // For each HA service, create a GPT-4o tool
        for (domain, domainServices) in services {
            for (serviceName, serviceDetail) in domainServices {
                let tool = GPT4oTool(
                    type: "function",
                    function: GPT4oFunction(
                        name: "\(domain)_\(serviceName)",
                        description: serviceDetail.description,
                        parameters: GPT4oParameters(
                            type: "object",
                            properties: convertFieldsToProperties(serviceDetail.fields),
                            required: extractRequiredFields(serviceDetail.fields)
                        )
                    )
                )
                tools.append(tool)
            }
        }
        
        // Add special "smart" tools
        tools.append(createRoborockRoomCleanTool())
        tools.append(createAreaLightControlTool())
        tools.append(createEntityDiscoveryTool())
        
        return tools
    }
    
    // Example: Roborock room cleaning tool
    func createRoborockRoomCleanTool() -> GPT4oTool {
        return GPT4oTool(
            type: "function",
            function: GPT4oFunction(
                name: "roborock_clean_room",
                description: "Clean a specific room/area with Roborock vacuum",
                parameters: GPT4oParameters(
                    type: "object",
                    properties: [
                        "room": GPT4oProperty(
                            type: "string",
                            description: "Room name to clean (kitchen, bedroom, etc.)",
                            enum: ["kitchen", "bedroom", "living_room", "bathroom"]
                        )
                    ],
                    required: ["room"]
                )
            )
        )
    }
    
    // Example: Area-based light control
    func createAreaLightControlTool() -> GPT4oTool {
        return GPT4oTool(
            type: "function",
            function: GPT4oFunction(
                name: "control_area_lights",
                description: "Turn on/off all lights in a specific area",
                parameters: GPT4oParameters(
                    type: "object",
                    properties: [
                        "area": GPT4oProperty(
                            type: "string",
                            description: "Area/room name"
                        ),
                        "action": GPT4oProperty(
                            type: "string",
                            description: "Action to perform",
                            enum: ["turn_on", "turn_off", "toggle"]
                        )
                    ],
                    required: ["area", "action"]
                )
            )
        )
    }
}
```

#### 3. **GPT-4o Processes Voice Command**

Send transcribed text + dynamic tools to GPT-4o:

```swift
class HAVoiceAI {
    func processVoiceCommand(_ text: String) async -> HAResponse {
        // 1. Discover current state
        let entities = await HADynamicTools.discoverEntities()
        let services = await HADynamicTools.discoverServices()
        let areas = await HADynamicTools.getAreas()
        
        // 2. Generate tools dynamically
        let tools = GPT4oToolGenerator.generateTools(
            from: services,
            entities: entities
        )
        
        // 3. Build context-rich system prompt
        let systemPrompt = """
        You are a smart home assistant for Home Assistant.
        
        CURRENT STATE:
        \(buildCurrentState(entities, areas))
        
        AVAILABLE ROOMS/AREAS:
        \(areas.map { $0.name }.joined(separator: ", "))
        
        ROBOROCK VACUUM:
        - Entity ID: vacuum.roborock
        - Current location: \(getVacuumLocation())
        - Available rooms for cleaning:
          - Kitchen (room ID: 17)
          - Bedroom (room ID: 18)
          - Living Room (room ID: 19)
        
        CAPABILITIES:
        - You can control ANY device you see in CURRENT STATE
        - You can clean specific rooms with Roborock
        - You can control all lights in an area at once
        - When user mentions a light without details, ask which one
        
        IMPORTANT:
        - Always use the most specific tool available
        - For room cleaning, use vacuum.send_command with app_segment_clean
        - For area lights, filter entities by area_id
        """
        
        // 4. Call GPT-4o with function calling
        let response = await callGPT4o(
            model: "gpt-4o",
            messages: [
                Message(role: "system", content: systemPrompt),
                Message(role: "user", content: text)
            ],
            tools: tools,
            tool_choice: "auto"
        )
        
        // 5. Execute tool calls
        if let toolCalls = response.tool_calls {
            return await executeToolCalls(toolCalls)
        }
        
        return HAResponse(message: response.content)
    }
    
    func buildCurrentState(_ entities: [Entity], _ areas: [Area]) -> String {
        var state = ""
        
        // Group entities by area
        for area in areas {
            state += "\n\(area.name):\n"
            let areaEntities = entities.filter { $0.area_id == area.id }
            
            for entity in areaEntities {
                state += "  - \(entity.entity_id): \(entity.state)\n"
            }
        }
        
        return state
    }
}
```

#### 4. **Execute Tool Calls**

When GPT-4o returns function calls, execute them:

```swift
func executeToolCalls(_ toolCalls: [ToolCall]) async -> HAResponse {
    var results: [String] = []
    
    for toolCall in toolCalls {
        let result: String
        
        switch toolCall.function.name {
        case "roborock_clean_room":
            result = await executeRoborockClean(toolCall.arguments)
            
        case "control_area_lights":
            result = await executeAreaLightControl(toolCall.arguments)
            
        case "light_turn_on", "light_turn_off":
            result = await executeLightControl(toolCall.arguments)
            
        default:
            // Generic service call
            result = await executeGenericService(toolCall)
        }
        
        results.append(result)
    }
    
    return HAResponse(message: results.joined(separator: "\n"))
}

// Roborock room cleaning implementation
func executeRoborockClean(_ args: [String: Any]) async -> String {
    let room = args["room"] as! String
    
    // Map room name to room ID (from HA configuration)
    let roomMap = [
        "kitchen": 17,
        "bedroom": 18,
        "living_room": 19,
        "bathroom": 20
    ]
    
    guard let roomId = roomMap[room] else {
        return "Unknown room: \(room)"
    }
    
    // Call Roborock service
    let url = "http://casaos.local:8123/api/services/vacuum/send_command"
    let body = [
        "entity_id": "vacuum.roborock",
        "command": "app_segment_clean",
        "params": [roomId, 1] // room ID, repeat count
    ]
    
    await callHAService(url: url, body: body)
    
    return "Started cleaning \(room)"
}

// Area light control implementation
func executeAreaLightControl(_ args: [String: Any]) async -> String {
    let area = args["area"] as! String
    let action = args["action"] as! String
    
    // Find all lights in this area
    let entities = await HADynamicTools.discoverEntities()
    let lightsInArea = entities.filter {
        $0.domain == "light" && 
        $0.area_name?.lowercased() == area.lowercased()
    }
    
    if lightsInArea.isEmpty {
        return "No lights found in \(area)"
    }
    
    // Turn on/off each light
    for light in lightsInArea {
        let url = "http://casaos.local:8123/api/services/light/\(action)"
        let body = ["entity_id": light.entity_id]
        await callHAService(url: url, body: body)
    }
    
    return "\(action.replacingOccurrences(of: "_", with: " ")) \(lightsInArea.count) lights in \(area)"
}
```

### Handling Your Specific Use Cases

#### Use Case 1: "Use my Roborock to go to the kitchen and clean"

```swift
// User says: "Use my Roborock to go to the kitchen and clean"

// 1. SpeechAnalyzer transcribes
let text = "Use my Roborock to go to the kitchen and clean"

// 2. GPT-4o sees tools and current state
// System knows:
// - vacuum.roborock exists
// - Kitchen is room ID 17
// - roborock_clean_room tool is available

// 3. GPT-4o returns tool call:
{
  "tool_calls": [{
    "function": {
      "name": "roborock_clean_room",
      "arguments": {
        "room": "kitchen"
      }
    }
  }]
}

// 4. Execute:
POST /api/services/vacuum/send_command
{
  "entity_id": "vacuum.roborock",
  "command": "app_segment_clean",
  "params": [17, 1]
}

// 5. Response: "Started cleaning kitchen"
```

#### Use Case 2: "Turn off all lights in the bedroom"

```swift
// User says: "Turn off all lights in the bedroom"

// GPT-4o returns:
{
  "tool_calls": [{
    "function": {
      "name": "control_area_lights",
      "arguments": {
        "area": "bedroom",
        "action": "turn_off"
      }
    }
  }]
}

// Execution finds all lights:
// - light.bedroom_main
// - light.bedroom_nightstand_left
// - light.bedroom_nightstand_right

// Turns them all off
// Response: "Turned off 3 lights in bedroom"
```

#### Use Case 3: "Turn off light X" (without knowing which light)

```swift
// User says: "Turn off the kitchen light"

// Problem: Multiple kitchen lights exist
// - light.kitchen_main
// - light.kitchen_counter
// - light.kitchen_island

// GPT-4o can either:
// A) Ask for clarification
{
  "content": "I found 3 lights in the kitchen: main, counter, and island. Which one?"
}

// B) Use smart defaults (main light)
{
  "tool_calls": [{
    "function": {
      "name": "light_turn_off",
      "arguments": {
        "entity_id": "light.kitchen_main"
      }
    }
  }]
}

// C) Turn them all off if user says "all"
"Turn off all kitchen lights" → turns off all 3
```

#### Use Case 4: **Dynamic Discovery - "This light I just turned on/off, assign it to bedroom"**

This is the COOLEST feature! Learn from user interactions:

```swift
class HALearning {
    // Track recent state changes
    var recentStateChanges: [(entity: String, timestamp: Date)] = []
    
    func trackStateChange(_ entity: String) {
        recentStateChanges.append((entity, Date()))
        
        // Keep only last 30 seconds
        let cutoff = Date().addingTimeInterval(-30)
        recentStateChanges = recentStateChanges.filter { $0.timestamp > cutoff }
    }
    
    // When user says: "Assign this light to the bedroom"
    func assignToArea(_ command: String) async -> String {
        // 1. GPT-4o extracts: target_area = "bedroom", device_type = "light"
        
        // 2. Find most recently changed light
        let recentLights = recentStateChanges.filter {
            $0.entity.starts(with: "light.")
        }
        
        guard let lastLight = recentLights.last else {
            return "No recent light changes detected"
        }
        
        // 3. Update area assignment (via HA entity registry)
        // Note: This requires WebSocket API or custom service
        await updateEntityArea(
            entityId: lastLight.entity,
            areaName: "bedroom"
        )
        
        return "Assigned \(lastLight.entity) to bedroom"
    }
    
    // Alternative: Use GPT-4o to learn patterns
    func learnFromInteraction(_ userCommand: String, _ result: String) async {
        // Build context from interaction
        let context = """
        User said: \(userCommand)
        Result: \(result)
        Recent changes: \(recentStateChanges.map { $0.entity })
        """
        
        // Ask GPT-4o to extract learning
        let learning = await callGPT4o(
            model: "gpt-4o",
            messages: [Message(
                role: "system",
                content: """
                Extract structured learning from this interaction.
                
                If user is assigning a device to an area, return:
                {
                  "action": "assign_area",
                  "entity_id": "light.xxx",
                  "area": "bedroom"
                }
                """
            )],
            response_format: { "type": "json_object" }
        )
        
        // Store learning for future use
        await saveUserPreference(learning)
    }
}
```

### Complete Example Flow

```swift
// SCENARIO: "Use my Roborock to clean the kitchen, then turn off all bedroom lights"

// 1. Transcribe
let text = await SpeechAnalyzer.transcribe(audioURL)
// "use my roborock to clean the kitchen then turn off all bedroom lights"

// 2. Discover current state
let entities = await discoverEntities()
let services = await discoverServices()
let tools = generateTools(from: services, entities)

// 3. Call GPT-4o
let response = await callGPT4o(
    messages: [
        Message(role: "system", content: systemPrompt),
        Message(role: "user", content: text)
    ],
    tools: tools
)

// 4. GPT-4o returns MULTIPLE tool calls:
{
  "tool_calls": [
    {
      "id": "call_1",
      "function": {
        "name": "roborock_clean_room",
        "arguments": {"room": "kitchen"}
      }
    },
    {
      "id": "call_2",
      "function": {
        "name": "control_area_lights",
        "arguments": {"area": "bedroom", "action": "turn_off"}
      }
    }
  ]
}

// 5. Execute sequentially
await executeRoborockClean({"room": "kitchen"})
// → POST /api/services/vacuum/send_command
// → Started cleaning kitchen

await executeAreaLightControl({"area": "bedroom", "action": "turn_off"})
// → POST /api/services/light/turn_off (3 entities)
// → Turned off 3 lights in bedroom

// 6. Response to user
"Started cleaning kitchen and turned off 3 lights in bedroom"
```

### Key Implementation Files

```
HA Watch App/
├── AI/
│   ├── GPT4oClient.swift              # OpenAI function calling
│   ├── DynamicToolGenerator.swift     # Convert HA → GPT-4o tools
│   └── VoiceCommandProcessor.swift    # Main orchestrator
├── Services/
│   ├── HADiscoveryService.swift       # GET /api/states, /api/services
│   ├── HAExecutionService.swift       # POST /api/services/*
│   └── HALearningService.swift        # Track & learn from interactions
└── Models/
    ├── Entity.swift                   # HA entity model
    ├── Service.swift                  # HA service model
    ├── GPT4oTool.swift                # Function calling schema
    └── ToolCall.swift                 # Tool execution result
```

### Cost Analysis

**Per Voice Command:**
- SpeechAnalyzer: $0.00 (on-device)
- GPT-4o input (~2000 tokens): $0.005
- GPT-4o output (~200 tokens): $0.003
- **Total: ~$0.008 per command**

**Optimizations:**
1. Cache discovered entities (refresh every 5 min): Saves API calls
2. Use GPT-4o-mini for simple commands: $0.001 per command
3. Pattern matching for common commands: $0.00

**Monthly cost (100 commands):**
- Without caching: $0.80
- With caching + mini: $0.10-0.20

### Roborock Room Cleaning - Special Notes

Based on research, Roborock uses:

```swift
// Method 1: Room cleaning (recommended)
POST /api/services/vacuum/send_command
{
  "entity_id": "vacuum.roborock",
  "command": "app_segment_clean",
  "params": [17, 1]  // [room_id, repeat_count]
}

// Method 2: Zone cleaning (for specific coordinates)
POST /api/services/vacuum/send_command
{
  "entity_id": "vacuum.roborock",
  "command": "app_zoned_clean",
  "params": [[30600,23700,28900,27800,1]]  // [x1,y1,x2,y2,repeat]
}

// Method 3: Go to location
POST /api/services/vacuum/send_command
{
  "entity_id": "vacuum.roborock",
  "command": "app_goto_target",
  "params": [23400, 24300]  // [x, y]
}
```

**How to get room IDs:**
1. Use HA Developer Tools → Services
2. Call `vacuum.send_command` → check Roborock app room list
3. Or use Playwright to scrape from HA UI

### Pros of This Approach

✅ **Zero Hardcoding**: Discovers ALL devices dynamically  
✅ **Works with ANY HA Setup**: No configuration needed  
✅ **Smart Context**: GPT-4o understands rooms, areas, relationships  
✅ **Complex Commands**: "Clean kitchen then turn off lights"  
✅ **Learning**: Can assign devices to areas dynamically  
✅ **Cost-Effective**: ~$0.01 per command with caching  
✅ **Future-Proof**: New devices auto-discovered  

### Cons

❌ **Latency**: ~1-2s for GPT-4o processing (vs <500ms direct API)  
❌ **Requires Internet**: GPT-4o is cloud-based  
❌ **Token Costs**: Small but ongoing  

### Hybrid Recommendation

Use both approaches:

```swift
// Fast path: Simple commands (pattern matching)
if text.matches("turn on kitchen light") {
    await directHACall() // 300ms, $0
}

// Smart path: Complex commands (GPT-4o)
else if text.contains("roborock") || text.contains("all lights") {
    await gpt4oProcessing() // 1500ms, $0.008
}

// Learning path: Teaching commands
else if text.contains("assign") || text.contains("this light") {
    await learningMode() // Uses recent state changes
}
```

## Next Steps

1. ✅ Implement `HADiscoveryService` (GET states, services, areas)
2. ✅ Implement `GPT4oClient` with function calling
3. ✅ Create `DynamicToolGenerator` to convert HA → GPT-4o format
4. ✅ Build `VoiceCommandProcessor` orchestrator
5. ✅ Add `HALearningService` for dynamic discovery
6. ✅ Test with real Roborock and lights

This gives you the flexibility and intelligence you're looking for! 🚀
