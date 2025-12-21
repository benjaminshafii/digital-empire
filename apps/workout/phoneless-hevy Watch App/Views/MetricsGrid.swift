//
//  MetricsGrid.swift
//  phoneless-hevy Watch App
//
//  Created by Benjamin Shafii on 10/22/25.
//

import SwiftUI

struct MetricsGrid: View {
    let heartRate: Double
    let calories: Double
    let sets: Int

    var body: some View {
        VStack(spacing: 8) {
            MetricRow(icon: "heart.fill", value: "\(Int(heartRate))", unit: "BPM", color: .red)
            MetricRow(icon: "flame.fill", value: "\(Int(calories))", unit: "CAL", color: .orange)
            MetricRow(icon: "figure.strengthtraining.traditional", value: "\(sets)", unit: "SETS", color: .blue)
        }
        .padding()
        .background(.ultraThinMaterial) // Liquid Glass effect
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }
}

struct MetricRow: View {
    let icon: String
    let value: String
    let unit: String
    let color: Color

    var body: some View {
        HStack {
            Image(systemName: icon)
                .font(.title3)
                .foregroundStyle(color)
                .frame(width: 30)

            Spacer()

            HStack(alignment: .firstTextBaseline, spacing: 4) {
                Text(value)
                    .font(.system(size: 24, weight: .semibold, design: .rounded))
                Text(unit)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
    }
}

#Preview {
    MetricsGrid(heartRate: 145, calories: 234, sets: 12)
        .padding()
}
