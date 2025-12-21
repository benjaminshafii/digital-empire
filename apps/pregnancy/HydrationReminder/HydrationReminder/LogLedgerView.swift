import SwiftUI

// MARK: - Health Logs View (iOS 26 Design)
struct LogLedgerView: View {
    @ObservedObject var logsManager: LogsManager
    @State private var selectedFilter: LogType? = nil
    @State private var showingExport = false
    @State private var exportText = ""

    var filteredLogs: [LogEntry] {
        logsManager.filteredLogs(by: selectedFilter)
    }

    var body: some View {
        NavigationStack {
            ZStack {
                // iOS 26 Gradient Background
                LinearGradient(
                    colors: [
                        Color.blue.opacity(0.08),
                        Color.teal.opacity(0.05),
                        Color(.systemGroupedBackground)
                    ],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
                .ignoresSafeArea()

                VStack(spacing: 0) {
                    // Daily Summary Card
                    if let summary = logsManager.todaysSummary {
                        dailySummaryCard(summary)
                            .padding(.horizontal, 16)
                            .padding(.top, 12)
                            .padding(.bottom, 8)
                    }

                    // Filter Section
                    filterSection
                        .padding(.vertical, 8)

                    // Logs List
                    logsListSection
                }
            }
            .navigationTitle("Health Logs")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Menu {
                        Button(action: {
                            exportText = logsManager.exportLogsAsText()
                            showingExport = true
                        }) {
                            Label("Export Logs", systemImage: "square.and.arrow.up")
                        }
                    } label: {
                        Image(systemName: "ellipsis.circle")
                    }
                }
            }
            .sheet(isPresented: $showingExport) {
                exportSheet
            }
        }
    }

    // MARK: - Daily Summary Card

    private func dailySummaryCard(_ summary: DailySummary) -> some View {
        VStack(spacing: 14) {
            // Header
            HStack {
                Text("Today's Activity")
                    .font(.headline)
                    .foregroundStyle(.primary)
                Spacer()
                Text(summary.dateString)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            // Summary Badges
            HStack(spacing: 16) {
                SummaryBadge(
                    icon: "fork.knife",
                    count: summary.foodCount,
                    label: "Food",
                    color: .orange
                )

                SummaryBadge(
                    icon: "drop.fill",
                    count: summary.drinkCount,
                    label: "Water",
                    color: .blue
                )

                SummaryBadge(
                    icon: "exclamationmark.triangle.fill",
                    count: summary.pukeCount,
                    label: "Episodes",
                    color: .red
                )

                SummaryBadge(
                    icon: "heart.text.square",
                    count: summary.symptomCount,
                    label: "Symptoms",
                    color: .purple
                )
            }

            // Insights
            VStack(spacing: 8) {
                if let keptDown = summary.keptDownPercentage {
                    HStack(spacing: 6) {
                        Image(systemName: keptDown >= 70 ? "checkmark.circle.fill" : "exclamationmark.circle.fill")
                            .foregroundStyle(keptDown >= 70 ? .green : .orange)
                            .imageScale(.small)
                        Text("\(Int(keptDown))% of meals kept down")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                        Spacer()
                    }
                }

                if let commonTime = logsManager.getMostCommonSymptomTime() {
                    HStack(spacing: 6) {
                        Image(systemName: "clock.fill")
                            .foregroundStyle(.secondary)
                            .imageScale(.small)
                        Text("Most symptoms around \(commonTime)")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                        Spacer()
                    }
                }
            }
        }
        .padding(18)
        .background(
            RoundedRectangle(cornerRadius: 20, style: .continuous)
                .fill(.ultraThinMaterial)
                .shadow(color: .black.opacity(0.06), radius: 10, y: 3)
        )
        .overlay(
            RoundedRectangle(cornerRadius: 20, style: .continuous)
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
    }

    // MARK: - Filter Section

    private var filterSection: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 10) {
                LogFilterChip(
                    title: "All",
                    isSelected: selectedFilter == nil,
                    count: logsManager.logEntries.count
                ) {
                    withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                        selectedFilter = nil
                    }
                }

                ForEach(LogType.allCases, id: \.self) { type in
                    LogFilterChip(
                        title: type.rawValue,
                        icon: type.icon,
                        isSelected: selectedFilter == type,
                        count: logsManager.logEntries.filter { $0.type == type }.count,
                        color: getTypeColor(type)
                    ) {
                        withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                            selectedFilter = type
                        }
                    }
                }
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 12)
        }
        .background(.ultraThinMaterial)
    }

    // MARK: - Logs List Section

    private var logsListSection: some View {
        Group {
            if filteredLogs.isEmpty {
                emptyStateView
            } else {
                List {
                    ForEach(groupedLogsByTime()) { section in
                        Section {
                            ForEach(section.logs) { log in
                                LogEntryRow(
                                    entry: log,
                                    relatedLogs: logsManager.getRelatedLogs(for: log),
                                    logsManager: logsManager
                                )
                                .listRowBackground(Color.clear)
                                .listRowSeparator(.hidden)
                                .swipeActions(edge: .trailing, allowsFullSwipe: false) {
                                    Button(role: .destructive) {
                                        withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                                            logsManager.deleteLog(log)
                                        }
                                    } label: {
                                        Label("Delete", systemImage: "trash")
                                    }
                                }
                            }
                        } header: {
                            Text(section.title)
                                .font(.caption)
                                .fontWeight(.semibold)
                                .foregroundStyle(.secondary)
                                .textCase(.uppercase)
                                .padding(.top, 8)
                        }
                    }
                }
                .listStyle(.plain)
                .scrollContentBackground(.hidden)
            }
        }
    }

    // MARK: - Empty State

    private var emptyStateView: some View {
        ContentUnavailableView {
            Label("No Activity Logs", systemImage: "list.clipboard")
        } description: {
            Text(selectedFilter == nil ?
                 "Your health timeline will appear here" :
                 "No \(selectedFilter?.rawValue.lowercased() ?? "") logs found")
                .font(.subheadline)
                .foregroundStyle(.secondary)
        } actions: {
            if selectedFilter != nil {
                Button {
                    withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                        selectedFilter = nil
                    }
                } label: {
                    Label("Show All", systemImage: "arrow.counterclockwise")
                        .font(.subheadline)
                }
                .buttonStyle(.bordered)
                .tint(.blue)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    // MARK: - Export Sheet

    private var exportSheet: some View {
        NavigationStack {
            ScrollView {
                Text(exportText)
                    .font(.system(.body, design: .monospaced))
                    .padding()
            }
            .navigationTitle("Export Logs")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") {
                        showingExport = false
                    }
                }
                ToolbarItem(placement: .primaryAction) {
                    ShareLink(item: exportText)
                }
            }
        }
    }

    // MARK: - Helper Methods

    private func groupedLogsByTime() -> [LogSection] {
        let calendar = Calendar.current
        let now = Date()
        var sections: [LogSection] = []

        // Last 2 Hours
        let last2Hours = filteredLogs.filter {
            $0.date >= now.addingTimeInterval(-7200)
        }
        if !last2Hours.isEmpty {
            sections.append(LogSection(title: "Last 2 Hours", logs: last2Hours))
        }

        // Earlier Today
        let today = filteredLogs.filter {
            calendar.isDateInToday($0.date) &&
            $0.date < now.addingTimeInterval(-7200)
        }
        if !today.isEmpty {
            sections.append(LogSection(title: "Earlier Today", logs: today))
        }

        // Yesterday
        let yesterday = filteredLogs.filter {
            calendar.isDateInYesterday($0.date)
        }
        if !yesterday.isEmpty {
            sections.append(LogSection(title: "Yesterday", logs: yesterday))
        }

        // Older
        let older = filteredLogs.filter {
            !calendar.isDateInToday($0.date) &&
            !calendar.isDateInYesterday($0.date)
        }
        if !older.isEmpty {
            sections.append(LogSection(title: "Older", logs: older))
        }

        return sections
    }

    private func getTypeColor(_ type: LogType) -> Color {
        switch type {
        case .water:
            return .blue
        case .food:
            return .orange
        case .puke:
            return .red
        case .symptom:
            return .purple
        case .drink:
            return .cyan
        case .supplement:
            return .green
        }
    }
}

// MARK: - Supporting Structures

struct LogSection: Identifiable {
    let id = UUID()
    let title: String
    let logs: [LogEntry]
}

// MARK: - Summary Badge (iOS 26)

struct SummaryBadge: View {
    let icon: String
    let count: Int
    let label: String
    let color: Color

    var body: some View {
        VStack(spacing: 6) {
            ZStack {
                Circle()
                    .fill(color.opacity(0.15))
                    .frame(width: 44, height: 44)

                Image(systemName: icon)
                    .font(.system(size: 18))
                    .foregroundStyle(color)
            }

            Text("\(count)")
                .font(.system(size: 18, weight: .bold, design: .rounded))
                .foregroundStyle(.primary)

            Text(label)
                .font(.caption2)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
    }
}

// MARK: - Log Filter Chip (iOS 26)

struct LogFilterChip: View {
    let title: String
    var icon: String? = nil
    let isSelected: Bool
    var count: Int = 0
    var color: Color = .blue
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 6) {
                if let icon = icon {
                    Image(systemName: icon)
                        .font(.caption)
                        .imageScale(.medium)
                }

                Text(title)
                    .font(.subheadline)
                    .fontWeight(isSelected ? .semibold : .medium)

                if count > 0 {
                    Text("\(count)")
                        .font(.caption2)
                        .fontWeight(.semibold)
                        .foregroundStyle(isSelected ? color : .secondary)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(
                            Capsule()
                                .fill(isSelected ? color.opacity(0.2) : Color(.systemGray5))
                        )
                }
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 9)
            .background(
                Capsule()
                    .fill(isSelected ? color.opacity(0.12) : Color(.systemGray6))
            )
            .overlay(
                Capsule()
                    .strokeBorder(
                        isSelected ? color.opacity(0.5) : Color.clear,
                        lineWidth: 1.5
                    )
            )
            .foregroundStyle(isSelected ? color : .primary)
        }
        .buttonStyle(.plain)
    }
}

#Preview {
    let nm = NotificationManager()
    return LogLedgerView(logsManager: LogsManager(notificationManager: nm))
}
