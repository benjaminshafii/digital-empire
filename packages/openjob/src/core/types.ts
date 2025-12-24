/**
 * Core types for opencode job orchestrator
 *
 * This is a generic job runner for OpenCode. The prompt (stored in prompt.md)
 * is the source of truth - it can reference any agents via @agent syntax.
 */

// Search - a saved job configuration
// The actual prompt content lives in prompt.md, not here
export interface Search {
  slug: string;
  name: string;
  schedule?: string; // interval: "30m", "1h", "6h", "24h"
  createdAt: string; // ISO date
  updatedAt?: string;
}

// Job - a single execution of a search
export interface Job {
  id: string;
  searchSlug: string;
  status: "queued" | "running" | "completed" | "failed" | "cancelled";
  title?: string; // AI-generated title for the job
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  duration?: number; // Duration in milliseconds
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
  logFile?: string; // path to log file
}

// Options for creating a search
export interface CreateSearchOptions {
  name: string;
  prompt: string; // Initial prompt content (will be written to prompt.md)
  schedule?: string;
}

// Context passed to prompt transformer
export interface PromptContext {
  searchSlug: string;
  jobId: string;
  jobDir: string;
}

// Options for running a job
export interface RunJobOptions {
  attach?: boolean; // attach to tmux session immediately
  onStart?: (job: Job) => void;
  onComplete?: (result: JobResult) => void;
  /**
   * Transform the prompt before execution.
   * Apps can use this to inject template variables like {{reportPath}}.
   * The prompt is transformed after the job is created but before execution.
   */
  transformPrompt?: (prompt: string, context: PromptContext) => string;
}
