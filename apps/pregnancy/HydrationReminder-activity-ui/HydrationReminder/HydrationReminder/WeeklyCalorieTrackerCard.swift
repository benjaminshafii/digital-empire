    import SwiftUI
import Charts

// MARK: - Weekly Calorie Tracker Card (iOS 26 Liquid Glass)

struct WeeklyCalorieTrackerCard: View {
    @EnvironmentObject var logsManager: LogsManager
    @StateObject private var photoLogManager = PhotoFoodLogManager()

    @State private var dailyGoal = 2000
    @State private var selectedDay: Date?

    private var weeklyData: [(date: Date, calories: Int)] {
        // Get last 7 days
        let calendar = Calendar.current
        var result: [(date: Date, calories: Int)] = []

        for dayOffset in 0..<7 {
            guard let date = calendar.date(byAdding: .day, value: -dayOffset, to: Date()) else { continue }
            let startOfDay = calendar.startOfDay(for: date)

            // Combine from logs and photo logs
            var totalCalories = 0

            // From photo logs
            let photosForDay = photoLogManager.photoLogs.filter {
                calendar.isDate($0.date, inSameDayAs: startOfDay)
            }
            for photo in photosForDay {
                if let analysis = photo.aiAnalysis {
                    totalCalories += analysis.totalCalories ?? 0
                }
            }

            // From voice/manual logs
            totalCalories += logsManager.getCalories(for: startOfDay)

            result.append((startOfDay, totalCalories))
        }

        return result.reversed()
    }

    private var averageCalories: Int {
        let total = weeklyData.reduce(0) { $0 + $1.calories }
        return total / max(weeklyData.count, 1)
    }

    private var daysAboveGoal: Int {
        weeklyData.filter { $0.calories >= dailyGoal }.count
    }

    private var maxCalories: Int {
        let dataMax = weeklyData.max(by: { $0.calories < $1.calories })?.calories ?? 0
        // Add 20% padding above the highest value, with minimum of dailyGoal + 500
        let paddedMax = Int(Double(dataMax) * 1.2)
        return max(paddedMax, dailyGoal + 500)
    }

    var body: some View {
        VStack(spacing: 20) {
            // Header
            headerSection

            // Chart
            chartSection

            // Stats
            statsSection
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
        .shadow(color: Color.blue.opacity(0.12), radius: 12, y: 2)
    }

    // MARK: - Header

    private var headerSection: some View {
        HStack(spacing: 12) {
            Image(systemName: "chart.bar.fill")
                .foregroundStyle(.blue)
                .font(.system(size: 18))

            VStack(alignment: .leading, spacing: 2) {
                Text("Weekly Calorie Trend")
                    .font(.headline)
                    .foregroundStyle(.primary)

                Text("Last 7 days")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Spacer()

            // Average indicator
            VStack(alignment: .trailing, spacing: 2) {
                Text("Avg")
                    .font(.caption2)
                    .foregroundStyle(.secondary)

                Text("\(averageCalories)")
                    .font(.system(size: 16, weight: .bold, design: .rounded))
                    .foregroundStyle(.blue)
            }
        }
    }

    // MARK: - Chart

    private var chartSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Chart {
                // Goal line
                RuleMark(y: .value("Goal", dailyGoal))
                    .lineStyle(StrokeStyle(lineWidth: 1, dash: [5, 5]))
                    .foregroundStyle(.orange.opacity(0.5))
                    .annotation(position: .top, alignment: .trailing) {
                        Text("Goal")
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                            .padding(.horizontal, 4)
                            .padding(.vertical, 2)
                            .background(.ultraThinMaterial)
                            .cornerRadius(4)
                    }

                // Average line
                RuleMark(y: .value("Average", averageCalories))
                    .lineStyle(StrokeStyle(lineWidth: 1, dash: [3, 3]))
                    .foregroundStyle(.blue.opacity(0.5))

                // Bars
                ForEach(weeklyData, id: \.date) { data in
                    BarMark(
                        x: .value("Day", data.date, unit: .day),
                        y: .value("Calories", data.calories)
                    )
                    .foregroundStyle(barColor(for: data.calories))
                    .cornerRadius(6)
                    .opacity(selectedDay == nil || selectedDay == data.date ? 1.0 : 0.5)
                }
            }
            .chartXAxis {
                AxisMarks(values: .stride(by: .day)) { value in
                    if let date = value.as(Date.self) {
                        AxisValueLabel {
                            Text(date, format: .dateTime.weekday(.narrow))
                                .font(.caption2)
                        }
                    }
                }
            }
            .chartYAxis {
                AxisMarks(position: .leading) { value in
                    AxisGridLine()
                    AxisValueLabel {
                        if let intValue = value.as(Int.self) {
                            Text("\(intValue)")
                                .font(.caption2)
                        }
                    }
                }
            }
            .frame(height: 180)
            .chartYScale(domain: 0...maxCalories)
        }
    }

    // MARK: - Stats

    private var statsSection: some View {
        HStack(spacing: 16) {
            StatBox(
                icon: "checkmark.circle.fill",
                value: "\(daysAboveGoal)",
                label: "Days at Goal",
                color: .green
            )

            StatBox(
                icon: "arrow.up.circle.fill",
                value: "\(weeklyData.max(by: { $0.calories < $1.calories })?.calories ?? 0)",
                label: "Highest Day",
                color: .orange
            )

            StatBox(
                icon: "arrow.down.circle.fill",
                value: "\(weeklyData.min(by: { $0.calories < $1.calories })?.calories ?? 0)",
                label: "Lowest Day",
                color: .blue
            )
        }
    }

    // MARK: - Helpers

    private func barColor(for calories: Int) -> Color {
        if calories == 0 {
            return .gray.opacity(0.3)
        } else if calories < dailyGoal * 8 / 10 {
            return .blue
        } else if calories <= dailyGoal * 12 / 10 {
            return .green
        } else {
            return .orange
        }
    }
}

// MARK: - Stat Box

struct StatBox: View {
    let icon: String
    let value: String
    let label: String
    let color: Color

    var body: some View {
        VStack(spacing: 6) {
            Image(systemName: icon)
                .font(.system(size: 16))
                .foregroundStyle(color)

            Text(value)
                .font(.system(size: 16, weight: .bold, design: .rounded))
                .foregroundStyle(.primary)

            Text(label)
                .font(.system(size: 10, weight: .medium))
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .lineLimit(2)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 12)
        .padding(.horizontal, 8)
        .background(
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .fill(color.opacity(0.08))
        )
        .overlay(
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .strokeBorder(color.opacity(0.2), lineWidth: 1)
        )
    }
}

#Preview {
    let nm = NotificationManager()
    return WeeklyCalorieTrackerCard()
        .environmentObject(LogsManager(notificationManager: nm))
        .padding()
}
