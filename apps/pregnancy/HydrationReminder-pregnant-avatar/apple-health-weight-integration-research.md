# Apple Health Weight Integration Research
## Best Practices for Pregnancy Tracking App

**Document Date:** 2025-10-17
**App Context:** Corgina - Privacy-first pregnancy tracking app (iOS 26)
**Focus:** HealthKit weight data read/write integration

---

## Executive Summary

This document provides comprehensive research and best practices for integrating Apple Health (HealthKit) weight tracking into the Corgina pregnancy tracking app. Key findings prioritize:

1. **Privacy-first design** - Aligns with your app's existing architecture (100% local data)
2. **Simple authorization flow** - Request only weight read/write permissions
3. **Seamless data sync** - Bidirectional sync with Apple Health
4. **SwiftUI-native patterns** - Modern iOS 26 compatible implementations
5. **User-friendly visualizations** - Weight trend charts for pregnancy journey

### Immediate Action Items

1. Add HealthKit capability to Xcode project
2. Update Info.plist with privacy descriptions
3. Create `HealthKitManager` singleton for authorization and data operations
4. Implement weight read/write functions with proper error handling
5. Add SwiftUI Charts framework for weight trend visualization
6. Support kg/lbs unit conversion based on user locale

---

## Table of Contents

1. [HealthKit Framework Setup](#1-healthkit-framework-setup)
2. [Info.plist Configuration](#2-infoplist-configuration)
3. [Authorization Best Practices](#3-authorization-best-practices)
4. [Reading Weight Data](#4-reading-weight-data)
5. [Writing Weight Data](#5-writing-weight-data)
6. [Handling Multiple Samples Per Day](#6-handling-multiple-samples-per-day)
7. [Data Synchronization Strategies](#7-data-synchronization-strategies)
8. [Error Handling and Edge Cases](#8-error-handling-and-edge-cases)
9. [UI Patterns for Weight Trends](#9-ui-patterns-for-weight-trends)
10. [Privacy and Security](#10-privacy-and-security)
11. [Testing Strategies](#11-testing-strategies)
12. [SwiftUI Integration Patterns](#12-swiftui-integration-patterns)
13. [Background Sync Considerations](#13-background-sync-considerations)
14. [Unit Conversion Best Practices](#14-unit-conversion-best-practices)
15. [Implementation Roadmap](#15-implementation-roadmap)

---

## 1. HealthKit Framework Setup

### Adding HealthKit Capability

**Step 1: Enable in Xcode**
1. Open project in Xcode
2. Select target → Signing & Capabilities
3. Click "+ Capability"
4. Add "HealthKit"

**Step 2: Import HealthKit Framework**
```swift
import HealthKit
```

### Availability Check

Always verify HealthKit is available on the device:

```swift
guard HKHealthStore.isHealthDataAvailable() else {
    // HealthKit is not available on this device
    // Show appropriate error message
    return
}
```

**Note:** HealthKit is available on iPhone and Apple Watch, but NOT on iPad or Mac.

### Architecture Recommendation

Create a dedicated manager class following your existing pattern:

```swift
import Foundation
import HealthKit

@MainActor
class HealthKitManager: ObservableObject {
    static let shared = HealthKitManager()

    private let healthStore = HKHealthStore()
    @Published var isAuthorized = false
    @Published var errorMessage: String?

    private init() {}

    // Authorization and data methods here
}
```

**Why this pattern:**
- Singleton matches your `OpenAIManager.shared` pattern
- `@MainActor` ensures UI updates happen on main thread
- `@Published` properties enable SwiftUI reactivity
- Private init prevents multiple instances

---

## 2. Info.plist Configuration

### Required Privacy Descriptions

Add these keys to your `Info.plist` file:

```xml
<key>NSHealthShareUsageDescription</key>
<string>Corgina needs access to read your weight data from Apple Health to track your pregnancy weight gain and provide personalized insights.</string>

<key>NSHealthUpdateUsageDescription</key>
<string>Corgina can save your weight entries to Apple Health so all your health data stays synchronized across your devices and apps.</string>
```

### Best Practices for Privacy Descriptions

1. **Be Specific:** Explain exactly what data you're accessing (weight)
2. **Explain Value:** Tell users WHY (pregnancy tracking, insights)
3. **Be Concise:** Keep under 2 sentences
4. **User-Centric Language:** Focus on user benefits, not technical requirements
5. **Consistent Branding:** Use your app name (Corgina)

### Current State Analysis

Your existing `Info.plist` already has:
- ✅ Microphone usage (for voice features)
- ✅ Speech recognition (for transcription)
- ✅ Camera and photo library (for food logging)
- ✅ Notifications
- ❌ Missing: HealthKit permissions (need to add)

---

## 3. Authorization Best Practices

### Permission Strategy

**Minimal Permissions Approach:**
Only request what you need - weight read and write access.

```swift
func requestAuthorization() async throws -> Bool {
    // Define the weight quantity type
    guard let weightType = HKQuantityType.quantityType(
        forIdentifier: .bodyMass
    ) else {
        throw HealthKitError.dataTypeNotAvailable
    }

    // Request authorization
    let typesToRead: Set<HKObjectType> = [weightType]
    let typesToWrite: Set<HKSampleType> = [weightType]

    try await healthStore.requestAuthorization(
        toShare: typesToWrite,
        read: typesToRead
    )

    // Check authorization status
    let status = healthStore.authorizationStatus(for: weightType)
    return status == .sharingAuthorized
}
```

### When to Request Authorization

**Best Practice:** Request authorization when user needs the feature, not on app launch.

**Recommended Flow:**
1. Show a card/button in Dashboard: "Connect to Apple Health"
2. Include brief explanation of benefits
3. Only request authorization when user taps the button
4. Handle denial gracefully with alternative manual entry

**Example UI Pattern:**

```swift
// In DashboardView
private var healthKitConnectionCard: some View {
    VStack(spacing: 16) {
        HStack {
            Image(systemName: "heart.circle.fill")
                .font(.title)
                .foregroundColor(.pink)

            VStack(alignment: .leading, spacing: 4) {
                Text("Connect Apple Health")
                    .font(.headline)
                Text("Sync weight data automatically")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }

            Spacer()
        }

        Button(action: {
            Task {
                await healthKitManager.requestAuthorization()
            }
        }) {
            HStack {
                Image(systemName: "plus.circle.fill")
                Text("Connect")
            }
            .frame(maxWidth: .infinity)
            .padding()
        }
        .buttonStyle(.borderedProminent)
        .tint(.pink)
    }
    .padding(20)
    .background(Color(.secondarySystemBackground))
    .clipShape(RoundedRectangle(cornerRadius: 16))
    .shadow(color: .black.opacity(0.05), radius: 8, x: 0, y: 3)
}
```

### Authorization Status Handling

HealthKit has unique authorization behavior:

```swift
enum HKAuthorizationStatus {
    case notDetermined  // User hasn't been asked
    case sharingDenied  // User denied access
    case sharingAuthorized  // User granted access
}
```

**Important Privacy Note:**
- For READ permissions, HealthKit may return `.notDetermined` even after authorization
- This prevents apps from knowing if user denied access (privacy protection)
- Always attempt to read data; handle "no data" gracefully

```swift
func checkAuthorizationStatus() -> HKAuthorizationStatus {
    guard let weightType = HKQuantityType.quantityType(
        forIdentifier: .bodyMass
    ) else {
        return .notDetermined
    }

    return healthStore.authorizationStatus(for: weightType)
}
```

### Error Handling During Authorization

```swift
func requestAuthorizationWithErrorHandling() async {
    do {
        let authorized = try await requestAuthorization()

        if authorized {
            await MainActor.run {
                isAuthorized = true
                errorMessage = nil
            }
        } else {
            await MainActor.run {
                errorMessage = "Please enable Health access in Settings"
            }
        }
    } catch {
        await MainActor.run {
            errorMessage = "Failed to connect to Apple Health: \(error.localizedDescription)"
        }
    }
}
```

---

## 4. Reading Weight Data

### Fetching Latest Weight

Most common use case - get the user's most recent weight:

```swift
func fetchLatestWeight() async throws -> Double? {
    guard let weightType = HKQuantityType.quantityType(
        forIdentifier: .bodyMass
    ) else {
        throw HealthKitError.dataTypeNotAvailable
    }

    // Create a sort descriptor for most recent first
    let sortDescriptor = NSSortDescriptor(
        key: HKSampleSortIdentifierStartDate,
        ascending: false
    )

    // Create query limited to 1 result
    let query = HKSampleQuery(
        sampleType: weightType,
        predicate: nil,
        limit: 1,
        sortDescriptors: [sortDescriptor]
    ) { query, results, error in
        // Handle results
    }

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

            // Convert to kilograms (standard unit)
            let weightInKg = sample.quantity.doubleValue(for: .gramUnit(with: .kilo))
            continuation.resume(returning: weightInKg)
        }

        healthStore.execute(query)
    }
}
```

### Fetching Weight History

Get weight data for a specific date range:

```swift
func fetchWeightSamples(
    startDate: Date,
    endDate: Date = Date()
) async throws -> [WeightSample] {
    guard let weightType = HKQuantityType.quantityType(
        forIdentifier: .bodyMass
    ) else {
        throw HealthKitError.dataTypeNotAvailable
    }

    // Create predicate for date range
    let predicate = HKQuery.predicateForSamples(
        withStart: startDate,
        end: endDate,
        options: .strictStartDate
    )

    // Sort by date descending (most recent first)
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

        healthStore.execute(query)
    }
}

// Supporting struct
struct WeightSample: Identifiable {
    let id: UUID
    let date: Date
    let weightKg: Double
    let source: String  // "Corgina", "Health", "MyFitnessPal", etc.
}
```

### Using Statistics Queries for Aggregation

For charts and trends, use `HKStatisticsCollectionQuery`:

```swift
func fetchWeeklyAverageWeight() async throws -> [(date: Date, avgWeight: Double)] {
    guard let weightType = HKQuantityType.quantityType(
        forIdentifier: .bodyMass
    ) else {
        throw HealthKitError.dataTypeNotAvailable
    }

    let calendar = Calendar.current
    let now = Date()

    // Get start of 12 weeks ago
    guard let startDate = calendar.date(
        byAdding: .weekOfYear,
        value: -12,
        to: calendar.startOfDay(for: now)
    ) else {
        throw HealthKitError.invalidDateRange
    }

    // Create anchor date (start of week)
    let anchorDate = calendar.date(
        from: calendar.dateComponents(
            [.yearForWeekOfYear, .weekOfYear],
            from: now
        )
    ) ?? now

    // Weekly intervals
    let intervalComponents = DateComponents(weekOfYear: 1)

    let predicate = HKQuery.predicateForSamples(
        withStart: startDate,
        end: now,
        options: .strictStartDate
    )

    return try await withCheckedThrowingContinuation { continuation in
        let query = HKStatisticsCollectionQuery(
            quantityType: weightType,
            quantitySamplePredicate: predicate,
            options: .discreteAverage,
            anchorDate: anchorDate,
            intervalComponents: intervalComponents
        )

        query.initialResultsHandler = { query, collection, error in
            if let error = error {
                continuation.resume(throwing: error)
                return
            }

            guard let collection = collection else {
                continuation.resume(returning: [])
                return
            }

            var results: [(Date, Double)] = []

            collection.enumerateStatistics(
                from: startDate,
                to: now
            ) { statistics, stop in
                if let average = statistics.averageQuantity() {
                    let avgWeight = average.doubleValue(for: .gramUnit(with: .kilo))
                    results.append((statistics.startDate, avgWeight))
                }
            }

            continuation.resume(returning: results)
        }

        healthStore.execute(query)
    }
}
```

---

## 5. Writing Weight Data

### Saving a Single Weight Sample

```swift
func saveWeight(
    weightKg: Double,
    date: Date = Date()
) async throws {
    guard let weightType = HKQuantityType.quantityType(
        forIdentifier: .bodyMass
    ) else {
        throw HealthKitError.dataTypeNotAvailable
    }

    // Create quantity with weight value
    let weightQuantity = HKQuantity(
        unit: .gramUnit(with: .kilo),
        doubleValue: weightKg
    )

    // Create sample
    let weightSample = HKQuantitySample(
        type: weightType,
        quantity: weightQuantity,
        start: date,
        end: date,
        metadata: [
            HKMetadataKeyWasUserEntered: true  // Important for transparency
        ]
    )

    // Save to HealthKit
    try await healthStore.save(weightSample)
}
```

### Adding Metadata

Best practice: Add metadata to indicate source and context:

```swift
func saveWeightWithMetadata(
    weightKg: Double,
    date: Date = Date(),
    notes: String? = nil
) async throws {
    guard let weightType = HKQuantityType.quantityType(
        forIdentifier: .bodyMass
    ) else {
        throw HealthKitError.dataTypeNotAvailable
    }

    let weightQuantity = HKQuantity(
        unit: .gramUnit(with: .kilo),
        doubleValue: weightKg
    )

    // Build metadata dictionary
    var metadata: [String: Any] = [
        HKMetadataKeyWasUserEntered: true
    ]

    // Add notes if provided
    if let notes = notes, !notes.isEmpty {
        metadata["Notes"] = notes
        metadata["Source"] = "Corgina Pregnancy Tracker"
    }

    let weightSample = HKQuantitySample(
        type: weightType,
        quantity: weightQuantity,
        start: date,
        end: date,
        metadata: metadata
    )

    try await healthStore.save(weightSample)
}
```

### Batch Saving Multiple Samples

For initial sync or bulk import:

```swift
func saveMultipleWeights(_ weights: [(date: Date, weightKg: Double)]) async throws {
    guard let weightType = HKQuantityType.quantityType(
        forIdentifier: .bodyMass
    ) else {
        throw HealthKitError.dataTypeNotAvailable
    }

    let samples = weights.map { weight in
        let quantity = HKQuantity(
            unit: .gramUnit(with: .kilo),
            doubleValue: weight.weightKg
        )

        return HKQuantitySample(
            type: weightType,
            quantity: quantity,
            start: weight.date,
            end: weight.date,
            metadata: [HKMetadataKeyWasUserEntered: true]
        )
    }

    try await healthStore.save(samples)
}
```

---

## 6. Handling Multiple Samples Per Day

### The Challenge

Users may weigh themselves multiple times per day:
- Morning weight (most accurate)
- Evening weight
- After meals
- Multiple apps writing data

### Recommended Strategy

**1. Fetch all samples for the day:**

```swift
func fetchTodayWeightSamples() async throws -> [WeightSample] {
    let calendar = Calendar.current
    let startOfDay = calendar.startOfDay(for: Date())
    let endOfDay = calendar.date(byAdding: .day, value: 1, to: startOfDay) ?? Date()

    return try await fetchWeightSamples(
        startDate: startOfDay,
        endDate: endOfDay
    )
}
```

**2. Display strategy options:**

**Option A: Show earliest (morning weight)**
```swift
func getMorningWeight(from samples: [WeightSample]) -> WeightSample? {
    samples.min(by: { $0.date < $1.date })
}
```

**Option B: Show latest**
```swift
func getLatestWeight(from samples: [WeightSample]) -> WeightSample? {
    samples.max(by: { $0.date < $1.date })
}
```

**Option C: Calculate average**
```swift
func getAverageWeight(from samples: [WeightSample]) -> Double? {
    guard !samples.isEmpty else { return nil }
    let sum = samples.reduce(0.0) { $0 + $1.weightKg }
    return sum / Double(samples.count)
}
```

**Recommendation for pregnancy tracking:** Use earliest (morning) weight as it's most consistent and accurate.

### UI Pattern for Multiple Samples

Show user all samples with visual indicator:

```swift
struct DayWeightView: View {
    let samples: [WeightSample]

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Today's Weight")
                .font(.headline)

            if samples.isEmpty {
                Text("No weight recorded today")
                    .font(.caption)
                    .foregroundColor(.secondary)
            } else if samples.count == 1 {
                WeightCard(sample: samples[0], isMorning: true)
            } else {
                // Multiple samples
                ForEach(samples) { sample in
                    WeightCard(
                        sample: sample,
                        isMorning: sample == samples.min(by: { $0.date < $1.date })
                    )
                }

                Text("Morning weight is used for tracking")
                    .font(.caption2)
                    .foregroundColor(.secondary)
            }
        }
    }
}
```

---

## 7. Data Synchronization Strategies

### Bidirectional Sync Architecture

Your app needs to:
1. **Read from HealthKit** → Display in app
2. **Write to HealthKit** → Save user entries
3. **Detect conflicts** → Handle duplicates
4. **Update UI reactively** → Show latest data

### Sync Strategy: Pull on Launch + Observer

```swift
@MainActor
class WeightSyncManager: ObservableObject {
    private let healthKitManager = HealthKitManager.shared
    @Published var currentWeight: Double?
    @Published var weightHistory: [WeightSample] = []
    @Published var lastSyncDate: Date?

    // Initial sync on app launch
    func initialSync() async {
        guard healthKitManager.isAuthorized else { return }

        do {
            // Fetch latest weight
            currentWeight = try await healthKitManager.fetchLatestWeight()

            // Fetch history (last 40 weeks for pregnancy)
            let startDate = Calendar.current.date(
                byAdding: .weekOfYear,
                value: -40,
                to: Date()
            ) ?? Date()

            weightHistory = try await healthKitManager.fetchWeightSamples(
                startDate: startDate
            )

            lastSyncDate = Date()
        } catch {
            print("Sync error: \(error)")
        }
    }
}
```

### Preventing Duplicates

**Problem:** User enters weight in your app, then it syncs to HealthKit, then you read it back = duplicate

**Solution:** Track UUIDs and source

```swift
struct WeightEntry: Identifiable, Codable {
    let id: UUID
    let date: Date
    let weightKg: Double
    let source: WeightSource
    var healthKitUUID: UUID?  // Track HealthKit sample ID
}

enum WeightSource: String, Codable {
    case manual = "Manual Entry"
    case healthKit = "Apple Health"
    case imported = "Imported"
}

func syncToHealthKit(_ entry: WeightEntry) async throws {
    // Skip if already synced
    guard entry.healthKitUUID == nil else { return }

    let sample = try await healthKitManager.saveWeight(
        weightKg: entry.weightKg,
        date: entry.date
    )

    // Store the HealthKit UUID to prevent re-syncing
    entry.healthKitUUID = sample.uuid
}
```

### Conflict Resolution Strategy

When same date has data in both app and HealthKit:

```swift
func resolveConflict(
    appEntry: WeightEntry,
    healthKitSample: WeightSample
) -> WeightEntry {
    // Use most recent timestamp
    if healthKitSample.date > appEntry.date {
        return WeightEntry(
            id: healthKitSample.id,
            date: healthKitSample.date,
            weightKg: healthKitSample.weightKg,
            source: .healthKit,
            healthKitUUID: healthKitSample.id
        )
    } else {
        return appEntry
    }
}
```

---

## 8. Error Handling and Edge Cases

### Common Errors and Solutions

```swift
enum HealthKitError: LocalizedError {
    case notAvailable
    case dataTypeNotAvailable
    case authorizationDenied
    case noDataAvailable
    case invalidDateRange
    case saveFailed(Error)
    case fetchFailed(Error)

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
        case .invalidDateRange:
            return "Invalid date range specified"
        case .saveFailed(let error):
            return "Failed to save weight: \(error.localizedDescription)"
        case .fetchFailed(let error):
            return "Failed to fetch weight: \(error.localizedDescription)"
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
```

### Graceful Degradation

Always provide fallback for when HealthKit is unavailable:

```swift
struct WeightInputView: View {
    @StateObject private var healthKitManager = HealthKitManager.shared
    @State private var weight: String = ""
    @State private var showHealthKitSync = false

    var body: some View {
        VStack(spacing: 20) {
            // Manual entry (always available)
            TextField("Enter weight", text: $weight)
                .keyboardType(.decimalPad)

            Button("Save") {
                saveWeight()
            }

            // Optional: HealthKit sync
            if HKHealthStore.isHealthDataAvailable() {
                Button("Sync with Apple Health") {
                    showHealthKitSync = true
                }
                .disabled(!healthKitManager.isAuthorized)
            }
        }
    }

    func saveWeight() {
        guard let weightValue = Double(weight) else { return }

        // Always save to local storage first
        saveToLocalStorage(weightValue)

        // Optionally sync to HealthKit
        if healthKitManager.isAuthorized {
            Task {
                try? await healthKitManager.saveWeight(weightKg: weightValue)
            }
        }
    }
}
```

### Edge Cases to Handle

1. **No internet required** - HealthKit is local ✅
2. **Device doesn't support HealthKit** - Graceful fallback ✅
3. **User revokes permission** - Detect and show re-authorization option
4. **Corrupted data** - Validate before displaying
5. **Future dates** - Reject or warn user
6. **Unrealistic values** - Validate range (e.g., 20-300 kg)

```swift
func validateWeight(_ weightKg: Double) throws {
    guard weightKg >= 20 && weightKg <= 300 else {
        throw HealthKitError.invalidWeight("Weight must be between 20 and 300 kg")
    }
}

func validateDate(_ date: Date) throws {
    let tomorrow = Calendar.current.date(byAdding: .day, value: 1, to: Date()) ?? Date()
    guard date < tomorrow else {
        throw HealthKitError.invalidDate("Cannot log weight for future dates")
    }
}
```

---

## 9. UI Patterns for Weight Trends

### SwiftUI Charts Framework (iOS 16+)

Apple's native Charts framework is perfect for pregnancy weight tracking:

```swift
import SwiftUI
import Charts

struct WeightTrendChart: View {
    let samples: [WeightSample]
    let recommendedRange: (min: Double, max: Double)?

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Weight Trend")
                .font(.headline)

            Chart {
                // Recommended range background
                if let range = recommendedRange {
                    RectangleMark(
                        xStart: .value("Start", samples.first?.date ?? Date()),
                        xEnd: .value("End", samples.last?.date ?? Date()),
                        yStart: .value("Min", range.min),
                        yEnd: .value("Max", range.max)
                    )
                    .foregroundStyle(.green.opacity(0.1))
                }

                // Actual weight line
                ForEach(samples) { sample in
                    LineMark(
                        x: .value("Date", sample.date),
                        y: .value("Weight", sample.weightKg)
                    )
                    .foregroundStyle(.pink)
                    .interpolationMethod(.catmullRom)

                    PointMark(
                        x: .value("Date", sample.date),
                        y: .value("Weight", sample.weightKg)
                    )
                    .foregroundStyle(.pink)
                }
            }
            .chartXAxis {
                AxisMarks(values: .stride(by: .weekOfYear)) { value in
                    AxisGridLine()
                    AxisValueLabel(format: .dateTime.month().day())
                }
            }
            .chartYAxis {
                AxisMarks { value in
                    AxisGridLine()
                    AxisValueLabel()
                }
            }
            .frame(height: 250)

            // Legend
            HStack(spacing: 20) {
                Label("Your Weight", systemImage: "circle.fill")
                    .foregroundColor(.pink)
                    .font(.caption)

                if recommendedRange != nil {
                    Label("Healthy Range", systemImage: "square.fill")
                        .foregroundColor(.green.opacity(0.3))
                        .font(.caption)
                }
            }
        }
        .padding()
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }
}
```

### Pregnancy-Specific Recommended Range

Calculate based on pre-pregnancy BMI:

```swift
struct PregnancyWeightRecommendations {
    let prePregnancyWeightKg: Double
    let heightMeters: Double

    var bmi: Double {
        prePregnancyWeightKg / (heightMeters * heightMeters)
    }

    var totalWeightGainRange: (min: Double, max: Double) {
        switch bmi {
        case ..<18.5:  // Underweight
            return (12.7, 18.1)  // 28-40 lbs
        case 18.5..<25:  // Normal
            return (11.3, 15.9)  // 25-35 lbs
        case 25..<30:  // Overweight
            return (6.8, 11.3)  // 15-25 lbs
        default:  // Obese (BMI ≥ 30)
            return (5.0, 9.1)  // 11-20 lbs
        }
    }

    func recommendedWeightForWeek(_ week: Int) -> (min: Double, max: Double) {
        let totalGain = totalWeightGainRange

        // Weight gain recommendations by trimester
        if week <= 13 {
            // First trimester: 1-4.5 lbs total
            let fraction = Double(week) / 13.0
            return (
                prePregnancyWeightKg + (0.45 * fraction),
                prePregnancyWeightKg + (2.0 * fraction)
            )
        } else {
            // Second & third trimester: steady gain
            let weeksIntoGain = week - 13
            let fraction = Double(weeksIntoGain) / 27.0
            return (
                prePregnancyWeightKg + 2.0 + (totalGain.min - 2.0) * fraction,
                prePregnancyWeightKg + 2.0 + (totalGain.max - 2.0) * fraction
            )
        }
    }
}
```

### Card-Based Display Pattern

Matches your existing dashboard design:

```swift
struct WeightSummaryCard: View {
    let currentWeight: Double?
    let weeksSinceConception: Int
    let recommendations: PregnancyWeightRecommendations

    var body: some View {
        VStack(spacing: 16) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Current Weight")
                        .font(.headline)

                    if let weight = currentWeight {
                        HStack(alignment: .firstTextBaseline, spacing: 4) {
                            Text(formatWeight(weight))
                                .font(.system(size: 34, weight: .bold))

                            Text(getUnit())
                                .font(.title3)
                                .foregroundColor(.secondary)
                        }
                    } else {
                        Text("Not recorded")
                            .font(.title3)
                            .foregroundColor(.secondary)
                    }
                }

                Spacer()

                Image(systemName: "figure.stand")
                    .font(.system(size: 40))
                    .foregroundColor(.pink)
            }

            // Recommended range
            if let weight = currentWeight {
                let range = recommendations.recommendedWeightForWeek(weeksSinceConception)
                let isInRange = weight >= range.min && weight <= range.max

                HStack {
                    Image(systemName: isInRange ? "checkmark.circle.fill" : "info.circle.fill")
                        .foregroundColor(isInRange ? .green : .orange)

                    Text(isInRange ? "Within healthy range" : "Outside recommended range")
                        .font(.caption)

                    Spacer()

                    Text("\(formatWeight(range.min)) - \(formatWeight(range.max))")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }

            NavigationLink(destination: WeightDetailView()) {
                HStack {
                    Image(systemName: "chart.line.uptrend.xyaxis")
                    Text("View Trend")
                }
                .frame(maxWidth: .infinity)
                .padding()
            }
            .buttonStyle(.bordered)
            .tint(.pink)
        }
        .padding(20)
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .shadow(color: .black.opacity(0.05), radius: 8, x: 0, y: 3)
    }
}
```

---

## 10. Privacy and Security

### HealthKit Privacy Principles

1. **User Control:** User decides what to share
2. **Transparency:** Clear explanation of data usage
3. **No Cloud:** HealthKit data never leaves device
4. **Sandboxed:** Apps can't see each other's data
5. **Explicit Authorization:** Required for each data type

### Your App's Privacy Alignment

Your existing privacy-first architecture is PERFECT for HealthKit:

✅ **100% local storage** - Matches HealthKit's on-device model
✅ **No cloud sync** - HealthKit data stays on device
✅ **User-owned data** - Users control their health information
✅ **Optional AI** - HealthKit integration works without OpenAI

### Privacy Best Practices

**1. Minimal Data Collection**
```swift
// ✅ GOOD: Only request weight
let typesToRead: Set = [HKQuantityType.quantityType(forIdentifier: .bodyMass)!]

// ❌ BAD: Request everything
let typesToRead = HKObjectType.quantityType(forIdentifier: .bodyMass)!
// ... plus 20 other types you don't need
```

**2. Clear Communication**
```swift
// Show before requesting authorization
struct HealthKitPermissionExplanation: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Why Apple Health?")
                .font(.headline)

            Label("Automatic weight tracking", systemImage: "figure.stand")
            Label("All data stays on your device", systemImage: "lock.shield")
            Label("Works with your other health apps", systemImage: "apps.iphone")

            Text("Corgina will never upload your health data to the cloud")
                .font(.caption)
                .foregroundColor(.secondary)
        }
    }
}
```

**3. Don't Store Sensitive Data Externally**
```swift
// ✅ GOOD: Read from HealthKit on demand
func getCurrentWeight() async -> Double? {
    return try? await healthKitManager.fetchLatestWeight()
}

// ❌ BAD: Don't send to external APIs
func uploadWeightToServer(_ weight: Double) async {
    // NEVER DO THIS with HealthKit data
}
```

**4. Respect Authorization Changes**
```swift
// User can revoke permission at any time
func handleAuthorizationChange() {
    let status = healthKitManager.checkAuthorizationStatus()

    if status == .sharingDenied {
        // Gracefully disable HealthKit features
        // Fall back to manual entry
        showHealthKitDisabledMessage()
    }
}
```

### Data Retention Policy

Since you store everything locally:
- Weight data persists only on device
- Users can delete entries anytime (swipe to delete)
- When user deletes app, all local data is removed
- HealthKit data remains in Health app (user controlled)

### Compliance Notes

✅ **HIPAA:** Not applicable (consumer wellness app)
✅ **GDPR:** User has full control and data portability
✅ **App Store Review:** Clear privacy policy required
✅ **HealthKit Guidelines:** Must benefit user's health understanding

---

## 11. Testing Strategies

### Manual Testing

**Test Scenarios:**

1. **First Launch Flow**
   - [ ] HealthKit authorization appears when user taps "Connect"
   - [ ] Clear explanation shown before permission request
   - [ ] App functions normally if user denies permission

2. **Reading Weight**
   - [ ] Fetch latest weight correctly
   - [ ] Handle no data gracefully
   - [ ] Display multiple samples per day correctly
   - [ ] Show correct units (kg/lbs) based on locale

3. **Writing Weight**
   - [ ] Save weight to HealthKit successfully
   - [ ] Weight appears in Apple Health app
   - [ ] Metadata is correctly attached
   - [ ] Date/time is accurate

4. **Edge Cases**
   - [ ] App works on iPad (no HealthKit available)
   - [ ] Handle user revoking permission
   - [ ] Very large datasets (100+ weight entries)
   - [ ] Network offline (should still work)

### Unit Testing

```swift
import XCTest
import HealthKit
@testable import Corgina

class HealthKitManagerTests: XCTestCase {
    var sut: HealthKitManager!

    override func setUp() {
        super.setUp()
        sut = HealthKitManager.shared
    }

    func testWeightConversion() {
        // Test kg to lbs conversion
        let weightKg = 70.0
        let weightLbs = sut.convertKgToLbs(weightKg)
        XCTAssertEqual(weightLbs, 154.32, accuracy: 0.01)
    }

    func testPregnancyWeightRecommendations() {
        let recommendations = PregnancyWeightRecommendations(
            prePregnancyWeightKg: 60.0,
            heightMeters: 1.65
        )

        // Test BMI calculation
        XCTAssertEqual(recommendations.bmi, 22.04, accuracy: 0.01)

        // Test week 20 recommendations
        let week20Range = recommendations.recommendedWeightForWeek(20)
        XCTAssertTrue(week20Range.min < week20Range.max)
    }

    func testWeightValidation() {
        XCTAssertNoThrow(try sut.validateWeight(70.0))
        XCTAssertThrowsError(try sut.validateWeight(500.0))
        XCTAssertThrowsError(try sut.validateWeight(-10.0))
    }
}
```

### Integration Testing

```swift
func testHealthKitRoundTrip() async throws {
    // This test requires HealthKit authorization
    guard HKHealthStore.isHealthDataAvailable() else {
        throw XCTSkip("HealthKit not available on this device")
    }

    let testWeight = 68.5
    let testDate = Date()

    // 1. Save weight
    try await sut.saveWeight(weightKg: testWeight, date: testDate)

    // 2. Fetch it back
    let fetchedWeight = try await sut.fetchLatestWeight()

    // 3. Verify
    XCTAssertEqual(fetchedWeight, testWeight, accuracy: 0.1)
}
```

### Testing on Real Devices

**Required:**
- Test on real iPhone (Simulator has limited HealthKit)
- Test with existing Health data
- Test with empty Health data

**Sample Data Setup:**
```swift
#if DEBUG
extension HealthKitManager {
    func seedTestData() async throws {
        let calendar = Calendar.current
        let today = Date()

        // Create 12 weeks of weight data
        for week in 0...12 {
            guard let date = calendar.date(
                byAdding: .weekOfYear,
                value: -week,
                to: today
            ) else { continue }

            let weight = 65.0 + Double(week) * 0.5  // Gradual gain
            try await saveWeight(weightKg: weight, date: date)
        }
    }
}
#endif
```

---

## 12. SwiftUI Integration Patterns

### ViewModel Pattern

Create a dedicated ViewModel for weight management:

```swift
@MainActor
class WeightViewModel: ObservableObject {
    @Published var currentWeight: Double?
    @Published var weightHistory: [WeightSample] = []
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var isHealthKitAuthorized = false

    private let healthKitManager = HealthKitManager.shared
    private let logsManager: LogsManager

    init(logsManager: LogsManager) {
        self.logsManager = logsManager
    }

    func checkAuthorization() {
        isHealthKitAuthorized = healthKitManager.checkAuthorizationStatus() == .sharingAuthorized
    }

    func requestAuthorization() async {
        do {
            let authorized = try await healthKitManager.requestAuthorization()
            isHealthKitAuthorized = authorized

            if authorized {
                await fetchWeightData()
            }
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func fetchWeightData() async {
        isLoading = true
        errorMessage = nil

        do {
            currentWeight = try await healthKitManager.fetchLatestWeight()

            let startDate = Calendar.current.date(
                byAdding: .weekOfYear,
                value: -40,
                to: Date()
            ) ?? Date()

            weightHistory = try await healthKitManager.fetchWeightSamples(
                startDate: startDate
            )
        } catch {
            errorMessage = "Failed to fetch weight data"
        }

        isLoading = false
    }

    func saveWeight(_ weightKg: Double, date: Date = Date()) async {
        isLoading = true
        errorMessage = nil

        do {
            // Save to HealthKit
            if isHealthKitAuthorized {
                try await healthKitManager.saveWeight(weightKg: weightKg, date: date)
            }

            // Also save to local logs (your existing system)
            logsManager.logWeight(weightKg: weightKg, date: date, source: .manual)

            // Refresh data
            await fetchWeightData()
        } catch {
            errorMessage = "Failed to save weight"
        }

        isLoading = false
    }
}
```

### View Integration

```swift
struct WeightTrackingView: View {
    @StateObject private var viewModel: WeightViewModel
    @EnvironmentObject var logsManager: LogsManager

    init(logsManager: LogsManager) {
        _viewModel = StateObject(wrappedValue: WeightViewModel(logsManager: logsManager))
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    if viewModel.isHealthKitAuthorized {
                        // Show weight data
                        if let weight = viewModel.currentWeight {
                            WeightSummaryCard(currentWeight: weight)
                        }

                        WeightTrendChart(samples: viewModel.weightHistory)

                        WeightHistoryList(samples: viewModel.weightHistory)
                    } else {
                        // Show authorization prompt
                        HealthKitAuthorizationCard {
                            Task {
                                await viewModel.requestAuthorization()
                            }
                        }
                    }
                }
                .padding()
            }
            .navigationTitle("Weight Tracking")
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    Button {
                        showAddWeight = true
                    } label: {
                        Image(systemName: "plus")
                    }
                }
            }
            .sheet(isPresented: $showAddWeight) {
                AddWeightSheet(viewModel: viewModel)
            }
            .task {
                viewModel.checkAuthorization()
                if viewModel.isHealthKitAuthorized {
                    await viewModel.fetchWeightData()
                }
            }
            .refreshable {
                await viewModel.fetchWeightData()
            }
        }
    }
}
```

### Reactive Updates

Use Combine to react to HealthKit changes:

```swift
import Combine

extension HealthKitManager {
    func observeWeightChanges() -> AnyPublisher<[WeightSample], Never> {
        // Create subject for publishing updates
        let subject = PassthroughSubject<[WeightSample], Never>()

        guard let weightType = HKQuantityType.quantityType(
            forIdentifier: .bodyMass
        ) else {
            return subject.eraseToAnyPublisher()
        }

        // Create observer query
        let query = HKObserverQuery(
            sampleType: weightType,
            predicate: nil
        ) { [weak self] query, completionHandler, error in
            Task { [weak self] in
                guard let self = self else { return }

                if let samples = try? await self.fetchWeightSamples(
                    startDate: Date().addingTimeInterval(-365*24*60*60)
                ) {
                    subject.send(samples)
                }

                completionHandler()
            }
        }

        healthStore.execute(query)

        return subject.eraseToAnyPublisher()
    }
}
```

---

## 13. Background Sync Considerations

### HealthKit Background Delivery

Enable background updates when weight data changes:

```swift
func enableBackgroundDelivery() async throws {
    guard let weightType = HKQuantityType.quantityType(
        forIdentifier: .bodyMass
    ) else {
        throw HealthKitError.dataTypeNotAvailable
    }

    // Enable background delivery for immediate updates
    try await healthStore.enableBackgroundDelivery(
        for: weightType,
        frequency: .immediate
    )
}

func disableBackgroundDelivery() async throws {
    guard let weightType = HKQuantityType.quantityType(
        forIdentifier: .bodyMass
    ) else {
        return
    }

    try await healthStore.disableBackgroundDelivery(for: weightType)
}
```

### Background Observer Query

```swift
func setupBackgroundObserver() {
    guard let weightType = HKQuantityType.quantityType(
        forIdentifier: .bodyMass
    ) else {
        return
    }

    let query = HKObserverQuery(
        sampleType: weightType,
        predicate: nil
    ) { [weak self] query, completionHandler, error in
        if let error = error {
            print("Observer error: \(error)")
            completionHandler()
            return
        }

        // Fetch new data
        Task { [weak self] in
            await self?.handleWeightUpdate()
            completionHandler()
        }
    }

    healthStore.execute(query)
}

private func handleWeightUpdate() async {
    // Fetch latest weight
    guard let latestWeight = try? await fetchLatestWeight() else {
        return
    }

    // Update app state
    await MainActor.run {
        NotificationCenter.default.post(
            name: .weightDataUpdated,
            object: latestWeight
        )
    }
}
```

### Battery and Performance Considerations

**Best Practices:**
1. ✅ Use `.immediate` frequency only for critical data
2. ✅ Batch updates when possible
3. ✅ Complete background tasks quickly
4. ✅ Disable observers when not needed

**For Pregnancy Tracking:**
- Weight doesn't change frequently (once per day typically)
- Can use `.daily` or `.weekly` frequency instead of `.immediate`
- Or skip background delivery entirely - sync when app opens

**Recommended Approach:**
```swift
// Sync on app launch (already have this)
.task {
    await weightViewModel.fetchWeightData()
}

// Pull to refresh
.refreshable {
    await weightViewModel.fetchWeightData()
}

// Skip background delivery to save battery
```

---

## 14. Unit Conversion Best Practices

### Using Foundation's Measurement API

Apple's `Measurement` type handles unit conversion elegantly:

```swift
import Foundation

extension Double {
    // Convert kg to user's preferred unit
    func toWeightString(useMetric: Bool = Locale.current.usesMetricSystem) -> String {
        let measurement = Measurement(value: self, unit: UnitMass.kilograms)

        let formatter = MeasurementFormatter()
        formatter.unitOptions = .providedUnit
        formatter.numberFormatter.maximumFractionDigits = 1

        if useMetric {
            return formatter.string(from: measurement)
        } else {
            let lbs = measurement.converted(to: .pounds)
            return formatter.string(from: lbs)
        }
    }
}

// Usage
let weight = 68.5  // kg
print(weight.toWeightString())  // "68.5 kg" or "151.0 lb" based on locale
```

### Locale-Aware Unit Selection

```swift
func getPreferredWeightUnit() -> HKUnit {
    if Locale.current.usesMetricSystem {
        return .gramUnit(with: .kilo)  // kg
    } else {
        return .pound()  // lbs
    }
}

func formatWeight(_ weightKg: Double) -> String {
    let measurement = Measurement(value: weightKg, unit: UnitMass.kilograms)
    let converted = measurement.converted(to: getPreferredUnit())

    let formatter = MeasurementFormatter()
    formatter.unitOptions = .providedUnit
    formatter.numberFormatter.maximumFractionDigits = 1

    return formatter.string(from: converted)
}

private func getPreferredUnit() -> UnitMass {
    Locale.current.usesMetricSystem ? .kilograms : .pounds
}
```

### User Preference Override

Allow users to override system preference:

```swift
enum WeightUnit: String, Codable, CaseIterable {
    case kilograms = "kg"
    case pounds = "lbs"
    case automatic = "auto"

    var displayName: String {
        switch self {
        case .kilograms: return "Kilograms (kg)"
        case .pounds: return "Pounds (lbs)"
        case .automatic: return "Automatic"
        }
    }

    func toUnitMass() -> UnitMass? {
        switch self {
        case .kilograms: return .kilograms
        case .pounds: return .pounds
        case .automatic:
            return Locale.current.usesMetricSystem ? .kilograms : .pounds
        }
    }
}

// Store in UserDefaults
@AppStorage("preferredWeightUnit") var preferredWeightUnit: WeightUnit = .automatic
```

### Settings UI

```swift
struct WeightSettingsView: View {
    @AppStorage("preferredWeightUnit") private var preferredWeightUnit: WeightUnit = .automatic

    var body: some View {
        Form {
            Section {
                Picker("Weight Unit", selection: $preferredWeightUnit) {
                    ForEach(WeightUnit.allCases, id: \.self) { unit in
                        Text(unit.displayName).tag(unit)
                    }
                }
            } header: {
                Text("Measurement Units")
            } footer: {
                Text("Automatic uses your device's region settings")
            }
        }
        .navigationTitle("Settings")
    }
}
```

### Conversion Helpers

```swift
extension Double {
    // Kilogram conversions
    var kgToLbs: Double { self * 2.20462 }
    var lbsToKg: Double { self / 2.20462 }

    // Formatting with units
    func formatAsWeight(unit: WeightUnit) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .decimal
        formatter.maximumFractionDigits = 1

        switch unit {
        case .kilograms:
            return "\(formatter.string(from: NSNumber(value: self)) ?? "") kg"
        case .pounds:
            return "\(formatter.string(from: NSNumber(value: self.kgToLbs)) ?? "") lbs"
        case .automatic:
            let useMetric = Locale.current.usesMetricSystem
            return useMetric ? formatAsWeight(unit: .kilograms) : formatAsWeight(unit: .pounds)
        }
    }
}

// Usage
let weight = 68.5
print(weight.formatAsWeight(unit: .automatic))  // "68.5 kg" or "151.0 lbs"
```

---

## 15. Implementation Roadmap

### Phase 1: Foundation (Week 1)

**Priority: HIGH**

- [ ] Add HealthKit capability to Xcode project
- [ ] Update Info.plist with privacy descriptions
- [ ] Create `HealthKitManager.swift` class
- [ ] Implement authorization flow
- [ ] Add authorization UI in Dashboard
- [ ] Test on real device

**Deliverable:** Users can authorize HealthKit access

### Phase 2: Read Operations (Week 1-2)

**Priority: HIGH**

- [ ] Implement `fetchLatestWeight()`
- [ ] Implement `fetchWeightSamples(startDate:endDate:)`
- [ ] Add weight display card to Dashboard
- [ ] Handle "no data" state gracefully
- [ ] Add pull-to-refresh
- [ ] Test with various data scenarios

**Deliverable:** App displays weight from Apple Health

### Phase 3: Write Operations (Week 2)

**Priority: MEDIUM**

- [ ] Implement `saveWeight(weightKg:date:)`
- [ ] Add weight input UI
- [ ] Sync manual entries to HealthKit
- [ ] Prevent duplicate entries
- [ ] Add confirmation feedback
- [ ] Test bidirectional sync

**Deliverable:** Users can log weight to both app and HealthKit

### Phase 4: Visualizations (Week 3)

**Priority: MEDIUM**

- [ ] Implement SwiftUI Charts integration
- [ ] Create `WeightTrendChart` view
- [ ] Add pregnancy weight recommendations
- [ ] Calculate and display healthy range
- [ ] Add weight history list
- [ ] Style to match existing design

**Deliverable:** Beautiful weight trend visualization

### Phase 5: Polish & Edge Cases (Week 3-4)

**Priority: LOW**

- [ ] Add unit conversion (kg/lbs)
- [ ] Implement settings for unit preference
- [ ] Handle multiple samples per day
- [ ] Add background observer (optional)
- [ ] Comprehensive error handling
- [ ] Add loading states and animations
- [ ] Write unit tests
- [ ] Write documentation

**Deliverable:** Production-ready feature

### Phase 6: Advanced Features (Future)

**Priority: OPTIONAL**

- [ ] Export weight data to CSV
- [ ] Set weight goals
- [ ] Weight reminders
- [ ] Weekly summary notifications
- [ ] Integration with PUQE score
- [ ] Correlate weight with symptoms/food
- [ ] Apple Watch complication

---

## Code Examples Summary

### Complete HealthKitManager Template

```swift
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

        let weightQuantity = HKQuantity(
            unit: .gramUnit(with: .kilo),
            doubleValue: weightKg
        )

        let weightSample = HKQuantitySample(
            type: weightType,
            quantity: weightQuantity,
            start: date,
            end: date,
            metadata: [HKMetadataKeyWasUserEntered: true]
        )

        try await healthStore.save(weightSample)
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
        }
    }
}
```

---

## Key Takeaways

### ✅ DO

1. **Request minimal permissions** - Only weight read/write
2. **Explain value first** - Show benefits before asking authorization
3. **Store locally** - Keep alignment with your privacy-first approach
4. **Handle gracefully** - Always provide manual entry fallback
5. **Use async/await** - Modern Swift concurrency for HealthKit calls
6. **Validate data** - Check ranges and dates
7. **Support both units** - Auto-detect or let user choose kg/lbs
8. **Show source** - Display where weight came from (app, Apple Watch, etc.)
9. **Match your design** - Use existing card/component patterns
10. **Test on device** - HealthKit requires real iPhone

### ❌ DON'T

1. **Don't request on launch** - Ask when user needs the feature
2. **Don't upload to cloud** - Violates HealthKit terms
3. **Don't assume authorization** - Always check status
4. **Don't ignore errors** - Provide helpful messages
5. **Don't store redundantly** - Use HealthKit as source of truth
6. **Don't skip metadata** - Always mark user-entered data
7. **Don't forget iPad** - No HealthKit available, handle gracefully
8. **Don't block UI** - Use async operations
9. **Don't over-sync** - Respect battery life
10. **Don't forget privacy descriptions** - Required for App Store

---

## Additional Resources

### Apple Documentation
- [HealthKit Framework](https://developer.apple.com/documentation/healthkit)
- [Setting Up HealthKit](https://developer.apple.com/documentation/healthkit/setting-up-healthkit)
- [HKQuantityType](https://developer.apple.com/documentation/healthkit/hkquantitytype)
- [HKHealthStore](https://developer.apple.com/documentation/healthkit/hkhealthstore)
- [Privacy Best Practices](https://developer.apple.com/documentation/healthkit/protecting-user-privacy)

### WWDC Sessions
- [WWDC20: Getting Started with HealthKit](https://developer.apple.com/videos/play/wwdc2020/10664/)
- [WWDC25: Track Workouts with HealthKit](https://developer.apple.com/videos/play/wwdc2025/322/)

### Community Resources
- [HealthKit Tutorial with Swift - Kodeco](https://www.kodeco.com/459-healthkit-tutorial-with-swift-getting-started)
- [SwiftUI Charts Documentation](https://developer.apple.com/documentation/charts)
- [Measurement and Units](https://developer.apple.com/documentation/foundation/measurement)

### Pregnancy Weight Guidelines
- [Institute of Medicine (IOM) Weight Gain Recommendations](https://www.acog.org/clinical/clinical-guidance/committee-opinion/articles/2013/01/weight-gain-during-pregnancy)
- Integrate with existing pregnancy tracking features

---

## Conclusion

Apple Health integration for weight tracking is a natural fit for your pregnancy app:

✅ **Privacy-aligned** - Matches your 100% local data approach
✅ **User-friendly** - Automatic sync, no manual entry needed
✅ **Industry-standard** - Works with scales, Apple Watch, other apps
✅ **Low maintenance** - Apple handles the heavy lifting

**Recommended Starting Point:**
1. Phase 1: Authorization (1-2 days)
2. Phase 2: Read operations (2-3 days)
3. Phase 3: Write operations (1-2 days)
4. Phase 4: Visualizations (3-4 days)

**Total estimated time:** 1-2 weeks for full implementation

This integration will significantly enhance your app's value proposition while maintaining the privacy-first principles that make Corgina unique.

---

**Document prepared by:** Research Analysis
**Date:** 2025-10-17
**Version:** 1.0
