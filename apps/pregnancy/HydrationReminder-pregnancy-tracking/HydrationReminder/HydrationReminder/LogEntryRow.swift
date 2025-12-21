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
        VStack(alignment: .leading, spacing: 8) {
            HStack(alignment: .top, spacing: 12) {
                // Time (tap to edit)
                Button(action: {
                    editableDate = entry.date
                    showingTimeEdit = true
                }) {
                    HStack(spacing: 2) {
                        Image(systemName: "clock")
                            .font(.caption2)
                        Text(entry.formattedDate)
                    }
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .padding(.horizontal, 6)
                    .padding(.vertical, 3)
                    .background(Color.gray.opacity(0.1))
                    .cornerRadius(8)
                }
                .buttonStyle(PlainButtonStyle())
                .frame(width: 75, alignment: .trailing)
                
                // Icon
                Image(systemName: entry.type.icon)
                    .font(.title3)
                    .foregroundColor(Color(entry.type.color))
                    .frame(width: 25)
                
                // Content
                VStack(alignment: .leading, spacing: 6) {
                    HStack {
                        Text(entry.type.rawValue)
                            .font(.headline)

                        if entry.source == .voice {
                            Image(systemName: "mic.fill")
                                .font(.caption2)
                                .foregroundColor(.secondary)
                                .accessibilityLabel("Voice logged")
                        }

                        if entry.type == .puke && !relatedLogs.isEmpty {
                            Text("• Related to meal")
                                .font(.caption)
                                .foregroundColor(.orange)
                        }
                    }

                    // Show food name if available with proper truncation
                    if let foodName = entry.foodName {
                        Text(foodName)
                            .font(.subheadline)
                            .foregroundColor(.primary)
                            .fontWeight(.medium)
                            .lineLimit(2, reservesSpace: false)
                            .truncationMode(.tail)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .fixedSize(horizontal: false, vertical: true)
                    }

                    if let notes = entry.notes {
                        Text(notes)
                            .font(.subheadline)
                            .foregroundColor(.primary)
                            .lineLimit(2, reservesSpace: false)
                            .truncationMode(.tail)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                    
                    // Show macros for food entries
                    if entry.type == .food && (entry.calories != nil || entry.protein != nil) {
                        HStack(spacing: 12) {
                            if let calories = entry.calories {
                                HStack(spacing: 2) {
                                    Image(systemName: "flame.fill")
                                        .font(.caption2)
                                        .foregroundColor(.orange)
                                    Text("\(calories)")
                                        .font(.caption)
                                }
                            }
                            if let protein = entry.protein {
                                Text("P: \(protein)g")
                                    .font(.caption)
                                    .foregroundColor(.blue)
                            }
                            if let carbs = entry.carbs {
                                Text("C: \(carbs)g")
                                    .font(.caption)
                                    .foregroundColor(.green)
                            }
                            if let fat = entry.fat {
                                Text("F: \(fat)g")
                                    .font(.caption)
                                    .foregroundColor(.yellow)
                            }
                        }
                    }
                    
                    HStack(spacing: 12) {
                        if let amount = entry.amount {
                            Label(amount, systemImage: "drop.fill")
                                .font(.caption)
                                .foregroundColor(.blue)
                        }
                        
                        if let severity = entry.severityText {
                            Label(severity, systemImage: "exclamationmark.triangle")
                                .font(.caption)
                                .foregroundColor(severityColor(entry.severity ?? 3))
                        }
                        
                        Text(entry.timeSince)
                            .font(.caption2)
                            .foregroundColor(.secondary)
                    }
                }
                
                Spacer()
            }
            
            // Show related logs if any
            if showRelated && !relatedLogs.isEmpty {
                VStack(alignment: .leading, spacing: 4) {
                    ForEach(relatedLogs) { related in
                        HStack(spacing: 8) {
                            Image(systemName: "arrow.turn.down.right")
                                .font(.caption)
                                .foregroundColor(.secondary)
                            
                            Image(systemName: related.type.icon)
                                .font(.caption)
                                .foregroundColor(Color(related.type.color))
                            
                            Text("\(related.type.rawValue) - \(related.timeSince)")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                        .padding(.leading, 107)
                    }
                }
            }
        }
        .padding(.vertical, 8)
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