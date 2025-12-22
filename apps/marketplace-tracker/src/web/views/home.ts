/**
 * Home page - list all searches
 */
import type { Search, Job } from "../../core/types";

interface SearchWithStatus extends Search {
  lastJob?: Job;
  jobCount: number;
}

interface HomePageData {
  searches: SearchWithStatus[];
  runningJob?: { searchSlug: string; job: Job } | null;
  queuedCount: number;
}

export function homePage(data: HomePageData | SearchWithStatus[]): string {
  // Handle both old and new signature
  const { searches, runningJob, queuedCount } = Array.isArray(data) 
    ? { searches: data, runningJob: null, queuedCount: 0 }
    : data;
  if (searches.length === 0) {
    return `
      <div class="text-center py-12">
        <span class="text-6xl mb-4 block">🔍</span>
        <h2 class="text-xl font-semibold text-gray-900 mb-2">No searches yet</h2>
        <p class="text-gray-600 mb-6">Create your first search to start finding deals.</p>
        <a href="/add" class="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
          <span class="text-xl">+</span>
          Add Your First Search
        </a>
      </div>
    `;
  }

  const searchCards = searches.map(search => {
    const statusBadge = getStatusBadge(search.lastJob);
    const lastRunText = search.lastJob 
      ? `Last run: ${formatRelativeTime(search.lastJob.createdAt)}`
      : "Never run";

    return `
      <a href="/search/${search.slug}" class="block bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
        <div class="flex justify-between items-start mb-2">
          <h3 class="text-lg font-semibold text-gray-900">${escapeHtml(search.name)}</h3>
          ${statusBadge}
        </div>
        <p class="text-gray-600 text-sm mb-3 line-clamp-2">${escapeHtml(search.prompt)}</p>
        <div class="flex justify-between items-center text-sm">
          <span class="text-gray-500">📍 ${escapeHtml(search.location)}</span>
          <span class="text-gray-400">${lastRunText}</span>
        </div>
        <div class="mt-3 text-xs text-gray-400">
          ${search.jobCount} report${search.jobCount !== 1 ? 's' : ''}
        </div>
      </a>
    `;
  }).join("");

  // Status bar for running/queued jobs
  const statusBar = (runningJob || queuedCount > 0) ? `
    <div class="mb-6 flex flex-wrap gap-4">
      ${runningJob ? `
        <div class="flex-1 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
              <span class="font-medium text-blue-900">Running: ${escapeHtml(runningJob.searchSlug)}</span>
              <span class="text-blue-600 text-sm">${runningJob.job.id.slice(0, 8)}</span>
            </div>
            <button 
              hx-post="/api/job/${runningJob.searchSlug}/${runningJob.job.id}/cancel"
              hx-swap="none"
              hx-confirm="Stop this running job?"
              class="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors">
              Stop
            </button>
          </div>
        </div>
      ` : ''}
      ${queuedCount > 0 ? `
        <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div class="flex items-center justify-between gap-4">
            <span class="font-medium text-yellow-900">${queuedCount} queued</span>
            <button 
              hx-post="/api/queue/clear"
              hx-swap="none"
              hx-confirm="Cancel all queued jobs?"
              class="px-3 py-1 text-sm bg-yellow-200 text-yellow-800 rounded hover:bg-yellow-300 transition-colors">
              Clear
            </button>
          </div>
        </div>
      ` : ''}
    </div>
  ` : '';

  // Count total jobs
  const totalJobs = searches.reduce((sum, s) => sum + s.jobCount, 0);

  return `
    <div class="mb-6 flex justify-between items-start">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 mb-2">Your Searches</h1>
        <p class="text-gray-600">Click a search to view reports and run new searches.</p>
      </div>
      <div class="flex gap-2">
        ${totalJobs > 0 ? `
          <button 
            hx-post="/api/jobs/clear"
            hx-swap="none"
            hx-confirm="Delete ALL job history? This cannot be undone."
            class="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors text-sm">
            Clear All Jobs
          </button>
        ` : ''}
        <a href="/add" class="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
          <span class="text-lg">+</span>
          Add Search
        </a>
      </div>
    </div>

    ${statusBar}
    
    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      ${searchCards}
    </div>
  `;
}

function getStatusBadge(job?: Job): string {
  if (!job) {
    return `<span class="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-600">Not run</span>`;
  }

  switch (job.status) {
    case "running":
      return `<span class="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700 flex items-center gap-1">
        <span class="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
        Running
      </span>`;
    case "completed":
      return `<span class="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700">Completed</span>`;
    case "failed":
      return `<span class="px-2 py-1 text-xs rounded-full bg-red-100 text-red-700">Failed</span>`;
    case "queued":
      return `<span class="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-700">Queued</span>`;
    default:
      return `<span class="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-600">${job.status}</span>`;
  }
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function addSearchForm(): string {
  return `
    <div class="mb-6">
      <a href="/" class="text-blue-600 hover:text-blue-800 text-sm">&larr; Back to Dashboard</a>
    </div>

    <div class="max-w-2xl">
      <h1 class="text-2xl font-bold text-gray-900 mb-2">Add New Search</h1>
      <p class="text-gray-600 mb-6">Tell us what you're looking for and we'll find deals on Facebook Marketplace.</p>
      
      <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <form hx-post="/api/search" hx-target="#form-errors" hx-swap="innerHTML">
          <div id="form-errors"></div>

          <div class="mb-4">
            <label for="prompt" class="block text-sm font-medium text-gray-700 mb-1">
              What are you looking for?
            </label>
            <textarea 
              id="prompt" 
              name="prompt" 
              required
              rows="4"
              placeholder="e.g., Standing desk under $300, prefer electric/motorized, good condition. Brands like Uplift, Jarvis, or IKEA Bekant are great."
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none text-base"
            ></textarea>
          </div>

          <div class="mb-6">
            <label for="location" class="block text-sm font-medium text-gray-700 mb-1">
              Location
            </label>
            <input 
              type="text" 
              id="location" 
              name="location" 
              value="San Francisco"
              placeholder="e.g., San Francisco, New York, Los Angeles"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>

          <div class="flex gap-3">
            <button 
              type="submit"
              class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2"
            >
              <span class="htmx-indicator">
                <svg class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                </svg>
              </span>
              Create Search
            </button>
            <a href="/" class="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
              Cancel
            </a>
          </div>
        </form>
      </div>

      <div class="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h3 class="font-medium text-gray-900 mb-2">Tips for better results</h3>
        <ul class="text-sm text-gray-600 space-y-1">
          <li>• Include a specific price range (e.g., "under $300")</li>
          <li>• Mention preferred brands or models</li>
          <li>• Specify condition requirements (new, like new, good)</li>
          <li>• Note any must-have features</li>
        </ul>
      </div>
    </div>
  `;
}
