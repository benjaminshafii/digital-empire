/**
 * OpenCode CLI wrapper for marketplace-tracker
 * 
 * Spawns opencode processes to run prompts and manage schedules
 */
import { spawn, type ChildProcess, execSync } from "child_process";
import { existsSync } from "fs";
import { join, dirname } from "path";
import { homedir } from "os";
import {
  createJob,
  updateJob,
  setRunningJob,
  clearRunningJob,
  getReportPath,
  savePrompt,
  type Job,
} from "./storage";

// Get the app directory (where opencode.json and .opencode/agent/ are)
// import.meta.url = file:///path/to/apps/marketplace-tracker/src/opencode.ts
// We need /path/to/apps/marketplace-tracker/
const APP_DIR = dirname(dirname(new URL(import.meta.url).pathname));
console.log("[opencode.ts] APP_DIR:", APP_DIR);

// Find opencode binary
function findOpencode(): string {
  const paths = [
    join(homedir(), ".opencode", "bin", "opencode"),
    "/usr/local/bin/opencode",
    "/opt/homebrew/bin/opencode",
  ];
  
  for (const p of paths) {
    if (existsSync(p)) {
      return p;
    }
  }
  
  return "opencode"; // hope it's in PATH
}

const OPENCODE_BIN = findOpencode();

export interface RunJobOptions {
  onComplete?: (result: { job: Job; success: boolean }) => void;
}

/**
 * Build the full prompt for a search
 */
export function buildPrompt(
  searchTerm: string,
  config: { location: string; telegramBotToken?: string; telegramChatId?: string },
  context: { searchSlug: string; jobId: string }
): string {
  const hasTelegram = !!(config.telegramBotToken && config.telegramChatId);
  const reportPath = getReportPath(context.searchSlug, context.jobId);
  
  let prompt = `@fb-marketplace

AUTOMATED JOB - DO NOT ASK FOR CONFIRMATION. Execute all steps immediately.

## Task
1. Use chrome_navigate_page to search Facebook Marketplace for "${searchTerm}" in ${config.location}
2. Extract listings using chrome_evaluate_script  
3. Write a complete markdown report with the results
4. Save to file using: bash with command: cat << 'EOF' > ${reportPath}
[your full markdown report here]
EOF

## Required Report Format
# ${searchTerm} - Facebook Marketplace Deals

## Top Picks
[3-5 best deals with prices and Facebook links]

## All Listings
| Price | Item | Link |
|-------|------|------|
[table rows]

## Report Path
${reportPath}

BEGIN EXECUTION NOW.

---

@title

Generate a concise title for this search job.

- Original search term: "${searchTerm}"
- Location: ${config.location}
- Report path: ${reportPath}
- Search slug: ${context.searchSlug}
- Job ID: ${context.jobId}

Read the report and generate a short, descriptive title (max 50 chars).
Save it via: POST http://localhost:3456/api/job/${context.searchSlug}/${context.jobId}/title
`;

  // If Telegram is configured, add the @telegram agent to send a summary
  if (hasTelegram) {
    prompt += `
---

@telegram

Send a Telegram notification with the top 3-5 deals.
Read the report from ${reportPath} and send a concise summary.

First, get the job title:
\`\`\`bash
curl -s http://localhost:3456/api/job/${context.searchSlug}/${context.jobId}/title
\`\`\`

Use that title as the header. Include:
- Best deals with prices and Facebook links
- Keep it short and scannable
`;
  }

  return prompt;
}

export interface StartJobOptions {
  onComplete?: (result: { job: Job; success: boolean }) => void;
}

/**
 * Start a job - creates job record, builds prompt, spawns opencode
 * 
 * This is the main entry point for running a search.
 */
export function startJob(
  searchSlug: string,
  searchTerm: string,
  config: { location: string; telegramBotToken?: string; telegramChatId?: string },
  options: StartJobOptions = {}
): { job: Job; process: ChildProcess } {
  // Create job record first
  const job = createJob(searchSlug);
  
  // Build prompt with this job's context
  const prompt = buildPrompt(searchTerm, config, {
    searchSlug,
    jobId: job.id,
  });
  
  // Save the prompt for reference
  savePrompt(searchSlug, prompt);
  
  // Now spawn the process
  return executeJob(job, prompt, options);
}

/**
 * Re-run an existing search with a new job
 */
export function rerunSearch(
  searchSlug: string,
  searchTerm: string,
  config: { location: string; telegramBotToken?: string; telegramChatId?: string },
  options: StartJobOptions = {}
): { job: Job; process: ChildProcess } {
  return startJob(searchSlug, searchTerm, config, options);
}

/**
 * Execute a job - internal function that spawns opencode
 */
function executeJob(
  job: Job,
  prompt: string,
  options: StartJobOptions = {}
): { job: Job; process: ChildProcess } {
  // Update job status
  updateJob(job.searchSlug, job.id, { status: "running" });
  
  // Spawn opencode from the app directory so it picks up:
  // - opencode.json (with Chrome MCP config)
  // - .opencode/agent/ (fb-marketplace, telegram, etc.)
  const child = spawn(OPENCODE_BIN, ["run", prompt], {
    stdio: ["ignore", "pipe", "pipe"],
    detached: false,
    cwd: APP_DIR,
  });
  
  // Track running job
  setRunningJob(job.searchSlug, job.id, child.pid);
  
  // Handle completion
  child.on("close", (code) => {
    const success = code === 0;
    updateJob(job.searchSlug, job.id, { status: success ? "completed" : "failed" });
    clearRunningJob();
    
    if (options.onComplete) {
      const updatedJob = { ...job, status: success ? "completed" : "failed" } as Job;
      options.onComplete({ job: updatedJob, success });
    }
  });
  
  child.on("error", (err) => {
    console.error(`Failed to spawn opencode: ${err.message}`);
    updateJob(job.searchSlug, job.id, { status: "failed" });
    clearRunningJob();
    
    if (options.onComplete) {
      const updatedJob = { ...job, status: "failed" } as Job;
      options.onComplete({ job: updatedJob, success: false });
    }
  });
  
  return { job, process: child };
}

/**
 * Cancel a running job by killing its process
 */
export function cancelJob(searchSlug: string, jobId: string): boolean {
  // Read the running job to get PID
  try {
    const runningPath = join(
      process.cwd().includes("marketplace-tracker") 
        ? process.cwd() 
        : join(process.cwd(), "apps", "marketplace-tracker"),
      "data",
      "running.json"
    );
    
    if (!existsSync(runningPath)) return false;
    
    const { readFileSync } = require("fs");
    const info = JSON.parse(readFileSync(runningPath, "utf-8"));
    
    if (info.searchSlug === searchSlug && info.jobId === jobId && info.pid) {
      process.kill(info.pid);
      updateJob(searchSlug, jobId, { status: "failed" });
      clearRunningJob();
      return true;
    }
  } catch {
    // Process already dead or other error
  }
  
  return false;
}

/**
 * Schedule a job using the openjob plugin via opencode
 * 
 * This tells opencode to use the schedule_job tool from the openjob plugin
 */
export function scheduleSearch(
  searchSlug: string,
  searchTerm: string,
  schedule: string,
  config: { location: string }
): void {
  const prompt = `@fb-marketplace Search for "${searchTerm}" in ${config.location}`;
  
  // Call opencode to schedule via the plugin
  // The plugin will create launchd/systemd timers
  try {
    execSync(`${OPENCODE_BIN} run "Schedule a job called marketplace-${searchSlug} with cron '${schedule}' to run: ${prompt}"`, {
      stdio: "ignore",
      cwd: APP_DIR,
    });
  } catch (err) {
    console.error(`Failed to schedule job: ${err instanceof Error ? err.message : err}`);
  }
}

/**
 * Unschedule a job
 */
export function unscheduleSearch(searchSlug: string): void {
  try {
    execSync(`${OPENCODE_BIN} run "Delete the job marketplace-${searchSlug}"`, {
      stdio: "ignore",
      cwd: APP_DIR,
    });
  } catch {
    // Ignore errors - job might not exist
  }
}

/**
 * Get the command to attach to a running job
 */
export function getAttachCommand(jobId: string): string {
  return `${OPENCODE_BIN} attach ${jobId}`;
}
