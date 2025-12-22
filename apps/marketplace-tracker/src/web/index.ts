/**
 * Web server for Marketplace Tracker
 * 
 * Run with: bun run src/web/index.ts
 */
import { Hono } from "hono";
import { layout } from "./views/layout";
import { homePage, addSearchForm } from "./views/home";
import { searchPage } from "./views/search";
import { reportPage } from "./views/report";
import { listSearches, getSearch, createSearch, slugify, searchExists } from "../core/search-store";
import { listJobsForSearch, getJob, getJobReport } from "../core/job-store";
import { startJob, getRunningJob, cancelJob, tmuxSessionExists, getTmuxSessionName } from "../core/job-runner";
import { removeFromQueue, clearQueue, listAllJobs, updateJob, getJobLog, saveJobReport, setCurrentJob, getQueueState, deleteJob } from "../core/job-store";
import { ensureDataDirs } from "../core/paths";
import type { Job } from "../core/types";

// Ensure data directories exist
ensureDataDirs();

const app = new Hono();

// Add search page
app.get("/add", (c) => {
  const html = layout("Add Search", addSearchForm());
  return c.html(html);
});

// Home page - list all searches
app.get("/", (c) => {
  const searches = listSearches();
  const running = getRunningJob();
  const queueState = getQueueState();
  
  const searchesWithStatus = searches.map(search => {
    const jobs = listJobsForSearch(search.slug);
    const lastJob = jobs[0]; // Already sorted by date desc
    return {
      ...search,
      lastJob,
      jobCount: jobs.filter(j => j.status === "completed").length,
    };
  });

  const html = layout("Dashboard", homePage({
    searches: searchesWithStatus,
    runningJob: running,
    queuedCount: queueState.queue.length,
  }));
  return c.html(html);
});

// Search detail page
app.get("/search/:slug", (c) => {
  const slug = c.req.param("slug");
  const search = getSearch(slug);
  
  if (!search) {
    return c.html(layout("Not Found", `
      <div class="text-center py-12">
        <h1 class="text-2xl font-bold text-gray-900 mb-4">Search not found</h1>
        <a href="/" class="text-blue-600 hover:text-blue-800">Back to Dashboard</a>
      </div>
    `), 404);
  }

  const jobs = listJobsForSearch(slug);
  const runningJob = jobs.find(j => j.status === "running");

  const html = layout(search.name, searchPage({ search, jobs, runningJob }));
  return c.html(html);
});

// Report page
app.get("/search/:slug/:jobId", (c) => {
  const slug = c.req.param("slug");
  const jobId = c.req.param("jobId");
  
  const search = getSearch(slug);
  if (!search) {
    return c.html(layout("Not Found", "<p>Search not found</p>"), 404);
  }

  const job = getJob(slug, jobId);
  if (!job) {
    return c.html(layout("Not Found", "<p>Job not found</p>"), 404);
  }

  const report = getJobReport(slug, jobId);
  if (!report) {
    return c.html(layout("No Report", `
      <div class="text-center py-12">
        <h1 class="text-xl font-bold text-gray-900 mb-4">No report available</h1>
        <p class="text-gray-600 mb-4">This job may still be running or failed to generate a report.</p>
        <a href="/search/${slug}" class="text-blue-600 hover:text-blue-800">Back to ${search.name}</a>
      </div>
    `));
  }

  const html = layout(`${search.name} Report`, reportPage({ search, job, report }));
  return c.html(html);
});

// Generate a short name from a prompt using opencode
async function generateNameFromPrompt(prompt: string): Promise<string> {
  const { execSync } = await import("child_process");
  const { findOpencodeBinary } = await import("../core/paths");
  
  try {
    const opencode = findOpencodeBinary();
    const escaped = prompt.replace(/"/g, '\\"').replace(/\n/g, ' ');
    
    const result = execSync(
      `${opencode} run "Generate a 1-3 word title for this marketplace search. Reply with ONLY the title, nothing else: ${escaped}"`,
      { 
        encoding: "utf-8",
        timeout: 15000,
        cwd: process.cwd(),
      }
    );
    
    // Extract the title from opencode output - look for the last non-empty line
    const lines = result.trim().split("\n").filter(l => l.trim());
    const title = lines[lines.length - 1]?.trim() || "";
    
    // Clean up
    return title.replace(/["'`]/g, "").substring(0, 40) || "search";
  } catch {
    // Fallback: extract main noun from prompt
    const words = prompt.split(/\s+/).slice(0, 2).join(" ");
    return words.substring(0, 30) || "search";
  }
}

// API: Create a new search
app.post("/api/search", async (c) => {
  try {
    const body = await c.req.parseBody();
    const prompt = body.prompt as string;
    const location = (body.location as string) || "San Francisco";

    if (!prompt) {
      return c.html(`
        <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
          Please describe what you're looking for.
        </div>
      `, 400);
    }

    // Auto-generate name from prompt using AI
    const name = await generateNameFromPrompt(prompt);
    const slug = slugify(name);
    
    // If slug already exists, add a number
    let finalSlug = slug;
    let counter = 2;
    while (searchExists(finalSlug)) {
      finalSlug = `${slug}-${counter}`;
      counter++;
    }

    const search = createSearch({ 
      name: finalSlug === slug ? name : `${name} ${counter - 1}`, 
      prompt, 
      location 
    });
    
    // Return redirect header for HTMX
    c.header("HX-Redirect", `/search/${search.slug}`);
    return c.html(`<div>Created! Redirecting...</div>`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return c.html(`
      <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
        Error: ${message}
      </div>
    `, 500);
  }
});

// API: Get raw markdown
app.get("/api/search/:slug/:jobId/raw", (c) => {
  const slug = c.req.param("slug");
  const jobId = c.req.param("jobId");
  
  const report = getJobReport(slug, jobId);
  if (!report) {
    return c.text("Report not found", 404);
  }

  return c.text(report, 200, {
    "Content-Type": "text/markdown; charset=utf-8",
  });
});

// API: Run a search
app.post("/api/search/:slug/run", async (c) => {
  const slug = c.req.param("slug");
  const search = getSearch(slug);
  
  if (!search) {
    return c.json({ error: "Search not found" }, 404);
  }

  try {
    const job = await startJob(slug);
    return c.json({ 
      success: true, 
      jobId: job.id,
      status: job.status,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

// API: Cancel a running or queued job
app.post("/api/job/:slug/:jobId/cancel", async (c) => {
  const slug = c.req.param("slug");
  const jobId = c.req.param("jobId");

  try {
    cancelJob(slug, jobId);
    c.header("HX-Redirect", `/search/${slug}`);
    return c.html(`<div>Cancelled! Redirecting...</div>`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

// API: Clear all queued jobs
app.post("/api/queue/clear", async (c) => {
  try {
    clearQueue();
    c.header("HX-Refresh", "true");
    return c.html(`<div>Queue cleared!</div>`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

// API: Delete all jobs
app.post("/api/jobs/clear", async (c) => {
  try {
    const searches = listSearches();
    let deleted = 0;
    
    for (const search of searches) {
      const jobs = listJobsForSearch(search.slug);
      for (const job of jobs) {
        if (job.status === "running" || job.status === "queued") {
          try { cancelJob(search.slug, job.id); } catch {}
        }
        try {
          deleteJob(search.slug, job.id);
          deleted++;
        } catch {}
      }
    }
    
    clearQueue();
    
    c.header("HX-Refresh", "true");
    return c.html(`<div>Deleted ${deleted} jobs!</div>`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

// API: Get search status (for HTMX polling)
app.get("/api/search/:slug/status", (c) => {
  const slug = c.req.param("slug");
  const jobs = listJobsForSearch(slug);
  const runningJob = jobs.find(j => j.status === "running");

  if (runningJob) {
    return c.html(`
      <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6" 
           hx-get="/api/search/${slug}/status" 
           hx-trigger="every 5s"
           hx-swap="outerHTML">
        <div class="flex items-center gap-3">
          <div class="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
          <span class="font-medium text-blue-900">Job running: ${runningJob.id.slice(0, 8)}</span>
          <span class="text-blue-600 text-sm">${formatRelativeTime(runningJob.createdAt)}</span>
        </div>
      </div>
    `);
  }

  // No running job - check if there's a recent completion
  const recentCompleted = jobs.find(j => j.status === "completed");
  if (recentCompleted) {
    // Trigger a page reload to show the new report
    return c.html(`
      <div id="status-area" hx-trigger="load" hx-on::load="window.location.reload()"></div>
    `);
  }

  return c.html(`<div id="status-area"></div>`);
});

// API: Sync stuck jobs
app.post("/api/sync", async (c) => {
  try {
    const jobs = listAllJobs(50);
    const queueState = getQueueState();
    let fixed = 0;

    for (const job of jobs) {
      if (job.status === "running") {
        const sessionName = getTmuxSessionName(job.id);
        const sessionExists = tmuxSessionExists(sessionName);

        if (!sessionExists) {
          const log = getJobLog(job.searchSlug, job.id);
          const report = extractReportFromLog(log);

          if (report && report.length > 100) {
            saveJobReport(job.searchSlug, job.id, report);
            updateJob(job.searchSlug, job.id, {
              status: "completed",
              completedAt: new Date().toISOString(),
            });
            fixed++;
          } else {
            updateJob(job.searchSlug, job.id, {
              status: "failed",
              completedAt: new Date().toISOString(),
              error: "Session ended without generating report",
            });
            fixed++;
          }
        }
      }
    }

    // Clear current job if it's not actually running
    if (queueState.currentJobId) {
      const sessionName = getTmuxSessionName(queueState.currentJobId);
      if (!tmuxSessionExists(sessionName)) {
        setCurrentJob(undefined);
        fixed++;
      }
    }

    c.header("HX-Refresh", "true");
    return c.html(`<div>Synced! Fixed ${fixed} job(s).</div>`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

// Extract report from output log
function extractReportFromLog(log: string): string {
  const lines = log.split("\n");
  let reportLines: string[] = [];
  let inReport = false;

  for (const line of lines) {
    const cleanLine = line.replace(/\x1b\[[0-9;]*m/g, "").trim();

    // Start at any markdown header (# or ##)
    if (cleanLine.match(/^#{1,2} /) && !inReport) {
      inReport = true;
      reportLines = [cleanLine];
    } else if (inReport) {
      // Skip tool calls
      if (cleanLine.match(/^\|  \w+_/) || cleanLine.startsWith("$ ") || cleanLine.startsWith("bun run")) {
        continue;
      }
      // Stop at end markers
      if (cleanLine.includes("opencode") && cleanLine.includes("session")) {
        break;
      }
      reportLines.push(cleanLine);
    }
  }

  return reportLines.join("\n").trim();
}

// API: Overall status (for dashboard polling)
app.get("/api/status", (c) => {
  const running = getRunningJob();
  const searches = listSearches();
  
  return c.json({
    running: running ? {
      searchSlug: running.searchSlug,
      jobId: running.job.id,
      startedAt: running.job.startedAt,
    } : null,
    searchCount: searches.length,
  });
});

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleDateString();
}

// Start server
const port = parseInt(process.env.PORT || "3456");

console.log(`
🛒 Marketplace Tracker Web UI
   http://localhost:${port}
   
   Press Ctrl+C to stop
`);

export default {
  port,
  fetch: app.fetch,
};
