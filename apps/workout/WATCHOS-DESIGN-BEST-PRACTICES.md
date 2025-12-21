# watchOS 26 Design Best Practices & Typography Guidelines

**Based on:** Apple Human Interface Guidelines, watchOS 26 Design System, Top 0.01% Watch App Design Research

**Last Updated:** October 22, 2025

---

## 🎯 Core Design Principles (Apple HIG)

### 1. **Clarity**
- Clean, precise, and uncluttered interfaces
- Limited number of elements to prevent confusion
- Clear, recognizable instructions, symbols, and icons

### 2. **Consistency**
- Standard UI elements and visual cues
- Familiar to users accustomed to Apple's design conventions
- Predictable interactions across all screens

### 3. **Deference**
- UI elements shouldn't distract from essential content
- Users should clearly see which elements are most important
- Content first, chrome second

### 4. **Depth**
- Use layers, shadows, and motion for clear hierarchy
- Guide user's attention with visual depth
- Add context through dimensional design

---

## 📱 watchOS 26: Liquid Glass Design Language

### Key Characteristics:
- **Translucency**: Uses `.ultraThinMaterial` backgrounds
- **Depth**: Layered UI with subtle shadows
- **Fluidity**: Smooth transitions and animations
- **Minimalism**: Essential information only

### Implementation:
```swift
// Liquid Glass background
.background(.ultraThinMaterial)

// Proper z-index layering
ZStack(alignment: .top) {
    // Background content
    ContentView()
    
    // Floating elements on top
    HeaderView()
        .zIndex(100)
}
```

---

## 📏 Typography Guidelines for watchOS

### **Primary Typeface: SF Compact**
- Optimized specifically for small screens
- Works seamlessly with Dynamic Type
- Use SF Compact Rounded for complications

### **Font Sizing Best Practices:**

#### Recommended Sizes:
```swift
// Headers
.font(.system(size: 20, weight: .semibold, design: .rounded))

// Body text
.font(.headline)  // ~17pt
.font(.callout)   // ~16pt

// Secondary text
.font(.caption)   // ~12pt
.font(.caption2)  // ~11pt

// Critical: NEVER use .footnote or smaller on watchOS
```

#### Size Guidelines by Screen:
- **40mm Watch**: Maximum 3-4 lines of text
- **44mm Watch**: Maximum 4-5 lines of text
- **46mm/49mm Watch**: Maximum 5-6 lines of text

### **CRITICAL: Prevent Text Overflow**

**Problem:** Text truncation breaks user experience
**Impact:** 80% of users prefer larger touchable elements and full text visibility

#### Solution 1: Use `.minimumScaleFactor`
```swift
Text("Start from Routine")
    .font(.footnote)
    .minimumScaleFactor(0.7)  // Allows 30% shrinkage
    .lineLimit(1)
```

#### Solution 2: Use `.fixedSize` (Allows Wrapping)
```swift
Text("Voice-First Workout")
    .font(.title3)
    .fixedSize(horizontal: false, vertical: true)  // Allow vertical expansion
    .lineLimit(2)
```

#### Solution 3: Use `ViewThatFits` (Adaptive)
```swift
ViewThatFits {
    // Try compact layout first
    Text("Start from Routine").font(.footnote)
    
    // Fall back to smaller font
    Text("Start from Routine").font(.caption)
}
```

#### Solution 4: Explicit Line Limits with Scaling
```swift
Text("Log sets with your voice")
    .font(.caption)
    .foregroundColor(.secondary)
    .multilineTextAlignment(.center)
    .lineLimit(1)                    // Strict 1 line
    .minimumScaleFactor(0.75)        // Can shrink to 75%
```

---

## 🎨 Color & Contrast

### Minimum Requirements:
- **Text on background**: 4.5:1 contrast ratio (WCAG AA)
- **Interactive elements**: 3:1 contrast ratio
- **Color filters**: Support color blind users

### Best Practices:
```swift
// Good contrast
Text("Title")
    .foregroundColor(.primary)  // Adapts to light/dark mode

Text("Subtitle")
    .foregroundColor(.secondary)

// Avoid low contrast
❌ .foregroundColor(.gray.opacity(0.3))  // Too light
✅ .foregroundColor(.secondary.opacity(0.6))  // Better
```

---

## 🖐️ Touch Targets & Spacing

### Minimum Touch Target: **44x44 pixels**
**Impact:** 80% of users prefer larger touchable elements

```swift
Button("Action") {
    // action
}
.frame(minWidth: 44, minHeight: 44)
```

### Spacing Guidelines:
- **Between interactive elements**: Minimum 8pt
- **Content padding**: 12-16pt from edges
- **Vertical spacing**: 12-20pt between sections

---

## 🔋 Performance & Battery Optimization

### Critical Stats:
- **67%** of users abandon apps that frequently deplete battery
- Apps should minimize background processes
- Efficient data-fetching can save up to **30% battery**

### Best Practices:
```swift
// Use @Observable for efficient updates
@Observable
class DataManager {
    var data: [Item] = []
}

// Limit background updates
.task {
    await fetchData()
}

// Use efficient list rendering
List(items) { item in
    CompactRow(item: item)
}
```

---

## 💬 Text Display Best Practices

### Maximum Character Count:
- **Single line**: 20-30 characters max
- **Per line**: 75 characters absolute maximum
- **Readable range**: 40-60 characters per line

### Implementation:
```swift
// Good: Concise, readable
Text("Start Workout")
    .font(.headline)

// Bad: Too long
❌ Text("Please tap this button to begin your workout session")

// Better: Shorter
✅ Text("Begin Workout")
```

---

## 🎯 Layout Guidelines for Small Screens

### Screen Real Estate:
- **Limited space**: Show only essential information
- **Prioritize**: Most important content first
- **Glanceable**: Users should understand in < 3 seconds

### Vertical Scrolling:
```swift
// Allow scrolling for long content
ScrollView {
    VStack(spacing: 16) {
        // Content that may exceed screen
    }
}
```

### Fixed Header Pattern:
```swift
VStack(spacing: 0) {
    // Fixed header
    HeaderView()
        .zIndex(100)  // CRITICAL: Prevent overlap
    
    Spacer()
    
    // Scrollable content
    ContentView()
    
    Spacer()
}
```

---

## ⚡ Haptic Feedback

### Usage Stats:
- **40%** increase in user retention with haptic feedback
- **Balance is key**: Excessive feedback frustrates users

### Best Practices:
```swift
// Success feedback
WKInterfaceDevice.current().play(.success)

// Error feedback
WKInterfaceDevice.current().play(.failure)

// Notification feedback
WKInterfaceDevice.current().play(.notification)

// DON'T overuse - only for:
// - Successful actions
// - Errors/warnings
// - Critical notifications
```

---

## 📊 Health & Fitness Apps (70% of users)

### Primary Use Cases:
- **Health tracking**: Heart rate, steps, workouts
- **Prominent features**: Easy access to key metrics
- **Real-time data**: Live updates during activities

### Implementation:
```swift
// Prominent metrics
VStack(spacing: 16) {
    MetricView(icon: "heart.fill", value: "\(heartRate)", label: "BPM")
    MetricView(icon: "flame.fill", value: "\(calories)", label: "Cal")
}
```

---

## 🚫 Common Mistakes to Avoid

### 1. **Text Overflow** ⚠️
```swift
❌ BAD:
Text("Start from Routine")
    .font(.footnote)
// Result: May truncate as "Start from Rout..."

✅ GOOD:
Text("Start from Routine")
    .font(.footnote)
    .minimumScaleFactor(0.7)
    .lineLimit(1)
```

### 2. **Z-Index Issues** ⚠️
```swift
❌ BAD:
HStack {
    Text(time)  // May be hidden by button
    Button { } label: { ... }
}

✅ GOOD:
ZStack(alignment: .top) {
    HStack {
        Spacer()
        Text(time)
        Spacer()
    }
    
    HStack {
        Spacer()
        Button { } label: { ... }
    }
    .zIndex(100)  // Ensures button is on top
}
```

### 3. **Too Much Information** ⚠️
```swift
❌ BAD:
VStack {
    Text("Title")
    Text("Subtitle")
    Text("Description line 1")
    Text("Description line 2")
    Text("Timestamp")
    Text("Additional info")
}
// Too much for one screen!

✅ GOOD:
VStack {
    Text("Title")
    Text("Subtitle")
}
// Concise, glanceable
```

### 4. **Small Touch Targets** ⚠️
```swift
❌ BAD:
Button("X") { }
    .frame(width: 20, height: 20)  // Too small!

✅ GOOD:
Button {
    // action
} label: {
    Image(systemName: "xmark")
        .frame(width: 44, height: 44)
}
```

---

## ✅ Text Overflow Prevention Checklist

Use this for ALL text elements:

```swift
// FOR BUTTONS:
Text("Button Text")
    .font(.footnote)
    .minimumScaleFactor(0.7)
    .lineLimit(1)

// FOR TITLES:
Text("Title Text")
    .font(.title3)
    .fontWeight(.semibold)
    .lineLimit(2)
    .minimumScaleFactor(0.8)

// FOR BODY TEXT:
Text("Body text content")
    .font(.callout)
    .fixedSize(horizontal: false, vertical: true)
    .lineLimit(3)

// FOR SECONDARY TEXT:
Text("Secondary info")
    .font(.caption)
    .foregroundColor(.secondary)
    .lineLimit(1)
    .minimumScaleFactor(0.75)
```

---

## 📐 Layout Patterns for watchOS

### Pattern 1: Centered Action
```swift
VStack(spacing: 16) {
    Spacer()
    
    // Icon
    Image(systemName: "icon")
        .font(.system(size: 50))
    
    // Title (with overflow protection)
    Text("Title")
        .font(.title3)
        .lineLimit(2)
        .minimumScaleFactor(0.8)
    
    // Subtitle
    Text("Subtitle")
        .font(.caption)
        .lineLimit(1)
        .minimumScaleFactor(0.75)
    
    // Action button
    Button("Action") { }
        .frame(maxWidth: .infinity)
        .padding()
    
    Spacer()
}
```

### Pattern 2: List with Detail
```swift
List(items) { item in
    VStack(alignment: .leading, spacing: 4) {
        Text(item.title)
            .font(.headline)
            .lineLimit(1)
            .minimumScaleFactor(0.8)
        
        Text(item.subtitle)
            .font(.caption)
            .foregroundColor(.secondary)
            .lineLimit(1)
            .minimumScaleFactor(0.75)
    }
}
```

### Pattern 3: Metric Display
```swift
VStack(spacing: 8) {
    Image(systemName: "heart.fill")
        .font(.system(size: 40))
        .foregroundColor(.red)
    
    Text("\(value)")
        .font(.system(size: 32, weight: .bold, design: .rounded))
    
    Text("Label")
        .font(.caption)
        .foregroundColor(.secondary)
}
```

---

## 🎬 Animation & Motion

### Guidelines:
- **Duration**: 0.2-0.3s for most animations
- **Easing**: `.easeInOut` for smooth motion
- **Purpose**: Guide attention, provide feedback

```swift
withAnimation(.easeInOut(duration: 0.2)) {
    isVisible = true
}
```

---

## 📱 Accessibility

### Dynamic Type Support:
```swift
// Use system font sizes
.font(.headline)  // Scales automatically

// For custom sizes, support scaling
@ScaledMetric var fontSize: CGFloat = 17
Text("Content")
    .font(.system(size: fontSize))
```

### VoiceOver Support:
```swift
Image(systemName: "gear")
    .accessibilityLabel("Settings")

Button("") {
    // action
}
.accessibilityLabel("Start Workout")
```

---

## 📚 Quick Reference: Fix Text Overflow

**For the screenshot issue ("Start from Routine" overflow):**

```swift
// BEFORE (Problematic):
Text("Start from Routine")
    .font(.footnote)
    .foregroundColor(.blue)

// AFTER (Fixed):
Text("Start from Routine")
    .font(.footnote)
    .foregroundColor(.blue)
    .minimumScaleFactor(0.7)      // Allow 30% shrink
    .lineLimit(1)                  // Single line
    .frame(maxWidth: .infinity)    // Use available width
```

**For any text that might overflow:**
1. Add `.minimumScaleFactor(0.7-0.9)` based on importance
2. Set explicit `.lineLimit()`
3. Consider `.fixedSize(horizontal: false, vertical: true)` for multi-line
4. Use `.multilineTextAlignment(.center)` when appropriate

---

## 🎯 Summary: Top Priorities

1. **✅ Prevent text overflow** - Use minimumScaleFactor + lineLimit
2. **✅ Fix z-index issues** - Use ZStack with explicit zIndex
3. **✅ Ensure touch targets ≥ 44pt** - Frame sizes matter
4. **✅ Use SF Compact font** - Optimized for watchOS
5. **✅ Keep content glanceable** - 3 second rule
6. **✅ Add haptic feedback** - Success/failure only
7. **✅ Support Dynamic Type** - Use system fonts
8. **✅ Test on real device** - Simulators lie
9. **✅ Optimize battery** - Minimize background work
10. **✅ Follow Liquid Glass design** - Translucency + depth

---

## 📖 References

- [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines)
- [watchOS 26 Design Resources](https://developer.apple.com/design/resources/)
- [WWDC 2025: What's New in watchOS 26](https://developer.apple.com/videos/play/wwdc2025/334/)
- [Typography Guidelines](https://developer.apple.com/design/human-interface-guidelines/typography)

---

**Last Updated:** October 22, 2025  
**Version:** 1.0 - Based on watchOS 26 and latest research
