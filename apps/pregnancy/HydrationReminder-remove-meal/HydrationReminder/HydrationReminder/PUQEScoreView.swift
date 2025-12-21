import SwiftUI

struct PUQEScoreView: View {
    @StateObject private var puqeManager = PUQEManager()
    @State private var showingScoreForm = false
    @State private var nauseaHours = 0
    @State private var vomitingEpisodes = 0
    @State private var retchingEpisodes = 0
    
    var body: some View {
        NavigationStack {
            ZStack(alignment: .top) {
                LinearGradient(
                    colors: [
                        Color.orange.opacity(0.1),
                        Color(.systemGroupedBackground)
                    ],
                    startPoint: .topLeading,
                    endPoint: .center
                )
                .ignoresSafeArea()
                
                ScrollView {
                    VStack(spacing: 20) {
                        todaysScoreCard
                        
                        Button(action: { showingScoreForm = true }) {
                        Label("Record Today's PUQE Score", systemImage: "plus.circle.fill")
                            .font(.headline)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 16)
                            .padding(.horizontal, 24)
                    }
                    .buttonStyle(.borderedProminent)
                    .controlSize(.large)
                    .tint(.blue)
                    .padding(.horizontal)
                    
                    if let trend = puqeManager.getTrend() {
                        trendCard(trend: trend)
                    }
                    
                        if !puqeManager.scores.isEmpty {
                            recentScoresSection
                        }
                    }
                }
            }
            .navigationTitle("PUQE Score")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .principal) {
                    VStack(spacing: 2) {
                        Text("PUQE Score")
                            .font(.headline)
                            .fontWeight(.bold)
                        Text("Nausea Tracking")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
                
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        // Show trend details
                    } label: {
                        Image(systemName: "chart.line.uptrend.xyaxis")
                    }
                }
                
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        // Show PUQE info
                    } label: {
                        Image(systemName: "info.circle")
                    }
                }
            }
            .toolbarBackground(.ultraThinMaterial, for: .navigationBar)
            .toolbarBackground(.visible, for: .navigationBar)
            .sheet(isPresented: $showingScoreForm) {
                PUQEScoreFormView(
                    nauseaHours: $nauseaHours,
                    vomitingEpisodes: $vomitingEpisodes,
                    retchingEpisodes: $retchingEpisodes,
                    onSave: saveScore,
                    onCancel: { showingScoreForm = false }
                )
            }
        }
    }
    
    private var todaysScoreCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Today's Score")
                .font(.headline)
                .foregroundColor(.secondary)
            
            if let todaysScore = puqeManager.todaysScore {
                HStack {
                    VStack(alignment: .leading) {
                        Text("\(todaysScore.totalScore)")
                            .font(.system(size: 48, weight: .bold))
                            .foregroundColor(todaysScore.severity.color)
                        Text(todaysScore.severity.rawValue)
                            .font(.title3)
                            .foregroundColor(todaysScore.severity.color)
                    }
                    
                    Spacer()
                    
                    VStack(alignment: .trailing, spacing: 8) {
                        scoreDetail(label: "Nausea", value: "\(todaysScore.nauseaHours)h")
                        scoreDetail(label: "Vomiting", value: "\(todaysScore.vomitingEpisodes)x")
                        scoreDetail(label: "Retching", value: "\(todaysScore.retchingEpisodes)x")
                    }
                }
                
                Text(todaysScore.severity.description)
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .padding(.top, 4)
            } else {
                Text("No score recorded today")
                    .font(.body)
                    .foregroundColor(.secondary)
                    .padding(.vertical)
            }
        }
        .padding(20)
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 20))
        .overlay(
            RoundedRectangle(cornerRadius: 20)
                .strokeBorder(.regularMaterial.opacity(0.5), lineWidth: 1)
        )
        .shadow(color: .black.opacity(0.05), radius: 10, x: 0, y: 4)
        .padding(.horizontal)
    }
    
    private func trendCard(trend: String) -> some View {
        HStack {
            Image(systemName: trend.contains("↓") ? "arrow.down.circle.fill" :
                              trend.contains("↑") ? "arrow.up.circle.fill" :
                              "arrow.right.circle.fill")
                .foregroundColor(trend.contains("↓") ? .green :
                               trend.contains("↑") ? .red : .blue)
                .font(.title2)
            
            VStack(alignment: .leading) {
                Text("7-Day Trend")
                    .font(.caption)
                    .foregroundColor(.secondary)
                Text(trend)
                    .font(.headline)
            }
            
            Spacer()
        }
        .padding(16)
        .background(.regularMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .shadow(color: .black.opacity(0.05), radius: 5, x: 0, y: 2)
        .padding(.horizontal)
    }
    
    private var recentScoresSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Recent Scores")
                .font(.headline)
                .padding(.horizontal)
            
            ForEach(puqeManager.scores.prefix(7)) { score in
                HStack {
                    VStack(alignment: .leading) {
                        Text(formatDate(score.date))
                            .font(.subheadline)
                        Text(score.severity.rawValue)
                            .font(.caption)
                            .foregroundColor(score.severity.color)
                    }
                    
                    Spacer()
                    
                    Text("\(score.totalScore)")
                        .font(.title2)
                        .fontWeight(.semibold)
                        .foregroundColor(score.severity.color)
                }
                .padding(16)
                .background(.regularMaterial)
                .clipShape(RoundedRectangle(cornerRadius: 12))
                .padding(.horizontal)
            }
        }
    }
    
    private func scoreDetail(label: String, value: String) -> some View {
        HStack {
            Text(label)
                .font(.caption)
                .foregroundColor(.secondary)
            Text(value)
                .font(.subheadline)
                .fontWeight(.medium)
        }
    }
    
    private func formatDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        if Calendar.current.isDateInToday(date) {
            return "Today"
        } else if Calendar.current.isDateInYesterday(date) {
            return "Yesterday"
        } else {
            formatter.dateStyle = .medium
            return formatter.string(from: date)
        }
    }
    
    private func saveScore() {
        puqeManager.addScore(
            nauseaHours: nauseaHours,
            vomitingEpisodes: vomitingEpisodes,
            retchingEpisodes: retchingEpisodes
        )
        showingScoreForm = false
        nauseaHours = 0
        vomitingEpisodes = 0
        retchingEpisodes = 0
    }
}

struct PUQEScoreFormView: View {
    @Binding var nauseaHours: Int
    @Binding var vomitingEpisodes: Int
    @Binding var retchingEpisodes: Int
    let onSave: () -> Void
    let onCancel: () -> Void
    
    var body: some View {
        NavigationView {
            Form {
                Section(header: Text("In the last 24 hours")) {
                    VStack(alignment: .leading) {
                        Text("Hours of nausea/feeling sick")
                            .font(.subheadline)
                        Picker("Nausea Hours", selection: $nauseaHours) {
                            Text("None").tag(0)
                            Text("≤1 hour").tag(1)
                            Text("2-3 hours").tag(2)
                            Text("4-6 hours").tag(4)
                            Text("7-12 hours").tag(7)
                            Text(">12 hours").tag(13)
                        }
                        .pickerStyle(SegmentedPickerStyle())
                    }
                    
                    VStack(alignment: .leading) {
                        Text("Number of vomiting episodes")
                            .font(.subheadline)
                        Stepper(value: $vomitingEpisodes, in: 0...20) {
                            HStack {
                                Text("Vomiting episodes:")
                                Spacer()
                                Text("\(vomitingEpisodes)")
                                    .fontWeight(.semibold)
                            }
                        }
                    }
                    
                    VStack(alignment: .leading) {
                        Text("Number of retching/dry heaving episodes")
                            .font(.subheadline)
                        Stepper(value: $retchingEpisodes, in: 0...20) {
                            HStack {
                                Text("Retching episodes:")
                                Spacer()
                                Text("\(retchingEpisodes)")
                                    .fontWeight(.semibold)
                            }
                        }
                    }
                }
                
                Section {
                    VStack(spacing: 8) {
                        Text("Estimated Score: \(calculateScore())")
                            .font(.title2)
                            .fontWeight(.bold)
                        Text(PUQESeverity(score: calculateScore()).rawValue)
                            .foregroundColor(PUQESeverity(score: calculateScore()).color)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 8)
                }
            }
            .navigationTitle("PUQE Score Assessment")
            .navigationBarItems(
                leading: Button("Cancel", action: onCancel),
                trailing: Button("Save", action: onSave)
                    .fontWeight(.semibold)
            )
        }
    }
    
    private func calculateScore() -> Int {
        let nauseaScore = PUQEScore.scoreForNausea(hours: nauseaHours)
        let vomitingScore = PUQEScore.scoreForVomiting(episodes: vomitingEpisodes)
        let retchingScore = PUQEScore.scoreForRetching(episodes: retchingEpisodes)
        return nauseaScore + vomitingScore + retchingScore
    }
}