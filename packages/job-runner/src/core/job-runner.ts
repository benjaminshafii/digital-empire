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

/**
 * Process the prompt template, replacing variables:
 * - {{reportPath}} → absolute path to report.md for this job
 */
function processPrompt(promptTemplate: string, reportPath: string): string {
  return promptTemplate.replace(/\{\{reportPath\}\}/g, reportPath);
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

  // Process prompt template (replace {{reportPath}})
  const prompt = processPrompt(promptTemplate, reportPath);

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
  // Note: No --agent flag - agents are referenced in the prompt via @agent syntax
  const scriptPath = join(jobDir, "run.sh");
  writeFileSync(
    scriptPath,
    `#!/bin/bash
cd "${projectRoot}"
PROMPT=$(cat "${promptFile}")
${opencodeBin} run "$PROMPT" 2>&1 | tee "${logPath}"
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
      // Wait a moment for file writes to complete
      setTimeout(() => finalizeJob(searchSlug, jobId, reportPath, options), 2000);
    }
  }, 2000);
}

function finalizeJob(
  searchSlug: string,
  jobId: string,
  reportPath: string,
  options: RunJobOptions
): void {
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

export function cancelJob(searchSlug: string, jobId: string): void {
  const job = getJob(searchSlug, jobId);
  if (!job) throw new Error(`Job "${jobId}" not found`);

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
