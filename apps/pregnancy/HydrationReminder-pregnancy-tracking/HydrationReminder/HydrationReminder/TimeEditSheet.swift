import SwiftUI

struct TimeEditSheet: View {
    @Binding var date: Date
    @Environment(\.dismiss) var dismiss
    @State private var tempDate: Date
    @State private var showCustomPicker = false

    let quickPresets: [(String, TimeInterval)] = [
        ("Now", 0),
        ("15 min ago", -900),
        ("30 min ago", -1800),
        ("1 hour ago", -3600)
    ]

    init(date: Binding<Date>) {
        self._date = date
        self._tempDate = State(initialValue: date.wrappedValue)
    }

    var body: some View {
        VStack(spacing: 0) {
            // Handle bar
            RoundedRectangle(cornerRadius: 2.5)
                .fill(Color.secondary.opacity(0.5))
                .frame(width: 40, height: 5)
                .padding(.top, 8)
                .padding(.bottom, 20)

            // Title
            HStack {
                Text("Edit Time")
                    .font(.headline)
                Spacer()
                Button("Done") {
                    date = tempDate
                    dismiss()
                }
                .font(.body.bold())
                .foregroundColor(.blue)
            }
            .padding(.horizontal, 20)
            .padding(.bottom, 16)

            // Quick Presets - iOS 26 Liquid Glass Pills
            VStack(alignment: .leading, spacing: 12) {
                Text("Quick Select")
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .foregroundColor(.primary)
                    .padding(.horizontal, 20)

                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 12) {
                        ForEach(quickPresets, id: \.0) { preset in
                            LiquidGlassTimeButton(
                                title: preset.0,
                                isSelected: false,
                                action: {
                                    tempDate = Date().addingTimeInterval(preset.1)
                                    hapticFeedback()
                                }
                            )
                        }
                    }
                    .padding(.horizontal, 20)
                }
            }
            .padding(.bottom, 16)

            // Meal Times - iOS 26 Liquid Glass Pills with Icons
            VStack(alignment: .leading, spacing: 12) {
                Text("Meal Times")
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .foregroundColor(.primary)
                    .padding(.horizontal, 20)

                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 12) {
                        ForEach(MealType.allCases, id: \.self) { mealType in
                            LiquidGlassMealButton(
                                mealType: mealType,
                                isSelected: false,
                                action: {
                                    tempDate = calculateMealTime(for: mealType)
                                    hapticFeedback()
                                    announceAccessibility(for: mealType)
                                }
                            )
                        }

                        // Custom button
                        LiquidGlassTimeButton(
                            title: "Custom",
                            isSelected: showCustomPicker,
                            action: {
                                withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                                    showCustomPicker.toggle()
                                }
                                hapticFeedback()
                            }
                        )
                    }
                    .padding(.horizontal, 20)
                }
            }
            .padding(.bottom, 20)

            // Compact DatePicker (iOS 26 style - only shows when Custom is selected)
            if showCustomPicker {
                VStack(alignment: .leading, spacing: 12) {
                    Divider()
                        .padding(.horizontal, 20)

                    Text("Custom Time")
                        .font(.subheadline)
                        .fontWeight(.semibold)
                        .foregroundColor(.primary)
                        .padding(.horizontal, 20)
                        .padding(.top, 8)

                    DatePicker(
                        "Select time",
                        selection: $tempDate,
                        displayedComponents: [.date, .hourAndMinute]
                    )
                    .datePickerStyle(.compact)
                    .labelsHidden()
                    .padding(.horizontal, 20)
                    .onChange(of: tempDate) {
                        hapticFeedback()
                    }
                }
                .transition(.opacity.combined(with: .move(edge: .top)))
            }
            
            // Preview
            HStack {
                Image(systemName: "clock")
                    .foregroundColor(.blue)
                Text(formatPreview(tempDate))
                    .font(.subheadline)
                Spacer()
                if abs(tempDate.timeIntervalSince(Date())) < 60 {
                    Text("Current time")
                        .font(.caption)
                        .foregroundColor(.green)
                } else {
                    Text(relativeTime(from: tempDate))
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
            .padding()
            .background(Color(.systemGray6))
            .cornerRadius(10)
            .padding(.horizontal, 20)
            .padding(.vertical, 16)
            
            Spacer(minLength: 0)
        }
        .presentationDetents([.height(showCustomPicker ? 550 : 480)])
        .presentationDragIndicator(.hidden)
    }
    
    private func formatPreview(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMM d, h:mm a"
        return formatter.string(from: date)
    }
    
    private func relativeTime(from date: Date) -> String {
        let interval = Date().timeIntervalSince(date)
        let absInterval = abs(interval)
        
        if absInterval < 3600 {
            let minutes = Int(absInterval / 60)
            return interval > 0 ? "\(minutes) min ago" : "in \(minutes) min"
        } else if absInterval < 86400 {
            let hours = Int(absInterval / 3600)
            return interval > 0 ? "\(hours) hour\(hours == 1 ? "" : "s") ago" : "in \(hours) hour\(hours == 1 ? "" : "s")"
        } else {
            let days = Int(absInterval / 86400)
            return interval > 0 ? "\(days) day\(days == 1 ? "" : "s") ago" : "in \(days) day\(days == 1 ? "" : "s")"
        }
    }
    
    private func hapticFeedback() {
        let impactFeedback = UIImpactFeedbackGenerator(style: .light)
        impactFeedback.impactOccurred()
    }

    private func calculateMealTime(for mealType: MealType) -> Date {
        let calendar = Calendar.current
        let now = Date()
        let currentHour = calendar.component(.hour, from: now)

        // If current time is within meal range, use current time
        if mealType.timeRange.contains(currentHour) {
            return now
        }

        // Otherwise, use default time for that meal today
        var components = calendar.dateComponents([.year, .month, .day], from: now)
        components.hour = mealType.defaultTime.hour
        components.minute = mealType.defaultTime.minute

        return calendar.date(from: components) ?? now
    }

    private func announceAccessibility(for mealType: MealType) {
        let formatter = DateFormatter()
        formatter.timeStyle = .short
        let timeString = formatter.string(from: tempDate)

        UIAccessibility.post(
            notification: .announcement,
            argument: "\(mealType.rawValue) selected, time set to \(timeString)"
        )
    }
}

// iOS 26 Liquid Glass Time Button
struct LiquidGlassTimeButton: View {
    let title: String
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(title)
                .font(.subheadline)
                .fontWeight(.semibold)
                .padding(.horizontal, 20)
                .padding(.vertical, 12)
                .background(
                    RoundedRectangle(cornerRadius: 20, style: .continuous)
                        .fill(.ultraThinMaterial)
                        .shadow(color: isSelected ? Color.blue.opacity(0.3) : Color.black.opacity(0.05), radius: isSelected ? 8 : 4, y: 2)
                )
                .overlay(
                    RoundedRectangle(cornerRadius: 20, style: .continuous)
                        .strokeBorder(
                            LinearGradient(
                                colors: isSelected ?
                                    [Color.blue.opacity(0.8), Color.blue.opacity(0.4)] :
                                    [Color.gray.opacity(0.2), Color.gray.opacity(0.1)],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            ),
                            lineWidth: isSelected ? 2 : 1
                        )
                )
                .foregroundColor(isSelected ? .blue : .primary)
        }
        .buttonStyle(.plain)
    }
}

// iOS 26 Liquid Glass Meal Button with Icon
struct LiquidGlassMealButton: View {
    let mealType: MealType
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Label {
                Text(mealType.rawValue)
            } icon: {
                Image(systemName: mealType.icon)
            }
            .font(.subheadline)
            .fontWeight(.semibold)
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
            .background(
                RoundedRectangle(cornerRadius: 20, style: .continuous)
                    .fill(.ultraThinMaterial)
                    .shadow(
                        color: isSelected ? Color.blue.opacity(0.3) : Color.black.opacity(0.05),
                        radius: isSelected ? 8 : 4,
                        y: 2
                    )
            )
            .overlay(
                RoundedRectangle(cornerRadius: 20, style: .continuous)
                    .strokeBorder(
                        LinearGradient(
                            colors: isSelected ?
                                [Color.blue.opacity(0.8), Color.blue.opacity(0.4)] :
                                [Color.gray.opacity(0.2), Color.gray.opacity(0.1)],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        ),
                        lineWidth: isSelected ? 2 : 1
                    )
            )
            .foregroundColor(isSelected ? .blue : .primary)
        }
        .buttonStyle(.plain)
        .accessibilityLabel("\(mealType.rawValue) time")
        .accessibilityHint("Double tap to set time to \(mealType.rawValue)")
    }
}