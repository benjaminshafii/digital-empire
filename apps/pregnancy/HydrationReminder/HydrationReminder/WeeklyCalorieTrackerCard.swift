    import SwiftUI
import Charts

// MARK: - Weekly Calorie Tracker Card (iOS 26 Liquid Glass)

struct WeeklyCalorieTrackerCard: View {
    @EnvironmentObject var logsManager: LogsManager
    @EnvironmentObject var pregnancyManager: PregnancyDataManager
    @StateObject private var photoLogManager = PhotoFoodLogManager()

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

    private var currentRange: CalorieRange? {
        pregnancyManager.currentCalorieRange()
    }

    private func getRange(for date: Date) -> CalorieRange {
        pregnancyManager.getCalorieRange(for: date)
    }

    private var daysInRange: Int {
        weeklyData.filter { data in
            let range = getRange(for: data.date)
            return data.calories >= range.minimum && data.calories <= range.maximum
        }.count
    }

    private var maxCalories: Int {
        let dataMax = weeklyData.max(by: { $0.calories < $1.calories })?.calories ?? 0
        let rangeMax = currentRange?.maximum ?? 2400
        // Add 20% padding above the highest value or range max
        let paddedMax = Int(Double(max(dataMax, rangeMax)) * 1.2)
        return max(paddedMax, rangeMax + 500)
    }

    private var minCalories: Int {
        let dataMin = weeklyData.filter { $0.calories > 0 }.min(by: { $0.calories < $1.calories })?.calories ?? 0
        let rangeMin = currentRange?.minimum ?? 1800
        // Start chart 200 below the minimum to show context
        return max(0, min(dataMin, rangeMin) - 200)
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
        VStack(alignment: .leading, spacing: 12) {
            Chart {
                // Recommended range as filled area (behind bars)
                ForEach(weeklyData, id: \.date) { data in
                    let range = getRange(for: data.date)

                    AreaMark(
                        x: .value("Day", data.date, unit: .day),
                        yStart: .value("Min", range.minimum),
                        yEnd: .value("Max", range.maximum)
                    )
                    .foregroundStyle(
                        LinearGradient(
                            colors: [
                                Color.green.opacity(0.25),
                                Color.green.opacity(0.15)
                            ],
                            startPoint: .top,
                            endPoint: .bottom
                        )
                    )
                }

                // Midpoint reference line
                if let range = currentRange {
                    RuleMark(y: .value("Target", range.midpoint))
                        .lineStyle(StrokeStyle(lineWidth: 2, dash: [5, 5]))
                        .foregroundStyle(.green.opacity(0.6))
                        .annotation(position: .top, alignment: .trailing) {
                            Text("Recommended")
                                .font(.caption2)
                                .foregroundStyle(.secondary)
                                .padding(.horizontal, 6)
                                .padding(.vertical, 3)
                                .background(.ultraThinMaterial)
                                .cornerRadius(4)
                        }
                }

                // Average line
                RuleMark(y: .value("Average", averageCalories))
                    .lineStyle(StrokeStyle(lineWidth: 1, dash: [3, 3]))
                    .foregroundStyle(.blue.opacity(0.5))

                // Bars
                ForEach(weeklyData, id: \.date) { data in
                    let range = getRange(for: data.date)
                    BarMark(
                        x: .value("Day", data.date, unit: .day),
                        y: .value("Calories", data.calories)
                    )
                    .foregroundStyle(barColor(for: data.calories, range: range))
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
            .frame(height: 200)
            .chartYScale(domain: minCalories...maxCalories)

            // Legend
            if currentRange != nil {
                HStack(spacing: 16) {
                    LegendItem(
                        color: Color.green.opacity(0.2),
                        label: "Recommended range"
                    )

                    LegendItem(
                        color: Color.blue,
                        label: "Your intake"
                    )
                }
                .font(.caption)
                .padding(.top, 4)
            }
        }
    }

    // MARK: - Stats

    private var statsSection: some View {
        HStack(spacing: 16) {
            StatBox(
                icon: "checkmark.circle.fill",
                value: "\(daysInRange)",
                label: "Days in Range",
                color: .green
            )

            StatBox(
                icon: "arrow.up.circle.fill",
                value: "\(weeklyData.max(by: { $0.calories < $1.calories })?.calories ?? 0)",
                label: "Highest Day",
                color: .orange
            )

            StatBox(
                icon: "chart.line.uptrend.xyaxis",
                value: "\(averageCalories)",
                label: "Weekly Avg",
                color: .blue
            )
        }
    }

    // MARK: - Helpers

    private func barColor(for calories: Int, range: CalorieRange) -> Color {
        return range.status(for: calories).color
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

// MARK: - Legend Item

struct LegendItem: View {
    let color: Color
    let label: String

    var body: some View {
        HStack(spacing: 6) {
            Rectangle()
                .fill(color)
                .frame(width: 16, height: 12)
                .cornerRadius(3)

            Text(label)
                .foregroundStyle(.secondary)
        }
    }
}

#Preview {
    let nm = NotificationManager()
    let pm = PregnancyDataManager()
    return WeeklyCalorieTrackerCard()
        .environmentObject(LogsManager(notificationManager: nm))
        .environmentObject(pm)
        .padding()
}
