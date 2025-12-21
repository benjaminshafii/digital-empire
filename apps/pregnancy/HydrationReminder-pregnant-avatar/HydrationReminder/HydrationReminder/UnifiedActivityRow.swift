import SwiftUI

struct UnifiedActivityRow: View {
    let activity: UnifiedActivityEntry
    let isCompact: Bool
    let logsManager: LogsManager?
    let voiceLogManager: VoiceLogManager
    @State private var showingTimeEdit = false
    @State private var editableDate: Date
    
    init(activity: UnifiedActivityEntry, isCompact: Bool = false, logsManager: LogsManager? = nil, voiceLogManager: VoiceLogManager = VoiceLogManager.shared) {
        self.activity = activity
        self.isCompact = isCompact
        self.logsManager = logsManager
        self.voiceLogManager = voiceLogManager
        self._editableDate = State(initialValue: activity.date)
    }
    
    var body: some View {
        HStack(spacing: 12) {
            // Icon
            Image(systemName: activity.category.icon)
                .font(.system(size: isCompact ? 16 : 20))
                .foregroundColor(Color(activity.category.color))
                .frame(width: isCompact ? 28 : 36, height: isCompact ? 28 : 36)
                .background(Color(activity.category.color).opacity(0.1))
                .cornerRadius(8)
            
            // Content
            VStack(alignment: .leading, spacing: 6) {
                HStack(alignment: .top, spacing: 8) {
                    // Title with proper truncation - iOS 26 best practices
                    HStack(spacing: 4) {
                        Text(activity.title)
                            .font(isCompact ? .subheadline : .body)
                            .fontWeight(.medium)
                            .lineLimit(2, reservesSpace: false)
                            .truncationMode(.tail)

                        if activity.source == .voice {
                            Image(systemName: "mic.fill")
                                .font(.caption2)
                                .foregroundColor(.blue)
                                .accessibilityLabel("Voice logged")
                        }
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .fixedSize(horizontal: false, vertical: true)

                    Spacer(minLength: 8)

                    // Time button - fixed width to prevent layout shifts
                    Button(action: {
                        editableDate = activity.date
                        showingTimeEdit = true
                    }) {
                        HStack(spacing: 3) {
                            Image(systemName: "clock")
                                .font(.caption2)
                            Text(formatTime(activity.date))
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
                    .accessibilityLabel("Edit time: \(formatTime(activity.date))")
                    .accessibilityHint("Double tap to edit timestamp")
                }

                if let subtitle = activity.subtitle, !isCompact {
                    Text(subtitle)
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .lineLimit(2, reservesSpace: false)
                        .truncationMode(.tail)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .fixedSize(horizontal: false, vertical: true)
                }
                
                // Show nutrition info for food items with iOS 26 liquid glass badges
                if activity.category == .food, let nutrition = activity.nutrition {
                    HStack(spacing: 6) {
                        if let calories = nutrition.calories {
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
                        if let protein = nutrition.protein {
                            Text("\(Int(protein))g P")
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
                        if let carbs = nutrition.carbs {
                            Text("\(Int(carbs))g C")
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
                        if let fat = nutrition.fat {
                            Text("\(Int(fat))g F")
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
                    .fixedSize(horizontal: false, vertical: true)
                }
            }
        }
        .padding(.vertical, isCompact ? 8 : 12)
        .padding(.horizontal, isCompact ? 12 : 16)
        .background(Color(.systemBackground))
        .cornerRadius(10)
        .accessibilityElement(children: .combine)
        .accessibilityLabel(accessibilityDescription)
        .sheet(isPresented: $showingTimeEdit) {
            TimeEditSheet(date: $editableDate)
                .onDisappear {
                    // Update the appropriate log when sheet is dismissed
                    if editableDate != activity.date {
                        updateActivityTime()
                    }
                }
        }
    }
    
    private func formatTime(_ date: Date) -> String {
        let formatter = DateFormatter()
        let calendar = Calendar.current

        if calendar.isDateInToday(date) {
            formatter.dateFormat = "h:mm a"
        } else {
            formatter.dateFormat = "MMM d"
        }

        return formatter.string(from: date)
    }

    private var accessibilityDescription: String {
        var description = "\(activity.category.rawValue): \(activity.title)"

        if let subtitle = activity.subtitle {
            description += ", \(subtitle)"
        }

        if let nutrition = activity.nutrition {
            var nutritionParts: [String] = []
            if let cal = nutrition.calories {
                nutritionParts.append("\(cal) calories")
            }
            if let protein = nutrition.protein {
                nutritionParts.append("\(Int(protein)) grams protein")
            }
            if !nutritionParts.isEmpty {
                description += ", " + nutritionParts.joined(separator: ", ")
            }
        }

        description += ", at \(formatTime(activity.date))"

        return description
    }
    
    private func updateActivityTime() {
        // Update the appropriate log based on the original entry type
        if let logEntry = activity.originalEntry as? LogEntry, let logsManager = logsManager {
            logsManager.updateLogTime(logEntry, newDate: editableDate)
        } else if let voiceLog = activity.originalEntry as? VoiceLog {
            if let index = voiceLogManager.voiceLogs.firstIndex(where: { $0.id == voiceLog.id }) {
                voiceLogManager.voiceLogs[index].date = editableDate
                voiceLogManager.saveLogs()
            }
        }
        // PhotoFoodLog time editing can be added similarly if needed
    }
}