/**
 * Core types for marketplace-tracker
 */

// Search - a saved search configuration
export interface Search {
  slug: string;
  name: string;
  prompt: string;
  location: string;
  schedule?: string; // cron expression (e.g., "0 9 * * *" for daily at 9am)
  createdAt: string; // ISO date
  updatedAt?: string;
}

// Job - a single execution of a search
export interface Job {
  id: string;
  searchSlug: string;
  status: "queued" | "running" | "completed" | "failed" | "cancelled";
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  tmuxSession?: string; // tmux session name when running
}

// Queue state - persisted to survive restarts
export interface QueueState {
  currentJobId?: string;
  queue: string[]; // job IDs waiting
  lastUpdated: string;
}

// Result of running a job (for programmatic use)
export interface JobResult {
  job: Job;
  report?: string; // markdown report content
  logFile?: string; // path to log file
}

// Options for creating a search
export interface CreateSearchOptions {
  name: string;
  prompt: string;
  location?: string;
  schedule?: string;
}

// Options for running a job
export interface RunJobOptions {
  attach?: boolean; // attach to tmux session immediately
  onStart?: (job: Job) => void;
  onComplete?: (result: JobResult) => void;
}
