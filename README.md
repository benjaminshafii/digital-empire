# Ben's Super App Monorepo

Everything I build lives here. Web apps, iOS apps, watchOS apps, random experiments.

I've been in crypto since 2018. Founded [0.finance](https://0.finance) (OSS bank for businesses), and built [Note Companion](https://github.com/different-ai/obsidian-file-organizer-2000) (OSS plugin to keep your files organized, now acquired).

## Apps

| App | What it actually does |
|-----|----------------------|
| [**digital-garden**](./apps/portfolio) | Showcase of projects and experiments with Three.js, splats, and various frontend tech. |
| [**blog**](./apps/blog) + [**obsidian-plugin**](./apps/obsidian-plugin) | Astro-based Obsidian publisher. Write in Obsidian, add `publish: true` to frontmatter, plugin syncs to GitHub → Astro rebuilds. Transforms `[[wiki-links]]` to proper URLs. |
| [**photo-to-splat**](./apps/photo-to-splat) | Upload a single photo → get a 3D Gaussian Splat you can explore in browser. Uses Apple's SHARP neural network. Apple Silicon only (runs on MPS). |
| [**ha-watch**](./apps/ha-watch) | Voice-control Home Assistant from your Apple Watch. Uses iOS 26 SpeechAnalyzer for on-device transcription. "Turn on kitchen lights" from your wrist, no phone needed. |
| [**corgina**](./apps/pregnancy) | Voice-first pregnancy health tracker. Say "I ate tahini for lunch" and it logs the meal with AI-estimated nutrition (GPT-4o). Bring your own API key. [TestFlight](https://testflight.apple.com/join/5HV3CJ7x) available. |
| [**workout**](./apps/workout) | **Phoneless Hevy** - Log gym workouts entirely by voice on Apple Watch. No phone mid-workout. Syncs to Hevy. watchOS 26 Liquid Glass UI. |
| [**marketplace-tracker**](./apps/marketplace-tracker) | CLI wrapper around an OpenCode agent specialized for finding Facebook Marketplace deals. Automates the search so you don't have to. |

## Quick Start

### Prerequisites

- **Node.js** 18+ and **pnpm** for web projects
- **Xcode 15+** for iOS/watchOS projects
- **Python 3.11+** for photo-to-splat backend

### Web Projects

```bash
# Install dependencies
pnpm install

# Run digital-garden dev server
pnpm --filter @digital-empire/portfolio dev

# Run blog dev server
pnpm --filter @digital-empire/blog dev

# Build all
pnpm build
```

### iOS/watchOS Projects

Open the `.xcodeproj` file in Xcode:

```bash
# Home Assistant Watch App
open apps/ha-watch/HA\ Watch\ App.xcodeproj

# Pregnancy Tracking App (Corgina)
open apps/pregnancy/HydrationReminder/HydrationReminder.xcodeproj

# Workout Tracker (Phoneless Hevy)
open apps/workout/phoneless-hevy.xcodeproj
```

## Environment Variables

Some apps require API keys. Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

See [.env.example](./.env.example) for required variables.

## Project Structure

```
.
├── apps/
│   ├── blog/                 # Astro publisher (works with obsidian-plugin)
│   ├── ha-watch/             # Home Assistant watchOS voice control
│   ├── marketplace-tracker/  # OpenCode agent CLI for FB Marketplace
│   ├── obsidian-plugin/      # Obsidian → blog sync plugin
│   ├── photo-to-splat/       # Single photo → 3D Gaussian Splat
│   ├── portfolio/            # digital-garden - dual-mode personal website
│   ├── pregnancy/            # Corgina - voice-first pregnancy tracker
│   └── workout/              # Phoneless Hevy - watchOS workout logger
├── .opencode/agent/          # AI agent configs
├── turbo.json                # Turborepo config
├── pnpm-workspace.yaml       # pnpm workspace config
└── README.md
```

## Tech Stack Overview

### Web
- **React** + **Vite** for digital-garden
- **Astro** for blog/Obsidian publisher
- **Three.js** / **Gaussian Splatting** for 3D
- **Tailwind CSS** for styling

### Mobile (iOS/watchOS)
- **Swift** + **SwiftUI**
- **HealthKit** for fitness data
- **Keychain** for secure credential storage

### Backend
- **Python** + **FastAPI** for ML services
- **Node.js** for CLI tools

## License

MIT for most things. Check individual app READMEs.

---

Built with mass amounts of mass by [Benjamin Shafii](https://github.com/benjaminshafii)
