/**
 * Job detail page
 */
import type { Search, Job } from "../../core/types";

interface JobPageData {
  search: Search;
  jobs: Job[];
  runningJob?: Job;
  prompt: string;
  scheduleDesc?: string;
  nextRun?: string | null;
}

export function jobPage(data: JobPageData): string {
  const { search, jobs, runningJob, prompt, scheduleDesc, nextRun } = data;

  return `
    <div class="max-w-2xl mx-auto px-4 py-12">
      <!-- Header -->
      <div class="flex items-center gap-3 mb-8">
        <a href="/" class="text-xl font-semibold hover:opacity-70">openjob</a>
        <span class="text-gray-300">/</span>
        <a href="/list" class="text-gray-600 hover:text-gray-900">jobs</a>
        <span class="text-gray-300">/</span>
        <span class="text-gray-900">${escapeHtml(search.name)}</span>
      </div>

      <!-- Running -->
      ${runningJob ? `
        <div class="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2">
              <span class="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
              <span class="font-medium">Running</span>
            </div>
            <button hx-post="/api/job/${search.slug}/${runningJob.id}/cancel" 
                    hx-swap="none"
                    hx-on::after-request="window.location.reload()"
                    class="text-sm text-red-600 hover:underline">Cancel</button>
          </div>
          <code class="text-sm bg-gray-900 text-green-400 px-3 py-2 rounded block">tmux attach -t mkt-${runningJob.id}</code>
          <div hx-get="/api/search/${search.slug}/status" hx-trigger="every 3s" hx-swap="innerHTML"></div>
        </div>
      ` : ''}

      <!-- Actions -->
      <div class="flex items-center gap-3 mb-6">
        <button hx-post="/api/search/${search.slug}/run" 
                hx-swap="none"
                hx-on::after-request="window.location.reload()"
                class="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 text-sm font-medium"
                ${runningJob ? 'disabled' : ''}>
          Run now
        </button>
        ${scheduleDesc ? `
          <span class="text-sm text-purple-600">⏰ ${scheduleDesc}</span>
        ` : ''}
      </div>

      <!-- Prompt -->
      <div class="mb-6">
        <div class="flex items-center justify-between mb-2">
          <span class="text-sm text-gray-500">Prompt</span>
          <button onclick="document.getElementById('prompt-view').classList.toggle('hidden'); document.getElementById('prompt-edit').classList.toggle('hidden')" 
                  class="text-sm text-blue-600 hover:underline">Edit</button>
        </div>
        <pre id="prompt-view" class="text-sm bg-gray-50 border border-gray-200 rounded-lg p-3 whitespace-pre-wrap">${escapeHtml(prompt)}</pre>
        <form id="prompt-edit" class="hidden" hx-post="/api/search/${search.slug}/prompt" hx-swap="none" hx-on::after-request="window.location.reload()">
          <textarea name="prompt" rows="6" class="w-full text-sm border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500">${escapeHtml(prompt)}</textarea>
          <div class="flex gap-2 mt-2">
            <button type="submit" class="px-3 py-1.5 bg-gray-900 text-white rounded text-sm hover:bg-gray-800">Save</button>
            <button type="button" onclick="document.getElementById('prompt-view').classList.remove('hidden'); document.getElementById('prompt-edit').classList.add('hidden')" 
                    class="px-3 py-1.5 border border-gray-300 rounded text-sm hover:bg-gray-50">Cancel</button>
          </div>
        </form>
      </div>

      <!-- Schedule -->
      <div class="mb-6">
        <div class="flex items-center justify-between mb-2">
          <span class="text-sm text-gray-500">Schedule</span>
          ${nextRun && nextRun !== 'now' ? `<span class="text-xs text-purple-600">Next run: ${nextRun}</span>` : ''}
          ${nextRun === 'now' ? `<span class="text-xs text-green-600">Ready to run</span>` : ''}
        </div>
        <form hx-post="/api/search/${search.slug}/schedule" hx-swap="none" hx-on::after-request="window.location.reload()" 
              class="flex items-center gap-2">
          <select name="schedule" class="text-sm border border-gray-300 rounded-lg px-2 py-1.5">
            <option value="" ${!search.schedule ? 'selected' : ''}>Off</option>
            <option value="30m" ${search.schedule === '30m' ? 'selected' : ''}>Every 30 min</option>
            <option value="1h" ${search.schedule === '1h' ? 'selected' : ''}>Every hour</option>
            <option value="2h" ${search.schedule === '2h' ? 'selected' : ''}>Every 2 hours</option>
            <option value="6h" ${search.schedule === '6h' ? 'selected' : ''}>Every 6 hours</option>
            <option value="12h" ${search.schedule === '12h' ? 'selected' : ''}>Every 12 hours</option>
            <option value="24h" ${search.schedule === '24h' ? 'selected' : ''}>Daily</option>
          </select>
          <button type="submit" class="text-sm text-blue-600 hover:underline">Update</button>
        </form>
      </div>

      <!-- History -->
      <div>
        <div class="text-sm text-gray-500 mb-2">History (${jobs.length})</div>
        ${jobs.length === 0 ? `
          <p class="text-sm text-gray-400">No runs yet</p>
        ` : `
          <div class="border border-gray-200 rounded-lg divide-y divide-gray-200">
            ${jobs.map(job => `
              <div class="flex items-center justify-between p-3">
                <div class="flex items-center gap-3">
                  ${statusDot(job)}
                  <span class="text-sm font-mono text-gray-600">${job.id.slice(0, 8)}</span>
                  <span class="text-sm text-gray-400">${timeAgo(job.createdAt)}</span>
                  ${job.duration ? `<span class="text-xs text-gray-400">${formatDuration(job.duration)}</span>` : ''}
                </div>
                <div class="flex items-center gap-3">
                  <span class="text-sm ${statusColor(job.status)}">${job.status}</span>
                  ${job.status === 'completed' ? `<a href="/search/${search.slug}/${job.id}" class="text-sm text-blue-600 hover:underline">View</a>` : ''}
                  ${job.status === 'running' ? `
                    <button hx-post="/api/job/${search.slug}/${job.id}/cancel" hx-swap="none" hx-on::after-request="window.location.reload()"
                            class="text-sm text-red-600 hover:underline">Cancel</button>
                  ` : ''}
                </div>
              </div>
            `).join('')}
          </div>
        `}
      </div>

      <!-- Delete -->
      <div class="mt-8 pt-6 border-t border-gray-100">
        <button hx-delete="/api/search/${search.slug}" 
                hx-swap="none"
                hx-confirm="Delete this job and all reports?"
                hx-on::after-request="window.location.href='/list'"
                class="text-sm text-red-600 hover:underline">Delete job</button>
      </div>
    </div>
  `;
}

function statusDot(job: Job): string {
  const colors: Record<string, string> = {
    running: 'bg-blue-500 animate-pulse',
    completed: 'bg-green-500',
    failed: 'bg-red-500',
    queued: 'bg-yellow-500',
  };
  return `<span class="w-2 h-2 ${colors[job.status] || 'bg-gray-300'} rounded-full"></span>`;
}

function statusColor(status: string): string {
  const colors: Record<string, string> = {
    running: 'text-blue-600',
    completed: 'text-green-600',
    failed: 'text-red-600',
    queued: 'text-yellow-600',
  };
  return colors[status] || 'text-gray-500';
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

function formatDuration(ms: number): string {
  if (ms < 60000) return `${Math.round(ms / 1000)}s`;
  return `${Math.floor(ms / 60000)}m`;
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
