# iOS 26 Pregnancy Date Tracking & Baby Development UI/UX Research

**Research Date:** October 17, 2025
**iOS Version:** iOS 26 (Liquid Glass Design Era)
**Research Focus:** Pregnancy date entry, timeline visualization, baby development tracking, and iOS 26-specific design patterns

---

## Executive Summary

This research document synthesizes best practices for implementing pregnancy date tracking and baby development visualization in iOS 26 applications. Key findings emphasize the adoption of Liquid Glass design materials, progressive onboarding patterns, card-based dashboard layouts, and accessibility-first design principles. The pregnancy tracking space has evolved toward visual, engaging experiences that balance medical accuracy with emotional connection.

**Key Recommendations:**
1. Adopt iOS 26 Liquid Glass components for date cards and progress indicators
2. Use wheel-style date picker for EDD/LMP entry with validation
3. Implement circular progress indicators for trimester/week visualization
4. Create visually engaging baby size comparison cards with fruit metaphors
5. Design for VoiceOver and accessibility from day one
6. Provide both onboarding and settings paths for date entry
7. Use card-based dashboard layouts with clear visual hierarchy

---

## Table of Contents

1. [iOS 26 Design System Overview](#ios-26-design-system-overview)
2. [Pregnancy Date Entry UI](#pregnancy-date-entry-ui)
3. [Pregnancy Timeline Visualization](#pregnancy-timeline-visualization)
4. [Baby Size Tracking Displays](#baby-size-tracking-displays)
5. [iOS 26-Specific Patterns](#ios-26-specific-patterns)
6. [Dashboard Integration](#dashboard-integration)
7. [Accessibility Considerations](#accessibility-considerations)
8. [Code Examples](#code-examples)
9. [Component Recommendations](#component-recommendations)
10. [Resources](#resources)

---

## iOS 26 Design System Overview

### Liquid Glass: The New Visual Language

iOS 26 introduces **Liquid Glass**, the most significant design evolution since iOS 7's flat design in 2013. This new design system is fundamental to creating modern, engaging pregnancy tracking interfaces.

#### Core Characteristics of Liquid Glass:

**1. Translucency & Dynamic Adaptation**
- Semi-transparent materials that reflect and refract surrounding content
- Intelligently adjusts opacity based on background content for legibility
- Real-time response to device movement and touch interactions

**2. Fluid Motion & Responsiveness**
- "Gel-like" flexibility that communicates transient UI states
- Ripple and flow effects on touch interactions
- Spring-based animations for natural feel

**3. Lensing & Refraction**
- Light bending effects create depth and visual separation
- Content "shines through" glass layers
- Dynamic highlights based on ambient light conditions

**4. Adaptive Color Intelligence**
- Automatically adjusts between light/dark modes
- "Colorful light/dark" modes for vibrant experiences
- Tinting capabilities for brand customization

#### Implementation in SwiftUI:

```swift
// Basic glass effect
Text("Week 24")
    .padding(30)
    .glassEffect()

// Customized glass with tint
VStack {
    Text("Baby is the size of a papaya")
    Text("12 inches long")
}
.padding()
.glassEffect(.regular.tint(.pink.opacity(0.3)).interactive())

// Glass container for grouped elements
GlassEffectContainer {
    HStack(spacing: 20) {
        WeekIndicator()
        DueDateCountdown()
        TrimesterProgress()
    }
}
```

#### Design Principles:

1. **Clarity**: Information must be understandable at a glance
2. **Deference**: Content is always the focus, not decoration
3. **Depth**: Visual layers create realistic spatial relationships
4. **Fluidity**: Animations feel natural and responsive

---

## Pregnancy Date Entry UI

### Best Practices for Due Date & LMP Entry

Pregnancy tracking requires two primary date inputs:
- **Expected Due Date (EDD)**: The projected delivery date
- **Last Menstrual Period (LMP) / First Day of Pregnancy**: Used to calculate gestational age

#### Date Picker Style Recommendations

**1. Wheel-Style Date Picker (Recommended Primary)**

The wheel date picker provides the most intuitive experience for selecting pregnancy-related dates:

```swift
struct PregnancyDateEntry: View {
    @State private var dueDate = Date()
    @State private var lmpDate = Date()

    // Date range: LMP can be 0-42 weeks ago
    private var dateRange: ClosedRange<Date> {
        let calendar = Calendar.current
        let minDate = calendar.date(byAdding: .day, value: -294, to: Date())! // ~42 weeks
        let maxDate = Date()
        return minDate...maxDate
    }

    var body: some View {
        Form {
            Section(header: Text("Pregnancy Information")) {
                DatePicker(
                    "Due Date",
                    selection: $dueDate,
                    in: Date()...,
                    displayedComponents: .date
                )
                .datePickerStyle(.wheel)

                DatePicker(
                    "First Day of Last Period",
                    selection: $lmpDate,
                    in: dateRange,
                    displayedComponents: .date
                )
                .datePickerStyle(.wheel)
            }
        }
    }
}
```

**Why Wheel Style Works:**
- Large, easy-to-read date components
- Precise control for medical dates
- Familiar iOS interaction pattern
- Reduces input errors compared to keyboard entry
- Natural scrolling feels satisfying

**2. Compact Date Picker (Secondary Option)**

For settings screens where space is limited:

```swift
DatePicker("Due Date", selection: $dueDate, displayedComponents: .date)
    .datePickerStyle(.compact)
    .accentColor(.pink) // iOS 26: Use tint modifier instead
```

**When to Use Compact:**
- Settings screen updates
- Secondary date adjustments
- Space-constrained layouts
- Quick date modifications

**3. Graphical Calendar Picker (Avoid for Primary Entry)**

The graphical style is less suitable for pregnancy dates:
- Harder to navigate 9+ months into the future
- Small touch targets
- More cognitive load
- Better suited for event scheduling

### Validation & Error Handling

Pregnancy date validation is critical for app accuracy:

**Date Range Validation:**

```swift
struct PregnancyDateValidator {
    static func validateDueDate(_ date: Date) -> ValidationResult {
        let calendar = Calendar.current
        let now = Date()

        // Due dates typically 0-42 weeks from now
        let maxFutureDate = calendar.date(byAdding: .day, value: 294, to: now)!
        let minPastDate = calendar.date(byAdding: .day, value: -14, to: now)! // Allow slight past dates

        if date < minPastDate {
            return .error("Due date cannot be more than 2 weeks in the past")
        } else if date > maxFutureDate {
            return .error("Due date cannot be more than 42 weeks in the future")
        }

        return .valid
    }

    static func validateLMP(_ date: Date) -> ValidationResult {
        let calendar = Calendar.current
        let now = Date()

        // LMP typically 0-42 weeks ago
        let maxPastDate = calendar.date(byAdding: .day, value: -294, to: now)!

        if date > now {
            return .error("Last period cannot be in the future")
        } else if date < maxPastDate {
            return .error("Last period date seems too far in the past")
        }

        return .valid
    }

    enum ValidationResult {
        case valid
        case error(String)
    }
}
```

**User-Friendly Error Display:**

```swift
@State private var validationError: String?

VStack(alignment: .leading) {
    DatePicker("Due Date", selection: $dueDate)
        .datePickerStyle(.wheel)
        .onChange(of: dueDate) { newDate in
            let result = PregnancyDateValidator.validateDueDate(newDate)
            if case .error(let message) = result {
                validationError = message
            } else {
                validationError = nil
            }
        }

    if let error = validationError {
        Text(error)
            .font(.caption)
            .foregroundColor(.red)
            .padding(.top, 4)
    }
}
```

### Settings vs. Onboarding Flow Patterns

**Onboarding Flow (First-Time Users):**

Best practices for collecting pregnancy dates during initial setup:

1. **Progressive Disclosure**: Don't overwhelm with all options at once
2. **Single Focus**: One date per screen
3. **Visual Context**: Show why this date matters
4. **Skip Options**: Allow users to enter later if unsure

```swift
struct PregnancyOnboarding: View {
    @State private var currentStep = 0
    @State private var dueDate = Date()

    var body: some View {
        TabView(selection: $currentStep) {
            // Step 1: Welcome
            WelcomeScreen()
                .tag(0)

            // Step 2: Choose entry method
            DateEntryMethodScreen()
                .tag(1)

            // Step 3: Enter date
            DueDateEntryScreen(dueDate: $dueDate)
                .tag(2)

            // Step 4: Confirm
            DateConfirmationScreen(dueDate: dueDate)
                .tag(3)
        }
        .tabViewStyle(.page)
        .indexViewStyle(.page(backgroundDisplayMode: .always))
    }
}

struct DateEntryMethodScreen: View {
    var body: some View {
        VStack(spacing: 30) {
            Text("How would you like to track your pregnancy?")
                .font(.title2)
                .multilineTextAlignment(.center)

            VStack(spacing: 16) {
                OptionCard(
                    icon: "calendar.badge.clock",
                    title: "I know my due date",
                    description: "Enter the date your baby is expected"
                )

                OptionCard(
                    icon: "calendar",
                    title: "I know my last period date",
                    description: "We'll calculate your due date"
                )

                OptionCard(
                    icon: "stethoscope",
                    title: "I had an ultrasound",
                    description: "Enter the gestational age from your scan"
                )
            }

            Button("I'll add this later") {
                // Skip onboarding
            }
            .font(.footnote)
            .foregroundColor(.secondary)
        }
        .padding()
    }
}
```

**Settings Flow (Updates & Changes):**

For users updating their pregnancy dates:

1. **Grouped Form Layout**: Standard iOS settings pattern
2. **Compact Pickers**: Space-efficient
3. **Confirmation Dialogs**: Warn about data changes
4. **History Tracking**: Show previous dates if modified

```swift
struct PregnancySettingsView: View {
    @State private var dueDate = Date()
    @State private var lmpDate = Date()
    @State private var showingConfirmation = false

    var body: some View {
        Form {
            Section {
                DatePicker(
                    "Due Date",
                    selection: $dueDate,
                    displayedComponents: .date
                )
                .onChange(of: dueDate) { _ in
                    showingConfirmation = true
                }

                DatePicker(
                    "Last Menstrual Period",
                    selection: $lmpDate,
                    displayedComponents: .date
                )
            } header: {
                Text("Pregnancy Dates")
            } footer: {
                Text("Changing these dates will recalculate your pregnancy timeline and baby development milestones.")
            }

            Section {
                HStack {
                    Text("Current Week")
                    Spacer()
                    Text("Week 24")
                        .foregroundColor(.secondary)
                }

                HStack {
                    Text("Days Until Due Date")
                    Spacer()
                    Text("112 days")
                        .foregroundColor(.secondary)
                }
            } header: {
                Text("Calculated Information")
            }
        }
        .navigationTitle("Pregnancy Information")
        .alert("Update Pregnancy Dates?", isPresented: $showingConfirmation) {
            Button("Cancel", role: .cancel) {
                // Revert date
            }
            Button("Update") {
                // Save new date
            }
        } message: {
            Text("This will update your pregnancy timeline and recalculate all milestones.")
        }
    }
}
```

### Mental Models & User Expectations

Research shows users expect:

1. **Local Time Zone**: Always display dates in user's local time
2. **Medical Context**: Understand that dates are estimates
3. **Flexibility**: Ability to update as medical info changes
4. **Calculation Help**: App should handle gestational age math
5. **Multiple Entry Points**: Some know EDD, others know LMP

---

## Pregnancy Timeline Visualization

### Week-by-Week Progress Displays

The pregnancy timeline is the core navigation element of any pregnancy app. It should be prominent, easy to understand, and emotionally engaging.

#### Recommended Pattern: Circular Progress Indicator

Circular progress indicators provide an at-a-glance view of pregnancy progression:

**Key Benefits:**
- Intuitive visual metaphor (circle = completion)
- Space-efficient
- Works well in cards
- Supports multiple data layers (week, trimester, days)

**Implementation Example:**

```swift
struct CircularPregnancyProgress: View {
    let currentWeek: Int
    let totalWeeks: Int = 40
    let daysRemaining: Int

    private var progress: Double {
        Double(currentWeek) / Double(totalWeeks)
    }

    var body: some View {
        ZStack {
            // Background circle
            Circle()
                .stroke(Color.gray.opacity(0.2), lineWidth: 12)

            // Progress circle with gradient
            Circle()
                .trim(from: 0, to: progress)
                .stroke(
                    LinearGradient(
                        colors: [.pink, .purple],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    ),
                    style: StrokeStyle(lineWidth: 12, lineCap: .round)
                )
                .rotationEffect(.degrees(-90))
                .animation(.spring(), value: progress)

            // Center content
            VStack(spacing: 4) {
                Text("Week \(currentWeek)")
                    .font(.title.bold())

                Text("of \(totalWeeks)")
                    .font(.caption)
                    .foregroundColor(.secondary)

                Divider()
                    .frame(width: 40)
                    .padding(.vertical, 4)

                Text("\(daysRemaining) days")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
        .frame(width: 180, height: 180)
        .padding()
        .glassEffect(.regular.tint(.pink.opacity(0.1)))
    }
}
```

#### Alternative: Linear Progress Bar with Markers

For horizontal layouts:

```swift
struct LinearPregnancyProgress: View {
    let currentWeek: Int

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Week \(currentWeek) of 40")
                    .font(.headline)
                Spacer()
                Text("\(40 - currentWeek) weeks to go")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }

            GeometryReader { geometry in
                ZStack(alignment: .leading) {
                    // Background track
                    Capsule()
                        .fill(Color.gray.opacity(0.2))
                        .frame(height: 8)

                    // Progress fill
                    Capsule()
                        .fill(
                            LinearGradient(
                                colors: [.pink, .purple],
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                        )
                        .frame(width: geometry.size.width * (Double(currentWeek) / 40), height: 8)
                        .animation(.spring(), value: currentWeek)

                    // Trimester markers
                    HStack(spacing: 0) {
                        ForEach([13, 27], id: \.self) { week in
                            Spacer()
                                .frame(width: geometry.size.width * (Double(week) / 40))

                            Rectangle()
                                .fill(Color.white)
                                .frame(width: 2, height: 12)
                        }
                    }
                }
            }
            .frame(height: 12)

            // Trimester labels
            HStack {
                Text("1st")
                    .font(.caption2)
                Spacer()
                Text("2nd")
                    .font(.caption2)
                Spacer()
                Text("3rd")
                    .font(.caption2)
                Spacer()
                Text("Due")
                    .font(.caption2)
            }
            .foregroundColor(.secondary)
        }
        .padding()
        .glassEffect()
    }
}
```

### Trimester Visualization & Segmentation

Pregnancy is divided into three trimesters, each with distinct characteristics:

- **First Trimester**: Weeks 1-13 (Foundation & Early Development)
- **Second Trimester**: Weeks 14-27 (Growth & Movement)
- **Third Trimester**: Weeks 28-40 (Final Development & Preparation)

**Visual Segmentation Strategy:**

```swift
struct TrimesterView: View {
    let currentWeek: Int

    private func trimesterForWeek(_ week: Int) -> Int {
        switch week {
        case 1...13: return 1
        case 14...27: return 2
        case 28...40: return 3
        default: return 1
        }
    }

    private func trimesterColor(_ trimester: Int) -> Color {
        switch trimester {
        case 1: return .green
        case 2: return .blue
        case 3: return .purple
        default: return .gray
        }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("You're in your \(ordinal(trimesterForWeek(currentWeek))) trimester")
                .font(.title3.bold())

            HStack(spacing: 8) {
                ForEach(1...3, id: \.self) { trimester in
                    TrimesterSegment(
                        trimester: trimester,
                        isActive: trimesterForWeek(currentWeek) == trimester,
                        isPast: trimesterForWeek(currentWeek) > trimester,
                        color: trimesterColor(trimester)
                    )
                }
            }

            Text(trimesterDescription(trimesterForWeek(currentWeek)))
                .font(.subheadline)
                .foregroundColor(.secondary)
        }
        .padding()
        .glassEffect(.regular.tint(trimesterColor(trimesterForWeek(currentWeek)).opacity(0.1)))
    }

    private func ordinal(_ number: Int) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .ordinal
        return formatter.string(from: NSNumber(value: number)) ?? "\(number)"
    }

    private func trimesterDescription(_ trimester: Int) -> String {
        switch trimester {
        case 1: return "Your baby's major organs are forming. You may experience morning sickness and fatigue."
        case 2: return "You'll feel your baby move! This is often called the 'honeymoon period' of pregnancy."
        case 3: return "Your baby is growing rapidly and preparing for birth. Get ready to meet them soon!"
        default: return ""
        }
    }
}

struct TrimesterSegment: View {
    let trimester: Int
    let isActive: Bool
    let isPast: Bool
    let color: Color

    var body: some View {
        VStack(spacing: 8) {
            RoundedRectangle(cornerRadius: 8)
                .fill(isPast || isActive ? color : color.opacity(0.2))
                .frame(height: 60)
                .overlay(
                    VStack {
                        Text("\(trimester)")
                            .font(.title2.bold())
                            .foregroundColor(isPast || isActive ? .white : .gray)

                        if isActive {
                            Circle()
                                .fill(Color.white)
                                .frame(width: 6, height: 6)
                        }
                    }
                )

            Text("Weeks \(trimesterWeekRange(trimester))")
                .font(.caption2)
                .foregroundColor(.secondary)
        }
    }

    private func trimesterWeekRange(_ trimester: Int) -> String {
        switch trimester {
        case 1: return "1-13"
        case 2: return "14-27"
        case 3: return "28-40"
        default: return ""
        }
    }
}
```

### Countdown to Due Date

Countdown displays create anticipation and emotional connection:

**Multiple Time Units:**

```swift
struct DueDateCountdown: View {
    let dueDate: Date

    private var timeRemaining: DateComponents {
        Calendar.current.dateComponents([.day, .hour], from: Date(), to: dueDate)
    }

    var body: some View {
        VStack(spacing: 16) {
            HStack(spacing: 20) {
                CountdownUnit(value: timeRemaining.day ?? 0, unit: "days")
                CountdownUnit(value: timeRemaining.hour ?? 0, unit: "hours")
            }

            Text("Until you meet your baby!")
                .font(.headline)
                .foregroundColor(.secondary)
        }
        .padding(24)
        .glassEffect(.regular.tint(.pink.opacity(0.15)))
    }
}

struct CountdownUnit: View {
    let value: Int
    let unit: String

    var body: some View {
        VStack(spacing: 4) {
            Text("\(value)")
                .font(.system(size: 48, weight: .bold, design: .rounded))
                .foregroundColor(.primary)

            Text(unit)
                .font(.caption)
                .foregroundColor(.secondary)
                .textCase(.uppercase)
        }
        .frame(width: 100)
    }
}
```

### Current Week Indicator Patterns

The current week should be unmistakably clear:

**Visual Indicators:**
- Larger text size
- Gradient or accent color
- Animated pulse effect
- Glass material with tint
- "You are here" marker

```swift
struct WeekIndicatorBadge: View {
    var body: some View {
        HStack(spacing: 8) {
            Image(systemName: "location.fill")
                .foregroundColor(.white)
                .symbolEffect(.pulse)

            Text("Week 24")
                .font(.headline)
                .foregroundColor(.white)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 8)
        .background(
            Capsule()
                .fill(
                    LinearGradient(
                        colors: [.pink, .purple],
                        startPoint: .leading,
                        endPoint: .trailing
                    )
                )
        )
        .shadow(color: .pink.opacity(0.3), radius: 8, x: 0, y: 4)
    }
}
```

---

## Baby Size Tracking Displays

### Visual Representations of Baby Size

Fruit and vegetable comparisons are the industry standard for helping parents visualize baby size. This approach is:
- Immediately understandable
- Emotionally engaging
- Culturally universal
- Memorable

#### Fruit Comparison Standards

Based on research from BabyCenter, What to Expect, and other leading pregnancy apps:

| Week | Fruit/Vegetable | Length | Weight |
|------|-----------------|--------|--------|
| 8    | Raspberry       | 0.6 in | 0.04 oz |
| 12   | Lime            | 2.1 in | 0.5 oz |
| 16   | Avocado         | 4.6 in | 3.5 oz |
| 20   | Banana          | 6.5 in | 10.2 oz |
| 24   | Papaya          | 11.8 in| 1.3 lb |
| 28   | Eggplant        | 14.8 in| 2.2 lb |
| 32   | Pineapple       | 16.7 in| 3.8 lb |
| 36   | Honeydew        | 18.7 in| 5.8 lb |
| 40   | Watermelon      | 19.7 in| 7.6 lb |

#### Implementation Pattern:

```swift
struct BabySizeCard: View {
    let week: Int
    let fruitName: String
    let fruitEmoji: String
    let length: String
    let weight: String

    var body: some View {
        VStack(spacing: 20) {
            // Header
            Text("Your baby is about the size of a")
                .font(.subheadline)
                .foregroundColor(.secondary)

            // Fruit visualization
            VStack(spacing: 12) {
                Text(fruitEmoji)
                    .font(.system(size: 80))
                    .scaleEffect(1.0)
                    .animation(.spring(response: 0.5, dampingFraction: 0.6), value: week)

                Text(fruitName)
                    .font(.title.bold())
            }

            // Measurements
            HStack(spacing: 40) {
                MeasurementDetail(
                    icon: "ruler",
                    value: length,
                    label: "Length"
                )

                MeasurementDetail(
                    icon: "scalemass",
                    value: weight,
                    label: "Weight"
                )
            }
            .padding(.top, 8)
        }
        .padding(24)
        .frame(maxWidth: .infinity)
        .glassEffect(.regular.tint(.orange.opacity(0.1)))
    }
}

struct MeasurementDetail: View {
    let icon: String
    let value: String
    let label: String

    var body: some View {
        VStack(spacing: 6) {
            Image(systemName: icon)
                .font(.title3)
                .foregroundColor(.secondary)

            Text(value)
                .font(.headline)

            Text(label)
                .font(.caption)
                .foregroundColor(.secondary)
        }
    }
}
```

### Week-by-Week Development Milestones

Combine size information with developmental milestones:

```swift
struct WeeklyDevelopmentCard: View {
    let week: Int
    let milestones: [String]

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("What's Happening This Week")
                .font(.headline)

            VStack(alignment: .leading, spacing: 12) {
                ForEach(milestones, id: \.self) { milestone in
                    HStack(alignment: .top, spacing: 12) {
                        Image(systemName: "checkmark.circle.fill")
                            .foregroundColor(.green)
                            .font(.body)

                        Text(milestone)
                            .font(.subheadline)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                }
            }
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .glassEffect()
    }
}

// Example usage:
WeeklyDevelopmentCard(
    week: 24,
    milestones: [
        "Baby can hear sounds from outside the womb",
        "Taste buds are fully developed",
        "Lungs are developing branches",
        "Skin is still transparent but beginning to thicken"
    ]
)
```

### Size Comparison Charts & Interactive Elements

For users who want to see growth over time:

```swift
struct BabyGrowthChart: View {
    let weeks: [Int]
    let lengths: [Double] // in inches

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Baby's Growth Journey")
                .font(.headline)

            Chart {
                ForEach(Array(zip(weeks, lengths)), id: \.0) { week, length in
                    LineMark(
                        x: .value("Week", week),
                        y: .value("Length", length)
                    )
                    .foregroundStyle(
                        LinearGradient(
                            colors: [.pink, .purple],
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                    )

                    PointMark(
                        x: .value("Week", week),
                        y: .value("Length", length)
                    )
                    .foregroundStyle(.white)
                }
            }
            .frame(height: 200)
            .chartXAxis {
                AxisMarks(values: .automatic) { value in
                    AxisValueLabel {
                        if let week = value.as(Int.self) {
                            Text("W\(week)")
                                .font(.caption2)
                        }
                    }
                }
            }
            .chartYAxis {
                AxisMarks { value in
                    AxisValueLabel {
                        if let inches = value.as(Double.self) {
                            Text("\(Int(inches))\"")
                                .font(.caption2)
                        }
                    }
                }
            }
        }
        .padding()
        .glassEffect()
    }
}
```

### Gestational Age Calculation & Display

Accurate gestational age calculation is critical:

```swift
struct GestationalAgeCalculator {
    /// Calculate gestational age from LMP date
    static func calculateFromLMP(_ lmpDate: Date) -> (weeks: Int, days: Int) {
        let calendar = Calendar.current
        let components = calendar.dateComponents([.day], from: lmpDate, to: Date())

        guard let totalDays = components.day else { return (0, 0) }

        let weeks = totalDays / 7
        let days = totalDays % 7

        return (weeks, days)
    }

    /// Calculate gestational age from due date
    static func calculateFromDueDate(_ dueDate: Date) -> (weeks: Int, days: Int) {
        let calendar = Calendar.current
        let components = calendar.dateComponents([.day], from: Date(), to: dueDate)

        guard let daysRemaining = components.day else { return (0, 0) }

        let totalDays = 280 - daysRemaining // 280 days = 40 weeks
        let weeks = totalDays / 7
        let days = totalDays % 7

        return (weeks, days)
    }

    /// Format gestational age for display
    static func formatGestationalAge(_ weeks: Int, _ days: Int) -> String {
        if days == 0 {
            return "\(weeks) weeks"
        } else {
            return "\(weeks) weeks, \(days) \(days == 1 ? "day" : "days")"
        }
    }
}

struct GestationalAgeDisplay: View {
    let weeks: Int
    let days: Int

    var body: some View {
        HStack(spacing: 8) {
            Image(systemName: "calendar")
                .foregroundColor(.secondary)

            Text(GestationalAgeCalculator.formatGestationalAge(weeks, days))
                .font(.subheadline)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 6)
        .background(Color.secondary.opacity(0.1))
        .cornerRadius(8)
    }
}
```

---

## iOS 26-Specific Patterns

### Liquid Glass Materials for Date Cards

Date cards benefit significantly from Liquid Glass materials:

```swift
struct PregnancyDateCard: View {
    let title: String
    let date: Date
    let icon: String

    var body: some View {
        HStack(spacing: 16) {
            Image(systemName: icon)
                .font(.title2)
                .foregroundColor(.pink)
                .frame(width: 50, height: 50)
                .background(Circle().fill(Color.pink.opacity(0.1)))

            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.subheadline)
                    .foregroundColor(.secondary)

                Text(date, style: .date)
                    .font(.headline)
            }

            Spacer()
        }
        .padding()
        .glassEffect(.regular.tint(.pink.opacity(0.05)).interactive())
    }
}
```

### Gradient Accents & Visual Hierarchy

iOS 26 emphasizes gradient accents for visual hierarchy:

**Pregnancy-Appropriate Gradients:**

```swift
extension LinearGradient {
    static let pregnancyPrimary = LinearGradient(
        colors: [Color(hex: "FF6B9D"), Color(hex: "C06C84")],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )

    static let trimester1 = LinearGradient(
        colors: [Color(hex: "85E3C1"), Color(hex: "3BB2B8")],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )

    static let trimester2 = LinearGradient(
        colors: [Color(hex: "A8DADC"), Color(hex: "457B9D")],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )

    static let trimester3 = LinearGradient(
        colors: [Color(hex: "C77DFF"), Color(hex: "9D4EDD")],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )
}

// Helper extension for hex colors
extension Color {
    init(hex: String) {
        let scanner = Scanner(string: hex)
        var rgbValue: UInt64 = 0
        scanner.scanHexInt64(&rgbValue)

        let r = Double((rgbValue & 0xff0000) >> 16) / 255.0
        let g = Double((rgbValue & 0xff00) >> 8) / 255.0
        let b = Double(rgbValue & 0xff) / 255.0

        self.init(red: r, green: g, blue: b)
    }
}
```

### Typography Scales for Dates & Timelines

iOS 26 continues the SF Pro typography system with enhanced scales:

```swift
extension Font {
    // Pregnancy app typography hierarchy
    static let pregnancyHero = Font.system(size: 48, weight: .bold, design: .rounded)
    static let pregnancyTitle = Font.system(size: 28, weight: .semibold, design: .rounded)
    static let pregnancyHeadline = Font.system(size: 20, weight: .semibold, design: .default)
    static let pregnancyBody = Font.system(size: 17, weight: .regular, design: .default)
    static let pregnancyCaption = Font.system(size: 13, weight: .regular, design: .default)

    // Special emphasis for countdown numbers
    static let countdownNumber = Font.system(size: 60, weight: .bold, design: .rounded)
        .monospacedDigit() // Prevents layout shift
}

// Usage example:
struct PregnancyWeekHero: View {
    let week: Int

    var body: some View {
        VStack(spacing: 8) {
            Text("\(week)")
                .font(.pregnancyHero)
                .foregroundStyle(LinearGradient.pregnancyPrimary)

            Text("WEEKS")
                .font(.pregnancyCaption)
                .foregroundColor(.secondary)
                .tracking(2)
        }
    }
}
```

### Animation Patterns for Progress Updates

Smooth, delightful animations are core to iOS 26:

```swift
struct AnimatedWeekTransition: View {
    @State private var currentWeek = 24
    @State private var isAnimating = false

    var body: some View {
        VStack {
            Text("Week \(currentWeek)")
                .font(.pregnancyHero)
                .contentTransition(.numericText())
                .animation(.spring(response: 0.6, dampingFraction: 0.7), value: currentWeek)

            Button("Next Week") {
                withAnimation(.spring(response: 0.6, dampingFraction: 0.7)) {
                    currentWeek += 1
                }
            }
        }
    }
}

// Pulse animation for "current" indicators
struct PulsingCurrentIndicator: View {
    @State private var isPulsing = false

    var body: some View {
        Circle()
            .fill(Color.pink)
            .frame(width: 12, height: 12)
            .scaleEffect(isPulsing ? 1.2 : 1.0)
            .opacity(isPulsing ? 0.5 : 1.0)
            .animation(
                .easeInOut(duration: 1.0)
                .repeatForever(autoreverses: true),
                value: isPulsing
            )
            .onAppear {
                isPulsing = true
            }
    }
}

// Spring-based card entrance
struct SpringCardEntrance: View {
    @State private var isVisible = false

    var body: some View {
        BabySizeCard(
            week: 24,
            fruitName: "Papaya",
            fruitEmoji: "🥭",
            length: "11.8 in",
            weight: "1.3 lb"
        )
        .scaleEffect(isVisible ? 1.0 : 0.8)
        .opacity(isVisible ? 1.0 : 0.0)
        .animation(.spring(response: 0.6, dampingFraction: 0.7), value: isVisible)
        .onAppear {
            isVisible = true
        }
    }
}
```

---

## Dashboard Integration

### Dashboard Layout Best Practices

The dashboard is the app's home screen—it should provide quick access to all key information without overwhelming the user.

#### Recommended Structure:

```swift
struct PregnancyDashboard: View {
    @StateObject private var pregnancyData = PregnancyDataManager()

    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                // Hero Section: Current Week (Most Prominent)
                CurrentWeekHero(week: pregnancyData.currentWeek)

                // Quick Stats Row
                HStack(spacing: 12) {
                    DueDateCountdownCard(daysRemaining: pregnancyData.daysRemaining)
                    TrimesterCard(trimester: pregnancyData.currentTrimester)
                }

                // Baby Size Card (Featured)
                BabySizeCard(
                    week: pregnancyData.currentWeek,
                    fruitName: pregnancyData.currentFruit.name,
                    fruitEmoji: pregnancyData.currentFruit.emoji,
                    length: pregnancyData.currentFruit.length,
                    weight: pregnancyData.currentFruit.weight
                )

                // Development Milestones
                WeeklyDevelopmentCard(
                    week: pregnancyData.currentWeek,
                    milestones: pregnancyData.currentMilestones
                )

                // Health Tracking Cards
                VStack(spacing: 12) {
                    HydrationTrackingCard()
                    SymptomTrackingCard()
                    AppointmentCard()
                }

                // Additional Resources
                ResourcesCard()
            }
            .padding()
        }
        .background(Color(.systemGroupedBackground))
    }
}
```

### Where to Place Pregnancy Date Info

**Primary Placement (Always Visible):**
1. **Navigation Title Area**: Show current week
2. **Hero Card**: Large, centered current week indicator
3. **Quick Stats Bar**: Countdown to due date

**Secondary Placement (Easy Access):**
1. **Settings Screen**: Full date editing capabilities
2. **Profile/About**: Stored pregnancy dates
3. **Widget**: Lock screen/home screen widget

```swift
struct DashboardNavigationTitle: View {
    let currentWeek: Int

    var body: some View {
        HStack(spacing: 8) {
            Image(systemName: "heart.fill")
                .foregroundColor(.pink)

            Text("Week \(currentWeek)")
                .font(.headline)
        }
    }
}
```

### How to Show Current Week Prominently

The current week should be the first thing users see:

```swift
struct CurrentWeekHero: View {
    let week: Int
    let daysIntoWeek: Int

    var body: some View {
        VStack(spacing: 20) {
            // Large week number
            HStack(alignment: .firstTextBaseline, spacing: 8) {
                Text("\(week)")
                    .font(.system(size: 72, weight: .bold, design: .rounded))
                    .foregroundStyle(LinearGradient.pregnancyPrimary)

                VStack(alignment: .leading, spacing: 2) {
                    Text("WEEK")
                        .font(.caption)
                        .fontWeight(.semibold)
                        .foregroundColor(.secondary)

                    Text("+ \(daysIntoWeek) days")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }
            }

            // Progress indicator
            CircularPregnancyProgress(
                currentWeek: week,
                daysRemaining: (40 - week) * 7
            )
        }
        .padding(32)
        .frame(maxWidth: .infinity)
        .glassEffect(.regular.tint(.pink.opacity(0.1)))
    }
}
```

### Baby Size Card Design & Placement

The baby size card should be:
- Visually distinct (use emoji/illustration)
- Information-rich but scannable
- Emotionally engaging
- Updated weekly

**Optimal Placement**: After current week hero, before detailed milestones

```swift
struct FeaturedBabySizeCard: View {
    let week: Int
    let fruit: FruitComparison

    var body: some View {
        VStack(spacing: 0) {
            // Header badge
            HStack {
                Image(systemName: "sparkles")
                Text("Your Baby This Week")
                    .font(.subheadline.weight(.semibold))
                Image(systemName: "sparkles")
            }
            .foregroundColor(.white)
            .padding(.vertical, 8)
            .frame(maxWidth: .infinity)
            .background(LinearGradient.pregnancyPrimary)

            // Content
            VStack(spacing: 20) {
                Text(fruit.emoji)
                    .font(.system(size: 100))
                    .padding(.top, 20)

                Text("About the size of a \(fruit.name)")
                    .font(.title3.weight(.semibold))
                    .multilineTextAlignment(.center)

                HStack(spacing: 40) {
                    VStack(spacing: 4) {
                        Text(fruit.length)
                            .font(.title2.bold())
                        Text("length")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }

                    VStack(spacing: 4) {
                        Text(fruit.weight)
                            .font(.title2.bold())
                        Text("weight")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
                .padding(.bottom, 20)
            }
        }
        .glassEffect(.regular.tint(.orange.opacity(0.05)))
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(LinearGradient.pregnancyPrimary, lineWidth: 2)
        )
    }
}

struct FruitComparison {
    let name: String
    let emoji: String
    let length: String
    let weight: String
}
```

### Balance with Existing Health Tracking Cards

If your app tracks multiple health metrics (hydration, symptoms, etc.), maintain visual consistency:

**Design Principles:**
1. **Unified Card Style**: All cards use glass effect
2. **Consistent Padding**: Same internal spacing
3. **Icon System**: SF Symbols throughout
4. **Color Coding**: Different tints for different functions
5. **Size Hierarchy**: More important = larger

```swift
struct HealthTrackingCard: View {
    let icon: String
    let title: String
    let value: String
    let tintColor: Color
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 16) {
                Image(systemName: icon)
                    .font(.title2)
                    .foregroundColor(tintColor)
                    .frame(width: 50, height: 50)
                    .background(
                        Circle()
                            .fill(tintColor.opacity(0.1))
                    )

                VStack(alignment: .leading, spacing: 4) {
                    Text(title)
                        .font(.subheadline)
                        .foregroundColor(.secondary)

                    Text(value)
                        .font(.headline)
                }

                Spacer()

                Image(systemName: "chevron.right")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            .padding()
            .glassEffect(.regular.tint(tintColor.opacity(0.05)))
        }
        .buttonStyle(.plain)
    }
}

// Dashboard usage:
VStack(spacing: 12) {
    HealthTrackingCard(
        icon: "drop.fill",
        title: "Hydration Today",
        value: "6 of 8 glasses",
        tintColor: .blue
    ) {
        // Navigate to hydration tracker
    }

    HealthTrackingCard(
        icon: "heart.text.square.fill",
        title: "Symptoms",
        value: "2 logged today",
        tintColor: .red
    ) {
        // Navigate to symptom tracker
    }

    HealthTrackingCard(
        icon: "calendar.badge.clock",
        title: "Next Appointment",
        value: "Nov 5, 2:00 PM",
        tintColor: .green
    ) {
        // Navigate to appointments
    }
}
```

---

## Accessibility Considerations

Accessibility is not optional—it's essential for inclusive design. iOS 26 introduces **Accessibility Nutrition Labels** that appear on the App Store, declaring which accessibility features your app supports.

### VoiceOver Support

VoiceOver is Apple's screen reader. For pregnancy tracking apps:

#### Key Principles:

1. **Meaningful Labels**: Describe what users need to know
2. **Avoid Redundancy**: Don't repeat visible text
3. **Context Matters**: Explain relative information
4. **Action Clarity**: Button labels should indicate action

**Implementation Examples:**

```swift
// Bad: No context
Text("24")
    .accessibilityLabel("24")

// Good: Full context
Text("24")
    .accessibilityLabel("Week 24 of 40")
    .accessibilityHint("You are currently in week 24 of your pregnancy")

// Date Picker accessibility
DatePicker("Due Date", selection: $dueDate)
    .accessibilityLabel("Expected due date")
    .accessibilityHint("Select when your baby is expected to arrive")
    .accessibilityValue(dueDate.formatted(date: .long, time: .omitted))

// Progress indicator accessibility
CircularPregnancyProgress(currentWeek: 24, daysRemaining: 112)
    .accessibilityLabel("Pregnancy progress")
    .accessibilityValue("Week 24 of 40, 112 days remaining")

// Baby size card accessibility
BabySizeCard(week: 24, fruitName: "Papaya", fruitEmoji: "🥭", length: "11.8 inches", weight: "1.3 pounds")
    .accessibilityElement(children: .combine)
    .accessibilityLabel("Baby size this week")
    .accessibilityValue("Your baby is about the size of a papaya, measuring 11.8 inches long and weighing 1.3 pounds")
```

#### Grouping Related Content:

```swift
struct PregnancyWeekCard: View {
    let week: Int
    let trimester: Int
    let daysRemaining: Int

    var body: some View {
        VStack {
            Text("Week \(week)")
            Text("Trimester \(trimester)")
            Text("\(daysRemaining) days to go")
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel("Current pregnancy status")
        .accessibilityValue("Week \(week), trimester \(trimester), \(daysRemaining) days until due date")
    }
}
```

### Dynamic Type Support

iOS users can adjust text size system-wide. Your app must respect these preferences:

```swift
// Use built-in text styles (they scale automatically)
Text("Week 24")
    .font(.title)  // ✅ Scales with Dynamic Type

Text("Week 24")
    .font(.system(size: 24))  // ❌ Does not scale

// For custom sizes, use scaledMetric
struct PregnancyWeekView: View {
    @ScaledMetric private var weekNumberSize: CGFloat = 48

    var body: some View {
        Text("24")
            .font(.system(size: weekNumberSize, weight: .bold, design: .rounded))
    }
}

// Limit scaling for design integrity
Text("🥭")
    .font(.system(size: 80))
    .dynamicTypeSize(...DynamicTypeSize.xxxLarge) // Cap at xxxLarge
```

### Color Contrast Requirements

WCAG 2.1 Level AA requires:
- **Normal Text**: 4.5:1 contrast ratio
- **Large Text**: 3:1 contrast ratio
- **UI Components**: 3:1 contrast ratio

**Testing Your Colors:**

```swift
// Good contrast examples
struct AccessibleColors {
    // Text on white background
    static let bodyText = Color(red: 0.2, green: 0.2, blue: 0.2) // ~16:1 ratio
    static let secondaryText = Color(red: 0.4, green: 0.4, blue: 0.4) // ~6:1 ratio

    // Always test gradients at their lightest/darkest points
    static let accessibleGradient = LinearGradient(
        colors: [
            Color(red: 0.8, green: 0.1, blue: 0.4), // Dark enough for contrast
            Color(red: 0.6, green: 0.05, blue: 0.3)
        ],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )
}
```

### Reduce Motion Support

Some users experience motion sickness from animations:

```swift
struct AdaptiveAnimationView: View {
    @Environment(\.accessibilityReduceMotion) var reduceMotion
    @State private var isVisible = false

    var body: some View {
        BabySizeCard(...)
            .scaleEffect(isVisible ? 1.0 : 0.8)
            .opacity(isVisible ? 1.0 : 0.0)
            .animation(
                reduceMotion ? .none : .spring(response: 0.6, dampingFraction: 0.7),
                value: isVisible
            )
            .onAppear {
                isVisible = true
            }
    }
}

// Alternative: Provide instant feedback without animation
struct ReduceMotionAlternative: View {
    @Environment(\.accessibilityReduceMotion) var reduceMotion
    @State private var currentWeek = 24

    var body: some View {
        Text("Week \(currentWeek)")
            .contentTransition(reduceMotion ? .opacity : .numericText())
            .animation(reduceMotion ? .none : .spring(), value: currentWeek)
    }
}
```

### Reduce Transparency (iOS 26-Specific)

Liquid Glass materials can be overwhelming for some users:

```swift
struct AdaptiveGlassEffect: View {
    @Environment(\.accessibilityReduceTransparency) var reduceTransparency

    var body: some View {
        VStack {
            Text("Week 24")
        }
        .padding()
        .background {
            if reduceTransparency {
                RoundedRectangle(cornerRadius: 16)
                    .fill(Color(.systemBackground))
            } else {
                RoundedRectangle(cornerRadius: 16)
                    .glassEffect(.regular.tint(.pink.opacity(0.1)))
            }
        }
    }
}
```

### Accessibility Labels for Dates

Dates require special formatting for VoiceOver:

```swift
struct AccessibleDateDisplay: View {
    let date: Date
    let label: String

    private var formattedDate: String {
        date.formatted(date: .long, time: .omitted)
    }

    private var accessibleDate: String {
        // VoiceOver reads this more naturally
        date.formatted(.dateTime.month(.wide).day().year())
    }

    var body: some View {
        HStack {
            Text(label)
            Spacer()
            Text(formattedDate)
                .accessibilityLabel(accessibleDate)
        }
    }
}

// Usage:
AccessibleDateDisplay(date: dueDate, label: "Due Date")
// VoiceOver: "Due Date, January 15, 2026"
```

### Supporting Voice Control

Voice Control allows users to navigate apps entirely by voice:

```swift
// Provide clear, speakable labels
Button(action: { /* ... */ }) {
    Text("Update Due Date")
}
.accessibilityLabel("Update due date") // User can say "Tap Update due date"

// Custom elements need IDs
Circle()
    .fill(Color.pink)
    .accessibilityElement()
    .accessibilityLabel("Current week indicator")
    .accessibilityAddTraits(.isStaticText)
```

### Accessibility Checklist for Pregnancy Apps

- [ ] All interactive elements have accessibility labels
- [ ] Date pickers include context and hints
- [ ] Progress indicators provide numerical values
- [ ] Images/emojis have descriptive labels
- [ ] Color is not the only means of conveying information
- [ ] Text meets contrast requirements (4.5:1 minimum)
- [ ] App supports Dynamic Type scaling
- [ ] Animations respect Reduce Motion preference
- [ ] Glass effects have solid fallbacks for Reduce Transparency
- [ ] VoiceOver focus order is logical
- [ ] Form inputs have clear labels and error messages
- [ ] Dates are announced in natural language
- [ ] Progress percentages are announced
- [ ] Critical actions have confirmation dialogs

---

## Code Examples

### Complete Date Entry View

```swift
import SwiftUI

struct CompleteDateEntryView: View {
    @State private var entryMethod: DateEntryMethod = .dueDate
    @State private var dueDate = Date()
    @State private var lmpDate = Date()
    @State private var gestationalWeeks = 0
    @State private var gestationalDays = 0
    @State private var validationError: String?
    @Environment(\.dismiss) private var dismiss

    enum DateEntryMethod: String, CaseIterable {
        case dueDate = "Due Date"
        case lmp = "Last Period"
        case ultrasound = "Ultrasound"
    }

    var body: some View {
        NavigationStack {
            Form {
                // Method selection
                Section {
                    Picker("Entry Method", selection: $entryMethod) {
                        ForEach(DateEntryMethod.allCases, id: \.self) { method in
                            Text(method.rawValue).tag(method)
                        }
                    }
                    .pickerStyle(.segmented)
                } header: {
                    Text("How would you like to enter your dates?")
                }

                // Date entry based on method
                Section {
                    switch entryMethod {
                    case .dueDate:
                        dueDateEntry
                    case .lmp:
                        lmpEntry
                    case .ultrasound:
                        ultrasoundEntry
                    }
                } header: {
                    Text(headerText)
                } footer: {
                    if let error = validationError {
                        Text(error)
                            .foregroundColor(.red)
                    } else {
                        Text(footerText)
                    }
                }

                // Calculated information
                if validationError == nil {
                    Section {
                        calculatedInfo
                    } header: {
                        Text("Calculated Information")
                    }
                }
            }
            .navigationTitle("Pregnancy Dates")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        saveDates()
                    }
                    .disabled(validationError != nil)
                }
            }
        }
    }

    private var dueDateEntry: some View {
        DatePicker(
            "Expected Due Date",
            selection: $dueDate,
            in: Date()...,
            displayedComponents: .date
        )
        .datePickerStyle(.wheel)
        .onChange(of: dueDate) { newDate in
            validateDueDate(newDate)
        }
    }

    private var lmpEntry: some View {
        DatePicker(
            "First Day of Last Period",
            selection: $lmpDate,
            in: ...Date(),
            displayedComponents: .date
        )
        .datePickerStyle(.wheel)
        .onChange(of: lmpDate) { newDate in
            validateLMP(newDate)
        }
    }

    private var ultrasoundEntry: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Gestational Age from Ultrasound")
                .font(.subheadline)

            HStack {
                Picker("Weeks", selection: $gestationalWeeks) {
                    ForEach(0..<43) { week in
                        Text("\(week)").tag(week)
                    }
                }
                .pickerStyle(.wheel)
                .frame(maxWidth: .infinity)

                Text("weeks")
                    .foregroundColor(.secondary)

                Picker("Days", selection: $gestationalDays) {
                    ForEach(0..<7) { day in
                        Text("\(day)").tag(day)
                    }
                }
                .pickerStyle(.wheel)
                .frame(maxWidth: .infinity)

                Text("days")
                    .foregroundColor(.secondary)
            }

            DatePicker(
                "Ultrasound Date",
                selection: $dueDate,
                displayedComponents: .date
            )
        }
    }

    private var calculatedInfo: some View {
        Group {
            HStack {
                Text("Current Week")
                Spacer()
                Text("Week \(calculatedWeek)")
                    .foregroundColor(.secondary)
            }

            HStack {
                Text("Days Until Due Date")
                Spacer()
                Text("\(daysRemaining) days")
                    .foregroundColor(.secondary)
            }

            HStack {
                Text("Current Trimester")
                Spacer()
                Text(trimesterText)
                    .foregroundColor(.secondary)
            }
        }
    }

    private var headerText: String {
        switch entryMethod {
        case .dueDate:
            return "When is your baby due?"
        case .lmp:
            return "When did your last period start?"
        case .ultrasound:
            return "What was the gestational age?"
        }
    }

    private var footerText: String {
        switch entryMethod {
        case .dueDate:
            return "This is the date your healthcare provider gave you."
        case .lmp:
            return "We'll calculate your due date (280 days from this date)."
        case .ultrasound:
            return "We'll calculate your due date based on the ultrasound measurements."
        }
    }

    private var calculatedWeek: Int {
        // Simplified calculation
        let calendar = Calendar.current
        let days = calendar.dateComponents([.day], from: lmpDate, to: Date()).day ?? 0
        return days / 7
    }

    private var daysRemaining: Int {
        let calendar = Calendar.current
        return calendar.dateComponents([.day], from: Date(), to: dueDate).day ?? 0
    }

    private var trimesterText: String {
        let week = calculatedWeek
        switch week {
        case 0...13: return "First Trimester"
        case 14...27: return "Second Trimester"
        case 28...40: return "Third Trimester"
        default: return "—"
        }
    }

    private func validateDueDate(_ date: Date) {
        let calendar = Calendar.current
        let maxFutureDate = calendar.date(byAdding: .day, value: 294, to: Date())!
        let minPastDate = calendar.date(byAdding: .day, value: -14, to: Date())!

        if date < minPastDate {
            validationError = "Due date cannot be more than 2 weeks in the past"
        } else if date > maxFutureDate {
            validationError = "Due date cannot be more than 42 weeks in the future"
        } else {
            validationError = nil
        }
    }

    private func validateLMP(_ date: Date) {
        let calendar = Calendar.current
        let maxPastDate = calendar.date(byAdding: .day, value: -294, to: Date())!

        if date > Date() {
            validationError = "Last period cannot be in the future"
        } else if date < maxPastDate {
            validationError = "Last period date seems too far in the past"
        } else {
            validationError = nil
        }
    }

    private func saveDates() {
        // Save to persistent storage
        dismiss()
    }
}
```

### Complete Dashboard Implementation

```swift
import SwiftUI

struct PregnancyDashboardView: View {
    @StateObject private var pregnancyManager = PregnancyDataManager()
    @State private var showingDateSettings = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    // Hero: Current Week
                    CurrentWeekHeroCard(
                        week: pregnancyManager.currentWeek,
                        daysIntoWeek: pregnancyManager.daysIntoWeek
                    )

                    // Quick Stats
                    HStack(spacing: 12) {
                        DueDateCountdownCard(
                            daysRemaining: pregnancyManager.daysRemaining
                        )

                        TrimesterCard(
                            trimester: pregnancyManager.currentTrimester
                        )
                    }

                    // Baby Size
                    BabySizeFeatureCard(
                        week: pregnancyManager.currentWeek,
                        fruit: pregnancyManager.currentFruit
                    )

                    // Development Milestones
                    WeeklyDevelopmentCard(
                        week: pregnancyManager.currentWeek,
                        milestones: pregnancyManager.currentMilestones
                    )

                    // Health Tracking
                    VStack(spacing: 12) {
                        HealthTrackingCard(
                            icon: "drop.fill",
                            title: "Hydration Today",
                            value: "\(pregnancyManager.hydrationCount) of 8 glasses",
                            tintColor: .blue,
                            action: { /* Navigate */ }
                        )

                        HealthTrackingCard(
                            icon: "calendar.badge.clock",
                            title: "Next Appointment",
                            value: pregnancyManager.nextAppointment,
                            tintColor: .green,
                            action: { /* Navigate */ }
                        )
                    }
                }
                .padding()
            }
            .background(Color(.systemGroupedBackground))
            .navigationTitle("My Pregnancy")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button {
                        showingDateSettings = true
                    } label: {
                        Image(systemName: "gearshape")
                    }
                }
            }
            .sheet(isPresented: $showingDateSettings) {
                CompleteDateEntryView()
            }
        }
    }
}

// Supporting Data Manager
class PregnancyDataManager: ObservableObject {
    @Published var currentWeek: Int = 24
    @Published var daysIntoWeek: Int = 3
    @Published var daysRemaining: Int = 112
    @Published var hydrationCount: Int = 6
    @Published var nextAppointment: String = "Nov 5, 2:00 PM"

    var currentTrimester: Int {
        switch currentWeek {
        case 1...13: return 1
        case 14...27: return 2
        case 28...40: return 3
        default: return 1
        }
    }

    var currentFruit: FruitComparison {
        // Simplified - would load from data source
        FruitComparison(
            name: "Papaya",
            emoji: "🥭",
            length: "11.8 in",
            weight: "1.3 lb"
        )
    }

    var currentMilestones: [String] {
        [
            "Baby can hear sounds from outside the womb",
            "Taste buds are fully developed",
            "Lungs are developing branches",
            "Skin is still transparent but beginning to thicken"
        ]
    }
}
```

---

## Component Recommendations

### Recommended UI Component Library Structure

For a scalable pregnancy app, organize components into categories:

```
PregnancyUIComponents/
├── Cards/
│   ├── BabySizeCard.swift
│   ├── WeekProgressCard.swift
│   ├── TrimesterCard.swift
│   ├── HealthTrackingCard.swift
│   └── MilestoneCard.swift
├── Progress/
│   ├── CircularPregnancyProgress.swift
│   ├── LinearPregnancyProgress.swift
│   ├── TrimesterProgressBar.swift
│   └── CountdownDisplay.swift
├── DateEntry/
│   ├── PregnancyDatePicker.swift
│   ├── DateValidation.swift
│   └── GestationalAgeCalculator.swift
├── Modifiers/
│   ├── GlassEffectModifier.swift
│   ├── PregnancyGradients.swift
│   └── AccessibilityHelpers.swift
└── Utilities/
    ├── PregnancyDataModels.swift
    ├── DateFormatters.swift
    └── FruitComparisonData.swift
```

### Reusable Component Patterns

**Glass Effect Card Base:**

```swift
struct GlassCard<Content: View>: View {
    let tintColor: Color
    let content: Content

    init(tintColor: Color = .clear, @ViewBuilder content: () -> Content) {
        self.tintColor = tintColor
        self.content = content()
    }

    var body: some View {
        content
            .padding()
            .glassEffect(.regular.tint(tintColor.opacity(0.05)))
    }
}

// Usage:
GlassCard(tintColor: .pink) {
    VStack {
        Text("Week 24")
        Text("Second Trimester")
    }
}
```

**Stat Display Component:**

```swift
struct StatDisplay: View {
    let icon: String
    let value: String
    let label: String
    let color: Color

    var body: some View {
        VStack(spacing: 8) {
            Image(systemName: icon)
                .font(.title2)
                .foregroundColor(color)

            Text(value)
                .font(.title3.bold())

            Text(label)
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity)
    }
}
```

---

## Resources

### Official Apple Documentation

1. **iOS 26 Design Resources**
   - [Liquid Glass Design System](https://liquidglass.info/)
   - [Apple Human Interface Guidelines - iOS 26](https://developer.apple.com/design/human-interface-guidelines/)
   - [WWDC 2025: What's New in SwiftUI](https://developer.apple.com/videos/wwdc2025/)

2. **SwiftUI Components**
   - [DatePicker Documentation](https://developer.apple.com/documentation/swiftui/datepicker)
   - [Glass Effect Modifier](https://developer.apple.com/documentation/swiftui/view/glasseffect())
   - [Progress View Styles](https://developer.apple.com/documentation/swiftui/progressview)

3. **Accessibility**
   - [Accessibility in SwiftUI](https://developer.apple.com/documentation/swiftui/accessibility)
   - [VoiceOver Best Practices](https://developer.apple.com/documentation/accessibility/voiceover)
   - [Accessibility Nutrition Labels](https://developer.apple.com/accessibility/nutrition-labels/)

### Pregnancy App UX Research

1. **Academic Studies**
   - "User Experience with Pregnancy Tracker Mobile Apps" (PLOS ONE, 2025)
   - "Data Driven UX/UI Design for Reproductive Health Tracker" (IEEE, 2025)

2. **Industry Examples**
   - BabyCenter - [App Store](https://apps.apple.com/us/app/babycenter-track-pregnancy-app/)
   - What to Expect - Week-by-week tracking patterns
   - Pregnancy+ - 3D baby development visualizations
   - Flo - Period and pregnancy tracking UI patterns

### Design Pattern Libraries

1. **Mobile UI Patterns**
   - [Dribbble - Pregnancy App Designs](https://dribbble.com/tags/pregnancy-app)
   - [PageFlows - iOS Onboarding Patterns](https://pageflows.com/ios/)
   - [Mobbin - Health App Patterns](https://mobbin.com/)

2. **iOS Component Examples**
   - [SwiftUI Recipes](https://swiftuirecipes.com/)
   - [Hacking with Swift](https://www.hackingwithswift.com/)

### Medical Accuracy Resources

1. **Gestational Age Calculations**
   - [ACOG Pregnancy Dating Guidelines](https://www.acog.org/)
   - [PediTools Gestational Age Calculator](https://peditools.org/dates/)

2. **Fetal Development Milestones**
   - [BabyCenter Fetal Development Guide](https://www.babycenter.com/pregnancy/your-baby/fetal-development-week-by-week_10406730)
   - [WebMD Pregnancy Timeline](https://www.webmd.com/baby/interactive-pregnancy-tool-fetal-development)

### Color & Typography

1. **Accessible Color Palettes**
   - [WCAG Color Contrast Checker](https://webaim.org/resources/contrastchecker/)
   - [Coolors.co - Accessible Palette Generator](https://coolors.co/)

2. **SF Symbols**
   - [SF Symbols App](https://developer.apple.com/sf-symbols/)
   - Pregnancy-relevant symbols: `heart.fill`, `calendar.badge.clock`, `figure.stand`, `drop.fill`, `stethoscope`

---

## Conclusion & Next Steps

### Key Takeaways

1. **Liquid Glass is Essential**: iOS 26's design language should be embraced throughout your pregnancy app for a modern, premium feel

2. **Date Entry Flexibility**: Provide multiple entry methods (EDD, LMP, ultrasound) to accommodate different user knowledge levels

3. **Visual Engagement Matters**: Fruit comparisons, circular progress, and emoji-based visuals create emotional connection

4. **Accessibility is Non-Negotiable**: Design for VoiceOver, Dynamic Type, and Reduce Motion from day one

5. **Card-Based Layouts Work**: The dashboard should use a card-based, scrollable layout with clear visual hierarchy

6. **Progressive Disclosure**: Show the most important information (current week) first, with details available on demand

7. **Consistent Design System**: Use unified padding, colors, and glass effects across all health tracking features

### Implementation Priority

**Phase 1: Foundation (Week 1-2)**
- [ ] Implement date picker with validation
- [ ] Create gestational age calculator
- [ ] Design current week hero card
- [ ] Set up basic dashboard layout

**Phase 2: Core Features (Week 3-4)**
- [ ] Add circular progress indicator
- [ ] Implement baby size comparison cards
- [ ] Create trimester visualization
- [ ] Add countdown display

**Phase 3: Polish & Accessibility (Week 5-6)**
- [ ] Apply Liquid Glass effects throughout
- [ ] Implement full VoiceOver support
- [ ] Add Dynamic Type scaling
- [ ] Test with Reduce Motion/Transparency

**Phase 4: Integration (Week 7-8)**
- [ ] Integrate with existing health tracking
- [ ] Add onboarding flow
- [ ] Implement settings screen
- [ ] Create home screen widgets

### Questions for Product Team

1. **Data Storage**: Where will pregnancy dates be stored? (UserDefaults, CoreData, CloudKit?)
2. **Multiple Pregnancies**: Should the app support tracking multiple pregnancies?
3. **Historical Data**: How much history should be retained after birth?
4. **Privacy**: What data privacy disclosures are needed for pregnancy tracking?
5. **Medical Disclaimer**: What disclaimers are needed for calculated dates?
6. **Widget Support**: Should lock screen/home screen widgets show pregnancy info?
7. **Apple Health Integration**: Should we sync to HealthKit?

### Testing Recommendations

1. **Accessibility Testing**
   - Test with VoiceOver enabled
   - Test at largest Dynamic Type size
   - Test with Reduce Motion enabled
   - Test with Reduce Transparency enabled

2. **Edge Cases**
   - Due date in the past (overdue)
   - Due date very far in future
   - Multiple date updates
   - Date conflicts (EDD vs LMP calculations)

3. **Device Testing**
   - iPhone SE (smallest screen)
   - iPhone Pro Max (largest screen)
   - iPad (if supporting)
   - Different iOS versions

---

**Document Version**: 1.0
**Last Updated**: October 17, 2025
**Research Conducted By**: iOS 26 UI Research Specialist
**Next Review Date**: November 17, 2025

---

## Appendix: Quick Reference

### Gestational Age Formula

```
Weeks = Days from LMP / 7
Due Date = LMP + 280 days
Current Week = (Today - LMP) / 7
Days Remaining = Due Date - Today
```

### Trimester Boundaries

- **First Trimester**: Week 1-13
- **Second Trimester**: Week 14-27
- **Third Trimester**: Week 28-40

### SF Symbol Reference for Pregnancy Apps

- `heart.fill` - Love, baby health
- `calendar.badge.clock` - Appointments, due dates
- `figure.stand` - Pregnancy, motherhood
- `drop.fill` - Hydration tracking
- `chart.line.uptrend.xyaxis` - Growth tracking
- `stethoscope` - Medical appointments
- `pills.fill` - Medication/vitamins
- `bed.double.fill` - Sleep tracking
- `fork.knife` - Nutrition tracking
- `location.fill` - Current position indicator

### Color Psychology for Pregnancy Apps

- **Pink/Rose**: Traditional pregnancy color, nurturing
- **Purple**: Royalty, special occasion
- **Blue**: Calm, trustworthy, medical
- **Green**: Growth, health, natural
- **Orange**: Energy, vitamin-rich fruits

Avoid: Red (can signal danger), Dark colors (can feel heavy)
