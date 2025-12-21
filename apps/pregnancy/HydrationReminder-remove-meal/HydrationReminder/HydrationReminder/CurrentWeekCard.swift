import SwiftUI

struct CurrentWeekCard: View {
    let pregnancyData: PregnancyData

    @State private var animateProgress = false

    private var progress: Double {
        pregnancyData.completionPercentage ?? 0
    }

    private var currentWeek: Int {
        pregnancyData.currentWeek ?? 0
    }

    private var daysRemaining: Int {
        pregnancyData.daysRemaining ?? 0
    }

    private var trimester: Int {
        pregnancyData.currentTrimester ?? 1
    }

    var body: some View {
        VStack(spacing: 20) {
            // Header
            HStack {
                HStack(spacing: 6) {
                    Image(systemName: "calendar.badge.clock")
                        .foregroundStyle(
                            LinearGradient(
                                colors: [.pink, .purple],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                        .font(.system(size: 16))
                    Text("Your Pregnancy")
                        .font(.headline)
                        .foregroundStyle(.primary)
                }

                Spacer()

                Text("\(ordinal(trimester)) Trimester")
                    .font(.caption)
                    .fontWeight(.medium)
                    .foregroundStyle(.secondary)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 5)
                    .background(
                        Capsule()
                            .fill(Color.purple.opacity(0.15))
                    )
            }

            // Main content
            HStack(spacing: 24) {
                // Circular progress indicator
                circularProgressView

                // Week info
                weekInfoView
            }

            // Days remaining bar
            daysRemainingBar
        }
        .padding(20)
        .background(
            RoundedRectangle(cornerRadius: 24, style: .continuous)
                .fill(.ultraThinMaterial)
                .overlay(
                    RoundedRectangle(cornerRadius: 24, style: .continuous)
                        .fill(
                            LinearGradient(
                                colors: [
                                    Color.pink.opacity(0.1),
                                    Color.purple.opacity(0.05)
                                ],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                )
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
        .shadow(color: Color.pink.opacity(0.2), radius: animateProgress ? 16 : 0, y: 2)
        .onAppear {
            withAnimation(.easeOut(duration: 1.0).delay(0.2)) {
                animateProgress = true
            }
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel("Week \(currentWeek) of pregnancy, \(daysRemaining) days remaining until due date")
    }

    // MARK: - Circular Progress View

    private var circularProgressView: some View {
        ZStack {
            // Background circle
            Circle()
                .stroke(
                    LinearGradient(
                        colors: [
                            Color.pink.opacity(0.2),
                            Color.purple.opacity(0.2)
                        ],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    ),
                    lineWidth: 12
                )
                .frame(width: 120, height: 120)

            // Progress circle
            Circle()
                .trim(from: 0, to: animateProgress ? progress : 0)
                .stroke(
                    AngularGradient(
                        gradient: Gradient(colors: [
                            Color.pink,
                            Color.pink.opacity(0.8),
                            Color.purple,
                            Color.purple.opacity(0.8),
                            Color.pink
                        ]),
                        center: .center,
                        startAngle: .degrees(-90),
                        endAngle: .degrees(270)
                    ),
                    style: StrokeStyle(lineWidth: 12, lineCap: .round)
                )
                .frame(width: 120, height: 120)
                .rotationEffect(.degrees(-90))
                .animation(.spring(response: 1.0, dampingFraction: 0.7), value: animateProgress)

            // Week number in center
            VStack(spacing: 2) {
                Text("\(currentWeek)")
                    .font(.system(size: 36, weight: .bold, design: .rounded))
                    .foregroundStyle(
                        LinearGradient(
                            colors: [.pink, .purple],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )

                Text("weeks")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(.secondary)
            }
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("Week \(currentWeek)")
    }

    // MARK: - Week Info View

    private var weekInfoView: some View {
        VStack(alignment: .leading, spacing: 12) {
            VStack(alignment: .leading, spacing: 4) {
                Text("Week \(currentWeek)")
                    .font(.title2)
                    .fontWeight(.bold)
                    .foregroundStyle(.primary)

                Text("\(ordinal(trimester)) Trimester")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }

            Divider()
                .background(Color.secondary.opacity(0.3))

            VStack(alignment: .leading, spacing: 6) {
                HStack(spacing: 4) {
                    Image(systemName: "hourglass")
                        .font(.caption)
                        .foregroundStyle(.pink)
                    Text("\(daysRemaining) days to go")
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundStyle(.primary)
                }

                HStack(spacing: 4) {
                    Image(systemName: "chart.line.uptrend.xyaxis")
                        .font(.caption)
                        .foregroundStyle(.purple)
                    Text("\(Int(progress * 100))% complete")
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundStyle(.primary)
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    // MARK: - Days Remaining Bar

    private var daysRemainingBar: some View {
        VStack(spacing: 8) {
            HStack {
                Text("Days Remaining")
                    .font(.caption)
                    .fontWeight(.medium)
                    .foregroundStyle(.secondary)
                Spacer()
                Text("\(daysRemaining)")
                    .font(.caption)
                    .fontWeight(.bold)
                    .foregroundStyle(
                        LinearGradient(
                            colors: [.pink, .purple],
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                    )
            }

            GeometryReader { geometry in
                ZStack(alignment: .leading) {
                    // Background
                    RoundedRectangle(cornerRadius: 6, style: .continuous)
                        .fill(
                            LinearGradient(
                                colors: [
                                    Color.pink.opacity(0.15),
                                    Color.purple.opacity(0.15)
                                ],
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                        )
                        .frame(height: 12)

                    // Progress
                    RoundedRectangle(cornerRadius: 6, style: .continuous)
                        .fill(
                            LinearGradient(
                                colors: [.pink, .purple],
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                        )
                        .frame(
                            width: animateProgress ? geometry.size.width * progress : 0,
                            height: 12
                        )
                        .animation(.spring(response: 1.0, dampingFraction: 0.7), value: animateProgress)
                }
            }
            .frame(height: 12)
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(daysRemaining) days remaining, \(Int(progress * 100)) percent complete")
    }

    // MARK: - Helper Methods

    private func ordinal(_ number: Int) -> String {
        switch number {
        case 1: return "1st"
        case 2: return "2nd"
        case 3: return "3rd"
        default: return "\(number)th"
        }
    }
}

#Preview {
    let sampleData = PregnancyData(
        dueDate: Calendar.current.date(byAdding: .day, value: 180, to: Date()),
        lmpDate: Calendar.current.date(byAdding: .day, value: -100, to: Date()),
        conceptionDate: nil,
        entryMethod: .dueDate
    )

    return CurrentWeekCard(pregnancyData: sampleData)
        .padding()
}
