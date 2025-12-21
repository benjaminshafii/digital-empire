import SwiftUI

struct BabySizeCard: View {
    let babySize: BabySizeInfo

    @State private var animateScale = false

    var body: some View {
        VStack(spacing: 20) {
            // Header
            HStack {
                HStack(spacing: 6) {
                    Image(systemName: "chart.line.uptrend.xyaxis")
                        .foregroundStyle(
                            LinearGradient(
                                colors: [.orange, .red],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                        .font(.system(size: 16))
                    Text("Baby's Size")
                        .font(.headline)
                        .foregroundStyle(.primary)
                }

                Spacer()

                Text("Week \(babySize.week)")
                    .font(.caption)
                    .fontWeight(.medium)
                    .foregroundStyle(.secondary)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 5)
                    .background(
                        Capsule()
                            .fill(Color.orange.opacity(0.15))
                    )
            }

            // Main content
            HStack(spacing: 20) {
                // Fruit emoji
                fruitEmojiView

                // Size details
                sizeDetailsView
            }

            // Comparison text
            comparisonText
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
                                    Color.orange.opacity(0.1),
                                    Color.red.opacity(0.05)
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
                                colors: [
                                    Color.orange.opacity(0.5),
                                    Color.red.opacity(0.3),
                                    Color.orange.opacity(0.2)
                                ],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            ),
                            lineWidth: 2
                        )
                )
        )
        .shadow(color: Color.orange.opacity(0.2), radius: animateScale ? 12 : 0, y: 2)
        .onAppear {
            withAnimation(.spring(response: 0.6, dampingFraction: 0.6).delay(0.3)) {
                animateScale = true
            }
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel("Baby is about the size of a \(babySize.fruit), measuring \(formatLength()) and weighing \(formatWeight())")
    }

    // MARK: - Fruit Emoji View

    private var fruitEmojiView: some View {
        ZStack {
            // Gradient background circle
            Circle()
                .fill(
                    LinearGradient(
                        colors: [
                            Color.orange.opacity(0.2),
                            Color.red.opacity(0.15)
                        ],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
                .frame(width: 100, height: 100)

            // Pulse circle
            Circle()
                .stroke(
                    LinearGradient(
                        colors: [
                            Color.orange.opacity(0.3),
                            Color.red.opacity(0.2)
                        ],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    ),
                    lineWidth: 3
                )
                .frame(width: 100, height: 100)
                .scaleEffect(animateScale ? 1.1 : 1.0)
                .opacity(animateScale ? 0.5 : 1.0)
                .animation(.easeInOut(duration: 1.5).repeatForever(autoreverses: true), value: animateScale)

            // Fruit emoji
            Text(babySize.emoji)
                .font(.system(size: 48))
                .scaleEffect(animateScale ? 1.0 : 0.5)
                .animation(.spring(response: 0.6, dampingFraction: 0.6), value: animateScale)
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(babySize.fruit)
    }

    // MARK: - Size Details View

    private var sizeDetailsView: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Length measurement
            measurementRow(
                icon: "ruler",
                label: "Length",
                value: formatLength(),
                color: .orange
            )

            Divider()
                .background(Color.secondary.opacity(0.3))

            // Weight measurement
            measurementRow(
                icon: "scalemass",
                label: "Weight",
                value: formatWeight(),
                color: .red
            )
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private func measurementRow(icon: String, label: String, value: String, color: Color) -> some View {
        HStack(spacing: 8) {
            Image(systemName: icon)
                .font(.caption)
                .foregroundStyle(color)
                .frame(width: 20)

            VStack(alignment: .leading, spacing: 2) {
                Text(label)
                    .font(.caption)
                    .foregroundStyle(.secondary)

                Text(value)
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .foregroundStyle(.primary)
            }
        }
    }

    // MARK: - Comparison Text

    private var comparisonText: some View {
        HStack(spacing: 8) {
            Image(systemName: "sparkles")
                .font(.caption)
                .foregroundStyle(
                    LinearGradient(
                        colors: [.orange, .red],
                        startPoint: .leading,
                        endPoint: .trailing
                    )
                )

            Text("About the size of a \(babySize.fruit.lowercased())")
                .font(.subheadline)
                .fontWeight(.medium)
                .foregroundStyle(.primary)
                .lineLimit(1)
                .truncationMode(.tail)

            Spacer(minLength: 0)
        }
        .padding(12)
        .background(
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .fill(
                    LinearGradient(
                        colors: [
                            Color.orange.opacity(0.1),
                            Color.red.opacity(0.05)
                        ],
                        startPoint: .leading,
                        endPoint: .trailing
                    )
                )
        )
    }

    // MARK: - Helper Methods

    private func formatLength() -> String {
        if babySize.lengthCM < 10 {
            return String(format: "%.1f cm", babySize.lengthCM)
        } else {
            return String(format: "%.1f cm (%.1f in)", babySize.lengthCM, babySize.lengthInches)
        }
    }

    private func formatWeight() -> String {
        if babySize.weightGrams < 1000 {
            return String(format: "%.0f g", babySize.weightGrams)
        } else if babySize.weightGrams < 2000 {
            return String(format: "%.0f g (%.1f oz)", babySize.weightGrams, babySize.weightOunces)
        } else {
            let pounds = babySize.weightGrams / 453.592
            let ounces = (babySize.weightGrams / 28.35).truncatingRemainder(dividingBy: 16)
            return String(format: "%.0f g (%.0f lb %.0f oz)", babySize.weightGrams, pounds, ounces)
        }
    }
}

#Preview {
    let sampleSize = BabySizeInfo(
        week: 20,
        fruit: "Banana",
        emoji: "🍌",
        lengthCM: 25.6,
        weightGrams: 300.0
    )

    return BabySizeCard(babySize: sampleSize)
        .padding()
}
