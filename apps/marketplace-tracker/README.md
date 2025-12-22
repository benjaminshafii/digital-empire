# mkt - Marketplace Tracker

Automate Facebook Marketplace searches with AI.

## Install

```bash
# From source (requires bun)
cd apps/marketplace-tracker
bun install
bun run build
cp dist/mkt ~/.local/bin/
```

Or run directly:

```bash
bun run dev --help
```

## Quick Start

```bash
# Create a search
mkt add "speakers" --prompt "Good speaker + amp combo, under $400"

# Run it (opens in tmux, you can watch live)
mkt run speakers --attach

# Check status
mkt jobs

# View results
mkt show speakers
```

## Commands

```bash
mkt add <name>              # Create a new saved search
mkt list                    # List all saved searches
mkt run <slug>              # Run a search
mkt run <slug> --attach     # Run and watch live
mkt run --all               # Run all searches
mkt jobs                    # List recent jobs
mkt watch [job-id]          # Attach to running job
mkt show <slug>             # View latest report
mkt delete <slug>           # Delete a search
mkt schedule set <slug> <cron>  # Set schedule
mkt schedule list           # List scheduled
mkt schedule install        # Generate cron config
```

## How It Works

1. **Searches** are saved configurations (what to search, where)
2. **Jobs** run in **tmux sessions** via opencode's fb-marketplace agent
3. You can watch live (`mkt watch`) or let it run in background
4. **Reports** are extracted and saved as markdown
5. **Cron** can trigger runs on a schedule

## Storage

```
~/.config/marketplace-tracker/
├── queue.json                    # Job queue state
└── searches/
    └── speakers/
        ├── config.json           # Search config
        └── jobs/
            └── abc123/
                ├── meta.json     # Job metadata
                ├── output.log    # Raw output
                └── report.md     # Report
```

## Requirements

- [opencode](https://opencode.ai) - for the fb-marketplace agent
- tmux - for job sessions (`brew install tmux`)
- bun - for building (optional, binaries coming soon)

## Architecture

```
┌────────────────────────────────────────┐
│  mkt CLI (Bun standalone binary)       │
├────────────────────────────────────────┤
│  Core: SearchStore, JobStore, Runner   │
├────────────────────────────────────────┤
│  tmux sessions                         │
├────────────────────────────────────────┤
│  opencode --agent fb-marketplace       │
└────────────────────────────────────────┘
```

The CLI is a thin wrapper around opencode. It:
- Stores search configurations
- Manages job queue (sequential to avoid Chrome conflicts)
- Runs opencode in tmux for visibility
- Extracts reports from output

## JSON Output

All commands support `--json` for scripting:

```bash
mkt list --json | jq '.[].slug'
mkt jobs --json | jq 'map(select(.status == "running"))'
mkt show speakers --json | jq '.report'
```

## Scheduling

```bash
# Set a daily schedule
mkt schedule set speakers "0 9 * * *"

# Generate cron config
mkt schedule install

# Add to crontab
crontab -e
# paste the generated line
```
