import SwiftUI

/// iOS 26 Liquid Glass confirmation sheet for meal logging
/// Displays parsed meal with editable components before final logging
struct MealConfirmationSheet: View {
    let action: VoiceAction
    let onConfirm: () -> Void
    let onEdit: (VoiceAction) -> Void
    let onCancel: () -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var editedAction: VoiceAction

    init(action: VoiceAction, onConfirm: @escaping () -> Void, onEdit: @escaping (VoiceAction) -> Void, onCancel: @escaping () -> Void) {
        self.action = action
        self.onConfirm = onConfirm
        self.onEdit = onEdit
        self.onCancel = onCancel
        self._editedAction = State(initialValue: action)
    }

    var body: some View {
        ZStack {
            // iOS 26 Liquid Glass background
            Color.black.opacity(0.3)
                .ignoresSafeArea()
                .blur(radius: 20)

            VStack(spacing: 0) {
                // Header with Liquid Glass effect
                HStack {
                    Text("Confirm Meal")
                        .font(.title2)
                        .fontWeight(.semibold)

                    Spacer()

                    Button(action: {
                        onCancel()
                        dismiss()
                    }) {
                        Image(systemName: "xmark.circle.fill")
                            .font(.title2)
                            .foregroundStyle(.secondary)
                    }
                }
                .padding()
                .background(
                    .ultraThinMaterial,
                    in: RoundedRectangle(cornerRadius: 20, style: .continuous)
                )

                ScrollView {
                    VStack(spacing: 16) {
                        // Meal Name
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Meal")
                                .font(.caption)
                                .foregroundStyle(.secondary)

                            Text(editedAction.details.item ?? "Unknown")
                                .font(.title3)
                                .fontWeight(.medium)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding()
                        .background(
                            .ultraThinMaterial,
                            in: RoundedRectangle(cornerRadius: 16, style: .continuous)
                        )

                        // Components (if compound meal)
                        if let isCompoundMeal = editedAction.details.isCompoundMeal,
                           isCompoundMeal,
                           let components = editedAction.details.components,
                           !components.isEmpty {
                            VStack(alignment: .leading, spacing: 12) {
                                Text("Components")
                                    .font(.caption)
                                    .foregroundStyle(.secondary)

                                ForEach(components.indices, id: \.self) { index in
                                    HStack {
                                        Circle()
                                            .fill(.orange.gradient)
                                            .frame(width: 8, height: 8)

                                        Text(components[index].name.capitalized)
                                            .font(.body)

                                        Spacer()

                                        if let quantity = components[index].quantity {
                                            Text(quantity)
                                                .font(.caption)
                                                .foregroundStyle(.secondary)
                                        }
                                    }
                                    .padding(.vertical, 4)
                                }
                            }
                            .padding()
                            .background(
                                .ultraThinMaterial,
                                in: RoundedRectangle(cornerRadius: 16, style: .continuous)
                            )
                        }

                        // Nutrition Info
                        if let calories = editedAction.details.calories {
                            HStack {
                                Label("Estimated Calories", systemImage: "flame.fill")
                                    .foregroundStyle(.orange)
                                Spacer()
                                Text("\(calories) cal")
                                    .fontWeight(.semibold)
                            }
                            .padding()
                            .background(
                                .ultraThinMaterial,
                                in: RoundedRectangle(cornerRadius: 16, style: .continuous)
                            )
                        }

                        // Meal Type
                        if let mealType = editedAction.details.mealType {
                            HStack {
                                Label("Meal Type", systemImage: "clock.fill")
                                    .foregroundStyle(.blue)
                                Spacer()
                                Text(mealType)
                                    .fontWeight(.medium)
                            }
                            .padding()
                            .background(
                                .ultraThinMaterial,
                                in: RoundedRectangle(cornerRadius: 16, style: .continuous)
                            )
                        }

                        // Timestamp
                        if let timestamp = editedAction.details.timestamp {
                            HStack {
                                Label("Time", systemImage: "calendar")
                                    .foregroundStyle(.purple)
                                Spacer()
                                Text(formatTimestamp(timestamp))
                                    .fontWeight(.medium)
                            }
                            .padding()
                            .background(
                                .ultraThinMaterial,
                                in: RoundedRectangle(cornerRadius: 16, style: .continuous)
                            )
                        }

                        // Notes
                        if let notes = editedAction.details.notes {
                            VStack(alignment: .leading, spacing: 8) {
                                Text("Notes")
                                    .font(.caption)
                                    .foregroundStyle(.secondary)

                                Text(notes)
                                    .font(.body)
                            }
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding()
                            .background(
                                .ultraThinMaterial,
                                in: RoundedRectangle(cornerRadius: 16, style: .continuous)
                            )
                        }

                        // Action Buttons
                        HStack(spacing: 12) {
                            // Edit Button (Future implementation)
                            Button(action: {
                                onEdit(editedAction)
                            }) {
                                HStack {
                                    Image(systemName: "pencil")
                                    Text("Edit")
                                }
                                .frame(maxWidth: .infinity)
                                .padding()
                                .background(
                                    .ultraThinMaterial,
                                    in: RoundedRectangle(cornerRadius: 12, style: .continuous)
                                )
                            }
                            .foregroundStyle(.primary)

                            // Confirm Button with Liquid Glass emphasis
                            Button(action: {
                                onConfirm()
                                dismiss()
                            }) {
                                HStack {
                                    Image(systemName: "checkmark.circle.fill")
                                    Text("Log Meal")
                                }
                                .frame(maxWidth: .infinity)
                                .padding()
                                .background(
                                    LinearGradient(
                                        colors: [.orange, .orange.opacity(0.8)],
                                        startPoint: .topLeading,
                                        endPoint: .bottomTrailing
                                    ),
                                    in: RoundedRectangle(cornerRadius: 12, style: .continuous)
                                )
                                .shadow(color: .orange.opacity(0.3), radius: 8, y: 4)
                            }
                            .foregroundStyle(.white)
                            .fontWeight(.semibold)
                        }
                        .padding(.top, 8)
                    }
                    .padding()
                }
            }
            .padding()
            .frame(maxHeight: .infinity)
        }
    }

    private func formatTimestamp(_ timestamp: String) -> String {
        // Parse ISO8601 or time string
        if timestamp.contains("T") {
            // ISO8601 format
            let formatter = ISO8601DateFormatter()
            if let date = formatter.date(from: timestamp) {
                let displayFormatter = DateFormatter()
                displayFormatter.timeStyle = .short
                displayFormatter.dateStyle = .none
                return displayFormatter.string(from: date)
            }
        }
        // Return as-is if it's already formatted (e.g., "08:00")
        return timestamp
    }
}

// MARK: - Preview
#Preview {
    let sampleAction = VoiceAction(
        type: .logFood,
        details: VoiceAction.ActionDetails(
            item: "Porkchop with Potatoes",
            amount: "1",
            unit: "serving",
            calories: "430",
            severity: nil,
            mealType: "Dinner",
            symptoms: nil,
            vitaminName: nil,
            notes: "Delicious home-cooked meal",
            timestamp: "2025-10-14T18:30:00Z",
            frequency: nil,
            dosage: nil,
            timesPerDay: nil,
            isCompoundMeal: true,
            components: [
                VoiceAction.MealComponent(name: "porkchop", quantity: "1 piece"),
                VoiceAction.MealComponent(name: "potatoes", quantity: "1 cup")
            ]
        ),
        confidence: 0.95
    )

    MealConfirmationSheet(
        action: sampleAction,
        onConfirm: { print("Confirmed") },
        onEdit: { _ in print("Edit") },
        onCancel: { print("Cancelled") }
    )
}
