import SwiftUI

struct PUQEFoodSuggestionsView: View {
    let puqeScore: PUQEScore
    @StateObject private var openAIManager = OpenAIManager.shared
    @StateObject private var photoLogManager = PhotoFoodLogManager()
    @State private var suggestions: [FoodSuggestion] = []
    @State private var isLoading = false
    @State private var errorMessage: String?
    @Environment(\.dismiss) var dismiss
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 20) {
                    scoreOverviewCard
                    
                    if isLoading {
                        ProgressView("Analyzing your food patterns...")
                            .padding()
                    } else if !suggestions.isEmpty {
                        suggestionsSection
                    } else if errorMessage != nil {
                        errorCard
                    }
                    
                    recentFoodsCard
                    
                    tipsCard
                }
                .padding(.vertical)
            }
            .navigationTitle("Food Recommendations")
            .navigationBarItems(trailing: Button("Done") { dismiss() })
            .task {
                await loadSuggestions()
            }
        }
    }
    
    private var scoreOverviewCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                VStack(alignment: .leading) {
                    Text("Current PUQE Score")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    
                    HStack(alignment: .bottom, spacing: 4) {
                        Text("\(puqeScore.totalScore)")
                            .font(.system(size: 36, weight: .bold))
                            .foregroundColor(puqeScore.severity.color)
                        Text(puqeScore.severity.rawValue)
                            .font(.subheadline)
                            .foregroundColor(puqeScore.severity.color)
                    }
                }
                
                Spacer()
                
                Image(systemName: severityIcon)
                    .font(.system(size: 40))
                    .foregroundColor(puqeScore.severity.color)
            }
            
            Text(severityMessage)
                .font(.subheadline)
                .foregroundColor(.secondary)
                .padding(.top, 4)
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(radius: 2)
        .padding(.horizontal)
    }
    
    private var suggestionsSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Recommended Foods")
                .font(.headline)
                .padding(.horizontal)
            
            ForEach(suggestions, id: \.food) { suggestion in
                FoodSuggestionCard(suggestion: suggestion)
            }
        }
    }
    
    private var recentFoodsCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Recent Foods to Avoid")
                .font(.headline)
                .foregroundColor(.red)
            
            let recentFoods = getProblematicFoods()
            
            if recentFoods.isEmpty {
                Text("No problematic foods identified yet")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            } else {
                ForEach(recentFoods, id: \.self) { food in
                    HStack {
                        Image(systemName: "xmark.circle.fill")
                            .foregroundColor(.red)
                            .font(.caption)
                        
                        Text(food)
                            .font(.subheadline)
                        
                        Spacer()
                    }
                }
            }
        }
        .padding()
        .background(Color(.secondarySystemBackground))
        .cornerRadius(12)
        .padding(.horizontal)
    }
    
    private var tipsCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            Label("General Tips", systemImage: "lightbulb.fill")
                .font(.headline)
                .foregroundColor(.blue)
            
            ForEach(getTips(), id: \.self) { tip in
                HStack(alignment: .top) {
                    Text("•")
                        .foregroundColor(.blue)
                    Text(tip)
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
            }
        }
        .padding()
        .background(Color(.secondarySystemBackground))
        .cornerRadius(12)
        .padding(.horizontal)
    }
    
    private var errorCard: some View {
        VStack(spacing: 12) {
            Image(systemName: "exclamationmark.triangle")
                .font(.largeTitle)
                .foregroundColor(.orange)
            
            Text(errorMessage ?? "Unable to generate suggestions")
                .font(.subheadline)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
            
            Button("Try Again") {
                Task {
                    await loadSuggestions()
                }
            }
            .buttonStyle(.borderedProminent)
        }
        .padding()
        .background(Color(.secondarySystemBackground))
        .cornerRadius(12)
        .padding(.horizontal)
    }
    
    private var severityIcon: String {
        switch puqeScore.severity {
        case .mild: return "face.smiling"
        case .moderate: return "face.neutral"
        case .severe: return "face.sad"
        }
    }
    
    private var severityMessage: String {
        switch puqeScore.severity {
        case .mild:
            return "Your symptoms are mild. Focus on maintaining good nutrition."
        case .moderate:
            return "Moderate symptoms detected. Try these gentler food options."
        case .severe:
            return "Severe symptoms require careful food choices. Consider consulting your doctor."
        }
    }
    
    private func loadSuggestions() async {
        isLoading = true
        errorMessage = nil
        
        do {
            let recentFoods = getRecentFoodNames()
            suggestions = try await openAIManager.generateFoodSuggestions(
                nauseaLevel: puqeScore.totalScore,
                preferences: recentFoods
            )
        } catch {
            errorMessage = error.localizedDescription
        }
        
        isLoading = false
    }
    
    private func getRecentFoodNames() -> [String] {
        let last24Hours = Date().addingTimeInterval(-24 * 60 * 60)
        
        return photoLogManager.photoLogs
            .filter { $0.date >= last24Hours }
            .flatMap { log -> [String] in
                if let items = log.aiAnalysis?.items {
                    return items.map { $0.name }
                }
                if let notes = log.notes?.components(separatedBy: ",").first {
                    return [notes]
                }
                return []
            }
    }
    
    private func getProblematicFoods() -> [String] {
        let commonTriggers = ["coffee", "spicy foods", "fatty foods", "dairy", "citrus"]
        let recentFoods = getRecentFoodNames()
        
        return commonTriggers.filter { trigger in
            recentFoods.contains { food in
                food.lowercased().contains(trigger.lowercased())
            }
        }
    }
    
    private func getTips() -> [String] {
        switch puqeScore.severity {
        case .mild:
            return [
                "Eat small, frequent meals throughout the day",
                "Stay hydrated with small sips of water",
                "Avoid lying down immediately after eating",
                "Keep crackers by your bedside for morning nausea"
            ]
        case .moderate:
            return [
                "Try the BRAT diet (Bananas, Rice, Applesauce, Toast)",
                "Ginger tea or ginger candies may help",
                "Avoid strong smells and spicy foods",
                "Eat protein-rich snacks before bed",
                "Consider vitamin B6 supplements (consult doctor first)"
            ]
        case .severe:
            return [
                "Contact your healthcare provider immediately",
                "Try ice chips or frozen fruit pops for hydration",
                "Avoid cooking smells - eat cold foods if tolerated",
                "Rest as much as possible",
                "Monitor for signs of dehydration"
            ]
        }
    }
}

struct FoodSuggestionCard: View {
    let suggestion: FoodSuggestion
    @State private var isExpanded = false
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(suggestion.food)
                        .font(.headline)
                    
                    Text(suggestion.reason)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                Spacer()
                
                Button(action: { isExpanded.toggle() }) {
                    Image(systemName: isExpanded ? "chevron.up.circle.fill" : "chevron.down.circle.fill")
                        .foregroundColor(.blue)
                }
            }
            
            if isExpanded {
                VStack(alignment: .leading, spacing: 8) {
                    if let benefit = suggestion.nutritionalBenefit {
                        HStack(alignment: .top) {
                            Image(systemName: "leaf.fill")
                                .foregroundColor(.green)
                                .font(.caption)
                            Text(benefit)
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    }
                    
                    if let tip = suggestion.preparationTip {
                        HStack(alignment: .top) {
                            Image(systemName: "fork.knife")
                                .foregroundColor(.orange)
                                .font(.caption)
                            Text(tip)
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    }
                    
                    if suggestion.avoidIfHigh {
                        HStack {
                            Image(systemName: "exclamationmark.triangle.fill")
                                .foregroundColor(.red)
                                .font(.caption)
                            Text("Avoid if symptoms worsen")
                                .font(.caption)
                                .foregroundColor(.red)
                        }
                    }
                }
            }
        }
        .padding()
        .background(Color(.secondarySystemBackground))
        .cornerRadius(10)
        .padding(.horizontal)
    }
}