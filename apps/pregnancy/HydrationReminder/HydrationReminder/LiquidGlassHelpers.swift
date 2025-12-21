import SwiftUI

extension View {
    @ViewBuilder
    func adaptiveBackground(_ material: Material = .regularMaterial, fallback: Color = Color(.secondarySystemBackground)) -> some View {
        if #available(iOS 15.0, *) {
            self.modifier(AdaptiveBackgroundModifier(material: material, fallback: fallback))
        } else {
            self.background(fallback)
        }
    }
}

struct AdaptiveBackgroundModifier: ViewModifier {
    @Environment(\.accessibilityReduceTransparency) var reduceTransparency
    let material: Material
    let fallback: Color
    
    func body(content: Content) -> some View {
        if reduceTransparency {
            content.background(fallback)
        } else {
            content.background(material)
        }
    }
}

extension View {
    func glassCard(cornerRadius: CGFloat = 16) -> some View {
        self.modifier(GlassCardModifier(cornerRadius: cornerRadius))
    }
}

struct GlassCardModifier: ViewModifier {
    @Environment(\.accessibilityReduceTransparency) var reduceTransparency
    let cornerRadius: CGFloat
    
    func body(content: Content) -> some View {
        content
            .padding(20)
            .background(reduceTransparency ? Color(.secondarySystemBackground) : Color(.secondarySystemBackground))
            .clipShape(RoundedRectangle(cornerRadius: cornerRadius))
            .shadow(color: .black.opacity(0.05), radius: 8, x: 0, y: 3)
    }
}

extension View {
    func accessibleAnimation<V>(_ animation: Animation? = .default, value: V) -> some View where V : Equatable {
        self.modifier(AccessibleAnimationModifier(animation: animation, value: value))
    }
}

struct AccessibleAnimationModifier<V: Equatable>: ViewModifier {
    @Environment(\.accessibilityReduceMotion) var reduceMotion
    let animation: Animation?
    let value: V
    
    func body(content: Content) -> some View {
        content
            .animation(reduceMotion ? nil : animation, value: value)
    }
}

struct AdaptiveSpacing {
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize

    var stackSpacing: CGFloat {
        switch dynamicTypeSize {
        case .accessibility1, .accessibility2, .accessibility3, .accessibility4, .accessibility5:
            return 20
        case .xxxLarge:
            return 16
        default:
            return 12
        }
    }

    var cardPadding: CGFloat {
        switch dynamicTypeSize {
        case .accessibility1, .accessibility2, .accessibility3, .accessibility4, .accessibility5:
            return 24
        case .xxxLarge:
            return 20
        default:
            return 16
        }
    }
}

// MARK: - Color Extensions

extension Color {
    /// Initialize a Color from a hex string
    /// - Parameter hex: Hex color string (e.g., "#FFB347" or "FFB347")
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3: // RGB (12-bit)
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6: // RGB (24-bit)
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8: // ARGB (32-bit)
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (255, 0, 0, 0)
        }

        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue:  Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}
