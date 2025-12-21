# iOS 26 Activity List UI Best Practices Research
**Date:** 2025-10-17
**Research Scope:** Activity timeline list patterns, spacing, truncation, and liquid glass materials

## Executive Summary

iOS 26 introduces **Liquid Glass** - a revolutionary design language combining optical glass qualities with fluid motion. For activity/timeline lists, this means:

1. **Liquid Glass materials** using `.ultraThinMaterial` with subtle borders
2. **Compact, efficient spacing** - reduce excessive whitespace
3. **Proper text truncation** with `lineLimit(2, reservesSpace: false)` and `.truncationMode(.tail)`
4. **Dynamic layouts** that adapt fluidly to content
5. **Subtle visual hierarchy** through refined typography and spacing

## Key iOS 26 Design Principles

### 1. Liquid Glass Material System
- **Lensing & Refraction:** Glass elements dynamically bend and shape light
- **Fluid Motion:** Gel-like flexibility that responds to interaction
- **Dynamic Adaptivity:** Continuous adaptation to background for legibility
- **Unified Language:** Consistency across iOS 26, iPadOS 26, macOS Tahoe

### 2. Implementation
```swift
// iOS 26 Liquid Glass badge pattern
.background(
    RoundedRectangle(cornerRadius: 6)
        .fill(.ultraThinMaterial)
        .overlay(
            RoundedRectangle(cornerRadius: 6)
                .stroke(Color.gray.opacity(0.2), lineWidth: 0.5)
        )
)
```

## Activity List Layout Best Practices

### Space Optimization
**Problem:** Excessive whitespace reduces content visibility
**Solution:** Compact, efficient spacing inspired by Apple Health

```swift
// RECOMMENDED spacing for activity rows
HStack(spacing: 12) {  // Not 16-20
    Icon(width: 32)     // Not 36-44
    Content()
    Spacer(minLength: 8)
    TimeButton()
}
.padding(.vertical, 10)   // Not 12-16
.padding(.horizontal, 14) // Not 16-20
```

### Text Truncation & Overflow Prevention
**Critical Pattern:** iOS 26 uses `lineLimit(_:reservesSpace:)` modifier

```swift
Text(foodName)
    .lineLimit(2, reservesSpace: false)  // iOS 26 pattern
    .truncationMode(.tail)
    .frame(maxWidth: .infinity, alignment: .leading)
    .fixedSize(horizontal: false, vertical: true)
```

**Why this matters:**
- `reservesSpace: false` prevents layout from reserving space for unused lines
- `.fixedSize(horizontal: false, vertical: true)` allows proper wrapping
- `.truncationMode(.tail)` ensures graceful truncation with ellipsis

### Timestamp Display
**Pattern:** Compact, inline time badges using liquid glass

```swift
HStack(spacing: 3) {
    Image(systemName: "clock")
        .font(.caption2)
    Text(formatTime(date))
        .font(.caption)
}
.foregroundColor(.secondary)
.padding(.horizontal, 8)
.padding(.vertical, 4)
.background(
    RoundedRectangle(cornerRadius: 6)
        .fill(.ultraThinMaterial)
        .overlay(
            RoundedRectangle(cornerRadius: 6)
                .stroke(Color.gray.opacity(0.2), lineWidth: 0.5)
        )
)
```

## Apple Health App Analysis

Based on research of Apple Health's activity timeline:

1. **Icon Size:** 32-36pt (not 44pt)
2. **Row Padding:** 10-12pt vertical (not 16pt)
3. **Text Hierarchy:**
   - Title: `.body` or `.subheadline` with `.medium` weight
   - Subtitle: `.caption` with `.secondary` color
   - Timestamp: `.caption2` with liquid glass badge
4. **Spacing:** Tight, efficient (8-12pt between elements)
5. **List Row Height:** Dynamic based on content, typically 60-80pt

## List Configuration Best Practices

### iOS 26 List Styling
```swift
List {
    ForEach(items) { item in
        ActivityRow(item)
            .listRowInsets(EdgeInsets(top: 6, leading: 0, bottom: 6, trailing: 0))
            .listRowBackground(Color.clear)
            .listRowSeparator(.hidden)  // Custom separators instead
    }
}
.listStyle(.plain)
.scrollContentBackground(.hidden)
```

### Fixed Height Anti-Pattern
**Avoid:** `.frame(height: 85)` - causes overflow
**Use:** Dynamic sizing based on content

```swift
// WRONG
.frame(height: CGFloat(items.count) * 85)

// RIGHT
.frame(minHeight: 200, maxHeight: 400)
// OR let List size itself naturally
```

## Typography & Dynamic Type

### Font Scaling Support
```swift
Text(title)
    .font(.body)  // Automatically scales with Dynamic Type
    .lineLimit(2, reservesSpace: false)
```

### Size Categories to Test
- Extra Small (XS)
- Default (Medium)
- Extra Large (XL)
- Accessibility Extra Extra Large (XXXL)

## Nutrition Badge Design

### iOS 26 Liquid Glass Badges
```swift
HStack(spacing: 6) {
    // Calorie badge
    HStack(spacing: 3) {
        Image(systemName: "flame.fill")
            .font(.system(size: 9))
        Text("250")
            .font(.caption2)
            .fontWeight(.medium)
    }
    .foregroundColor(.orange)
    .padding(.horizontal, 6)
    .padding(.vertical, 3)
    .background(
        RoundedRectangle(cornerRadius: 5)
            .fill(.ultraThinMaterial)
            .overlay(
                RoundedRectangle(cornerRadius: 5)
                    .stroke(Color.orange.opacity(0.3), lineWidth: 0.5)
            )
    )
}
```

## Empty State Design

### iOS 26 ContentUnavailableView
```swift
ContentUnavailableView {
    Label("No Recent Activity", systemImage: "clock.arrow.circlepath")
} description: {
    Text("Your recent activities will appear here")
        .font(.subheadline)
} actions: {
    HStack(spacing: 12) {
        Button("Log Water") { }
            .buttonStyle(.bordered)
            .tint(.blue)
    }
}
```

## Animation & Transitions

### iOS 26 Smooth Animations
```swift
.animation(.smooth, value: items.count)
.transition(.asymmetric(
    insertion: .move(edge: .top).combined(with: .opacity),
    removal: .move(edge: .top).combined(with: .opacity)
))
```

## Accessibility Considerations

1. **VoiceOver Labels:** Combine row content for coherent readout
2. **Dynamic Type:** Support all size categories
3. **Touch Targets:** Minimum 44x44pt for interactive elements
4. **Color Contrast:** Ensure WCAG AA compliance (4.5:1 for text)

## Implementation Checklist

- [ ] Use `.ultraThinMaterial` for liquid glass effects
- [ ] Apply `lineLimit(2, reservesSpace: false)` for text truncation
- [ ] Reduce padding to 10-12pt vertical, 12-14pt horizontal
- [ ] Icon size 32-36pt (not 40-44pt)
- [ ] Use `.caption` and `.caption2` for secondary text
- [ ] Implement dynamic list sizing (no fixed heights)
- [ ] Add subtle borders (0.5-1pt) with low opacity
- [ ] Test with long content (food names, notes)
- [ ] Test with all Dynamic Type sizes
- [ ] Ensure 44pt minimum touch targets for buttons

## Sources

1. Apple Liquid Glass Design System - https://liquidglass.info/
2. MacRumors iOS 26 Liquid Glass Guide - https://macrumors.com/guide/ios-26-liquid-glass
3. Apple HIG - https://developer.apple.com/design/human-interface-guidelines
4. SwiftUI List Layout Best Practices - Various Stack Overflow and community sources
5. Apple WWDC 2025 - HealthKit Workout Sessions

## Migration Path

### Phase 1: Fix Layout Issues
1. Fix text overflow with proper truncation
2. Reduce excessive whitespace
3. Optimize row padding and spacing

### Phase 2: Apply Liquid Glass
1. Update button backgrounds to `.ultraThinMaterial`
2. Add subtle borders to badges
3. Refine nutrition badge styling

### Phase 3: Polish
1. Test Dynamic Type scaling
2. Verify accessibility labels
3. Add smooth animations
4. Test with edge cases

## Recommendations Priority

**P0 (Critical):**
1. Fix text overflow with `lineLimit(2, reservesSpace: false)`
2. Remove fixed list height causing cutoffs
3. Reduce excessive spacing

**P1 (Important):**
1. Apply liquid glass materials to buttons/badges
2. Optimize row padding (10-12pt vertical)
3. Reduce icon sizes to 32-36pt

**P2 (Nice to have):**
1. Refine animations with `.smooth`
2. Enhanced empty state
3. Additional accessibility improvements

## Notes

- iOS 26 is still in development; patterns may evolve
- Liquid Glass works best on devices with iOS 26+
- Graceful degradation for iOS 25 and earlier
- Performance: Liquid glass materials are GPU-accelerated
