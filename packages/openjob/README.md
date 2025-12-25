# openjob

An [OpenCode](https://opencode.ai) plugin for scheduling recurring prompts.

Uses **launchd** (Mac) or **systemd** (Linux) for reliable scheduling that:
- Survives reboots
- Catches up on missed runs (if computer was asleep)

## Philosophy

**The prompt is the workflow.** You define what to do, when to run it, and what agents to use - all in natural language. openjob just handles the scheduling.

```
"Schedule a daily job at 9am to search for standing desks on FB marketplace"
```

That's it. No YAML. No DAGs. No config files.

## Installation

```bash
curl -fsSL https://raw.githubusercontent.com/benjaminshafii/digital-empire/master/packages/openjob/install.sh | bash
```

Then restart OpenCode to load the plugin.

## Usage

Talk to OpenCode:

```
# Schedule a job
"Schedule a daily job at 9am to search for standing desks under $300"

# List jobs
"Show my jobs"

# Run a job now
"Run the standing desk job"

# View logs
"Show logs for standing desk job"

# Delete a job
"Delete the standing desk job"
```

## How It Works

```
You: "Schedule a daily job at 9am to search for standing desks"
    |
    v
OpenCode calls schedule_job tool
    |
    v
Plugin saves job + creates launchd/systemd timer
    |
    v
At 9am (or when computer wakes), system runs: opencode run "<prompt>"
```

## Storage

```
~/.config/opencode/
├── plugin/
│   └── scheduler.ts      # The plugin
├── jobs/
│   └── standing-desk.json
└── logs/
    └── standing-desk.log
```

## For Apps (like marketplace-tracker)

Apps can create jobs with a `source` prefix to filter their own jobs:

```
# Marketplace creates jobs with source="marketplace"
# Job slug becomes: marketplace-standing-desk

# List only marketplace jobs
"Show my marketplace jobs"
```

The app's web UI calls OpenCode, which uses the plugin. Jobs are stored in the shared folder with a prefix for filtering.

## Requirements

- [OpenCode](https://opencode.ai)
- macOS or Linux

## License

MIT
