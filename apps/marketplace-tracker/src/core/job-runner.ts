/**
 * JobRunner - Execute jobs using tmux and opencode
 *
 * Key design:
 * - Each job runs in its own tmux session
 * - You can attach to watch live: tmux attach -t mkt-<jobId>
 * - Output is logged to a file via `script`
 * - Jobs run sequentially (one at a time) to avoid Chrome MCP conflicts
 */
import { spawn, execSync, spawnSync } from "child_process";
import { existsSync, writeFileSync, readFileSync, watch, readdirSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import type { Job, Search, JobResult, RunJobOptions } from "./types";
import { getSearch } from "./search-store";
import {
  createJob,
  updateJob,
  getJob,
  addToQueue,
  removeFromQueue,
  setCurrentJob,
  getQueueState,
  getNextQueuedJob,
  saveJobReport,
  listJobsForSearch,
  getJobReport,
} from "./job-store";
import {
  getJobDir,
  getJobLogPath,
  findOpencodeBinary,
  findProjectRoot,
  SEARCHES_DIR,
} from "./paths";

// Tmux session prefix
const TMUX_PREFIX = "mkt";

// Check if tmux is available
export function isTmuxAvailable(): boolean {
  try {
    execSync("which tmux", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

// Get tmux session name for a job
export function getTmuxSessionName(jobId: string): string {
  return `${TMUX_PREFIX}-${jobId}`;
}

// Check if a tmux session exists
export function tmuxSessionExists(sessionName: string): boolean {
  try {
    execSync(`tmux has-session -t ${sessionName} 2>/dev/null`, {
      stdio: "ignore",
    });
    return true;
  } catch {
    return false;
  }
}

// List all marketplace-tracker tmux sessions
export function listTmuxSessions(): string[] {
  try {
    const output = execSync("tmux list-sessions -F '#{session_name}'", {
      encoding: "utf-8",
    });
    return output
      .split("\n")
      .filter((s) => s.startsWith(TMUX_PREFIX + "-"));
  } catch {
    return [];
  }
}

// Get previous reports for context
function getPreviousReports(searchSlug: string, limit = 3): string[] {
  const jobs = listJobsForSearch(searchSlug);
  const completedJobs = jobs.filter(j => j.status === "completed").slice(0, limit);
  
  const reports: string[] = [];
  for (const job of completedJobs) {
    const report = getJobReport(searchSlug, job.id);
    if (report) {
      const date = new Date(job.completedAt || job.createdAt).toLocaleDateString();
      reports.push(`--- Report from ${date} ---\n${report.substring(0, 2000)}${report.length > 2000 ? '\n...(truncated)' : ''}`);
    }
  }
  
  return reports;
}

// Build the prompt for the marketplace search
function buildPrompt(search: Search): string {
  const previousReports = getPreviousReports(search.slug);
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  
  let prompt = `You are helping me find deals on Facebook Marketplace.

TODAY'S DATE: ${today}
LOCATION: ${search.location}

MY REQUEST:
${search.prompt}

`;

  if (previousReports.length > 0) {
    prompt += `PREVIOUS RESEARCH:
I've searched for this before. Here are my previous reports for reference:

${previousReports.join('\n\n')}

Use this previous research to:
- Identify if any previously-found deals are still available
- Track price changes on items you've seen before
- Note which items have sold (no longer available)
- Find NEW listings that weren't in previous searches

`;
  }

  prompt += `INSTRUCTIONS:
1. Search Facebook Marketplace for relevant items
2. Compare with previous research if available
3. Write a markdown report

CRITICAL: EVERY listing you mention MUST include a direct Facebook Marketplace link.
Format links as: [Item Name - $XX](https://www.facebook.com/marketplace/item/XXXXX/)
If you can't get the link for an item, DO NOT include it in the report.

## Report Format

For EACH item include:
1. **[Item Title - $Price](facebook marketplace link)** - REQUIRED, must be clickable
2. Seller info (ratings if visible)
3. Condition notes
4. Why it's a good/bad deal
5. Any concerns

## Sections to include:

### Top Picks (3-5 items max)
Your best recommendations with full details and links.

### Other Options
Quick list of other decent finds with links.

### What to Avoid
Any overpriced or sketchy listings you saw (with links so I know what to skip).

Be concise. I need actionable info with LINKS so I can message sellers immediately.`;

  return prompt;
}

// Extract markdown from opencode output
function extractReport(logPath: string): string {
  if (!existsSync(logPath)) {
    return "";
  }

  const content = readFileSync(logPath, "utf-8");
  const lines = content.split("\n");
  let report = "";
  let inReport = false;
  let reportLines: string[] = [];

  for (const line of lines) {
    // Remove ANSI color codes
    const cleanLine = line.replace(/\x1b\[[0-9;]*m/g, "").trim();

    // Start capturing at any markdown header (# or ##)
    if (cleanLine.match(/^#{1,2} /) && !inReport) {
      inReport = true;
      reportLines = [cleanLine];
    } else if (inReport) {
      // Skip tool calls but keep going
      if (cleanLine.match(/^\|  \w+_/) || cleanLine.startsWith("$ ") || cleanLine.startsWith("bun run")) {
        continue;
      }
      // Stop at end markers
      if (cleanLine.includes("opencode") && cleanLine.includes("session")) {
        break;
      }
      // Keep all markdown content
      reportLines.push(cleanLine);
    }
  }

  // If we found structured content, use it
  if (reportLines.length > 10) {
    report = reportLines.join("\n");
  }

  // Fallback: try to extract from JSON format
  if (!report) {
    try {
      for (const line of lines) {
        if (line.includes('"type":"text"') || line.includes('"type":"message"')) {
          const parsed = JSON.parse(line);
          if (parsed.part?.text) {
            report = parsed.part.text;
          } else if (parsed.message?.content) {
            for (const part of parsed.message.content) {
              if (part.type === "text" && part.text) {
                report = part.text;
              }
            }
          }
        }
      }
    } catch {
      // Not JSON format
    }
  }

  return report.trim();
}

// Start a job running in tmux
export async function startJob(
  searchSlug: string,
  options: RunJobOptions = {}
): Promise<Job> {
  // Check preconditions
  if (!isTmuxAvailable()) {
    throw new Error("tmux is not installed. Please install it: brew install tmux");
  }

  const search = getSearch(searchSlug);
  if (!search) {
    throw new Error(`Search "${searchSlug}" not found`);
  }

  // Check if there's already a job running
  const queueState = getQueueState();
  if (queueState.currentJobId) {
    // Queue this job instead
    const job = createJob(searchSlug);
    addToQueue(job.id, searchSlug);
    return job;
  }

  // Create the job
  const job = createJob(searchSlug);
  const sessionName = getTmuxSessionName(job.id);
  const logPath = getJobLogPath(searchSlug, job.id);
  const prompt = buildPrompt(search);
  const opencodeBin = findOpencodeBinary();
  const projectRoot = findProjectRoot();

  // Mark as running
  setCurrentJob(job.id);
  updateJob(searchSlug, job.id, {
    status: "running",
    startedAt: new Date().toISOString(),
    tmuxSession: sessionName,
  });

  options.onStart?.(job);

  // Write a shell script to run
  const jobDir = getJobDir(searchSlug, job.id);
  const scriptPath = join(jobDir, "run.sh");
  const promptFile = join(jobDir, "prompt.txt");
  
  // Write prompt to a separate file
  writeFileSync(promptFile, prompt);
  
  // Create a script that reads the prompt from file
  // Note: opencode run [message] - the "run" subcommand is required!
  writeFileSync(scriptPath, `#!/bin/bash
cd "${projectRoot}"
PROMPT=\$(cat "${promptFile}")
${opencodeBin} run --agent fb-marketplace "\$PROMPT" 2>&1 | tee "${logPath}"
`);
  execSync(`chmod +x "${scriptPath}"`);

  // Create tmux session - use the script path directly (it's executable)
  try {
    execSync(`tmux new-session -d -s "${sessionName}" "${scriptPath}"`, {
      stdio: "pipe",
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    updateJob(searchSlug, job.id, {
      status: "failed",
      completedAt: new Date().toISOString(),
      error: `Failed to start tmux session: ${errMsg}`,
    });
    setCurrentJob(undefined);
    throw error;
  }

  // Watch for completion in background
  watchJobCompletion(searchSlug, job.id, sessionName, logPath, options);

  return getJob(searchSlug, job.id)!;
}

// Watch for job completion (non-blocking)
function watchJobCompletion(
  searchSlug: string,
  jobId: string,
  sessionName: string,
  logPath: string,
  options: RunJobOptions
): void {
  const checkInterval = setInterval(() => {
    // Check if tmux session still exists
    if (!tmuxSessionExists(sessionName)) {
      clearInterval(checkInterval);

      // Extract report from log
      const report = extractReport(logPath);

      // Update job status
      const completedJob = updateJob(searchSlug, jobId, {
        status: report ? "completed" : "failed",
        completedAt: new Date().toISOString(),
        error: report ? undefined : "No report generated",
      });

      // Save report if we got one
      if (report) {
        saveJobReport(searchSlug, jobId, report);
      }

      // Clear current job
      setCurrentJob(undefined);

      // Notify
      options.onComplete?.({
        job: completedJob,
        report: report || undefined,
        logFile: logPath,
      });

      // Process next job in queue
      processQueue(options);
    }
  }, 2000); // Check every 2 seconds
}

// Process the next job in queue
async function processQueue(options: RunJobOptions): Promise<void> {
  const next = getNextQueuedJob();

  if (!next) {
    return;
  }

  removeFromQueue(next.jobId);

  // Recursively start the next job
  const job = getJob(next.searchSlug, next.jobId);
  if (job && job.status === "queued") {
    // Update and run
    const search = getSearch(next.searchSlug);
    if (search) {
      await startJob(next.searchSlug, options);
    }
  }
}

// Attach to a running job's tmux session
export function attachToJob(jobId: string): void {
  const sessionName = getTmuxSessionName(jobId);

  if (!tmuxSessionExists(sessionName)) {
    throw new Error(`No running session for job ${jobId}`);
  }

  // This replaces the current process
  const result = spawnSync("tmux", ["attach", "-t", sessionName], {
    stdio: "inherit",
  });

  if (result.error) {
    throw result.error;
  }
}

// Cancel a job
export function cancelJob(searchSlug: string, jobId: string): void {
  const job = getJob(searchSlug, jobId);

  if (!job) {
    throw new Error(`Job "${jobId}" not found`);
  }

  if (job.status === "queued") {
    // Just remove from queue
    removeFromQueue(jobId);
    updateJob(searchSlug, jobId, {
      status: "cancelled",
      completedAt: new Date().toISOString(),
    });
  } else if (job.status === "running" && job.tmuxSession) {
    // Kill tmux session
    try {
      execSync(`tmux kill-session -t ${job.tmuxSession}`, { stdio: "ignore" });
    } catch {
      // Session might already be gone
    }

    updateJob(searchSlug, jobId, {
      status: "cancelled",
      completedAt: new Date().toISOString(),
    });

    setCurrentJob(undefined);
  }
}

// Get running job info
export function getRunningJob(): { searchSlug: string; job: Job } | null {
  const state = getQueueState();

  if (!state.currentJobId) {
    return null;
  }

  // Find which search this job belongs to by reading directory directly
  if (!existsSync(SEARCHES_DIR)) {
    return null;
  }

  for (const slug of readdirSync(SEARCHES_DIR)) {
    const job = getJob(slug, state.currentJobId);
    if (job) {
      return { searchSlug: slug, job };
    }
  }

  return null;
}
