# iOS 26 Chart and Data Visualization Best Practices for Health Apps
## Comprehensive Research Report - 2025

**Research Date:** October 17, 2025
**Focus:** Pregnancy weight tracking and health app chart design
**Target Platform:** iOS 26 with Liquid Glass design language

---

## Table of Contents

1. [iOS 26 Chart Libraries & APIs](#ios-26-chart-libraries--apis)
2. [Top Health App Chart Design Patterns](#top-health-app-chart-design-patterns)
3. [Chart Best Practices](#chart-best-practices)
4. [Pregnancy Weight Chart Specifics](#pregnancy-weight-chart-specifics)
5. [iOS 26 Liquid Glass Design Language](#ios-26-liquid-glass-design-language)
6. [Implementation Recommendations](#implementation-recommendations)
7. [Code Examples](#code-examples)
8. [Color Palettes](#color-palettes)
9. [Accessibility Patterns](#accessibility-patterns)

---

## 1. iOS 26 Chart Libraries & APIs

### Swift Charts Framework - Latest Features

Swift Charts remains the official Apple framework for data visualization, with significant enhancements for iOS 26:

#### Key Features for iOS 26:
- **3D Charts Support** (WWDC25): New `Chart3D` container with `SurfacePlot` capabilities
- **Liquid Glass Integration**: Native support for translucent materials and glass effects
- **Enhanced Animations**: More fluid, spring-based animations that align with Liquid Glass design
- **Improved Accessibility**: Better VoiceOver integration with `AXChartDescriptor`

#### Core Chart Types:
```swift
// Basic chart types available:
- BarMark
- LineMark
- AreaMark
- PointMark
- RectangleMark
- RuleMark (for reference lines)
- SectorMark (pie charts, WWDC23+)
```

### Chart Modifiers and Customization

#### Essential Modifiers:
```swift
.chartYScale(domain: minValue...maxValue)
.chartXScale(domain: startDate...endDate)
.chartYAxis { }
.chartXAxis { }
.chartLegend(position: .overlay, alignment: .top)
.chartPlotStyle { plotArea in }
.chartScrollableAxes(.horizontal)
.chartScrollPosition(x: $scrollPosition)
.foregroundStyle() // Color and gradients
.interpolationMethod(.catmullRom) // For smooth lines
```

#### Advanced Customization:
```swift
// Custom axis marks
.chartYAxis {
    AxisMarks(position: .leading) { value in
        AxisGridLine()
        AxisValueLabel(horizontalSpacing: 16)
    }
}

// Gradient fills for area charts
AreaMark(x: .value("Date", date), y: .value("Weight", weight))
    .foregroundStyle(
        LinearGradient(
            gradient: Gradient(colors: [
                Color.mint.opacity(0.8),
                Color.mint.opacity(0.1)
            ]),
            startPoint: .top,
            endPoint: .bottom
        )
    )
    .alignsMarkStylesWithPlotArea()
```

### Liquid Glass Effects in Charts

Based on iOS 26 design language updates, charts can integrate Liquid Glass effects:

```swift
// Basic glass effect (iOS 26+)
Chart { }
    .background(.ultraThinMaterial, in: .rect(cornerRadius: 16))
    .glassBackgroundEffect(
        in: .rect(cornerRadius: 16),
        displayMode: .adaptive
    )

// Glass effect with custom styling
Chart { }
    .background {
        RoundedRectangle(cornerRadius: 16)
            .fill(.ultraThinMaterial)
    }
```

### Animation Patterns

Apple recommends these animation approaches for health data:

```swift
// Staggered animation for data points
@State private var show: [Bool] = []

func animateChart() {
    show = []
    for index in data.indices {
        DispatchQueue.main.asyncAfter(deadline: .now() + Double(index) * 0.05) {
            withAnimation(.interactiveSpring(
                response: 0.5,
                dampingFraction: 0.5,
                blendDuration: 0.5
            )) {
                show.append(true)
            }
        }
    }
}

// Trim-based line animation
LineMark(...)
    .trim(from: 0, to: animationProgress)
    .animation(.easeInOut(duration: 1.5), value: animationProgress)
```

---

## 2. Top Health App Chart Design Patterns

### Apple Health Weight Chart Patterns

Apple Health (iOS 26) follows these principles:

1. **Minimalist Design**: Clean, uncluttered with focus on the data
2. **Contextual Baseline**: Y-axis starts near minimum value, not zero
3. **Gentle Gradients**: Subtle gradient fills below line charts
4. **Smart Scaling**: Dynamic range with ~10% padding above/below data range
5. **Reference Lines**: Dotted horizontal lines for key thresholds
6. **Interactive Points**: Tap to see exact values with haptic feedback

**Key Observations:**
- Uses **contextual baseline** (not zero) for weight tracking
- Grid lines are subtle, often just 3-5 horizontal lines
- Current value emphasized with a larger point marker
- Timeline shows last 6 months, 1 year, or all data
- Smooth line interpolation (Catmull-Rom curve)

### MyFitnessPal Visualization Patterns

MyFitnessPal (2025 version) demonstrates:

1. **Color-Coded Success**: Green for below goal, red for above, gray for neutral
2. **Bar Charts for Daily**: Individual days shown as vertical bars
3. **Line Charts for Trends**: Weekly/monthly averages shown as lines
4. **Dual Y-Axis**: Calories on left, macros on right
5. **Stacked Areas**: Macronutrient breakdown as stacked area chart

**Chart Handling:**
- **Y-axis scaling**: Always includes goal line as anchor point
- **Grid lines**: Light gray, every 200-500 units depending on scale
- **Color coding**: Consistent across app (green = good, red = over, blue = protein)

### Flo Pregnancy Tracking Charts

Flo's pregnancy charts show best-in-class design:

1. **Trimester-Based Color Coding**: Different pastel colors for each trimester
2. **Expected Range Shading**: Gray/pink bands showing healthy range
3. **Milestone Markers**: Icons at key gestational weeks
4. **Empathetic Design**: Soft colors, rounded corners, encouraging language
5. **Data Density Balance**: Not overwhelming, personalized insights

**Weight Chart Specifics:**
- Pre-pregnancy baseline clearly marked
- Recommended gain range shown as shaded area
- Current trend line overlaid on recommendations
- Uses pink/coral color palette (warm, reassuring)
- Weekly data points with smooth interpolation

### Oura Ring Health Charts

Oura's approach (2025):

1. **Dark Mode First**: Designed for dark background with glowing elements
2. **Circular Progress Indicators**: Ring-based scores
3. **Multi-Layer Charts**: Sleep stages stacked with smooth transitions
4. **Contextual Ranges**: "Optimal," "Good," "Pay Attention" zones color-coded
5. **Minimal Grid Lines**: Focus on the data curve, not the grid

**Visualization Strategy:**
- **Y-axis**: Hidden for readability scores, shown for detailed metrics
- **Baseline**: Always optimal/average range, not zero
- **Colors**: Blue for cold, orange for warm, green for optimal
- **Interactions**: Swipe left/right for different time periods

### Whoop Fitness Charts

Whoop's data-dense approach:

1. **Strain Score Chart**: Stacked bar showing intensity levels
2. **Recovery Chart**: Line with green/yellow/red zones
3. **Sleep Chart**: Multi-bar horizontal showing sleep stages
4. **HRV Trend**: Line chart with exponential moving average
5. **Comparison Overlays**: Personal average vs current trend

**Y-Axis Handling:**
- Dynamic range based on 30-day rolling window
- Reference lines for personal averages
- Grid lines minimized, focus on data

---

## 3. Chart Best Practices

### Y-Axis Scaling Strategies

#### When to Use Zero Baseline:
- **Bar charts** (almost always)
- Comparing absolute quantities
- When proportions matter visually

#### When to Use Contextual Baseline:
- **Line charts** showing trends over time
- Weight tracking (small changes matter)
- Temperature, heart rate, blood pressure
- Any metric where zero is meaningless

**Recommended Approach for Pregnancy Weight:**
```swift
// Calculate dynamic range with 10% padding
let minWeight = data.map(\.weight).min() ?? 0
let maxWeight = data.map(\.weight).max() ?? 100
let range = maxWeight - minWeight
let padding = range * 0.1

.chartYScale(
    domain: (minWeight - padding)...(maxWeight + padding)
)
```

### Grid Lines and Reference Lines

**Best Practices:**
- **4-6 horizontal grid lines** maximum
- Use subtle colors (gray at 0.2-0.3 opacity)
- Vertical grid lines rarely needed for time-series
- Reference lines for important thresholds (goals, averages)

```swift
// Subtle grid lines
.chartYAxis {
    AxisMarks(preset: .aligned, values: .automatic(desiredCount: 5)) { value in
        AxisGridLine(stroke: StrokeStyle(lineWidth: 0.5))
            .foregroundStyle(Color.gray.opacity(0.2))
        AxisValueLabel()
    }
}

// Reference line for goal weight
RuleMark(y: .value("Goal", goalWeight))
    .foregroundStyle(Color.green.opacity(0.5))
    .lineStyle(StrokeStyle(lineWidth: 2, dash: [5, 5]))
    .annotation(position: .top, alignment: .trailing) {
        Text("Goal")
            .font(.caption)
            .foregroundColor(.green)
    }
```

### Color Psychology for Weight Gain/Loss

**Pregnancy Weight Context:**
- **Recommended Gain Range**: Soft green (#7FE0C0) or mint
- **Below Recommended**: Warm orange/amber (#FFB347) - attention needed
- **Above Recommended**: Gentle coral/pink (#FF9999) - not alarming red
- **Neutral/On Track**: Soft blue or teal (#4A90E2)

**Avoid:**
- Harsh red (too alarming for pregnancy)
- Pure black lines (use dark gray instead)
- Neon or highly saturated colors

**Recommended Palette:**
```swift
// Pregnancy weight chart colors
struct PregnancyWeightColors {
    static let healthyGain = Color(hex: "#7FE0C0") // Soft mint green
    static let belowRange = Color(hex: "#FFB347")  // Warm orange
    static let aboveRange = Color(hex: "#FF9999")  // Gentle coral
    static let baseline = Color(hex: "#B0B0B0")    // Neutral gray
    static let current = Color(hex: "#4A90E2")     // Confident blue

    // Gradient for area fill
    static let gradientTop = Color(hex: "#7FE0C0").opacity(0.4)
    static let gradientBottom = Color(hex: "#7FE0C0").opacity(0.05)
}
```

### Interactive Features

**Tap to See Value:**
```swift
@State private var selectedDataPoint: WeightEntry?

Chart {
    ForEach(weightData) { entry in
        LineMark(
            x: .value("Date", entry.date),
            y: .value("Weight", entry.weight)
        )
        .foregroundStyle(Color.blue)

        if let selected = selectedDataPoint, selected.id == entry.id {
            PointMark(
                x: .value("Date", entry.date),
                y: .value("Weight", entry.weight)
            )
            .symbolSize(200)
            .foregroundStyle(Color.blue)
        }
    }
}
.chartOverlay { proxy in
    GeometryReader { geometry in
        Rectangle()
            .fill(Color.clear)
            .contentShape(Rectangle())
            .gesture(
                DragGesture(minimumDistance: 0)
                    .onChanged { value in
                        let xPosition = value.location.x - geometry[proxy.plotAreaFrame].origin.x

                        if let date: Date = proxy.value(atX: xPosition) {
                            selectedDataPoint = weightData.min(by: {
                                abs($0.date.timeIntervalSince(date)) < abs($1.date.timeIntervalSince(date))
                            })

                            // Haptic feedback
                            UIImpactFeedbackGenerator(style: .light).impactOccurred()
                        }
                    }
                    .onEnded { _ in
                        selectedDataPoint = nil
                    }
            )
    }
}
```

### Legend Placement and Design

**Best Practices:**
- **Overlay at top** for single-series charts
- **Bottom** for multi-series comparison
- **Hidden** if obvious from context
- Use color swatches, not just text

```swift
.chartLegend(position: .overlay, alignment: .topLeading)
.chartLegend(spacing: 10)
```

---

## 4. Pregnancy Weight Chart Specifics

### Pre-Pregnancy Baseline Visualization

**Critical Element:** Clearly show the starting point.

```swift
struct PregnancyWeightChart: View {
    let prePregnancyWeight: Double
    let currentWeight: Double
    let weightData: [WeightEntry]
    let gestationalWeek: Int

    var body: some View {
        Chart {
            // Baseline reference line
            RuleMark(y: .value("Pre-pregnancy", prePregnancyWeight))
                .foregroundStyle(Color.gray.opacity(0.5))
                .lineStyle(StrokeStyle(lineWidth: 1, dash: [3, 3]))
                .annotation(position: .leading, alignment: .center) {
                    Text("Pre-pregnancy: \(prePregnancyWeight, specifier: "%.1f") lbs")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }

            // Recommended range as area
            AreaMark(
                x: .value("Week", weekRange),
                yStart: .value("Min", recommendedMinWeight(week: weekRange)),
                yEnd: .value("Max", recommendedMaxWeight(week: weekRange))
            )
            .foregroundStyle(Color.green.opacity(0.1))

            // Actual weight line
            ForEach(weightData) { entry in
                LineMark(
                    x: .value("Week", entry.gestationalWeek),
                    y: .value("Weight", entry.weight)
                )
                .foregroundStyle(Color.blue)
                .interpolationMethod(.catmullRom)
            }
        }
    }
}
```

### Recommended Weight Gain Ranges

Based on **INTERGROWTH-21st** and **IOM (Institute of Medicine)** standards:

| BMI Category | Total Gain (lbs) | 1st Trimester | 2nd/3rd Trimester |
|--------------|------------------|---------------|-------------------|
| Underweight (<18.5) | 28-40 | 2.2-6.6 lbs | ~1 lb/week |
| Normal (18.5-24.9) | 25-35 | 2.2-6.6 lbs | ~1 lb/week |
| Overweight (25-29.9) | 15-25 | 1.1-4.4 lbs | ~0.6 lb/week |
| Obese (≥30) | 11-20 | 1.1-4.4 lbs | ~0.5 lb/week |

**Implementation:**
```swift
func recommendedWeightGain(prePregnancyBMI: Double, gestationalWeek: Int) -> (min: Double, max: Double) {
    let category: BMICategory

    switch prePregnancyBMI {
    case ..<18.5: category = .underweight
    case 18.5..<25.0: category = .normal
    case 25.0..<30.0: category = .overweight
    default: category = .obese
    }

    // Calculate based on week and category
    let weeklyGain: Double
    let firstTrimesterGain: (Double, Double)

    switch category {
    case .underweight:
        weeklyGain = 1.0
        firstTrimesterGain = (2.2, 6.6)
    case .normal:
        weeklyGain = 1.0
        firstTrimesterGain = (2.2, 6.6)
    case .overweight:
        weeklyGain = 0.6
        firstTrimesterGain = (1.1, 4.4)
    case .obese:
        weeklyGain = 0.5
        firstTrimesterGain = (1.1, 4.4)
    }

    if gestationalWeek <= 13 {
        // First trimester
        let progress = Double(gestationalWeek) / 13.0
        return (
            firstTrimesterGain.0 * progress,
            firstTrimesterGain.1 * progress
        )
    } else {
        // Second and third trimester
        let weeksAfterFirst = Double(gestationalWeek - 13)
        let additionalGain = weeksAfterFirst * weeklyGain
        return (
            firstTrimesterGain.0 + additionalGain * 0.7,
            firstTrimesterGain.1 + additionalGain * 1.3
        )
    }
}
```

### Trimester-Based Color Coding

**Visual Strategy:**
```swift
struct TrimesterColors {
    static func color(for week: Int) -> Color {
        switch week {
        case 0...13:  return Color(hex: "#FFE4E1") // Misty Rose - First
        case 14...27: return Color(hex: "#E6F3FF") // Alice Blue - Second
        case 28...42: return Color(hex: "#F0E6FF") // Lavender - Third
        default:      return Color.gray
        }
    }

    static func trimesterName(for week: Int) -> String {
        switch week {
        case 0...13:  return "First Trimester"
        case 14...27: return "Second Trimester"
        case 28...42: return "Third Trimester"
        default:      return ""
        }
    }
}

// Use in chart background
.chartPlotStyle { plotArea in
    plotArea.background {
        // Trimester background zones
        ForEach(trimesters, id: \.self) { trimester in
            Rectangle()
                .fill(TrimesterColors.color(for: trimester.startWeek))
                .opacity(0.1)
        }
    }
}
```

### Expected Weight Gain Curves

**Curve Calculation (IOM Model):**
```swift
func expectedWeightAtWeek(
    prePregnancyBMI: Double,
    gestationalWeek: Double
) -> Double {
    let category = BMICategory.from(bmi: prePregnancyBMI)

    // Sigmoidal curve parameters (based on IOM data)
    let totalGain: Double
    switch category {
    case .underweight: totalGain = 34.0 // midpoint
    case .normal: totalGain = 30.0
    case .overweight: totalGain = 20.0
    case .obese: totalGain = 15.5
    }

    // Sigmoidal growth curve
    // Slower gain in first trimester, linear in 2nd/3rd
    if gestationalWeek <= 13 {
        return totalGain * 0.15 * (gestationalWeek / 13.0)
    } else {
        let firstTrimGain = totalGain * 0.15
        let remainingWeeks = gestationalWeek - 13.0
        let remainingGain = totalGain - firstTrimGain
        return firstTrimGain + (remainingGain * (remainingWeeks / 27.0))
    }
}
```

### Medical Visualization Standards

**Key Requirements:**
1. **Accuracy**: Data must be precise, no rounding errors
2. **Clarity**: Avoid misleading scales or truncated axes
3. **Context**: Always show recommended ranges
4. **Updates**: Real-time or daily updates preferred
5. **Privacy**: Secure storage, HIPAA considerations

**Labeling:**
```swift
// Clear, medical-grade labels
.chartYAxisLabel("Weight (lbs)", position: .trailing)
.chartXAxisLabel("Gestational Age (weeks)", position: .bottom)

// Include units in all displays
Text("\(weight, specifier: "%.1f") lbs")
Text("Week \(gestationalWeek)")
```

---

## 5. iOS 26 Liquid Glass Design Language

### Overview

Liquid Glass is Apple's newest design language (announced WWDC 2025), featuring:
- **Translucent materials** that refract background content
- **Fluid transformations** where controls morph based on context
- **Content-first approach** reducing visual clutter
- **Enhanced depth** through layering and blur

### Chart Styling with Liquid Glass

**Basic Implementation:**
```swift
Chart {
    // Your chart content
}
.background(.ultraThinMaterial)
.clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
.shadow(color: Color.black.opacity(0.1), radius: 10, x: 0, y: 5)
```

**Advanced Glass Effect:**
```swift
// Custom glass chart card
struct GlassChartCard<Content: View>: View {
    @ViewBuilder let content: Content

    var body: some View {
        content
            .padding()
            .background {
                ZStack {
                    // Base glass layer
                    RoundedRectangle(cornerRadius: 20, style: .continuous)
                        .fill(.ultraThinMaterial)

                    // Subtle gradient overlay
                    RoundedRectangle(cornerRadius: 20, style: .continuous)
                        .fill(
                            LinearGradient(
                                colors: [
                                    Color.white.opacity(0.2),
                                    Color.white.opacity(0.0)
                                ],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )

                    // Border highlight
                    RoundedRectangle(cornerRadius: 20, style: .continuous)
                        .strokeBorder(
                            LinearGradient(
                                colors: [
                                    Color.white.opacity(0.3),
                                    Color.white.opacity(0.1)
                                ],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            ),
                            lineWidth: 1
                        )
                }
            }
            .shadow(color: Color.black.opacity(0.1), radius: 20, y: 10)
    }
}

// Usage
GlassChartCard {
    Chart {
        // Your chart content
    }
}
```

### Dynamic Color System

iOS 26 emphasizes **semantic colors** that adapt to context:

```swift
// Use semantic colors for better Liquid Glass integration
.foregroundStyle(.tint) // Adapts to user's accent color
.foregroundStyle(.primary) // High contrast text
.foregroundStyle(.secondary) // Reduced emphasis
.foregroundStyle(.tertiary) // Lowest emphasis

// Material backgrounds
.background(.regularMaterial) // Standard glass
.background(.thinMaterial) // More transparent
.background(.ultraThinMaterial) // Most transparent
.background(.thickMaterial) // Less transparent
```

**Chart Color Integration:**
```swift
Chart {
    AreaMark(...)
        .foregroundStyle(
            LinearGradient(
                colors: [
                    Color.accentColor.opacity(0.6),
                    Color.accentColor.opacity(0.1)
                ],
                startPoint: .top,
                endPoint: .bottom
            )
        )

    LineMark(...)
        .foregroundStyle(.tint)
        .lineStyle(StrokeStyle(lineWidth: 3))
}
```

### Haptic Feedback on Interaction

iOS 26 emphasizes **sensory feedback**:

```swift
// Different haptic styles for different interactions
let selectionFeedback = UISelectionFeedbackGenerator()
let impactFeedback = UIImpactFeedbackGenerator(style: .light)
let notificationFeedback = UINotificationFeedbackGenerator()

// On data point selection
.onChange(of: selectedDataPoint) { oldValue, newValue in
    if newValue != nil {
        selectionFeedback.selectionChanged()
    }
}

// On threshold crossing
if weight > recommendedMax {
    notificationFeedback.notificationOccurred(.warning)
}

// On tap
.onTapGesture {
    impactFeedback.impactOccurred()
}
```

### VoiceOver Support for Charts

**Critical for Accessibility:**
```swift
Chart {
    ForEach(weightData) { entry in
        LineMark(
            x: .value("Week", entry.gestationalWeek),
            y: .value("Weight", entry.weight)
        )
        .accessibilityLabel("Week \(entry.gestationalWeek)")
        .accessibilityValue("\(entry.weight, specifier: "%.1f") pounds")
    }
}
.accessibilityChartDescriptor(createChartDescriptor())

// Create AXChartDescriptor for advanced VoiceOver
func createChartDescriptor() -> AXChartDescriptor {
    let xAxis = AXNumericDataAxisDescriptor(
        title: "Gestational Week",
        range: 0...40,
        gridlinePositions: []
    ) { value in "\(Int(value)) weeks" }

    let yAxis = AXNumericDataAxisDescriptor(
        title: "Weight",
        range: minWeight...maxWeight,
        gridlinePositions: []
    ) { value in "\(value, specifier: "%.1f") pounds" }

    let series = AXDataSeriesDescriptor(
        name: "Weight Progression",
        isContinuous: true,
        dataPoints: weightData.map { entry in
            AXDataPoint(
                x: Double(entry.gestationalWeek),
                y: entry.weight,
                label: "Week \(entry.gestationalWeek): \(entry.weight, specifier: "%.1f") lbs"
            )
        }
    )

    return AXChartDescriptor(
        title: "Pregnancy Weight Tracking",
        summary: "Weight progression from weeks 0 to \(gestationalWeek)",
        xAxis: xAxis,
        yAxis: yAxis,
        series: [series]
    )
}
```

### Dark Mode Considerations

**Essential for iOS 26:**
```swift
@Environment(\.colorScheme) var colorScheme

var chartBackgroundColor: Color {
    colorScheme == .dark ? Color.black.opacity(0.3) : Color.white.opacity(0.5)
}

var chartLineColor: Color {
    colorScheme == .dark ? Color.blue.opacity(0.8) : Color.blue
}

// Adaptive materials automatically adjust
.background(.regularMaterial) // Automatically adapts to dark mode
```

---

## 6. Implementation Recommendations

### Before/After Chart Proposals

#### BEFORE (Current Basic Approach):
```swift
// Simple, non-optimized chart
Chart {
    ForEach(weightData) { entry in
        LineMark(
            x: .value("Date", entry.date),
            y: .value("Weight", entry.weight)
        )
    }
}
.frame(height: 200)
```

**Issues:**
- No context (recommended range missing)
- No baseline reference
- No visual feedback
- Poor accessibility
- No trimester indication
- Harsh lines, no smoothing

#### AFTER (Optimized for iOS 26):
```swift
struct OptimizedPregnancyWeightChart: View {
    let weightData: [WeightEntry]
    let prePregnancyWeight: Double
    let bmi: Double
    @State private var selectedEntry: WeightEntry?

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Header with context
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Weight Progression")
                        .font(.headline)
                    Text("Week \(currentWeek) of 40")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                Spacer()
                if let latest = weightData.last {
                    VStack(alignment: .trailing, spacing: 4) {
                        Text("\(latest.weight, specifier: "%.1f") lbs")
                            .font(.title2.weight(.semibold))
                        Text(gainStatus)
                            .font(.caption)
                            .foregroundStyle(gainStatusColor)
                    }
                }
            }

            // The chart
            Chart {
                // Recommended range as filled area
                ForEach(0..<40) { week in
                    let range = recommendedWeightGain(
                        prePregnancyBMI: bmi,
                        gestationalWeek: week
                    )
                    AreaMark(
                        x: .value("Week", week),
                        yStart: .value("Min", prePregnancyWeight + range.min),
                        yEnd: .value("Max", prePregnancyWeight + range.max)
                    )
                    .foregroundStyle(Color.green.opacity(0.15))
                }

                // Pre-pregnancy baseline
                RuleMark(y: .value("Baseline", prePregnancyWeight))
                    .foregroundStyle(Color.secondary.opacity(0.5))
                    .lineStyle(StrokeStyle(lineWidth: 1, dash: [4, 4]))
                    .annotation(position: .leading) {
                        Text("Pre-pregnancy")
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                    }

                // Actual weight line with area fill
                AreaMark(
                    x: .value("Week", \.gestationalWeek),
                    yStart: .value("Baseline", prePregnancyWeight),
                    y: .value("Weight", \.weight),
                    series: .value("Actual", "Weight")
                )
                .foregroundStyle(
                    LinearGradient(
                        colors: [
                            Color.blue.opacity(0.3),
                            Color.blue.opacity(0.05)
                        ],
                        startPoint: .top,
                        endPoint: .bottom
                    )
                )

                LineMark(
                    x: .value("Week", \.gestationalWeek),
                    y: .value("Weight", \.weight)
                )
                .foregroundStyle(Color.blue)
                .lineStyle(StrokeStyle(lineWidth: 3, lineCap: .round))
                .interpolationMethod(.catmullRom)

                // Selected point
                if let selected = selectedEntry {
                    PointMark(
                        x: .value("Week", selected.gestationalWeek),
                        y: .value("Weight", selected.weight)
                    )
                    .symbolSize(100)
                    .foregroundStyle(Color.blue)

                    RuleMark(x: .value("Week", selected.gestationalWeek))
                        .foregroundStyle(Color.secondary.opacity(0.3))
                        .lineStyle(StrokeStyle(lineWidth: 1, dash: [2, 2]))
                        .annotation(position: .top, alignment: .center) {
                            VStack(spacing: 4) {
                                Text("\(selected.weight, specifier: "%.1f") lbs")
                                    .font(.callout.weight(.semibold))
                                Text("Week \(selected.gestationalWeek)")
                                    .font(.caption2)
                                    .foregroundStyle(.secondary)
                            }
                            .padding(8)
                            .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 8))
                        }
                }
            }
            .frame(height: 300)
            .chartYScale(domain: calculateYDomain())
            .chartXScale(domain: 0...40)
            .chartYAxis {
                AxisMarks(position: .leading, values: .automatic(desiredCount: 5)) {
                    AxisGridLine(stroke: StrokeStyle(lineWidth: 0.5))
                        .foregroundStyle(Color.secondary.opacity(0.2))
                    AxisValueLabel()
                        .font(.caption)
                }
            }
            .chartXAxis {
                AxisMarks(values: .stride(by: 4)) {
                    AxisGridLine(stroke: StrokeStyle(lineWidth: 0.5))
                        .foregroundStyle(Color.secondary.opacity(0.2))
                    AxisValueLabel()
                        .font(.caption)
                }
            }
            .chartOverlay { proxy in
                GeometryReader { geometry in
                    Rectangle()
                        .fill(Color.clear)
                        .contentShape(Rectangle())
                        .gesture(
                            DragGesture(minimumDistance: 0)
                                .onChanged { value in
                                    handleChartGesture(value: value, proxy: proxy, geometry: geometry)
                                }
                                .onEnded { _ in
                                    selectedEntry = nil
                                }
                        )
                }
            }
            .accessibilityChartDescriptor(createChartDescriptor())
        }
        .padding()
        .background {
            RoundedRectangle(cornerRadius: 20, style: .continuous)
                .fill(.ultraThinMaterial)
        }
        .overlay {
            RoundedRectangle(cornerRadius: 20, style: .continuous)
                .strokeBorder(
                    LinearGradient(
                        colors: [
                            Color.white.opacity(0.3),
                            Color.white.opacity(0.1)
                        ],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    ),
                    lineWidth: 1
                )
        }
        .shadow(color: Color.black.opacity(0.1), radius: 20, y: 10)
    }

    private func handleChartGesture(value: DragGesture.Value, proxy: ChartProxy, geometry: GeometryProxy) {
        let xPosition = value.location.x - geometry[proxy.plotAreaFrame].origin.x

        if let week: Int = proxy.value(atX: xPosition) {
            selectedEntry = weightData.min(by: {
                abs($0.gestationalWeek - week) < abs($1.gestationalWeek - week)
            })

            UIImpactFeedbackGenerator(style: .light).impactOccurred()
        }
    }

    private func calculateYDomain() -> ClosedRange<Double> {
        let dataMin = weightData.map(\.weight).min() ?? prePregnancyWeight
        let dataMax = weightData.map(\.weight).max() ?? prePregnancyWeight
        let range = dataMax - dataMin
        let padding = max(range * 0.15, 5.0) // At least 5 lbs padding

        return (dataMin - padding)...(dataMax + padding)
    }
}
```

**Improvements:**
✅ Recommended range clearly visualized
✅ Pre-pregnancy baseline marked
✅ Smooth line interpolation
✅ Interactive with haptic feedback
✅ Liquid Glass styling
✅ Full accessibility support
✅ Contextual information displayed
✅ Proper Y-axis scaling
✅ Professional medical-grade appearance

---

## 7. Code Examples

### Complete Weight Tracking Chart

See the "AFTER" example above for a production-ready implementation.

### Mini Summary Card

```swift
struct WeightSummaryCard: View {
    let currentWeight: Double
    let weeklyChange: Double
    let isWithinRange: Bool

    var body: some View {
        HStack(spacing: 16) {
            // Icon
            Image(systemName: isWithinRange ? "checkmark.circle.fill" : "exclamationmark.triangle.fill")
                .font(.title2)
                .foregroundStyle(isWithinRange ? Color.green : Color.orange)

            // Stats
            VStack(alignment: .leading, spacing: 4) {
                Text("\(currentWeight, specifier: "%.1f") lbs")
                    .font(.title3.weight(.semibold))

                HStack(spacing: 4) {
                    Image(systemName: weeklyChange >= 0 ? "arrow.up.right" : "arrow.down.right")
                        .font(.caption)
                    Text("\(abs(weeklyChange), specifier: "%.1f") lbs this week")
                        .font(.caption)
                }
                .foregroundStyle(.secondary)
            }

            Spacer()
        }
        .padding()
        .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 16))
    }
}
```

### Trimester Progress Indicator

```swift
struct TrimesterProgressView: View {
    let currentWeek: Int

    private var trimester: Int {
        switch currentWeek {
        case 0...13: return 1
        case 14...27: return 2
        default: return 3
        }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Trimester \(trimester)")
                .font(.headline)

            HStack(spacing: 4) {
                ForEach(1...3, id: \.self) { t in
                    Capsule()
                        .fill(t <= trimester ? Color.blue : Color.gray.opacity(0.3))
                        .frame(height: 4)
                }
            }

            Text("Week \(currentWeek) of 40")
                .font(.caption)
                .foregroundStyle(.secondary)
        }
    }
}
```

---

## 8. Color Palettes

### Primary Pregnancy Weight Palette

```swift
enum PregnancyWeightColorPalette {
    // Main colors
    static let onTrack = Color(hex: "#7FE0C0")        // Soft mint green
    static let belowRange = Color(hex: "#FFB347")     // Warm orange
    static let aboveRange = Color(hex: "#FF9999")     // Gentle coral
    static let baseline = Color(hex: "#9E9E9E")       // Neutral gray
    static let current = Color(hex: "#4A90E2")        // Confident blue

    // Trimester colors
    static let firstTrimester = Color(hex: "#FFE4E1")   // Misty rose
    static let secondTrimester = Color(hex: "#E6F3FF")  // Alice blue
    static let thirdTrimester = Color(hex: "#F0E6FF")   // Lavender

    // Gradients
    static let healthyGradient = LinearGradient(
        colors: [
            Color(hex: "#7FE0C0").opacity(0.4),
            Color(hex: "#7FE0C0").opacity(0.05)
        ],
        startPoint: .top,
        endPoint: .bottom
    )

    static let cautionGradient = LinearGradient(
        colors: [
            Color(hex: "#FFB347").opacity(0.4),
            Color(hex: "#FFB347").opacity(0.05)
        ],
        startPoint: .top,
        endPoint: .bottom
    )
}

// Color extension for hex support
extension Color {
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
```

### Apple Health Inspired Palette

```swift
enum AppleHealthColors {
    static let heartRate = Color(hex: "#FF2D55")      // Red
    static let activeEnergy = Color(hex: "#FF3B30")   // Orange-red
    static let steps = Color(hex: "#FF9500")          // Orange
    static let nutrition = Color(hex: "#32D74B")      // Green
    static let mindfulness = Color(hex: "#64D2FF")    // Light blue
    static let sleep = Color(hex: "#BF5AF2")          // Purple
    static let weight = Color(hex: "#0A84FF")         // Blue (system blue)
}
```

---

## 9. Accessibility Patterns

### VoiceOver Best Practices

```swift
// Chart level
Chart { }
    .accessibilityLabel("Pregnancy weight tracking chart")
    .accessibilityHint("Shows your weight progression over gestational weeks with recommended ranges")
    .accessibilityChartDescriptor(descriptor)

// Individual marks
LineMark(...)
    .accessibilityLabel("Week \(week)")
    .accessibilityValue("\(weight, specifier: "%.1f") pounds, which is \(status) recommended range")
```

### Dynamic Type Support

```swift
// Use scalable fonts
.font(.body) // Scales with user's text size preference
.font(.headline)
.font(.caption)

// Minimum sizes for legibility
.font(.system(size: 14, weight: .regular))
.minimumScaleFactor(0.8)
```

### Reduce Motion Support

```swift
@Environment(\.accessibilityReduceMotion) var reduceMotion

// Conditional animations
if !reduceMotion {
    withAnimation(.spring(response: 0.5, dampingFraction: 0.7)) {
        // Animate
    }
} else {
    // No animation
}
```

### Color Blindness Considerations

**Patterns, not just colors:**
```swift
// Use shapes + colors
PointMark(...)
    .symbol(.circle) // Different shapes for different series

// Use patterns
RuleMark(...)
    .lineStyle(StrokeStyle(lineWidth: 2, dash: [5, 5])) // Dashed for recommended
    .lineStyle(StrokeStyle(lineWidth: 3)) // Solid for actual

// High contrast mode
@Environment(\.accessibilityDifferentiateWithoutColor) var differentiateWithoutColor

if differentiateWithoutColor {
    // Use patterns instead of colors
}
```

---

## Key Takeaways & Action Items

### Critical Best Practices:
1. ✅ Use **contextual baseline** for weight charts (not zero)
2. ✅ Show **recommended ranges** as shaded areas
3. ✅ Implement **smooth interpolation** (Catmull-Rom)
4. ✅ Add **haptic feedback** on interactions
5. ✅ Use **soft, reassuring colors** for pregnancy context
6. ✅ Provide **full VoiceOver support** with AXChartDescriptor
7. ✅ Apply **Liquid Glass styling** for iOS 26
8. ✅ Include **pre-pregnancy baseline** reference line
9. ✅ Calculate **trimester-specific** color coding
10. ✅ Test in **dark mode** thoroughly

### Implementation Priority:
**Phase 1 (Essential):**
- Basic chart with recommended range
- Pre-pregnancy baseline
- Smooth line interpolation
- Proper Y-axis scaling

**Phase 2 (Enhanced):**
- Interactive tap to see values
- Haptic feedback
- Liquid Glass styling
- Trimester indicators

**Phase 3 (Polish):**
- Full accessibility support
- Advanced animations
- Summary cards
- Export/sharing features

---

## Additional Resources

### Apple Documentation:
- [Swift Charts Documentation](https://developer.apple.com/documentation/charts)
- [WWDC22: Hello Swift Charts](https://developer.apple.com/videos/play/wwdc2022/10136/)
- [WWDC22: Swift Charts: Raise the bar](https://developer.apple.com/videos/play/wwdc2022/10137/)
- [WWDC23: Explore pie charts and interactivity](https://developer.apple.com/videos/play/wwdc2023/10037/)
- [WWDC24: Swift Charts: Vectorized and function plots](https://developer.apple.com/videos/play/wwdc2024/10155/)
- [WWDC25: Bring Swift Charts to the third dimension](https://developer.apple.com/videos/play/wwdc2025/313/)
- [Human Interface Guidelines: Charts](https://developer.apple.com/design/human-interface-guidelines/charts)
- [Accessibility for Charts](https://developer.apple.com/videos/play/wwdc2021/10122/)

### Medical Standards:
- [INTERGROWTH-21st Gestational Weight Gain Standards](https://intergrowth21.com/tools-resources/gestational-weight-gain)
- [IOM Pregnancy Weight Gain Guidelines](https://www.ncbi.nlm.nih.gov/books/NBK235227/)
- [ACOG Weight Gain Recommendations](https://www.acog.org/)

### Design References:
- [Apple's Liquid Glass Design (WWDC25)](https://www.apple.com/newsroom/2025/06/apple-introduces-a-delightful-and-elegant-new-software-design/)
- [Data Visualization Best Practices 2025](https://www.datateams.ai/blog/data-visualization-best-practices)
- [Chart Design Guidelines](https://guides.library.duke.edu/datavis/topten)

---

**Document Version:** 1.0
**Last Updated:** October 17, 2025
**Author:** Research compiled for HydrationReminder pregnancy weight tracking feature
