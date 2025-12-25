/**
 * OpenCode Job Scheduler Plugin
 * 
 * Schedules jobs using launchd (Mac) or systemd (Linux).
 * Jobs stored in ~/.config/opencode/jobs/
 * 
 * Features:
 * - Survives reboots
 * - Catches up on missed runs (if computer was asleep)
 * - Cross-platform (Mac + Linux)
 * 
 * Install:
 *   curl -fsSL https://raw.githubusercontent.com/benjaminshafii/digital-empire/master/packages/openjob/install.sh | bash
 */
import type { Plugin } from "@opencode-ai/plugin"
import { tool } from "@opencode-ai/plugin"
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync, unlinkSync } from "fs"
import { join } from "path"
import { homedir, platform } from "os"
import { execSync } from "child_process"

// Storage location - shared with other opencode tools
const OPENCODE_CONFIG = join(homedir(), ".config", "opencode")
const JOBS_DIR = join(OPENCODE_CONFIG, "jobs")
const LOGS_DIR = join(OPENCODE_CONFIG, "logs")

// Platform detection
const IS_MAC = platform() === "darwin"
const IS_LINUX = platform() === "linux"

// launchd paths (Mac)
const LAUNCH_AGENTS_DIR = join(homedir(), "Library", "LaunchAgents")
const LAUNCHD_PREFIX = "com.opencode.job"

// systemd paths (Linux)
const SYSTEMD_USER_DIR = join(homedir(), ".config", "systemd", "user")

// Ensure directory exists
function ensureDir(dir: string) {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
}

// Slugify a name
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

// Job type
interface Job {
  slug: string
  name: string
  schedule: string
  prompt: string
  source?: string
  createdAt: string
}

// Find opencode binary
function findOpencode(): string {
  const paths = [
    join(homedir(), ".opencode", "bin", "opencode"),
    "/usr/local/bin/opencode",
    "/opt/homebrew/bin/opencode",
  ]
  
  for (const p of paths) {
    if (existsSync(p)) {
      return p
    }
  }
  
  return "opencode" // hope it's in PATH
}

// === LAUNCHD (Mac) ===

function cronToLaunchdCalendar(cron: string): Record<string, number> {
  const parts = cron.split(" ")
  if (parts.length !== 5) {
    throw new Error(`Invalid cron: ${cron}`)
  }
  
  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts
  const calendar: Record<string, number> = {}
  
  if (minute !== "*" && !minute.includes("/") && !minute.includes(",")) {
    calendar.Minute = parseInt(minute)
  }
  if (hour !== "*" && !hour.includes("/") && !hour.includes(",")) {
    calendar.Hour = parseInt(hour)
  }
  if (dayOfMonth !== "*" && !dayOfMonth.includes("/")) {
    calendar.Day = parseInt(dayOfMonth)
  }
  if (month !== "*" && !month.includes("/")) {
    calendar.Month = parseInt(month)
  }
  if (dayOfWeek !== "*" && !dayOfWeek.includes("/")) {
    calendar.Weekday = parseInt(dayOfWeek)
  }
  
  return calendar
}

function createLaunchdPlist(job: Job): string {
  const opencode = findOpencode()
  const label = `${LAUNCHD_PREFIX}.${job.slug}`
  const logPath = join(LOGS_DIR, `${job.slug}.log`)
  
  const calendar = cronToLaunchdCalendar(job.schedule)
  const calendarEntries = Object.entries(calendar)
    .map(([k, v]) => `    <key>${k}</key>\n    <integer>${v}</integer>`)
    .join("\n")
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${label}</string>
  
  <key>ProgramArguments</key>
  <array>
    <string>${opencode}</string>
    <string>run</string>
    <string>${job.prompt.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</string>
  </array>
  
  <key>StartCalendarInterval</key>
  <dict>
${calendarEntries}
  </dict>
  
  <key>StandardOutPath</key>
  <string>${logPath}</string>
  
  <key>StandardErrorPath</key>
  <string>${logPath}</string>
  
  <key>RunAtLoad</key>
  <false/>
</dict>
</plist>`
}

function installLaunchdJob(job: Job): void {
  ensureDir(LAUNCH_AGENTS_DIR)
  ensureDir(LOGS_DIR)
  
  const label = `${LAUNCHD_PREFIX}.${job.slug}`
  const plistPath = join(LAUNCH_AGENTS_DIR, `${label}.plist`)
  
  // Unload if exists
  try {
    execSync(`launchctl unload "${plistPath}" 2>/dev/null`, { stdio: "ignore" })
  } catch {}
  
  // Write plist
  const plist = createLaunchdPlist(job)
  writeFileSync(plistPath, plist)
  
  // Load
  execSync(`launchctl load "${plistPath}"`)
}

function uninstallLaunchdJob(slug: string): void {
  const label = `${LAUNCHD_PREFIX}.${slug}`
  const plistPath = join(LAUNCH_AGENTS_DIR, `${label}.plist`)
  
  if (existsSync(plistPath)) {
    try {
      execSync(`launchctl unload "${plistPath}"`, { stdio: "ignore" })
    } catch {}
    unlinkSync(plistPath)
  }
}

// === SYSTEMD (Linux) ===

function cronToSystemdCalendar(cron: string): string {
  const parts = cron.split(" ")
  if (parts.length !== 5) {
    throw new Error(`Invalid cron: ${cron}`)
  }
  
  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts
  
  // Handle common patterns
  if (dayOfWeek !== "*" && dayOfMonth === "*") {
    // Weekly
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    const day = days[parseInt(dayOfWeek)] || dayOfWeek
    const h = hour === "*" ? "00" : hour.padStart(2, "0")
    const m = minute === "*" ? "00" : minute.padStart(2, "0")
    return `${day} *-*-* ${h}:${m}:00`
  }
  
  // Daily or more specific
  const h = hour === "*" ? "*" : hour.padStart(2, "0")
  const m = minute === "*" ? "*" : minute.padStart(2, "0")
  const dom = dayOfMonth === "*" ? "*" : dayOfMonth.padStart(2, "0")
  const mon = month === "*" ? "*" : month.padStart(2, "0")
  
  return `*-${mon}-${dom} ${h}:${m}:00`
}

function createSystemdService(job: Job): string {
  const opencode = findOpencode()
  const logPath = join(LOGS_DIR, `${job.slug}.log`)
  
  return `[Unit]
Description=OpenCode Job: ${job.name}

[Service]
Type=oneshot
ExecStart=${opencode} run "${job.prompt.replace(/"/g, '\\"')}"
StandardOutput=append:${logPath}
StandardError=append:${logPath}

[Install]
WantedBy=default.target
`
}

function createSystemdTimer(job: Job): string {
  const calendar = cronToSystemdCalendar(job.schedule)
  
  return `[Unit]
Description=Timer for OpenCode Job: ${job.name}

[Timer]
OnCalendar=${calendar}
Persistent=true

[Install]
WantedBy=timers.target
`
}

function installSystemdJob(job: Job): void {
  ensureDir(SYSTEMD_USER_DIR)
  ensureDir(LOGS_DIR)
  
  const servicePath = join(SYSTEMD_USER_DIR, `opencode-job-${job.slug}.service`)
  const timerPath = join(SYSTEMD_USER_DIR, `opencode-job-${job.slug}.timer`)
  
  // Write service and timer
  writeFileSync(servicePath, createSystemdService(job))
  writeFileSync(timerPath, createSystemdTimer(job))
  
  // Reload and enable
  execSync("systemctl --user daemon-reload")
  execSync(`systemctl --user enable opencode-job-${job.slug}.timer`)
  execSync(`systemctl --user start opencode-job-${job.slug}.timer`)
}

function uninstallSystemdJob(slug: string): void {
  try {
    execSync(`systemctl --user stop opencode-job-${slug}.timer`, { stdio: "ignore" })
    execSync(`systemctl --user disable opencode-job-${slug}.timer`, { stdio: "ignore" })
  } catch {}
  
  const servicePath = join(SYSTEMD_USER_DIR, `opencode-job-${slug}.service`)
  const timerPath = join(SYSTEMD_USER_DIR, `opencode-job-${slug}.timer`)
  
  if (existsSync(servicePath)) unlinkSync(servicePath)
  if (existsSync(timerPath)) unlinkSync(timerPath)
  
  try {
    execSync("systemctl --user daemon-reload", { stdio: "ignore" })
  } catch {}
}

// === CROSS-PLATFORM ===

function installJob(job: Job): void {
  if (IS_MAC) {
    installLaunchdJob(job)
  } else if (IS_LINUX) {
    installSystemdJob(job)
  } else {
    throw new Error(`Unsupported platform: ${platform()}. Only macOS and Linux are supported.`)
  }
}

function uninstallJob(slug: string): void {
  if (IS_MAC) {
    uninstallLaunchdJob(slug)
  } else if (IS_LINUX) {
    uninstallSystemdJob(slug)
  }
}

// === JOB STORAGE ===

function loadJob(slug: string): Job | null {
  ensureDir(JOBS_DIR)
  const path = join(JOBS_DIR, `${slug}.json`)
  if (!existsSync(path)) return null
  try {
    return JSON.parse(readFileSync(path, "utf-8"))
  } catch {
    return null
  }
}

function loadAllJobs(): Job[] {
  ensureDir(JOBS_DIR)
  const files = readdirSync(JOBS_DIR).filter(f => f.endsWith(".json"))
  return files.map(f => {
    try {
      return JSON.parse(readFileSync(join(JOBS_DIR, f), "utf-8"))
    } catch {
      return null
    }
  }).filter(Boolean) as Job[]
}

function saveJob(job: Job): void {
  ensureDir(JOBS_DIR)
  const path = join(JOBS_DIR, `${job.slug}.json`)
  writeFileSync(path, JSON.stringify(job, null, 2))
}

function deleteJobFile(slug: string): void {
  const path = join(JOBS_DIR, `${slug}.json`)
  if (existsSync(path)) {
    unlinkSync(path)
  }
}

// === HELPERS ===

function describeCron(cron: string): string {
  const parts = cron.split(" ")
  if (parts.length !== 5) return cron
  
  const [min, hour, dom, mon, dow] = parts
  
  if (mon === "*" && dom === "*") {
    if (dow === "*" && hour !== "*" && min !== "*" && !hour.includes("*") && !hour.includes("/")) {
      const h = parseInt(hour)
      const m = parseInt(min)
      const ampm = h >= 12 ? "PM" : "AM"
      const displayH = h > 12 ? h - 12 : h === 0 ? 12 : h
      return `daily at ${displayH}:${m.toString().padStart(2, "0")} ${ampm}`
    }
    if (hour.startsWith("*/")) {
      return `every ${hour.slice(2)} hours`
    }
    if (min.startsWith("*/")) {
      return `every ${min.slice(2)} minutes`
    }
  }
  
  if (dow !== "*" && dom === "*" && mon === "*") {
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
    const day = days[parseInt(dow)]
    if (day && hour !== "*") {
      const h = parseInt(hour)
      const ampm = h >= 12 ? "PM" : "AM"
      const displayH = h > 12 ? h - 12 : h === 0 ? 12 : h
      return `${day}s at ${displayH}:${(min || "00").padStart(2, "0")} ${ampm}`
    }
  }
  
  return cron
}

function getJobLogs(slug: string): string | null {
  const logPath = join(LOGS_DIR, `${slug}.log`)
  if (!existsSync(logPath)) return null
  try {
    const content = readFileSync(logPath, "utf-8")
    return content.length > 5000 ? content.slice(-5000) : content
  } catch {
    return null
  }
}

// === PLUGIN ===

export const SchedulerPlugin: Plugin = async ({ $ }) => {
  return {
    tool: {
      schedule_job: tool({
        description: "Schedule a recurring job to run an opencode prompt. Uses launchd (Mac) or systemd (Linux) for reliable scheduling that survives reboots and catches up on missed runs.",
        args: {
          name: tool.schema.string().describe("A short name for the job (e.g. 'standing desk search')"),
          schedule: tool.schema.string().describe("Cron expression: '0 9 * * *' (daily 9am), '0 */6 * * *' (every 6h), '30 8 * * 1' (Monday 8:30am)"),
          prompt: tool.schema.string().describe("The prompt to run, can include @agent tags"),
          source: tool.schema.string().optional().describe("Optional: source app (e.g. 'marketplace', 'twitter') - used for filtering"),
        },
        async execute(args) {
          const slug = args.source 
            ? `${args.source}-${slugify(args.name)}`
            : slugify(args.name)
          
          if (loadJob(slug)) {
            return `Job "${slug}" already exists. Delete it first or use a different name.`
          }
          
          const job: Job = {
            slug,
            name: args.name,
            schedule: args.schedule,
            prompt: args.prompt,
            source: args.source,
            createdAt: new Date().toISOString()
          }
          
          try {
            saveJob(job)
            installJob(job)
            
            const platformName = IS_MAC ? "launchd" : IS_LINUX ? "systemd" : "unknown"
            
            return `Scheduled "${args.name}"

Schedule: ${args.schedule} (${describeCron(args.schedule)})
Platform: ${platformName}
Prompt: ${args.prompt.slice(0, 100)}${args.prompt.length > 100 ? "..." : ""}

The job will run at the scheduled time. If your computer was asleep, it will catch up when it wakes.

Commands:
- "run ${args.name} now" - run immediately
- "show my jobs" - list all
- "delete job ${args.name}" - remove`
          } catch (error) {
            deleteJobFile(slug)
            const msg = error instanceof Error ? error.message : String(error)
            return `Failed to schedule job: ${msg}`
          }
        }
      }),

      list_jobs: tool({
        description: "List all scheduled jobs. Optionally filter by source app.",
        args: {
          source: tool.schema.string().optional().describe("Filter by source app (e.g. 'marketplace')"),
        },
        async execute(args) {
          let jobs = loadAllJobs()
          
          if (args.source) {
            jobs = jobs.filter(j => j.source === args.source || j.slug.startsWith(`${args.source}-`))
          }
          
          if (jobs.length === 0) {
            return args.source 
              ? `No jobs found for "${args.source}".`
              : "No scheduled jobs yet.\n\nTry: \"Schedule a daily job at 9am to search for standing desks\""
          }
          
          const lines = jobs.map((j, i) => {
            return `${i + 1}. ${j.name} (${j.slug})
   ${describeCron(j.schedule)}
   ${j.prompt.slice(0, 50)}${j.prompt.length > 50 ? "..." : ""}`
          })
          
          return `Scheduled Jobs\n\n${lines.join("\n\n")}`
        }
      }),

      delete_job: tool({
        description: "Delete a scheduled job",
        args: {
          name: tool.schema.string().describe("The job name or slug to delete"),
        },
        async execute(args) {
          const slug = slugify(args.name)
          let job = loadJob(slug) || loadJob(args.name)
          
          // Try with common prefixes if not found
          if (!job) {
            const allJobs = loadAllJobs()
            job = allJobs.find(j => 
              j.slug === args.name ||
              j.slug.endsWith(`-${slug}`) ||
              j.name.toLowerCase() === args.name.toLowerCase()
            ) || null
          }
          
          if (!job) {
            return `Job "${args.name}" not found.`
          }
          
          uninstallJob(job.slug)
          deleteJobFile(job.slug)
          
          return `Deleted job "${job.name}"`
        }
      }),

      run_job: tool({
        description: "Run a scheduled job immediately",
        args: {
          name: tool.schema.string().describe("The job name or slug"),
        },
        async execute(args) {
          const slug = slugify(args.name)
          let job = loadJob(slug) || loadJob(args.name)
          
          if (!job) {
            const allJobs = loadAllJobs()
            job = allJobs.find(j => 
              j.slug === args.name ||
              j.slug.endsWith(`-${slug}`) ||
              j.name.toLowerCase().includes(args.name.toLowerCase())
            ) || null
          }
          
          if (!job) {
            return `Job "${args.name}" not found. Use list_jobs to see available jobs.`
          }
          
          // Return the prompt for OpenCode to execute
          return `Running "${job.name}" now...\n\n---\n\n${job.prompt}`
        }
      }),

      job_logs: tool({
        description: "View the latest logs from a scheduled job",
        args: {
          name: tool.schema.string().describe("The job name or slug"),
        },
        async execute(args) {
          const slug = slugify(args.name)
          let job = loadJob(slug) || loadJob(args.name)
          
          if (!job) {
            const allJobs = loadAllJobs()
            job = allJobs.find(j => 
              j.slug === args.name ||
              j.slug.endsWith(`-${slug}`) ||
              j.name.toLowerCase().includes(args.name.toLowerCase())
            ) || null
          }
          
          if (!job) {
            return `Job "${args.name}" not found.`
          }
          
          const logs = getJobLogs(job.slug)
          
          if (!logs) {
            return `No logs found for "${job.name}". The job may not have run yet.`
          }
          
          return `Logs for ${job.name}\n\n${logs}`
        }
      }),
    }
  }
}
