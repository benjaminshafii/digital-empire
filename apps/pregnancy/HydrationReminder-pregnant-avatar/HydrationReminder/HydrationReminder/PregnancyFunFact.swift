import SwiftUI

// MARK: - Data Model
struct PregnancyFunFact: Identifiable {
    let id = UUID()
    let title: String
    let fact: String
    let source: String
    let category: FactCategory
    let icon: String

    enum FactCategory {
        case exercise
        case nutrition
        case health
        case labor

        var color: Color {
            switch self {
            case .exercise: return .green
            case .nutrition: return .orange
            case .health: return .pink
            case .labor: return .purple
            }
        }
    }
}

// MARK: - Fun Facts Database
extension PregnancyFunFact {
    static let allFacts: [PregnancyFunFact] = [
        // Exercise Facts
        PregnancyFunFact(
            title: "Zone 2 Cardio is Your Best Friend",
            fact: "Moderate-intensity cardio at 60-70% max heart rate is the safest and most beneficial exercise during pregnancy. Just maintain a 'conversational pace' where you can talk but not sing.",
            source: "ACOG 2020",
            category: .exercise,
            icon: "heart.fill"
        ),

        PregnancyFunFact(
            title: "HIIT Can Be Safe (If You're Already Trained)",
            fact: "Recent research shows high-intensity exercise is safe for women who were already doing it pre-pregnancy. A 2025 meta-analysis of 16 studies found it reduces gestational diabetes risk by 55%.",
            source: "European Journal of Applied Physiology 2025",
            category: .exercise,
            icon: "bolt.fill"
        ),

        PregnancyFunFact(
            title: "Weight Training Has No Arbitrary Limits",
            fact: "The old '10-pound rule' is myth! A University of Alberta study confirmed that lifting at 70-90% of your 10-rep max is safe during pregnancy with no adverse effects on baby.",
            source: "British Journal of Sports Medicine 2023",
            category: .exercise,
            icon: "dumbbell.fill"
        ),

        PregnancyFunFact(
            title: "Exercise Cuts Diabetes Risk in Half",
            fact: "Regular exercise during pregnancy reduces your risk of gestational diabetes by 30-50%. That's better than most medications!",
            source: "ACOG 2020",
            category: .exercise,
            icon: "chart.line.downtrend.xyaxis"
        ),

        PregnancyFunFact(
            title: "Shorter, Faster Labor",
            fact: "Women who exercise regularly during pregnancy have labor that's 30-60 minutes shorter on average and 20-30% lower C-section rates.",
            source: "ACOG 2020",
            category: .labor,
            icon: "clock.arrow.circlepath"
        ),

        PregnancyFunFact(
            title: "The 150-Minute Sweet Spot",
            fact: "Just 150 minutes per week of moderate exercise (30 min × 5 days) provides massive benefits. You can even break it into 10-15 minute sessions!",
            source: "ACOG 2020",
            category: .exercise,
            icon: "timer"
        ),

        PregnancyFunFact(
            title: "Preeclampsia Protection",
            fact: "Exercise reduces your risk of preeclampsia by 30-40%. This potentially life-threatening condition affects blood pressure and organ function.",
            source: "ACOG 2020",
            category: .health,
            icon: "heart.text.square.fill"
        ),

        PregnancyFunFact(
            title: "Ditch the Heart Rate Monitor",
            fact: "The 'talk test' is more reliable than heart rate zones during pregnancy. If you can hold a conversation but not sing, you're at the perfect intensity!",
            source: "RANZCOG 2020",
            category: .exercise,
            icon: "waveform.path.ecg"
        ),

        PregnancyFunFact(
            title: "Swimming is Pregnancy Gold",
            fact: "Water supports your body weight and reduces joint stress, making swimming ideal throughout all trimesters. Plus, it helps with swelling!",
            source: "ACOG 2020",
            category: .exercise,
            icon: "figure.pool.swim"
        ),

        PregnancyFunFact(
            title: "Baby Benefits Too",
            fact: "Exercise during pregnancy improves your baby's 5-minute Apgar scores (a measure of newborn health) and may provide long-term cardiovascular benefits.",
            source: "European Journal of Applied Physiology 2025",
            category: .health,
            icon: "figure.and.child.holdinghands"
        ),

        PregnancyFunFact(
            title: "Back Pain Relief",
            fact: "Regular exercise reduces lower back pain by 25-40% during pregnancy by strengthening core muscles and improving posture.",
            source: "ACOG 2020",
            category: .health,
            icon: "figure.walk"
        ),

        PregnancyFunFact(
            title: "Mental Health Matters",
            fact: "Exercise reduces postpartum depression risk by 30-50% and improves mood throughout pregnancy by releasing endorphins and reducing stress hormones.",
            source: "ACOG 2020",
            category: .health,
            icon: "brain.head.profile"
        ),

        PregnancyFunFact(
            title: "No Lying on Your Back After 16 Weeks",
            fact: "Avoid exercises flat on your back after the first trimester to prevent compressing the vena cava (the major blood vessel). Use an incline or side-lying positions instead.",
            source: "ACOG 2020",
            category: .exercise,
            icon: "bed.double.fill"
        ),

        PregnancyFunFact(
            title: "Squats Prepare You for Labor",
            fact: "Practicing squats during pregnancy opens your pelvis, strengthens your legs, and mimics beneficial labor positions. Continue them throughout pregnancy!",
            source: "ACOG 2020",
            category: .labor,
            icon: "figure.flexibility"
        ),

        PregnancyFunFact(
            title: "Exercise is Safe for Baby",
            fact: "Extensive research confirms exercise does NOT increase risk of miscarriage, preterm birth, low birth weight, or birth defects. The benefits far outweigh any risks!",
            source: "ACOG 2020 Meta-Analysis",
            category: .health,
            icon: "checkmark.shield.fill"
        )
    ]

    static func randomFact() -> PregnancyFunFact {
        allFacts.randomElement() ?? allFacts[0]
    }
}

// MARK: - Rotating Fun Fact Card View (iOS 26 Design)
struct PregnancyFunFactCard: View {
    @State private var currentFact: PregnancyFunFact
    @State private var isAnimating = false
    @State private var timer: Timer?

    let rotationInterval: TimeInterval = 15.0 // Change fact every 15 seconds

    init() {
        _currentFact = State(initialValue: PregnancyFunFact.randomFact())
    }

    var body: some View {
        VStack(spacing: 0) {
            // Header with category badge
            HStack(spacing: 8) {
                // Category badge
                HStack(spacing: 4) {
                    Image(systemName: currentFact.icon)
                        .font(.caption2)
                    Text(categoryName)
                        .font(.caption2)
                        .fontWeight(.semibold)
                }
                .foregroundColor(currentFact.category.color)
                .padding(.horizontal, 8)
                .padding(.vertical, 4)
                .background(
                    Capsule()
                        .fill(currentFact.category.color.opacity(0.15))
                        .overlay(
                            Capsule()
                                .stroke(currentFact.category.color.opacity(0.3), lineWidth: 0.5)
                        )
                )

                Spacer()

                // Auto-rotate indicator
                HStack(spacing: 4) {
                    Image(systemName: "arrow.triangle.2.circlepath")
                        .font(.caption2)
                        .rotationEffect(.degrees(isAnimating ? 360 : 0))
                        .animation(.linear(duration: 2).repeatForever(autoreverses: false), value: isAnimating)
                    Text("Auto")
                        .font(.caption2)
                }
                .foregroundColor(.secondary)
            }
            .padding(.horizontal, 16)
            .padding(.top, 12)
            .padding(.bottom, 8)

            // Main content with liquid glass effect
            VStack(alignment: .leading, spacing: 10) {
                // Title
                Text(currentFact.title)
                    .font(.subheadline)
                    .fontWeight(.bold)
                    .foregroundColor(.primary)
                    .lineLimit(2, reservesSpace: false)
                    .fixedSize(horizontal: false, vertical: true)

                // Fact text
                Text(currentFact.fact)
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .lineLimit(4, reservesSpace: false)
                    .fixedSize(horizontal: false, vertical: true)

                // Source attribution
                HStack(spacing: 4) {
                    Image(systemName: "doc.text.fill")
                        .font(.system(size: 9))
                    Text("Source: \(currentFact.source)")
                        .font(.system(size: 10))
                }
                .foregroundColor(.secondary.opacity(0.8))
            }
            .padding(16)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(
                RoundedRectangle(cornerRadius: 12)
                    .fill(.ultraThinMaterial)
                    .overlay(
                        RoundedRectangle(cornerRadius: 12)
                            .stroke(
                                LinearGradient(
                                    colors: [
                                        currentFact.category.color.opacity(0.3),
                                        currentFact.category.color.opacity(0.1)
                                    ],
                                    startPoint: .topLeading,
                                    endPoint: .bottomTrailing
                                ),
                                lineWidth: 1
                            )
                    )
            )
            .padding(.horizontal, 16)
            .padding(.bottom, 12)
        }
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(Color(.secondarySystemBackground))
        )
        .shadow(color: currentFact.category.color.opacity(0.15), radius: 8, x: 0, y: 4)
        .transition(.asymmetric(
            insertion: .move(edge: .trailing).combined(with: .opacity),
            removal: .move(edge: .leading).combined(with: .opacity)
        ))
        .onAppear {
            isAnimating = true
            startAutoRotation()
        }
        .onDisappear {
            stopAutoRotation()
        }
        .onTapGesture {
            rotateFact()
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel("Pregnancy tip: \(currentFact.title). \(currentFact.fact). Source: \(currentFact.source)")
        .accessibilityHint("Double tap to show next tip")
    }

    private var categoryName: String {
        switch currentFact.category {
        case .exercise: return "Exercise"
        case .nutrition: return "Nutrition"
        case .health: return "Health"
        case .labor: return "Labor"
        }
    }

    private func startAutoRotation() {
        timer = Timer.scheduledTimer(withTimeInterval: rotationInterval, repeats: true) { _ in
            rotateFact()
        }
    }

    private func stopAutoRotation() {
        timer?.invalidate()
        timer = nil
    }

    private func rotateFact() {
        withAnimation(.smooth(duration: 0.4)) {
            // Get a different fact
            var newFact = PregnancyFunFact.randomFact()
            while newFact.id == currentFact.id && PregnancyFunFact.allFacts.count > 1 {
                newFact = PregnancyFunFact.randomFact()
            }
            currentFact = newFact
        }

        // Haptic feedback
        let impactFeedback = UIImpactFeedbackGenerator(style: .light)
        impactFeedback.impactOccurred()
    }
}

#Preview {
    VStack {
        PregnancyFunFactCard()
            .padding()
        Spacer()
    }
    .background(Color(.systemGroupedBackground))
}
