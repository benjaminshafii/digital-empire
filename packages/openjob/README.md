# opencode-job-runner

Run and schedule OpenCode agent jobs from the command line.

## Install CLI

```bash
curl -fsSL https://raw.githubusercontent.com/benjaminshafii/digital-empire/master/packages/openjob/install.sh | bash
```

Or build from source:

```bash
cd packages/job-runner
bun install
bun run build
cp dist/ocr ~/.local/bin/
```

## Requirements

- [OpenCode](https://opencode.ai) CLI
- [tmux](https://github.com/tmux/tmux) for job sessions
- [Bun](https://bun.sh) runtime (for building)

## CLI Usage

```bash
# Create a job with a prompt
ocr add -p "Standing desk under 300"

# Create with a specific agent
ocr add -r -p "@research-agent Find the best productivity apps"

# List all jobs
ocr list

# Edit a job's prompt
ocr edit standing-desk

# Run a job
ocr run standing-desk

# Run and attach to watch live
ocr run standing-desk --attach

# View the latest report
ocr show standing-desk

# List recent job runs
ocr jobs

# Cancel running job
ocr cancel
```

## Commands

| Command | Description |
|---------|-------------|
| `add -p "prompt"` | Create a new job |
| `add -r -p "prompt"` | Create job with raw prompt (no template) |
| `list` | List all saved jobs |
| `show <slug>` | View latest report |
| `edit <slug>` | Edit the prompt.md file |
| `run <slug>` | Queue and run a job |
| `run <slug> --attach` | Run and attach to tmux session |
| `jobs [slug]` | List job runs |
| `cancel` | Cancel the running job |
| `delete <slug>` | Delete a job and its history |
| `schedule set <slug> <cron>` | Set a cron schedule |
| `schedule list` | List scheduled jobs |

## Prompt Files

Each job has a `prompt.md` file that defines what the agent does. It can refer to other `opencode` agent. So you're able to automate sequential complex tasks.

```markdown
@fb-marketplace

Find deals matching: Standing desk under $300

Location: San Francisco Bay Area

Then send a message with @telegram
```


- **`@agent-name`** - Specifies which OpenCode agent to use
- **`{{reportPath}}`** - Replaced with actual output path at runtime

## Data Directory

By default, data is stored in `./data/`:

```
data/
├── queue.json
└── searches/
    └── standing-desk/
        ├── config.json      # Job metadata
        ├── prompt.md        # Agent prompt (source of truth)
        └── jobs/
            └── <job-id>/
                ├── job.json   # Run metadata
                ├── log.txt    # tmux output
                └── report.md  # Agent output
```

---

# SDK

Use the SDK to build custom apps on top of opencode-job-runner.

## Install

```bash
pnpm add opencode-job-runner
```

## Quick Start

**CLI wrapper (`src/cli.ts`):**

```typescript
#!/usr/bin/env bun
import { join, dirname } from "path";
import { setDataDir } from "opencode-job-runner";

// Set data directory relative to your app
const appDir = dirname(dirname(new URL(import.meta.url).pathname));
setDataDir(join(appDir, "data"));

// Import and run the CLI
const { main } = await import("opencode-job-runner/cli");
main();
```

## Package Exports

### Core (`opencode-job-runner`)

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
} from "opencode-job-runner";
```

### CLI (`opencode-job-runner/cli`)

```typescript
import { main } from "opencode-job-runner/cli";
main();
```

## Example App

See [`apps/marketplace-tracker`](../../apps/marketplace-tracker) for a complete example of an app built with this SDK.

## License

MIT
