# openjob

A scheduler and runner for [OpenCode](https://opencode.ai) prompts.

## Philosophy

**The prompt is the workflow.** You define what to do, when to run it, and what agents to use - all in a single markdown file. openjob just handles the scheduling, execution, and job history.

```markdown
---
schedule: "0 9 * * *"
---

@fb-marketplace Find standing desks under $300 in SF
@telegram Send me the top 3 deals
```

That's a complete job definition. OpenCode handles all the orchestration - running agents in sequence or parallel, passing data between them, retrying on failure. openjob adds:

- **Scheduling** - Run prompts on a cron schedule
- **Persistence** - Save prompts, track job history
- **UI** - TUI and web interface for managing jobs
- **Tmux integration** - Attach to running jobs, detach and reattach

**No workflow code.** No DAGs. No YAML pipelines. The prompt *is* the source of truth.

## How It Works

1. You write a prompt with `@agent` tags
2. openjob saves it and runs it (now or on schedule)
3. OpenCode executes the prompt, invoking agents as needed
4. openjob records success/failure and keeps logs

What agents do with their output is up to them - write files, send notifications, update databases. openjob doesn't care. It just runs prompts and tracks jobs.

## Requirements

- [OpenCode](https://opencode.ai) CLI (`opencode`)
- [tmux](https://github.com/tmux/tmux) for job sessions
- [Bun](https://bun.sh) runtime

## Installation

### Quick Install

```bash
curl -fsSL https://raw.githubusercontent.com/benjaminshafii/digital-empire/master/packages/openjob/install.sh | bash
```

### From Source

```bash
cd packages/openjob
bun install
bun run build
cp dist/openjob ~/.local/bin/
```

## Usage

### Interactive TUI

```bash
openjob
```

Type a prompt with `@agent` tags. Press Enter to run, Ctrl+S to schedule.

**Keyboard Shortcuts:**

| Key | Action |
|-----|--------|
| `Enter` | Run job and attach to tmux |
| `Ctrl+B` | Run job in background |
| `Ctrl+S` | Schedule job |
| `Tab` | Autocomplete @agent |
| `Ctrl+A` | Cursor to start |
| `Ctrl+E` | Cursor to end |
| `Ctrl+W` | Delete word |
| `Ctrl+C` | Exit |

### Commands

```bash
openjob                 # Interactive TUI
openjob serve           # Web UI + scheduler
openjob list            # List saved jobs
openjob run <slug>      # Run a job
openjob watch [job-id]  # Attach to running job
openjob cancel [job-id] # Cancel a job
openjob delete <slug>   # Delete a job
```

## Agents

Agents are markdown files in `.opencode/agent/` (project) or `~/.config/opencode/agent/` (global):

```markdown
---
description: Finds deals on Facebook Marketplace
model: anthropic/claude-sonnet-4-20250514
tools:
  chrome_navigate_page: true
  chrome_take_screenshot: true
---

You are a Facebook Marketplace deal finder...
```

Reference them in prompts with `@agent-name`. The TUI autocompletes from available agents.

## Scheduling

Jobs can include a schedule in frontmatter:

```markdown
---
schedule: "0 9 * * *"
---

@my-agent Do the thing
```

Or set via TUI (Ctrl+S) or SDK:

```typescript
createSearch({ name: "Daily job", prompt: "...", schedule: "0 9 * * *" })
```

**Common schedules:**

| Cron | Description |
|------|-------------|
| `0 */2 * * *` | Every 2 hours |
| `0 9 * * *` | Daily at 9 AM |
| `0 9 * * 1` | Weekly on Monday |

## SDK

```typescript
import { setDataDir, createSearch, startJob, startScheduler } from "openjob";

setDataDir("./data");

const search = createSearch({
  name: "My job",
  prompt: "@agent Do something",
  schedule: "0 9 * * *",
});

await startJob(search.slug);

startScheduler(); // For cron jobs
```

See [`apps/marketplace-tracker`](../../apps/marketplace-tracker) for a full example.

## Data Directory

```
data/
├── queue.json              # Job queue state
└── searches/
    └── my-job/
        ├── config.json     # Metadata + schedule
        ├── prompt.md       # The prompt
        └── jobs/
            └── <job-id>/
                ├── meta.json   # Status, timestamps
                ├── output.log  # Tmux output
                └── DONE        # Completion marker
```

## License

MIT
