import SwiftUI

struct LogLedgerView: View {
    @ObservedObject var logsManager: LogsManager
    @State private var selectedFilter: LogType? = nil
    @State private var showingPukeAlert = false
    @State private var pukeNotes: String = ""
    @State private var pukeSeverity: Int = 3
    @State private var relateToLastMeal = false
    @State private var showingExport = false
    @State private var exportText = ""
    
    var filteredLogs: [LogEntry] {
        logsManager.filteredLogs(by: selectedFilter)
    }
    
    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // Daily Summary Card
                if let summary = logsManager.todaysSummary {
                    VStack(spacing: 12) {
                        HStack {
                            Text("Today's Summary")
                                .font(.headline)
                            Spacer()
                            Text(summary.dateString)
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                        
                        HStack(spacing: 20) {
                            SummaryBadge(
                                icon: "fork.knife",
                                count: summary.foodCount,
                                color: .orange
                            )
                            
                            SummaryBadge(
                                icon: "drop.fill",
                                count: summary.drinkCount,
                                color: .blue
                            )
                            
                            SummaryBadge(
                                icon: "exclamationmark.triangle.fill",
                                count: summary.pukeCount,
                                color: .red
                            )
                            
                            SummaryBadge(
                                icon: "heart.text.square",
                                count: summary.symptomCount,
                                color: .purple
                            )
                        }
                        
                        if let keptDown = summary.keptDownPercentage {
                            HStack {
                                Image(systemName: keptDown >= 70 ? "checkmark.circle.fill" : "exclamationmark.circle.fill")
                                    .foregroundColor(keptDown >= 70 ? .green : .orange)
                                Text("\(Int(keptDown))% of meals kept down")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }
                        }
                        
                        if let commonTime = logsManager.getMostCommonSymptomTime() {
                            HStack {
                                Image(systemName: "clock")
                                    .foregroundColor(.secondary)
                                Text("Most symptoms around \(commonTime)")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }
                        }
                    }
                    .padding()
                    .background(Color(UIColor.secondarySystemBackground))
                    .cornerRadius(12)
                    .padding(.horizontal)
                    .padding(.top, 8)
                }
                
                // Quick Actions
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 12) {
                        QuickLogButton(
                            title: "Log Puke",
                            icon: "exclamationmark.triangle.fill",
                            color: .red,
                            action: { showingPukeAlert = true }
                        )
                        
                        QuickLogButton(
                            title: "Log Food",
                            icon: "fork.knife",
                            color: .orange,
                            action: { logsManager.logFood(source: .quick) }
                        )
                        
                        QuickLogButton(
                            title: "Log Drink",
                            icon: "drop.fill",
                            color: .blue,
                            action: { logsManager.logDrink(source: .quick) }
                        )
                    }
                    .padding(.horizontal)
                }
                .padding(.vertical, 12)
                
                // Filter
                Picker("Filter", selection: $selectedFilter) {
                    Text("All").tag(nil as LogType?)
                    ForEach(LogType.allCases, id: \.self) { type in
                        Label(type.rawValue, systemImage: type.icon)
                            .tag(type as LogType?)
                    }
                }
                .pickerStyle(SegmentedPickerStyle())
                .padding(.horizontal)
                .padding(.bottom, 8)
                
                // Timeline
                if filteredLogs.isEmpty {
                    Spacer()
                    VStack(spacing: 20) {
                        Image(systemName: "list.bullet.clipboard")
                            .font(.system(size: 60))
                            .foregroundColor(.gray)
                        Text("No logs yet")
                            .font(.title2)
                            .foregroundColor(.secondary)
                        Text("Your health timeline will appear here")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    .padding()
                    Spacer()
                } else {
                    List {
                        ForEach(groupedLogsByTime()) { section in
                            Section(header: Text(section.title)) {
                                ForEach(section.logs) { log in
                                    LogEntryRow(
                                        entry: log,
                                        relatedLogs: logsManager.getRelatedLogs(for: log),
                                        logsManager: logsManager
                                    )
                                    .swipeActions(edge: .trailing, allowsFullSwipe: false) {
                                        Button(role: .destructive) {
                                            withAnimation {
                                                logsManager.deleteLog(log)
                                            }
                                        } label: {
                                            Label("Delete", systemImage: "trash")
                                        }
                                    }
                                }
                            }
                        }
                    }
                    .listStyle(PlainListStyle())
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
        }
        .alert("Log Vomiting Episode", isPresented: $showingPukeAlert) {
            TextField("Notes (optional)", text: $pukeNotes)
            
            Button("Log", role: .destructive) {
                logsManager.logPuke(
                    severity: pukeSeverity,
                    notes: pukeNotes.isEmpty ? nil : pukeNotes,
                    relatedToLastMeal: relateToLastMeal
                )
                pukeNotes = ""
                pukeSeverity = 3
                relateToLastMeal = false
            }
            Button("Cancel", role: .cancel) {
                pukeNotes = ""
                pukeSeverity = 3
                relateToLastMeal = false
            }
        } message: {
            VStack(alignment: .leading, spacing: 8) {
                Text("Record this episode to track patterns")
                Toggle("Related to last meal", isOn: $relateToLastMeal)
            }
        }
        .sheet(isPresented: $showingExport) {
            NavigationView {
                ScrollView {
                    Text(exportText)
                        .font(.system(.body, design: .monospaced))
                        .padding()
                }
                .navigationTitle("Export")
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .navigationBarLeading) {
                        Button("Done") {
                            showingExport = false
                        }
                    }
                    ToolbarItem(placement: .navigationBarTrailing) {
                        ShareLink(item: exportText)
                    }
                }
            }
        }
    }
    
    private func groupedLogsByTime() -> [LogSection] {
        let calendar = Calendar.current
        let now = Date()
        var sections: [LogSection] = []
        
        // Group by time periods
        let last2Hours = filteredLogs.filter { 
            $0.date >= now.addingTimeInterval(-7200)
        }
        if !last2Hours.isEmpty {
            sections.append(LogSection(title: "Last 2 Hours", logs: last2Hours))
        }
        
        let today = filteredLogs.filter {
            calendar.isDateInToday($0.date) && 
            $0.date < now.addingTimeInterval(-7200)
        }
        if !today.isEmpty {
            sections.append(LogSection(title: "Earlier Today", logs: today))
        }
        
        let yesterday = filteredLogs.filter {
            calendar.isDateInYesterday($0.date)
        }
        if !yesterday.isEmpty {
            sections.append(LogSection(title: "Yesterday", logs: yesterday))
        }
        
        let older = filteredLogs.filter {
            !calendar.isDateInToday($0.date) &&
            !calendar.isDateInYesterday($0.date)
        }
        if !older.isEmpty {
            sections.append(LogSection(title: "Older", logs: older))
        }
        
        return sections
    }
}

struct LogSection: Identifiable {
    let id = UUID()
    let title: String
    let logs: [LogEntry]
}

struct SummaryBadge: View {
    let icon: String
    let count: Int
    let color: Color
    
    var body: some View {
        VStack(spacing: 4) {
            Image(systemName: icon)
                .font(.title3)
                .foregroundColor(color)
            Text("\(count)")
                .font(.headline)
                .foregroundColor(.primary)
        }
        .frame(maxWidth: .infinity)
    }
}

struct QuickLogButton: View {
    let title: String
    let icon: String
    let color: Color
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            VStack(spacing: 6) {
                Image(systemName: icon)
                    .font(.title2)
                Text(title)
                    .font(.caption)
                    .fontWeight(.medium)
            }
            .foregroundColor(.white)
            .frame(width: 80, height: 70)
            .background(color)
            .cornerRadius(12)
        }
    }
}