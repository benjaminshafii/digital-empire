/**
 * File paths and directory structure
 * 
 * Data directory must be configured by the app using setDataDir()
 * or via JOB_RUNNER_DATA_DIR environment variable.
 */
import { homedir } from "os";
import { join } from "path";
import { existsSync, mkdirSync } from "fs";

// Configurable data directory
let _dataDir: string | null = null;

/**
 * Set the data directory for job-runner.
 * Must be called before using any other functions.
 */
export function setDataDir(dir: string): void {
  _dataDir = dir;
  ensureDataDirs();
}

/**
 * Get the current data directory.
 * Throws if not configured.
 */
export function getDataDir(): string {
  if (_dataDir) return _dataDir;
  
  // Allow override via env var
  if (process.env.JOB_RUNNER_DATA_DIR) {
    _dataDir = process.env.JOB_RUNNER_DATA_DIR;
    return _dataDir;
  }
  
  throw new Error(
    "Data directory not configured. Call setDataDir() or set JOB_RUNNER_DATA_DIR environment variable."
  );
}

// Computed paths (call getDataDir() each time to ensure it's set)
export function getSearchesDir(): string {
  return join(getDataDir(), "searches");
}

export function getQueueFile(): string {
  return join(getDataDir(), "queue.json");
}

// Legacy exports for backwards compatibility
export const DATA_DIR = new Proxy({} as { toString: () => string }, {
  get: () => getDataDir(),
});

export const SEARCHES_DIR = new Proxy({} as { toString: () => string }, {
  get: () => getSearchesDir(),
});

export const QUEUE_FILE = new Proxy({} as { toString: () => string }, {
  get: () => getQueueFile(),
});

// Legacy alias for backwards compatibility
export const CONFIG_DIR = DATA_DIR;

// Search-specific paths
export function getSearchDir(slug: string): string {
  return join(getSearchesDir(), slug);
}

export function getSearchConfigPath(slug: string): string {
  return join(getSearchDir(slug), "config.json");
}

export function getSearchPromptPath(slug: string): string {
  return join(getSearchDir(slug), "prompt.md");
}

export function getSearchJobsDir(slug: string): string {
  return join(getSearchDir(slug), "jobs");
}

// Job-specific paths
export function getJobDir(searchSlug: string, jobId: string): string {
  return join(getSearchJobsDir(searchSlug), jobId);
}

export function getJobMetaPath(searchSlug: string, jobId: string): string {
  return join(getJobDir(searchSlug, jobId), "meta.json");
}

export function getJobLogPath(searchSlug: string, jobId: string): string {
  return join(getJobDir(searchSlug, jobId), "output.log");
}

export function getJobReportPath(searchSlug: string, jobId: string): string {
  return join(getJobDir(searchSlug, jobId), "report.md");
}

// Ensure directories exist
export function ensureDir(dir: string): void {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

export function ensureDataDirs(): void {
  const dataDir = getDataDir();
  ensureDir(dataDir);
  ensureDir(join(dataDir, "searches"));
}

// Legacy alias
export const ensureConfigDirs = ensureDataDirs;

// Find opencode binary
export function findOpencodeBinary(): string {
  const locations = [
    join(homedir(), ".opencode", "bin", "opencode"),
    "/usr/local/bin/opencode",
    "/opt/homebrew/bin/opencode",
  ];

  for (const loc of locations) {
    if (existsSync(loc)) {
      return loc;
    }
  }

  return "opencode";
}

// Find project root with opencode.json (for MCP config)
export function findProjectRoot(): string {
  // Start from current working directory and walk up
  let dir = process.cwd();
  const root = "/";

  while (dir !== root) {
    const configPath = join(dir, "opencode.json");
    if (existsSync(configPath)) {
      return dir;
    }
    dir = join(dir, "..");
  }

  // Fallback to known location
  const fallback = join(homedir(), "git", "personal", "digital-empire");
  if (existsSync(join(fallback, "opencode.json"))) {
    return fallback;
  }

  return process.cwd();
}
