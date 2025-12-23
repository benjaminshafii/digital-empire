// Scheduler - Runs jobs based on cron expressions
//
// Supports standard cron format: "minute hour day month weekday"
// Examples:
//   "0 9 * * *"     - Daily at 9 AM
//   "0 *\/4 * * *"  - Every 4 hours
//   "0 9 * * 1"     - Weekly on Monday at 9 AM

import type { Search } from "./types";
import { listSearches } from "./search-store";
import { listJobsForSearch } from "./job-store";
import { startJob, getRunningJob } from "./job-runner";

let schedulerInterval: ReturnType<typeof setInterval> | null = null;
let isSchedulerRunning = false;

/**
 * Parse a cron field and check if current value matches
 */
function matchesCronField(field: string, value: number, max: number): boolean {
  // Wildcard matches everything
  if (field === "*") return true;
  
  // Step values: */n
  if (field.startsWith("*/")) {
    const step = parseInt(field.slice(2), 10);
    if (isNaN(step) || step <= 0) return false;
    return value % step === 0;
  }
  
  // Range: n-m
  if (field.includes("-")) {
    const [start, end] = field.split("-").map(n => parseInt(n, 10));
    if (isNaN(start) || isNaN(end)) return false;
    return value >= start && value <= end;
  }
  
  // List: n,m,o
  if (field.includes(",")) {
    const values = field.split(",").map(n => parseInt(n, 10));
    return values.includes(value);
  }
  
  // Exact match
  const exact = parseInt(field, 10);
  return !isNaN(exact) && value === exact;
}

/**
 * Check if a cron expression matches the current time
 */
function cronMatchesNow(cron: string): boolean {
  const parts = cron.trim().split(/\s+/);
  if (parts.length !== 5) return false;
  
  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;
  const now = new Date();
  
  return (
    matchesCronField(minute, now.getMinutes(), 59) &&
    matchesCronField(hour, now.getHours(), 23) &&
    matchesCronField(dayOfMonth, now.getDate(), 31) &&
    matchesCronField(month, now.getMonth() + 1, 12) && // months are 1-12 in cron
    matchesCronField(dayOfWeek, now.getDay(), 6) // 0 = Sunday
  );
}

/**
 * Check if a search should run now based on its cron schedule
 */
function shouldRunSearch(search: Search): boolean {
  if (!search.schedule) return false;
  
  // Check if cron matches current minute
  if (!cronMatchesNow(search.schedule)) return false;
  
  // Check if we already ran this minute (prevent double runs)
  const jobs = listJobsForSearch(search.slug);
  const recentJob = jobs[0];
  
  if (recentJob) {
    const jobTime = new Date(recentJob.createdAt);
    const now = new Date();
    
    // If job was created in the same minute, don't run again
    if (
      jobTime.getFullYear() === now.getFullYear() &&
      jobTime.getMonth() === now.getMonth() &&
      jobTime.getDate() === now.getDate() &&
      jobTime.getHours() === now.getHours() &&
      jobTime.getMinutes() === now.getMinutes()
    ) {
      return false;
    }
  }
  
  return true;
}

/**
 * Run the scheduler check - called every minute
 */
function runSchedulerCheck() {
  // Don't run if another job is currently running
  if (getRunningJob()) return;
  
  const searches = listSearches().filter((s) => s.schedule);
  
  for (const search of searches) {
    if (shouldRunSearch(search)) {
      console.log(`[scheduler] Starting scheduled job: ${search.slug}`);
      startJob(search.slug).catch((err) => {
        console.error(`[scheduler] Failed to start ${search.slug}:`, err);
      });
      // Only start one job at a time
      break;
    }
  }
}

/**
 * Start the scheduler (runs every minute)
 */
export function startScheduler(): void {
  if (schedulerInterval) return;
  
  isSchedulerRunning = true;
  console.log("[scheduler] Started - checking every minute");
  
  // Run immediately, then every minute
  runSchedulerCheck();
  schedulerInterval = setInterval(runSchedulerCheck, 60000);
}

/**
 * Stop the scheduler
 */
export function stopScheduler(): void {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
  }
  isSchedulerRunning = false;
  console.log("[scheduler] Stopped");
}

/**
 * Check if scheduler is running
 */
export function isSchedulerActive(): boolean {
  return isSchedulerRunning;
}

/**
 * Get human-readable description of next run time
 */
export function getNextRunDescription(cron: string): string {
  // Common patterns
  const patterns: Record<string, string> = {
    "0 */2 * * *": "Every 2 hours",
    "0 */4 * * *": "Every 4 hours",
    "0 */6 * * *": "Every 6 hours",
    "0 */12 * * *": "Every 12 hours",
    "0 7 * * *": "Daily at 7 AM",
    "0 9 * * *": "Daily at 9 AM",
    "0 12 * * *": "Daily at 12 PM",
    "0 18 * * *": "Daily at 6 PM",
    "0 21 * * *": "Daily at 9 PM",
    "0 9 * * 1": "Weekly on Monday at 9 AM",
    "0 9 * * 6": "Weekly on Saturday at 9 AM",
  };
  
  if (patterns[cron]) return patterns[cron];
  
  // Try to parse
  const parts = cron.trim().split(/\s+/);
  if (parts.length !== 5) return cron;
  
  const [minute, hour, , , dayOfWeek] = parts;
  
  // Hourly intervals
  if (hour.startsWith("*/")) {
    const interval = hour.slice(2);
    return `Every ${interval} hour${interval === "1" ? "" : "s"}`;
  }
  
  // Daily at specific time
  if (dayOfWeek === "*" && !hour.includes("*") && !hour.includes("/")) {
    const h = parseInt(hour, 10);
    const ampm = h >= 12 ? "PM" : "AM";
    const displayHour = h > 12 ? h - 12 : h === 0 ? 12 : h;
    return `Daily at ${displayHour} ${ampm}`;
  }
  
  // Weekly
  if (dayOfWeek !== "*" && !hour.includes("*")) {
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const dayNum = parseInt(dayOfWeek, 10);
    const h = parseInt(hour, 10);
    const ampm = h >= 12 ? "PM" : "AM";
    const displayHour = h > 12 ? h - 12 : h === 0 ? 12 : h;
    if (dayNum >= 0 && dayNum <= 6) {
      return `Weekly on ${days[dayNum]} at ${displayHour} ${ampm}`;
    }
  }
  
  return cron;
}
