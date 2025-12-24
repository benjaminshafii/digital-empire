/**
 * List page - all jobs
 */
import type { Search, Job } from "../../core/types";

interface SearchWithStatus extends Search {
  lastJob?: Job;
  jobCount: number;
  promptPreview?: string;
}

interface ListPageData {
  searches: SearchWithStatus[];
  runningJob?: { searchSlug: string; job: Job } | null;
}

export function listPage(data: ListPageData): string {
  const { searches, runningJob } = data;
  const scheduled = searches.filter(s => s.schedule);
  const other = searches.filter(s => !s.schedule);

  return `
    <div class="max-w-2xl mx-auto px-4 py-12">
      <!-- Header -->
      <div class="flex items-center justify-between mb-8">
        <div class="flex items-center gap-3">
          <a href="/" class="text-xl font-semibold hover:opacity-70">openjob</a>
          <span class="text-gray-300">/</span>
          <span class="text-gray-600">jobs</span>
        </div>
        <span class="text-sm text-gray-400">${searches.length} total</span>
      </div>

      <!-- Running -->
      ${runningJob ? `
        <div class="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
            <span class="text-sm">Running: <a href="/job/${runningJob.searchSlug}" class="font-medium hover:underline">${escapeHtml(runningJob.searchSlug)}</a></span>
          </div>
          <button hx-post="/api/job/${runningJob.searchSlug}/${runningJob.job.id}/cancel" 
                  hx-swap="none"
                  hx-on::after-request="window.location.reload()"
                  class="text-sm text-red-600 hover:underline">Cancel</button>
        </div>
      ` : ''}

      <!-- Scheduled -->
      ${scheduled.length > 0 ? `
        <div class="mb-8">
          <div class="text-sm text-gray-500 mb-2">Scheduled</div>
          <div class="border border-gray-200 rounded-lg divide-y divide-gray-200">
            ${scheduled.map(s => jobRow(s, runningJob)).join('')}
          </div>
        </div>
      ` : ''}

      <!-- All -->
      ${other.length > 0 ? `
        <div>
          <div class="text-sm text-gray-500 mb-2">All jobs</div>
          <div class="border border-gray-200 rounded-lg divide-y divide-gray-200">
            ${other.map(s => jobRow(s, runningJob)).join('')}
          </div>
        </div>
      ` : ''}

      ${searches.length === 0 ? `
        <div class="text-center py-12 text-gray-500">
          <p class="mb-4">No jobs yet</p>
          <a href="/" class="text-blue-600 hover:underline">Create one →</a>
        </div>
      ` : ''}

      <!-- Footer -->
      <div class="mt-8 pt-4 border-t border-gray-100 flex justify-between text-sm text-gray-400">
        <button hx-post="/api/sync" hx-swap="none" hx-on::after-request="window.location.reload()" 
                class="hover:text-gray-600">Sync</button>
        <a href="/" class="hover:text-gray-600">← Home</a>
      </div>
    </div>
  `;
}

function jobRow(s: SearchWithStatus, runningJob?: { searchSlug: string; job: Job } | null): string {
  const isRunning = runningJob?.searchSlug === s.slug;
  
  return `
    <a href="/job/${s.slug}" class="flex items-center justify-between p-3 hover:bg-gray-50">
      <div class="flex items-center gap-3 min-w-0">
        ${statusDot(s.lastJob, isRunning)}
        <span class="truncate font-medium">${escapeHtml(s.name)}</span>
        ${s.schedule ? `<span class="text-xs text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">⏰ ${s.schedule}</span>` : ''}
      </div>
      <div class="flex items-center gap-4 text-sm text-gray-400 flex-shrink-0">
        <span>${s.jobCount} runs</span>
        <span>${s.lastJob ? timeAgo(s.lastJob.createdAt) : 'never'}</span>
      </div>
    </a>
  `;
}

function statusDot(job?: Job, isRunning?: boolean): string {
  if (isRunning) return '<span class="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>';
  if (!job) return '<span class="w-2 h-2 bg-gray-300 rounded-full"></span>';
  const colors: Record<string, string> = {
    running: 'bg-blue-500 animate-pulse',
    completed: 'bg-green-500',
    failed: 'bg-red-500',
    queued: 'bg-yellow-500',
  };
  return `<span class="w-2 h-2 ${colors[job.status] || 'bg-gray-300'} rounded-full"></span>`;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
