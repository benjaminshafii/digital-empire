/**
 * Home page - list all jobs with schedule info
 */
import type { Search, Job } from "../../core/types";

interface SearchWithStatus extends Search {
  lastJob?: Job;
  jobCount: number;
  nextRun?: string; // "in 2h 15m" or null
  promptPreview?: string; // First line of prompt.md
}

interface HomePageData {
  searches: SearchWithStatus[];
  runningJob?: { searchSlug: string; job: Job } | null;
  queuedCount: number;
}

export function homePage(data: HomePageData | SearchWithStatus[]): string {
  const { searches, runningJob, queuedCount } = Array.isArray(data)
    ? { searches: data, runningJob: null, queuedCount: 0 }
    : data;

  if (searches.length === 0) {
    return `
      <div class="text-center py-12">
        <span class="text-6xl mb-4 block">🤖</span>
        <h2 class="text-xl font-semibold text-gray-900 mb-2">No jobs yet</h2>
        <p class="text-gray-600 mb-6">Create your first job to start running OpenCode agents.</p>
        <a href="/add" class="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
          <span class="text-xl">+</span>
          Add Your First Job
        </a>
      </div>
    `;
  }

  const searchCards = searches
    .map((search) => {
      const statusBadge = getStatusBadge(search.lastJob);
      const lastRunText = search.lastJob
        ? formatRelativeTime(search.lastJob.createdAt)
        : "Never";

      // Calculate next run if scheduled
      const nextRunInfo = search.schedule ? getNextRunInfo(search) : null;

      return `
      <a href="/search/${search.slug}" class="block bg-white rounded-lg shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow">
        <div class="flex justify-between items-start mb-2">
          <h3 class="text-lg font-semibold text-gray-900">${escapeHtml(search.name)}</h3>
          ${statusBadge}
        </div>
        <p class="text-gray-600 text-sm mb-3 line-clamp-2 font-mono">${escapeHtml(search.promptPreview || "...")}</p>
        
        <div class="flex justify-between items-center text-xs text-gray-500 mb-2">
          <span>Last: ${lastRunText}</span>
        </div>
        
        ${
          search.schedule
            ? `
          <div class="flex items-center gap-2 text-xs mt-2 pt-2 border-t border-gray-100">
            <span class="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full">⏰ ${escapeHtml(search.schedule)}</span>
            ${nextRunInfo ? `<span class="text-gray-500">${nextRunInfo}</span>` : ""}
          </div>
        `
            : ""
        }
        
        <div class="text-xs text-gray-400 mt-2">
          ${search.jobCount} report${search.jobCount !== 1 ? "s" : ""}
        </div>
      </a>
    `;
    })
    .join("");

  // Count scheduled searches
  const scheduledCount = searches.filter((s) => s.schedule).length;

  // Status bar
  const statusBar =
    runningJob || queuedCount > 0
      ? `
    <div class="mb-6 flex flex-wrap gap-4">
      ${
        runningJob
          ? `
        <div class="flex-1 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
              <span class="font-medium text-blue-900">Running: ${escapeHtml(runningJob.searchSlug)}</span>
            </div>
            <button 
              hx-post="/api/job/${runningJob.searchSlug}/${runningJob.job.id}/cancel"
              hx-swap="none"
              hx-confirm="Stop this job?"
              class="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200">
              Stop
            </button>
          </div>
        </div>
      `
          : ""
      }
      ${
        queuedCount > 0
          ? `
        <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div class="flex items-center justify-between gap-4">
            <span class="font-medium text-yellow-900">${queuedCount} queued</span>
            <button 
              hx-post="/api/queue/clear"
              hx-swap="none"
              hx-confirm="Cancel all queued?"
              class="px-3 py-1 text-sm bg-yellow-200 text-yellow-800 rounded hover:bg-yellow-300">
              Clear
            </button>
          </div>
        </div>
      `
          : ""
      }
    </div>
  `
      : "";

  return `
    <div class="mb-6 flex justify-between items-start">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 mb-1">Job Runner</h1>
        <p class="text-gray-600 text-sm">
          ${searches.length} job${searches.length !== 1 ? "s" : ""}
          ${scheduledCount > 0 ? ` · ${scheduledCount} scheduled` : ""}
        </p>
      </div>
      <div class="flex gap-2">
        <button 
          hx-post="/api/sync"
          hx-swap="none"
          class="px-3 py-2 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 text-sm">
          Sync
        </button>
        <a href="/add" class="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
          + Add
        </a>
      </div>
    </div>

    ${statusBar}
    
    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      ${searchCards}
    </div>
  `;
}

function getNextRunInfo(search: SearchWithStatus): string | null {
  if (!search.schedule || !search.lastJob?.completedAt) return "due now";

  const match = search.schedule.match(/^(\d+)(m|h)$/);
  if (!match) return null;

  const [, num, unit] = match;
  const intervalMs = (unit === "h" ? parseInt(num) * 60 : parseInt(num)) * 60000;
  const lastRun = new Date(search.lastJob.completedAt).getTime();
  const nextRun = lastRun + intervalMs;
  const now = Date.now();

  if (nextRun <= now) return "due now";

  const diffMs = nextRun - now;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);

  if (diffMins < 60) return `next in ${diffMins}m`;
  return `next in ${diffHours}h ${diffMins % 60}m`;
}

function getStatusBadge(job?: Job): string {
  if (!job) return `<span class="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-600">New</span>`;

  switch (job.status) {
    case "running":
      return `<span class="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700 flex items-center gap-1">
        <span class="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>Running
      </span>`;
    case "completed":
      return `<span class="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700">Done</span>`;
    case "failed":
      return `<span class="px-2 py-1 text-xs rounded-full bg-red-100 text-red-700">Failed</span>`;
    case "queued":
      return `<span class="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-700">Queued</span>`;
    default:
      return `<span class="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-600">${job.status}</span>`;
  }
}

function formatRelativeTime(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);

  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function addSearchForm(): string {
  return `
    <div class="mb-6">
      <a href="/" class="text-blue-600 hover:text-blue-800 text-sm">&larr; Back</a>
    </div>

    <div class="max-w-2xl">
      <h1 class="text-2xl font-bold text-gray-900 mb-2">Add Job</h1>
      <p class="text-gray-600 mb-6">Create a prompt for OpenCode to run.</p>
      
      <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <form hx-post="/api/search" hx-target="#form-errors" hx-swap="innerHTML">
          <div id="form-errors"></div>

          <div class="mb-4">
            <label for="prompt" class="block text-sm font-medium text-gray-700 mb-1">
              Prompt
            </label>
            <textarea 
              id="prompt" 
              name="prompt" 
              required
              rows="8"
              placeholder="@fb-marketplace Find deals on Facebook Marketplace.

SEARCH: Standing desk under $300
LOCATION: San Francisco

Write a markdown report with:
- **Top Picks** (3-5 best deals with links)
- **Other Options** (table: price, item, link)

Save the report to: {{reportPath}}"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none font-mono text-sm"
            ></textarea>
            <p class="text-xs text-gray-500 mt-2">
              Use <code class="bg-gray-100 px-1 rounded">@agent-name</code> to invoke agents. 
              Use <code class="bg-gray-100 px-1 rounded">{{reportPath}}</code> for the output file path.
            </p>
          </div>

          <div class="flex gap-3">
            <button type="submit" class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
              Create
            </button>
            <a href="/" class="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
              Cancel
            </a>
          </div>
        </form>
      </div>
      
      <div class="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <h3 class="font-medium text-gray-900 mb-2">Example: FB Marketplace Search</h3>
        <pre class="text-xs text-gray-600 overflow-x-auto">@fb-marketplace Find deals on Facebook Marketplace.

SEARCH: Herman Miller Aeron chair
LOCATION: San Francisco Bay Area

Write a markdown report with top picks and links.
Save the report to: {{reportPath}}</pre>
      </div>
    </div>
  `;
}
