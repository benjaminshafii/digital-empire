import Foundation
import HealthKit

@MainActor
class HealthKitManager: ObservableObject {
    static let shared = HealthKitManager()

    private let healthStore = HKHealthStore()
    @Published var isAuthorized = false
    @Published var errorMessage: String?

    private init() {
        checkAuthorization()
    }

    // MARK: - Authorization

    func checkAuthorization() {
        guard HKHealthStore.isHealthDataAvailable() else {
            isAuthorized = false
            return
        }

        guard let weightType = HKQuantityType.quantityType(forIdentifier: .bodyMass) else {
            return
        }

        let status = healthStore.authorizationStatus(for: weightType)
        isAuthorized = (status == .sharingAuthorized)
    }

    func requestAuthorization() async throws -> Bool {
        guard HKHealthStore.isHealthDataAvailable() else {
            throw HealthKitError.notAvailable
        }

        guard let weightType = HKQuantityType.quantityType(forIdentifier: .bodyMass) else {
            throw HealthKitError.dataTypeNotAvailable
        }

        let typesToRead: Set<HKObjectType> = [weightType]
        let typesToWrite: Set<HKSampleType> = [weightType]

        try await healthStore.requestAuthorization(
            toShare: typesToWrite,
            read: typesToRead
        )

        checkAuthorization()
        return isAuthorized
    }

    // MARK: - Reading Weight

    func fetchLatestWeight() async throws -> Double? {
        guard let weightType = HKQuantityType.quantityType(forIdentifier: .bodyMass) else {
            throw HealthKitError.dataTypeNotAvailable
        }

        let sortDescriptor = NSSortDescriptor(
            key: HKSampleSortIdentifierStartDate,
            ascending: false
        )

        return try await withCheckedThrowingContinuation { continuation in
            let query = HKSampleQuery(
                sampleType: weightType,
                predicate: nil,
                limit: 1,
                sortDescriptors: [sortDescriptor]
            ) { _, results, error in
                if let error = error {
                    continuation.resume(throwing: error)
                    return
                }

                guard let sample = results?.first as? HKQuantitySample else {
                    continuation.resume(returning: nil)
                    return
                }

                let weightInKg = sample.quantity.doubleValue(for: .gramUnit(with: .kilo))
                continuation.resume(returning: weightInKg)
            }

            self.healthStore.execute(query)
        }
    }

    func fetchWeightSamples(
        startDate: Date,
        endDate: Date = Date()
    ) async throws -> [WeightSample] {
        guard let weightType = HKQuantityType.quantityType(forIdentifier: .bodyMass) else {
            throw HealthKitError.dataTypeNotAvailable
        }

        let predicate = HKQuery.predicateForSamples(
            withStart: startDate,
            end: endDate,
            options: .strictStartDate
        )

        let sortDescriptor = NSSortDescriptor(
            key: HKSampleSortIdentifierStartDate,
            ascending: false
        )

        return try await withCheckedThrowingContinuation { continuation in
            let query = HKSampleQuery(
                sampleType: weightType,
                predicate: predicate,
                limit: HKObjectQueryNoLimit,
                sortDescriptors: [sortDescriptor]
            ) { _, results, error in
                if let error = error {
                    continuation.resume(throwing: error)
                    return
                }

                let samples = (results as? [HKQuantitySample] ?? []).map { sample in
                    WeightSample(
                        id: sample.uuid,
                        date: sample.startDate,
                        weightKg: sample.quantity.doubleValue(for: .gramUnit(with: .kilo)),
                        source: sample.sourceRevision.source.name
                    )
                }

                continuation.resume(returning: samples)
            }

            self.healthStore.execute(query)
        }
    }

    // MARK: - Writing Weight

    func saveWeight(weightKg: Double, date: Date = Date()) async throws {
        guard let weightType = HKQuantityType.quantityType(forIdentifier: .bodyMass) else {
            throw HealthKitError.dataTypeNotAvailable
        }

        // Validate weight
        guard weightKg >= 20 && weightKg <= 300 else {
            throw HealthKitError.invalidWeight
        }

        let weightQuantity = HKQuantity(
            unit: .gramUnit(with: .kilo),
            doubleValue: weightKg
        )

        let weightSample = HKQuantitySample(
            type: weightType,
            quantity: weightQuantity,
            start: date,
            end: date,
            metadata: [
                HKMetadataKeyWasUserEntered: true,
                "Source": "Corgina Pregnancy Tracker"
            ]
        )

        try await healthStore.save(weightSample)
    }

    // MARK: - Unit Conversion

    func convertKgToLbs(_ kg: Double) -> Double {
        return kg * 2.20462
    }

    func convertLbsToKg(_ lbs: Double) -> Double {
        return lbs / 2.20462
    }

    func formatWeight(_ weightKg: Double, useMetric: Bool = Locale.current.usesMetricSystem) -> String {
        if useMetric {
            return String(format: "%.1f kg", weightKg)
        } else {
            let lbs = convertKgToLbs(weightKg)
            return String(format: "%.1f lbs", lbs)
        }
    }
}

// MARK: - Supporting Types

struct WeightSample: Identifiable {
    let id: UUID
    let date: Date
    let weightKg: Double
    let source: String
}

enum HealthKitError: LocalizedError {
    case notAvailable
    case dataTypeNotAvailable
    case authorizationDenied
    case noDataAvailable
    case invalidWeight

    var errorDescription: String? {
        switch self {
        case .notAvailable:
            return "Apple Health is not available on this device"
        case .dataTypeNotAvailable:
            return "Weight data type is not available"
        case .authorizationDenied:
            return "Please enable Health access in Settings"
        case .noDataAvailable:
            return "No weight data found in Apple Health"
        case .invalidWeight:
            return "Weight must be between 20 and 300 kg"
        }
    }

    var recoverySuggestion: String? {
        switch self {
        case .notAvailable:
            return "Apple Health is only available on iPhone and Apple Watch"
        case .authorizationDenied:
            return "Go to Settings → Privacy & Security → Health → Corgina"
        case .noDataAvailable:
            return "Try entering your weight manually"
        default:
            return "Please try again or contact support"
        }
    }
}
