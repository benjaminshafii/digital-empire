# Task 2: Floating Action Button Pill Implementation

**Date:** November 2, 2025
**Project:** Corgina - Pregnancy Tracking iOS App
**iOS Version:** iOS 26 with Liquid Glass Design Language
**Status:** Design & Planning Phase

---

## Table of Contents

1. [Overview](#overview)
2. [Current Implementation Analysis](#current-implementation-analysis)
3. [Photo Logging Logic Analysis](#photo-logging-logic-analysis)
4. [iOS 26 FAB Design Patterns](#ios-26-fab-design-patterns)
5. [Proposed Component Structure](#proposed-component-structure)
6. [Integration Points](#integration-points)
7. [Implementation Plan](#implementation-plan)
8. [Design Specifications](#design-specifications)
9. [Accessibility Considerations](#accessibility-considerations)
10. [Testing Strategy](#testing-strategy)

---

## Overview

### Objective

Create a floating action button (FAB) pill that combines two primary user actions:
- **Top button:** Microphone for voice logging
- **Bottom button:** Camera for photo food logging

The FAB pill should:
- Float over content and remain accessible across main views
- Follow iOS 26 Liquid Glass design patterns
- Integrate seamlessly with existing voice and photo logging systems
- Provide clear visual feedback for user interactions
- Maintain accessibility standards

### User Story

As a pregnant user of Corgina, I want quick access to both voice logging and photo logging from anywhere in the app, so that I can effortlessly track my food intake without navigating through multiple screens.

---

## Current Implementation Analysis

### Existing Floating Button: `FloatingMicButton`

**Location:** `/Users/benjaminshafii/git/personal/pregnancy/HydrationReminder/HydrationReminder/ExpandableVoiceNavbar.swift` (lines 453-539)

**Current Implementation:**

```swift
struct FloatingMicButton: View {
    let isRecording: Bool
    let actionState: VoiceLogManager.ActionRecognitionState
    let onTap: () -> Void

    var body: some View {
        Button(action: handleTapWithDebounce) {
            ZStack {
                // Liquid glass circle background (Apple Music style)
                Circle()
                    .fill(.ultraThinMaterial)
                    .frame(width: 56, height: 56)
                    .shadow(color: .black.opacity(0.15), radius: 6, y: 1)

                // Icon with state (24pt icons)
                if isRecording {
                    RoundedRectangle(cornerRadius: 4)
                        .fill(Color.red)
                        .frame(width: 18, height: 18)
                } else {
                    Image(systemName: "mic.fill")
                        .font(.system(size: 24, weight: .medium))
                        .foregroundStyle(.primary)
                }
            }
            .frame(width: 72, height: 72)
        }
        .buttonStyle(.plain)
    }
}
```

**Key Design Elements:**
- **Material:** `.ultraThinMaterial` for Liquid Glass effect
- **Size:** 56x56pt button in 72x72pt touch target
- **Shadow:** Subtle `color: .black.opacity(0.15), radius: 6, y: 1`
- **Icon Size:** 24pt SF Symbol font size
- **Debouncing:** 0.5 second minimum between taps
- **Visual Feedback:** Scale animation to 0.85 on tap
- **Pulse Effect:** Red ring animation during recording

**Current Positioning (MainTabView.swift lines 52-64):**

```swift
.overlay(alignment: .bottomTrailing) {
    if voiceLogManager.actionRecognitionState == .idle || voiceLogManager.isRecording {
        FloatingMicButton(
            isRecording: voiceLogManager.isRecording,
            actionState: voiceLogManager.actionRecognitionState,
            onTap: handleVoiceTap
        )
        .padding(.trailing, 20)
        .padding(.bottom, 90)
        .transition(.scale.combined(with: .opacity))
    }
}
```

**State-Based Visibility:**
- Shows when: `actionRecognitionState == .idle` OR `isRecording == true`
- Hides during: `recognizing`, `executing`, `completed` states
- Transition: Scale + opacity animation
- Position: Bottom-trailing, 20pt from right, 90pt from bottom

### Existing Voice Status Indicator: `VoiceCompactPill`

**Location:** `/Users/benjaminshafii/git/personal/pregnancy/HydrationReminder/HydrationReminder/VoiceCompactPill.swift`

**Design Pattern:**

```swift
struct VoiceCompactPill: View {
    var body: some View {
        HStack(spacing: 12) {
            statusIcon
            VStack(alignment: .leading, spacing: 2) {
                Text(statusTitle)
                Text(subtitle)
            }
            Spacer()
            trailingContent
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background(
            RoundedRectangle(cornerRadius: 20, style: .continuous)
                .fill(.ultraThinMaterial)
                .shadow(color: statusColor.opacity(0.2), radius: 12, y: 4)
                .overlay(
                    RoundedRectangle(cornerRadius: 20, style: .continuous)
                        .strokeBorder(statusColor.opacity(0.3), lineWidth: 1.5)
                )
        )
    }
}
```

**Key Insights:**
- Uses `.continuous` corner style for smoother corners
- Colored shadow and border based on state
- Shows during: recording, recognizing, executing, completed
- Position: Bottom center, 100pt from bottom (MainTabView.swift line 41)

---

## Photo Logging Logic Analysis

### Current Photo Logging Implementation (DashboardView.swift)

**Entry Points:**

1. **Food Card Button (lines 714-725):**
```swift
Button(action: {
    showingPhotoOptions = true
}) {
    HStack {
        Image(systemName: "camera.fill")
        Text("Add Photo")
    }
    .frame(maxWidth: .infinity)
    .padding()
}
.buttonStyle(.borderedProminent)
.tint(.orange)
```

2. **Photo Options Dialog (lines 187-191, 347-356):**
```swift
.confirmationDialog("Add Food Photo", isPresented: $showingPhotoOptions) {
    Button("Take Photo") {
        showingCamera = true
    }
    Button("Choose from Library") {
        showingPhotoPicker = true
    }
    Button("Cancel", role: .cancel) { }
}
```

### State Variables Required

```swift
@State private var showingCamera = false
@State private var showingPhotoOptions = false
@State private var capturedImage: UIImage?
@State private var selectedItem: PhotosPickerItem?
@State private var showingAddNotes = false
@State private var tempImageData: Data?
@State private var notes = ""
@State private var selectedMealType: MealType?
@State private var selectedDate = Date()
@State private var showingPhotoPicker = false
@State private var isProcessingPhoto = false
@State private var photoProcessingStatus = ""
@State private var photoProcessingProgress: PhotoProcessingStage = .none
```

### Photo Processing Flow

**1. Camera Capture (lines 315-328):**
```swift
.sheet(isPresented: $showingCamera) {
    CameraView(image: $capturedImage)
        .onDisappear {
            if let image = capturedImage,
               let data = image.jpegData(compressionQuality: 0.8) {
                tempImageData = data
                capturedImage = nil
                notes = ""
                selectedMealType = nil
                selectedDate = Date()
                savePhotoLog()
            }
        }
}
```

**2. Photo Library Selection (lines 195-209):**
```swift
.onChange(of: selectedItem) { oldValue, newItem in
    Task {
        if let newItem = newItem {
            if let data = try? await newItem.loadTransferable(type: Data.self) {
                tempImageData = data
                selectedItem = nil
                showingPhotoPicker = false
                notes = ""
                selectedMealType = nil
                selectedDate = Date()
                savePhotoLog()
            }
        }
    }
}
```

**3. Save Photo Log Function (lines 1121-1206):**

Key steps:
1. Sets `isProcessingPhoto = true`
2. Sets `photoProcessingProgress = .uploading`
3. Calls `photoLogManager.addPhotoLog(imageData, notes, mealType, date)`
4. Creates initial `LogEntry` with `foodName: "Processing..."`
5. Appends to `logsManager.logEntries`
6. Async OpenAI analysis:
   - `photoProcessingProgress = .analyzing`
   - `OpenAIManager.shared.analyzeFood(imageData: data)`
   - `photoProcessingProgress = .recognized`
7. Updates log entry with AI results (calories, protein, carbs, fat)
8. `photoProcessingProgress = .complete`
9. Auto-dismisses after 2 seconds

### PhotoFoodLogManager Integration

**Location:** `/Users/benjaminshafii/git/personal/pregnancy/HydrationReminder/HydrationReminder/PhotoFoodLog.swift`

```swift
class PhotoFoodLogManager: ObservableObject {
    @Published var photoLogs: [PhotoFoodLog] = []

    func addPhotoLog(imageData: Data, notes: String? = nil,
                    mealType: MealType? = nil, date: Date = Date()) {
        if let compressedData = compressImage(data: imageData) {
            let log = PhotoFoodLog(
                date: date,
                imageData: compressedData,
                notes: notes,
                mealType: mealType
            )
            photoLogs.insert(log, at: 0)
            savePhotoLogs()
        }
    }
}
```

**Key Methods:**
- `addPhotoLog()` - Creates new photo log entry
- `enrichPhotoLog()` - Adds AI analysis results
- `getLogsForToday()` - Filters today's photos
- `compressImage()` - Resizes to max 1024pt and 70% JPEG quality

### Dependencies

The photo logging system requires:

1. **Managers:**
   - `PhotoFoodLogManager` - Stores photo logs
   - `OpenAIManager` - AI food analysis
   - `LogsManager` - Unified activity log

2. **Views:**
   - `CameraView` - Native camera interface
   - `PhotosPicker` - System photo picker
   - `AddNotesView` (optional) - Notes entry sheet

3. **Models:**
   - `PhotoFoodLog` - Data model for photos
   - `FoodAnalysis` - AI response structure
   - `MealType` - Enum for meal categorization
   - `LogEntry` - Unified log entry

---

## iOS 26 FAB Design Patterns

### Research Findings

Based on iOS 26 design patterns and SwiftUI best practices:

#### 1. Liquid Glass Material Application

**Core Principle:** System applies Liquid Glass effect automatically to built-in components. For custom elements:

```swift
.background(.ultraThickMaterial)
.cornerRadius(10)
```

**Material Hierarchy:**
- `.ultraThinMaterial` - Most transparent, best for floating elements
- `.thinMaterial` - Subtle blur
- `.regularMaterial` - Standard blur
- `.thickMaterial` - Heavy blur
- `.ultraThickMaterial` - Maximum blur

**For FAB:** Use `.ultraThinMaterial` to maintain visual hierarchy and allow content to show through

#### 2. iOS 26 Tab Bar Integration

**Key Finding:** iOS 26 supports side-floating FABs alongside the Liquid Glass tab bar:

```swift
.tabBarMinimizeBehavior(.onScrollDown)
```

This behavior allows the FAB to remain visible even when the tab bar minimizes on scroll.

#### 3. Positioning Strategy

**Recommended Position:**
- **Horizontal:** Bottom-trailing (20pt from right edge)
- **Vertical:** 90-100pt from bottom (above tab bar)
- **Offset:** Slightly upward (-40pt) for floating appearance
- **Safe Area:** Respect safe area insets

#### 4. Shape Conventions

**Pill Shape:** `Capsule()` is the native SwiftUI shape for pill buttons

```swift
.clipShape(Capsule())
```

**Corner Radius for Custom Pills:**
```swift
RoundedRectangle(cornerRadius: radius, style: .continuous)
```

Use `.continuous` style for smoother, more organic corners that match iOS 26 aesthetics.

#### 5. Shadow and Depth

**iOS 26 Shadow Pattern:**
```swift
.shadow(color: .black.opacity(0.15), radius: 6, y: 1)
```

For stacked elements, increase y-offset slightly for upper elements to suggest layering.

#### 6. Animation Standards

**Spring Animation:** Preferred for iOS 26
```swift
.animation(.spring(response: 0.4, dampingFraction: 0.8), value: state)
```

**Transitions:**
```swift
.transition(.scale.combined(with: .opacity))
```

#### 7. Touch Target Size

**Minimum:** 44x44pt (Apple HIG requirement)
**Recommended for FAB:** 56-60pt visible size in 72pt touch target
**Spacing between stacked buttons:** Minimum 8pt, recommended 12pt

#### 8. State Feedback

**Visual states required:**
- Default (idle)
- Pressed (scale to 0.85-0.90)
- Disabled (opacity 0.5)
- Loading (progress indicator)
- Success (checkmark, green color)
- Error (exclamation, red color)

---

## Proposed Component Structure

### Component Name: `FloatingActionPill`

A vertically-oriented pill containing two circular action buttons (mic and camera).

### Visual Design

```
┌─────────────┐
│             │
│   ┌─────┐   │
│   │ 🎤  │   │  ← Microphone button (top)
│   └─────┘   │
│             │
│   ┌─────┐   │
│   │ 📷  │   │  ← Camera button (bottom)
│   └─────┘   │
│             │
└─────────────┘
```

### Sizing Specifications

- **Pill Container:**
  - Width: 72pt (matches current FloatingMicButton touch target)
  - Height: 160pt (accommodates 2 buttons + spacing + padding)
  - Corner Radius: 36pt (half of width for pill shape)
  - Padding: 8pt vertical, 8pt horizontal

- **Individual Buttons:**
  - Size: 56x56pt (matches current FloatingMicButton)
  - Touch Target: Full pill width (72pt)
  - Spacing: 12pt between buttons
  - Icon Size: 24pt SF Symbols

### Component Structure

```swift
struct FloatingActionPill: View {
    // MARK: - Dependencies
    @ObservedObject var voiceLogManager: VoiceLogManager
    @ObservedObject var photoLogManager: PhotoFoodLogManager

    // MARK: - Actions
    let onMicTap: () -> Void
    let onCameraTap: () -> Void

    // MARK: - State
    @State private var micPulseAnimation = false
    @State private var cameraPulseAnimation = false
    @State private var lastMicTapTime: Date = .distantPast
    @State private var lastCameraTapTime: Date = .distantPast
    @State private var micFeedback = false
    @State private var cameraFeedback = false

    var body: some View {
        VStack(spacing: 12) {
            // Top: Microphone button
            micButton

            // Bottom: Camera button
            cameraButton
        }
        .padding(.vertical, 8)
        .padding(.horizontal, 8)
        .background(
            Capsule()
                .fill(.ultraThinMaterial)
                .shadow(color: .black.opacity(0.15), radius: 8, y: 2)
        )
        .frame(width: 72, height: 160)
    }

    // MARK: - Mic Button
    private var micButton: some View {
        Button(action: handleMicTap) {
            ZStack {
                Circle()
                    .fill(.ultraThinMaterial)
                    .frame(width: 56, height: 56)

                // Icon based on voice state
                if voiceLogManager.isRecording {
                    RoundedRectangle(cornerRadius: 4)
                        .fill(Color.red)
                        .frame(width: 18, height: 18)
                } else {
                    Image(systemName: "mic.fill")
                        .font(.system(size: 24, weight: .medium))
                        .foregroundStyle(.primary)
                }

                // Pulse ring during recording
                if voiceLogManager.isRecording {
                    Circle()
                        .stroke(Color.red.opacity(0.4), lineWidth: 3)
                        .frame(width: 70, height: 70)
                        .scaleEffect(micPulseAnimation ? 1.2 : 1.0)
                        .opacity(micPulseAnimation ? 0 : 0.8)
                        .animation(
                            .easeOut(duration: 1.5).repeatForever(autoreverses: false),
                            value: micPulseAnimation
                        )
                        .onAppear { micPulseAnimation = true }
                        .onDisappear { micPulseAnimation = false }
                }
            }
            .scaleEffect(micFeedback ? 0.85 : 1.0)
            .animation(.spring(response: 0.3, dampingFraction: 0.6), value: micFeedback)
        }
        .buttonStyle(.plain)
        .disabled(voiceLogManager.actionRecognitionState == .recognizing ||
                  voiceLogManager.actionRecognitionState == .executing)
    }

    // MARK: - Camera Button
    private var cameraButton: some View {
        Button(action: handleCameraTap) {
            ZStack {
                Circle()
                    .fill(.ultraThinMaterial)
                    .frame(width: 56, height: 56)

                Image(systemName: "camera.fill")
                    .font(.system(size: 24, weight: .medium))
                    .foregroundStyle(.orange)
            }
            .scaleEffect(cameraFeedback ? 0.85 : 1.0)
            .animation(.spring(response: 0.3, dampingFraction: 0.6), value: cameraFeedback)
        }
        .buttonStyle(.plain)
    }

    // MARK: - Handlers
    private func handleMicTap() {
        let now = Date()
        guard now.timeIntervalSince(lastMicTapTime) > 0.5 else {
            print("🚫 Mic tap debounced")
            return
        }
        lastMicTapTime = now

        // Visual feedback
        micFeedback = true
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.15) {
            micFeedback = false
        }

        // Haptic feedback
        let impactFeedback = UIImpactFeedbackGenerator(style: .medium)
        impactFeedback.impactOccurred()

        onMicTap()
    }

    private func handleCameraTap() {
        let now = Date()
        guard now.timeIntervalSince(lastCameraTapTime) > 0.5 else {
            print("🚫 Camera tap debounced")
            return
        }
        lastCameraTapTime = now

        // Visual feedback
        cameraFeedback = true
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.15) {
            cameraFeedback = false
        }

        // Haptic feedback
        let impactFeedback = UIImpactFeedbackGenerator(style: .light)
        impactFeedback.impactOccurred()

        onCameraTap()
    }
}
```

### Alternative: Separate Component Files

For better maintainability, consider splitting into:

1. **FloatingActionPill.swift** - Main container
2. **FloatingMicButton.swift** - Mic button (already exists, can be reused)
3. **FloatingCameraButton.swift** - Camera button (new)

---

## Integration Points

### 1. MainTabView Integration

**Current Structure (MainTabView.swift):**

```swift
.overlay(alignment: .bottomTrailing) {
    if voiceLogManager.actionRecognitionState == .idle || voiceLogManager.isRecording {
        FloatingMicButton(...)
            .padding(.trailing, 20)
            .padding(.bottom, 90)
    }
}
```

**Proposed Change:**

```swift
.overlay(alignment: .bottomTrailing) {
    if shouldShowFABPill {
        FloatingActionPill(
            voiceLogManager: voiceLogManager,
            photoLogManager: photoLogManager,
            onMicTap: handleVoiceTap,
            onCameraTap: handlePhotoTap
        )
        .padding(.trailing, 20)
        .padding(.bottom, 90)
        .transition(.scale.combined(with: .opacity))
    }
}
```

**New Computed Property:**

```swift
private var shouldShowFABPill: Bool {
    // Hide during voice processing (VoiceCompactPill takes over)
    let isVoiceProcessing = voiceLogManager.actionRecognitionState == .recognizing ||
                           voiceLogManager.actionRecognitionState == .executing ||
                           voiceLogManager.actionRecognitionState == .completed

    // Hide during photo processing
    // (add state variable in MainTabView if needed)

    return !isVoiceProcessing
}
```

### 2. State Management

**Required State Variables in MainTabView:**

```swift
// Photo-related states
@State private var showingCamera = false
@State private var showingPhotoOptions = false
@State private var capturedImage: UIImage?
@State private var selectedItem: PhotosPickerItem?
@State private var tempImageData: Data?
@State private var notes = ""
@State private var selectedMealType: MealType?
@State private var selectedDate = Date()
@State private var showingPhotoPicker = false
@State private var isProcessingPhoto = false
@State private var photoProcessingProgress: PhotoProcessingStage = .none

// Managers
@StateObject private var photoLogManager = PhotoFoodLogManager()
```

**Note:** Currently `photoLogManager` is instantiated in `DashboardView`. Consider promoting to `MainTabView` or app-level for global access.

### 3. Handler Implementation

**New Handler: `handlePhotoTap()`**

```swift
private func handlePhotoTap() {
    print("📸 Photo FAB tapped")

    // Check OpenAI API key (required for photo analysis)
    if !openAIManager.hasAPIKey {
        print("📸 ❌ No API key - showing error banner")
        withAnimation(.spring(response: 0.3)) {
            showAPIKeyError = true
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 4) {
            withAnimation {
                showAPIKeyError = false
            }
        }
        return
    }

    // Show photo options dialog
    showingPhotoOptions = true

    // Haptic feedback
    let impactFeedback = UIImpactFeedbackGenerator(style: .light)
    impactFeedback.impactOccurred()
}
```

### 4. Sheet Presentations

**Add to MainTabView body:**

```swift
.confirmationDialog("Add Food Photo", isPresented: $showingPhotoOptions) {
    Button("Take Photo") {
        showingCamera = true
    }
    Button("Choose from Library") {
        showingPhotoPicker = true
    }
    Button("Cancel", role: .cancel) { }
} message: {
    Text("How would you like to add a food photo?")
}
.sheet(isPresented: $showingCamera) {
    CameraView(image: $capturedImage)
        .onDisappear {
            if let image = capturedImage,
               let data = image.jpegData(compressionQuality: 0.8) {
                tempImageData = data
                capturedImage = nil
                notes = ""
                selectedMealType = nil
                selectedDate = Date()
                savePhotoLog()
            }
        }
}
.sheet(isPresented: $showingPhotoPicker) {
    PhotosPicker(
        selection: $selectedItem,
        matching: .images,
        photoLibrary: .shared()
    ) {
        VStack(spacing: 20) {
            Image(systemName: "photo.on.rectangle.angled")
                .font(.system(size: 60))
                .foregroundColor(.blue)
            Text("Tap to Select Photo")
                .font(.title2)
                .fontWeight(.semibold)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
    .navigationTitle("Select Food Photo")
    .navigationBarTitleDisplayMode(.inline)
}
.onChange(of: selectedItem) { oldValue, newItem in
    Task {
        if let newItem = newItem {
            if let data = try? await newItem.loadTransferable(type: Data.self) {
                tempImageData = data
                selectedItem = nil
                showingPhotoPicker = false
                notes = ""
                selectedMealType = nil
                selectedDate = Date()
                savePhotoLog()
            }
        }
    }
}
```

### 5. Photo Save Function

**Add to MainTabView:**

```swift
private func savePhotoLog() {
    guard let data = tempImageData else { return }

    isProcessingPhoto = true
    photoProcessingProgress = .uploading

    // Add to photo log manager
    photoLogManager.addPhotoLog(
        imageData: data,
        notes: notes,
        mealType: selectedMealType,
        date: selectedDate
    )

    // Create initial log entry
    let logId = UUID()
    let initialLog = LogEntry(
        id: logId,
        date: selectedDate,
        type: .food,
        source: .manual,
        notes: notes.isEmpty ? "Analyzing photo..." : notes,
        foodName: "Processing..."
    )
    logsManager.logEntries.append(initialLog)
    logsManager.saveLogs()

    // Async AI analysis
    Task {
        do {
            await MainActor.run {
                photoProcessingProgress = .analyzing
            }

            let analysis = try await OpenAIManager.shared.analyzeFood(imageData: data)

            await MainActor.run {
                photoProcessingProgress = .recognized
            }

            let totalCalories = analysis.totalCalories ?? 0
            let totalProtein = Int(analysis.totalProtein ?? 0)
            let totalCarbs = Int(analysis.totalCarbs ?? 0)
            let totalFat = Int(analysis.totalFat ?? 0)

            let foodNames = analysis.items.map { $0.name }.joined(separator: ", ")
            let finalNotes = notes.isEmpty ? "Photo: \(foodNames)" : "\(notes)\nDetected: \(foodNames)"

            await MainActor.run {
                if let index = logsManager.logEntries.firstIndex(where: { $0.id == logId }) {
                    logsManager.logEntries[index].notes = finalNotes
                    logsManager.logEntries[index].foodName = foodNames
                    logsManager.logEntries[index].calories = totalCalories
                    logsManager.logEntries[index].protein = totalProtein
                    logsManager.logEntries[index].carbs = totalCarbs
                    logsManager.logEntries[index].fat = totalFat
                    logsManager.saveLogs()
                    logsManager.objectWillChange.send()
                }

                photoProcessingProgress = .complete

                DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
                    isProcessingPhoto = false
                    photoProcessingProgress = .none
                }
            }
        } catch {
            await MainActor.run {
                if let index = logsManager.logEntries.firstIndex(where: { $0.id == logId }) {
                    logsManager.logEntries[index].notes = notes.isEmpty ? "Photo logged (AI analysis failed)" : notes
                    logsManager.logEntries[index].foodName = "Photo logged"
                    logsManager.saveLogs()
                    logsManager.objectWillChange.send()
                }

                photoProcessingProgress = .complete
                isProcessingPhoto = false
            }
            print("Failed to analyze photo: \(error)")
        }
    }

    tempImageData = nil
    notes = ""
    selectedMealType = nil
    selectedDate = Date()
}
```

### 6. Manager Dependencies

**Ensure managers are accessible:**

Option A: Promote `photoLogManager` to MainTabView level (recommended)
```swift
@StateObject private var photoLogManager = PhotoFoodLogManager()
```

Option B: Pass from DashboardView through environment
```swift
.environmentObject(photoLogManager)
```

**Required environment objects in MainTabView:**
- `logsManager` (already present)
- `notificationManager` (already present)
- `photoLogManager` (needs to be added)

---

## Implementation Plan

### Phase 1: Component Creation (Day 1)

**Step 1.1: Create FloatingCameraButton component**

File: `/HydrationReminder/FloatingCameraButton.swift`

- Extract camera button logic from FloatingActionPill design
- Match styling with existing FloatingMicButton
- Add debouncing and visual feedback
- Include accessibility labels

**Step 1.2: Create FloatingActionPill component**

File: `/HydrationReminder/FloatingActionPill.swift`

- Implement vertical pill container
- Integrate FloatingMicButton (refactor to accept external state)
- Integrate FloatingCameraButton
- Apply Liquid Glass material and shadows
- Add spring animations

**Step 1.3: Define PhotoProcessingStage enum**

Add to MainTabView or create separate file:

```swift
enum PhotoProcessingStage {
    case none
    case uploading
    case analyzing
    case recognized
    case complete

    var message: String {
        switch self {
        case .none: return ""
        case .uploading: return "Uploading photo..."
        case .analyzing: return "Analyzing with AI..."
        case .recognized: return "Food recognized!"
        case .complete: return "Added to activity log"
        }
    }
}
```

### Phase 2: MainTabView Integration (Day 2)

**Step 2.1: Add state variables**

Add all required `@State` and `@StateObject` variables listed in Integration Points section.

**Step 2.2: Promote photoLogManager**

Move `photoLogManager` from DashboardView to MainTabView:
- Remove from DashboardView
- Add to MainTabView as `@StateObject`
- Pass to DashboardView via `.environmentObject()`

**Step 2.3: Implement handlePhotoTap()**

Add photo tap handler with API key validation and haptic feedback.

**Step 2.4: Implement savePhotoLog()**

Copy and adapt from DashboardView, ensuring proper async/await handling.

**Step 2.5: Add sheet presentations**

Add `.confirmationDialog`, `.sheet(isPresented: $showingCamera)`, and `.sheet(isPresented: $showingPhotoPicker)`.

**Step 2.6: Replace FloatingMicButton overlay**

Replace existing FloatingMicButton overlay with FloatingActionPill.

### Phase 3: Testing & Refinement (Day 3)

**Step 3.1: Test voice recording flow**

- Tap mic button → should start recording
- Tap again → should stop and process
- Verify VoiceCompactPill appears during processing
- Verify FAB hides during processing
- Verify FAB reappears after completion

**Step 3.2: Test photo logging flow**

- Tap camera button → should show photo options
- Select "Take Photo" → should open camera
- Capture photo → should process with AI
- Verify log entry created with correct data
- Select "Choose from Library" → should open picker
- Select photo → should process with AI

**Step 3.3: Test state transitions**

- Voice recording → photo attempt (should be blocked or queued)
- Photo processing → voice attempt (should be blocked or queued)
- API key missing → both buttons should show error banner
- Rapid tapping → debouncing should prevent issues

**Step 3.4: Test UI states**

- Default state (both buttons idle)
- Recording state (red pulse on mic)
- Processing state (FAB hidden, pill shown)
- Error state (banner shown)
- Success state (log created, UI returns to idle)

**Step 3.5: Accessibility testing**

- VoiceOver navigation
- Dynamic Type sizing
- Reduce Motion (disable animations)
- Reduce Transparency (solid backgrounds)
- Button labels and hints
- Minimum touch target sizes (44x44pt)

### Phase 4: Polish & Optimization (Day 4)

**Step 4.1: Animation refinement**

- Tune spring parameters for natural feel
- Ensure smooth transitions between states
- Test on physical device for performance

**Step 4.2: Visual polish**

- Verify shadow and blur consistency
- Check color contrast ratios (WCAG AA)
- Test in light and dark modes
- Verify safe area handling on all devices

**Step 4.3: Error handling**

- Camera permission denied → show alert
- Photo picker canceled → clean state
- AI analysis failed → graceful fallback
- Network timeout → retry or manual entry

**Step 4.4: Documentation**

- Add inline comments to complex logic
- Update CLAUDE.md with new component info
- Document state machine for photo processing

---

## Design Specifications

### Layout

```
┌──────────────────────────────────────┐
│                                      │
│         Content Area                 │
│                                      │
│                                      │
│                                      │
│                           ┌────┐     │
│                           │    │     │
│                           │ 🎤 │     │ 90pt from bottom
│                           │    │     │ 20pt from right
│                           ├────┤     │
│                           │    │     │
│                           │ 📷 │     │
│                           │    │     │
│                           └────┘     │
│  ┌──────────────────────────────┐   │
│  │      Tab Bar (Liquid Glass)  │   │
│  └──────────────────────────────┘   │
└──────────────────────────────────────┘
```

### Dimensions

| Element | Size (pt) | Notes |
|---------|-----------|-------|
| Pill Container Width | 72 | Match FloatingMicButton touch target |
| Pill Container Height | 160 | 2 buttons (56pt each) + spacing (12pt) + padding (16pt vertical) |
| Pill Corner Radius | 36 | Half of width for perfect capsule |
| Individual Button Size | 56x56 | Visible button size |
| Button Touch Target | 72x72 | Minimum 44x44pt requirement exceeded |
| Icon Size | 24pt | SF Symbol font size |
| Spacing Between Buttons | 12pt | Comfortable separation |
| Vertical Padding | 8pt | Top and bottom padding inside pill |
| Horizontal Padding | 8pt | Left and right padding inside pill |
| Position from Bottom | 90pt | Above tab bar |
| Position from Right | 20pt | Standard edge padding |
| Shadow Radius | 8 | Slightly larger for pill vs single button (6) |
| Shadow Y-Offset | 2 | Elevated appearance |
| Shadow Opacity | 0.15 | Subtle depth |

### Colors

**Mic Button:**
- Default icon: `.primary` (system adaptive)
- Recording icon: `.red`
- Recording pulse: `Color.red.opacity(0.4)`

**Camera Button:**
- Icon: `.orange` (matches food logging theme)
- Default state: No special highlighting

**Pill Container:**
- Background: `.ultraThinMaterial` (Liquid Glass)
- Shadow: `.black.opacity(0.15)`

**States:**
- Pressed: Scale to 0.85
- Disabled: Opacity 0.5 (handled automatically)
- Error: Handled by error banner, not pill color

### Typography

- Not applicable (icon-only buttons)

### Animations

**Tap Feedback:**
```swift
.animation(.spring(response: 0.3, dampingFraction: 0.6), value: feedback)
```

**Pulse Animation (Recording):**
```swift
.animation(.easeOut(duration: 1.5).repeatForever(autoreverses: false), value: pulse)
```

**Show/Hide Transition:**
```swift
.transition(.scale.combined(with: .opacity))
```

**Spring Parameters:**
- Response: 0.3-0.4 (fast but natural)
- Damping Fraction: 0.6-0.8 (slight bounce)

### Shadows

**Pill Container:**
```swift
.shadow(color: .black.opacity(0.15), radius: 8, y: 2)
```

**Individual Buttons:**
- No additional shadow (contained within pill shadow)

---

## Accessibility Considerations

### VoiceOver Support

**Mic Button:**
- Label: "Voice recording"
- Hint: "Double tap to start recording food and water intake"
- Value: Current state ("Idle", "Recording", "Processing")
- Traits: `.button`

**Camera Button:**
- Label: "Photo food logging"
- Hint: "Double tap to take a photo or choose from library"
- Traits: `.button`

**Implementation:**
```swift
.accessibilityLabel("Voice recording")
.accessibilityHint("Double tap to start recording food and water intake")
.accessibilityValue(voiceLogManager.isRecording ? "Recording" : "Idle")
.accessibilityAddTraits(.isButton)
```

### Dynamic Type

**Considerations:**
- Icons are size-independent (SF Symbols scale automatically)
- No text labels to scale
- Touch targets remain constant (72x72pt minimum)

**Testing:**
- Verify button remains usable at largest accessibility sizes
- Ensure pill doesn't overlap with content at extreme sizes

### Reduce Motion

**When enabled:**
- Disable pulse animation
- Replace scale transitions with opacity fades
- Instant state changes instead of springs

**Implementation:**
```swift
@Environment(\.accessibilityReduceMotion) var reduceMotion

// In animation code:
if reduceMotion {
    // Use opacity transitions only
    .transition(.opacity)
} else {
    // Use full animations
    .transition(.scale.combined(with: .opacity))
}
```

### Reduce Transparency

**When enabled:**
- `.ultraThinMaterial` falls back to solid color automatically
- Verify contrast ratios remain WCAG AA compliant
- Test in both light and dark modes

### Color Contrast

**WCAG AA Requirements:**
- Normal text: 4.5:1 minimum
- Large text: 3:1 minimum
- Icons: 3:1 minimum (treated as graphical objects)

**Current Colors:**
- Red icon on ultraThinMaterial: Test contrast
- Orange icon on ultraThinMaterial: Test contrast
- Primary icon on ultraThinMaterial: System guaranteed

**Recommendations:**
- Use semantic colors (`.primary`, `.secondary`) where possible
- Test with system color filters enabled
- Provide sufficient icon size (24pt is well above minimum)

### Haptic Feedback

**Mic Button:**
- Style: `.medium` (stronger feedback for primary action)
- Trigger: On tap, not on state change

**Camera Button:**
- Style: `.light` (lighter feedback for secondary action)
- Trigger: On tap

**Implementation:**
```swift
let impactFeedback = UIImpactFeedbackGenerator(style: .medium)
impactFeedback.impactOccurred()
```

### Keyboard Navigation

**Not applicable** for iOS touch interface, but consider:
- External keyboard shortcuts for power users
- `.keyboardShortcut()` modifier for common actions

---

## Testing Strategy

### Unit Tests

**FloatingActionPill Component:**

1. **Rendering Tests:**
   - Component renders with correct dimensions
   - Both buttons are present
   - Material and shadows applied correctly

2. **State Tests:**
   - Mic button shows recording state correctly
   - Pulse animation starts/stops on recording state change
   - Camera button remains consistent across states

3. **Interaction Tests:**
   - Tap events call correct handlers
   - Debouncing prevents rapid-fire taps
   - Visual feedback (scale) triggers on tap

**Integration with MainTabView:**

1. **Manager Tests:**
   - `photoLogManager` is accessible
   - `voiceLogManager` is configured correctly
   - `logsManager` receives log entries

2. **State Machine Tests:**
   - FAB shows when idle
   - FAB hides during voice processing
   - FAB hides during photo processing
   - FAB reappears after completion

3. **Handler Tests:**
   - `handleMicTap()` starts/stops recording
   - `handlePhotoTap()` shows photo options
   - API key validation prevents action when missing
   - Error banner displays correctly

### UI Tests

**User Flow: Voice Recording**

1. Launch app
2. Verify FAB pill visible in bottom-right
3. Tap mic button
4. Verify recording indicator (red pulse)
5. Speak: "I had a banana"
6. Tap mic button again
7. Verify FAB hides
8. Verify VoiceCompactPill appears
9. Wait for processing
10. Verify log entry created
11. Verify FAB reappears

**User Flow: Photo Logging**

1. Launch app
2. Verify FAB pill visible in bottom-right
3. Tap camera button
4. Verify confirmation dialog appears
5. Select "Take Photo"
6. Verify camera view presented
7. Capture photo
8. Verify processing indicator
9. Wait for AI analysis
10. Verify log entry created with nutrition data
11. Verify FAB reappears

**User Flow: Error Handling**

1. Remove OpenAI API key (Settings)
2. Return to Dashboard
3. Tap mic button
4. Verify error banner appears
5. Verify banner auto-dismisses after 4 seconds
6. Tap camera button
7. Verify same error banner behavior

**User Flow: State Conflicts**

1. Tap mic button (start recording)
2. Tap camera button (attempt photo)
3. Verify camera is blocked or queued (define behavior)
4. Stop recording
5. Wait for processing
6. Verify camera becomes available after completion

### Manual Testing

**Devices:**
- iPhone 15 Pro (6.1" standard)
- iPhone 15 Pro Max (6.7" large)
- iPhone SE (4.7" small)
- iPad Pro (test sidebar adaptable behavior)

**System Settings:**
- Light Mode
- Dark Mode
- Increase Contrast
- Reduce Transparency
- Reduce Motion
- Largest Dynamic Type
- VoiceOver enabled
- Color Filters (grayscale, deuteranopia, etc.)

**Scenarios:**
- Rapid tapping both buttons
- Switching between tabs during processing
- App backgrounding during photo upload
- Low memory conditions
- Network timeout during AI analysis
- Permission denied for camera
- Permission denied for microphone
- Low battery mode (reduced animations)

### Performance Testing

**Metrics:**

1. **Animation Frame Rate:**
   - Target: 60 FPS (120 FPS on ProMotion displays)
   - Measure during transitions and pulse animations

2. **Memory Usage:**
   - Baseline: App idle with FAB visible
   - Peak: During simultaneous voice and photo processing
   - Target: No memory leaks, stable after actions

3. **Battery Impact:**
   - Pulse animation overhead
   - Voice recording energy usage
   - AI processing network calls

**Tools:**
- Xcode Instruments (Time Profiler, Allocations, Energy Log)
- On-device performance HUD
- Battery usage stats in Settings

### Regression Testing

**After Implementation:**
- Existing voice logging still works
- Existing DashboardView photo button still works
- Tab bar navigation unaffected
- VoiceCompactPill behavior unchanged
- All existing tests pass

**Checklist:**
- [ ] Voice recording from FAB works
- [ ] Voice recording from DashboardView (if exists) works
- [ ] Photo from FAB works
- [ ] Photo from DashboardView food card works
- [ ] Tab switching works smoothly
- [ ] VoiceCompactPill shows/hides correctly
- [ ] Error banner shows for missing API key
- [ ] All existing unit tests pass
- [ ] All existing UI tests pass

---

## Success Criteria

### Must Have (P0)

1. **Functional:**
   - [ ] FAB pill renders in bottom-trailing position
   - [ ] Mic button starts/stops voice recording
   - [ ] Camera button opens photo options dialog
   - [ ] Photo capture and library selection work
   - [ ] AI analysis processes photos correctly
   - [ ] Log entries created for both voice and photo
   - [ ] FAB hides during processing states
   - [ ] FAB reappears after completion

2. **Design:**
   - [ ] Liquid Glass material applied correctly
   - [ ] Pill shape with proper corner radius
   - [ ] Icons sized at 24pt
   - [ ] Touch targets minimum 72x72pt
   - [ ] Shadows and blur match existing FloatingMicButton
   - [ ] Animations smooth and natural (60 FPS+)

3. **Accessibility:**
   - [ ] VoiceOver labels and hints provided
   - [ ] Touch targets meet 44x44pt minimum
   - [ ] Contrast ratios pass WCAG AA
   - [ ] Reduce Motion disables animations
   - [ ] Reduce Transparency provides solid fallback

4. **Stability:**
   - [ ] No crashes during normal use
   - [ ] No memory leaks
   - [ ] Handles API errors gracefully
   - [ ] Handles permission denials gracefully
   - [ ] Debouncing prevents rapid-tap issues

### Nice to Have (P1)

1. **Enhanced UX:**
   - [ ] Haptic feedback on all taps
   - [ ] Loading states for photo processing
   - [ ] Success animation on completion
   - [ ] Drag to reorder buttons (advanced)
   - [ ] Long press for additional options

2. **Performance:**
   - [ ] Animations run at 120 FPS on ProMotion
   - [ ] Photo compression optimized
   - [ ] AI response time under 3 seconds

3. **Polish:**
   - [ ] Custom pulse animation for photo processing
   - [ ] Gradient accents on buttons
   - [ ] Particle effects on success (optional)

### Future Enhancements (P2)

1. **Expandable Menu:**
   - [ ] Additional buttons (symptom logging, water, etc.)
   - [ ] Expand/collapse animation
   - [ ] Customizable button order

2. **Smart Features:**
   - [ ] Context-aware button visibility (hide camera at night)
   - [ ] Usage tracking for analytics
   - [ ] Suggested actions based on time of day

3. **Advanced Interactions:**
   - [ ] 3D Touch / Haptic Touch for quick actions
   - [ ] Widget integration
   - [ ] Shortcuts app support

---

## Risks & Mitigations

### Risk 1: State Management Complexity

**Risk:** Managing voice and photo states simultaneously could lead to conflicts.

**Mitigation:**
- Implement clear state machine with defined transitions
- Add mutex/locking for critical operations
- Extensive testing of edge cases
- Consider queueing actions if both triggered rapidly

### Risk 2: Manager Dependency Conflicts

**Risk:** `photoLogManager` currently in DashboardView, needs to be accessible from MainTabView.

**Mitigation:**
- Promote to MainTabView level (recommended)
- Or use environment object pattern
- Update all references in DashboardView
- Test thoroughly after refactor

### Risk 3: Performance Overhead

**Risk:** Two buttons with animations could impact frame rate.

**Mitigation:**
- Use `.drawingGroup()` for complex views if needed
- Profile with Instruments
- Disable animations in Reduce Motion
- Optimize shadow rendering

### Risk 4: UX Confusion

**Risk:** Users may not understand pill contains two separate buttons.

**Mitigation:**
- Add subtle visual separator between buttons
- Provide haptic feedback specific to each button
- Clear VoiceOver labels
- Consider onboarding tooltip on first launch

### Risk 5: API Key Validation

**Risk:** Both buttons require OpenAI API key, need consistent error handling.

**Mitigation:**
- Centralize API key check in handlers
- Use same error banner for both
- Provide clear path to settings
- Consider allowing photo logging without AI (manual entry)

---

## Related Files

### Files to Create

1. `/HydrationReminder/FloatingActionPill.swift` - Main component
2. `/HydrationReminder/FloatingCameraButton.swift` - Camera button (optional, if extracted)

### Files to Modify

1. `/HydrationReminder/MainTabView.swift` - Integration point
2. `/HydrationReminder/DashboardView.swift` - Remove duplicate photo logic (optional)
3. `/HydrationReminder/ExpandableVoiceNavbar.swift` - Potential refactor of FloatingMicButton

### Files for Reference

1. `/HydrationReminder/ExpandableVoiceNavbar.swift` - FloatingMicButton implementation
2. `/HydrationReminder/VoiceCompactPill.swift` - State-based pill design
3. `/HydrationReminder/DashboardView.swift` - Photo logging logic
4. `/HydrationReminder/PhotoFoodLog.swift` - Photo data model and manager
5. `/HydrationReminder/CLAUDE.md` - Project documentation

---

## Appendix

### A. Code Snippets

**Capsule Touch Target Extension:**

```swift
extension View {
    func expandedTouchTarget(size: CGSize) -> some View {
        self
            .frame(width: size.width, height: size.height)
            .contentShape(Rectangle())
    }
}
```

**Debounce Helper:**

```swift
actor Debouncer {
    private var lastTapTime: Date = .distantPast
    private let minimumInterval: TimeInterval

    init(minimumInterval: TimeInterval = 0.5) {
        self.minimumInterval = minimumInterval
    }

    func shouldAllow() -> Bool {
        let now = Date()
        guard now.timeIntervalSince(lastTapTime) > minimumInterval else {
            return false
        }
        lastTapTime = now
        return true
    }
}
```

### B. SF Symbols

**Mic Button Icons:**
- `mic.fill` - Default recording icon
- `stop.fill` - Stop recording (current implementation uses red square)
- `waveform` - Alternative recording indicator
- `mic.slash.fill` - Microphone disabled

**Camera Button Icons:**
- `camera.fill` - Default camera icon (chosen)
- `photo.on.rectangle.angled` - Photo library icon
- `photo.fill` - Alternative photo icon
- `camera.circle.fill` - Contained camera icon

### C. Color Palette

**System Colors (Adaptive):**
- `.primary` - Black (light mode), White (dark mode)
- `.secondary` - Gray (adaptive)
- `.blue` - System blue (adaptive)
- `.orange` - System orange (adaptive)
- `.red` - System red (adaptive)
- `.green` - System green (adaptive)

**Materials:**
- `.ultraThinMaterial` - Most transparent
- `.thinMaterial`
- `.regularMaterial`
- `.thickMaterial`
- `.ultraThickMaterial` - Least transparent

### D. Animation Curves

**Spring Presets:**

```swift
// Bouncy (for emphasis)
.spring(response: 0.3, dampingFraction: 0.5)

// Natural (default)
.spring(response: 0.4, dampingFraction: 0.8)

// Smooth (for subtle transitions)
.spring(response: 0.5, dampingFraction: 1.0)
```

**Timing Curves:**

```swift
// Fast in, slow out (Material Design)
.easeOut

// Slow in, fast out
.easeIn

// Balanced
.easeInOut
```

### E. Device Safe Areas

**iPhone 15 Pro:**
- Top safe area: 59pt (status bar)
- Bottom safe area: 34pt (home indicator)
- Tab bar height: ~49pt (standard) + safe area

**iPhone SE (3rd gen):**
- Top safe area: 20pt (status bar)
- Bottom safe area: 0pt (no home indicator)
- Tab bar height: ~49pt (standard)

**FAB Position Calculation:**

```
Bottom position = Tab bar height + Safe area + Offset
                = 49pt + 34pt + 7pt (cushion)
                = 90pt
```

### F. OpenAI API Integration

**Food Analysis Endpoint:**
- Model: `gpt-4o` with vision
- Input: Base64-encoded image + prompt
- Output: Structured JSON with nutrition data
- Average latency: 2-3 seconds
- Error handling: Retry with exponential backoff

**Structured Output Schema:**

```json
{
  "items": [
    {
      "name": "string",
      "quantity": "string",
      "calories": 0,
      "protein": 0,
      "carbs": 0,
      "fat": 0
    }
  ],
  "totalCalories": 0,
  "totalProtein": 0,
  "totalCarbs": 0,
  "totalFat": 0
}
```

---

## Conclusion

This floating action button pill will streamline the user experience by providing instant access to the two most frequent actions in the Corgina app: voice logging and photo food logging. By following iOS 26 design patterns and maintaining consistency with existing components, the FAB will feel native and intuitive.

The implementation plan provides a clear path from component creation through testing and refinement, with careful attention to accessibility, performance, and error handling. The modular structure ensures maintainability and allows for future enhancements like expandable menus or additional action buttons.

**Next Steps:**
1. Review this document with the team
2. Approve design specifications
3. Begin Phase 1 implementation
4. Iterate based on testing feedback

---

**Document Version:** 1.0
**Last Updated:** November 2, 2025
**Author:** Claude Code Assistant
**Review Status:** Draft - Awaiting Approval
