# Agent Instructions for HydrationReminder Project

## Critical Design Requirements

### iOS 26 Design System (Released September 2025)
**MANDATORY**: All UI/UX implementations MUST follow iOS 26 design patterns and guidelines.

#### Liquid Glass Design Language
- **Material**: Use `.ultraThinMaterial` with subtle border overlays (`.blendMode(.overlay)`)
- **Corner Radius**: Modern, pill-like aesthetic with 24-32pt continuous corners
- **Shadows**: Soft, diffused shadows (radius 12-20, opacity 0.06-0.12)
- **Borders**: Subtle white/light borders (0.5-1pt, opacity 0.1-0.3) for depth

#### Morphing & Fluid Animations
- **matchedGeometryEffect**: Always use for component transformations
- **Spring Physics**: `.spring(response: 0.4-0.5, dampingFraction: 0.75-0.85)`
- **Organic Expansion**: Scale transitions from anchor points (e.g., `.bottomTrailing`)
- **Asymmetric Transitions**: Different scales for insertion/removal for breathing effect

#### Motion Design Principles
1. **Adaptivity**: Animations respond to user context and state
2. **Connectivity**: Smooth navigation between states with visual continuity
3. **Perceptibility**: Clear, meaningful feedback through motion

#### Component Patterns
- **Floating Action Buttons**: 56-72pt glass circles with ultraThin material
- **Expandable Controls**: Morph from button → drawer using matched geometry
- **Toolbars**: Liquid Glass with adaptive blur and context-aware actions
- **Progress Indicators**: Capsule-based progress bars with subtle animations

### References for iOS 26
- WWDC 2025 Session 219: "Meet Liquid Glass"
- WWDC 2025 Session 323: "Build a SwiftUI app with the new design"
- Apple HIG Materials: https://developer.apple.com/design/human-interface-guidelines/materials
- Kavsoft iOS 26 tutorials: Liquid Glass morphing effects

## Voice Logging Feature Requirements

### Interaction States
1. **Idle**: Floating button visible, tap to start recording
2. **Recording**: Button morphs to show recording state, tap to stop
3. **Analyzing**: Drawer expands from button position, shows processing
4. **Executing**: Creating logs with progress feedback
5. **Completed**: Success state with action cards, auto-dismiss after 4s

### Critical Rules
- Button MUST be tappable during recording to allow stopping
- Use matched geometry effect for ALL state transitions
- Maintain glass aesthetic throughout all states
- Spring animations for natural, fluid feel
- Clear visual hierarchy: icon → status → detail

## Code Quality Standards
- SwiftUI declarative patterns
- No force unwrapping
- Proper error handling
- Meaningful print statements for debugging
- Follow Swift naming conventions

## When Making Changes
1. Always check for iOS 26 design compliance
2. Use matched geometry for transformations
3. Test all interaction states
4. Verify animations feel organic and fluid
5. Ensure accessibility considerations
