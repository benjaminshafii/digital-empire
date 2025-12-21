import Foundation
import SwiftUI

struct PUQEScore: Codable, Identifiable {
    let id: UUID
    let date: Date
    let nauseaHours: Int
    let vomitingEpisodes: Int
    let retchingEpisodes: Int
    let totalScore: Int
    let severity: PUQESeverity
    
    init(
        id: UUID = UUID(),
        date: Date = Date(),
        nauseaHours: Int,
        vomitingEpisodes: Int,
        retchingEpisodes: Int
    ) {
        self.id = id
        self.date = date
        self.nauseaHours = nauseaHours
        self.vomitingEpisodes = vomitingEpisodes
        self.retchingEpisodes = retchingEpisodes
        
        let nauseaScore = PUQEScore.scoreForNausea(hours: nauseaHours)
        let vomitingScore = PUQEScore.scoreForVomiting(episodes: vomitingEpisodes)
        let retchingScore = PUQEScore.scoreForRetching(episodes: retchingEpisodes)
        
        self.totalScore = nauseaScore + vomitingScore + retchingScore
        self.severity = PUQESeverity(score: totalScore)
    }
    
    static func scoreForNausea(hours: Int) -> Int {
        switch hours {
        case 0..<1:
            return 1
        case 1..<3:
            return 2
        case 3..<6:
            return 3
        case 6..<12:
            return 4
        default:
            return 5
        }
    }
    
    static func scoreForVomiting(episodes: Int) -> Int {
        switch episodes {
        case 0:
            return 1
        case 1..<2:
            return 2
        case 2..<4:
            return 3
        case 4..<6:
            return 4
        default:
            return 5
        }
    }
    
    static func scoreForRetching(episodes: Int) -> Int {
        switch episodes {
        case 0:
            return 1
        case 1..<2:
            return 2
        case 2..<4:
            return 3
        case 4..<6:
            return 4
        default:
            return 5
        }
    }
    
    var formattedDate: String {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .short
        return formatter.string(from: date)
    }
}

enum PUQESeverity: String, Codable {
    case mild = "Mild"
    case moderate = "Moderate"
    case severe = "Severe"
    
    init(score: Int) {
        switch score {
        case 3...6:
            self = .mild
        case 7...12:
            self = .moderate
        default:
            self = .severe
        }
    }
    
    var color: Color {
        switch self {
        case .mild:
            return .green
        case .moderate:
            return .orange
        case .severe:
            return .red
        }
    }
    
    var description: String {
        switch self {
        case .mild:
            return "Mild nausea and vomiting"
        case .moderate:
            return "Moderate symptoms - consider medical consultation"
        case .severe:
            return "Severe symptoms - medical attention recommended"
        }
    }
}

class PUQEManager: ObservableObject {
    @Published var scores: [PUQEScore] = []
    @Published var todaysScore: PUQEScore?
    
    private let userDefaultsKey = "PUQEScores"
    
    init() {
        loadScores()
        checkTodaysScore()
    }
    
    func addScore(nauseaHours: Int, vomitingEpisodes: Int, retchingEpisodes: Int) {
        let score = PUQEScore(
            nauseaHours: nauseaHours,
            vomitingEpisodes: vomitingEpisodes,
            retchingEpisodes: retchingEpisodes
        )
        scores.insert(score, at: 0)
        todaysScore = score
        saveScores()
    }
    
    func getLatestScore() -> PUQEScore? {
        return scores.first
    }
    
    func getScoresForLastDays(_ days: Int) -> [PUQEScore] {
        let cutoffDate = Calendar.current.date(byAdding: .day, value: -days, to: Date()) ?? Date()
        return scores.filter { $0.date >= cutoffDate }
    }
    
    func getAverageScore(forDays days: Int) -> Double? {
        let recentScores = getScoresForLastDays(days)
        guard !recentScores.isEmpty else { return nil }
        let total = recentScores.reduce(0) { $0 + $1.totalScore }
        return Double(total) / Double(recentScores.count)
    }
    
    func getTrend() -> String? {
        let lastWeek = getScoresForLastDays(7)
        guard lastWeek.count >= 3 else { return nil }
        
        let recentAvg = lastWeek.prefix(3).reduce(0) { $0 + $1.totalScore } / 3
        let olderAvg = lastWeek.suffix(3).reduce(0) { $0 + $1.totalScore } / 3
        
        if recentAvg < olderAvg - 1 {
            return "Improving ↓"
        } else if recentAvg > olderAvg + 1 {
            return "Worsening ↑"
        } else {
            return "Stable →"
        }
    }
    
    private func checkTodaysScore() {
        if let latestScore = scores.first {
            let calendar = Calendar.current
            if calendar.isDateInToday(latestScore.date) {
                todaysScore = latestScore
            }
        }
    }
    
    private func saveScores() {
        if let encoded = try? JSONEncoder().encode(scores) {
            UserDefaults.standard.set(encoded, forKey: userDefaultsKey)
        }
    }
    
    private func loadScores() {
        if let data = UserDefaults.standard.data(forKey: userDefaultsKey),
           let decoded = try? JSONDecoder().decode([PUQEScore].self, from: data) {
            scores = decoded
        }
    }
    
    func exportScoresAsCSV() -> String {
        var csv = "Date,Nausea Hours,Vomiting Episodes,Retching Episodes,Total Score,Severity\n"
        
        for score in scores {
            csv += "\(score.formattedDate),\(score.nauseaHours),\(score.vomitingEpisodes),\(score.retchingEpisodes),\(score.totalScore),\(score.severity.rawValue)\n"
        }
        
        return csv
    }
}