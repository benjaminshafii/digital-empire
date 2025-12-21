import SwiftUI
import Charts

// MARK: - Enhanced Weight Chart Component (iOS 26)
struct EnhancedWeightChart: View {
    let weightHistory: [WeightSample]
    let lmpDate: Date?
    let healthKitManager: HealthKitManager
    @Binding var selectedSample: WeightSample?

    // Calculate optimal Y-axis range (10% below lowest, 5% above highest)
    private var yAxisRange: (min: Double, max: Double) {
        let weights = weightHistory.map { $0.weightKg }
        let minWeight = weights.min() ?? 60.0
        let maxWeight = weights.max() ?? 80.0
        return (
            min: minWeight - (minWeight * 0.10),
            max: maxWeight + (maxWeight * 0.05)
        )
    }

    private var prePregnancySamples: [WeightSample] {
        guard let lmp = lmpDate else { return [] }
        return weightHistory.filter { $0.date < lmp }
    }

    private var pregnancySamples: [WeightSample] {
        guard let lmp = lmpDate else { return weightHistory }
        return weightHistory.filter { $0.date >= lmp }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            // Header with legend
            chartHeader

            // The chart
            chartView
                .frame(height: 300)
                .padding()
                .background(chartBackground)
        }
        .padding(20)
        .background(cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
        .shadow(color: Color.pink.opacity(0.1), radius: 12, x: 0, y: 6)
    }

    // MARK: - Chart Header

    private var chartHeader: some View {
        HStack {
            Text("Weight Trend")
                .font(.headline)

            Spacer()

            if lmpDate != nil {
                chartLegend
            }
        }
        .padding(.horizontal, 4)
    }

    private var chartLegend: some View {
        HStack(spacing: 16) {
            Label {
                Text("Pre-pregnancy")
                    .font(.caption2)
            } icon: {
                Circle()
                    .fill(Color.blue.opacity(0.6))
                    .frame(width: 8, height: 8)
            }

            Label {
                Text("Pregnancy")
                    .font(.caption2)
            } icon: {
                Circle()
                    .fill(Color.pink)
                    .frame(width: 8, height: 8)
            }
        }
    }

    // MARK: - Chart View

    private var chartView: some View {
        Chart {
            if lmpDate != nil {
                pregnancyAwareChart
            } else {
                simpleChart
            }

            interactivePoints
        }
        .chartXAxis {
            AxisMarks(values: .stride(by: .month)) { value in
                AxisGridLine(stroke: StrokeStyle(lineWidth: 0.5))
                    .foregroundStyle(Color.gray.opacity(0.2))
                AxisValueLabel(format: .dateTime.month(.abbreviated))
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
        }
        .chartYAxis {
            AxisMarks { value in
                AxisGridLine(stroke: StrokeStyle(lineWidth: 0.5))
                    .foregroundStyle(Color.gray.opacity(0.2))
                AxisValueLabel {
                    if let weight = value.as(Double.self) {
                        Text(String(format: "%.0f", weight))
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                    }
                }
            }
        }
        .chartYScale(domain: .automatic(includesZero: false, reversed: false))
    }

    // MARK: - Pregnancy-Aware Chart Marks

    @ChartContentBuilder
    private var pregnancyAwareChart: some ChartContent {
        // Pre-pregnancy area and line
        ForEach(prePregnancySamples) { sample in
            AreaMark(
                x: .value("Date", sample.date),
                yStart: .value("Min", yAxisRange.min),
                yEnd: .value("Weight", sample.weightKg)
            )
            .foregroundStyle(
                LinearGradient(
                    colors: [Color.blue.opacity(0.15), Color.blue.opacity(0.05)],
                    startPoint: .top,
                    endPoint: .bottom
                )
            )
            .interpolationMethod(.catmullRom)
        }

        ForEach(prePregnancySamples) { sample in
            LineMark(
                x: .value("Date", sample.date),
                y: .value("Weight", sample.weightKg)
            )
            .foregroundStyle(Color.blue.opacity(0.8))
            .lineStyle(StrokeStyle(lineWidth: 2.5))
            .interpolationMethod(.catmullRom)
        }

        // Pregnancy area and line
        ForEach(pregnancySamples) { sample in
            AreaMark(
                x: .value("Date", sample.date),
                yStart: .value("Min", yAxisRange.min),
                yEnd: .value("Weight", sample.weightKg)
            )
            .foregroundStyle(
                LinearGradient(
                    colors: [Color.pink.opacity(0.2), Color.pink.opacity(0.05)],
                    startPoint: .top,
                    endPoint: .bottom
                )
            )
            .interpolationMethod(.catmullRom)
        }

        ForEach(pregnancySamples) { sample in
            LineMark(
                x: .value("Date", sample.date),
                y: .value("Weight", sample.weightKg)
            )
            .foregroundStyle(
                LinearGradient(
                    colors: [Color.pink, Color.purple.opacity(0.8)],
                    startPoint: .leading,
                    endPoint: .trailing
                )
            )
            .lineStyle(StrokeStyle(lineWidth: 3))
            .interpolationMethod(.catmullRom)
        }

        // LMP marker line
        if let lmp = lmpDate {
            RuleMark(x: .value("LMP", lmp))
                .foregroundStyle(Color.purple.opacity(0.4))
                .lineStyle(StrokeStyle(lineWidth: 1, dash: [5, 3]))
                .annotation(position: .top, alignment: .center) {
                    Text("LMP")
                        .font(.caption2)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(
                            Capsule()
                                .fill(.ultraThinMaterial)
                        )
                        .foregroundColor(.purple)
                }
        }
    }

    // MARK: - Simple Chart (No Pregnancy Data)

    @ChartContentBuilder
    private var simpleChart: some ChartContent {
        ForEach(weightHistory) { sample in
            AreaMark(
                x: .value("Date", sample.date),
                yStart: .value("Min", yAxisRange.min),
                yEnd: .value("Weight", sample.weightKg)
            )
            .foregroundStyle(
                LinearGradient(
                    colors: [Color.pink.opacity(0.2), Color.pink.opacity(0.05)],
                    startPoint: .top,
                    endPoint: .bottom
                )
            )
            .interpolationMethod(.catmullRom)
        }

        ForEach(weightHistory) { sample in
            LineMark(
                x: .value("Date", sample.date),
                y: .value("Weight", sample.weightKg)
            )
            .foregroundStyle(Color.pink)
            .lineStyle(StrokeStyle(lineWidth: 3))
            .interpolationMethod(.catmullRom)
        }
    }

    // MARK: - Interactive Points

    @ChartContentBuilder
    private var interactivePoints: some ChartContent {
        ForEach(weightHistory) { sample in
            PointMark(
                x: .value("Date", sample.date),
                y: .value("Weight", sample.weightKg)
            )
            .foregroundStyle(pointColor(for: sample))
            .symbolSize(selectedSample?.id == sample.id ? 120 : 60)
            .annotation(position: .top, spacing: 4) {
                if selectedSample?.id == sample.id {
                    selectedPointAnnotation(for: sample)
                }
            }
        }
    }

    private func pointColor(for sample: WeightSample) -> Color {
        if let lmp = lmpDate, sample.date < lmp {
            return Color.blue.opacity(0.8)
        } else {
            return Color.pink
        }
    }

    private func selectedPointAnnotation(for sample: WeightSample) -> some View {
        VStack(spacing: 2) {
            Text(healthKitManager.formatWeight(sample.weightKg))
                .font(.caption)
                .fontWeight(.semibold)
            Text(sample.date, format: .dateTime.month().day())
                .font(.caption2)
                .foregroundColor(.secondary)
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .background(
            RoundedRectangle(cornerRadius: 8)
                .fill(.ultraThinMaterial)
                .shadow(color: .black.opacity(0.1), radius: 4, x: 0, y: 2)
        )
    }

    // MARK: - Backgrounds

    private var chartBackground: some View {
        RoundedRectangle(cornerRadius: 16, style: .continuous)
            .fill(.ultraThinMaterial)
            .overlay(
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .stroke(
                        LinearGradient(
                            colors: [
                                Color.pink.opacity(0.2),
                                Color.purple.opacity(0.1)
                            ],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        ),
                        lineWidth: 1
                    )
            )
    }

    private var cardBackground: some View {
        RoundedRectangle(cornerRadius: 24, style: .continuous)
            .fill(Color(.secondarySystemBackground))
    }
}
