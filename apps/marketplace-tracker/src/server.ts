#!/usr/bin/env bun
/**
 * Marketplace Tracker Web Server
 * 
 * Simplified UI: user enters search term, app builds the full prompt
 * with @summarize agent + telegram notification
 */
import { join, dirname } from "path";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { Hono } from "hono";
import {
  setDataDir,
  getDataDir,
  listSearches,
  getSearch,
  createSearch,
  updateSearch,
  deleteSearch,
  slugify,
  searchExists,
  getPrompt,
  listJobsForSearch,
  getJob,
  getJobReport,
  updateJob,
  startJob,
  getRunningJob,
  cancelJob,
  getQueueState,
  ensureDataDirs,
  getAttachCommand,
  startScheduler,
} from "openjob";

// Set data directory to ./data relative to this app
const appDir = dirname(dirname(new URL(import.meta.url).pathname));
setDataDir(join(appDir, "data"));

const app = new Hono();

// === CONFIG MANAGEMENT ===

interface AppConfig {
  telegramBotToken: string;
  telegramChatId: string;
  location: string;
}

function getConfigPath(): string {
  return join(getDataDir(), "config.json");
}

function getConfig(): AppConfig {
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

function saveConfig(config: AppConfig): void {
  const configPath = getConfigPath();
  writeFileSync(configPath, JSON.stringify(config, null, 2));
}

// === TELEGRAM ===

async function sendTelegramMessage(config: AppConfig, message: string): Promise<boolean> {
  if (!config.telegramBotToken || !config.telegramChatId) return false;
  
  try {
    const response = await fetch(`https://api.telegram.org/bot${config.telegramBotToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: config.telegramChatId,
        text: message,
        parse_mode: "HTML",
      }),
    });
    const data = await response.json() as { ok: boolean };
    return data.ok;
  } catch {
    return false;
  }
}

// Job completion handler - only notifies on failures now
// Success notifications are handled by the @telegram agent in the prompt
function getJobCompletionHandler(searchName: string) {
  return async (result: { job: { status: string }; report?: string }) => {
    const config = getConfig();
    if (!config.telegramBotToken || !config.telegramChatId) return;
    
    // Only send failure notifications from the server
    // Success notifications are sent by the @telegram agent
    if (result.job.status === "failed") {
      await sendTelegramMessage(config, `❌ Search failed: <b>${escapeHtml(searchName)}</b>`);
    }
  };
}

// === PROMPT BUILDER ===

function buildPrompt(searchTerm: string, config: AppConfig): string {
  const hasTelegram = !!(config.telegramBotToken && config.telegramChatId);
  
  let prompt = `@fb-marketplace

Search for deals on Facebook Marketplace.

## Search Details
- **Search Term**: ${searchTerm}
- **Location**: ${config.location}

Find the best deals matching "${searchTerm}" in ${config.location}.

Write a markdown report with:
- **Top Picks** (3-5 best deals with direct Facebook links)
- **Other Options** (table with price, item, link)
- **What to Avoid** (overpriced or sketchy listings)

Save the report to: {{reportPath}}

---

@title

Generate a concise title for this search job.

- Original search term: "${searchTerm}"
- Location: ${config.location}
- Report path: {{reportPath}}
- Search slug: {{searchSlug}}
- Job ID: {{jobId}}

Read the report and generate a short, descriptive title (max 50 chars).
Save it via: POST http://localhost:3456/api/job/{{searchSlug}}/{{jobId}}/title
`;

  // If Telegram is configured, add the @telegram agent to send a summary
  if (hasTelegram) {
    prompt += `
---

@telegram

Send a Telegram notification with the top 3-5 deals.
Read the report from {{reportPath}} and send a concise summary.

First, get the job title:
\`\`\`bash
curl -s http://localhost:3456/api/job/{{searchSlug}}/{{jobId}}/title
\`\`\`

Use that title as the header. Include:
- Best deals with prices and Facebook links
- Keep it short and scannable
`;
  }

  return prompt;
}

// === HELPERS ===

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/**
 * Convert cron expression to human-readable format
 * Handles common presets we use in the schedule dropdown
 */
function formatSchedule(cron: string): string {
  if (!cron) return "Not scheduled";
  
  // Map common cron patterns to readable strings
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
  
  if (patterns[cron]) {
    return patterns[cron];
  }
  
  // Try to parse the cron expression for unknown patterns
  const parts = cron.split(" ");
  if (parts.length !== 5) return cron;
  
  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;
  
  // Simple patterns
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
  
  // Fallback to raw cron
  return cron;
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

// === LAYOUT ===

function layout(title: string, content: string): string {
  return `<!DOCTYPE html>
<html lang="en" class="h-full bg-gray-50">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - Marketplace Tracker</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://unpkg.com/htmx.org@1.9.10"></script>
  <style>
    .prose h1 { font-size: 1.5rem; font-weight: 700; margin-bottom: 1rem; }
    .prose h2 { font-size: 1.25rem; font-weight: 600; margin-top: 1.5rem; margin-bottom: 0.75rem; }
    .prose h3 { font-size: 1.1rem; font-weight: 600; margin-top: 1rem; }
    .prose p { margin-bottom: 0.75rem; }
    .prose ul { list-style-type: disc; padding-left: 1.5rem; margin-bottom: 0.75rem; }
    .prose a { color: #2563eb; text-decoration: underline; }
    .prose table { width: 100%; border-collapse: collapse; margin-bottom: 1rem; }
    .prose th, .prose td { border: 1px solid #e5e7eb; padding: 0.5rem; text-align: left; }
  </style>
</head>
<body class="h-full">
  <div class="min-h-full">
    <nav class="bg-white shadow-sm border-b">
      <div class="max-w-4xl mx-auto px-4 py-3">
        <div class="flex items-center justify-between">
          <a href="/" class="text-xl font-bold text-gray-900">🛒 Marketplace Tracker</a>
          <a href="/settings" class="text-gray-600 hover:text-gray-900">⚙️ Settings</a>
        </div>
      </div>
    </nav>
    <main class="max-w-4xl mx-auto px-4 py-8">
      ${content}
    </main>
  </div>
</body>
</html>`;
}

// === PAGES ===

// Home page - simple search form + recent searches
app.get("/", (c) => {
  const config = getConfig();
  const searches = listSearches();
  const running = getRunningJob();

  const hasTelegram = !!(config.telegramBotToken && config.telegramChatId);

  const searchesHtml = searches.slice(0, 10).map((search) => {
    const jobs = listJobsForSearch(search.slug);
    const lastJob = jobs[0];
    const status = lastJob?.status || "new";
    // Use job title if available, otherwise fall back to search name
    const displayTitle = lastJob?.title || search.name;
    
    return `
      <a href="/search/${search.slug}" class="flex items-start justify-between gap-3 p-3 bg-white rounded-lg border hover:shadow-sm transition-shadow">
        <div class="min-w-0 flex-1">
          <div class="font-medium text-gray-900 break-words">${escapeHtml(displayTitle)}</div>
          <div class="text-sm text-gray-500 mt-1">${lastJob ? formatRelativeTime(lastJob.createdAt) : "never run"}${search.schedule ? ` · <span class="text-purple-600">⏰ ${formatSchedule(search.schedule)}</span>` : ""}</div>
        </div>
        <span class="flex-shrink-0 text-xs px-2 py-1 rounded-full ${
          status === "running" ? "bg-blue-100 text-blue-700" :
          status === "completed" ? "bg-green-100 text-green-700" :
          status === "failed" ? "bg-red-100 text-red-700" :
          "bg-gray-100 text-gray-600"
        }">${status}</span>
      </a>
    `;
  }).join("");

  const content = `
    ${running ? `
      <div class="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center gap-3">
            <div class="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
            <span class="text-blue-900">Running: <strong>${escapeHtml(running.searchSlug)}</strong></span>
          </div>
          <button 
            hx-post="/api/cancel/${running.searchSlug}/${running.job.id}"
            hx-swap="none"
            class="text-sm px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200">
            Stop
          </button>
        </div>
        <div class="text-xs text-blue-800 font-mono bg-blue-100 p-2 rounded">
          Watch live: <code class="select-all">${getAttachCommand(running.job.id)}</code>
        </div>
      </div>
    ` : ""}

    <div class="bg-white rounded-xl shadow-sm border p-6 mb-8">
      <h2 class="text-lg font-semibold text-gray-900 mb-4">🔍 New Search</h2>
      <form hx-post="/api/search" hx-target="#search-result" hx-swap="innerHTML" id="search-form">
        <div class="flex gap-3">
          <textarea 
            name="searchTerm" 
            placeholder="e.g., standing desk under $300"
            required
            rows="2"
            class="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-lg resize-none"
            onkeydown="if(event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); this.form.requestSubmit(); }"
          ></textarea>
          <button 
            type="submit" 
            class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium self-end">
            Search
          </button>
        </div>
        <p class="text-sm text-gray-500 mt-2">
          <span class="text-gray-400">Shift+Enter for new line</span> · 
          Location: <strong>${escapeHtml(config.location || "sanfrancisco")}</strong>
          ${hasTelegram ? ` · Telegram: <strong class="text-green-600">✓ enabled</strong>` : ` · <a href="/settings" class="text-blue-600 underline">Enable Telegram notifications</a>`}
        </p>
        <div id="search-result" class="mt-3"></div>
      </form>
    </div>

    ${searches.length > 0 ? `
      <div>
        <h2 class="text-lg font-semibold text-gray-900 mb-4">Recent Searches</h2>
        <div class="space-y-2">
          ${searchesHtml}
        </div>
      </div>
    ` : ""}
  `;

  return c.html(layout("Home", content));
});

// Settings page
app.get("/settings", (c) => {
  const config = getConfig();
  const hasTelegram = !!(config.telegramBotToken && config.telegramChatId);

  const content = `
    <div class="max-w-xl">
      <h1 class="text-2xl font-bold text-gray-900 mb-2">Settings</h1>
      <p class="text-gray-600 mb-6">Configure your search location and optional Telegram notifications.</p>

      <form hx-post="/api/settings" hx-target="#settings-result" hx-swap="innerHTML" class="bg-white rounded-xl shadow-sm border p-6">
        <div class="space-y-6">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Default Location <span class="text-red-500">*</span>
            </label>
            <input 
              type="text" 
              name="location" 
              value="${escapeHtml(config.location || "sanfrancisco")}"
              placeholder="sanfrancisco"
              required
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
            <p class="text-xs text-gray-500 mt-1">
              Facebook Marketplace location (e.g., sanfrancisco, oakland, losangeles, nyc)
            </p>
          </div>

          <div class="pt-4 border-t">
            <h3 class="text-sm font-medium text-gray-700 mb-3">Telegram Notifications <span class="text-gray-400">(optional)</span></h3>
            
            <div class="space-y-4">
              <div>
                <label class="block text-xs font-medium text-gray-600 mb-1">Bot Token</label>
                <input 
                  type="text" 
                  name="telegramBotToken" 
                  value="${escapeHtml(config.telegramBotToken)}"
                  placeholder="123456789:AABBccDDeeFF..."
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm font-mono"
                />
                <p class="text-xs text-gray-500 mt-1">
                  Get from <a href="https://t.me/botfather" target="_blank" class="text-blue-600 underline">@BotFather</a> on Telegram
                </p>
              </div>
              
              <div>
                <label class="block text-xs font-medium text-gray-600 mb-1">Chat ID</label>
                <input 
                  type="text" 
                  name="telegramChatId" 
                  value="${escapeHtml(config.telegramChatId)}"
                  placeholder="-1001234567890"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm font-mono"
                />
                <p class="text-xs text-gray-500 mt-1">
                  The group/chat ID where notifications will be sent
                </p>
              </div>
            </div>
            
            ${hasTelegram ? `
              <div class="mt-3">
                <button type="button" hx-post="/api/test-telegram" hx-target="#telegram-test-result" hx-swap="innerHTML" 
                  class="text-sm px-3 py-1 border border-gray-300 rounded hover:bg-gray-50">
                  Test Connection
                </button>
                <span id="telegram-test-result" class="ml-2 text-sm"></span>
              </div>
            ` : ""}
          </div>

          <div class="pt-4 border-t">
            <button type="submit" class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
              Save Settings
            </button>
          </div>
        </div>
        <div id="settings-result" class="mt-4"></div>
      </form>

      <div class="mt-4">
        <a href="/" class="text-blue-600 hover:text-blue-800">&larr; Back to Home</a>
      </div>
    </div>
  `;

  return c.html(layout("Settings", content));
});

// Search detail page
app.get("/search/:slug", (c) => {
  const slug = c.req.param("slug");
  const search = getSearch(slug);
  if (!search) {
    return c.html(layout("Not Found", `<p>Search not found. <a href="/" class="text-blue-600">Go back</a></p>`), 404);
  }

  const jobs = listJobsForSearch(slug);
  const latestJob = jobs[0];
  const report = latestJob ? getJobReport(slug, latestJob.id) : null;
  
  // Use job title if available, otherwise fall back to search name
  const displayTitle = latestJob?.title || search.name;

  const content = `
    <div class="mb-4">
      <a href="/" class="text-blue-600 hover:text-blue-800 text-sm">&larr; Back</a>
    </div>

    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-900 break-words mb-4">${escapeHtml(displayTitle)}</h1>
      ${latestJob?.title ? `
        <p class="text-sm text-gray-500 mb-2">Original search: ${escapeHtml(search.name)}</p>
      ` : ""}
      <div class="flex flex-wrap items-center gap-2">
        <button 
          hx-post="/api/run/${slug}"
          hx-swap="none"
          class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
          Run Again
        </button>
        <button 
          hx-post="/api/search/${slug}/delete"
          hx-swap="none"
          hx-confirm="Delete this search and all its reports?"
          class="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 font-medium">
          Delete
        </button>
      </div>
    </div>
    
    <!-- Schedule -->
    <div class="mb-6 p-4 bg-gray-50 rounded-lg border">
      <div class="flex flex-col gap-3">
        <div class="flex items-center justify-between">
          <span class="text-sm font-medium text-gray-700">Schedule</span>
          ${search.schedule ? `
            <span class="text-sm text-purple-600 font-medium">${formatSchedule(search.schedule)}</span>
          ` : `
            <span class="text-sm text-gray-400">Not scheduled</span>
          `}
        </div>
        
        <form hx-post="/api/search/${slug}/schedule" hx-swap="none" class="flex flex-wrap items-center gap-2">
          <!-- Quick presets -->
          <select name="schedule" class="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white">
            <option value="">No schedule</option>
            <optgroup label="Every few hours">
              <option value="0 */2 * * *" ${search.schedule === "0 */2 * * *" ? "selected" : ""}>Every 2 hours</option>
              <option value="0 */4 * * *" ${search.schedule === "0 */4 * * *" ? "selected" : ""}>Every 4 hours</option>
              <option value="0 */6 * * *" ${search.schedule === "0 */6 * * *" ? "selected" : ""}>Every 6 hours</option>
              <option value="0 */12 * * *" ${search.schedule === "0 */12 * * *" ? "selected" : ""}>Every 12 hours</option>
            </optgroup>
            <optgroup label="Daily">
              <option value="0 7 * * *" ${search.schedule === "0 7 * * *" ? "selected" : ""}>Daily at 7 AM</option>
              <option value="0 9 * * *" ${search.schedule === "0 9 * * *" ? "selected" : ""}>Daily at 9 AM</option>
              <option value="0 12 * * *" ${search.schedule === "0 12 * * *" ? "selected" : ""}>Daily at 12 PM</option>
              <option value="0 18 * * *" ${search.schedule === "0 18 * * *" ? "selected" : ""}>Daily at 6 PM</option>
              <option value="0 21 * * *" ${search.schedule === "0 21 * * *" ? "selected" : ""}>Daily at 9 PM</option>
            </optgroup>
            <optgroup label="Weekly">
              <option value="0 9 * * 1" ${search.schedule === "0 9 * * 1" ? "selected" : ""}>Weekly on Monday 9 AM</option>
              <option value="0 9 * * 6" ${search.schedule === "0 9 * * 6" ? "selected" : ""}>Weekly on Saturday 9 AM</option>
            </optgroup>
          </select>
          
          <button type="submit" class="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Save
          </button>
          
          ${search.schedule ? `
            <button type="button" 
              hx-post="/api/search/${slug}/schedule" 
              hx-vals='{"schedule": ""}'
              hx-swap="none"
              class="px-3 py-2 text-sm text-red-600 hover:text-red-700">
              Remove
            </button>
          ` : ""}
        </form>
      </div>
    </div>

    ${latestJob ? `
      <div class="mb-6 text-sm text-gray-600">
        Last run: ${formatRelativeTime(latestJob.createdAt)} · Status: 
        <span class="${
          latestJob.status === "completed" ? "text-green-600" :
          latestJob.status === "running" ? "text-blue-600" :
          latestJob.status === "failed" ? "text-red-600" : "text-gray-600"
        }">${latestJob.status}</span>
      </div>
      ${latestJob.status === "running" ? `
        <div class="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div class="text-xs text-blue-800 font-mono">
            Watch live: <code class="select-all bg-blue-100 px-2 py-1 rounded">${getAttachCommand(latestJob.id)}</code>
          </div>
        </div>
      ` : ""}
    ` : `
      <div class="mb-6 text-sm text-gray-600">Never run yet</div>
    `}

    <details class="mb-6">
      <summary class="text-sm text-gray-500 cursor-pointer hover:text-gray-700">View prompt</summary>
      <pre class="mt-2 p-4 bg-gray-100 rounded-lg text-xs overflow-x-auto whitespace-pre-wrap">${escapeHtml(getPrompt(slug) || "No prompt found")}</pre>
    </details>

    ${report ? `
      <div class="bg-white rounded-xl shadow-sm border p-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-4">Latest Report</h2>
        <div class="prose max-w-none" id="report-content">
          ${renderMarkdown(report)}
        </div>
      </div>
    ` : `
      <div class="bg-gray-50 rounded-xl border p-6 text-center text-gray-600">
        No report yet. Click "Run Again" to search.
      </div>
    `}

    ${jobs.length > 1 ? `
      <div class="mt-8">
        <h3 class="text-lg font-semibold text-gray-900 mb-3">Previous Runs</h3>
        <div class="space-y-2">
          ${jobs.slice(1, 6).map(job => `
            <div class="flex items-center justify-between p-3 bg-white rounded-lg border text-sm">
              <span class="text-gray-600">${formatRelativeTime(job.createdAt)}</span>
              <span class="${
                job.status === "completed" ? "text-green-600" :
                job.status === "failed" ? "text-red-600" : "text-gray-600"
              }">${job.status}</span>
            </div>
          `).join("")}
        </div>
      </div>
    ` : ""}
  `;

  return c.html(layout(displayTitle, content));
});

// === API ===

// Create and run a new search
app.post("/api/search", async (c) => {
  const body = await c.req.parseBody();
  const searchTerm = (body.searchTerm as string)?.trim();

  if (!searchTerm) {
    return c.html(`<div class="text-red-600 text-sm">Please enter a search term</div>`, 400);
  }

  const config = getConfig();

  // Generate slug from search term
  let slug = slugify(searchTerm);
  let counter = 2;
  while (searchExists(slug)) {
    slug = `${slugify(searchTerm)}-${counter++}`;
  }

  // Create the search with our built prompt (works with or without telegram)
  const prompt = buildPrompt(searchTerm, config);
  const search = createSearch({ name: searchTerm, prompt });

  // Start the job immediately with Telegram notification on completion
  try {
    await startJob(search.slug, {
      onComplete: getJobCompletionHandler(searchTerm),
    });
    c.header("HX-Redirect", `/search/${search.slug}`);
    return c.html(`<div class="text-green-600">Search started!</div>`);
  } catch (error) {
    return c.html(`<div class="text-red-600 text-sm">Error: ${error instanceof Error ? error.message : "Unknown"}</div>`, 500);
  }
});

// Save settings
app.post("/api/settings", async (c) => {
  const body = await c.req.parseBody();
  const config: AppConfig = {
    telegramBotToken: (body.telegramBotToken as string)?.trim() || "",
    telegramChatId: (body.telegramChatId as string)?.trim() || "",
    location: (body.location as string)?.trim() || "sanfrancisco",
  };

  saveConfig(config);
  return c.html(`<div class="text-green-600 text-sm">Settings saved!</div>`);
});

// Test telegram connection
app.post("/api/test-telegram", async (c) => {
  const config = getConfig();
  const sent = await sendTelegramMessage(config, "✅ Test message from Marketplace Tracker");
  if (sent) {
    return c.html(`<span class="text-green-600">✓ Sent!</span>`);
  } else {
    return c.html(`<span class="text-red-600">✗ Failed</span>`);
  }
});

// Telegram API endpoint - called by @telegram agent
app.post("/api/telegram/send", async (c) => {
  const config = getConfig();
  
  if (!config.telegramBotToken || !config.telegramChatId) {
    return c.json({ success: false, error: "Telegram not configured" }, 400);
  }
  
  try {
    const body = await c.req.json();
    const message = body.message as string;
    
    if (!message) {
      return c.json({ success: false, error: "message is required" }, 400);
    }
    
    // Send as HTML to support links and formatting
    const sent = await sendTelegramMessage(config, message);
    
    if (sent) {
      return c.json({ success: true });
    } else {
      return c.json({ success: false, error: "Failed to send message" }, 500);
    }
  } catch (error) {
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    }, 500);
  }
});

// Check if Telegram is configured - agents can call this first
app.get("/api/telegram/status", (c) => {
  const config = getConfig();
  const configured = !!(config.telegramBotToken && config.telegramChatId);
  return c.json({ configured });
});

// Run a search
app.post("/api/run/:slug", async (c) => {
  const slug = c.req.param("slug");
  const search = getSearch(slug);
  try {
    await startJob(slug, {
      onComplete: getJobCompletionHandler(search?.name || slug),
    });
    c.header("HX-Refresh", "true");
    return c.html(`<div>Started</div>`);
  } catch (error) {
    return c.html(`<div class="text-red-600">${error instanceof Error ? error.message : "Error"}</div>`, 500);
  }
});

// Cancel a job
app.post("/api/cancel/:slug/:jobId", async (c) => {
  try {
    cancelJob(c.req.param("slug"), c.req.param("jobId"));
    c.header("HX-Refresh", "true");
    return c.html(`<div>Cancelled</div>`);
  } catch (error) {
    return c.html(`<div class="text-red-600">${error instanceof Error ? error.message : "Error"}</div>`, 500);
  }
});

// Delete a search
app.post("/api/search/:slug/delete", async (c) => {
  try {
    const slug = c.req.param("slug");
    // Cancel any running job for this search first
    const running = getRunningJob();
    if (running && running.searchSlug === slug) {
      cancelJob(slug, running.job.id);
    }
    deleteSearch(slug);
    c.header("HX-Redirect", "/");
    return c.html(`<div>Deleted</div>`);
  } catch (error) {
    return c.html(`<div class="text-red-600">${error instanceof Error ? error.message : "Error"}</div>`, 500);
  }
});

// Set schedule for a search
app.post("/api/search/:slug/schedule", async (c) => {
  try {
    const slug = c.req.param("slug");
    const body = await c.req.parseBody();
    const schedule = (body.schedule as string)?.trim() || undefined;
    updateSearch(slug, { schedule });
    c.header("HX-Refresh", "true");
    return c.html(`<div>Schedule updated</div>`);
  } catch (error) {
    return c.html(`<div class="text-red-600">${error instanceof Error ? error.message : "Error"}</div>`, 500);
  }
});

// === JOB TITLE API ===

// Get job title
app.get("/api/job/:slug/:jobId/title", (c) => {
  try {
    const slug = c.req.param("slug");
    const jobId = c.req.param("jobId");
    const job = getJob(slug, jobId);
    
    if (!job) {
      return c.json({ error: "Job not found" }, 404);
    }
    
    return c.json({ title: job.title || null });
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : "Error" }, 500);
  }
});

// Save job title
app.post("/api/job/:slug/:jobId/title", async (c) => {
  try {
    const slug = c.req.param("slug");
    const jobId = c.req.param("jobId");
    const body = await c.req.json() as { title?: string };
    const title = body.title?.trim();
    
    if (!title) {
      return c.json({ error: "Title is required" }, 400);
    }
    
    if (title.length > 100) {
      return c.json({ error: "Title too long (max 100 chars)" }, 400);
    }
    
    const job = updateJob(slug, jobId, { title });
    return c.json({ success: true, title: job.title });
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : "Error" }, 500);
  }
});

// === MARKDOWN RENDERER ===

function renderMarkdown(md: string): string {
  // Simple markdown to HTML (basic implementation)
  return md
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>')
    .replace(/^\- (.+)$/gm, "<li>$1</li>")
    .replace(/(<li>.*<\/li>\n?)+/g, "<ul>$&</ul>")
    .replace(/\n\n/g, "</p><p>")
    .replace(/^(.+)$/gm, (match) => {
      if (match.startsWith("<")) return match;
      return `<p>${match}</p>`;
    });
}

// === SERVER ===

ensureDataDirs();

// Start the scheduler (checks cron schedules every minute)
startScheduler();

const port = parseInt(process.env.PORT || "3456");
console.log(`
🛒 Marketplace Tracker
   http://localhost:${port}
   Scheduler: on (cron-based)
`);

export default { port, fetch: app.fetch };
