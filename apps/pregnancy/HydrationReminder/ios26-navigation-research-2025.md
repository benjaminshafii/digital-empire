# iOS 26 Navigation Best Practices & Information Architecture Research
## Comprehensive Guide for Health/Pregnancy Tracking Apps

**Research Date:** October 2025
**Target Platform:** iOS 26 with Liquid Glass Design Language
**Focus Area:** Pregnancy Tracking & Health Apps

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [iOS 26 Navigation Patterns](#ios-26-navigation-patterns)
3. [Liquid Glass Design Language](#liquid-glass-design-language)
4. [Best-in-Class Health App Design](#best-in-class-health-app-design)
5. [Information Architecture Principles](#information-architecture-principles)
6. [Pregnancy App Specific Patterns](#pregnancy-app-specific-patterns)
7. [Quick Action Patterns](#quick-action-patterns)
8. [Code Examples & Implementation](#code-examples--implementation)
9. [Navigation Structure Recommendations](#navigation-structure-recommendations)

---

## Executive Summary

### Key Findings

iOS 26 introduces **Liquid Glass**, Apple's most significant design evolution since iOS 7. This translucent, fluid material fundamentally changes how navigation and information architecture should be approached in health apps. The research reveals:

1. **Tab bars are now dynamic** - They shrink when scrolling to maximize content focus
2. **Navigation prioritizes content** - Toolbars and chrome are minimized until needed
3. **Quick actions are essential** - Users expect one-tap logging without navigation
4. **Progressive disclosure is critical** - Health data must be glanceable yet explorable
5. **Accessibility drives design** - Liquid Glass automatically falls back to solid when "Reduce Transparency" is enabled

### Critical Statistics

- **87 million** people use health/fitness apps globally
- **38x increase** in telehealth usage since pandemic
- **30% abandonment rate** for apps with poor usability
- **80+ million downloads** for leading pregnancy apps (Pregnancy+)
- **350+ million users** for period/pregnancy tracking (Flo)

---

## iOS 26 Navigation Patterns

### 1. Tab Bar Best Practices

#### The New Liquid Glass Tab Bar

**Key Characteristics:**
- **Dynamic sizing**: Shrinks when scrolling down, expands when scrolling up or tapping
- **Translucent material**: Refracts content beneath it with blur and lensing effects
- **Adaptive behavior**: Automatically switches between tab bar and sidebar on iPad

**Recommendations from Apple HIG:**
- **3-5 tabs maximum** (iOS standard)
- **Clear, recognizable icons** using SF Symbols
- **Concise labels** (1-2 words maximum)
- **Maintain consistent order** across app sessions

**iOS 26 Specific Enhancements:**
```
TabView Design Principles:
- Use .tabViewStyle(.sidebarAdaptable) for iPad compatibility
- Enable tab customization for power users
- Provide search tab for quick content access
- Support drag-and-drop on tabs for workflow integration
```

#### When to Use Tab Bars vs. Other Navigation

**Use Tab Bars When:**
- You have 3-5 distinct, equally important sections
- Users need to switch contexts frequently
- Each section has independent content hierarchy
- All sections are relevant to most users

**Use Navigation Stack When:**
- Content has deep hierarchical relationships
- Forward/backward flow is primary pattern
- Single primary workflow dominates

**Use Sidebar When:**
- You have 6+ sections or complex categories
- iPad is primary target
- Power users need customization
- Content categories are hierarchical

### 2. Toolbar Transformation

iOS 26 replaces traditional "Navigation Bars" with context-aware "Toolbars":

**Key Changes:**
- **Icon-first approach**: Back, Close, Save now use contained icon buttons instead of text
- **Left-aligned titles**: Optional left alignment with subtitle support
- **Dynamic behavior**: Toolbars morph and minimize based on scroll state
- **Liquid Glass material**: Creates visual hierarchy through transparency

**Example from WWDC 2025:**
```
Toolbar Actions:
- Primary: Icon + optional label in Liquid Glass container
- Secondary: Grouped in trailing position
- Context menu: Long-press reveals additional options
- Search: Bottom-aligned for thumb accessibility
```

### 3. Modern Navigation Patterns

Based on Frank Rausch's iOS Navigation Patterns guide:

#### **Drill-Down Pattern**
- Horizontal movement metaphor (right = deeper, left = back)
- Swipe from left edge to go back
- Title shows current screen, back button shows parent
- **Best for:** Settings, catalog browsing, hierarchical data

#### **Pyramid Pattern**
- Central hub with spoke screens
- No direct navigation between spokes
- Always return to hub before switching contexts
- **Best for:** Dashboard with related tools/features

#### **Modal Pattern**
- Vertical movement metaphor (up = present, down = dismiss)
- Focused task completion
- "Cancel" and "Done" actions
- **Best for:** Creating/editing content, focused workflows

#### **Flat Pattern (Tab-based)**
- Peer-to-peer navigation
- No parent-child relationships
- Each tab maintains its own navigation stack
- **Best for:** Distinct feature areas of equal importance

---

## Liquid Glass Design Language

### What is Liquid Glass?

Liquid Glass is Apple's new universal design material that:
- **Refracts** content underneath it
- **Reflects** ambient light around it
- **Lenses** along edges with gorgeous optical effects
- **Transforms** dynamically based on content and context
- **Unifies** design across iOS, iPadOS, macOS, watchOS, tvOS

### Core Principles

#### 1. **Lensing & Refraction**
```
Visual Effect: Content beneath glass bends and concentrates light
Purpose: Communicate layering and separation
Implementation: Automatic with .glassEffect() modifier
```

#### 2. **Fluid Motion & Interaction**
```
Behavior: Gel-like flexibility during transitions
Feel: Responsive, satisfying, alive
Example: Tab bar shrinking/expanding feels organic
```

#### 3. **Dynamic Adaptivity**
```
Smart Behavior: Adjusts blur/tint based on background
Ensures: Legibility maintained across all contexts
Fallback: Solid theme when "Reduce Transparency" enabled
```

#### 4. **Unified Language**
```
Benefit: Seamless experience across Apple ecosystem
Caveat: Each platform retains unique characteristics
```

### Implementation in SwiftUI

**Basic Glass Effect:**
```swift
import SwiftUI

struct GlassCard: View {
    var body: some View {
        VStack {
            Text("Liquid Glass Card")
                .font(.title)
        }
        .padding(30)
        .frame(maxWidth: .infinity)
        .glassEffect()
    }
}
```

**Customizable Glass:**
```swift
.glassEffect(
    blur: 24,
    saturation: 1.2,
    brightness: 1.1
)
```

**Tab View with Liquid Glass:**
```swift
TabView {
    Tab("Home", systemImage: "house.fill") {
        HomeView()
    }
    Tab("Track", systemImage: "chart.line.uptrend.xyaxis") {
        TrackingView()
    }
    Tab("Insights", systemImage: "brain.head.profile") {
        InsightsView()
    }
}
.tabViewStyle(.sidebarAdaptable)
```

### Widget Integration

Liquid Glass transforms widgets and lock screen elements:

**Lock Screen Widgets:**
- Small transparency for ambient information
- Clock and widgets use Glass/Solid toggle
- Notifications show translucent backgrounds

**Home Screen Widgets:**
- Adapt to wallpaper automatically
- Multiple transparency levels
- Smart color adjustment for legibility

**Interactive Widgets (iOS 26):**
```swift
struct QuickLogWidget: Widget {
    var body: some WidgetConfiguration {
        AppIntentConfiguration(
            kind: "QuickLog",
            intent: LogWaterIntent.self,
            provider: Provider()
        ) { entry in
            QuickLogView(entry: entry)
                .containerBackground(.fill.tertiary, for: .widget)
                .glassEffect()
        }
    }
}
```

---

## Best-in-Class Health App Design

### Apple Health (iOS Native)

**Navigation Structure:**
```
Bottom Tabs (4):
├── Summary (Default view)
│   ├── Favorites (Pinned metrics)
│   ├── Highlights (AI-driven insights)
│   └── Trends (Weekly/Monthly patterns)
├── Browse
│   ├── Activity
│   ├── Body Measurements
│   ├── Cycle Tracking
│   ├── Heart
│   ├── Nutrition
│   └── Sleep
├── Sharing
│   └── Connected apps and people
└── Account
    └── Settings and preferences
```

**Key Design Patterns:**
- **Favorites-first**: Most used metrics pinned to top
- **Card-based UI**: Each metric is a tappable card
- **Progressive detail**: Tap card → detailed view → historical data
- **Color-coded categories**: Consistent color system
- **Graph-first visualization**: Always show trend before numbers

### Flo (Period & Pregnancy Tracking)

**Navigation Structure:**
```
Bottom Tabs (5):
├── Today (Primary view)
│   ├── Current cycle day / Pregnancy week
│   ├── Daily insights
│   ├── Quick symptom logging
│   └── Educational content
├── Calendar
│   ├── Monthly view
│   ├── Past cycle history
│   └── Future predictions
├── Insights
│   ├── Health reports
│   ├── Pattern analysis
│   └── AI predictions
├── Secret Chats
│   └── Community forums
└── Profile
    └── Settings and data
```

**Key Design Patterns:**
- **Mode switching**: Seamless toggle between period/pregnancy/menopause modes
- **Empathetic design**: Soft colors, supportive language
- **Data-driven personalization**: Insights based on logged patterns
- **Quick logging**: Symptoms accessible without deep navigation
- **AI integration**: Chatbot for instant health questions

**User Experience Excellence:**
- 95% of users felt more educated about pregnancy
- 93% felt more prepared to become a parent
- First-time mom quote: "I've gained so much knowledge about my body through this app"

### Pregnancy+ (Leading Pregnancy App)

**Navigation Structure:**
```
Tab-based with Sections:
├── My Pregnancy
│   ├── Week-by-week guide
│   ├── 3D baby models (Interactive!)
│   ├── Size comparison (fruits/animals)
│   └── Timeline milestones
├── Tools
│   ├── Kick counter
│   ├── Contraction timer
│   ├── Weight log
│   └── Due date calculator
├── Plan
│   ├── Hospital bag checklist
│   ├── Birth plan builder
│   ├── To-do list
│   └── Shopping list
├── Learn
│   ├── Daily articles
│   ├── Guides (breastfeeding, exercise, food)
│   ├── 2D/3D scan examples
│   └── Blog posts
└── Community
    └── Forums and support
```

**Key Design Patterns:**
- **3D interactivity**: Unique selling point - rotatable baby models
- **Visual comparisons**: Baby size = "avocado" or "guinea pig"
- **Checklist-driven**: Helps organize overwhelming information
- **Educational depth**: Over 80 million downloads driven by content quality
- **Offline-first**: All content available without connection

### MyFitnessPal (Nutrition Tracking)

**Information Architecture Lessons:**
- **Quick-add dominates**: 80% of interactions are food logging
- **Barcode scanner**: Positioned for immediate access
- **Dashboard simplicity**: Calories remaining (large), macros below
- **Progressive depth**: Tap number → see breakdown → adjust portions
- **Social proof**: Friends' activity visible but not intrusive

**Navigation Efficiency:**
```
Home Screen Widget → Barcode scan = 1 tap
Home Screen Widget → Manual add = 2 taps
App icon → Dashboard = 1 tap
App icon → Log food = 2 taps
```

---

## Information Architecture Principles

### 1. Content-First Hierarchy

**The Inverted Pyramid Model:**
```
Level 1: Critical Information (Glanceable)
├── Current state (e.g., "Week 24 of pregnancy")
├── Today's goal progress
└── Urgent notifications

Level 2: Daily Actions (One tap away)
├── Quick logging (water, symptoms, food)
├── Today's insights
└── Check-in widgets

Level 3: Detailed Information (Two taps away)
├── Historical trends
├── Educational content
└── Settings and customization

Level 4: Advanced Features (Three+ taps)
├── Reports and exports
├── Community features
└── Specialized tools
```

### 2. Progressive Disclosure Patterns

Based on interaction-design.org research:

**Definition:** Defer advanced features to secondary UI while keeping essentials in primary view.

**Implementation Strategies:**

#### **Accordion Pattern**
```
Example: Symptom logging
├── [Tap] Nausea (Shows frequency options)
├── [Tap] Fatigue (Shows severity scale)
└── [Tap] Other (Reveals text input)
```

#### **Modal Windows**
```
Use for: Focused tasks that need completion
Example: "Log meal" → Modal with:
- Food selection
- Portion size
- Time consumed
- [Cancel] [Save] buttons
```

#### **Inline Expansion**
```
Dashboard Widget:
Water: 4/8 glasses ▼
[Tap ▼] Reveals:
- Times logged (8:00 AM, 10:30 AM, 1:00 PM, 3:30 PM)
- Quick add buttons (+1, +2)
- Edit history link
```

#### **Tabs Within Sections**
```
PUQE Score Screen:
├── Today [Tab]
├── This Week [Tab]
└── Trends [Tab]
```

### 3. Dashboard vs. Dedicated Section Trade-offs

| Aspect | Dashboard Approach | Dedicated Section Approach |
|--------|-------------------|---------------------------|
| **Best For** | Overview, status at-a-glance | Deep feature exploration |
| **User Goal** | Check progress, quick log | Analyze trends, learn |
| **Cognitive Load** | Low (scanning) | Medium-High (reading) |
| **Navigation Depth** | 0-1 taps | 1-2 taps from tab |
| **Content Density** | Low (summarized) | High (detailed) |
| **Update Frequency** | Real-time/Daily | Weekly/Monthly |

**Hybrid Recommendation for Pregnancy Apps:**
```
Dashboard (Today Tab):
├── Week + Baby size
├── Today's tip
├── Quick symptoms logger
└── Upcoming appointment

Dedicated Sections:
├── Track (Symptoms, weight, kick counter)
├── Learn (Weekly guide, articles, videos)
├── Tools (Contraction timer, hospital bag)
└── Profile (Data, settings, sharing)
```

### 4. Feature Categorization Strategies

#### **The Jobs-to-be-Done Framework**

Instead of organizing by feature type, organize by user goals:

**Traditional (Bad):**
```
├── Data Entry
├── Reports
├── Tools
└── Settings
```

**Goal-Oriented (Good):**
```
├── How am I doing? (Dashboard, trends)
├── Log my day (Quick actions, symptoms)
├── Learn & prepare (Education, checklists)
└── Get support (Community, chat, ask expert)
```

#### **The Frequency-Based Model**

Used by Apple Health and Flo:

**High Frequency (Daily):**
- Place in primary tab
- Provide widget access
- Enable quick actions

**Medium Frequency (Weekly):**
- Place in secondary tabs
- Show in dashboard as summary
- Deep-link from notifications

**Low Frequency (Monthly/Rare):**
- Nest under "More" or settings
- Show only when contextually relevant
- Allow search to discover

---

## Pregnancy App Specific Patterns

### 1. PUQE Score & Nausea Tracking

**What is PUQE?**
Pregnancy-Unique Quantification of Emesis - scientifically validated nausea severity score.

**Current Implementation Example (MySafeStart App):**
- Daily nausea symptom tracking
- Automatic PUQE score calculation
- Intensity classification (mild/moderate/severe)
- Tailored advice based on score

**Where Should PUQE Live in Your App?**

**Option A: Dedicated Symptom Tracker (Recommended)**
```
Navigation: Today Tab → Quick Symptoms → Nausea
Or: Track Tab → Nausea (with PUQE automatic calculation)

Pros:
- Grouped with other symptoms
- Historical trend visible
- Doesn't clutter main screen

Cons:
- Requires 2 taps minimum
```

**Option B: Dashboard Widget**
```
Navigation: Today Tab → PUQE Quick Log (widget)

Pros:
- Immediate visibility
- One-tap logging
- Daily reminder built-in

Cons:
- Takes dashboard real estate
- May not be relevant all 9 months
```

**Option C: Smart Contextual Placement**
```
Logic:
IF first trimester OR user has logged nausea in past 3 days
  THEN show PUQE quick logger on dashboard
ELSE hide widget, keep in Track tab

Pros:
- Adaptive to user needs
- Minimal clutter
- Intelligent UX

Cons:
- More complex to implement
```

**Recommended Quick Log Pattern:**
```
Widget Shows: "How's your nausea today?"
User Taps: Three emoji buttons (😊 None, 😐 Mild, 😫 Severe)
Then Shows: Quick questions (vomiting frequency, retching)
Auto-Calculates: PUQE score
Displays: "Your score: 8 (Moderate) - Here's what helps..."
```

### 2. Organizing Pregnancy App Features

**The Four Pillar Model:**

#### **Pillar 1: Tracking**
```
Purpose: Log physiological data
Frequency: Daily/Multiple times daily
Location: Primary tab or quick actions

Features:
├── Symptoms (nausea, fatigue, mood, pain)
├── Weight
├── Nutrition (meals, supplements)
├── Hydration
├── Fetal movement (kick counter)
└── Contractions (third trimester)
```

#### **Pillar 2: Insights**
```
Purpose: Understand patterns and trends
Frequency: Weekly
Location: Dedicated tab

Features:
├── PUQE score trends
├── Weight gain graph
├── Symptom patterns
├── Nutrition analysis
└── Comparison to healthy ranges
```

#### **Pillar 3: Education**
```
Purpose: Learn and prepare
Frequency: Daily browsing, not logging
Location: Dedicated tab

Features:
├── Week-by-week guide
├── Baby development (3D models)
├── Article library
├── Video content
├── Checklist tools (hospital bag, birth plan)
└── Baby name browser
```

#### **Pillar 4: Settings & Profile**
```
Purpose: Personalization and data management
Frequency: Rarely
Location: Final tab

Features:
├── Due date and personal info
├── Notification preferences
├── Data export
├── Connected apps (Apple Health)
├── Account settings
└── Support/Feedback
```

### 3. Week-by-Week Navigation Pattern

**Challenge:** 40+ weeks of content, but users only care about current week.

**Solution Pattern (Used by Pregnancy+):**

**Default View: Current Week**
```
Screen shows:
├── Week 24
├── Baby size: "Corn" with image
├── Baby development this week (expandable cards)
├── What's happening to you (expandable cards)
└── Week 24 checklist

Navigation:
[< Prev Week] [Week Dropdown] [Next Week >]
                    ↓
            Scrollable picker showing:
            Week 1-40 with milestone markers
```

**Progressive Detail Pattern:**
```
Level 1: Week Overview (default view)
    ↓ [Tap card]
Level 2: Detailed Article (full content)
    ↓ [Tap "Related"]
Level 3: Deep Dive (research, videos, community)
```

### 4. Community & Support Integration

**Challenge:** Balance privacy with social features.

**Flo's Solution: "Secret Chats"**
- Anonymous discussion forums
- Topic-based (not timeline-based)
- Moderated for safety
- Separate from personal data

**Recommendation:**
```
Do: Dedicated tab for community
Don't: Mix social feed with health data
Do: Allow anonymous participation
Don't: Auto-share personal health info
Do: Provide moderation and reporting
Don't: Create pressure to share
```

---

## Quick Action Patterns

### 1. The Importance of Quick Actions

**Research Finding:** Users abandon health apps when logging requires too many steps.

**Golden Rule:** Primary actions must be achievable in ≤3 taps from any state.

### 2. Widget-Based Quick Actions

**iOS Home Screen Widgets (iOS 26):**

**Small Widget (2x2):**
```
Design: Single quick action
Example: "Log Water" button
Tap: Opens app to log screen OR logs directly
```

**Medium Widget (4x2):**
```
Design: Multiple quick actions
Example:
├── Log Water (+1)
├── Log Meal (camera icon)
├── Log Symptom (emoji picker)
└── Current streak: 7 days
```

**Large Widget (4x4):**
```
Design: Dashboard + actions
Example:
├── Today's summary (water, meals, symptoms)
├── Quick action buttons
└── Next appointment reminder
```

**Lock Screen Widgets (iOS 26):**
```
Circular widgets below clock:
├── Water count (tap to increment)
├── Symptom logger (tap for menu)
└── Kick counter (tap to start)
```

### 3. Interactive Widgets (iOS 26 Feature)

**App Intents for Direct Action:**
```swift
import AppIntents

struct LogWaterIntent: AppIntent {
    static var title: LocalizedStringResource = "Log Water"

    func perform() async throws -> some IntentResult {
        // Log water directly from widget
        await HealthManager.shared.logWater(amount: 250)
        return .result()
    }
}

struct QuickLogWidget: Widget {
    var body: some WidgetConfiguration {
        AppIntentConfiguration(
            kind: "QuickLog",
            intent: LogWaterIntent.self,
            provider: Provider()
        ) { entry in
            Button(intent: LogWaterIntent()) {
                Label("Water", systemImage: "drop.fill")
            }
            .buttonStyle(.borderedProminent)
            .glassEffect()
        }
    }
}
```

### 4. Action Button Integration (iPhone 15 Pro+)

**Physical Button for Ultimate Speed:**
```swift
// Configure Action Button for quick symptom log
func setupActionButton() {
    // In app settings, allow users to choose:
    // - Log Water
    // - Start Kick Counter
    // - Log Nausea (PUQE quick entry)
    // - Open Camera for meal logging
}
```

### 5. Siri Shortcuts for Voice Logging

**Pregnancy-Specific Shortcuts:**
```
"Hey Siri, log nausea"
"Hey Siri, I drank water"
"Hey Siri, start kick counter"
"Hey Siri, how many weeks am I?"
```

**Implementation:**
```swift
import Intents

class LogSymptomIntentHandler: NSObject, LogSymptomIntentHandling {
    func handle(intent: LogSymptomIntent, completion: @escaping (LogSymptomIntentResponse) -> Void) {
        let symptom = intent.symptomType
        let severity = intent.severity

        // Log to HealthKit and app database
        HealthManager.shared.logSymptom(symptom, severity: severity)

        let response = LogSymptomIntentResponse(code: .success, userActivity: nil)
        response.message = "Logged \(symptom) with severity \(severity)"
        completion(response)
    }
}
```

### 6. Quick Action UI Patterns

**Floating Action Button (FAB):**
```
Position: Bottom-right of primary screens
Design: Large, Liquid Glass button with + icon
Tap: Opens quick action menu
Long-press: Direct to most frequent action

Menu Options:
├── 💧 Log Water
├── 🍽️ Log Meal
├── 😫 Log Symptom
└── 👶 Kick Counter
```

**Bottom Sheet Quick Logger:**
```
Trigger: Swipe up from bottom on dashboard
Shows: Quick log sheet (doesn't navigate away)
Contains:
├── Time selector (defaults to now)
├── Type picker (water/meal/symptom)
├── Amount/severity
└── [Cancel] [Log] buttons

Benefit: Doesn't interrupt context
```

**Contextual Quick Actions:**
```
Smart placement based on:
- Time of day (meal logging at mealtimes)
- User patterns (nausea logging in morning if first trimester)
- Upcoming events (contraction timer in third trimester)

Example:
IF current_time between 7:00-9:00 AM
   AND user in first trimester
   THEN show: "Morning sickness check-in" card on dashboard
```

---

## Code Examples & Implementation

### 1. Modern SwiftUI Navigation (iOS 26)

**Tab-Based Navigation with Router Pattern:**

```swift
import SwiftUI

// MARK: - Router
enum AppTab: String, CaseIterable, Identifiable {
    case today = "Today"
    case track = "Track"
    case learn = "Learn"
    case profile = "Profile"

    var id: String { rawValue }

    var icon: String {
        switch self {
        case .today: return "house.fill"
        case .track: return "chart.line.uptrend.xyaxis"
        case .learn: return "book.fill"
        case .profile: return "person.fill"
        }
    }
}

enum Destination: Hashable {
    case symptomDetail(String)
    case weekDetail(Int)
    case articleDetail(String)
    case puqeHistory
}

@Observable
class AppRouter {
    var selectedTab: AppTab = .today
    var todayPath = NavigationPath()
    var trackPath = NavigationPath()
    var learnPath = NavigationPath()
    var profilePath = NavigationPath()

    func path(for tab: AppTab) -> Binding<NavigationPath> {
        switch tab {
        case .today: return Binding(get: { self.todayPath }, set: { self.todayPath = $0 })
        case .track: return Binding(get: { self.trackPath }, set: { self.trackPath = $0 })
        case .learn: return Binding(get: { self.learnPath }, set: { self.learnPath = $0 })
        case .profile: return Binding(get: { self.profilePath }, set: { self.profilePath = $0 })
        }
    }

    func navigate(to destination: Destination, in tab: AppTab) {
        selectedTab = tab
        switch tab {
        case .today: todayPath.append(destination)
        case .track: trackPath.append(destination)
        case .learn: learnPath.append(destination)
        case .profile: profilePath.append(destination)
        }
    }

    func popToRoot(in tab: AppTab) {
        switch tab {
        case .today: todayPath = NavigationPath()
        case .track: trackPath = NavigationPath()
        case .learn: learnPath = NavigationPath()
        case .profile: profilePath = NavigationPath()
        }
    }
}

// MARK: - Root View
struct ContentView: View {
    @State private var router = AppRouter()

    var body: some View {
        TabView(selection: $router.selectedTab) {
            ForEach(AppTab.allCases) { tab in
                NavigationStack(path: router.path(for: tab)) {
                    tabContent(for: tab)
                        .navigationDestination(for: Destination.self) { destination in
                            destinationView(for: destination)
                        }
                }
                .tabItem {
                    Label(tab.rawValue, systemImage: tab.icon)
                }
                .tag(tab)
            }
        }
        .tabViewStyle(.sidebarAdaptable) // Automatic iPad sidebar
        .environment(router)
    }

    @ViewBuilder
    private func tabContent(for tab: AppTab) -> some View {
        switch tab {
        case .today: TodayView()
        case .track: TrackView()
        case .learn: LearnView()
        case .profile: ProfileView()
        }
    }

    @ViewBuilder
    private func destinationView(for destination: Destination) -> some View {
        switch destination {
        case .symptomDetail(let symptom):
            SymptomDetailView(symptom: symptom)
        case .weekDetail(let week):
            WeekDetailView(weekNumber: week)
        case .articleDetail(let articleId):
            ArticleDetailView(articleId: articleId)
        case .puqeHistory:
            PUQEHistoryView()
        }
    }
}
```

### 2. Liquid Glass Dashboard Components

**Glass Card with Quick Action:**

```swift
struct QuickLogCard: View {
    let title: String
    let icon: String
    let currentValue: String
    let action: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: icon)
                    .font(.title2)
                    .foregroundStyle(.tint)

                Spacer()

                Button(action: action) {
                    Image(systemName: "plus.circle.fill")
                        .font(.title2)
                }
                .buttonStyle(.borderless)
            }

            Text(title)
                .font(.subheadline)
                .foregroundStyle(.secondary)

            Text(currentValue)
                .font(.title.bold())
                .foregroundStyle(.primary)
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .glassEffect()
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
    }
}

// Usage
QuickLogCard(
    title: "Water",
    icon: "drop.fill",
    currentValue: "4/8 glasses"
) {
    // Log water action
}
```

**Progressive Disclosure List:**

```swift
struct SymptomLogList: View {
    @State private var expandedSymptoms: Set<String> = []
    let symptoms = ["Nausea", "Fatigue", "Headache", "Back Pain"]

    var body: some View {
        VStack(spacing: 0) {
            ForEach(symptoms, id: \.self) { symptom in
                DisclosureGroup(
                    isExpanded: Binding(
                        get: { expandedSymptoms.contains(symptom) },
                        set: { isExpanded in
                            if isExpanded {
                                expandedSymptoms.insert(symptom)
                            } else {
                                expandedSymptoms.remove(symptom)
                            }
                        }
                    )
                ) {
                    SymptomDetailForm(symptom: symptom)
                        .padding(.vertical, 8)
                } label: {
                    HStack {
                        Text(symptom)
                            .font(.body)
                        Spacer()
                        Image(systemName: symptomIcon(for: symptom))
                            .foregroundStyle(.secondary)
                    }
                    .padding(.vertical, 12)
                }
                .glassEffect()

                if symptom != symptoms.last {
                    Divider()
                        .padding(.leading)
                }
            }
        }
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
    }

    private func symptomIcon(for symptom: String) -> String {
        switch symptom {
        case "Nausea": return "stomach"
        case "Fatigue": return "bed.double.fill"
        case "Headache": return "brain.head.profile"
        case "Back Pain": return "figure.stand"
        default: return "heart.fill"
        }
    }
}

struct SymptomDetailForm: View {
    let symptom: String
    @State private var severity: Double = 5
    @State private var notes: String = ""

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            VStack(alignment: .leading, spacing: 8) {
                Text("Severity")
                    .font(.caption)
                    .foregroundStyle(.secondary)

                HStack(spacing: 8) {
                    ForEach(1...5, id: \.self) { level in
                        Button {
                            severity = Double(level)
                        } label: {
                            Text("\(level)")
                                .font(.subheadline.bold())
                                .foregroundStyle(severity >= Double(level) ? .white : .secondary)
                                .frame(width: 44, height: 44)
                                .background(severity >= Double(level) ? Color.accentColor : Color.secondary.opacity(0.2))
                                .clipShape(Circle())
                        }
                        .buttonStyle(.plain)
                    }
                }
            }

            VStack(alignment: .leading, spacing: 8) {
                Text("Notes (optional)")
                    .font(.caption)
                    .foregroundStyle(.secondary)

                TextField("Add details...", text: $notes, axis: .vertical)
                    .lineLimit(2...4)
                    .textFieldStyle(.roundedBorder)
            }

            Button("Log \(symptom)") {
                // Save symptom log
            }
            .buttonStyle(.borderedProminent)
            .frame(maxWidth: .infinity)
        }
        .padding()
        .background(Color(.systemBackground).opacity(0.5))
        .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
    }
}
```

### 3. PUQE Score Calculator

```swift
struct PUQECalculator: View {
    @State private var nauseaDuration: Int = 0 // Hours per day
    @State private var vomitingFrequency: Int = 0 // Times per day
    @State private var retchingFrequency: Int = 0 // Times per day

    private var puqeScore: Int {
        // PUQE scoring: Each question scored 1-5
        // Total score: 3-15
        let nauseaScore = min(nauseaDuration, 5)
        let vomitScore = min(vomitingFrequency, 5)
        let retchScore = min(retchingFrequency, 5)
        return nauseaScore + vomitScore + retchScore
    }

    private var severity: (level: String, color: Color, advice: String) {
        switch puqeScore {
        case 3...6:
            return ("Mild", .green, "Continue regular activities. Stay hydrated.")
        case 7...12:
            return ("Moderate", .orange, "Consider dietary changes. Contact provider if worsening.")
        case 13...15:
            return ("Severe", .red, "Contact your healthcare provider immediately.")
        default:
            return ("Unknown", .gray, "Complete the assessment above.")
        }
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                // Header
                VStack(spacing: 8) {
                    Text("PUQE Score Assessment")
                        .font(.title.bold())
                    Text("Answer the questions below about the past 24 hours")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.center)
                }
                .padding(.top)

                // Questions
                VStack(spacing: 20) {
                    QuestionCard(
                        question: "How many hours per day have you felt nauseated?",
                        value: $nauseaDuration,
                        range: 0...5,
                        labels: ["None", "1h", "2-3h", "4-6h", "6h+"]
                    )

                    QuestionCard(
                        question: "How many times have you vomited?",
                        value: $vomitingFrequency,
                        range: 0...5,
                        labels: ["0", "1-2", "3-4", "5-6", "7+"]
                    )

                    QuestionCard(
                        question: "How many times have you had retching (dry heaves)?",
                        value: $retchingFrequency,
                        range: 0...5,
                        labels: ["0", "1-2", "3-4", "5-6", "7+"]
                    )
                }

                // Results
                if puqeScore > 0 {
                    VStack(spacing: 16) {
                        Text("Your PUQE Score")
                            .font(.headline)

                        Text("\(puqeScore)")
                            .font(.system(size: 60, weight: .bold, design: .rounded))
                            .foregroundStyle(severity.color)

                        Text(severity.level)
                            .font(.title2.bold())
                            .foregroundStyle(severity.color)

                        Text(severity.advice)
                            .font(.body)
                            .multilineTextAlignment(.center)
                            .padding(.horizontal)
                    }
                    .padding(.vertical, 24)
                    .frame(maxWidth: .infinity)
                    .glassEffect()
                    .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
                    .overlay(
                        RoundedRectangle(cornerRadius: 20, style: .continuous)
                            .stroke(severity.color.opacity(0.3), lineWidth: 2)
                    )
                }

                // Action Buttons
                HStack(spacing: 12) {
                    Button("View History") {
                        // Navigate to history
                    }
                    .buttonStyle(.bordered)

                    Button("Save & Continue") {
                        // Save PUQE score
                    }
                    .buttonStyle(.borderedProminent)
                }
                .padding(.bottom)
            }
            .padding(.horizontal)
        }
        .navigationTitle("Nausea Assessment")
        .navigationBarTitleDisplayMode(.inline)
    }
}

struct QuestionCard: View {
    let question: String
    @Binding var value: Int
    let range: ClosedRange<Int>
    let labels: [String]

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(question)
                .font(.body.bold())

            HStack(spacing: 8) {
                ForEach(Array(range.enumerated()), id: \.offset) { index, option in
                    Button {
                        value = option
                    } label: {
                        VStack(spacing: 4) {
                            Text("\(option)")
                                .font(.title3.bold())
                            if index < labels.count {
                                Text(labels[index])
                                    .font(.caption2)
                            }
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                        .background(value == option ? Color.accentColor : Color.secondary.opacity(0.1))
                        .foregroundStyle(value == option ? .white : .primary)
                        .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
                    }
                    .buttonStyle(.plain)
                }
            }
        }
        .padding()
        .glassEffect()
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
    }
}
```

### 4. Home Screen Widget Implementation

```swift
import WidgetKit
import SwiftUI

struct QuickActionWidget: Widget {
    let kind: String = "QuickActionWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            QuickActionWidgetView(entry: entry)
                .containerBackground(.fill.tertiary, for: .widget)
        }
        .configurationDisplayName("Quick Actions")
        .description("Log water, meals, and symptoms quickly")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> SimpleEntry {
        SimpleEntry(date: Date(), waterCount: 4, targetWater: 8)
    }

    func getSnapshot(in context: Context, completion: @escaping (SimpleEntry) -> ()) {
        let entry = SimpleEntry(date: Date(), waterCount: 4, targetWater: 8)
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<Entry>) -> ()) {
        let currentDate = Date()
        let waterCount = HealthManager.shared.getTodayWaterCount()
        let entry = SimpleEntry(date: currentDate, waterCount: waterCount, targetWater: 8)

        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 15, to: currentDate)!
        let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
        completion(timeline)
    }
}

struct SimpleEntry: TimelineEntry {
    let date: Date
    let waterCount: Int
    let targetWater: Int
}

struct QuickActionWidgetView: View {
    var entry: Provider.Entry
    @Environment(\.widgetFamily) var family

    var body: some View {
        switch family {
        case .systemSmall:
            SmallWidgetView(entry: entry)
        case .systemMedium:
            MediumWidgetView(entry: entry)
        default:
            SmallWidgetView(entry: entry)
        }
    }
}

struct SmallWidgetView: View {
    let entry: SimpleEntry

    var body: some View {
        VStack(spacing: 8) {
            Image(systemName: "drop.fill")
                .font(.title)
                .foregroundStyle(.blue)

            Text("\(entry.waterCount)/\(entry.targetWater)")
                .font(.title2.bold())

            Text("glasses")
                .font(.caption)
                .foregroundStyle(.secondary)

            Spacer()

            Link(destination: URL(string: "hydrationreminder://logwater")!) {
                Label("Log", systemImage: "plus.circle.fill")
                    .font(.caption.bold())
                    .padding(.horizontal, 12)
                    .padding(.vertical, 6)
                    .background(Color.blue)
                    .foregroundStyle(.white)
                    .clipShape(Capsule())
            }
        }
        .padding()
        .glassEffect()
    }
}

struct MediumWidgetView: View {
    let entry: SimpleEntry

    var body: some View {
        HStack(spacing: 16) {
            // Water Progress
            VStack(spacing: 4) {
                Image(systemName: "drop.fill")
                    .font(.title2)
                    .foregroundStyle(.blue)
                Text("\(entry.waterCount)/\(entry.targetWater)")
                    .font(.headline.bold())
                Text("Water")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
            .frame(maxWidth: .infinity)

            Divider()

            // Quick Actions
            VStack(spacing: 12) {
                Link(destination: URL(string: "hydrationreminder://logwater")!) {
                    QuickActionButton(icon: "drop.fill", label: "Water", color: .blue)
                }

                Link(destination: URL(string: "hydrationreminder://logmeal")!) {
                    QuickActionButton(icon: "fork.knife", label: "Meal", color: .orange)
                }
            }
            .frame(maxWidth: .infinity)
        }
        .padding()
        .glassEffect()
    }
}

struct QuickActionButton: View {
    let icon: String
    let label: String
    let color: Color

    var body: some View {
        HStack(spacing: 8) {
            Image(systemName: icon)
            Text(label)
                .font(.subheadline.bold())
        }
        .foregroundStyle(.white)
        .padding(.horizontal, 16)
        .padding(.vertical, 8)
        .background(color)
        .clipShape(Capsule())
    }
}
```

---

## Navigation Structure Recommendations

### Current Structure Analysis

**Your Existing App:**
```
├── Dashboard (Main)
│   ├── Hydration progress
│   ├── Quick add water
│   └── Daily goal
├── History
│   └── Past hydration logs
└── Settings
    └── Preferences
```

**Strengths:**
- Simple, focused scope
- Clear hydration tracking
- Minimal navigation depth

**Opportunities for Enhancement:**
- Add PUQE/nausea tracking
- Integrate pregnancy week context
- Expand to comprehensive pregnancy health

---

### Recommended Structure: Option A (Minimal Change)

**Enhance Existing 3-Tab Structure:**

```
TabView (3 tabs):
├── 🏠 Today (renamed from Dashboard)
│   ├── Pregnancy week banner (new)
│   ├── Hydration progress (existing)
│   ├── PUQE quick check-in (new, contextual)
│   ├── Quick actions: Water, Symptom, Meal (enhanced)
│   └── Today's tip (new)
│
├── 📊 Track (renamed from History)
│   ├── Hydration history (existing)
│   ├── Symptoms & PUQE scores (new)
│   │   ├── Nausea trends
│   │   ├── Other symptoms
│   │   └── Pattern insights
│   ├── Weight tracking (new)
│   └── Nutrition log (new)
│
└── ⚙️ Profile (renamed from Settings)
    ├── Pregnancy info (due date, etc.)
    ├── Notification preferences
    ├── Data & Privacy
    ├── Connected apps (Apple Health)
    └── About & Support
```

**Migration Path:**
1. Week 1: Add pregnancy week banner to Dashboard
2. Week 2: Add PUQE quick logger (contextual widget)
3. Week 3: Expand History → Track with symptom logging
4. Week 4: Polish UI with Liquid Glass components

**Pros:**
- Minimal disruption to existing users
- Incremental feature addition
- Maintains simplicity

**Cons:**
- Limited room for growth
- May feel cramped as features expand

---

### Recommended Structure: Option B (Comprehensive Pregnancy App)

**Full 4-5 Tab Structure for Complete Pregnancy Tracking:**

```
TabView (5 tabs):
├── 🏠 Today
│   ├── Week X banner with baby size
│   ├── Daily checklist
│   │   ├── Hydration: 4/8 glasses
│   │   ├── Prenatal vitamin: ✅
│   │   ├── Nausea check: Pending
│   │   └── Movement count: - (if 3rd trimester)
│   ├── Today's insight card
│   ├── Upcoming: Next appointment
│   └── Quick actions (floating button)
│
├── 📝 Track
│   ├── Hydration
│   │   ├── Today's log
│   │   ├── Weekly trend
│   │   └── Goal adjustment
│   ├── Symptoms
│   │   ├── PUQE calculator
│   │   ├── Nausea log & trends
│   │   ├── Fatigue, mood, pain
│   │   └── Pattern insights
│   ├── Nutrition
│   │   ├── Meal log
│   │   ├── Nutrient tracking
│   │   └── Safe food checker
│   ├── Weight
│   │   ├── Weekly weigh-in
│   │   ├── Trend graph
│   │   └── Healthy range indicator
│   └── Fetal Movement (3rd trimester)
│       ├── Kick counter
│       └── Pattern tracking
│
├── 📚 Learn
│   ├── Week-by-week guide
│   │   ├── Baby development
│   │   ├── Your body changes
│   │   └── What to expect
│   ├── Article library
│   │   ├── Nutrition & diet
│   │   ├── Exercise
│   │   ├── Labor & delivery prep
│   │   └── Postpartum
│   ├── Tools
│   │   ├── Contraction timer
│   │   ├── Hospital bag checklist
│   │   ├── Birth plan builder
│   │   └── Baby name browser
│   └── Videos & courses
│
├── 💬 Connect (Optional)
│   ├── Community forums
│   ├── Expert Q&A
│   ├── Share with partner/family
│   └── Find local resources
│
└── 👤 Profile
    ├── Pregnancy timeline
    ├── Data & insights
    │   ├── Reports
    │   ├── Export data
    │   └── Share with provider
    ├── Settings
    │   ├── Notifications
    │   ├── Units & preferences
    │   └── Connected apps
    └── Support & Feedback
```

**Pros:**
- Comprehensive pregnancy companion
- Competitive with top apps (Flo, Pregnancy+)
- Clear feature organization
- Room for growth

**Cons:**
- Significant development effort
- More complex navigation
- May overwhelm simple hydration users

---

### Recommended Structure: Option C (Hybrid - Smart Tabs)

**Adaptive Tab Bar Based on Pregnancy Stage:**

**First Trimester Focus:**
```
├── Today (Nausea + hydration focus)
├── Symptoms (PUQE prominent)
├── Learn (What's happening)
└── Profile
```

**Second Trimester Focus:**
```
├── Today (General wellness)
├── Track (Nutrition + weight)
├── Learn (Preparation)
└── Profile
```

**Third Trimester Focus:**
```
├── Today (Movement + contractions)
├── Track (Kick counter prominent)
├── Prepare (Checklists + birth plan)
└── Profile
```

**Implementation:**
```swift
@Observable
class PregnancyContext {
    var currentWeek: Int
    var trimester: Trimester {
        switch currentWeek {
        case 1...13: return .first
        case 14...27: return .second
        case 28...42: return .third
        default: return .first
        }
    }

    var recommendedTabs: [AppTab] {
        switch trimester {
        case .first:
            return [.today, .symptoms, .learn, .profile]
        case .second:
            return [.today, .track, .learn, .profile]
        case .third:
            return [.today, .track, .prepare, .profile]
        }
    }
}
```

**Pros:**
- Contextually relevant features
- Reduces clutter
- Guides user journey

**Cons:**
- More complex logic
- May confuse with changing tabs
- Harder to discover all features

---

### Navigation Best Practices Summary

#### 1. **Tab Bar Guidelines**

✅ **Do:**
- Use 3-5 tabs maximum
- Keep tab labels concise (1-2 words)
- Use recognizable SF Symbols
- Maintain consistent tab order
- Enable sidebar on iPad (.tabViewStyle(.sidebarAdaptable))

❌ **Don't:**
- Use more than 5 tabs (use sidebar instead)
- Change tab order dynamically
- Hide critical features in "More" tab
- Use ambiguous icons
- Navigate automatically between tabs

#### 2. **Information Hierarchy**

```
Glanceable (0 taps): Dashboard widgets, lock screen
Quick Action (1 tap): Primary tracking, most frequent tasks
Detail View (2 taps): Trends, history, detailed logs
Advanced (3+ taps): Settings, reports, rare features
```

#### 3. **Progressive Disclosure**

- Show essentials by default
- Reveal details on demand
- Use disclosure groups, modals, sheets
- Provide "Learn more" links
- Don't overwhelm with all data upfront

#### 4. **Contextual Navigation**

- Adapt to pregnancy stage
- Show relevant quick actions
- Hide irrelevant features
- Smart defaults based on patterns
- Timely notifications

#### 5. **Accessibility**

- Support VoiceOver labels
- Ensure sufficient contrast (especially with Liquid Glass)
- Provide solid fallback for "Reduce Transparency"
- Large tap targets (44x44pt minimum)
- Support Dynamic Type

---

## Final Recommendations for Your App

### Phase 1: Enhance Existing (2-4 weeks)

**Goal:** Add pregnancy context without disrupting current users.

1. **Add pregnancy week banner** to dashboard
2. **Implement PUQE quick logger** as contextual widget
3. **Update Dashboard → "Today"** with daily checklist concept
4. **Apply Liquid Glass styling** to existing components
5. **Create home screen widgets** for quick water logging

**Code Priority:**
- Liquid Glass card components
- PUQE calculator view
- Widget implementation
- Pregnancy week context manager

### Phase 2: Expand Tracking (4-6 weeks)

**Goal:** Become comprehensive pregnancy health tracker.

1. **Expand History → "Track"** tab with multiple categories
2. **Add symptom logging** beyond nausea
3. **Integrate weight tracking**
4. **Build nutrition logger** with meal photos
5. **Implement Apple Health sync** for all metrics

**Code Priority:**
- Router pattern with NavigationPath
- Symptom detail forms
- HealthKit integration
- Data persistence layer

### Phase 3: Education & Community (6-8 weeks)

**Goal:** Add value beyond tracking with content.

1. **Create "Learn" tab** with week-by-week guides
2. **Add article library** (nutrition, exercise, etc.)
3. **Build tool collection** (contraction timer, checklists)
4. **Consider community features** (forums, Q&A)

**Code Priority:**
- Content management system
- Week detail views
- Tool implementations
- Sharing capabilities

### Phase 4: Polish & Delight (Ongoing)

**Goal:** Best-in-class iOS 26 experience.

1. **Refine Liquid Glass animations**
2. **Add Siri Shortcuts** for voice logging
3. **Implement Action Button** support (iPhone 15 Pro+)
4. **Create interactive widgets**
5. **Build Apple Watch companion**

**Code Priority:**
- Animation polish
- Intents framework
- watchOS app
- Advanced widget interactions

---

## Conclusion

iOS 26's Liquid Glass design language represents a paradigm shift in mobile UI, emphasizing:

1. **Content over chrome** - Navigation recedes to let information shine
2. **Fluid, organic interactions** - Transitions feel natural and alive
3. **Contextual intelligence** - UI adapts to user needs and patterns
4. **Unified ecosystem** - Seamless experience across all Apple devices
5. **Accessibility-first** - Beautiful for everyone, functional for all

For pregnancy and health apps specifically:

- **Quick actions are non-negotiable** - Users will abandon apps that require 4+ taps to log
- **Progressive disclosure prevents overwhelm** - Show what's needed, hide the rest
- **Education builds trust** - Content quality matters as much as features
- **Community creates stickiness** - Social features drive engagement
- **Privacy is paramount** - Health data requires highest security standards

By implementing these patterns and principles, your pregnancy tracking app can compete with industry leaders while providing a uniquely delightful iOS 26 experience.

---

## Additional Resources

### Apple Official Documentation
- [Human Interface Guidelines - iOS 26](https://developer.apple.com/design/human-interface-guidelines)
- [Adopting Liquid Glass](https://developer.apple.com/documentation/TechnologyOverviews/adopting-liquid-glass)
- [HealthKit Framework](https://developer.apple.com/documentation/healthkit)
- [WidgetKit](https://developer.apple.com/documentation/widgetkit)
- [App Intents](https://developer.apple.com/documentation/appintents)

### WWDC 2025 Sessions
- "Meet Liquid Glass" (Session 219)
- "Get to know the new design system" (Session 356)
- "Build a SwiftUI app with the new design" (Session 323)
- "Build a UIKit app with the new design" (Session 284)

### Design References
- [Frank Rausch: Modern iOS Navigation Patterns](https://frankrausch.com/ios-navigation/)
- [Flo App Case Study - Empathetic Design](https://raw.studio/blog/flos-empathetic-design-hacks)
- [Dashboard Design Best Practices](https://www.pencilandpaper.io/articles/ux-pattern-analysis-data-dashboards)

### Code Examples
- [AppRouter Library by Dimillian](https://github.com/Dimillian/AppRouter)
- [Navigator by hmlongco](https://github.com/hmlongco/Navigator)
- [SwiftUI Tab Navigation Examples](https://www.donnywals.com/using-ios-18s-new-tabview-with-a-sidebar/)

---

**Document Version:** 1.0
**Last Updated:** October 17, 2025
**Author:** Research compiled for HydrationReminder pregnancy tracking app enhancement
