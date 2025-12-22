/**
 * File paths and directory structure
 * 
 * Data is stored in the colocated `data/` folder by default.
 * Can be overridden with MKT_DATA_DIR environment variable.
 */
import { homedir } from "os";
import { join, dirname } from "path";
import { existsSync, mkdirSync } from "fs";

// Find the package root (where package.json is)
function findPackageRoot(): string {
  // Start from this file's location and walk up
  let dir = dirname(new URL(import.meta.url).pathname);
  const root = "/";

  while (dir !== root) {
    if (existsSync(join(dir, "package.json"))) {
      return dir;
    }
    dir = dirname(dir);
  }

  // Fallback to known location
  const fallback = join(homedir(), "git", "personal", "cool-website", "apps", "marketplace-tracker");
  if (existsSync(join(fallback, "package.json"))) {
    return fallback;
  }

  return process.cwd();
}

// Base data directory - colocated in the repo
function getDataDir(): string {
  // Allow override via env var
  if (process.env.MKT_DATA_DIR) {
    return process.env.MKT_DATA_DIR;
  }
  
  // Default to ./data relative to package root
  return join(findPackageRoot(), "data");
}

export const DATA_DIR = getDataDir();
export const SEARCHES_DIR = join(DATA_DIR, "searches");
export const QUEUE_FILE = join(DATA_DIR, "queue.json");

// Legacy alias for backwards compatibility
export const CONFIG_DIR = DATA_DIR;

// Search-specific paths
export function getSearchDir(slug: string): string {
  return join(SEARCHES_DIR, slug);
}

export function getSearchConfigPath(slug: string): string {
  return join(getSearchDir(slug), "config.json");
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
  ensureDir(DATA_DIR);
  ensureDir(SEARCHES_DIR);
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
  const fallback = join(homedir(), "git", "personal", "cool-website");
  if (existsSync(join(fallback, "opencode.json"))) {
    return fallback;
  }

  return process.cwd();
}
