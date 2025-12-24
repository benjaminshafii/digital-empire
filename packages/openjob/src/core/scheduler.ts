// Scheduler - Supports both simple intervals and cron expressions
//
// Simple interval formats:
//   "30m"      - Every 30 minutes
//   "1h"       - Every hour
//   "2h"       - Every 2 hours
//   "24h"      - Daily (every 24 hours)
//
// Cron format (5-field):
//   "0 9 * * *"   - Daily at 9 AM
//   "0 9 * * 1"   - Weekly on Monday at 9 AM

import type { Search, Job } from "./types";
import { listSearches } from "./search-store";
import { listJobsForSearch, getLatestJob } from "./job-store";
import { startJob, getRunningJob } from "./job-runner";

let schedulerInterval: ReturnType<typeof setInterval> | null = null;
let isSchedulerRunning = false;

// ============================================
// Schedule Parsing - EXPORTED PRIMITIVES
// ============================================

/**
 * Check if schedule is a cron expression (5 space-separated fields)
 */
export function isCronSchedule(schedule: string): boolean {
  const parts = schedule.trim().split(/\s+/);
  return parts.length === 5;
}

/**
 * Parse simple interval schedule string to milliseconds
 * Returns null if invalid format
 */
export function parseIntervalSchedule(schedule: string): number | null {
  const match = schedule.match(/^(\d+)(m|h)$/);
  if (!match) return null;
  
  const [, num, unit] = match;
  const value = parseInt(num, 10);
  
  if (unit === "m") return value * 60 * 1000;
  if (unit === "h") return value * 60 * 60 * 1000;
  
  return null;
}

/**
 * Parse cron expression to get the interval in milliseconds (for recurring patterns)
 * Also can calculate next run time from cron
 */
export function parseCronField(field: string, min: number, max: number): number[] {
  if (field === "*") {
    return Array.from({ length: max - min + 1 }, (_, i) => min + i);
  }
  
  // Handle step values like */2
  if (field.startsWith("*/")) {
    const step = parseInt(field.slice(2), 10);
    const values: number[] = [];
    for (let i = min; i <= max; i += step) {
      values.push(i);
    }
    return values;
  }
  
  // Handle ranges like 1-5
  if (field.includes("-")) {
    const [start, end] = field.split("-").map(n => parseInt(n, 10));
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }
  
  // Handle lists like 1,3,5
  if (field.includes(",")) {
    return field.split(",").map(n => parseInt(n, 10));
  }
  
  // Single value
  return [parseInt(field, 10)];
}

/**
 * Check if current time matches cron expression
 */
export function cronMatchesNow(cron: string): boolean {
  const parts = cron.trim().split(/\s+/);
  if (parts.length !== 5) return false;
  
  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;
  const now = new Date();
  
  const nowMinute = now.getMinutes();
  const nowHour = now.getHours();
  const nowDayOfMonth = now.getDate();
  const nowMonth = now.getMonth() + 1; // JS months are 0-indexed
  const nowDayOfWeek = now.getDay(); // 0 = Sunday
  
  return (
    parseCronField(minute, 0, 59).includes(nowMinute) &&
    parseCronField(hour, 0, 23).includes(nowHour) &&
    parseCronField(dayOfMonth, 1, 31).includes(nowDayOfMonth) &&
    parseCronField(month, 1, 12).includes(nowMonth) &&
    parseCronField(dayOfWeek, 0, 6).includes(nowDayOfWeek)
  );
}

/**
 * Get the next time a cron expression will match
 */
export function getNextCronTime(cron: string, after: Date = new Date()): Date | null {
  const parts = cron.trim().split(/\s+/);
  if (parts.length !== 5) return null;
  
  const [minuteField, hourField, dayOfMonthField, monthField, dayOfWeekField] = parts;
  
  // Start from the next minute
  const next = new Date(after);
  next.setSeconds(0);
  next.setMilliseconds(0);
  next.setMinutes(next.getMinutes() + 1);
  
  // Search up to 1 year ahead
  const maxIterations = 366 * 24 * 60;
  
  for (let i = 0; i < maxIterations; i++) {
    const minute = next.getMinutes();
    const hour = next.getHours();
    const dayOfMonth = next.getDate();
    const month = next.getMonth() + 1;
    const dayOfWeek = next.getDay();
    
    const matchesMinute = parseCronField(minuteField, 0, 59).includes(minute);
    const matchesHour = parseCronField(hourField, 0, 23).includes(hour);
    const matchesDayOfMonth = parseCronField(dayOfMonthField, 1, 31).includes(dayOfMonth);
    const matchesMonth = parseCronField(monthField, 1, 12).includes(month);
    const matchesDayOfWeek = parseCronField(dayOfWeekField, 0, 6).includes(dayOfWeek);
    
    if (matchesMinute && matchesHour && matchesDayOfMonth && matchesMonth && matchesDayOfWeek) {
      return next;
    }
    
    // Move to next minute
    next.setMinutes(next.getMinutes() + 1);
  }
  
  return null;
}

/**
 * Parse schedule string to milliseconds (for simple intervals only)
 * Returns null if invalid format or if it's a cron expression
 */
export function parseSchedule(schedule: string): number | null {
  // If it's a cron expression, return null (can't convert to fixed interval)
  if (isCronSchedule(schedule)) return null;
  return parseIntervalSchedule(schedule);
}

/**
 * Get human-readable description of schedule
 */
export function describeSchedule(schedule: string): string {
  // Handle simple intervals
  const match = schedule.match(/^(\d+)(m|h)$/);
  if (match) {
    const [, num, unit] = match;
    const value = parseInt(num, 10);
    
    if (unit === "m") {
      return value === 1 ? "Every minute" : `Every ${value} minutes`;
    }
    if (unit === "h") {
      if (value === 24) return "Daily";
      return value === 1 ? "Every hour" : `Every ${value} hours`;
    }
  }
  
  // Handle cron expressions
  if (isCronSchedule(schedule)) {
    const parts = schedule.trim().split(/\s+/);
    const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;
    
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
    
    if (patterns[schedule]) return patterns[schedule];
    
    // Try to describe unknown patterns
    if (month === "*" && dayOfMonth === "*") {
      // Hourly intervals
      if (hour.startsWith("*/")) {
        const interval = hour.slice(2);
        return `Every ${interval} hour${interval === "1" ? "" : "s"}`;
      }
      
      // Daily at specific hour
      if (dayOfWeek === "*" && !hour.includes("*") && !hour.includes("/")) {
        const h = parseInt(hour, 10);
        const ampm = h >= 12 ? "PM" : "AM";
        const displayHour = h > 12 ? h - 12 : h === 0 ? 12 : h;
        return `Daily at ${displayHour} ${ampm}`;
      }
      
      // Weekly on specific day
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
    }
    
    return `Cron: ${schedule}`;
  }
  
  return schedule;
}

/**
 * Check if a job should run based on its schedule and last run time
 * Handles both simple intervals ("1h", "30m") and cron expressions ("0 9 * * *")
 */
export function shouldRun(search: Search, lastJob?: Job | null): boolean {
  if (!search.schedule) return false;
  
  // Handle cron expressions
  if (isCronSchedule(search.schedule)) {
    // For cron, check if we missed a scheduled run
    // This handles the reboot case: if a 9am job was supposed to run but didn't,
    // we should run it now if the scheduled time has passed
    
    if (!lastJob) {
      // Never ran before - check if we're currently at a scheduled time or past one today
      const now = new Date();
      const startOfDay = new Date(now);
      startOfDay.setHours(0, 0, 0, 0);
      
      const nextFromStartOfDay = getNextCronTime(search.schedule, new Date(startOfDay.getTime() - 60000));
      if (nextFromStartOfDay && nextFromStartOfDay.getTime() <= now.getTime()) {
        return true; // We missed a run today
      }
      return cronMatchesNow(search.schedule);
    }
    
    // Has run before - check if there's a scheduled run between last run and now
    const lastRunTime = new Date(lastJob.createdAt);
    const now = new Date();
    
    // Get the next scheduled time after the last run
    const nextScheduledAfterLastRun = getNextCronTime(search.schedule, lastRunTime);
    
    if (nextScheduledAfterLastRun && nextScheduledAfterLastRun.getTime() <= now.getTime()) {
      // A scheduled run was missed (e.g., server was down at 9am, now it's 10am)
      return true;
    }
    
    return false;
  }
  
  // Handle simple intervals
  const intervalMs = parseIntervalSchedule(search.schedule);
  if (!intervalMs) return false;
  
  // No previous job = should run
  if (!lastJob) return true;
  
  // Check if enough time has passed since last run
  const lastRunTime = new Date(lastJob.createdAt).getTime();
  const now = Date.now();
  const elapsed = now - lastRunTime;
  
  return elapsed >= intervalMs;
}

/**
 * Get next run time for a scheduled job
 * Returns null if not scheduled or invalid schedule
 */
export function getNextRunTime(search: Search, lastJob?: Job | null): Date | null {
  if (!search.schedule) return null;
  
  // Handle cron expressions
  if (isCronSchedule(search.schedule)) {
    if (!lastJob) {
      // Never ran - return now if we should run, otherwise next scheduled time
      const now = new Date();
      const startOfDay = new Date(now);
      startOfDay.setHours(0, 0, 0, 0);
      
      const nextFromStartOfDay = getNextCronTime(search.schedule, new Date(startOfDay.getTime() - 60000));
      if (nextFromStartOfDay && nextFromStartOfDay.getTime() <= now.getTime()) {
        return new Date(); // Should run now (missed earlier slot)
      }
      return getNextCronTime(search.schedule, now);
    }
    
    const lastRunTime = new Date(lastJob.createdAt);
    const now = new Date();
    
    // Get next scheduled time after last run
    const nextAfterLastRun = getNextCronTime(search.schedule, lastRunTime);
    
    if (nextAfterLastRun && nextAfterLastRun.getTime() <= now.getTime()) {
      // We missed a run, should run now
      return new Date();
    }
    
    return nextAfterLastRun;
  }
  
  // Handle simple intervals
  const intervalMs = parseIntervalSchedule(search.schedule);
  if (!intervalMs) return null;
  
  // No previous job = should run now
  if (!lastJob) return new Date();
  
  const lastRunTime = new Date(lastJob.createdAt).getTime();
  const nextRunTime = lastRunTime + intervalMs;
  
  return new Date(nextRunTime);
}

/**
 * Get time until next run in human-readable format
 */
export function getTimeUntilNextRun(search: Search, lastJob?: Job | null): string | null {
  const nextRun = getNextRunTime(search, lastJob);
  if (!nextRun) return null;
  
  const now = Date.now();
  const diff = nextRun.getTime() - now;
  
  if (diff <= 0) return "now";
  
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  
  if (mins < 60) return `in ${mins}m`;
  if (hours < 24) return `in ${hours}h ${mins % 60}m`;
  
  const days = Math.floor(hours / 24);
  return `in ${days}d ${hours % 24}h`;
}

/**
 * List all scheduled jobs with their next run times
 */
export function listScheduledJobs(): Array<{
  search: Search;
  lastJob: Job | null;
  nextRun: Date | null;
  timeUntil: string | null;
  description: string;
}> {
  return listSearches()
    .filter(s => s.schedule)
    .map(search => {
      const lastJob = getLatestJob(search.slug);
      return {
        search,
        lastJob,
        nextRun: getNextRunTime(search, lastJob),
        timeUntil: getTimeUntilNextRun(search, lastJob),
        description: describeSchedule(search.schedule!),
      };
    })
    .sort((a, b) => {
      // Sort by next run time (soonest first)
      if (!a.nextRun) return 1;
      if (!b.nextRun) return -1;
      return a.nextRun.getTime() - b.nextRun.getTime();
    });
}

// ============================================
// Built-in Scheduler
// ============================================

/**
 * Run the scheduler check - called every minute
 * On first run (startup), also checks for overdue jobs that were missed during downtime
 */
function runSchedulerCheck(isStartup: boolean = false) {
  // Don't run if another job is currently running
  if (getRunningJob()) return;
  
  const scheduled = listScheduledJobs();
  
  for (const { search, lastJob } of scheduled) {
    if (shouldRun(search, lastJob)) {
      if (isStartup) {
        console.log(`[scheduler] Found overdue job, starting: ${search.slug}`);
      } else {
        console.log(`[scheduler] Starting: ${search.slug}`);
      }
      startJob(search.slug).catch((err) => {
        console.error(`[scheduler] Failed to start ${search.slug}:`, err);
      });
      // Only start one job at a time
      break;
    }
  }
}

/**
 * Start the scheduler (checks every minute)
 * On startup, immediately checks for any overdue scheduled jobs that were missed
 */
export function startScheduler(): void {
  if (schedulerInterval) return;
  
  isSchedulerRunning = true;
  console.log("[scheduler] Started - checking every minute (will run overdue jobs on startup)");
  
  // Run immediately on startup (with isStartup=true to catch overdue jobs)
  runSchedulerCheck(true);
  // Then check every minute
  schedulerInterval = setInterval(() => runSchedulerCheck(false), 60000);
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

// Legacy export for backwards compatibility
export function getNextRunDescription(schedule: string): string {
  return describeSchedule(schedule);
}
