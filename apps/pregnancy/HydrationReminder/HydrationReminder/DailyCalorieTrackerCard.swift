import SwiftUI

// MARK: - Daily Calorie Tracker Card (iOS 26 Liquid Glass)

struct DailyCalorieTrackerCard: View {
    @EnvironmentObject var logsManager: LogsManager
    @EnvironmentObject var pregnancyManager: PregnancyDataManager
    @StateObject private var photoLogManager = PhotoFoodLogManager()

    @State private var isExpanded = false

    private var todaysNutrition: (calories: Int, protein: Int, carbs: Int, fat: Int) {
        // Combine from logs and photo logs
        var totalCalories = 0
        var totalProtein = 0
        var totalCarbs = 0
        var totalFat = 0

        // From photo logs
        let todaysPhotos = photoLogManager.getLogsForToday()
        for photo in todaysPhotos {
            if let analysis = photo.aiAnalysis {
                totalCalories += analysis.totalCalories ?? 0
                totalProtein += Int(analysis.totalProtein ?? 0)
                totalCarbs += Int(analysis.totalCarbs ?? 0)
                totalFat += Int(analysis.totalFat ?? 0)
            }
        }

        // From voice/manual logs
        let nutritionData = logsManager.getNutritionData(for: Date())
        totalCalories += nutritionData.calories
        totalProtein += nutritionData.protein
        totalCarbs += nutritionData.carbs
        totalFat += nutritionData.fat

        return (totalCalories, totalProtein, totalCarbs, totalFat)
    }

    private var calorieRange: CalorieRange? {
        pregnancyManager.currentCalorieRange()
    }

    private var progress: Double {
        guard let range = calorieRange, range.midpoint > 0 else { return 0 }
        return min(Double(todaysNutrition.calories) / Double(range.midpoint), 1.0)
    }

    private var calorieStatus: CalorieStatus {
        guard let range = calorieRange else { return .noData }
        return range.status(for: todaysNutrition.calories)
    }

    private var mealsByTime: [MealCategory: [(log: LogEntry, calories: Int)]] {
        logsManager.getMealsByTimeOfDay(for: Date())
    }

    var body: some View {
        VStack(spacing: 0) {
            // Main collapsed view
            collapsedView
                .contentShape(Rectangle())
                .onTapGesture {
                    withAnimation(.spring(response: 0.5, dampingFraction: 0.7)) {
                        isExpanded.toggle()
                    }
                }

            // Expanded content
            if isExpanded {
                expandedContent
                    .transition(.asymmetric(
                        insertion: .opacity.combined(with: .move(edge: .top)),
                        removal: .opacity.combined(with: .move(edge: .top))
                    ))
            }
        }
        .padding(20)
        .background(
            RoundedRectangle(cornerRadius: 24, style: .continuous)
                .fill(.ultraThinMaterial)
                .shadow(color: .black.opacity(0.1), radius: 16, y: 4)
                .overlay(
                    RoundedRectangle(cornerRadius: 24, style: .continuous)
                        .strokeBorder(
                            LinearGradient(
                                colors: [.white.opacity(0.3), .white.opacity(0.1)],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            ),
                            lineWidth: 1
                        )
                        .blendMode(.overlay)
                )
        )
        .shadow(color: Color.orange.opacity(0.15), radius: progress > 0 ? 12 : 0, y: 2)
    }

    // MARK: - Collapsed View

    private var collapsedView: some View {
        HStack(spacing: 16) {
            // Circular progress ring
            ZStack {
                // Background ring
                Circle()
                    .stroke(Color.orange.opacity(0.15), lineWidth: 8)
                    .frame(width: 72, height: 72)

                // Progress ring
                Circle()
                    .trim(from: 0, to: progress)
                    .stroke(
                        AngularGradient(
                            colors: [
                                Color.orange,
                                Color.orange.opacity(0.8),
                                Color.red
                            ],
                            center: .center,
                            startAngle: .degrees(-90),
                            endAngle: .degrees(270)
                        ),
                        style: StrokeStyle(lineWidth: 8, lineCap: .round)
                    )
                    .frame(width: 72, height: 72)
                    .rotationEffect(.degrees(-90))
                    .animation(.spring(response: 0.6, dampingFraction: 0.7), value: progress)

                // Calorie count in center
                VStack(spacing: 0) {
                    Text("\(todaysNutrition.calories)")
                        .font(.system(size: 18, weight: .bold, design: .rounded))
                        .foregroundStyle(.primary)
                    Text("cal")
                        .font(.system(size: 10, weight: .medium))
                        .foregroundStyle(.secondary)
                }
            }

            // Info
            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: 6) {
                    Image(systemName: "flame.fill")
                        .foregroundStyle(.orange)
                        .font(.system(size: 14))
                    Text("Daily Calories")
                        .font(.headline)
                        .foregroundStyle(.primary)
                }

                if let range = calorieRange {
                    Text("Range: \(range.minimum)-\(range.maximum) cal")
                        .font(.caption)
                        .foregroundStyle(.secondary)

                    if todaysNutrition.calories > 0 {
                        HStack(spacing: 4) {
                            Image(systemName: calorieStatus.icon)
                                .font(.system(size: 10))
                            Text(calorieStatus.message)
                        }
                        .font(.caption.weight(.medium))
                        .foregroundStyle(calorieStatus.color)
                    }
                } else {
                    Text("Set pregnancy data to see range")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }

            Spacer()

            // Expand indicator
            Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
                .font(.system(size: 14, weight: .semibold))
                .foregroundStyle(.secondary)
                .rotationEffect(.degrees(isExpanded ? 180 : 0))
                .animation(.spring(response: 0.4, dampingFraction: 0.7), value: isExpanded)
        }
    }

    // MARK: - Expanded Content

    private var expandedContent: some View {
        VStack(alignment: .leading, spacing: 16) {
            Divider()
                .padding(.vertical, 4)

            // Trimester-based calorie range indicator
            if let range = calorieRange {
                VStack(alignment: .leading, spacing: 12) {
                    HStack {
                        Text("Recommended Range")
                            .font(.subheadline.weight(.semibold))
                            .foregroundStyle(.secondary)

                        Spacer()

                        Text("Week \(range.week) • T\(range.trimester)")
                            .font(.caption)
                            .foregroundStyle(.tertiary)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .background(
                                Capsule()
                                    .fill(Color.blue.opacity(0.1))
                            )
                    }

                    // Visual range bar
                    CalorieRangeBar(
                        currentCalories: todaysNutrition.calories,
                        range: range
                    )

                    // Context text
                    Text("Your recommended intake for trimester \(range.trimester) is \(range.minimum)-\(range.maximum) calories per day.")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .fixedSize(horizontal: false, vertical: true)
                }
                .padding(.vertical, 8)

                Divider()
                    .padding(.vertical, 4)
            }

            // Macro breakdown
            if todaysNutrition.calories > 0 {
                VStack(alignment: .leading, spacing: 12) {
                    Text("Macros")
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(.secondary)

                    HStack(spacing: 12) {
                        MacroPill(
                            label: "Protein",
                            value: todaysNutrition.protein,
                            color: .red
                        )

                        MacroPill(
                            label: "Carbs",
                            value: todaysNutrition.carbs,
                            color: .blue
                        )

                        MacroPill(
                            label: "Fat",
                            value: todaysNutrition.fat,
                            color: .green
                        )
                    }
                }

                Divider()
                    .padding(.vertical, 4)
            }

            // Meal breakdown
            VStack(alignment: .leading, spacing: 12) {
                Text("Today's Meals")
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(.secondary)

                if mealsByTime.isEmpty {
                    Text("No meals logged yet")
                        .font(.caption)
                        .foregroundStyle(.tertiary)
                        .frame(maxWidth: .infinity, alignment: .center)
                        .padding(.vertical, 8)
                } else {
                    ForEach(MealCategory.allCases, id: \.self) { category in
                        if let meals = mealsByTime[category], !meals.isEmpty {
                            MealCategoryRow(
                                category: category,
                                meals: meals
                            )
                        }
                    }
                }
            }
        }
    }
}

// MARK: - Macro Pill

struct MacroPill: View {
    let label: String
    let value: Int
    let color: Color

    var body: some View {
        VStack(spacing: 4) {
            Text("\(value)g")
                .font(.system(size: 16, weight: .bold, design: .rounded))
                .foregroundStyle(color)

            Text(label)
                .font(.system(size: 11, weight: .medium))
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 12)
        .padding(.horizontal, 8)
        .background(
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .fill(color.opacity(0.1))
        )
        .overlay(
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .strokeBorder(color.opacity(0.3), lineWidth: 1)
        )
    }
}

// MARK: - Meal Category Row

struct MealCategoryRow: View {
    let category: MealCategory
    let meals: [(log: LogEntry, calories: Int)]

    private var totalCalories: Int {
        meals.reduce(0) { $0 + $1.calories }
    }

    var body: some View {
        HStack(spacing: 12) {
            // Icon
            Image(systemName: category.icon)
                .font(.system(size: 16))
                .foregroundStyle(category.color)
                .frame(width: 32, height: 32)
                .background(
                    Circle()
                        .fill(category.color.opacity(0.15))
                )

            // Category name and count
            VStack(alignment: .leading, spacing: 2) {
                Text(category.rawValue)
                    .font(.subheadline.weight(.medium))
                    .foregroundStyle(.primary)

                Text("\(meals.count) item\(meals.count == 1 ? "" : "s")")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Spacer()

            // Calories
            Text("\(totalCalories) cal")
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(category.color)
        }
        .padding(.vertical, 8)
        .padding(.horizontal, 12)
        .background(
            RoundedRectangle(cornerRadius: 10, style: .continuous)
                .fill(category.color.opacity(0.05))
        )
    }
}

// MARK: - Calorie Range Bar

struct CalorieRangeBar: View {
    let currentCalories: Int
    let range: CalorieRange

    @Environment(\.accessibilityDifferentiateWithoutColor) var differentiateWithoutColor

    private var position: CGFloat {
        guard range.maximum > range.minimum else { return 0 }
        let clampedCalories = max(range.minimum - 200, min(currentCalories, range.maximum + 200))
        let totalRange = (range.maximum + 200) - (range.minimum - 200)
        return CGFloat(clampedCalories - (range.minimum - 200)) / CGFloat(totalRange)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            // The bar
            GeometryReader { geometry in
                ZStack(alignment: .leading) {
                    // Background (below range)
                    Rectangle()
                        .fill(Color.orange.opacity(0.2))
                        .frame(width: geometry.size.width * zoneWidth(for: .below, totalWidth: geometry.size.width) / geometry.size.width)

                    // Optimal range (green)
                    Rectangle()
                        .fill(Color.green.opacity(0.3))
                        .frame(width: geometry.size.width * zoneWidth(for: .optimal, totalWidth: geometry.size.width) / geometry.size.width)
                        .offset(x: geometry.size.width * zoneWidth(for: .below, totalWidth: geometry.size.width) / geometry.size.width)

                    // Above range
                    Rectangle()
                        .fill(Color.orange.opacity(0.2))
                        .frame(width: geometry.size.width * zoneWidth(for: .above, totalWidth: geometry.size.width) / geometry.size.width)
                        .offset(x: geometry.size.width * (zoneWidth(for: .below, totalWidth: geometry.size.width) + zoneWidth(for: .optimal, totalWidth: geometry.size.width)) / geometry.size.width)

                    // Current position marker
                    if currentCalories > 0 {
                        Circle()
                            .fill(range.status(for: currentCalories).color)
                            .frame(width: 16, height: 16)
                            .overlay(
                                Circle()
                                    .strokeBorder(Color.white, lineWidth: 2)
                            )
                            .shadow(color: .black.opacity(0.2), radius: 4, y: 2)
                            .offset(x: geometry.size.width * position - 8)
                    }
                }
                .frame(height: 12)
                .clipShape(Capsule())
            }
            .frame(height: 16)

            // Labels
            HStack {
                Text("\(range.minimum - 200)")
                    .font(.caption2)
                    .foregroundStyle(.tertiary)

                Spacer()

                VStack(spacing: 2) {
                    Text("Optimal")
                        .font(.caption2.weight(.medium))
                        .foregroundStyle(.secondary)
                    Text("\(range.minimum)-\(range.maximum)")
                        .font(.caption2)
                        .foregroundStyle(.tertiary)
                }

                Spacer()

                Text("\(range.maximum + 200)")
                    .font(.caption2)
                    .foregroundStyle(.tertiary)
            }

            // Current value if non-zero
            if currentCalories > 0 {
                HStack {
                    Image(systemName: range.status(for: currentCalories).icon)
                        .font(.caption2)
                    Text("You: \(currentCalories) cal")
                        .font(.caption.weight(.medium))
                }
                .foregroundStyle(range.status(for: currentCalories).color)
            }
        }
    }

    private enum Zone {
        case below, optimal, above
    }

    private func zoneWidth(for zone: Zone, totalWidth: CGFloat) -> CGFloat {
        let belowRange = 200 // 200 cal below minimum
        let optimalRange = range.maximum - range.minimum
        let aboveRange = 200 // 200 cal above maximum
        let total = belowRange + optimalRange + aboveRange

        switch zone {
        case .below:
            return totalWidth * CGFloat(belowRange) / CGFloat(total)
        case .optimal:
            return totalWidth * CGFloat(optimalRange) / CGFloat(total)
        case .above:
            return totalWidth * CGFloat(aboveRange) / CGFloat(total)
        }
    }
}

#Preview {
    let nm = NotificationManager()
    let pm = PregnancyDataManager()
    return DailyCalorieTrackerCard()
        .environmentObject(LogsManager(notificationManager: nm))
        .environmentObject(pm)
        .padding()
}
