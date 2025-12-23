# openjob

A generic job orchestrator for running and scheduling [OpenCode](https://opencode.ai) agent prompts.

**openjob** lets you create reusable AI agent jobs, run them on demand or on a schedule, and track their outputs. It uses tmux for live session management and supports both an interactive TUI and a web UI.

## Features

- **Interactive TUI** - Type prompts with `@agent` autocomplete, run jobs instantly
- **Cron Scheduling** - Schedule jobs to run automatically (e.g., "every 4 hours", "daily at 9 AM")
- **Tmux Integration** - Attach to running jobs live, detach and reattach anytime
- **Web UI** - Optional web interface for managing jobs
- **Queue System** - Jobs run sequentially to avoid conflicts
- **Template Variables** - Use `{{reportPath}}`, `{{searchSlug}}`, `{{jobId}}` in prompts
- **SDK** - Build custom apps on top of openjob (see [marketplace-tracker example](../../apps/marketplace-tracker))

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

### Development

```bash
# Run the TUI directly
bun run src/cli/index.ts

# Or run the web server
bun run src/web/index.ts
```

## CLI Usage

### Interactive Mode (Default)

Just run `openjob` to enter the interactive TUI:

```bash
openjob
```

**TUI Keyboard Shortcuts:**

| Key | Action |
|-----|--------|
| `Enter` | Run job and attach to tmux |
| `Ctrl+B` | Run job in background |
| `Ctrl+S` | Schedule job (pick interval) |
| `Ctrl+W` | Toggle web server + scheduler |
| `Tab` | Autocomplete @agent |
| `↑/↓` | Navigate suggestions |
| `Ctrl+C` | Exit |

**Example:**

```
> @fb-marketplace Find standing desks under $300 in SF
```

Type a prompt with an optional `@agent` prefix. The agent name autocompletes from `.opencode/agent/*.md` files in your project.

### Commands

```bash
# Start interactive TUI (default)
openjob

# Start web UI + scheduler
openjob serve [--port 3456]

# List all saved jobs
openjob list

# Run a job by slug
openjob run <slug>

# View recent job runs
openjob jobs [slug]

# Attach to a running job's tmux session
openjob watch [job-id]

# View the latest report
openjob show <slug>

# Delete a job and its history
openjob delete <slug>

# Cancel running or queued jobs
openjob cancel [job-id]

# Fix orphaned job statuses
openjob sync
```

### Options

```bash
-h, --help          Show help message
-v, --version       Show version
-d, --data <dir>    Set data directory (default: ./data)
```

## Prompt Files

Each job is defined by a `prompt.md` file. The prompt is the source of truth - it can reference any OpenCode agents via `@agent` syntax.

### Template Variables

| Variable | Description |
|----------|-------------|
| `{{reportPath}}` | Absolute path to the job's `report.md` output file |
| `{{searchSlug}}` | URL-friendly identifier for the search |
| `{{jobId}}` | Unique identifier for this job run |

### Example Prompt

```markdown
@fb-marketplace

Find deals matching: Standing desk under $300

Location: San Francisco Bay Area

Write your findings to: {{reportPath}}
```

## Scheduling

Jobs can be scheduled using standard cron expressions:

```bash
# Via CLI
openjob       # Use Ctrl+S in TUI to pick a schedule

# Via SDK
createSearch({ name: "Daily Deals", prompt: "...", schedule: "0 9 * * *" })
```

**Common Schedules:**

| Cron | Description |
|------|-------------|
| `0 */2 * * *` | Every 2 hours |
| `0 */4 * * *` | Every 4 hours |
| `0 9 * * *` | Daily at 9 AM |
| `0 18 * * *` | Daily at 6 PM |
| `0 9 * * 1` | Weekly on Monday at 9 AM |

The scheduler checks every minute and runs jobs that match their cron schedule. Jobs won't double-run within the same minute.

## Data Directory

By default, data is stored in `./data/` relative to your current directory:

```
data/
├── queue.json                    # Job queue state
└── searches/
    └── standing-desk/            # One folder per saved search
        ├── config.json           # Search metadata + schedule
        ├── prompt.md             # Agent prompt (source of truth)
        └── jobs/
            └── <job-id>/         # One folder per job run
                ├── meta.json     # Job status, timestamps
                ├── prompt.txt    # Processed prompt (variables replaced)
                ├── run.sh        # Shell script that ran
                ├── output.log    # Tmux session output
                ├── report.md     # Agent output
                └── DONE          # Completion marker
```

---

# SDK

Use the SDK to build custom apps on top of openjob.

## Install

```bash
pnpm add openjob
# or
bun add openjob
```

## Quick Start

```typescript
import { 
  setDataDir, 
  createSearch, 
  startJob, 
  startScheduler,
  ensureDataDirs 
} from "openjob";
import { join } from "path";

// 1. Set data directory
setDataDir(join(import.meta.dir, "data"));
ensureDataDirs();

// 2. Create a search with a prompt
const search = createSearch({
  name: "Standing desk deals",
  prompt: `@fb-marketplace
Find standing desks under $300 in SF.
Save report to: {{reportPath}}`,
  schedule: "0 9 * * *", // Optional: daily at 9 AM
});

// 3. Run the job
const job = await startJob(search.slug, {
  onComplete: (result) => {
    console.log("Job finished:", result.job.status);
    if (result.report) {
      console.log("Report:", result.report);
    }
  },
});

console.log(`Started job ${job.id}`);
console.log(`Attach with: tmux attach -t job-${job.id}`);

// 4. Start the scheduler (for cron jobs)
startScheduler();
```

## API Reference

### Configuration

```typescript
import { setDataDir, getDataDir, ensureDataDirs } from "openjob";

// Set where job data is stored
setDataDir("/path/to/data");

// Get current data directory
const dir = getDataDir();

// Ensure directories exist
ensureDataDirs();
```

### Search CRUD

```typescript
import {
  createSearch,
  getSearch,
  listSearches,
  updateSearch,
  deleteSearch,
  searchExists,
  slugify,
  getPrompt,
  updatePrompt,
} from "openjob";

// Create a new search
const search = createSearch({
  name: "My Job",
  prompt: "@agent Do something\nSave to: {{reportPath}}",
  schedule: "0 */4 * * *", // Optional cron
});

// Get a search by slug
const found = getSearch("my-job");

// List all searches
const searches = listSearches();

// Update search metadata
updateSearch("my-job", { schedule: "0 9 * * *" });

// Update the prompt
updatePrompt("my-job", "New prompt content...");

// Delete a search and all its jobs
deleteSearch("my-job");

// Check if slug exists
if (searchExists("my-job")) { ... }

// Generate a slug from text
const slug = slugify("My Cool Job"); // "my-cool-job"
```

### Job Operations

```typescript
import {
  startJob,
  cancelJob,
  cancelJobWatcher,
  getRunningJob,
  attachToJob,
  getAttachCommand,
} from "openjob";

// Start a job
const job = await startJob("my-search", {
  attach: false, // Don't auto-attach to tmux
  onStart: (job) => console.log("Started:", job.id),
  onComplete: (result) => console.log("Done:", result.job.status),
});

// Get the currently running job
const running = getRunningJob();
if (running) {
  console.log(`Running: ${running.searchSlug} - ${running.job.id}`);
}

// Cancel a job
cancelJob("my-search", "job-id");

// Cancel just the watcher (used when deleting searches)
cancelJobWatcher("job-id");

// Attach to a running job's tmux session
attachToJob("job-id");

// Get the tmux attach command
const cmd = getAttachCommand("job-id"); // "tmux attach -t job-abc123"
```

### Job Store

```typescript
import {
  getJob,
  listJobsForSearch,
  listAllJobs,
  updateJob,
  deleteJob,
  getJobLog,
  getJobReport,
  saveJobReport,
  getLatestJob,
} from "openjob";

// Get a specific job
const job = getJob("my-search", "job-id");

// List jobs for a search (newest first)
const jobs = listJobsForSearch("my-search");

// List all recent jobs across all searches
const allJobs = listAllJobs(20); // limit 20

// Update job metadata
updateJob("my-search", "job-id", { 
  title: "AI-generated title",
  status: "completed",
});

// Get job output
const log = getJobLog("my-search", "job-id");
const report = getJobReport("my-search", "job-id");

// Get the latest completed job
const latest = getLatestJob("my-search");
```

### Queue Management

```typescript
import {
  getQueueState,
  addToQueue,
  removeFromQueue,
  setCurrentJob,
  clearQueue,
} from "openjob";

// Get queue state
const state = getQueueState();
console.log("Current job:", state.currentJobId);
console.log("Queued:", state.queue);

// Clear all queued jobs (marks them as cancelled)
clearQueue();
```

### Scheduler

```typescript
import {
  startScheduler,
  stopScheduler,
  isSchedulerActive,
  getNextRunDescription,
} from "openjob";

// Start the scheduler (checks every minute)
startScheduler();

// Check if scheduler is running
if (isSchedulerActive()) {
  console.log("Scheduler is on");
}

// Get human-readable schedule description
const desc = getNextRunDescription("0 9 * * *"); // "Daily at 9 AM"

// Stop the scheduler
stopScheduler();
```

### Types

```typescript
import type {
  Search,
  Job,
  JobResult,
  QueueState,
  CreateSearchOptions,
  RunJobOptions,
} from "openjob";

interface Search {
  slug: string;
  name: string;
  schedule?: string;
  createdAt: string;
  updatedAt?: string;
}

interface Job {
  id: string;
  searchSlug: string;
  status: "queued" | "running" | "completed" | "failed" | "cancelled";
  title?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  tmuxSession?: string;
}

interface JobResult {
  job: Job;
  report?: string;
  logFile?: string;
}
```

## Web Server

openjob includes an optional web UI:

```typescript
import { createServer } from "openjob/web";

const server = createServer({ 
  port: 3456, 
  scheduler: true  // Also start the cron scheduler
});

// Later: stop the scheduler
server.stopScheduler();
```

Or via CLI:

```bash
openjob serve --port 3456
```

## Example App

See [`apps/marketplace-tracker`](../../apps/marketplace-tracker) for a complete example app built with openjob. It demonstrates:

- Custom web UI with Hono
- Building prompts programmatically
- Multi-agent chains (`@fb-marketplace` → `@title` → `@telegram`)
- Telegram notifications
- Schedule management via web interface

## Tmux Commands

Jobs run in tmux sessions named `job-<id>`. Useful commands:

```bash
# List all job sessions
tmux list-sessions | grep ^job-

# Attach to a session
tmux attach -t job-abc123

# Detach from session (while attached)
Ctrl+B, D

# Kill a session
tmux kill-session -t job-abc123
```

## License

MIT
