//
//  HealthKitManager.swift
//  phoneless-hevy Watch App
//
//  Created by Claude Code on 10/22/25.
//

import Foundation
import HealthKit

class HealthKitManager {
    static let shared = HealthKitManager()

    private let healthStore = HKHealthStore()

    private init() {}

    // MARK: - Authorization

    /// Request HealthKit authorization for required data types
    func requestAuthorization() async throws {
        // Check if HealthKit is available on this device
        guard HKHealthStore.isHealthDataAvailable() else {
            throw HealthKitError.notAvailable
        }

        // Define the data types we want to read
        let typesToRead: Set<HKObjectType> = [
            HKQuantityType.quantityType(forIdentifier: .heartRate)!,
            HKQuantityType.quantityType(forIdentifier: .activeEnergyBurned)!,
            HKQuantityType.quantityType(forIdentifier: .distanceWalkingRunning)!,
            HKObjectType.workoutType()
        ]

        // Define the data types we want to write
        let typesToWrite: Set<HKSampleType> = [
            HKQuantityType.quantityType(forIdentifier: .activeEnergyBurned)!,
            HKObjectType.workoutType()
        ]

        // Request authorization
        try await healthStore.requestAuthorization(toShare: typesToWrite, read: typesToRead)
    }

    /// Check if we have authorization for a specific type
    func authorizationStatus(for type: HKObjectType) -> HKAuthorizationStatus {
        return healthStore.authorizationStatus(for: type)
    }

    /// Check if we have all required authorizations
    func hasAllAuthorizations() -> Bool {
        let requiredTypes: [HKObjectType] = [
            HKQuantityType.quantityType(forIdentifier: .heartRate)!,
            HKQuantityType.quantityType(forIdentifier: .activeEnergyBurned)!,
            HKObjectType.workoutType()
        ]

        for type in requiredTypes {
            let status = authorizationStatus(for: type)
            if status == .notDetermined {
                return false
            }
        }

        return true
    }

    // MARK: - HealthStore Access

    /// Get the shared HKHealthStore instance
    func getHealthStore() -> HKHealthStore {
        return healthStore
    }
}

// MARK: - Error Types

enum HealthKitError: LocalizedError {
    case notAvailable
    case authorizationDenied

    var errorDescription: String? {
        switch self {
        case .notAvailable:
            return "HealthKit is not available on this device."
        case .authorizationDenied:
            return "HealthKit authorization was denied."
        }
    }
}
