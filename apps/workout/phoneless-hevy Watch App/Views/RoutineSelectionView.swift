//
//  RoutineSelectionView.swift
//  phoneless-hevy Watch App
//
//  Created by Claude Code on 10/22/25.
//  UI for selecting and starting workout routines
//

import SwiftUI

struct RoutineSelectionView: View {
    @State private var routineManager = RoutineManager.shared
    @State private var isRefreshing = false
    @Environment(\.dismiss) private var dismiss
    let onRoutineSelected: (Routine) -> Void

    private func refreshRoutines() async {
        isRefreshing = true
        defer { isRefreshing = false }
        await routineManager.fetchRoutines(forceRefresh: true)
    }

    var body: some View {
        Group {
            if routineManager.isLoading {
                VStack(spacing: 12) {
                    ProgressView()
                        .progressViewStyle(CircularProgressViewStyle(tint: .blue))
                    
                    Text("Loading routines...")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            } else if routineManager.routines.isEmpty {
                VStack(spacing: 12) {
                    Image(systemName: "list.bullet")
                        .font(.system(size: 40))
                        .foregroundColor(.secondary)
                    
                    Text("No routines found")
                        .font(.callout)
                        .foregroundColor(.secondary)
                    
                    Text("Create routines in the Hevy app")
                        .font(.caption2)
                        .foregroundColor(.secondary.opacity(0.6))
                        .multilineTextAlignment(.center)
                    
                    Button("Refresh") {
                        Task {
                            await routineManager.fetchRoutines(forceRefresh: true)
                        }
                    }
                    .buttonStyle(.bordered)
                }
                .padding()
            } else {
                List(routineManager.routines) { routine in
                    Button {
                        onRoutineSelected(routine)
                        dismiss()
                    } label: {
                        VStack(alignment: .leading, spacing: 4) {
                            Text(routine.title)
                                .font(.headline)

                            Text("\(routine.exercises.count) exercises")
                                .font(.caption)
                                .foregroundColor(.secondary)

                            if let notes = routine.notes, !notes.isEmpty {
                                Text(notes)
                                    .font(.caption2)
                                    .foregroundColor(.secondary.opacity(0.6))
                                    .lineLimit(1)
                            }
                        }
                    }
                }
                .refreshable {
                    await refreshRoutines()
                }
            }
        }
        .navigationTitle("Routines")
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button {
                    Task {
                        await refreshRoutines()
                    }
                } label: {
                    if isRefreshing {
                        ProgressView()
                            .scaleEffect(0.7)
                    } else {
                        Image(systemName: "arrow.clockwise")
                            .font(.system(size: 16, weight: .medium))
                            .foregroundColor(.blue)
                    }
                }
                .disabled(isRefreshing)
            }
        }
        .overlay(alignment: .top) {
            if isRefreshing {
                HStack {
                    ProgressView()
                        .scaleEffect(0.7)
                    Text("Syncing...")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }
                .padding(8)
                .background(Color.secondary.opacity(0.2))
                .cornerRadius(8)
                .transition(.move(edge: .top).combined(with: .opacity))
            }
        }
        .task {
            await routineManager.fetchRoutines()
        }
    }
}

#Preview {
    NavigationStack {
        RoutineSelectionView { routine in
            print("Selected: \(routine.title)")
        }
    }
}
