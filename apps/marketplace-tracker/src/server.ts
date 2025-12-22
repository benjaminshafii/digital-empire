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
  slugify,
  searchExists,
  getPrompt,
  listJobsForSearch,
  getJobReport,
  startJob,
  getRunningJob,
  cancelJob,
  getQueueState,
  ensureDataDirs,
} from "opencode-job-runner";

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

// === PROMPT BUILDER ===

function buildPrompt(searchTerm: string, config: AppConfig): string {
  // Always use @fb-marketplace - telegram is handled separately by the server
  return `@fb-marketplace

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
`;
}

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
    
    return `
      <a href="/search/${search.slug}" class="flex items-center justify-between p-3 bg-white rounded-lg border hover:shadow-sm transition-shadow">
        <div>
          <span class="font-medium text-gray-900">${escapeHtml(search.name)}</span>
          <span class="text-sm text-gray-500 ml-2">${lastJob ? formatRelativeTime(lastJob.createdAt) : "never run"}</span>
        </div>
        <span class="text-xs px-2 py-1 rounded-full ${
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
      <div class="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
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
    ` : ""}

    <div class="bg-white rounded-xl shadow-sm border p-6 mb-8">
      <h2 class="text-lg font-semibold text-gray-900 mb-4">🔍 New Search</h2>
      <form hx-post="/api/search" hx-target="#search-result" hx-swap="innerHTML">
        <div class="flex gap-3">
          <input 
            type="text" 
            name="searchTerm" 
            placeholder="e.g., standing desk under $300"
            required
            class="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-lg"
          />
          <button 
            type="submit" 
            class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
            Search
          </button>
        </div>
        <p class="text-sm text-gray-500 mt-2">
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

  const content = `
    <div class="mb-4">
      <a href="/" class="text-blue-600 hover:text-blue-800 text-sm">&larr; Back</a>
    </div>

    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold text-gray-900">${escapeHtml(search.name)}</h1>
      <button 
        hx-post="/api/run/${slug}"
        hx-swap="none"
        class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
        Run Again
      </button>
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
    ` : `
      <div class="mb-6 text-sm text-gray-600">Never run yet</div>
    `}

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

  return c.html(layout(search.name, content));
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

  // Start the job immediately
  try {
    await startJob(search.slug);
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

// Run a search
app.post("/api/run/:slug", async (c) => {
  const slug = c.req.param("slug");
  try {
    await startJob(slug);
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

const port = parseInt(process.env.PORT || "3456");
console.log(`
🛒 Marketplace Tracker
   http://localhost:${port}
`);

export default { port, fetch: app.fetch };
