# Task 4: Calorie Tracking Enhancements

**Task Date:** November 2, 2025
**Status:** Documentation Complete
**Complexity:** Medium-High
**Estimated Implementation Time:** 6-8 hours

---

## Table of Contents

1. [Overview](#overview)
2. [Current Implementation Analysis](#current-implementation-analysis)
3. [Research: Trimester-Specific Caloric Needs](#research-trimester-specific-caloric-needs)
4. [Proposed Daily Tracking UI Design](#proposed-daily-tracking-ui-design)
5. [Graph Range Visualization Approach](#graph-range-visualization-approach)
6. [Reminder Logic and Triggers](#reminder-logic-and-triggers)
7. [Integration Architecture](#integration-architecture)
8. [Implementation Plan](#implementation-plan)
9. [Testing Strategy](#testing-strategy)
10. [Accessibility Considerations](#accessibility-considerations)

---

## Overview

### Goals
Enhance the existing weekly calorie tracking system with:
1. **Daily calorie tracking** alongside weekly trends
2. **Trimester-based caloric ranges** displayed on graphs
3. **Visual range indicators** showing recommended intake zones
4. **Smart reminders** that notify users about caloric goals

### User Value
- Helps pregnant users understand their daily caloric needs based on trimester
- Provides actionable guidance through timely notifications
- Reduces anxiety by showing healthy ranges, not just hard targets
- Supports healthy pregnancy weight gain through evidence-based recommendations

### Technical Scope
- Extend `WeeklyCalorieTrackerCard.swift` with daily view mode
- Create `DailyCalorieTrackerCard.swift` for focused daily tracking
- Integrate with `PregnancyDataManager` for trimester detection
- Add calorie-specific notification types to `NotificationManager`
- Update chart visualizations with range bands (iOS 26 patterns)

---

## Current Implementation Analysis

### File: `WeeklyCalorieTrackerCard.swift`

**Current Features:**
- Displays bar chart of last 7 days of calorie intake
- Shows average calories across the week
- Counts days at goal (currently hardcoded to 2000 cal)
- Color-codes bars based on goal achievement:
  - Gray: 0 calories (no data)
  - Blue: < 80% of goal
  - Green: 80-120% of goal
  - Orange: > 120% of goal

**Data Sources:**
- Pulls from `LogsManager.getCalories(for:)` for voice/manual logs
- Pulls from `PhotoFoodLogManager` for photo-based food logs
- Aggregates both sources for total daily calories

**Current Limitations:**
1. **Static goal**: Hardcoded `@State private var dailyGoal = 2000`
2. **No trimester awareness**: Doesn't account for pregnancy stage
3. **Weekly focus only**: No dedicated daily view
4. **No range visualization**: Only shows a single goal line, not a healthy range
5. **No reminders**: Passive display, no proactive notifications
6. **Fixed baseline**: Always shows from 0, not contextual

**Existing Chart Structure:**
```swift
Chart {
    // Goal line (dotted)
    RuleMark(y: .value("Goal", dailyGoal))
        .lineStyle(StrokeStyle(lineWidth: 1, dash: [5, 5]))

    // Average line (dotted)
    RuleMark(y: .value("Average", averageCalories))

    // Bar marks for each day
    ForEach(weeklyData, id: \.date) { data in
        BarMark(x: .value("Day", data.date, unit: .day),
                y: .value("Calories", data.calories))
    }
}
```

**iOS 26 Design Elements Already Present:**
- Liquid Glass styling with `.ultraThinMaterial`
- Rounded corners (24pt continuous)
- Gradient border overlay
- Shadow with color tint (`.blue.opacity(0.12)`)
- Dynamic Y-axis scaling based on data

---

## Research: Trimester-Specific Caloric Needs

### Medical Guidelines (Institute of Medicine & ACOG)

Based on authoritative medical sources, the caloric recommendations for pregnancy are:

#### First Trimester (Weeks 0-13)
- **Additional Calories:** 0 extra calories
- **Reasoning:** Fetal development requires minimal extra energy in first 13 weeks
- **Total Daily:** Pre-pregnancy baseline (typically 1800-2400 cal for most women)

#### Second Trimester (Weeks 14-27)
- **Additional Calories:** +340 calories per day
- **Reasoning:** Fetal growth accelerates, maternal blood volume increases
- **Total Daily:** Baseline + 340 cal

#### Third Trimester (Weeks 28-40+)
- **Additional Calories:** +450 calories per day
- **Reasoning:** Maximum fetal growth, preparation for lactation
- **Total Daily:** Baseline + 450 cal

### Baseline Caloric Needs (Non-Pregnant)

The baseline varies by:
- **Age:** Younger women typically need more
- **BMI:** Higher BMI may need adjusted baseline
- **Activity Level:** Sedentary vs active lifestyle

**Standard Baseline Estimates:**
```
Sedentary:    1800-2000 cal/day
Moderately Active: 2000-2200 cal/day
Active:       2200-2400 cal/day
```

### Recommended Range (Not Just Target)

Medical guidance emphasizes **ranges** rather than fixed targets:

#### First Trimester Range
```
Minimum: 1800 cal/day (sedentary baseline)
Maximum: 2400 cal/day (active baseline)
Midpoint: 2100 cal/day
```

#### Second Trimester Range
```
Minimum: 2140 cal/day (1800 + 340)
Maximum: 2740 cal/day (2400 + 340)
Midpoint: 2440 cal/day
```

#### Third Trimester Range
```
Minimum: 2250 cal/day (1800 + 450)
Maximum: 2850 cal/day (2400 + 450)
Midpoint: 2550 cal/day
```

### Important Context from Research

**From Academy of Nutrition and Dietetics:**
> "Additional calories should come from nutrient-dense foods including lean protein, whole grains, low-fat or fat-free dairy, vegetables and fruit."

**Critical Notes:**
1. Individual needs vary significantly
2. Women with multiple pregnancies (twins, triplets) need more
3. Women with hyperemesis gravidarum may need different guidance
4. Underweight/overweight women have different targets
5. These are **guidelines**, not prescriptive rules

### Sources
1. **Academy of Nutrition and Dietetics** - "Healthy Weight During Pregnancy" (2025)
2. **National Institutes of Health** - "Energy Intake Requirements in Pregnancy" (PMC6723706)
3. **MedlinePlus** - "Eating Right During Pregnancy" (Medical Encyclopedia)
4. **Institute of Medicine** - "Nutrition During Pregnancy" (NCBI Bookshelf)

---

## Proposed Daily Tracking UI Design

### Component: `DailyCalorieTrackerCard`

**Purpose:** Focused, at-a-glance view of TODAY's calorie intake with context.

**Visual Layout (iOS 26 Liquid Glass):**

```
┌─────────────────────────────────────────────────┐
│  🍽️ Today's Nutrition                          │
│  2,340 / 2,440 cal           95% of recommended │
│                                                 │
│  ┌──────────────────────────────────────────┐  │
│  │   [████████████████░░░░░░░░░░░░░░░] 95%  │  │
│  │   Below    Optimal Range     Above       │  │
│  │  ─────────────────────────────────       │  │
│  │   2140        2440           2740        │  │
│  └──────────────────────────────────────────┘  │
│                                                 │
│  📊 Breakdown                                   │
│  Breakfast: 520 cal  │  Lunch: 680 cal         │
│  Snacks: 340 cal     │  Dinner: 800 cal        │
│                                                 │
│  ℹ️ You're in week 18 (2nd trimester)          │
│  Recommended: 2140-2740 calories/day           │
└─────────────────────────────────────────────────┘
```

**Key Elements:**

1. **Current / Target Display**
   - Large, readable numerals (Title2 weight)
   - Dynamic color based on position in range
   - Percentage indicator

2. **Visual Progress Bar**
   - Segmented bar showing three zones: Below (orange), Optimal (green), Above (coral)
   - Current position marker with animation
   - Range labels below bar

3. **Meal Breakdown**
   - Grid layout showing calories by meal time (breakfast, lunch, dinner, snacks)
   - Uses `LogsManager.getMealsByTimeOfDay(for:)` to categorize
   - Tappable to view food details

4. **Context Panel**
   - Current week and trimester
   - Recommended range explanation
   - Subtle info icon for more details

**Color Coding Strategy:**

```swift
struct CalorieRangeColor {
    static func color(for calories: Int, range: CalorieRange) -> Color {
        if calories == 0 {
            return .gray.opacity(0.5) // No data
        } else if calories < range.minimum - 200 {
            return Color(hex: "#FFB347") // Well below (warm orange)
        } else if calories < range.minimum {
            return Color(hex: "#FFD700") // Slightly below (gold)
        } else if calories >= range.minimum && calories <= range.maximum {
            return Color(hex: "#7FE0C0") // Optimal (soft mint)
        } else if calories <= range.maximum + 200 {
            return Color(hex: "#FFCC99") // Slightly above (peach)
        } else {
            return Color(hex: "#FF9999") // Well above (gentle coral)
        }
    }
}
```

**Interaction:**
- Tap on meal breakdown to navigate to `LogLedgerView` filtered by meal type
- Swipe down to refresh calorie data
- Long press on range bar to see detailed explanation

**Data Model:**

```swift
struct CalorieRange {
    let minimum: Int
    let maximum: Int
    let midpoint: Int
    let trimester: Int
    let week: Int

    var description: String {
        "\(minimum)-\(maximum) cal/day (Trimester \(trimester))"
    }
}

extension PregnancyDataManager {
    func currentCalorieRange(baselineCalories: Int = 2100) -> CalorieRange? {
        guard let week = pregnancyData?.currentWeek,
              let trimester = pregnancyData?.currentTrimester else {
            return nil
        }

        let additionalCalories: Int
        switch trimester {
        case 1: additionalCalories = 0
        case 2: additionalCalories = 340
        case 3: additionalCalories = 450
        default: additionalCalories = 0
        }

        // Range assumes sedentary (1800) to active (2400) baseline
        // Adjust for user's actual baseline
        let minCalories = 1800 + additionalCalories
        let maxCalories = 2400 + additionalCalories
        let midCalories = baselineCalories + additionalCalories

        return CalorieRange(
            minimum: minCalories,
            maximum: maxCalories,
            midpoint: midCalories,
            trimester: trimester,
            week: week
        )
    }
}
```

---

## Graph Range Visualization Approach

### Enhanced `WeeklyCalorieTrackerCard`

**Modification Strategy:**
1. Add trimester-aware range bands to existing bar chart
2. Show both minimum and maximum recommended lines
3. Color-code the range area with gradient fill
4. Maintain existing bar chart, overlay range context

**Visual Approach:**

```
Chart {
    // 1. Recommended range as filled area (behind bars)
    ForEach(weeklyData) { data in
        let range = getCalorieRange(for: data.date)

        AreaMark(
            x: .value("Day", data.date, unit: .day),
            yStart: .value("Min", range.minimum),
            yEnd: .value("Max", range.maximum)
        )
        .foregroundStyle(
            LinearGradient(
                colors: [
                    Color.green.opacity(0.2),
                    Color.green.opacity(0.1)
                ],
                startPoint: .top,
                endPoint: .bottom
            )
        )
    }

    // 2. Midpoint reference line
    RuleMark(y: .value("Target", currentMidpoint))
        .lineStyle(StrokeStyle(lineWidth: 2, dash: [5, 5]))
        .foregroundStyle(.green.opacity(0.6))
        .annotation(position: .top, alignment: .trailing) {
            Text("Recommended")
                .font(.caption2)
                .foregroundStyle(.secondary)
                .padding(4)
                .background(.ultraThinMaterial)
                .cornerRadius(4)
        }

    // 3. Actual calorie bars (existing)
    ForEach(weeklyData, id: \.date) { data in
        BarMark(
            x: .value("Day", data.date, unit: .day),
            y: .value("Calories", data.calories)
        )
        .foregroundStyle(barColor(for: data.calories, range: getCalorieRange(for: data.date)))
        .cornerRadius(6)
    }
}
```

**Trimester Transition Handling:**

If the weekly view spans two trimesters (e.g., week 13 → 14):

```swift
private func getCalorieRange(for date: Date) -> CalorieRange {
    // Calculate gestational week for this specific date
    // Use PregnancyDataManager to determine trimester
    // Return appropriate range

    guard let lmpDate = pregnancyManager.pregnancyData?.lmpDate else {
        // Default range if no pregnancy data
        return CalorieRange(minimum: 1800, maximum: 2400, midpoint: 2100, trimester: 1, week: 0)
    }

    let daysSinceLMP = Calendar.current.dateComponents([.day], from: lmpDate, to: date).day ?? 0
    let week = daysSinceLMP / 7
    let trimester = week <= 13 ? 1 : (week <= 27 ? 2 : 3)

    // Calculate range based on trimester
    let additionalCal: Int
    switch trimester {
    case 1: additionalCal = 0
    case 2: additionalCal = 340
    case 3: additionalCal = 450
    default: additionalCal = 0
    }

    return CalorieRange(
        minimum: 1800 + additionalCal,
        maximum: 2400 + additionalCal,
        midpoint: 2100 + additionalCal,
        trimester: trimester,
        week: week
    )
}
```

**Legend Addition:**

```swift
VStack(alignment: .leading, spacing: 6) {
    HStack(spacing: 8) {
        Rectangle()
            .fill(Color.green.opacity(0.2))
            .frame(width: 16, height: 16)
            .cornerRadius(4)

        Text("Recommended range")
            .font(.caption)
            .foregroundStyle(.secondary)
    }

    HStack(spacing: 8) {
        Rectangle()
            .fill(Color.blue)
            .frame(width: 16, height: 16)
            .cornerRadius(4)

        Text("Your intake")
            .font(.caption)
            .foregroundStyle(.secondary)
    }
}
```

**Y-Axis Adjustment:**

Instead of starting at 0 (current behavior), use contextual baseline:

```swift
private var chartYDomain: ClosedRange<Int> {
    guard let range = currentCalorieRange else {
        return 0...maxCalories
    }

    // Calculate based on data and range
    let dataMin = weeklyData.map(\.calories).min() ?? 0
    let dataMax = weeklyData.map(\.calories).max() ?? 2000

    // Domain should encompass both data and recommended range
    let domainMin = min(dataMin, range.minimum) - 200
    let domainMax = max(dataMax, range.maximum) + 200

    return domainMin...domainMax
}

// Usage
.chartYScale(domain: chartYDomain)
```

---

## Reminder Logic and Triggers

### New Notification Category: Calorie Tracking

**Requirements:**
1. Notify when significantly below target (e.g., at 6 PM, only 1000 cal consumed)
2. Notify when exceeding recommended maximum (e.g., 2900 cal by 8 PM)
3. Respect quiet hours (use existing `NotificationManager.startHour` and `endHour`)
4. Don't overwhelm with notifications (max 2 per day)

### Notification Types

#### 1. Low Calorie Warning

**Trigger Conditions:**
- Time: 6:00 PM (configurable)
- Condition: Current intake < 70% of minimum recommended range
- Frequency: Maximum once per day
- Priority: Normal (not time-sensitive)

**Content:**
```swift
content.title = "Nutrition Check-In 🍎"
content.body = "You've consumed \(todayCalories) calories today. Your recommended range is \(range.minimum)-\(range.maximum) cal. Consider having a nutritious snack or meal."
content.sound = .default
content.categoryIdentifier = "CALORIE_LOW_REMINDER"
```

**Example:**
> "Nutrition Check-In 🍎"
> "You've consumed 1400 calories today. Your recommended range is 2140-2740 cal. Consider having a nutritious snack or meal."

#### 2. High Calorie Notice

**Trigger Conditions:**
- Condition: Current intake > 110% of maximum recommended range
- Timing: Immediately after logging (real-time check)
- Frequency: Maximum once per day
- Priority: Low (informational, not urgent)

**Content:**
```swift
content.title = "Calorie Awareness 📊"
content.body = "You've reached \(todayCalories) calories today. Your recommended range is \(range.minimum)-\(range.maximum) cal. Listen to your body and focus on nutrient-dense choices."
content.sound = nil // Silent notification
content.categoryIdentifier = "CALORIE_HIGH_NOTICE"
```

**Example:**
> "Calorie Awareness 📊"
> "You've reached 3000 calories today. Your recommended range is 2140-2740 cal. Listen to your body and focus on nutrient-dense choices."

#### 3. Positive Reinforcement (Optional)

**Trigger Conditions:**
- End of day: 8:00 PM
- Condition: Intake is within recommended range (min to max)
- Frequency: 2-3 times per week (not every day)

**Content:**
```swift
content.title = "Great Job Today! ✨"
content.body = "You consumed \(todayCalories) calories, right within your recommended range. Keep up the healthy habits!"
content.sound = .default
content.categoryIdentifier = "CALORIE_SUCCESS"
```

### Implementation in `NotificationManager`

**New Properties:**

```swift
class NotificationManager: ObservableObject {
    // Existing properties...

    // Calorie reminder settings
    @Published var calorieRemindersEnabled: Bool = false {
        didSet {
            UserDefaults.standard.set(calorieRemindersEnabled, forKey: "calorieRemindersEnabled")
        }
    }

    @Published var lowCalorieCheckTime: Date = Date() {
        didSet {
            UserDefaults.standard.set(lowCalorieCheckTime, forKey: "lowCalorieCheckTime")
        }
    }

    private var lastLowCalorieNotificationDate: Date?
    private var lastHighCalorieNotificationDate: Date?
}
```

**New Methods:**

```swift
extension NotificationManager {
    /// Schedule daily check for low calorie intake
    func scheduleLowCalorieCheck(pregnancyManager: PregnancyDataManager, logsManager: LogsManager) {
        guard calorieRemindersEnabled else { return }

        // Cancel existing
        UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: ["calorie_low_check"])

        // Get check time (default 6 PM)
        let calendar = Calendar.current
        var components = calendar.dateComponents([.year, .month, .day], from: Date())
        let checkTimeComponents = calendar.dateComponents([.hour, .minute], from: lowCalorieCheckTime)
        components.hour = checkTimeComponents.hour
        components.minute = checkTimeComponents.minute

        guard let triggerDate = calendar.date(from: components) else { return }
        let timeInterval = triggerDate.timeIntervalSinceNow

        // Only schedule if in future
        guard timeInterval > 0 else {
            // Schedule for tomorrow
            scheduleForTomorrow()
            return
        }

        let content = UNMutableNotificationContent()
        // Content is determined at trigger time based on actual intake
        // Use UNTimeIntervalNotificationTrigger with background fetch

        let trigger = UNTimeIntervalNotificationTrigger(timeInterval: timeInterval, repeats: false)
        let request = UNNotificationRequest(identifier: "calorie_low_check", content: content, trigger: trigger)

        UNUserNotificationCenter.current().add(request) { error in
            if let error = error {
                print("❌ Error scheduling calorie check: \(error)")
            } else {
                print("✅ Scheduled calorie check for \(triggerDate)")
            }
        }
    }

    /// Check calories after each food log and potentially send high calorie notice
    func checkCalorieThreshold(
        currentCalories: Int,
        range: CalorieRange,
        pregnancyManager: PregnancyDataManager
    ) {
        guard calorieRemindersEnabled else { return }

        // Check if already notified today
        if let lastNotification = lastHighCalorieNotificationDate,
           Calendar.current.isDateInToday(lastNotification) {
            return // Already notified today
        }

        // Check if over threshold
        let threshold = Int(Double(range.maximum) * 1.1)
        guard currentCalories > threshold else { return }

        // Send notification
        let content = UNMutableNotificationContent()
        content.title = "Calorie Awareness 📊"
        content.body = "You've reached \(currentCalories) calories today. Your recommended range is \(range.minimum)-\(range.maximum) cal. Listen to your body and focus on nutrient-dense choices."
        content.categoryIdentifier = "CALORIE_HIGH_NOTICE"
        content.sound = nil

        let request = UNNotificationRequest(
            identifier: "calorie_high_\(Date().timeIntervalSince1970)",
            content: content,
            trigger: nil // Immediate
        )

        UNUserNotificationCenter.current().add(request) { error in
            if error == nil {
                self.lastHighCalorieNotificationDate = Date()
            }
        }
    }
}
```

**Integration Hook in `LogsManager`:**

```swift
// In LogsManager.logFood()
func logFood(notes: String? = nil, source: LogSource = .manual, foodName: String? = nil, calories: Int? = nil, protein: Int? = nil, carbs: Int? = nil, fat: Int? = nil) {
    let entry = LogEntry(...)
    addLog(entry)

    // Existing notification logic...

    // NEW: Check calorie threshold
    if let calories = calories {
        let todayCalories = getCalories(for: Date())

        // Check if notification is needed
        if let pregnancyManager = // access from environment
           let range = pregnancyManager.currentCalorieRange() {
            notificationManager.checkCalorieThreshold(
                currentCalories: todayCalories,
                range: range,
                pregnancyManager: pregnancyManager
            )
        }
    }
}
```

**Background Fetch for Low Calorie Check:**

Since iOS doesn't support dynamic notification content well, we'll use a different approach:
1. Schedule notification for 6 PM daily
2. Use app extension or background fetch to determine actual calories at that time
3. If intake is adequate, cancel the notification
4. If intake is low, let notification fire

**Alternative (Simpler) Approach:**
- Check calories when app becomes active in evening
- If low, immediately send notification
- This avoids background processing complexity

---

## Integration Architecture

### Component Dependencies

```
DailyCalorieTrackerCard
    ├── LogsManager (read total daily calories)
    ├── PhotoFoodLogManager (read photo-based calories)
    ├── PregnancyDataManager (get current week/trimester)
    └── NotificationManager (trigger reminders)

WeeklyCalorieTrackerCard (enhanced)
    ├── LogsManager (read weekly calories)
    ├── PhotoFoodLogManager (read photo-based calories)
    └── PregnancyDataManager (get range for each day)

PregnancyDataManager (new method)
    └── currentCalorieRange() -> CalorieRange?

NotificationManager (new methods)
    ├── scheduleLowCalorieCheck()
    ├── checkCalorieThreshold()
    └── calorieRemindersEnabled: Bool

LogsManager (hook)
    └── After logFood(), check calorie threshold
```

### Data Flow

**Daily View Update:**
```
User opens app
    ↓
DailyCalorieTrackerCard.onAppear()
    ↓
LogsManager.getCalories(for: today)
    ↓
PregnancyDataManager.currentCalorieRange()
    ↓
Calculate position in range
    ↓
Update UI with color coding
```

**Notification Trigger:**
```
User logs food
    ↓
LogsManager.logFood()
    ↓
Calculate today's total
    ↓
PregnancyDataManager.currentCalorieRange()
    ↓
NotificationManager.checkCalorieThreshold()
    ↓
If over threshold AND not already notified today
    ↓
Send notification
```

### Settings UI Integration

**Location:** `MoreView` > Settings

**New Section:**
```swift
Section("Calorie Reminders") {
    Toggle("Enable Calorie Reminders", isOn: $notificationManager.calorieRemindersEnabled)

    if notificationManager.calorieRemindersEnabled {
        DatePicker(
            "Evening Check Time",
            selection: $notificationManager.lowCalorieCheckTime,
            displayedComponents: .hourAndMinute
        )

        Text("We'll remind you if your intake is lower than recommended.")
            .font(.caption)
            .foregroundStyle(.secondary)
    }
}
```

---

## Implementation Plan

### Phase 1: Foundation (2-3 hours)

**File Changes:**
1. **PregnancyDataManager.swift**
   - Add `CalorieRange` struct
   - Add `currentCalorieRange(baselineCalories:)` method
   - Add `getCalorieRange(for date:)` for historical dates

2. **NotificationManager.swift**
   - Add `calorieRemindersEnabled` property
   - Add `lowCalorieCheckTime` property
   - Add notification category setup for calorie reminders

**Testing:**
- Unit test `currentCalorieRange()` with various weeks
- Verify trimester transitions (week 13→14, 27→28)
- Test edge cases (no pregnancy data set)

### Phase 2: Daily Tracking UI (2-3 hours)

**New File:** `DailyCalorieTrackerCard.swift`

**Features:**
- Progress bar with three zones
- Meal breakdown grid
- Current/target display
- Context panel with trimester info

**UI Components:**
```swift
struct DailyCalorieTrackerCard: View {
    @EnvironmentObject var logsManager: LogsManager
    @EnvironmentObject var pregnancyManager: PregnancyDataManager
    @StateObject private var photoLogManager = PhotoFoodLogManager()

    var body: some View {
        VStack(spacing: 16) {
            headerSection
            progressBarSection
            breakdownSection
            contextSection
        }
        .padding(20)
        .background(liquidGlassBackground)
    }
}
```

**Integration:**
- Add to `DashboardView.swift` below existing cards
- Make it collapsible/expandable
- Link to detailed view on tap

### Phase 3: Weekly Chart Enhancement (1-2 hours)

**File:** `WeeklyCalorieTrackerCard.swift`

**Changes:**
- Add range band visualization using `AreaMark`
- Update Y-axis domain calculation
- Add legend explaining range
- Update color coding logic to use trimester-specific ranges

**Before/After:**
```swift
// BEFORE
private var dailyGoal = 2000

// AFTER
private var currentRange: CalorieRange? {
    pregnancyManager.currentCalorieRange()
}

private func getRange(for date: Date) -> CalorieRange {
    pregnancyManager.getCalorieRange(for: date)
}
```

### Phase 4: Notification Logic (1-2 hours)

**File:** `NotificationManager.swift`

**Implement:**
- `scheduleLowCalorieCheck()` method
- `checkCalorieThreshold()` method
- Notification category setup
- Settings toggle integration

**File:** `LogsManager.swift`

**Hook:**
- Add threshold check after `logFood()`
- Pass total calories to NotificationManager
- Respect user settings

### Phase 5: Testing & Polish (1 hour)

**Manual Testing:**
- Test across all trimesters
- Verify notifications fire correctly
- Check UI on different screen sizes
- Test dark mode
- Verify accessibility (VoiceOver)

**Edge Cases:**
- No pregnancy data set (show defaults)
- First day of use (no historical data)
- Week transition during viewing
- Trimester transition during week view

**UI Polish:**
- Animations for progress bar
- Haptic feedback on threshold
- Loading states
- Error states (no data)

---

## Testing Strategy

### Unit Tests

**File:** `PregnancyDataManagerTests.swift`

```swift
func testCalorieRangeFirstTrimester() {
    let manager = PregnancyDataManager()
    manager.savePregnancyData(PregnancyData(lmpDate: Date().addingTimeInterval(-5 * 7 * 86400), entryMethod: .lmp))

    let range = manager.currentCalorieRange()
    XCTAssertNotNil(range)
    XCTAssertEqual(range?.trimester, 1)
    XCTAssertEqual(range?.minimum, 1800)
    XCTAssertEqual(range?.maximum, 2400)
}

func testCalorieRangeSecondTrimester() {
    let manager = PregnancyDataManager()
    manager.savePregnancyData(PregnancyData(lmpDate: Date().addingTimeInterval(-18 * 7 * 86400), entryMethod: .lmp))

    let range = manager.currentCalorieRange()
    XCTAssertEqual(range?.trimester, 2)
    XCTAssertEqual(range?.minimum, 2140)
    XCTAssertEqual(range?.maximum, 2740)
}

func testCalorieRangeTrimesterTransition() {
    // Test week 13 → 14 transition
}
```

### Integration Tests

**Scenario 1: Low Calorie Notification**
1. Set pregnancy data to week 20
2. Log 1000 calories by 6 PM
3. Verify notification is scheduled
4. Verify notification content is correct

**Scenario 2: High Calorie Notice**
1. Set pregnancy data to week 25
2. Log 3000 calories
3. Verify notice is sent immediately
4. Verify second notice is NOT sent same day

**Scenario 3: Range Visualization**
1. Set pregnancy data to week 14 (start of T2)
2. View weekly chart spanning week 13-19
3. Verify range band changes color/height at week 14

### UI Tests

**Accessibility:**
- VoiceOver reads calorie counts correctly
- Progress bar has accessible label
- Range information is accessible

**Visual Regression:**
- Screenshot test for each trimester
- Screenshot test for "no data" state
- Screenshot test for dark mode

---

## Accessibility Considerations

### VoiceOver Support

**DailyCalorieTrackerCard:**
```swift
VStack { ... }
    .accessibilityElement(children: .contain)
    .accessibilityLabel("Daily calorie tracker")
    .accessibilityHint("Shows your calorie intake for today and recommended range")

// Progress bar
ProgressView(value: Double(currentCalories), total: Double(range.maximum))
    .accessibilityLabel("Calorie progress")
    .accessibilityValue("\(currentCalories) of \(range.maximum) calories consumed")
```

**WeeklyCalorieTrackerCard:**
```swift
Chart { ... }
    .accessibilityChartDescriptor(createCalorieChartDescriptor())

func createCalorieChartDescriptor() -> AXChartDescriptor {
    let xAxis = AXCategoricalDataAxisDescriptor(
        title: "Day of Week",
        categoryOrder: weeklyData.map { formatDate($0.date) }
    )

    let yAxis = AXNumericDataAxisDescriptor(
        title: "Calories",
        range: Double(chartYDomain.lowerBound)...Double(chartYDomain.upperBound),
        gridlinePositions: []
    ) { value in "\(Int(value)) calories" }

    let series = AXDataSeriesDescriptor(
        name: "Daily Intake",
        isContinuous: false,
        dataPoints: weeklyData.map { data in
            AXDataPoint(
                x: formatDate(data.date),
                y: Double(data.calories),
                label: "\(formatDate(data.date)): \(data.calories) calories"
            )
        }
    )

    return AXChartDescriptor(
        title: "Weekly Calorie Trend",
        summary: "Your calorie intake over the last 7 days",
        xAxis: xAxis,
        yAxis: yAxis,
        series: [series]
    )
}
```

### Dynamic Type

```swift
// Use scalable fonts
Text("\(calories)")
    .font(.title2) // Automatically scales with user preference

// Set minimum scale factor for constrained spaces
Text("Recommended: \(range.minimum)-\(range.maximum)")
    .font(.caption)
    .minimumScaleFactor(0.8)
```

### Color Contrast

**Ensure WCAG 2.1 Level AA compliance:**
- Text on glass backgrounds: minimum 4.5:1 contrast
- Use `.primary`, `.secondary` semantic colors
- Test in high contrast mode

```swift
@Environment(\.accessibilityDifferentiateWithoutColor) var differentiateWithoutColor

// If user has color differentiation enabled, use patterns + color
if differentiateWithoutColor {
    // Add icon indicators, not just color
    HStack {
        Image(systemName: statusIcon)
        Text(statusText)
    }
} else {
    Text(statusText)
        .foregroundColor(statusColor)
}
```

### Reduce Motion

```swift
@Environment(\.accessibilityReduceMotion) var reduceMotion

// Conditional animations
withAnimation(reduceMotion ? nil : .spring(response: 0.5)) {
    // Update UI
}
```

---

## Success Metrics

### Quantitative
- 80%+ of users with pregnancy data enabled see correct ranges
- Notifications fire with <5% error rate
- UI renders in <200ms on iPhone 12+
- Zero crashes related to calorie tracking

### Qualitative
- Users understand their trimester-specific needs
- Notifications feel helpful, not intrusive
- UI is visually clear and calming
- Range visualization reduces anxiety

---

## Future Enhancements (Out of Scope)

1. **User-Customizable Baseline**
   - Let users set their own pre-pregnancy caloric baseline
   - Account for activity level (sedentary/moderate/active)

2. **Weekly Summary Notification**
   - Sunday evening: "This week you averaged X calories, right in your range!"

3. **Nutrition Quality Score**
   - Beyond calories, track nutrient density
   - Warn if calories are high but from low-quality sources

4. **Apple Health Integration**
   - Write calorie data to HealthKit
   - Read activity data to adjust recommendations

5. **Multiple Pregnancy Support**
   - Twins/triplets have different caloric needs (+300 cal for twins)

6. **Export to Provider**
   - PDF summary of calorie trends for OB appointments

---

## Appendix: Code Snippets

### CalorieRange Extension

```swift
extension PregnancyDataManager {
    func currentCalorieRange(baselineCalories: Int = 2100) -> CalorieRange? {
        guard let week = pregnancyData?.currentWeek,
              let trimester = pregnancyData?.currentTrimester else {
            return nil
        }

        let additionalCalories: Int
        switch trimester {
        case 1: additionalCalories = 0
        case 2: additionalCalories = 340
        case 3: additionalCalories = 450
        default: additionalCalories = 0
        }

        let minCalories = 1800 + additionalCalories
        let maxCalories = 2400 + additionalCalories
        let midCalories = baselineCalories + additionalCalories

        return CalorieRange(
            minimum: minCalories,
            maximum: maxCalories,
            midpoint: midCalories,
            trimester: trimester,
            week: week
        )
    }

    func getCalorieRange(for date: Date, baselineCalories: Int = 2100) -> CalorieRange {
        guard let lmpDate = pregnancyData?.lmpDate else {
            // Default to first trimester range if no pregnancy data
            return CalorieRange(minimum: 1800, maximum: 2400, midpoint: 2100, trimester: 1, week: 0)
        }

        let daysSinceLMP = Calendar.current.dateComponents([.day], from: lmpDate, to: date).day ?? 0
        let week = daysSinceLMP / 7
        let trimester = week <= 13 ? 1 : (week <= 27 ? 2 : 3)

        let additionalCal: Int
        switch trimester {
        case 1: additionalCal = 0
        case 2: additionalCal = 340
        case 3: additionalCal = 450
        default: additionalCal = 0
        }

        return CalorieRange(
            minimum: 1800 + additionalCal,
            maximum: 2400 + additionalCal,
            midpoint: baselineCalories + additionalCal,
            trimester: trimester,
            week: week
        )
    }
}

struct CalorieRange: Equatable {
    let minimum: Int
    let maximum: Int
    let midpoint: Int
    let trimester: Int
    let week: Int

    var description: String {
        "\(minimum)-\(maximum) cal/day (Trimester \(trimester))"
    }

    func status(for calories: Int) -> CalorieStatus {
        if calories == 0 {
            return .noData
        } else if calories < minimum - 200 {
            return .wellBelow
        } else if calories < minimum {
            return .slightlyBelow
        } else if calories <= maximum {
            return .optimal
        } else if calories <= maximum + 200 {
            return .slightlyAbove
        } else {
            return .wellAbove
        }
    }
}

enum CalorieStatus {
    case noData
    case wellBelow
    case slightlyBelow
    case optimal
    case slightlyAbove
    case wellAbove

    var color: Color {
        switch self {
        case .noData: return .gray.opacity(0.5)
        case .wellBelow: return Color(hex: "#FFB347")
        case .slightlyBelow: return Color(hex: "#FFD700")
        case .optimal: return Color(hex: "#7FE0C0")
        case .slightlyAbove: return Color(hex: "#FFCC99")
        case .wellAbove: return Color(hex: "#FF9999")
        }
    }

    var icon: String {
        switch self {
        case .noData: return "questionmark.circle"
        case .wellBelow: return "arrow.down.circle.fill"
        case .slightlyBelow: return "arrow.down.circle"
        case .optimal: return "checkmark.circle.fill"
        case .slightlyAbove: return "arrow.up.circle"
        case .wellAbove: return "arrow.up.circle.fill"
        }
    }

    var message: String {
        switch self {
        case .noData: return "No data yet today"
        case .wellBelow: return "Below recommended range"
        case .slightlyBelow: return "Slightly below range"
        case .optimal: return "Within recommended range"
        case .slightlyAbove: return "Slightly above range"
        case .wellAbove: return "Above recommended range"
        }
    }
}
```

---

## Document Metadata

**Created:** November 2, 2025
**Author:** Claude Code Documentation Agent
**Version:** 1.0
**Status:** Ready for Implementation
**Estimated Effort:** 6-8 hours
**Dependencies:** PregnancyDataManager, NotificationManager, LogsManager
**Related Files:**
- `/HydrationReminder/WeeklyCalorieTrackerCard.swift`
- `/HydrationReminder/PregnancyDataManager.swift`
- `/HydrationReminder/NotificationManager.swift`
- `/HydrationReminder/LogsManager.swift`
- `/HydrationReminder/DashboardView.swift`

**References:**
- [ios26-charts-research-2025.md](../ios26-charts-research-2025.md)
- [Academy of Nutrition and Dietetics - Pregnancy Nutrition](https://www.eatright.org/health/pregnancy/prenatal-nutrition/healthy-weight-during-pregnancy)
- [NIH - Energy Intake Requirements](https://pmc.ncbi.nlm.nih.gov/articles/PMC6723706/)
