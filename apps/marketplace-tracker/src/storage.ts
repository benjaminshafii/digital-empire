/**
 * Simple JSON file storage for marketplace-tracker
 * 
 * Stores searches and jobs in ./data/ relative to the app
 */
import { join, dirname } from "path";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync, unlinkSync, rmSync } from "fs";

// Data directory - ./data relative to this app
const appDir = dirname(dirname(new URL(import.meta.url).pathname));
const DATA_DIR = join(appDir, "data");
const SEARCHES_DIR = join(DATA_DIR, "searches");
const JOBS_DIR = join(DATA_DIR, "jobs");
const REPORTS_DIR = join(DATA_DIR, "reports");

// === TYPES ===

export interface Search {
  slug: string;
  name: string;
  schedule?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Job {
  id: string;
  searchSlug: string;
  status: "pending" | "running" | "completed" | "failed";
  title?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AppConfig {
  telegramBotToken: string;
  telegramChatId: string;
  location: string;
}

// === HELPERS ===

function ensureDir(dir: string): void {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// === INIT ===

export function ensureDataDirs(): void {
  ensureDir(DATA_DIR);
  ensureDir(SEARCHES_DIR);
  ensureDir(JOBS_DIR);
  ensureDir(REPORTS_DIR);
}

export function getDataDir(): string {
  return DATA_DIR;
}

// === CONFIG ===

export function getConfigPath(): string {
  return join(DATA_DIR, "config.json");
}

export function getConfig(): AppConfig {
  const configPath = getConfigPath();
  if (existsSync(configPath)) {
    try {
      return JSON.parse(readFileSync(configPath, "utf-8"));
    } catch {
      // Return defaults on error
    }
  }
  return { telegramBotToken: "", telegramChatId: "", location: "sanfrancisco" };
}

export function saveConfig(config: AppConfig): void {
  ensureDir(DATA_DIR);
  const configPath = getConfigPath();
  writeFileSync(configPath, JSON.stringify(config, null, 2));
}

// === SEARCHES ===

function getSearchPath(slug: string): string {
  return join(SEARCHES_DIR, `${slug}.json`);
}

export function searchExists(slug: string): boolean {
  return existsSync(getSearchPath(slug));
}

export function getSearch(slug: string): Search | null {
  const path = getSearchPath(slug);
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf-8"));
  } catch {
    return null;
  }
}

export function listSearches(): Search[] {
  ensureDir(SEARCHES_DIR);
  const files = readdirSync(SEARCHES_DIR).filter(f => f.endsWith(".json"));
  const searches = files.map(f => {
    try {
      return JSON.parse(readFileSync(join(SEARCHES_DIR, f), "utf-8")) as Search;
    } catch {
      return null;
    }
  }).filter(Boolean) as Search[];
  
  // Sort by most recent first
  return searches.sort((a, b) => 
    new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()
  );
}

export function createSearch(data: { name: string }): Search {
  ensureDir(SEARCHES_DIR);
  
  let slug = slugify(data.name);
  let counter = 2;
  while (searchExists(slug)) {
    slug = `${slugify(data.name)}-${counter++}`;
  }
  
  const now = new Date().toISOString();
  const search: Search = {
    slug,
    name: data.name,
    createdAt: now,
    updatedAt: now,
  };
  
  writeFileSync(getSearchPath(slug), JSON.stringify(search, null, 2));
  return search;
}

export function updateSearch(slug: string, updates: Partial<Pick<Search, "schedule">>): Search | null {
  const search = getSearch(slug);
  if (!search) return null;
  
  const updated: Search = {
    ...search,
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  
  writeFileSync(getSearchPath(slug), JSON.stringify(updated, null, 2));
  return updated;
}

export function deleteSearch(slug: string): void {
  const searchPath = getSearchPath(slug);
  if (existsSync(searchPath)) {
    unlinkSync(searchPath);
  }
  
  // Also delete all jobs and reports for this search
  const jobsDir = join(JOBS_DIR, slug);
  if (existsSync(jobsDir)) {
    rmSync(jobsDir, { recursive: true, force: true });
  }
  
  const reportsDir = join(REPORTS_DIR, slug);
  if (existsSync(reportsDir)) {
    rmSync(reportsDir, { recursive: true, force: true });
  }
}

// === JOBS ===

function getJobDir(searchSlug: string): string {
  return join(JOBS_DIR, searchSlug);
}

function getJobPath(searchSlug: string, jobId: string): string {
  return join(getJobDir(searchSlug), `${jobId}.json`);
}

export function getJob(searchSlug: string, jobId: string): Job | null {
  const path = getJobPath(searchSlug, jobId);
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf-8"));
  } catch {
    return null;
  }
}

export function listJobsForSearch(searchSlug: string): Job[] {
  const dir = getJobDir(searchSlug);
  if (!existsSync(dir)) return [];
  
  const files = readdirSync(dir).filter(f => f.endsWith(".json"));
  const jobs = files.map(f => {
    try {
      return JSON.parse(readFileSync(join(dir, f), "utf-8")) as Job;
    } catch {
      return null;
    }
  }).filter(Boolean) as Job[];
  
  // Sort by most recent first
  return jobs.sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function createJob(searchSlug: string): Job {
  ensureDir(getJobDir(searchSlug));
  
  const id = generateId();
  const now = new Date().toISOString();
  
  const job: Job = {
    id,
    searchSlug,
    status: "pending",
    createdAt: now,
    updatedAt: now,
  };
  
  writeFileSync(getJobPath(searchSlug, id), JSON.stringify(job, null, 2));
  return job;
}

export function updateJob(
  searchSlug: string, 
  jobId: string, 
  updates: Partial<Pick<Job, "status" | "title">>
): Job | null {
  const job = getJob(searchSlug, jobId);
  if (!job) return null;
  
  const updated: Job = {
    ...job,
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  
  writeFileSync(getJobPath(searchSlug, jobId), JSON.stringify(updated, null, 2));
  return updated;
}

// === PROMPTS ===

function getPromptPath(searchSlug: string): string {
  return join(SEARCHES_DIR, `${searchSlug}.prompt.md`);
}

export function getPrompt(searchSlug: string): string | null {
  const path = getPromptPath(searchSlug);
  if (!existsSync(path)) return null;
  try {
    return readFileSync(path, "utf-8");
  } catch {
    return null;
  }
}

export function savePrompt(searchSlug: string, prompt: string): void {
  ensureDir(SEARCHES_DIR);
  writeFileSync(getPromptPath(searchSlug), prompt);
}

// === REPORTS ===

function getReportDir(searchSlug: string): string {
  return join(REPORTS_DIR, searchSlug);
}

export function getReportPath(searchSlug: string, jobId: string): string {
  return join(getReportDir(searchSlug), `${jobId}.md`);
}

export function getJobReport(searchSlug: string, jobId: string): string | null {
  const path = getReportPath(searchSlug, jobId);
  if (!existsSync(path)) return null;
  try {
    return readFileSync(path, "utf-8");
  } catch {
    return null;
  }
}

export function saveReport(searchSlug: string, jobId: string, content: string): void {
  ensureDir(getReportDir(searchSlug));
  writeFileSync(getReportPath(searchSlug, jobId), content);
}

// === RUNNING JOB TRACKING ===

const RUNNING_JOB_PATH = join(DATA_DIR, "running.json");

interface RunningJobInfo {
  searchSlug: string;
  jobId: string;
  pid?: number;
  startedAt: string;
}

export function getRunningJob(): RunningJobInfo | null {
  if (!existsSync(RUNNING_JOB_PATH)) return null;
  try {
    const info = JSON.parse(readFileSync(RUNNING_JOB_PATH, "utf-8")) as RunningJobInfo;
    
    // Check if process is still running
    if (info.pid) {
      try {
        process.kill(info.pid, 0); // signal 0 just checks if process exists
      } catch {
        // Process is dead, clean up
        unlinkSync(RUNNING_JOB_PATH);
        return null;
      }
    }
    
    return info;
  } catch {
    return null;
  }
}

export function setRunningJob(searchSlug: string, jobId: string, pid?: number): void {
  ensureDir(DATA_DIR);
  const info: RunningJobInfo = {
    searchSlug,
    jobId,
    pid,
    startedAt: new Date().toISOString(),
  };
  writeFileSync(RUNNING_JOB_PATH, JSON.stringify(info, null, 2));
}

export function clearRunningJob(): void {
  if (existsSync(RUNNING_JOB_PATH)) {
    unlinkSync(RUNNING_JOB_PATH);
  }
}
