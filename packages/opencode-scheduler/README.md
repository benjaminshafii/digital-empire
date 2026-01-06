# opencode-scheduler

OpenCode plugin for scheduling recurring jobs via launchd (Mac) or systemd (Linux). Jobs are stored in `~/.config/opencode/jobs/`.

## Installation

```bash
npm install -g opencode-scheduler
# or
bun add -g opencode-scheduler
```

## Usage

Add the plugin to your `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-scheduler"]
}
```

### Available Tools

- **`schedule_job`** - Schedule a recurring job
  - `name`: Short name for the job
  - `schedule`: Cron expression (e.g., `0 9 * * *` for daily 9am)
  - `prompt`: The prompt to run
  - `source` (optional): Source app for filtering
  - `workdir` (optional): Working directory (for MCP config)

- **`list_jobs`** - List all scheduled jobs (optionally filter by source)

- **`run_job`** - Run a scheduled job immediately

- **`delete_job`** - Delete a scheduled job

- **`job_logs`** - View logs from a scheduled job

## Features

- Survives reboots
- Catches up on missed runs (if computer was asleep)
- Cross-platform (macOS + Linux)

## Examples

```bash
# Schedule a daily job at 9am to search for standing desks
schedule_job name="standing desk search" schedule="0 9 * * *" prompt="Search FB Marketplace for standing desks"

# Run a job immediately
run_job name="standing desk search"

# List all jobs
list_jobs

# View job logs
job_logs name="standing desk search"

# Delete a job
delete_job name="standing desk search"
```

## How It Works

1. Jobs are persisted to `~/.config/opencode/jobs/`
2. launchd (Mac) or systemd (Linux) timers are created/updated
3. Logs stored in `~/.config/opencode/logs/`

## Requirements

- OpenCode v1.0.0 or later
- macOS or Linux

## License

MIT
