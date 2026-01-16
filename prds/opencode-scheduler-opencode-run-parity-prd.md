# PRD: opencode-scheduler — `opencode run` Parity + Ergonomics

## Summary

Today `opencode-scheduler` is intentionally thin: it schedules prompts by having the OS run `opencode run -- "<prompt>"` at a cron time (launchd on macOS, systemd on Linux). That’s a great baseline, but it means scheduled jobs can’t easily access several powerful `opencode run` capabilities (commands, attachments, agent/model selection, etc.) without awkward workarounds.

This PRD proposes a backwards-compatible “run spec” for scheduler jobs that maps 1:1 (or near 1:1) to `opencode run` flags, so anything you can do in a non-interactive `opencode run` can be scheduled with the same fidelity.

Where `opencode run` itself is missing scheduler-friendly primitives (non-interactive permission policies, job-specific session reuse), this PRD also proposes small, targeted upstream additions or an optional scheduler-side “supervisor” wrapper.

## Context

### Current scheduler mental model

- `schedule_job` writes `~/.config/opencode/jobs/<slug>.json`.
- It installs:
  - macOS: `~/Library/LaunchAgents/com.opencode.job.<slug>.plist`
  - Linux: `~/.config/systemd/user/opencode-job-<slug>.{service,timer}`
- The OS scheduler executes **the opencode binary**, currently:
  - `opencode run [--attach <url>] -- "<prompt>"`

### Current `opencode run` capabilities (v1.1.x)

From the CLI and source (`packages/opencode/src/cli/cmd/run.ts`), `opencode run` supports:

- Prompt vs. command mode:
  - `opencode run -- "<prompt>"`
  - `opencode run --command <cmd> -- "<arguments>"`
- Model/agent selection: `--model`, `--agent`, `--variant`
- Attachments: `-f/--file` (files or directories)
- Session controls: `--continue`, `--session`, `--title`, `--share`
- Output: `--format default|json`
- Server routing: `--attach <url>` (use running backend), `--port <n>` (local server)

## Goals

- **Parity:** schedule anything you can do with non-interactive `opencode run`.
- **Ergonomics:** `schedule_job`/`update_job` should accept structured fields instead of forcing prompt-based hacks.
- **Backwards compatibility:** existing jobs keep working unchanged.
- **Non-interactive by default:** scheduled runs must not block on prompts.
- **Cross-platform:** launchd + systemd continue to work.

## Non-goals

- Turning the scheduler into a workflow engine or queue.
- Adding a GUI.
- Solving all resilience/observability issues in this PRD (see `vendor/opencode-scheduler/PRD-resilient-execution.md` for that roadmap).

## Problem: Scheduler jobs lack `opencode run` feature parity

### Gap map

| `opencode run` feature | CLI flag(s) | Scheduler today | Pain |
|---|---|---|---|
| Run a prompt | (default) | ✅ | none |
| Attach to running server | `--attach` | ✅ (`attachUrl`) | none |
| Run a command template | `--command` | ❌ | can’t schedule built-in `init`, `review`, or custom commands cleanly |
| Attach files/dirs | `-f/--file` | ❌ | can’t “pin” context without prompt gymnastics |
| Choose agent | `--agent` | ❌ | can’t enforce an agent per job |
| Choose model + variant | `--model`, `--variant` | ❌ | can’t enforce a model per job |
| Force JSON output | `--format json` | ❌ | harder to build structured logs/history/summaries |
| Auto-share session | `--share` | ❌ | can’t get share URLs in logs reliably |
| Session reuse controls | `--continue`, `--session` | ❌ | no straightforward “job memory” option |
| Session title | `--title` | ❌ | logs don’t show a stable session title |

## Proposal

### 1) Add a `run` spec to the job JSON

Extend the job config schema (stored in `~/.config/opencode/jobs/<slug>.json`) with a `run` object that describes how to invoke `opencode run`.

Proposed shape (illustrative):

```ts
type OpencodeRunFormat = "default" | "json"

type JobRunSpec = {
  // required: one of these
  prompt?: string
  command?: string
  arguments?: string // used when command is set

  // parity with opencode run
  files?: string[]
  agent?: string
  model?: string
  variant?: string
  title?: string
  share?: boolean
  continue?: boolean
  session?: string
  runFormat?: OpencodeRunFormat

  // server routing
  attachUrl?: string
  port?: number
}
```

Notes:

- `runFormat` is intentionally *not* called `format` to avoid clashing with the scheduler tool output format (`format: "text" | "json"`).
- Keep existing top-level `prompt`/`attachUrl` fields temporarily for backward compatibility, but new jobs should write to `run.*`.

### 2) Expand scheduler tool args to cover `opencode run` parity

Update tool schemas:

- `schedule_job`:
  - accept `command`, `arguments`, `files`, `agent`, `model`, `variant`, `title`, `share`, `continue`, `session`, `runFormat`, `port`
- `update_job`:
  - allow updating all the above fields
- `run_job`:
  - optionally accept an override run spec (useful for “run once with model X”)

This keeps the plugin “thin” because it still ultimately builds and executes an `opencode run ...` command line.

### 3) Teach launchd/systemd generators to render the full flag set

Scheduler code changes (in `vendor/opencode-scheduler/src/index.ts`) would primarily be:

- Update `buildOpencodeArgs()` to emit:
  - `run --attach <url> --command <cmd> --agent <agent> --model <model> --variant <variant> --format <format> --share --title <title> -f <file> ... -- <message>`
- Update launchd/systemd templates accordingly.

### 4) Scheduled-mode defaults: explicitly non-interactive

Today, scheduled runs are “implicitly” non-interactive because there’s no TTY, and `opencode run` will reject interactive permission prompts.

Make this behavior explicit and safer:

- Add `run.nonInteractive?: true` as a scheduler-only field (default true).
- When `nonInteractive` is true, the scheduler should:
  - pass `--format json` if/when we want structured logs (optional)
  - set env var(s) (or future CLI flags) that force permission prompts to auto-reject or auto-allow based on policy

This may require small upstream enhancements to `opencode run`.

### 5) (Optional) Job-specific session reuse (“memory”) without `--continue`

`opencode run --continue` continues the *last session for that workspace/server*, which is risky for scheduler jobs (it can accidentally reuse a human interactive session).

Instead, add a scheduler-owned concept:

- `run.sessionStrategy: "new" | "sticky"`
  - `new` (default): each run creates a fresh session
  - `sticky`: scheduler stores a `jobSessionID` on first run and reuses it for subsequent runs

Implementation options:

1. **Supervisor wrapper (recommended if we want sticky sessions):**
   - Run via the OpenCode SDK directly (like `opencode run` does), so the scheduler can create a session, persist its ID, and re-use it.
   - This dovetails with `vendor/opencode-scheduler/PRD-resilient-execution.md` (run bookkeeping, run history, metadata updates).

2. **Pure CLI parsing (possible but brittle):**
   - Execute `opencode run --format json` and parse the first emitted JSON event to capture `sessionID`.

### 6) (Optional) Attachments as first-class “context pins”

Support for `-f/--file` is already in `opencode run`. Scheduler parity is primarily a pass-through.

However, we should add guardrails:

- At schedule/update time, optionally validate paths exist (best-effort).
- At runtime, fail fast with a clear log header if an attachment is missing.

## Examples

### A) Schedule a command

- Job intent: run a repo review every weekday morning.

Desired invocation:

```bash
opencode run --command review -- "branch" 
```

Scheduler job:

```json
{
  "name": "Daily review",
  "schedule": "0 9 * * 1-5",
  "run": {
    "command": "review",
    "arguments": "branch"
  }
}
```

### B) Schedule a prompt with specific agent/model

```json
{
  "name": "Marketplace scan",
  "schedule": "0 9 * * *",
  "run": {
    "prompt": "@scheduled-job-best-practices\nScan FB marketplace for standing desks under $300...",
    "agent": "bargain-finder",
    "model": "anthropic/claude-3-5-sonnet",
    "variant": "high"
  }
}
```

### C) Attach a directory for context

```json
{
  "name": "Summarize logs",
  "schedule": "0 */6 * * *",
  "run": {
    "prompt": "Summarize the most important errors and trends.",
    "files": ["outputs/my-job/", "logs/"]
  }
}
```

## Compatibility & Migration

- Existing jobs without `run.*` continue to work.
- New jobs should be written with `run.*`.
- `update_job` can transparently migrate older jobs on write.

## Open Questions

- Should scheduler expose *all* `opencode run` flags, or only the safe subset?
- Do we need an explicit upstream `opencode run --non-interactive` mode so behavior is consistent across environments?
- What’s the right default for `runFormat` in scheduled runs (human-readable vs machine-readable logs)?
- How do we want to handle secrets and share URLs in logs when `share=true`?

## Success Metrics

- Any `opencode run` invocation that works in a script can be represented as a scheduler job.
- Scheduling a command (`--command`) works end-to-end on macOS + Linux.
- Attachments (`--file`) work end-to-end, with clear errors when missing.
- No scheduled job blocks waiting for input.
