/**
 * Home - simple prompt input
 */
import type { Search, Job } from "../../core/types";

interface SearchWithStatus extends Search {
  lastJob?: Job;
  jobCount: number;
  promptPreview?: string;
}

interface HomePageData {
  searches: SearchWithStatus[];
  runningJob?: { searchSlug: string; job: Job } | null;
  queuedCount: number;
}

export function homePage(data: HomePageData | SearchWithStatus[]): string {
  const { searches, runningJob } = Array.isArray(data)
    ? { searches: data, runningJob: null, queuedCount: 0 }
    : data;

  return `
    <div class="max-w-2xl mx-auto px-4 py-12">
      <!-- Header -->
      <div class="flex items-center justify-between mb-8">
        <h1 class="text-xl font-semibold">openjob</h1>
        <a href="/list" class="text-sm text-gray-500 hover:text-gray-900">All jobs</a>
      </div>

      <!-- Running indicator -->
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

      <!-- Prompt form -->
      <form hx-post="/api/run" hx-target="#result" hx-swap="innerHTML" class="mb-8">
        <textarea 
          name="prompt" 
          required
          rows="4"
          placeholder="Enter a prompt... (use @agent for specific agents)"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-base"
          autofocus
        ></textarea>
        
        <div class="flex items-center justify-between mt-3">
          <div class="flex items-center gap-3">
            <button type="submit" class="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 text-sm font-medium">
              Run
            </button>
            <select name="schedule" class="text-sm border border-gray-300 rounded-lg px-2 py-1.5 text-gray-600">
              <option value="">No schedule</option>
              <option value="30m">Every 30 min</option>
              <option value="1h">Every hour</option>
              <option value="2h">Every 2 hours</option>
              <option value="6h">Every 6 hours</option>
              <option value="12h">Every 12 hours</option>
              <option value="24h">Daily</option>
            </select>
          </div>
          <span class="text-xs text-gray-400">{{reportPath}} for output path</span>
        </div>
      </form>

      <div id="result"></div>

      <!-- Recent jobs -->
      ${searches.length > 0 ? `
        <div>
          <div class="text-sm text-gray-500 mb-3">Recent</div>
          <div class="space-y-1">
            ${searches.slice(0, 8).map(s => `
              <a href="/job/${s.slug}" class="flex items-center justify-between py-2 px-3 -mx-3 rounded hover:bg-gray-50">
                <div class="flex items-center gap-2 min-w-0">
                  ${statusDot(s.lastJob)}
                  <span class="truncate">${escapeHtml(s.name)}</span>
                  ${s.schedule ? `<span class="text-xs text-purple-600">⏰</span>` : ''}
                </div>
                <span class="text-xs text-gray-400 flex-shrink-0">${s.lastJob ? timeAgo(s.lastJob.createdAt) : ''}</span>
              </a>
            `).join('')}
          </div>
        </div>
      ` : ''}
    </div>
  `;
}

export function runningJobView(data: { search: Search; job: Job; tmuxSession: string }): string {
  const { search, job, tmuxSession } = data;
  
  return `
    <div class="border border-gray-200 rounded-lg overflow-hidden" 
         hx-get="/api/job/${search.slug}/${job.id}/status" 
         hx-trigger="every 3s" 
         hx-swap="outerHTML">
      <div class="p-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
          <span class="font-medium">${escapeHtml(search.name)}</span>
        </div>
        <span class="text-sm text-gray-500">running</span>
      </div>
      
      <div class="p-4 space-y-4">
        <div>
          <div class="text-xs text-gray-500 mb-1">Terminal session</div>
          <code class="text-sm bg-gray-100 px-2 py-1 rounded">${tmuxSession}</code>
        </div>
        
        <div>
          <div class="text-xs text-gray-500 mb-1">Attach command</div>
          <code class="text-sm bg-gray-900 text-green-400 px-3 py-2 rounded block">tmux attach -t ${tmuxSession}</code>
        </div>

        <div class="flex items-center justify-between pt-2">
          <button hx-post="/api/job/${search.slug}/${job.id}/cancel" 
                  hx-swap="none"
                  hx-on::after-request="window.location.reload()"
                  class="text-sm text-red-600 hover:underline">Cancel</button>
          <a href="/job/${search.slug}" class="text-sm text-gray-500 hover:text-gray-900">View details →</a>
        </div>
      </div>
    </div>
  `;
}

function statusDot(job?: Job): string {
  if (!job) return '<span class="w-1.5 h-1.5 bg-gray-300 rounded-full"></span>';
  const colors: Record<string, string> = {
    running: 'bg-blue-500 animate-pulse',
    completed: 'bg-green-500',
    failed: 'bg-red-500',
    queued: 'bg-yellow-500',
  };
  return `<span class="w-1.5 h-1.5 ${colors[job.status] || 'bg-gray-300'} rounded-full"></span>`;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function addSearchForm(): string {
  return homePage({ searches: [], runningJob: null, queuedCount: 0 });
}
