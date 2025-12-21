//
//  RoutinePreviewView.swift
//  phoneless-hevy Watch App
//
//  Beautiful routine preview - 4 variations following Apple HIG
//

import SwiftUI

struct RoutinePreviewView: View {
    let routine: Routine
    let workoutManager: WorkoutManager
    @State private var shouldNavigateToWorkout = false
    @State private var historyService = WorkoutHistoryService()
    @State private var exerciseHistory: [String: [CompletedSet]] = [:]
    @Environment(\.dismiss) private var dismiss

    private func fetchHistoricalData() async {
        for exercise in routine.exercises {
            if let history = try? await historyService.fetchLastWorkout(for: exercise.exerciseTemplateId) {
                exerciseHistory[exercise.exerciseTemplateId] = history
            }
        }
    }

    var body: some View {
        liquidGlassVariation
            .navigationBarBackButtonHidden(true)
            .navigationDestination(isPresented: $shouldNavigateToWorkout) {
                WorkoutProgressView(onWorkoutEnd: { dismiss() })
            }
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("", systemImage: "chevron.left") {
                        dismiss()
                    }
                    .labelStyle(.iconOnly)
                    .opacity(0)
                }
            }
            .onAppear {
                Task { await fetchHistoricalData() }
            }
    }

    // MARK: - Liquid Glass Variation (iOS 26 Design)

    private var liquidGlassVariation: some View {
        ScrollView {
            VStack(spacing: 16) {
                // Hero section with Liquid Glass material
                VStack(spacing: 12) {
                    Text(routine.title)
                        .font(.title3.bold())
                        .foregroundStyle(.primary)
                        .lineLimit(2)
                        .minimumScaleFactor(0.85)
                        .multilineTextAlignment(.center)
                    

                    HStack(spacing: 16) {
                        InfoPill(
                            icon: "figure.run",
                            text: "\(routine.exercises.count)",
                            label: "exercises"
                        )
                    }

                    Button {
                        // Navigate immediately for instant feedback
                        shouldNavigateToWorkout = true

                        // Start workout in background (API calls won't block UI)
                        Task {
                            workoutManager.startWorkout(routine: routine)
                        }
                    } label: {
                        HStack {
                            Image(systemName: "play.fill")
                            Text("Start Now")
                                .font(.body.weight(.bold))
                        }
                        .foregroundStyle(.green)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 14)
                        .background(.ultraThinMaterial)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                    }
                    .buttonStyle(.plain)
                }
              
                .background(
                    RoundedRectangle(cornerRadius: 20)
                        .fill(.ultraThinMaterial)
                )
//
                .padding(.top, 8)

                // Exercise list with glass cards
                VStack(spacing: 8) {
                    if exerciseHistory.isEmpty && !routine.exercises.isEmpty {
                        loadingIndicator
                    }

                    ForEach(Array(routine.exercises.enumerated()), id: \.element.id) { index, exercise in
                        LiquidGlassExerciseCard(
                            index: index + 1,
                            exercise: exercise,
                            lastSet: exerciseHistory[exercise.exerciseTemplateId]?.first
                        )
                    }
                }
             
            }
            .padding(.bottom, 8)
        }
    }

    // MARK: - Helper Views

    private var loadingIndicator: some View {
        HStack(spacing: 6) {
            ProgressView()
                .scaleEffect(0.7)
            Text("Loading...")
                .font(.caption2)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 12)
    }
}

// MARK: - Exercise Card Components

struct LiquidGlassExerciseCard: View {
    let index: Int
    let exercise: RoutineExercise
    let lastSet: CompletedSet?

    var body: some View {
        HStack(spacing: 12) {
            // Index badge with vibrant color
            ZStack {
                Circle()
                    .fill(.tint.opacity(0.2))
                    .frame(width: 32, height: 32)

                Text("\(index)")
                    .font(.caption.weight(.bold))
                    .foregroundStyle(.tint)
            }

            VStack(alignment: .leading, spacing: 4) {
                Text(exercise.title)
                    .font(.subheadline.weight(.medium))
                    .foregroundStyle(.primary)
                    .lineLimit(1)
                    .minimumScaleFactor(0.75)

                HStack(spacing: 8) {
                    Text("\(exercise.sets.count) sets")
                        .font(.caption2)
                        .foregroundStyle(.secondary)

                    if let lastSet = lastSet, let weight = lastSet.actualWeight, let _ = lastSet.actualReps {
                        Text("•")
                            .foregroundStyle(.secondary.opacity(0.5))
                        Text("Last: \(Int(weight))kg")
                            .font(.caption2)
                            .foregroundStyle(.green)
                    }
                }
            }

            Spacer()
        }
      
        .background(.ultraThinMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}

struct InfoPill: View {
    let icon: String
    let text: String
    let label: String

    var body: some View {
        HStack(spacing: 4) {
            Image(systemName: icon)
                .font(.caption2)
            Text(text)
                .font(.caption.weight(.semibold))
            Text(label)
                .font(.caption2)
        }
        .foregroundStyle(.secondary)
        .padding(.horizontal, 10)
        .padding(.vertical, 6)
        .background(
            Capsule()
                .fill(.thinMaterial)
        )
    }
}


// MARK: - Preview

#Preview {
    NavigationStack {
        RoutinePreviewView(
            routine: Routine(
                id: "test",
                title: "Upper Body Push",
                folderId: nil,
                notes: nil,
                exercises: [
                    RoutineExercise(
                        index: 0,
                        title: "Bench Press (Barbell)",
                        restSeconds: 90,
                        notes: nil,
                        exerciseTemplateId: "123",
                        supersetId: nil,
                        sets: [
                            RoutineSet(index: 0, type: .normal, weightKg: 80, reps: 8, repRange: nil, distanceMeters: nil, durationSeconds: nil, customMetric: nil),
                            RoutineSet(index: 1, type: .normal, weightKg: 80, reps: 8, repRange: nil, distanceMeters: nil, durationSeconds: nil, customMetric: nil),
                            RoutineSet(index: 2, type: .normal, weightKg: 80, reps: 8, repRange: nil, distanceMeters: nil, durationSeconds: nil, customMetric: nil)
                        ]
                    ),
                    RoutineExercise(
                        index: 1,
                        title: "Shoulder Press",
                        restSeconds: 90,
                        notes: nil,
                        exerciseTemplateId: "456",
                        supersetId: nil,
                        sets: [
                            RoutineSet(index: 0, type: .normal, weightKg: 30, reps: 10, repRange: nil, distanceMeters: nil, durationSeconds: nil, customMetric: nil),
                            RoutineSet(index: 1, type: .normal, weightKg: 30, reps: 10, repRange: nil, distanceMeters: nil, durationSeconds: nil, customMetric: nil)
                        ]
                    )
                ],
                updatedAt: Date(),
                createdAt: Date()
            ),
            workoutManager: WorkoutManager()
        )
    }
}
