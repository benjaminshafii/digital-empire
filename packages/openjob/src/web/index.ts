/**
 * openjob Web UI + API
 */
import { Hono } from "hono";
import { layout } from "./views/layout";
import { homePage, runningJobView } from "./views/home";
import { listPage } from "./views/list";
import { jobPage } from "./views/job";
import { reportPage } from "./views/report";
import {
  listSearches,
  getSearch,
  createSearch,
  deleteSearch,
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
  startScheduler,
  stopScheduler,
  isSchedulerActive,
  getLatestJob,
  describeSchedule,
  getTimeUntilNextRun,
} from "../core";
import { existsSync, readFileSync } from "fs";

const app = new Hono();

// === HELPERS ===

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

async function generateNameFromPrompt(prompt: string): Promise<string> {
  // Extract first meaningful words for name
  const words = prompt.replace(/@\w+\s*/, '').trim().split(/\s+/).slice(0, 4);
  return words.join(' ').substring(0, 40) || 'job';
}

function getSearchesWithStatus() {
  return listSearches().map((search) => {
    const jobs = listJobsForSearch(search.slug);
    const prompt = getPrompt(search.slug);
    const promptPreview = prompt?.split("\n").find((l) => l.trim()) || "...";
    return {
      ...search,
      lastJob: jobs[0],
      jobCount: jobs.filter((j) => j.status === "completed").length,
      promptPreview,
    };
  });
}

// === PAGES ===

// Home - prompt input
app.get("/", (c) => {
  const searches = getSearchesWithStatus();
  const running = getRunningJob();
  const queueState = getQueueState();

  return c.html(layout("Home", homePage({
    searches,
    runningJob: running,
    queuedCount: queueState.queue.length,
  })));
});

// List - all jobs
app.get("/list", (c) => {
  const searches = getSearchesWithStatus();
  const running = getRunningJob();

  return c.html(layout("Jobs", listPage({
    searches,
    runningJob: running,
  })));
});

// Job detail
app.get("/job/:slug", (c) => {
  const slug = c.req.param("slug");
  const search = getSearch(slug);
  if (!search) {
    return c.redirect("/list");
  }

  const jobs = listJobsForSearch(slug);
  const runningJob = jobs.find((j) => j.status === "running");
  const prompt = getPrompt(slug) || search.prompt;
  
  // Get schedule info
  const lastJob = getLatestJob(slug);
  const scheduleDesc = search.schedule ? describeSchedule(search.schedule) : undefined;
  const nextRun = search.schedule ? getTimeUntilNextRun(search, lastJob) : undefined;

  return c.html(layout(search.name, jobPage({
    search,
    jobs,
    runningJob,
    prompt,
    scheduleDesc,
    nextRun,
  })));
});

// Report view (legacy route support)
app.get("/search/:slug", (c) => c.redirect(`/job/${c.req.param("slug")}`));

app.get("/search/:slug/:jobId", (c) => {
  const slug = c.req.param("slug");
  const jobId = c.req.param("jobId");
  const search = getSearch(slug);
  if (!search) return c.redirect("/list");

  const job = getJob(slug, jobId);
  if (!job) return c.redirect(`/job/${slug}`);

  const report = getJobReport(slug, jobId);
  if (!report) {
    return c.html(layout("No Report", `
      <div class="min-h-screen flex items-center justify-center">
        <div class="text-center">
          <h1 class="text-xl text-white mb-2">No report available</h1>
          <p class="text-muted mb-4">${job.error || "Job may have failed"}</p>
          <a href="/job/${slug}" class="text-primary hover:underline">← Back to job</a>
        </div>
      </div>
    `));
  }

  return c.html(layout(`${search.name} Report`, reportPage({ search, job, report })));
});

// === API ===

// Run a new job from prompt
app.post("/api/run", async (c) => {
  try {
    const body = await c.req.parseBody();
    const prompt = body.prompt as string;
    const schedule = body.schedule as string | undefined;

    if (!prompt?.trim()) {
      return c.html(`<div class="text-red-400 p-4">Prompt is required</div>`, 400);
    }

    // Generate name and slug
    const name = await generateNameFromPrompt(prompt);
    let slug = slugify(name);
    let counter = 2;
    while (searchExists(slug)) slug = `${slugify(name)}-${counter++}`;

    // Create search
    const search = createSearch({ 
      name: counter > 2 ? `${name} ${counter - 1}` : name, 
      prompt: prompt.trim(),
      schedule: schedule || undefined,
    });

    // Start the job
    const job = await startJob(search.slug);
    const tmuxSession = getTmuxSessionName(job.id);

    // Return running job view
    return c.html(runningJobView({ search, job, tmuxSession }));
  } catch (error) {
    return c.html(`<div class="text-red-400 p-4">Error: ${error instanceof Error ? error.message : "Unknown"}</div>`, 500);
  }
});

// Create search (legacy)
app.post("/api/search", async (c) => {
  try {
    const body = await c.req.parseBody();
    const prompt = body.prompt as string;

    if (!prompt) return c.html(`<div class="text-red-400">Prompt is required</div>`, 400);

    const name = await generateNameFromPrompt(prompt);
    let slug = slugify(name);
    let counter = 2;
    while (searchExists(slug)) slug = `${slugify(name)}-${counter++}`;

    const search = createSearch({ name: counter > 2 ? `${name} ${counter - 1}` : name, prompt });
    c.header("HX-Redirect", `/job/${search.slug}`);
    return c.html(`<div>Created!</div>`);
  } catch (error) {
    return c.html(`<div class="text-red-400">Error: ${error instanceof Error ? error.message : "Unknown"}</div>`, 500);
  }
});

// Run existing job
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

// Update schedule
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

// Get prompt
app.get("/api/search/:slug/prompt", (c) => {
  const slug = c.req.param("slug");
  const prompt = getPrompt(slug);
  if (!prompt) return c.text("Not found", 404);
  return c.text(prompt, 200, { "Content-Type": "text/markdown" });
});

// Update prompt
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

// Delete search
app.delete("/api/search/:slug", async (c) => {
  const slug = c.req.param("slug");
  try {
    deleteSearch(slug);
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : "Unknown" }, 500);
  }
});

// Cancel job
app.post("/api/job/:slug/:jobId/cancel", async (c) => {
  try {
    cancelJob(c.req.param("slug"), c.req.param("jobId"));
    c.header("HX-Refresh", "true");
    return c.html(`<div>Cancelled</div>`);
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : "Unknown" }, 500);
  }
});

// Get job status (for polling)
app.get("/api/job/:slug/:jobId/status", (c) => {
  const slug = c.req.param("slug");
  const jobId = c.req.param("jobId");
  const job = getJob(slug, jobId);
  const search = getSearch(slug);
  
  if (!job || !search) {
    return c.html(`<div></div>`);
  }

  if (job.status === "completed") {
    // Job finished - redirect to report
    return c.html(`
      <div class="terminal rounded-lg p-4 border-green-500/50">
        <div class="flex items-center gap-3">
          <span class="w-2 h-2 bg-green-500 rounded-full"></span>
          <span class="text-green-400">Job completed!</span>
          <a href="/search/${slug}/${jobId}" class="text-primary hover:underline ml-auto">View Report →</a>
        </div>
      </div>
    `);
  }

  if (job.status === "failed") {
    return c.html(`
      <div class="terminal rounded-lg p-4 border-red-500/50">
        <div class="flex items-center gap-3">
          <span class="w-2 h-2 bg-red-500 rounded-full"></span>
          <span class="text-red-400">Job failed</span>
          <span class="text-muted text-sm ml-2">${job.error || ''}</span>
        </div>
      </div>
    `);
  }

  // Still running - return running view
  const tmuxSession = getTmuxSessionName(job.id);
  return c.html(runningJobView({ search, job, tmuxSession }));
});

// Global status
app.get("/api/status", (c) => {
  const running = getRunningJob();
  return c.json({ running: running ? { searchSlug: running.searchSlug, jobId: running.job.id } : null });
});

// Status indicator
app.get("/api/status/indicator", (c) => {
  const running = getRunningJob();
  if (running) {
    return c.html(`
      <span class="flex items-center gap-2 text-sm">
        <span class="w-2 h-2 bg-blue-500 rounded-full pulse-dot"></span>
        <a href="/job/${running.searchSlug}" class="text-blue-400 hover:underline">Running</a>
      </span>
    `);
  }
  return c.html('');
});

// Search status (for polling)
app.get("/api/search/:slug/status", (c) => {
  const slug = c.req.param("slug");
  const jobs = listJobsForSearch(slug);
  const runningJob = jobs.find((j) => j.status === "running");

  if (runningJob) {
    const cmd = getAttachCommand(runningJob.id);
    return c.html(`
      <div class="flex items-center justify-between text-sm p-3 bg-blue-950/30 rounded border border-blue-500/30"
           hx-get="/api/search/${slug}/status" hx-trigger="every 3s" hx-swap="outerHTML">
        <div class="flex items-center gap-3">
          <span class="w-2 h-2 bg-blue-500 rounded-full pulse-dot"></span>
          <span class="text-blue-400">Running: ${runningJob.id.slice(0, 8)}</span>
        </div>
        <code class="text-xs bg-black px-2 py-1 rounded">${escapeHtml(cmd)}</code>
      </div>
    `);
  }

  return c.html(`<div id="status-area"></div>`);
});

// Sync stale jobs
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

// Clear all jobs
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

// Raw report
app.get("/api/search/:slug/:jobId/raw", (c) => {
  const report = getJobReport(c.req.param("slug"), c.req.param("jobId"));
  if (!report) return c.text("Not found", 404);
  return c.text(report, 200, { "Content-Type": "text/markdown" });
});

// === SERVER ===

export function createServer(options: { port?: number; scheduler?: boolean; name?: string } = {}) {
  ensureDataDirs();
  
  const port = options.port ?? parseInt(process.env.PORT || "3456");
  const enableScheduler = options.scheduler ?? process.env.SCHEDULER !== "false";
  const name = options.name ?? "openjob";

  if (enableScheduler) startScheduler();

  console.log(`
${name}
  http://localhost:${port}
  Scheduler: ${enableScheduler ? "on" : "off"}
`);

  return { port, fetch: app.fetch, stopScheduler };
}

export { app };

export default { port: process.env.PORT ? parseInt(process.env.PORT) : 3456, fetch: app.fetch };
