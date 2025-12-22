/**
 * JobStore - CRUD operations for jobs (search executions)
 */
import {
  readFileSync,
  writeFileSync,
  existsSync,
  readdirSync,
  rmSync,
} from "fs";
import { randomBytes } from "crypto";
import type { Job, QueueState } from "./types";
import {
  QUEUE_FILE,
  SEARCHES_DIR,
  getSearchJobsDir,
  getJobDir,
  getJobMetaPath,
  getJobLogPath,
  getJobReportPath,
  ensureDir,
  ensureConfigDirs,
} from "./paths";

// Generate a short random job ID
function generateJobId(): string {
  return randomBytes(6).toString("hex");
}

// Create a new job
export function createJob(searchSlug: string): Job {
  ensureConfigDirs();

  const jobId = generateJobId();
  const jobDir = getJobDir(searchSlug, jobId);
  ensureDir(jobDir);

  const job: Job = {
    id: jobId,
    searchSlug,
    status: "queued",
    createdAt: new Date().toISOString(),
  };

  writeFileSync(getJobMetaPath(searchSlug, jobId), JSON.stringify(job, null, 2));

  return job;
}

// Get a job by ID
export function getJob(searchSlug: string, jobId: string): Job | null {
  const metaPath = getJobMetaPath(searchSlug, jobId);

  if (!existsSync(metaPath)) {
    return null;
  }

  try {
    return JSON.parse(readFileSync(metaPath, "utf-8"));
  } catch {
    return null;
  }
}

// Update a job
export function updateJob(searchSlug: string, jobId: string, updates: Partial<Job>): Job {
  const job = getJob(searchSlug, jobId);

  if (!job) {
    throw new Error(`Job "${jobId}" not found`);
  }

  const updated: Job = {
    ...job,
    ...updates,
  };

  writeFileSync(getJobMetaPath(searchSlug, jobId), JSON.stringify(updated, null, 2));

  return updated;
}

// List jobs for a search
export function listJobsForSearch(searchSlug: string): Job[] {
  const jobsDir = getSearchJobsDir(searchSlug);

  if (!existsSync(jobsDir)) {
    return [];
  }

  const jobs: Job[] = [];

  for (const jobId of readdirSync(jobsDir)) {
    const job = getJob(searchSlug, jobId);
    if (job) {
      jobs.push(job);
    }
  }

  return jobs.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

// List all recent jobs across all searches
export function listAllJobs(limit = 20): Job[] {
  ensureConfigDirs();

  // Read search slugs directly to avoid circular dependency
  if (!existsSync(SEARCHES_DIR)) {
    return [];
  }

  const allJobs: Job[] = [];
  const searchSlugs = readdirSync(SEARCHES_DIR);

  for (const slug of searchSlugs) {
    const jobs = listJobsForSearch(slug);
    allJobs.push(...jobs);
  }

  return allJobs
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
}

// Get job log content
export function getJobLog(searchSlug: string, jobId: string, tailLines?: number): string {
  const logPath = getJobLogPath(searchSlug, jobId);

  if (!existsSync(logPath)) {
    return "";
  }

  const content = readFileSync(logPath, "utf-8");

  if (tailLines) {
    const lines = content.split("\n");
    return lines.slice(-tailLines).join("\n");
  }

  return content;
}

// Get job report content
export function getJobReport(searchSlug: string, jobId: string): string | null {
  const reportPath = getJobReportPath(searchSlug, jobId);

  if (!existsSync(reportPath)) {
    return null;
  }

  return readFileSync(reportPath, "utf-8");
}

// Save job report
export function saveJobReport(searchSlug: string, jobId: string, report: string): void {
  const reportPath = getJobReportPath(searchSlug, jobId);
  writeFileSync(reportPath, report);
}

// Delete a job
export function deleteJob(searchSlug: string, jobId: string): void {
  const jobDir = getJobDir(searchSlug, jobId);

  if (existsSync(jobDir)) {
    rmSync(jobDir, { recursive: true });
  }
}

// Get the latest completed job for a search
export function getLatestJob(searchSlug: string): Job | null {
  const jobs = listJobsForSearch(searchSlug);
  return jobs.find((j) => j.status === "completed") || null;
}

// Queue operations
export function getQueueState(): QueueState {
  if (!existsSync(QUEUE_FILE)) {
    return { queue: [], lastUpdated: new Date().toISOString() };
  }

  try {
    return JSON.parse(readFileSync(QUEUE_FILE, "utf-8"));
  } catch {
    return { queue: [], lastUpdated: new Date().toISOString() };
  }
}

export function saveQueueState(state: QueueState): void {
  ensureConfigDirs();
  state.lastUpdated = new Date().toISOString();
  writeFileSync(QUEUE_FILE, JSON.stringify(state, null, 2));
}

export function addToQueue(jobId: string, searchSlug: string): void {
  const state = getQueueState();

  // Store as "searchSlug:jobId" so we can reconstruct
  state.queue.push(`${searchSlug}:${jobId}`);
  saveQueueState(state);
}

export function removeFromQueue(jobId: string): void {
  const state = getQueueState();
  state.queue = state.queue.filter((item) => !item.endsWith(`:${jobId}`));
  saveQueueState(state);
}

export function setCurrentJob(jobId: string | undefined): void {
  const state = getQueueState();
  state.currentJobId = jobId;
  saveQueueState(state);
}

export function getNextQueuedJob(): { searchSlug: string; jobId: string } | null {
  const state = getQueueState();

  if (state.queue.length === 0) {
    return null;
  }

  const [searchSlug, jobId] = state.queue[0].split(":");
  return { searchSlug, jobId };
}

// Clear all queued jobs (but not the running one)
export function clearQueue(): void {
  const state = getQueueState();
  
  // Mark all queued jobs as cancelled
  for (const item of state.queue) {
    const [searchSlug, jobId] = item.split(":");
    try {
      updateJob(searchSlug, jobId, {
        status: "cancelled",
        completedAt: new Date().toISOString(),
      });
    } catch {
      // Job might not exist
    }
  }
  
  state.queue = [];
  saveQueueState(state);
}
