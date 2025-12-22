# mkt - Marketplace Tracker

Facebook Marketplace deal finder built on [`opencode-job-runner`](../../packages/job-runner).

## Install

```bash
cd apps/marketplace-tracker
pnpm install
```

## Quick Start

```bash
# Create a search
bun run src/cli.ts add -p "Standing desk under 300, prefer electric"

# Run it (opens in tmux)
bun run src/cli.ts run standing-desk

# Watch the job
bun run src/cli.ts run standing-desk --attach

# Check status
bun run src/cli.ts jobs

# View results
bun run src/cli.ts show standing-desk
```

## Web UI

```bash
bun run src/server.ts
# Open http://localhost:3456
```

Features:
- Dashboard with all searches and job status
- Add new searches
- Run searches with one click
- View/edit prompts
- View reports with rendered markdown and clickable links
- Cancel running jobs, clear queue

## CLI Commands

```bash
# Searches
bun run src/cli.ts add -p "query"       # Create search (FB Marketplace template)
bun run src/cli.ts add -r -p "prompt"   # Create search (raw prompt, custom agent)
bun run src/cli.ts list                 # List all searches
bun run src/cli.ts show <slug>          # View latest report
bun run src/cli.ts edit <slug>          # Edit the prompt.md file
bun run src/cli.ts delete <slug>        # Delete a search

# Jobs
bun run src/cli.ts run <slug>           # Queue and run a search
bun run src/cli.ts run <slug> --attach  # Run and attach to tmux
bun run src/cli.ts jobs                 # List recent jobs
bun run src/cli.ts cancel               # Cancel running job

# Scheduling
bun run src/cli.ts schedule set <slug> <cron>  # Set cron schedule
bun run src/cli.ts schedule list               # List scheduled searches
```

## How It Works

This app is a thin wrapper around `opencode-job-runner`:

```typescript
// src/cli.ts
import { setDataDir } from "opencode-job-runner";
setDataDir(join(appDir, "data"));

const { main } = await import("opencode-job-runner/cli");
main();
```

The job-runner handles:
1. **Searches** - saved as `prompt.md` files with `@fb-marketplace` agent
2. **Jobs** - run sequentially in tmux sessions via OpenCode
3. **Queue** - prevents Chrome/browser conflicts
4. **Reports** - extracted as markdown with clickable links

## Prompt Format

Each search has a `prompt.md` in `data/searches/<slug>/prompt.md`:

```markdown
@fb-marketplace

Find deals matching: Standing desk under $300

Location: San Francisco Bay Area

Requirements:
- Electric/motorized preferred
- Good condition
- Local pickup

Write your findings to: {{reportPath}}
```

- `@fb-marketplace` - specifies the OpenCode agent
- `{{reportPath}}` - replaced with actual output path at runtime

## Storage

```
data/
├── queue.json
└── searches/
    └── standing-desk/
        ├── config.json      # Search metadata
        ├── prompt.md        # Agent prompt (source of truth)
        └── jobs/
            └── <job-id>/
                ├── job.json   # Job metadata
                ├── log.txt    # tmux output
                └── report.md  # Agent findings
```

## Requirements

- [OpenCode](https://opencode.ai) with `fb-marketplace` agent configured
- [tmux](https://github.com/tmux/tmux) for job sessions
- [Bun](https://bun.sh) runtime

## Report Format

Reports include:
- **Top Picks** with direct Facebook Marketplace links
- **Other Options** in table format
- **What to Avoid** - overpriced or sketchy listings
- Seller info, condition, price history when available

Example:
```markdown
## Top Picks

### 1. [Standing Desk - $150](https://www.facebook.com/marketplace/item/123...)
- **Seller:** John (15 ratings)
- **Condition:** Like New
- **Why it's great:** Electric, height adjustable, was $300 new
```

## Building Your Own App

Use this as a template! See [`opencode-job-runner`](../../packages/job-runner) for how to build apps with different agents.
