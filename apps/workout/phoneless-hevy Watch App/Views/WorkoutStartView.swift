//
//  WorkoutStartView.swift
//  phoneless-hevy Watch App
//
//  Beautiful watchOS 26 Liquid Glass inspired design with animations
//

import SwiftUI

struct WorkoutStartView: View {
    @Environment(WorkoutManager.self) private var workoutManager
    @State private var showSettings = false
    @State private var showRoutineSelection = false
    @State private var selectedRoutine: Routine?
    @State private var glowIntensity: CGFloat = 0

    var body: some View {
        NavigationStack {
            ZStack {
                // Animated ambient glow background - appears once, then pulsates
                Circle()
                    .fill(
                        RadialGradient(
                            colors: [Color.blue.opacity(0.3), Color.purple.opacity(0.2), Color.clear],
                            center: .center,
                            startRadius: 50,
                            endRadius: 200
                        )
                    )
                    .blur(radius: 40)
                    .scaleEffect(1.2)  // Fixed at end position
                    .opacity(glowIntensity)
                    .animation(.easeInOut(duration: 2).repeatForever(autoreverses: true), value: glowIntensity)

                // Scrollable content
                ScrollView {
                    VStack(spacing: 0) {
                        // Minimal top padding
                        Spacer()
                            .frame(height: 20)

                        // Main content
                        VStack(spacing: 16) {
                        // Animated icon with title
                        ZStack {
                            // Glow ring
                            Circle()
                                .stroke(
                                    LinearGradient(
                                        colors: [.blue, .purple, .pink, .blue],
                                        startPoint: .topLeading,
                                        endPoint: .bottomTrailing
                                    ),
                                    lineWidth: 3
                                )
                                .frame(width: 80, height: 80)
                                .blur(radius: 8)
                                .opacity(glowIntensity)
                                .animation(.easeInOut(duration: 2).repeatForever(autoreverses: true), value: glowIntensity)

                            Text("Retriever")
                                .font(.system(size: 28, weight: .bold, design: .rounded))
                                .foregroundStyle(
                                    LinearGradient(
                                        colors: [.primary, .primary.opacity(0.7)],
                                        startPoint: .top,
                                        endPoint: .bottom
                                    )
                                )

//                            // Icon
//                            Image(systemName: "waveform")
//                                .font(.system(size: 40, weight: .medium))
//                                .foregroundStyle(
//                                    LinearGradient(
//                                        colors: [.blue, .cyan],
//                                        startPoint: .topLeading,
//                                        endPoint: .bottomTrailing
//                                    )
//                                )
//                                .symbolEffect(.variableColor.iterative.reversing, options: .speed(0.5).repeat(.continuous))
                        }

                 
                        // Primary button - Liquid Glass inspired
                        Button {
                            showRoutineSelection = true
                        } label: {
                            HStack(spacing: 8) {
                                Image(systemName: "figure.strengthtraining.traditional")
                                    .font(.system(size: 20, weight: .semibold))
                                    .symbolEffect(.pulse, options: .speed(0.5).repeat(3))

                                Text("Start Routine")
                                    .font(.system(size: 17, weight: .semibold))
                            }
                            .foregroundStyle(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 14)
                            .background(
                                ZStack {
                                    // Gradient background
                                    LinearGradient(
                                        colors: [Color.blue, Color.blue.opacity(0.8)],
                                        startPoint: .topLeading,
                                        endPoint: .bottomTrailing
                                    )

                                    // Glow effect
                                    LinearGradient(
                                        colors: [Color.blue.opacity(0.6), Color.cyan.opacity(0.4)],
                                        startPoint: .topLeading,
                                        endPoint: .bottomTrailing
                                    )
                                    .blur(radius: 20)
                                }
                            )
                            .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                            .shadow(color: .blue.opacity(0.5), radius: 15, y: 8)
                        }
                        .buttonStyle(ScaleButtonStyle())
                        .padding(.horizontal, 20)
                        .padding(.top, 8)

                        // Secondary button - Ghost style
                        NavigationLink {
                            WorkoutProgressView()
                        } label: {
                            HStack(spacing: 6) {
                                Image(systemName: "plus.circle.fill")
                                    .font(.system(size: 16))
                                Text("Free Workout")
                                    .font(.system(size: 15, weight: .medium))
                            }
                            .foregroundStyle(.blue)
                            .padding(.vertical, 12)
                            .padding(.horizontal, 24)
                            .background(
                                RoundedRectangle(cornerRadius: 12, style: .continuous)
                                    .fill(Color.blue.opacity(0.15))
                            )
                        }
                        .buttonStyle(ScaleButtonStyle(scale: 0.96))

                        // Settings button - iPhone style at bottom
                        Button {
                            showSettings = true
                        } label: {
                            HStack(spacing: 8) {
                                Image(systemName: "gearshape.fill")
                                    .font(.system(size: 18, weight: .medium))
                                Text("Settings")
                                    .font(.system(size: 15, weight: .medium))
                            }
                            .foregroundStyle(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 12)
                            .background(
                                RoundedRectangle(cornerRadius: 12, style: .continuous)
                                    .fill(Color.secondary.opacity(0.3))
                            )
                        }
                        .buttonStyle(ScaleButtonStyle(scale: 0.96))
                        .padding(.horizontal, 20)
                        .padding(.top, 12)
                    }

                    Spacer()
                        .frame(height: 40)
                    }
                }
            }
            .onAppear {
                glowIntensity = 0.5  // Start pulsating
            }
            .sheet(isPresented: $showSettings) {
                NavigationStack {
                    SettingsView()
                }
            }
            .sheet(isPresented: $showRoutineSelection) {
                NavigationStack {
                    RoutineSelectionView { routine in
                        selectedRoutine = routine
                    }
                }
            }
            .navigationDestination(item: $selectedRoutine) { routine in
                RoutinePreviewView(routine: routine, workoutManager: workoutManager)
            }
        }
    }
}

// MARK: - Custom Button Style with Spring Animation

struct ScaleButtonStyle: ButtonStyle {
    var scale: CGFloat = 0.92

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? scale : 1.0)
            .animation(.spring(response: 0.3, dampingFraction: 0.6, blendDuration: 0), value: configuration.isPressed)
    }
}

#Preview {
    WorkoutStartView()
}
