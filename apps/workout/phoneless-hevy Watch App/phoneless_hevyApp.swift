//
//  phoneless_hevyApp.swift
//  phoneless-hevy Watch App
//
//  Created by Benjamin Shafii on 10/22/25.
//

import SwiftUI

@main
struct phoneless_hevy_Watch_AppApp: App {
    @State private var workoutManager = WorkoutManager()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environment(workoutManager)
                .task {
                    // Request HealthKit authorization on app launch
                    do {
                        try await HealthKitManager.shared.requestAuthorization()
                    } catch {
                        print("Failed to authorize HealthKit: \(error)")
                    }
                }
        }
    }
}
