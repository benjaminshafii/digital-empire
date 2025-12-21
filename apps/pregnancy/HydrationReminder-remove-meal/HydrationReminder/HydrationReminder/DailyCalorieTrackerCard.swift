import SwiftUI

// MARK: - Daily Calorie Tracker Card (iOS 26 Liquid Glass)

struct DailyCalorieTrackerCard: View {
    @EnvironmentObject var logsManager: LogsManager
    @StateObject private var photoLogManager = PhotoFoodLogManager()

    @State private var isExpanded = false
    @State private var dailyGoal = 2000

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

    private var progress: Double {
        guard dailyGoal > 0 else { return 0 }
        return min(Double(todaysNutrition.calories) / Double(dailyGoal), 1.0)
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

                Text("Goal: \(dailyGoal) cal")
                    .font(.caption)
                    .foregroundStyle(.secondary)

                if todaysNutrition.calories > 0 {
                    Text("\(Int(progress * 100))% of goal")
                        .font(.caption.weight(.medium))
                        .foregroundStyle(progress >= 1.0 ? .green : .orange)
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

#Preview {
    let nm = NotificationManager()
    return DailyCalorieTrackerCard()
        .environmentObject(LogsManager(notificationManager: nm))
        .padding()
}
