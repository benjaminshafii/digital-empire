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
