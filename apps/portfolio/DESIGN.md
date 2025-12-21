# Design Language: Dual-Mode Portfolio

## Overview
Bimodal UI that adapts based on Web3 wallet detection:
1.  **Editorial Mode**: High-finance aesthetic inspired by WSJ and Colonial.vc
2.  **Technical Mode**: Retro CAD aesthetic (activates when MetaMask detected)

---

## 1. Editorial Mode

**Inspiration**: Colonial.vc, Wall Street Journal, Financial Times, High-end VC announcements.

### Core Aesthetic
*   **Background**: Pure white `#ffffff` (clean, minimal).
*   **Foreground**: Ink `#1a1a1a` (rich black, softer than pure black).
*   **Typography**:
    *   **Headlines**: `Inter` (Sans-Serif) — Massive, Black weight (900), tight tracking (`-0.04em`), ultra-tight line-height (`0.85`). ALL CAPS.
    *   **Subheads**: `Libre Baskerville` (Serif) — For editorial body text and secondary headlines. Slightly condensed tracking (`-0.03em`).
    *   **Meta/Data**: `IBM Plex Mono` — For tags, dates, stats, and technical labels. Small size (`9px`), uppercase, wide tracking.
*   **Imagery**: Grainy, analog warmth. Filter: `contrast(1.1) sepia(0.3) saturate(1.4) brightness(0.9)`.
*   **Layout**:
    *   **Page Container**: Max-width `800px`, centered, no drop shadow (clean flat design).
    *   **Separators**: Thin lines (`1px`) for list items, thick lines (`3px`) for section breaks.
    *   **Grid**: 12-column system with clear hierarchy.

### Typography Scale
| Element | Font | Weight | Size | Tracking |
|---------|------|--------|------|----------|
| Main Headline | Inter | 900 (Black) | `5xl-6xl` | `-0.04em` |
| Section Header | Inter | 900 (Black) | `3xl` | `-0.04em` |
| Project Title | Inter | 900 (Black) | `4xl-5xl` | `-0.04em` |
| Serif Subhead | Libre Baskerville | 400/700 | `32px` | `-0.03em` |
| Body Text | Libre Baskerville | 400 | `lg (18px)` | `-0.02em` |
| Meta/Labels | IBM Plex Mono | 400 | `9px` | `wider` |

### Key Components

#### Header
```
┌─────────────────────────────────────────────────┐
│ BENJAMIN          │                    Role     │
│ SHAFII            │           Crypto Builder    │
│ (massive Inter)   │                  & Founder  │
├─────────────────────────────────────────────────┤
│ ███████████████████████████████████████████████ │ (3px thick line)
```

#### Hero Section
```
┌─────────────────────────────────────────────────┐
│ Building for      │                             │
│ people who        │      [GRAINY IMAGE]         │
│ bank in dollars.  │                             │
│ (Libre Baskerville)│                            │
│                   │                             │
│ [mono description]│                             │
│ View Work ↓       │                             │
└─────────────────────────────────────────────────┘
```

#### Project Row
```
┌─────────────────────────────────────────────────┐
│ [01] — FOUNDER                    View Project →│
│                                                 │
│ 0.FINANCE                                       │
│ (massive Inter Black)                           │
│                                                 │
│ Description in Libre Baskerville...             │
├─────────────────────────────────────────────────┤ (thin separator)
```

#### Philosophy Section (Stats Layout)
```
┌─────────────────────────────────────────────────┐
│ PRODUCT PHILOSOPHY                    Why > How │
├─────────────────────────────────────────────────┤
│                                                 │
│   01              02              03            │
│   ────            ────            ────          │
│   CUSTOMER        RIGHT           TASTE &       │
│   OBSESSION       ABSTRACTIONS    METRICS       │
│                                                 │
│   [mono text      [mono text      [mono text    │
│    justified]      justified]      justified]   │
└─────────────────────────────────────────────────┘
```

---

## 2. Technical Mode (Crypto / "CAD")

**Inspiration**: AutoCAD R12 (DOS era), Sci-Fi interfaces (Alien, Evangelion), Engineering blueprints.

### Core Aesthetic
*   **Background**: Deep Space Black `#000000`.
*   **Foreground**: High-contrast Neon.
    *   Primary: Neon Green `#00FF00` (Grid, success states).
    *   Secondary: Cyan `#00FFFF` (Active elements, headers).
    *   Tertiary: Yellow `#FFFF00` (Warnings, highlights).
    *   Quaternary: Magenta `#FF00FF` (Special actions).
*   **Typography**: Strict Monospace (`Space Mono`, `IBM Plex Mono`). All caps.
*   **Visuals**:
    *   **3D Elements**: Wireframe meshes (rotating models) rendered with Three.js.
    *   **HUD**: Overlays, measuring lines, corner brackets.
    *   **CRT Effects**: Scanlines, chromatic aberration, noise.

### Key Components
*   **Viewport**: The entire screen is a 3D viewport with HUD controls.
*   **Navigation**: Sidebar menu or scrolling sections.
*   **Data**: Presented as terminal output with technical annotations.

### Navigation Style (Desktop Sidebar & Mobile Bottom Nav)
Both desktop and mobile navigation share the same CAD/ACAD aesthetic:
*   **Background**: ACAD Blue `#0000AA`
*   **Border**: Cyan `#00FFFF` (2px)
*   **Active State**: Cyan background `#00FFFF`, Blue text `#0000AA`
*   **Inactive State**: Blue background `#0000AA`, White text `#FFFFFF`
*   **Typography**: Monospace, uppercase, bold, 11px (mobile) / 14px (desktop)

---

## 3. Shared Architecture

### Content
*   **Single Source of Truth**: Content in `src/data-raw.ts`
*   **UI Labels**: Configurable visibility flags for sections

### Functional Logic
*   **Wallet Detection**: `window.ethereum` check on mount. If present → Auto-switch to Technical Mode
*   **Manual Toggle**: Inline "dollars/crypto" text toggle
*   **Print Support**: Clean layout via `@media print`

---

## Implementation Guidelines

### Fonts (Google Fonts)
```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Libre+Baskerville:wght@400;700&family=IBM+Plex+Mono:wght@400;500;700&family=Space+Mono:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet">
```

### Tailwind Config
```js
fontFamily: {
  sans: ['Inter', 'sans-serif'],
  serif: ['"Libre Baskerville"', 'serif'],
  mono: ['"IBM Plex Mono"', 'monospace'],
  'space': ['"Space Mono"', 'monospace'],
},
colors: {
  paper: '#ffffff',
  ink: '#1a1a1a',
}
```

### CSS Classes (Editorial)
```css
.headline-sans {
  font-family: 'Inter', sans-serif;
  letter-spacing: -0.04em;
  line-height: 0.85;
}
.serif-body {
  font-family: 'Libre Baskerville', serif;
  letter-spacing: -0.02em;
  line-height: 1.3;
}
.type-mono {
  font-family: 'IBM Plex Mono', monospace;
  letter-spacing: -0.02em;
}
```

### 3D Stack
*   **Engine**: React Three Fiber (R3F).
*   **Post-Processing**: `react-postprocessing` (Bloom, Noise, Glitch).
*   **Models**: GLTF/GLB wireframes.

---
