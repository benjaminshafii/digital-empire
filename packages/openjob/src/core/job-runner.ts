/**
 * JobRunner - Generic OpenCode job orchestrator
 *
 * Pipeline: prompt.md → tmux → opencode run → report.md
 *
 * The prompt.md file is the source of truth. It can reference any agents
 * via @agent syntax. We just read it and pass it to `opencode run`.
 */
import { execSync, spawnSync } from "child_process";
import { existsSync, writeFileSync, readFileSync, readdirSync } from "fs";
import { join } from "path";
import type { Job, RunJobOptions } from "./types";
import { getSearch, getPrompt } from "./search-store";
import {
  createJob,
  updateJob,
  getJob,
  addToQueue,
  removeFromQueue,
  setCurrentJob,
  getQueueState,
  getNextQueuedJob,
} from "./job-store";
import {
  getSearchesDir,
  getJobDir,
  getJobLogPath,
  getJobReportPath,
  findOpencodeBinary,
  findProjectRoot,
} from "./paths";

const TMUX_PREFIX = "job";

// Track active job watchers so we can cancel them when jobs are deleted
const activeWatchers = new Map<string, NodeJS.Timeout>();

// === TMUX HELPERS ===

export function isTmuxAvailable(): boolean {
  try {
    execSync("which tmux", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

export function getTmuxSessionName(jobId: string): string {
  return `${TMUX_PREFIX}-${jobId}`;
}

export function tmuxSessionExists(sessionName: string): boolean {
  try {
    execSync(`tmux has-session -t ${sessionName} 2>/dev/null`, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

export function listTmuxSessions(): string[] {
  try {
    const output = execSync("tmux list-sessions -F '#{session_name}'", { encoding: "utf-8" });
    return output.split("\n").filter((s) => s.startsWith(TMUX_PREFIX + "-"));
  } catch {
    return [];
  }
}

export function getAttachCommand(jobId: string): string {
  return `tmux attach -t ${getTmuxSessionName(jobId)}`;
}

// === PROMPT PROCESSING ===

interface PromptVariables {
  reportPath: string;
  searchSlug: string;
  jobId: string;
}

/**
 * Process the prompt template, replacing variables:
 * - {{reportPath}} → absolute path to report.md for this job
 * - {{searchSlug}} → slug of the search
 * - {{jobId}} → ID of the job
 */
function processPrompt(promptTemplate: string, vars: PromptVariables): string {
  return promptTemplate
    .replace(/\{\{reportPath\}\}/g, vars.reportPath)
    .replace(/\{\{searchSlug\}\}/g, vars.searchSlug)
    .replace(/\{\{jobId\}\}/g, vars.jobId);
}

// === JOB EXECUTION ===

export async function startJob(searchSlug: string, options: RunJobOptions = {}): Promise<Job> {
  if (!isTmuxAvailable()) {
    throw new Error("tmux required: brew install tmux");
  }

  const search = getSearch(searchSlug);
  if (!search) {
    throw new Error(`Search "${searchSlug}" not found`);
  }

  // Get the prompt template
  const promptTemplate = getPrompt(searchSlug);
  if (!promptTemplate) {
    throw new Error(`No prompt.md found for "${searchSlug}"`);
  }

  // Queue if another job running
  const queueState = getQueueState();
  if (queueState.currentJobId) {
    const job = createJob(searchSlug);
    addToQueue(job.id, searchSlug);
    return job;
  }

  // Create job
  const job = createJob(searchSlug);
  const sessionName = getTmuxSessionName(job.id);
  const jobDir = getJobDir(searchSlug, job.id);
  const logPath = getJobLogPath(searchSlug, job.id);
  const reportPath = getJobReportPath(searchSlug, job.id);
  const donePath = join(jobDir, "DONE");
  const opencodeBin = findOpencodeBinary();
  const projectRoot = findProjectRoot();

  // Process prompt template (replace {{reportPath}}, {{searchSlug}}, {{jobId}})
  const prompt = processPrompt(promptTemplate, {
    reportPath,
    searchSlug,
    jobId: job.id,
  });

  // Mark running
  setCurrentJob(job.id);
  updateJob(searchSlug, job.id, {
    status: "running",
    startedAt: new Date().toISOString(),
    tmuxSession: sessionName,
  });

  options.onStart?.(job);

  // Write processed prompt to job folder (for debugging/history)
  const promptFile = join(jobDir, "prompt.txt");
  writeFileSync(promptFile, prompt);

  // Script: run opencode, then touch DONE
  // Extract agent from prompt if it starts with @agent-name
  const agentMatch = prompt.match(/^@([\w-]+)/);
  const agentFlag = agentMatch ? `--agent ${agentMatch[1]}` : "";
  
  const scriptPath = join(jobDir, "run.sh");
  writeFileSync(
    scriptPath,
    `#!/bin/bash
cd "${projectRoot}"
PROMPT=$(cat "${promptFile}")
${opencodeBin} run ${agentFlag} "$PROMPT" 2>&1 | tee "${logPath}"
touch "${donePath}"
`
  );
  execSync(`chmod +x "${scriptPath}"`);

  // Start tmux session
  try {
    execSync(`tmux new-session -d -s "${sessionName}" "${scriptPath}"`, { stdio: "pipe" });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    updateJob(searchSlug, job.id, {
      status: "failed",
      completedAt: new Date().toISOString(),
      error: `tmux failed: ${errMsg}`,
    });
    setCurrentJob(undefined);
    throw error;
  }

  // Watch for completion
  watchJobCompletion(searchSlug, job.id, sessionName, reportPath, donePath, options);

  return getJob(searchSlug, job.id)!;
}

function watchJobCompletion(
  searchSlug: string,
  jobId: string,
  sessionName: string,
  reportPath: string,
  donePath: string,
  options: RunJobOptions
): void {
  const checkInterval = setInterval(() => {
    const doneExists = existsSync(donePath);
    const sessionGone = !tmuxSessionExists(sessionName);

    if (doneExists || sessionGone) {
      clearInterval(checkInterval);
      activeWatchers.delete(jobId);
      // Wait a moment for file writes to complete
      setTimeout(() => finalizeJob(searchSlug, jobId, reportPath, options), 2000);
    }
  }, 2000);

  // Store the interval so we can cancel it if job is deleted
  activeWatchers.set(jobId, checkInterval);
}

function finalizeJob(
  searchSlug: string,
  jobId: string,
  reportPath: string,
  options: RunJobOptions
): void {
  // Clear the watcher for this job (in case it wasn't cleared already)
  const watcher = activeWatchers.get(jobId);
  if (watcher) {
    clearInterval(watcher);
    activeWatchers.delete(jobId);
  }

  // Check if job still exists (might have been deleted while running)
  const existingJob = getJob(searchSlug, jobId);
  if (!existingJob) {
    // Job was deleted - just clean up and move on
    setCurrentJob(undefined);
    processQueue(options);
    return;
  }

  // Simple: check if report.md exists and has content
  const hasReport = existsSync(reportPath);
  let report = "";
  
  if (hasReport) {
    report = readFileSync(reportPath, "utf-8").trim();
  }

  const success = report.length > 100;

  const completedJob = updateJob(searchSlug, jobId, {
    status: success ? "completed" : "failed",
    completedAt: new Date().toISOString(),
    error: success ? undefined : "No report generated",
  });

  setCurrentJob(undefined);

  options.onComplete?.({
    job: completedJob,
    report: success ? report : undefined,
    logFile: getJobLogPath(searchSlug, jobId),
  });

  processQueue(options);
}

async function processQueue(options: RunJobOptions): Promise<void> {
  const next = getNextQueuedJob();
  if (!next) return;

  removeFromQueue(next.jobId);

  const job = getJob(next.searchSlug, next.jobId);
  if (job && job.status === "queued") {
    const search = getSearch(next.searchSlug);
    if (search) {
      await startJob(next.searchSlug, options);
    }
  }
}

// === JOB CONTROL ===

export function attachToJob(jobId: string): void {
  const sessionName = getTmuxSessionName(jobId);
  if (!tmuxSessionExists(sessionName)) {
    throw new Error(`No session for job ${jobId}`);
  }
  const result = spawnSync("tmux", ["attach", "-t", sessionName], { stdio: "inherit" });
  if (result.error) throw result.error;
}

/**
 * Cancel a job watcher interval (called when job is deleted or cancelled)
 */
export function cancelJobWatcher(jobId: string): void {
  const watcher = activeWatchers.get(jobId);
  if (watcher) {
    clearInterval(watcher);
    activeWatchers.delete(jobId);
  }
}

export function cancelJob(searchSlug: string, jobId: string): void {
  const job = getJob(searchSlug, jobId);
  if (!job) throw new Error(`Job "${jobId}" not found`);

  // Cancel the watcher first to prevent finalizeJob from running
  cancelJobWatcher(jobId);

  if (job.status === "queued") {
    removeFromQueue(jobId);
    updateJob(searchSlug, jobId, { status: "cancelled", completedAt: new Date().toISOString() });
  } else if (job.status === "running" && job.tmuxSession) {
    try {
      execSync(`tmux kill-session -t ${job.tmuxSession}`, { stdio: "ignore" });
    } catch {}
    updateJob(searchSlug, jobId, { status: "cancelled", completedAt: new Date().toISOString() });
    setCurrentJob(undefined);
  }
}

export function getRunningJob(): { searchSlug: string; job: Job } | null {
  const state = getQueueState();
  if (!state.currentJobId) return null;

  const searchesDir = getSearchesDir();
  if (!existsSync(searchesDir)) return null;

  for (const slug of readdirSync(searchesDir)) {
    const job = getJob(slug, state.currentJobId);
    if (job) return { searchSlug: slug, job };
  }
  return null;
}
