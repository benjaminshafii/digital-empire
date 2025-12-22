/**
 * Marketplace Tracker - Web UI + Scheduler
 *
 * Pipeline: Search → tmux → opencode → report.md
 */
import { existsSync, readFileSync } from "fs";
import { Hono } from "hono";
import { layout } from "./views/layout";
import { homePage, addSearchForm } from "./views/home";
import { searchPage } from "./views/search";
import { reportPage } from "./views/report";
import {
  listSearches,
  getSearch,
  createSearch,
  slugify,
  searchExists,
  updateSearch,
  getPrompt,
  updatePrompt,
  listJobsForSearch,
  getJob,
  getJobReport,
  listAllJobs,
  updateJob,
  setCurrentJob,
  getQueueState,
  deleteJob,
  clearQueue,
  startJob,
  getRunningJob,
  cancelJob,
  tmuxSessionExists,
  getTmuxSessionName,
  getAttachCommand,
  getJobReportPath,
  ensureDataDirs,
} from "../core";
import type { Search } from "../core/types";

// Note: ensureDataDirs() is called in createServer(), not at module load time
// This allows apps to call setDataDir() before importing this module

const app = new Hono();

// === HELPERS ===

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function formatRelativeTime(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  const hours = Math.floor(mins / 60);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return new Date(dateStr).toLocaleDateString();
}

async function generateNameFromPrompt(prompt: string): Promise<string> {
  const { execSync } = await import("child_process");
  const { findOpencodeBinary } = await import("../core/paths");
  try {
    const opencode = findOpencodeBinary();
    const escaped = prompt.replace(/"/g, '\\"').replace(/\n/g, " ");
    const result = execSync(
      `${opencode} run "Generate a 1-3 word title. Reply with ONLY the title: ${escaped}"`,
      { encoding: "utf-8", timeout: 15000 }
    );
    const lines = result.trim().split("\n").filter((l) => l.trim());
    return (lines[lines.length - 1]?.trim() || "").replace(/["'`]/g, "").substring(0, 40) || "search";
  } catch {
    return prompt.split(/\s+/).slice(0, 2).join(" ").substring(0, 30) || "search";
  }
}

// === PAGES ===

app.get("/", (c) => {
  const searches = listSearches();
  const running = getRunningJob();
  const queueState = getQueueState();

  const searchesWithStatus = searches.map((search) => {
    const jobs = listJobsForSearch(search.slug);
    const prompt = getPrompt(search.slug);
    // Get first non-empty line as preview
    const promptPreview = prompt?.split("\n").find((l) => l.trim()) || "...";
    return {
      ...search,
      lastJob: jobs[0],
      jobCount: jobs.filter((j) => j.status === "completed").length,
      promptPreview,
    };
  });

  return c.html(layout("Dashboard", homePage({
    searches: searchesWithStatus,
    runningJob: running,
    queuedCount: queueState.queue.length,
  })));
});

app.get("/add", (c) => c.html(layout("Add Search", addSearchForm())));

app.get("/search/:slug", (c) => {
  const slug = c.req.param("slug");
  const search = getSearch(slug);
  if (!search) {
    return c.html(layout("Not Found", `<div class="text-center py-12">
      <h1 class="text-2xl font-bold mb-4">Job not found</h1>
      <a href="/" class="text-blue-600">Back</a>
    </div>`), 404);
  }

  const jobs = listJobsForSearch(slug);
  const runningJob = jobs.find((j) => j.status === "running");
  const prompt = getPrompt(slug);
  return c.html(layout(search.name, searchPage({ search, jobs, runningJob, prompt: prompt || undefined })));
});

app.get("/search/:slug/:jobId", (c) => {
  const slug = c.req.param("slug");
  const jobId = c.req.param("jobId");
  const search = getSearch(slug);
  if (!search) return c.html(layout("Not Found", "<p>Search not found</p>"), 404);

  const job = getJob(slug, jobId);
  if (!job) return c.html(layout("Not Found", "<p>Job not found</p>"), 404);

  // If running, show live status with tmux command
  if (job.status === "running") {
    const attachCmd = getAttachCommand(job.id);
    return c.html(layout(`${search.name} - Running`, `
      <div class="max-w-2xl mx-auto py-12">
        <h1 class="text-2xl font-bold mb-4">Job Running</h1>
        <div class="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
          <div class="flex items-center gap-3 mb-4">
            <div class="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
            <span class="font-medium">In progress...</span>
          </div>
          <p class="text-sm text-gray-600 mb-2">Watch live:</p>
          <code class="block bg-gray-900 text-green-400 p-3 rounded font-mono text-sm">${escapeHtml(attachCmd)}</code>
          <p class="text-xs text-gray-500 mt-2">Ctrl+B, D to detach</p>
        </div>
        <div hx-get="/search/${slug}/${jobId}" hx-trigger="every 5s" hx-swap="innerHTML" hx-target="body"></div>
        <a href="/search/${slug}" class="text-blue-600">Back</a>
      </div>
    `));
  }

  const report = getJobReport(slug, jobId);
  if (!report) {
    return c.html(layout("No Report", `
      <div class="text-center py-12">
        <h1 class="text-xl font-bold mb-4">No report</h1>
        <p class="text-gray-600 mb-4">${job.error || "Job failed"}</p>
        <a href="/search/${slug}" class="text-blue-600">Back</a>
      </div>
    `));
  }

  return c.html(layout(`${search.name} Report`, reportPage({ search, job, report })));
});

// === API ===

app.post("/api/search", async (c) => {
  try {
    const body = await c.req.parseBody();
    const prompt = body.prompt as string;

    if (!prompt) return c.html(`<div class="text-red-600">Prompt is required</div>`, 400);

    const name = await generateNameFromPrompt(prompt);
    let slug = slugify(name);
    let counter = 2;
    while (searchExists(slug)) slug = `${slugify(name)}-${counter++}`;

    const search = createSearch({ name: counter > 2 ? `${name} ${counter - 1}` : name, prompt });
    c.header("HX-Redirect", `/search/${search.slug}`);
    return c.html(`<div>Created!</div>`);
  } catch (error) {
    return c.html(`<div class="text-red-600">Error: ${error instanceof Error ? error.message : "Unknown"}</div>`, 500);
  }
});

app.post("/api/search/:slug/run", async (c) => {
  const slug = c.req.param("slug");
  const search = getSearch(slug);
  if (!search) return c.json({ error: "Not found" }, 404);

  try {
    const job = await startJob(slug);
    return c.json({ success: true, jobId: job.id, status: job.status });
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : "Unknown" }, 500);
  }
});

app.post("/api/search/:slug/schedule", async (c) => {
  const slug = c.req.param("slug");
  const body = await c.req.parseBody();
  const schedule = body.schedule as string;

  try {
    updateSearch(slug, { schedule: schedule || undefined });
    c.header("HX-Refresh", "true");
    return c.html(`<div>Schedule updated</div>`);
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : "Unknown" }, 500);
  }
});

// Prompt endpoints
app.get("/api/search/:slug/prompt", (c) => {
  const slug = c.req.param("slug");
  const prompt = getPrompt(slug);
  if (!prompt) return c.text("Not found", 404);
  return c.text(prompt, 200, { "Content-Type": "text/markdown" });
});

app.post("/api/search/:slug/prompt", async (c) => {
  const slug = c.req.param("slug");
  const body = await c.req.parseBody();
  const prompt = body.prompt as string;

  if (!prompt) {
    return c.json({ error: "Prompt content required" }, 400);
  }

  try {
    updatePrompt(slug, prompt);
    c.header("HX-Refresh", "true");
    return c.html(`<div>Prompt saved</div>`);
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : "Unknown" }, 500);
  }
});

app.post("/api/job/:slug/:jobId/cancel", async (c) => {
  try {
    cancelJob(c.req.param("slug"), c.req.param("jobId"));
    c.header("HX-Redirect", `/search/${c.req.param("slug")}`);
    return c.html(`<div>Cancelled</div>`);
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : "Unknown" }, 500);
  }
});

app.get("/api/job/:slug/:jobId/attach", (c) => {
  return c.json({ command: getAttachCommand(c.req.param("jobId")) });
});

app.post("/api/sync", async (c) => {
  let fixed = 0;
  const jobs = listAllJobs(50);
  const queueState = getQueueState();

  for (const job of jobs) {
    if (job.status === "running" && !tmuxSessionExists(getTmuxSessionName(job.id))) {
      const reportPath = getJobReportPath(job.searchSlug, job.id);
      const hasReport = existsSync(reportPath) && readFileSync(reportPath, "utf-8").trim().length > 100;
      updateJob(job.searchSlug, job.id, {
        status: hasReport ? "completed" : "failed",
        completedAt: new Date().toISOString(),
        error: hasReport ? undefined : "No report.md",
      });
      fixed++;
    } else if (job.status === "failed") {
      const reportPath = getJobReportPath(job.searchSlug, job.id);
      if (existsSync(reportPath) && readFileSync(reportPath, "utf-8").trim().length > 100) {
        updateJob(job.searchSlug, job.id, { status: "completed", error: undefined });
        fixed++;
      }
    }
  }

  if (queueState.currentJobId && !tmuxSessionExists(getTmuxSessionName(queueState.currentJobId))) {
    setCurrentJob(undefined);
    fixed++;
  }

  c.header("HX-Refresh", "true");
  return c.html(`<div>Fixed ${fixed}</div>`);
});

app.post("/api/jobs/clear", async (c) => {
  let deleted = 0;
  for (const search of listSearches()) {
    for (const job of listJobsForSearch(search.slug)) {
      if (job.status === "running" || job.status === "queued") try { cancelJob(search.slug, job.id); } catch {}
      try { deleteJob(search.slug, job.id); deleted++; } catch {}
    }
  }
  clearQueue();
  c.header("HX-Refresh", "true");
  return c.html(`<div>Deleted ${deleted}</div>`);
});

app.get("/api/status", (c) => {
  const running = getRunningJob();
  return c.json({ running: running ? { searchSlug: running.searchSlug, jobId: running.job.id } : null });
});

app.get("/api/search/:slug/status", (c) => {
  const slug = c.req.param("slug");
  const jobs = listJobsForSearch(slug);
  const runningJob = jobs.find((j) => j.status === "running");

  if (runningJob) {
    const cmd = getAttachCommand(runningJob.id);
    return c.html(`
      <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6"
           hx-get="/api/search/${slug}/status" hx-trigger="every 3s" hx-swap="outerHTML">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
            <span class="font-medium">Running: ${runningJob.id.slice(0, 8)}</span>
          </div>
          <code class="text-xs bg-gray-100 px-2 py-1 rounded">${escapeHtml(cmd)}</code>
        </div>
      </div>
    `);
  }

  if (jobs.find((j) => j.status === "completed")) {
    return c.html(`<div hx-trigger="load" hx-on::load="window.location.reload()"></div>`);
  }

  return c.html(`<div id="status-area"></div>`);
});

app.get("/api/search/:slug/:jobId/raw", (c) => {
  const report = getJobReport(c.req.param("slug"), c.req.param("jobId"));
  if (!report) return c.text("Not found", 404);
  return c.text(report, 200, { "Content-Type": "text/markdown" });
});

// === SCHEDULER ===

let schedulerInterval: ReturnType<typeof setInterval> | null = null;

function parseScheduleMinutes(schedule: string): number | null {
  const match = schedule.match(/^(\d+)(m|h)$/);
  if (!match) return null;
  const [, num, unit] = match;
  return unit === "h" ? parseInt(num) * 60 : parseInt(num);
}

function shouldRunSearch(search: Search): boolean {
  if (!search.schedule) return false;
  const intervalMins = parseScheduleMinutes(search.schedule);
  if (!intervalMins) return false;

  const jobs = listJobsForSearch(search.slug);
  const lastCompleted = jobs.find((j) => j.status === "completed");
  if (!lastCompleted?.completedAt) return true;

  const diffMins = (Date.now() - new Date(lastCompleted.completedAt).getTime()) / 60000;
  return diffMins >= intervalMins;
}

function runScheduler() {
  const searches = listSearches().filter((s) => s.schedule);
  if (getRunningJob()) return;

  for (const search of searches) {
    if (shouldRunSearch(search)) {
      console.log(`[scheduler] Starting: ${search.slug}`);
      startJob(search.slug).catch(console.error);
      break;
    }
  }
}

function startScheduler() {
  if (schedulerInterval) return;
  console.log("[scheduler] Started");
  schedulerInterval = setInterval(runScheduler, 60000);
  runScheduler();
}

// === SERVER ===

export function createServer(options: { port?: number; scheduler?: boolean; name?: string } = {}) {
  // Ensure data directories exist
  ensureDataDirs();
  
  const port = options.port ?? parseInt(process.env.PORT || "3456");
  const enableScheduler = options.scheduler ?? process.env.SCHEDULER !== "false";
  const name = options.name ?? "Job Runner";

  if (enableScheduler) startScheduler();

  console.log(`
${name}
  http://localhost:${port}
  Scheduler: ${enableScheduler ? "on" : "off"}
`);

  return { port, fetch: app.fetch };
}

// Export app for direct usage if needed
export { app };

// Default export that can be used by Bun.serve
// Note: if using this default, setDataDir must be called before import
export default { port: 3456, fetch: app.fetch };
