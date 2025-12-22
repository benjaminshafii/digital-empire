/**
 * Search detail page - shows search config and all jobs/reports
 */
import type { Search, Job } from "../../core/types";

interface SearchPageData {
  search: Search;
  jobs: Job[];
  runningJob?: Job;
  queuedCount?: number;
}

export function searchPage(data: SearchPageData): string {
  const { search, jobs, runningJob } = data;

  const jobRows = jobs.map(job => {
    const statusBadge = getStatusBadge(job);
    const duration = job.completedAt && job.startedAt
      ? formatDuration(new Date(job.startedAt), new Date(job.completedAt))
      : job.startedAt
        ? "running..."
        : "-";

    let actionCell = "";
    if (job.status === "completed") {
      actionCell = `<a href="/search/${search.slug}/${job.id}" class="text-blue-600 hover:text-blue-800 font-medium">View Report</a>`;
    } else if (job.status === "running" || job.status === "queued") {
      actionCell = `
        <button 
          hx-post="/api/job/${search.slug}/${job.id}/cancel"
          hx-swap="none"
          hx-confirm="Cancel this job?"
          class="text-red-600 hover:text-red-800 font-medium">
          Cancel
        </button>
      `;
    }

    return `
      <tr class="hover:bg-gray-50">
        <td class="px-4 py-3 text-sm font-mono text-gray-500">${job.id.slice(0, 8)}</td>
        <td class="px-4 py-3">${statusBadge}</td>
        <td class="px-4 py-3 text-sm text-gray-600">${formatRelativeTime(job.createdAt)}</td>
        <td class="px-4 py-3 text-sm text-gray-600">${duration}</td>
        <td class="px-4 py-3 text-sm">${actionCell}</td>
      </tr>
    `;
  }).join("");

  const queuedJobs = jobs.filter(j => j.status === "queued");
  
  const runningIndicator = runningJob ? `
    <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6" 
         hx-get="/api/search/${search.slug}/status" 
         hx-trigger="every 5s"
         hx-swap="outerHTML">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
          <span class="font-medium text-blue-900">Job running: ${runningJob.id.slice(0, 8)}</span>
          <span class="text-blue-600 text-sm">${formatRelativeTime(runningJob.createdAt)}</span>
        </div>
        <button 
          hx-post="/api/job/${search.slug}/${runningJob.id}/cancel"
          hx-swap="none"
          hx-confirm="Stop this running job?"
          class="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors">
          Stop
        </button>
      </div>
    </div>
  ` : "";
  
  const queueIndicator = queuedJobs.length > 0 ? `
    <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <span class="font-medium text-yellow-900">${queuedJobs.length} job${queuedJobs.length > 1 ? 's' : ''} queued</span>
        </div>
        <button 
          hx-post="/api/queue/clear"
          hx-swap="none"
          hx-confirm="Cancel all queued jobs?"
          class="px-3 py-1 text-sm bg-yellow-200 text-yellow-800 rounded hover:bg-yellow-300 transition-colors">
          Clear Queue
        </button>
      </div>
    </div>
  ` : "";

  return `
    <div class="mb-6">
      <a href="/" class="text-blue-600 hover:text-blue-800 text-sm">&larr; Back to Dashboard</a>
    </div>

    <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
      <div class="flex justify-between items-start mb-4">
        <div>
          <h1 class="text-2xl font-bold text-gray-900 mb-2">${escapeHtml(search.name)}</h1>
          <p class="text-gray-600">${escapeHtml(search.prompt)}</p>
        </div>
        <button 
          hx-post="/api/search/${search.slug}/run"
          hx-swap="none"
          hx-on::after-request="window.location.reload()"
          class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          ${runningJob ? 'disabled class="opacity-50 cursor-not-allowed"' : ''}>
          <span>Run Search</span>
          <span class="htmx-indicator">
            <svg class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
            </svg>
          </span>
        </button>
      </div>
      <div class="flex gap-4 text-sm text-gray-500">
        <span>📍 ${escapeHtml(search.location)}</span>
        ${search.schedule ? `<span>⏰ ${escapeHtml(search.schedule)}</span>` : ""}
      </div>
    </div>

    ${runningIndicator}
    ${queueIndicator}

    <div class="bg-white rounded-lg shadow-sm border border-gray-200">
      <div class="px-6 py-4 border-b border-gray-200">
        <h2 class="text-lg font-semibold text-gray-900">Reports</h2>
      </div>
      ${jobs.length > 0 ? `
        <table class="w-full">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Job ID</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Started</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            ${jobRows}
          </tbody>
        </table>
      ` : `
        <div class="p-8 text-center text-gray-500">
          <p>No reports yet. Click "Run Search" to start.</p>
        </div>
      `}
    </div>
  `;
}

export function statusFragment(runningJob?: Job): string {
  if (!runningJob) {
    return `<div id="status-area"></div>`;
  }

  return `
    <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6" 
         hx-get="/api/search/${runningJob.id}/status" 
         hx-trigger="every 5s"
         hx-swap="outerHTML">
      <div class="flex items-center gap-3">
        <div class="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
        <span class="font-medium text-blue-900">Job running: ${runningJob.id.slice(0, 8)}</span>
        <span class="text-blue-600 text-sm">${formatRelativeTime(runningJob.createdAt)}</span>
      </div>
    </div>
  `;
}

function getStatusBadge(job: Job): string {
  switch (job.status) {
    case "running":
      return `<span class="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700 flex items-center gap-1 w-fit">
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

function formatDuration(start: Date, end: Date): string {
  const diffMs = end.getTime() - start.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const mins = Math.floor(diffSecs / 60);
  const secs = diffSecs % 60;
  
  if (mins > 0) {
    return `${mins}m ${secs}s`;
  }
  return `${secs}s`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
