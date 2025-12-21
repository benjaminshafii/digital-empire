import Foundation
import SwiftUI
import OpenAI

// Keep existing data structures
struct FoodAnalysis: Codable {
    let items: [FoodItem]
    let totalCalories: Int?
    let totalProtein: Double?
    let totalCarbs: Double?
    let totalFat: Double?
    let totalFiber: Double?

    struct FoodItem: Codable {
        let name: String
        let quantity: String
        let estimatedCalories: Int?
        let protein: Double?
        let carbs: Double?
        let fat: Double?
        let fiber: Double?

        init(name: String, quantity: String, estimatedCalories: Int? = nil,
             protein: Double? = nil, carbs: Double? = nil, fat: Double? = nil,
             fiber: Double? = nil) {
            self.name = name
            self.quantity = quantity
            self.estimatedCalories = estimatedCalories
            self.protein = protein
            self.carbs = carbs
            self.fat = fat
            self.fiber = fiber
        }

        enum CodingKeys: String, CodingKey {
            case name, quantity, estimatedCalories, protein, carbs, fat, fiber
        }

        init(from decoder: Decoder) throws {
            let container = try decoder.container(keyedBy: CodingKeys.self)

            self.name = try container.decode(String.self, forKey: .name)

            // Handle quantity as either String or Number
            if let quantityString = try? container.decode(String.self, forKey: .quantity) {
                self.quantity = quantityString
            } else if let quantityInt = try? container.decode(Int.self, forKey: .quantity) {
                self.quantity = String(quantityInt)
            } else if let quantityDouble = try? container.decode(Double.self, forKey: .quantity) {
                self.quantity = String(quantityDouble)
            } else {
                self.quantity = "1"
            }

            self.estimatedCalories = try container.decodeIfPresent(Int.self, forKey: .estimatedCalories)
            self.protein = try container.decodeIfPresent(Double.self, forKey: .protein)
            self.carbs = try container.decodeIfPresent(Double.self, forKey: .carbs)
            self.fat = try container.decodeIfPresent(Double.self, forKey: .fat)
            self.fiber = try container.decodeIfPresent(Double.self, forKey: .fiber)
        }

        func encode(to encoder: Encoder) throws {
            var container = encoder.container(keyedBy: CodingKeys.self)
            try container.encode(name, forKey: .name)
            try container.encode(quantity, forKey: .quantity)
            try container.encodeIfPresent(estimatedCalories, forKey: .estimatedCalories)
            try container.encodeIfPresent(protein, forKey: .protein)
            try container.encodeIfPresent(carbs, forKey: .carbs)
            try container.encodeIfPresent(fat, forKey: .fat)
            try container.encodeIfPresent(fiber, forKey: .fiber)
        }
    }
}

struct VoiceAction: Codable, Equatable {
    enum ActionType: String, Codable, Equatable {
        case logWater = "log_water"
        case logFood = "log_food"
        case logSymptom = "log_symptom"
        case logVitamin = "log_vitamin"
        case logPUQE = "log_puqe"
        case addVitamin = "add_vitamin"
        case unknown = "unknown"
    }

    let type: ActionType
    let details: ActionDetails
    let confidence: Double

    struct ActionDetails: Codable, Equatable {
        let item: String?
        let amount: String?
        let unit: String?
        let calories: String?
        let severity: String?
        let mealType: String?
        let symptoms: [String]?
        let vitaminName: String?
        let notes: String?
        let timestamp: String?
        let frequency: String?
        let dosage: String?
        let timesPerDay: Int?
        let isCompoundMeal: Bool?
        let components: [MealComponent]?
    }

    struct MealComponent: Codable, Equatable {
        let name: String
        let quantity: String?
    }
}

struct VoiceTranscription: Codable {
    let text: String
    let duration: Double?
    let language: String?
}

struct FoodSuggestion: Codable {
    let food: String
    let reason: String
    let nutritionalBenefit: String?
    let preparationTip: String?
    let avoidIfHigh: Bool
}

class OpenAIManager: ObservableObject, @unchecked Sendable {
    nonisolated static let shared = OpenAIManager()

    @AppStorage("openAIKey") private var apiKey: String = ""
    @Published var isProcessing = false
    @Published var lastError: String?
    @Published var lastTranscription: String?
    @Published var detectedActions: [VoiceAction] = []

    private var client: OpenAI?
    private let maxRetries = 3
    private let initialRetryDelay: TimeInterval = 1.0

    private init() {
        setupClient()
    }

    private func setupClient() {
        guard !apiKey.isEmpty else { return }
        let configuration = OpenAI.Configuration(token: apiKey, timeoutInterval: 120.0)
        client = OpenAI(configuration: configuration)
    }

    var hasAPIKey: Bool {
        !apiKey.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }

    func setAPIKey(_ key: String) {
        apiKey = key
        setupClient()
    }

    // MARK: - Audio Transcription (using MacPaw library)

    func transcribeAudio(audioData: Data) async throws -> VoiceTranscription {
        guard hasAPIKey else {
            throw OpenAIError.noAPIKey
        }

        if client == nil {
            setupClient()
        }

        guard let unwrappedClient = client else {
            throw OpenAIError.noAPIKey
        }

        await MainActor.run {
            self.isProcessing = true
        }
        defer {
            Task { @MainActor in
                self.isProcessing = false
            }
        }

        return try await retryWithExponentialBackoff {
            let query = AudioTranscriptionQuery(
                file: audioData,
                fileType: .m4a,
                model: .whisper_1,
                responseFormat: .json
            )

            let result = try await unwrappedClient.audioTranscriptions(query: query)

            return VoiceTranscription(
                text: result.text,
                duration: nil,
                language: nil
            )
        }
    }

    // MARK: - Chat Completions with Structured Outputs
    // Note: Using raw HTTP for structured outputs as MacPaw library doesn't have full support yet

    private let baseURL = "https://api.openai.com/v1/chat/completions"

    func analyzeFood(imageData: Data) async throws -> FoodAnalysis {
        guard hasAPIKey else {
            throw OpenAIError.noAPIKey
        }

        isProcessing = true
        defer {
            DispatchQueue.main.async {
                self.isProcessing = false
            }
        }

        let base64Image = imageData.base64EncodedString()

        let messages: [[String: Any]] = [
            [
                "role": "system",
                "content": "Analyze food images for nutritional data. Be realistic with portions, account for cooking methods and condiments."
            ],
            [
                "role": "user",
                "content": [
                    ["type": "text", "text": "Provide nutritional analysis for this food image."],
                    ["type": "image_url", "image_url": ["url": "data:image/jpeg;base64,\(base64Image)"]]
                ]
            ]
        ]

        let jsonSchema: [String: Any] = [
            "name": "food_analysis_response",
            "strict": true,
            "schema": [
                "type": "object",
                "properties": [
                    "items": [
                        "type": "array",
                        "items": [
                            "type": "object",
                            "properties": [
                                "name": ["type": "string"],
                                "quantity": ["type": "string"],
                                "estimatedCalories": ["type": ["integer", "null"]],
                                "protein": ["type": ["number", "null"]],
                                "carbs": ["type": ["number", "null"]],
                                "fat": ["type": ["number", "null"]],
                                "fiber": ["type": ["number", "null"]]
                            ],
                            "required": ["name", "quantity", "estimatedCalories", "protein", "carbs", "fat", "fiber"],
                            "additionalProperties": false
                        ]
                    ],
                    "totalCalories": ["type": ["integer", "null"]],
                    "totalProtein": ["type": ["number", "null"]],
                    "totalCarbs": ["type": ["number", "null"]],
                    "totalFat": ["type": ["number", "null"]],
                    "totalFiber": ["type": ["number", "null"]]
                ],
                "required": ["items", "totalCalories", "totalProtein", "totalCarbs", "totalFat", "totalFiber"],
                "additionalProperties": false
            ]
        ]

        let requestBody: [String: Any] = [
            "model": "gpt-4o",
            "messages": messages,
   
            "response_format": [
                "type": "json_schema",
                "json_schema": jsonSchema
            ]
        ]

        return try await makeStructuredRequest(requestBody: requestBody, emoji: "📸")
    }

    // MARK: - Fast Classification

    struct IntentClassification: Codable {
        let hasAction: Bool
        let actionTypes: [String]
    }

    private func classifyIntent(transcript: String) async throws -> IntentClassification {
        print("🔍 ============================================")
        print("🔍 CLASSIFYING INTENT WITH GPT-4o-MINI")
        print("🔍 ============================================")

        let messages = [
            ["role": "system", "content": "You classify voice transcripts quickly. Determine if the user wants to log something."],
            ["role": "user", "content": "Does this transcript contain a request to log water, food, symptoms, vitamins, or PUQE score? Transcript: \"\(transcript)\""]
        ]

        let jsonSchema: [String: Any] = [
            "name": "intent_classification",
            "strict": true,
            "schema": [
                "type": "object",
                "properties": [
                    "hasAction": ["type": "boolean"],
                    "actionTypes": ["type": "array", "items": ["type": "string"]]
                ],
                "required": ["hasAction", "actionTypes"],
                "additionalProperties": false
            ]
        ]

        let requestBody: [String: Any] = [
            "model": "gpt-4o-mini",
            "messages": messages,
            "response_format": [
                "type": "json_schema",
                "json_schema": jsonSchema
            ]
        ]

        let result: IntentClassification = try await makeStructuredRequest(requestBody: requestBody, emoji: "🔍")
        print("🔍 Classification result: hasAction=\(result.hasAction), types=\(result.actionTypes)")
        return result
    }

    func extractVoiceActions(from transcript: String) async throws -> [VoiceAction] {
        guard hasAPIKey else {
            throw OpenAIError.noAPIKey
        }

        await MainActor.run {
            self.isProcessing = true
        }
        defer {
            Task { @MainActor in
                self.isProcessing = false
            }
        }

        // Step 1: Fast classification with gpt-5-mini
        let classification = try await classifyIntent(transcript: transcript)

        // If no action detected, return empty array quickly
        if !classification.hasAction {
            print("🔍 ✅ No action detected, skipping full extraction")
            return []
        }

        print("🔍 ✅ Action detected, proceeding with full extraction")

        let currentDate = Date()
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        let currentTimestamp = formatter.string(from: currentDate)

        let systemPrompt = """
        Extract logging actions from voice transcripts.
        Current time: \(currentTimestamp)
        Parse natural time references (breakfast=08:00, lunch=12:00, dinner=18:00).

        CRITICAL MEAL DISAMBIGUATION RULES:
        1. Detect compound meals vs. separate food items using context clues:
           - Conjunctions ("and", "with", "plus") usually indicate a SINGLE MEAL with multiple components
           - Sequential mentions ("then I had", "after that") indicate SEPARATE food items
           - Cooking context ("I made", "I cooked") indicates a SINGLE RECIPE/MEAL

        2. For COMPOUND MEALS (e.g., "porkchop and potatoes", "chicken with rice"):
           - Set isCompoundMeal: true
           - Set item to a descriptive meal name (e.g., "Porkchop with Potatoes")
           - List each component in components array with name and quantity
           - Calculate COMBINED calories for the entire meal

        3. For SEPARATE ITEMS (e.g., "I ate a banana then later had some chips"):
           - Create separate log_food actions
           - Set isCompoundMeal: false or null
           - Leave components null

        FEW-SHOT EXAMPLES:

        Example 1 - Compound meal:
        Input: "I ate porkchop and potatoes"
        Output: {
          "type": "log_food",
          "details": {
            "item": "Porkchop with Potatoes",
            "isCompoundMeal": true,
            "components": [
              {"name": "porkchop", "quantity": "1 piece"},
              {"name": "potatoes", "quantity": "1 serving"}
            ],
            "calories": "550"
          }
        }

        Example 2 - Separate items:
        Input: "I had a banana for breakfast, then later some crackers"
        Output: [
          {
            "type": "log_food",
            "details": {
              "item": "banana",
              "isCompoundMeal": false,
              "mealType": "breakfast",
              "timestamp": "08:00"
            }
          },
          {
            "type": "log_food",
            "details": {
              "item": "crackers",
              "isCompoundMeal": false
            }
          }
        ]

        Example 3 - Compound meal with cooking:
        Input: "I made chicken with broccoli and rice"
        Output: {
          "type": "log_food",
          "details": {
            "item": "Chicken with Broccoli and Rice",
            "isCompoundMeal": true,
            "components": [
              {"name": "chicken", "quantity": "1 breast"},
              {"name": "broccoli", "quantity": "1 cup"},
              {"name": "rice", "quantity": "1 cup"}
            ]
          }
        }

        Include full quantity/portion in food items when specified.
        """

        let messages = [
            ["role": "system", "content": systemPrompt],
            ["role": "user", "content": "Extract actions from: \"\(transcript)\""]
        ]

        let jsonSchema: [String: Any] = [
            "name": "voice_actions_response",
            "strict": true,
            "schema": [
                "type": "object",
                "properties": [
                    "actions": [
                        "type": "array",
                        "items": [
                            "type": "object",
                            "properties": [
                                "type": ["type": "string", "enum": ["log_water", "log_food", "log_symptom", "log_vitamin", "log_puqe", "add_vitamin", "unknown"]],
                                "confidence": ["type": "number", "minimum": 0, "maximum": 1],
                                "details": [
                                    "type": "object",
                                    "properties": [
                                        "item": ["type": ["string", "null"]],
                                        "amount": ["type": ["string", "null"]],
                                        "unit": ["type": ["string", "null"]],
                                        "calories": ["type": ["string", "null"]],
                                        "severity": ["type": ["string", "null"]],
                                        "mealType": ["type": ["string", "null"]],
                                        "symptoms": ["type": ["array", "null"], "items": ["type": "string"]],
                                        "vitaminName": ["type": ["string", "null"]],
                                        "notes": ["type": ["string", "null"]],
                                        "timestamp": ["type": ["string", "null"]],
                                        "frequency": ["type": ["string", "null"]],
                                        "dosage": ["type": ["string", "null"]],
                                        "timesPerDay": ["type": ["integer", "null"]],
                                        "isCompoundMeal": ["type": ["boolean", "null"]],
                                        "components": [
                                            "type": ["array", "null"],
                                            "items": [
                                                "type": "object",
                                                "properties": [
                                                    "name": ["type": "string"],
                                                    "quantity": ["type": ["string", "null"]]
                                                ],
                                                "required": ["name", "quantity"],
                                                "additionalProperties": false
                                            ]
                                        ]
                                    ],
                                    "required": ["item", "amount", "unit", "calories", "severity", "mealType", "symptoms", "vitaminName", "notes", "timestamp", "frequency", "dosage", "timesPerDay", "isCompoundMeal", "components"],
                                    "additionalProperties": false
                                ]
                            ],
                            "required": ["type", "confidence", "details"],
                            "additionalProperties": false
                        ]
                    ]
                ],
                "required": ["actions"],
                "additionalProperties": false
            ]
        ]

        let requestBody: [String: Any] = [
            "model": "gpt-4o",
            "messages": messages,

            "response_format": [
                "type": "json_schema",
                "json_schema": jsonSchema
            ]
        ]

        struct ActionsWrapper: Codable {
            let actions: [VoiceAction]
        }

        let wrapper: ActionsWrapper = try await makeStructuredRequest(requestBody: requestBody, emoji: "🎙️")
        print("🎙️ ✅ Successfully parsed \(wrapper.actions.count) voice actions!")
        return wrapper.actions
    }

    struct FoodMacros {
        let calories: Int
        let protein: Int
        let carbs: Int
        let fat: Int
    }

    func estimateFoodMacros(foodName: String) async throws -> FoodMacros {
        guard hasAPIKey else {
            throw OpenAIError.noAPIKey
        }

        print("🍔🍔🍔 ============================================")
        print("🍔🍔🍔 ESTIMATE FOOD MACROS - START")
        print("🍔🍔🍔 ============================================")
        print("🍔 Input Food Name: '\(foodName)'")
        print("🍔 Model: gpt-4o")
        print("🍔 Timestamp: \(Date())")

        let systemPrompt = """
        You are a precise nutrition calculator. Use your knowledge of USDA nutritional data to estimate food macros.

        PROCESS:
        1. Identify the food item(s) and any specified quantity
        2. Use standard USDA portion sizes (e.g., 1 medium banana, 1 cup rice, 1 chicken breast)
        3. If a quantity is specified (e.g., "3 bananas", "2 cups rice"), multiply accordingly
        4. For compound meals (e.g., "chicken with rice"), sum all components
        5. Verify calorie math: (protein×4) + (carbs×4) + (fat×9) ≈ total calories

        RULES:
        - Use realistic standard portions (medium size if not specified)
        - Round calories to nearest 5, macros to nearest whole number
        - For unknown foods, make reasonable estimates based on similar items
        - NEVER return zero values - always provide a nutritional estimate

        EXAMPLES:
        "3 bananas" → 315 cal, 81g carbs, 4g protein, 1g fat
        "porkchop with potatoes" → 430 cal, 37g carbs, 30g protein, 18g fat
        "corn" → 130 cal, 27g carbs, 5g protein, 2g fat (1 cup cooked)
        """

        let messages = [
            ["role": "system", "content": systemPrompt],
            ["role": "user", "content": "Calculate total nutrition for the exact quantity specified: \"\(foodName)\""]
        ]

        print("🍔 System Prompt Length: \(systemPrompt.count) characters")
        if let userMessage = messages[1]["content"] {
            print("🍔 User Message: '\(userMessage)'")
        }

        let jsonSchema: [String: Any] = [
            "name": "food_macros_response",
            "strict": true,
            "schema": [
                "type": "object",
                "properties": [
                    "calories": ["type": "integer", "description": "Total calories for the specified portion"],
                    "protein": ["type": "integer", "description": "Protein in grams"],
                    "carbs": ["type": "integer", "description": "Carbohydrates in grams"],
                    "fat": ["type": "integer", "description": "Fat in grams"]
                ],
                "required": ["calories", "protein", "carbs", "fat"],
                "additionalProperties": false
            ]
        ]

        let requestBody: [String: Any] = [
            "model": "gpt-4o",  // ✅ Upgraded from gpt-4o-mini
            "messages": messages,

            "response_format": [
                "type": "json_schema",
                "json_schema": jsonSchema
            ]
        ]

        print("🍔 Sending request to OpenAI...")
        let result: [String: Int] = try await makeStructuredRequest(requestBody: requestBody, emoji: "🍔")

        print("🍔🍔🍔 ============================================")
        print("🍔🍔🍔 OPENAI RESPONSE RECEIVED")
        print("🍔🍔🍔 ============================================")
        print("🍔 Calories: \(result["calories"]!)")
        print("🍔 Protein: \(result["protein"]!)g")
        print("🍔 Carbs: \(result["carbs"]!)g")
        print("🍔 Fat: \(result["fat"]!)g")

        let calories = result["calories"]!
        let protein = result["protein"]!
        let carbs = result["carbs"]!
        let fat = result["fat"]!

        // VALIDATION: Check macro math
        let calculatedCalories = (protein * 4) + (carbs * 4) + (fat * 9)
        let discrepancy = abs(calories - calculatedCalories)

        print("🍔 Validation - Calculated from macros: \(calculatedCalories) cal")
        print("🍔 Validation - Discrepancy: \(discrepancy) cal")

        if discrepancy > 50 {
            print("⚠️⚠️⚠️ WARNING: Large calorie discrepancy!")
            print("⚠️ Reported: \(calories) cal")
            print("⚠️ Calculated: \(calculatedCalories) cal")
            print("⚠️ Food: '\(foodName)'")
        }

        // Check for obviously wrong banana estimates
        if foodName.lowercased().contains("banana") && calories < 80 {
            print("⚠️⚠️⚠️ WARNING: Banana estimate seems too low!")
            print("⚠️ Got \(calories) cal for '\(foodName)'")
            print("⚠️ Expected ~105 cal per banana")
        }

        // Check for quantity multipliers
        let words = foodName.lowercased().components(separatedBy: .whitespaces)
        if let firstWord = words.first, let quantity = Int(firstWord), quantity > 1 {
            print("🍔 ✅ Detected quantity: \(quantity)")
            print("🍔 ✅ Calories per unit: ~\(calories / quantity)")
        }

        print("🍔🍔🍔 ============================================")

        return FoodMacros(
            calories: calories,
            protein: protein,
            carbs: carbs,
            fat: fat
        )
    }

    func generateFoodSuggestions(nauseaLevel: Int, preferences: [String] = []) async throws -> [FoodSuggestion] {
        guard hasAPIKey else {
            throw OpenAIError.noAPIKey
        }

        let prompt = """
        Suggest foods for a pregnant person with nausea level \(nauseaLevel)/10.
        Consider these preferences: \(preferences.joined(separator: ", "))

        Return 5 food suggestions in JSON format with:
        - food: name of the food
        - reason: why it's good for nausea
        - nutritionalBenefit: key nutrients
        - preparationTip: how to prepare it
        - avoidIfHigh: true if should avoid with high nausea
        """

        let messages = [
            ["role": "system", "content": "You are a nutrition expert specializing in pregnancy nutrition."],
            ["role": "user", "content": prompt]
        ]

        let jsonSchema: [String: Any] = [
            "name": "food_suggestions_response",
            "strict": true,
            "schema": [
                "type": "object",
                "properties": [
                    "suggestions": [
                        "type": "array",
                        "items": [
                            "type": "object",
                            "properties": [
                                "food": ["type": "string"],
                                "reason": ["type": "string"],
                                "nutritionalBenefit": ["type": "string"],
                                "preparationTip": ["type": "string"],
                                "avoidIfHigh": ["type": "boolean"]
                            ],
                            "required": ["food", "reason", "nutritionalBenefit", "preparationTip", "avoidIfHigh"],
                            "additionalProperties": false
                        ]
                    ]
                ],
                "required": ["suggestions"],
                "additionalProperties": false
            ]
        ]

        let requestBody: [String: Any] = [
            "model": "gpt-4o-mini",
            "messages": messages,
  
            "response_format": [
                "type": "json_schema",
                "json_schema": jsonSchema
            ]
        ]

        struct SuggestionsWrapper: Codable {
            let suggestions: [FoodSuggestion]
        }

        let wrapper: SuggestionsWrapper = try await makeStructuredRequest(requestBody: requestBody, emoji: "🥗")
        return wrapper.suggestions
    }

    // MARK: - Generic Structured Request Helper

    private func makeStructuredRequest<T: Decodable>(requestBody: [String: Any], emoji: String) async throws -> T {
        print("\(emoji) ============================================")
        print("\(emoji) MAKING REQUEST TO OPENAI")
        print("\(emoji) ============================================")

        let data = try JSONSerialization.data(withJSONObject: requestBody)

        // Log the request body
        if let requestString = String(data: data, encoding: .utf8) {
            print("\(emoji) REQUEST BODY:")
            print(requestString)
        }

        var request = URLRequest(url: URL(string: baseURL)!)
        request.httpMethod = "POST"
        request.setValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = data

        print("\(emoji) Sending request to: \(baseURL)")

        let (responseData, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw OpenAIError.invalidResponse
        }

        print("\(emoji) Response status code: \(httpResponse.statusCode)")

        guard httpResponse.statusCode == 200 else {
            // Log the actual error response from OpenAI
            print("\(emoji) ❌❌❌ ============================================")
            print("\(emoji) ❌❌❌ REQUEST FAILED")
            print("\(emoji) ❌❌❌ ============================================")
            if let errorJSON = try? JSONSerialization.jsonObject(with: responseData) as? [String: Any],
               let error = errorJSON["error"] as? [String: Any] {
                print("\(emoji) ❌ OpenAI API Error (\(httpResponse.statusCode)):")
                print("\(emoji) ❌ Error message: \(error["message"] ?? "no message")")
                print("\(emoji) ❌ Error type: \(error["type"] ?? "no type")")
                print("\(emoji) ❌ Error code: \(error["code"] ?? "no code")")
                print("\(emoji) ❌ Full error object: \(error)")
            } else if let errorString = String(data: responseData, encoding: .utf8) {
                print("\(emoji) ❌ OpenAI API Error (\(httpResponse.statusCode)):")
                print("\(emoji) ❌ Raw response: \(errorString)")
            }
            print("\(emoji) ❌❌❌ ============================================")
            throw OpenAIError.httpError(httpResponse.statusCode)
        }

        let json = try JSONSerialization.jsonObject(with: responseData) as? [String: Any]
        let content = json?["choices"] as? [[String: Any]]
        let message = content?.first?["message"] as? [String: Any]
        let text = message?["content"] as? String ?? ""

        print("\(emoji) ============================================")
        print("\(emoji) STRUCTURED OUTPUT RESPONSE")
        print("\(emoji) ============================================")
        print("\(emoji) JSON response: '\(text)'")

        do {
            let data = text.data(using: .utf8)!
            let result = try JSONDecoder().decode(T.self, from: data)
            print("\(emoji) ✅ Successfully parsed structured JSON!")
            print("\(emoji) ============================================")
            return result
        } catch {
            print("\(emoji) ❌ UNEXPECTED ERROR - structured outputs should never fail!")
            print("\(emoji) Error: \(error)")
            print("\(emoji) Raw response: \(text)")
            print("\(emoji) ============================================")
            throw OpenAIError.invalidResponse
        }
    }

    // MARK: - Retry Logic

    private func retryWithExponentialBackoff<T>(operation: @escaping () async throws -> T) async throws -> T {
        var lastError: Error?

        for attempt in 0..<maxRetries {
            do {
                return try await operation()
            } catch let error as OpenAIError {
                lastError = error

                switch error {
                case .rateLimitExceeded, .serverError:
                    if attempt < maxRetries - 1 {
                        let delay = initialRetryDelay * pow(2.0, Double(attempt))
                        print("🔄 Retry attempt \(attempt + 1)/\(maxRetries) after \(delay)s delay")
                        try await Task.sleep(nanoseconds: UInt64(delay * 1_000_000_000))
                        continue
                    }
                case .networkError:
                    if attempt < maxRetries - 1 {
                        let delay = initialRetryDelay * pow(1.5, Double(attempt))
                        print("🔄 Network retry \(attempt + 1)/\(maxRetries) after \(delay)s delay")
                        try await Task.sleep(nanoseconds: UInt64(delay * 1_000_000_000))
                        continue
                    }
                default:
                    throw error
                }

                throw error
            } catch {
                lastError = error

                if attempt < maxRetries - 1 {
                    let delay = initialRetryDelay * pow(1.5, Double(attempt))
                    print("🔄 Generic retry \(attempt + 1)/\(maxRetries) after \(delay)s delay")
                    try await Task.sleep(nanoseconds: UInt64(delay * 1_000_000_000))
                    continue
                }

                throw error
            }
        }

        throw lastError ?? OpenAIError.networkError
    }

    // MARK: - Error Types

    enum OpenAIError: LocalizedError {
        case noAPIKey
        case invalidResponse
        case httpError(Int)
        case apiError(String)
        case invalidRequest
        case networkError
        case audioTooLarge
        case rateLimitExceeded
        case serverError

        var errorDescription: String? {
            switch self {
            case .noAPIKey:
                return "OpenAI API key is required. Please add your API key in Settings."
            case .invalidResponse:
                return "Received invalid response from OpenAI. Please try again."
            case .httpError(let code):
                return getDetailedHTTPError(code)
            case .apiError(let message):
                return "OpenAI API error: \(message)"
            case .invalidRequest:
                return "The request format was invalid. Please try again."
            case .networkError:
                return "Network connection failed. Please check your internet connection."
            case .audioTooLarge:
                return "Audio file is too large (max 25MB). Please record shorter clips."
            case .rateLimitExceeded:
                return "Too many requests. Please wait a moment before trying again."
            case .serverError:
                return "OpenAI servers are experiencing issues. Please try again in a few minutes."
            }
        }

        private func getDetailedHTTPError(_ code: Int) -> String {
            switch code {
            case 400:
                return "Bad request. Please check the request format."
            case 401:
                return "Invalid API key. Please check your OpenAI API key in Settings."
            case 403:
                return "Access forbidden. Your API key may not have permission for this operation."
            case 429:
                return "Rate limit exceeded. You've made too many requests. Please wait and try again."
            case 500, 502, 503, 504:
                return "OpenAI server error (\(code)). The service is temporarily unavailable."
            default:
                return "HTTP error \(code). Please try again later."
            }
        }

        var recoverySuggestion: String? {
            switch self {
            case .noAPIKey:
                return "Go to Settings and add your OpenAI API key to enable AI features."
            case .networkError:
                return "Make sure you're connected to the internet and try again."
            case .rateLimitExceeded:
                return "Wait 30-60 seconds before making another request."
            case .audioTooLarge:
                return "Try recording in shorter segments (under 2 minutes)."
            case .httpError(401), .httpError(403):
                return "Verify your API key is correct and has not expired."
            case .serverError, .httpError(500...599):
                return "This is a temporary issue with OpenAI. Try again in 5-10 minutes."
            default:
                return nil
            }
        }
    }
}
