//
//  SupersetIndicator.swift
//  phoneless-hevy Watch App
//
//  Branch 2: Superset Navigation & Flow
//  Visual indicator for superset membership with color coding
//

import SwiftUI

/// Context information for a superset
struct SupersetContext {
    let id: Int
    let position: Int  // 1-indexed position in superset (1, 2, 3...)
    let totalInSuperset: Int  // Total exercises in this superset

    /// Consistent color for this superset ID
    var color: Color {
        let colors: [Color] = [.blue, .green, .orange, .purple, .pink, .cyan, .mint, .indigo]
        return colors[id % colors.count]
    }
}

/// Visual indicator showing superset membership
struct SupersetIndicator: View {
    let context: SupersetContext

    var body: some View {
        HStack(spacing: 4) {
            // Color dot
            Circle()
                .fill(context.color)
                .frame(width: 8, height: 8)

            // Text: "Superset 1 (2/3)"
            Text("Superset \(context.id)")
                .font(.caption2)
                .foregroundColor(context.color)
                .lineLimit(1)
                .minimumScaleFactor(0.7)

            Text("(\(context.position)/\(context.totalInSuperset))")
                .font(.caption2)
                .foregroundColor(.secondary)
                .lineLimit(1)
                .minimumScaleFactor(0.7)
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .background(context.color.opacity(0.15))
        .cornerRadius(12)
    }
}

/// Compact version for smaller spaces
struct SupersetIndicatorCompact: View {
    let context: SupersetContext

    var body: some View {
        HStack(spacing: 3) {
            Circle()
                .fill(context.color)
                .frame(width: 6, height: 6)

            Text("SS\(context.id)")
                .font(.caption2)
                .foregroundColor(context.color)
                .lineLimit(1)
                .minimumScaleFactor(0.7)
        }
        .padding(.horizontal, 6)
        .padding(.vertical, 3)
        .background(context.color.opacity(0.15))
        .cornerRadius(8)
    }
}

/// Color bar indicator for list rows
struct SupersetColorBar: View {
    let color: Color

    var body: some View {
        Rectangle()
            .fill(color)
            .frame(width: 4)
    }
}

// MARK: - Previews

#Preview("Standard Indicator") {
    VStack(spacing: 12) {
        SupersetIndicator(context: SupersetContext(id: 1, position: 1, totalInSuperset: 3))
        SupersetIndicator(context: SupersetContext(id: 1, position: 2, totalInSuperset: 3))
        SupersetIndicator(context: SupersetContext(id: 2, position: 1, totalInSuperset: 2))
        SupersetIndicator(context: SupersetContext(id: 3, position: 3, totalInSuperset: 4))
    }
    .padding()
}

#Preview("Compact Indicator") {
    HStack(spacing: 8) {
        SupersetIndicatorCompact(context: SupersetContext(id: 1, position: 1, totalInSuperset: 3))
        SupersetIndicatorCompact(context: SupersetContext(id: 2, position: 1, totalInSuperset: 2))
        SupersetIndicatorCompact(context: SupersetContext(id: 3, position: 1, totalInSuperset: 4))
    }
    .padding()
}

#Preview("Color Bars") {
    VStack(spacing: 0) {
        HStack(spacing: 8) {
            SupersetColorBar(color: .blue)
            Text("Bench Press")
            Spacer()
        }
        .padding(.vertical, 8)

        HStack(spacing: 8) {
            SupersetColorBar(color: .blue)
            Text("Bent-Over Row")
            Spacer()
        }
        .padding(.vertical, 8)

        HStack(spacing: 8) {
            Rectangle().fill(.clear).frame(width: 4)
            Text("Shoulder Press (not in superset)")
            Spacer()
        }
        .padding(.vertical, 8)
    }
    .padding()
}
