import SwiftUI

struct LogEntryRow: View {
    let entry: LogEntry
    let showRelated: Bool
    let relatedLogs: [LogEntry]
    let logsManager: LogsManager?
    @State private var showingTimeEdit = false
    @State private var editableDate: Date
    
    init(entry: LogEntry, showRelated: Bool = true, relatedLogs: [LogEntry] = [], logsManager: LogsManager? = nil) {
        self.entry = entry
        self.showRelated = showRelated
        self.relatedLogs = relatedLogs
        self.logsManager = logsManager
        self._editableDate = State(initialValue: entry.date)
    }
    
    var body: some View {
        // iOS 26 Best Practices: Compact, efficient layout with proper truncation
        HStack(spacing: 12) {
            // Icon - iOS 26 pattern: 32-36pt icons
            Image(systemName: entry.type.icon)
                .font(.system(size: 20))
                .foregroundColor(Color(entry.type.color))
                .frame(width: 32, height: 32)
                .background(Color(entry.type.color).opacity(0.1))
                .cornerRadius(8)

            // Content
            VStack(alignment: .leading, spacing: 6) {
                HStack(alignment: .top, spacing: 8) {
                    // Title section with proper truncation
                    VStack(alignment: .leading, spacing: 4) {
                        HStack(spacing: 4) {
                            Text(entry.type.rawValue)
                                .font(.subheadline)
                                .fontWeight(.medium)

                            if entry.source == .voice {
                                Image(systemName: "mic.fill")
                                    .font(.caption2)
                                    .foregroundColor(.blue)
                                    .accessibilityLabel("Voice logged")
                            }

                            if entry.type == .puke && !relatedLogs.isEmpty {
                                Text("• Related")
                                    .font(.caption2)
                                    .foregroundColor(.orange)
                            }
                        }
                        .lineLimit(1)

                        // Food name or notes with iOS 26 truncation pattern
                        if let foodName = entry.foodName {
                            Text(foodName)
                                .font(.body)
                                .foregroundColor(.primary)
                                .fontWeight(.medium)
                                .lineLimit(2, reservesSpace: false)
                                .truncationMode(.tail)
                                .fixedSize(horizontal: false, vertical: true)
                        } else if let notes = entry.notes {
                            Text(notes)
                                .font(.body)
                                .foregroundColor(.primary)
                                .lineLimit(2, reservesSpace: false)
                                .truncationMode(.tail)
                                .fixedSize(horizontal: false, vertical: true)
                        }
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)

                    Spacer(minLength: 8)

                    // Time button - iOS 26 Liquid Glass pattern
                    Button(action: {
                        editableDate = entry.date
                        showingTimeEdit = true
                    }) {
                        HStack(spacing: 3) {
                            Image(systemName: "clock")
                                .font(.caption2)
                            Text(entry.formattedDate)
                                .font(.caption)
                        }
                        .foregroundColor(.secondary)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(
                            RoundedRectangle(cornerRadius: 6)
                                .fill(.ultraThinMaterial)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 6)
                                        .stroke(Color.gray.opacity(0.2), lineWidth: 0.5)
                                )
                        )
                    }
                    .buttonStyle(PlainButtonStyle())
                    .fixedSize()
                    .accessibilityLabel("Edit time: \(entry.formattedDate)")
                    .accessibilityHint("Double tap to edit timestamp")
                }

                // iOS 26 Liquid Glass nutrition badges
                if entry.type == .food && (entry.calories != nil || entry.protein != nil) {
                    HStack(spacing: 6) {
                        if let calories = entry.calories {
                            HStack(spacing: 3) {
                                Image(systemName: "flame.fill")
                                    .font(.system(size: 9))
                                Text("\(calories)")
                                    .font(.caption2)
                                    .fontWeight(.medium)
                            }
                            .foregroundColor(.orange)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 3)
                            .background(
                                RoundedRectangle(cornerRadius: 5)
                                    .fill(.ultraThinMaterial)
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 5)
                                            .stroke(Color.orange.opacity(0.3), lineWidth: 0.5)
                                    )
                            )
                        }
                        if let protein = entry.protein {
                            Text("\(protein)g P")
                                .font(.caption2)
                                .fontWeight(.medium)
                                .foregroundColor(.red)
                                .padding(.horizontal, 6)
                                .padding(.vertical, 3)
                                .background(
                                    RoundedRectangle(cornerRadius: 5)
                                        .fill(.ultraThinMaterial)
                                        .overlay(
                                            RoundedRectangle(cornerRadius: 5)
                                                .stroke(Color.red.opacity(0.3), lineWidth: 0.5)
                                        )
                                )
                        }
                        if let carbs = entry.carbs {
                            Text("\(carbs)g C")
                                .font(.caption2)
                                .fontWeight(.medium)
                                .foregroundColor(.blue)
                                .padding(.horizontal, 6)
                                .padding(.vertical, 3)
                                .background(
                                    RoundedRectangle(cornerRadius: 5)
                                        .fill(.ultraThinMaterial)
                                        .overlay(
                                            RoundedRectangle(cornerRadius: 5)
                                                .stroke(Color.blue.opacity(0.3), lineWidth: 0.5)
                                        )
                                )
                        }
                        if let fat = entry.fat {
                            Text("\(fat)g F")
                                .font(.caption2)
                                .fontWeight(.medium)
                                .foregroundColor(.green)
                                .padding(.horizontal, 6)
                                .padding(.vertical, 3)
                                .background(
                                    RoundedRectangle(cornerRadius: 5)
                                        .fill(.ultraThinMaterial)
                                        .overlay(
                                            RoundedRectangle(cornerRadius: 5)
                                                .stroke(Color.green.opacity(0.3), lineWidth: 0.5)
                                        )
                                )
                        }
                    }
                }

                // Metadata row (amount, severity, time since)
                HStack(spacing: 8) {
                    if let amount = entry.amount {
                        HStack(spacing: 2) {
                            Image(systemName: "drop.fill")
                                .font(.caption2)
                            Text(amount)
                                .font(.caption2)
                        }
                        .foregroundColor(.blue)
                    }

                    if let severity = entry.severityText {
                        HStack(spacing: 2) {
                            Image(systemName: "exclamationmark.triangle")
                                .font(.caption2)
                            Text(severity)
                                .font(.caption2)
                        }
                        .foregroundColor(severityColor(entry.severity ?? 3))
                    }

                    Text(entry.timeSince)
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }
            }
        }
        .padding(.vertical, 10)
        .padding(.horizontal, 14)
        .background(Color(.systemBackground))
        .cornerRadius(10)
        .accessibilityElement(children: .combine)
        .accessibilityLabel(accessibilityDescription)
        .sheet(isPresented: $showingTimeEdit) {
            TimeEditSheet(date: $editableDate)
                .onDisappear {
                    // Update the log when sheet is dismissed
                    if editableDate != entry.date, let logsManager = logsManager {
                        logsManager.updateLogTime(entry, newDate: editableDate)
                    }
                }
        }
    }
    
    private func severityColor(_ severity: Int) -> Color {
        switch severity {
        case 1, 2: return .yellow
        case 3: return .orange
        case 4, 5: return .red
        default: return .gray
        }
    }

    private var accessibilityDescription: String {
        var description = "\(entry.type.rawValue)"

        if let foodName = entry.foodName {
            description += ": \(foodName)"
        }

        if let notes = entry.notes, !notes.isEmpty {
            description += ", \(notes)"
        }

        if let amount = entry.amount {
            description += ", \(amount)"
        }

        if entry.type == .food {
            var nutritionParts: [String] = []
            if let cal = entry.calories {
                nutritionParts.append("\(cal) calories")
            }
            if let protein = entry.protein {
                nutritionParts.append("\(protein) grams protein")
            }
            if !nutritionParts.isEmpty {
                description += ", " + nutritionParts.joined(separator: ", ")
            }
        }

        description += ", \(entry.timeSince)"

        if entry.source == .voice {
            description += ", voice logged"
        }

        return description
    }
}