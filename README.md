# Digital Empire

A self-improving AI-powered home automation and productivity system. Everything I build lives here.

## Philosophy

**Being productive in 2026 is about:**
- Spending more time thinking and writing
- Spending less time clicking and context switching
- Creating self-improving systems

This repo follows core principles: **self-building**, **self-improving**, **self-fixing**, **reconstructable**, **portable**, **open-source**, **standards-first**, and **graceful degradation**.

See [AGENTS.md](./AGENTS.md) for the full manifesto.

---

## Apps

| App | What it does |
|-----|-------------|
| [**portfolio**](./apps/portfolio) | Digital garden with Three.js, splats, and frontend experiments |
| [**blog**](./apps/blog) + [**obsidian-plugin**](./apps/obsidian-plugin) | Astro-based Obsidian publisher. Write → `publish: true` → auto-deploys |
| [**photo-to-splat**](./apps/photo-to-splat) | Single photo → 3D Gaussian Splat (Apple Silicon) |
| [**ha-watch**](./apps/ha-watch) | Voice-control Home Assistant from Apple Watch |
| [**corgina**](./apps/pregnancy) | Voice-first pregnancy tracker with AI nutrition estimates |
| [**workout**](./apps/workout) | Phoneless Hevy - log gym workouts by voice on Apple Watch |

## OpenCode Skills

The `.opencode/skill/` directory contains AI-readable documentation for integrating with services:

| Skill | Purpose |
|-------|---------|
| `bitwarden` | Credential management via CLI |
| `qbittorrent` | Torrent downloads via Web UI API |
| `home-assistant` | Smart home control via REST API |
| `telegram` | Notifications via bot API |
| `self-improve` | Meta-skill for AI self-improvement |

Skills guide the AI to obtain credentials when missing. See `.opencode/skill/README.md`.

---

## Quick Start

### Prerequisites

- **Node.js** 18+ and **pnpm** for web projects
- **Xcode 15+** for iOS/watchOS projects
- **Python 3.11+** for photo-to-splat backend

### Web Projects

```bash
pnpm install
pnpm --filter @digital-empire/portfolio dev
pnpm --filter @digital-empire/blog dev
```

### iOS/watchOS Projects

```bash
open apps/ha-watch/HA\ Watch\ App.xcodeproj
open apps/pregnancy/HydrationReminder/HydrationReminder.xcodeproj
open apps/workout/phoneless-hevy.xcodeproj
```

### Environment Variables

```bash
cp .env.example .env
# Fill in your values
```

---

## Project Structure

```
.
├── apps/
│   ├── blog/                 # Astro Obsidian publisher
│   ├── ha-watch/             # Home Assistant watchOS
│   ├── obsidian-plugin/      # Obsidian → blog sync
│   ├── photo-to-splat/       # Photo → 3D splat
│   ├── portfolio/            # Digital garden
│   ├── pregnancy/            # Corgina health tracker
│   └── workout/              # Phoneless Hevy
├── .opencode/
│   ├── skill/                # AI skills (service integrations)
│   └── agent/                # Custom AI agents
├── AGENTS.md                 # Project manifesto & AI instructions
└── opencode.json             # OpenCode config
```

## Tech Stack

**Web:** React, Vite, Astro, Three.js, Tailwind  
**Mobile:** Swift, SwiftUI, HealthKit  
**Backend:** Python, FastAPI, Node.js  
**AI:** OpenCode, Claude Opus, Chrome MCP

## License

MIT for most things. Check individual app READMEs.

---

Built by [Benjamin Shafii](https://github.com/benjaminshafii)
