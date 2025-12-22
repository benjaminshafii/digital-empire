# @cool-website/job-runner

Generic OpenCode job orchestrator - run and schedule agent jobs with prompt files as the source of truth.

## Features

- **Prompt-driven**: Each search has a `prompt.md` file that defines what the agent does
- **Agent-agnostic**: Use `@agent-name` syntax in prompts to specify any OpenCode agent
- **Queue system**: Jobs queue up and run sequentially via tmux
- **Web dashboard**: View searches, jobs, and reports in a browser
- **Scheduling**: Optional cron-based job scheduling

## Installation

```bash
pnpm add @cool-website/job-runner
```

## Quick Start

### 1. Create your app entry points

**CLI (`src/cli.ts`):**

```typescript
#!/usr/bin/env bun
import { join, dirname } from "path";
import { setDataDir } from "@cool-website/job-runner";

// Set data directory relative to your app
const appDir = dirname(dirname(new URL(import.meta.url).pathname));
setDataDir(join(appDir, "data"));

// Import and run the CLI
const { main } = await import("@cool-website/job-runner/cli");
main();
```

**Web server (`src/server.ts`):**

```typescript
#!/usr/bin/env bun
import { join, dirname } from "path";
import { setDataDir } from "@cool-website/job-runner";
import { createServer } from "@cool-website/job-runner/web";

const appDir = dirname(dirname(new URL(import.meta.url).pathname));
setDataDir(join(appDir, "data"));

export default createServer({
  port: 3456,
  scheduler: true,  // Enable cron scheduling
  name: "My App",   // Dashboard title
});
```

### 2. Add a search

```bash
# Using default FB Marketplace template
bun run src/cli.ts add -p "Standing desk under 300"

# Using raw prompt mode for custom agents
bun run src/cli.ts add -r -p "@my-agent Find me the best deals"
```

### 3. Run jobs

```bash
# Queue a job for a search
bun run src/cli.ts run desk

# Attach to running job
bun run src/cli.ts run desk --attach
```

### 4. View results

```bash
# Start web dashboard
bun run src/server.ts

# Open http://localhost:3456
```

## Prompt Files

Each search has a `prompt.md` file in `data/searches/<slug>/prompt.md`. This is the source of truth for what the agent does.

### Variables

- `{{reportPath}}` - Replaced with the actual output file path when running

### Agent Selection

Use `@agent-name` anywhere in your prompt to specify which agent runs the job:

```markdown
@fb-marketplace

Find deals matching: Standing desk under $300

Location: San Francisco Bay Area

Write your findings to: {{reportPath}}
```

### Example Prompts

**Facebook Marketplace:**
```markdown
@fb-marketplace

Find: Herman Miller Aeron chair
Budget: Under $500
Location: NYC metro area

Save results to {{reportPath}}
```

**Custom Research Agent:**
```markdown
@research-agent

Research the top 10 productivity apps for developers in 2024.
Compare pricing, features, and user reviews.

Output a markdown report to {{reportPath}}
```

## CLI Commands

| Command | Description |
|---------|-------------|
| `add -p "query"` | Create a new search with FB Marketplace template |
| `add -r -p "prompt"` | Create search with raw prompt (no template) |
| `list` | List all searches |
| `show <slug>` | Show search details |
| `edit <slug>` | Edit the prompt.md file |
| `run <slug>` | Queue and run a job |
| `run <slug> --attach` | Run and attach to tmux session |
| `jobs [slug]` | List jobs (all or for specific search) |
| `cancel` | Cancel the currently running job |
| `delete <slug>` | Delete a search and all its jobs |

## Package Exports

### Core (`@cool-website/job-runner`)

```typescript
import {
  // Configuration
  setDataDir,
  getDataDir,
  
  // Search CRUD
  createSearch,
  getSearch,
  listSearches,
  updateSearch,
  deleteSearch,
  getPrompt,
  updatePrompt,
  
  // Job CRUD
  createJob,
  getJob,
  listJobsForSearch,
  getJobReport,
  
  // Queue
  addToQueue,
  getQueueState,
  
  // Runner
  startJob,
  cancelJob,
  getRunningJob,
} from "@cool-website/job-runner";
```

### CLI (`@cool-website/job-runner/cli`)

```typescript
import { main } from "@cool-website/job-runner/cli";
main(); // Runs the CLI
```

### Web (`@cool-website/job-runner/web`)

```typescript
import { createServer } from "@cool-website/job-runner/web";

export default createServer({
  port: 3456,
  scheduler: true,
  name: "My Dashboard",
});
```

## Data Directory Structure

```
data/
├── searches/
│   └── <slug>/
│       ├── config.json    # Search metadata (name, schedule, etc.)
│       ├── prompt.md      # Agent prompt (source of truth)
│       └── jobs/
│           └── <job-id>/
│               ├── job.json    # Job metadata
│               ├── log.txt     # tmux output
│               └── report.md   # Agent output
└── queue.json             # Job queue state
```

## Example App

See [`apps/marketplace-tracker`](../../apps/marketplace-tracker) for a complete example of an app built on this package.

## Requirements

- [Bun](https://bun.sh) runtime
- [tmux](https://github.com/tmux/tmux) for job execution
- [OpenCode](https://opencode.ai) CLI installed

## License

MIT
