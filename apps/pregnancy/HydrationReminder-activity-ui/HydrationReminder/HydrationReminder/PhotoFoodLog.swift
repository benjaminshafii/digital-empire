import SwiftUI
import PhotosUI
import UIKit

struct PhotoFoodLog: Codable, Identifiable {
    let id: UUID
    var date: Date
    let imageData: Data
    var notes: String?
    var mealType: MealType?
    var aiAnalysis: FoodAnalysis?
    var isEnriched: Bool = false
    var enrichedDate: Date?
    
    init(id: UUID = UUID(), date: Date = Date(), imageData: Data, notes: String? = nil, mealType: MealType? = nil, aiAnalysis: FoodAnalysis? = nil) {
        self.id = id
        self.date = date
        self.imageData = imageData
        self.notes = notes
        self.mealType = mealType
        self.aiAnalysis = aiAnalysis
        self.isEnriched = aiAnalysis != nil
        self.enrichedDate = aiAnalysis != nil ? Date() : nil
    }
    
    var formattedDate: String {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .short
        return formatter.string(from: date)
    }
    
    var image: UIImage? {
        UIImage(data: imageData)
    }
}

class PhotoFoodLogManager: ObservableObject {
    @Published var photoLogs: [PhotoFoodLog] = []
    private let userDefaultsKey = "PhotoFoodLogs"
    private let maxImageSize: CGFloat = 1024
    
    init() {
        loadPhotoLogs()
    }
    
    func addPhotoLog(imageData: Data, notes: String? = nil, mealType: MealType? = nil, date: Date = Date()) {
        if let compressedData = compressImage(data: imageData) {
            let log = PhotoFoodLog(
                date: date,
                imageData: compressedData,
                notes: notes,
                mealType: mealType
            )
            photoLogs.insert(log, at: 0)
            savePhotoLogs()
        }
    }
    
    func updatePhotoLog(_ log: PhotoFoodLog, notes: String?, mealType: MealType?, date: Date? = nil) {
        if let index = photoLogs.firstIndex(where: { $0.id == log.id }) {
            var updatedLog = log
            updatedLog.notes = notes
            updatedLog.mealType = mealType
            if let date = date {
                updatedLog.date = date
            }
            photoLogs[index] = updatedLog
            savePhotoLogs()
        }
    }
    
    func enrichPhotoLog(_ log: PhotoFoodLog, with analysis: FoodAnalysis) {
        if let index = photoLogs.firstIndex(where: { $0.id == log.id }) {
            var updatedLog = log
            updatedLog.aiAnalysis = analysis
            updatedLog.isEnriched = true
            updatedLog.enrichedDate = Date()
            photoLogs[index] = updatedLog
            savePhotoLogs()
        }
    }
    
    func deletePhotoLog(_ log: PhotoFoodLog) {
        photoLogs.removeAll { $0.id == log.id }
        savePhotoLogs()
    }
    
    func getLogsForToday() -> [PhotoFoodLog] {
        let calendar = Calendar.current
        return photoLogs.filter { calendar.isDateInToday($0.date) }
    }
    
    func getLogsForDate(_ date: Date) -> [PhotoFoodLog] {
        let calendar = Calendar.current
        return photoLogs.filter { calendar.isDate($0.date, inSameDayAs: date) }
    }
    
    private func compressImage(data: Data) -> Data? {
        guard let uiImage = UIImage(data: data) else { return nil }
        
        let size = uiImage.size
        let targetSize: CGSize
        
        if size.width > maxImageSize || size.height > maxImageSize {
            let scale = min(maxImageSize / size.width, maxImageSize / size.height)
            targetSize = CGSize(width: size.width * scale, height: size.height * scale)
        } else {
            targetSize = size
        }
        
        UIGraphicsBeginImageContextWithOptions(targetSize, false, 0.0)
        uiImage.draw(in: CGRect(origin: .zero, size: targetSize))
        let resizedImage = UIGraphicsGetImageFromCurrentImageContext()
        UIGraphicsEndImageContext()
        
        return resizedImage?.jpegData(compressionQuality: 0.7)
    }
    
    func savePhotoLogs() {
        if let encoded = try? JSONEncoder().encode(photoLogs) {
            UserDefaults.standard.set(encoded, forKey: userDefaultsKey)
        }
    }
    
    private func loadPhotoLogs() {
        if let data = UserDefaults.standard.data(forKey: userDefaultsKey),
           let decoded = try? JSONDecoder().decode([PhotoFoodLog].self, from: data) {
            photoLogs = decoded
        }
    }
}