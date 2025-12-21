import SwiftUI

// MARK: - Voice Logs View (iOS 26 Design)
struct VoiceLogsView: View {
    @StateObject private var voiceLogManager = VoiceLogManager.shared
    @EnvironmentObject var logsManager: LogsManager
    @EnvironmentObject var supplementManager: SupplementManager
    @State private var selectedFilter: LogCategory? = nil

    var filteredLogs: [VoiceLog] {
        voiceLogManager.filteredLogs(by: selectedFilter)
    }

    var body: some View {
        NavigationStack {
            ZStack {
                // iOS 26 Gradient Background
                LinearGradient(
                    colors: [
                        Color.purple.opacity(0.08),
                        Color.blue.opacity(0.05),
                        Color(.systemGroupedBackground)
                    ],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
                .ignoresSafeArea()

                VStack(spacing: 0) {
                    // Filter Section
                    filterSection
                        .padding(.top, 8)

                    // Logs List
                    logsListSection
                }
            }
            .navigationTitle("Voice Logs")
            .navigationBarTitleDisplayMode(.large)
            .onAppear {
                voiceLogManager.configure(logsManager: logsManager, supplementManager: supplementManager)
            }
        }
    }

    // MARK: - Filter Section

    private var filterSection: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 10) {
                FilterChip(
                    title: "All",
                    isSelected: selectedFilter == nil,
                    count: voiceLogManager.voiceLogs.count
                ) {
                    withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                        selectedFilter = nil
                    }
                }

                ForEach(LogCategory.allCases, id: \.self) { category in
                    FilterChip(
                        title: category.rawValue,
                        icon: category.icon,
                        isSelected: selectedFilter == category,
                        count: voiceLogManager.voiceLogs.filter { $0.category == category }.count,
                        color: getCategoryColor(category)
                    ) {
                        withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                            selectedFilter = category
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
                ScrollView {
                    LazyVStack(spacing: 0) {
                        ForEach(filteredLogs) { log in
                            VoiceLogRow(log: log, manager: voiceLogManager)
                                .background(Color(.systemBackground))

                            if log.id != filteredLogs.last?.id {
                                Divider()
                                    .padding(.leading, 68)
                            }
                        }
                    }
                    .background(
                        RoundedRectangle(cornerRadius: 16, style: .continuous)
                            .fill(Color(.systemBackground))
                    )
                    .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                    .shadow(color: .black.opacity(0.05), radius: 8, y: 2)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 16)
                }
            }
        }
    }

    // MARK: - Empty State

    private var emptyStateView: some View {
        ContentUnavailableView {
            Label("No Voice Logs", systemImage: "waveform")
        } description: {
            Text(selectedFilter == nil ?
                 "Your voice logs will appear here" :
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

    // MARK: - Helper Methods

    private func getCategoryColor(_ category: LogCategory) -> Color {
        switch category {
        case .food:
            return .orange
        case .hydration:
            return .blue
        case .supplements:
            return .green
        case .symptoms:
            return .purple
        }
    }
}

// MARK: - Filter Chip (iOS 26 Design)

struct FilterChip: View {
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
    return VoiceLogsView()
        .environmentObject(LogsManager(notificationManager: nm))
        .environmentObject(SupplementManager())
}
