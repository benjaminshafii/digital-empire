/**
 * Job detail page with prompt editor and schedule
 */
import type { Search, Job } from "../../core/types";

interface SearchPageData {
  search: Search;
  jobs: Job[];
  runningJob?: Job;
  prompt?: string; // The prompt.md content
}

export function searchPage(data: SearchPageData): string {
  const { search, jobs, runningJob, prompt } = data;

  // Calculate next run if scheduled
  const nextRunInfo = search.schedule ? getNextRunInfo(search, jobs) : null;

  const jobRows = jobs
    .map((job) => {
      const statusBadge = getStatusBadge(job);
      const duration =
        job.completedAt && job.startedAt
          ? formatDuration(new Date(job.startedAt), new Date(job.completedAt))
          : job.startedAt
          ? "..."
          : "-";

      let action = "";
      if (job.status === "completed") {
        action = `<a href="/search/${search.slug}/${job.id}" class="text-blue-600 hover:text-blue-800">View</a>`;
      } else if (job.status === "running" || job.status === "queued") {
        action = `<button hx-post="/api/job/${search.slug}/${job.id}/cancel" hx-swap="none" class="text-red-600 hover:text-red-800">Cancel</button>`;
      }

      return `
      <tr class="hover:bg-gray-50">
        <td class="px-4 py-3 text-sm font-mono text-gray-500">${job.id.slice(0, 8)}</td>
        <td class="px-4 py-3">${statusBadge}</td>
        <td class="px-4 py-3 text-sm text-gray-600">${formatRelativeTime(job.createdAt)}</td>
        <td class="px-4 py-3 text-sm text-gray-600">${duration}</td>
        <td class="px-4 py-3 text-sm">${action}</td>
      </tr>
    `;
    })
    .join("");

  const runningIndicator = runningJob
    ? `
    <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6" 
         hx-get="/api/search/${search.slug}/status" hx-trigger="every 3s" hx-swap="outerHTML">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
          <span class="font-medium text-blue-900">Running: ${runningJob.id.slice(0, 8)}</span>
        </div>
        <div class="flex items-center gap-3">
          <code class="text-xs bg-white px-2 py-1 rounded border">tmux attach -t mkt-${runningJob.id}</code>
          <button hx-post="/api/job/${search.slug}/${runningJob.id}/cancel" hx-swap="none"
            class="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200">Stop</button>
        </div>
      </div>
    </div>
  `
    : "";

  return `
    <div class="mb-6">
      <a href="/" class="text-blue-600 hover:text-blue-800 text-sm">&larr; Back</a>
    </div>

    <!-- Job Info -->
    <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
      <div class="flex justify-between items-start mb-4">
        <h1 class="text-2xl font-bold text-gray-900">${escapeHtml(search.name)}</h1>
        <button 
          hx-post="/api/search/${search.slug}/run"
          hx-swap="none"
          hx-on::after-request="window.location.reload()"
          class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          ${runningJob ? "disabled" : ""}>
          Run Now
        </button>
      </div>

      <!-- Prompt Section -->
      <div class="mb-4">
        <div class="flex items-center justify-between mb-2">
          <h3 class="text-sm font-medium text-gray-700">Prompt</h3>
          <button 
            onclick="document.getElementById('prompt-editor').classList.toggle('hidden'); document.getElementById('prompt-display').classList.toggle('hidden')"
            class="text-sm text-blue-600 hover:text-blue-800">
            Edit
          </button>
        </div>
        <pre id="prompt-display" class="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm font-mono text-gray-700 whitespace-pre-wrap overflow-x-auto">${escapeHtml(prompt || "No prompt found")}</pre>
        <form id="prompt-editor" class="hidden" hx-post="/api/search/${search.slug}/prompt" hx-swap="none">
          <textarea 
            name="prompt" 
            rows="10" 
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-mono text-sm"
          >${escapeHtml(prompt || "")}</textarea>
          <div class="flex gap-2 mt-2">
            <button type="submit" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
              Save Prompt
            </button>
            <button 
              type="button"
              onclick="document.getElementById('prompt-editor').classList.add('hidden'); document.getElementById('prompt-display').classList.remove('hidden')"
              class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm">
              Cancel
            </button>
          </div>
          <p class="text-xs text-gray-500 mt-2">
            Use <code class="bg-gray-100 px-1 rounded">@agent-name</code> to invoke agents. 
            Use <code class="bg-gray-100 px-1 rounded">{{reportPath}}</code> for the output file path.
          </p>
        </form>
      </div>

      <!-- Schedule Section -->
      <div class="border-t border-gray-100 pt-4 mt-4">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-sm font-medium text-gray-700 mb-1">Schedule</h3>
            ${
              search.schedule
                ? `
              <div class="flex items-center gap-2">
                <span class="px-2 py-1 bg-purple-100 text-purple-700 rounded text-sm">Every ${escapeHtml(search.schedule)}</span>
                ${nextRunInfo ? `<span class="text-sm text-gray-500">${nextRunInfo}</span>` : ""}
              </div>
            `
                : `<span class="text-sm text-gray-500">Not scheduled</span>`
            }
          </div>
          <div class="flex items-center gap-2">
            <select id="schedule-select" name="schedule" class="text-sm border border-gray-300 rounded px-2 py-1">
              <option value="" ${!search.schedule ? "selected" : ""}>Off</option>
              <option value="30m" ${search.schedule === "30m" ? "selected" : ""}>Every 30 min</option>
              <option value="1h" ${search.schedule === "1h" ? "selected" : ""}>Every hour</option>
              <option value="2h" ${search.schedule === "2h" ? "selected" : ""}>Every 2 hours</option>
              <option value="6h" ${search.schedule === "6h" ? "selected" : ""}>Every 6 hours</option>
              <option value="12h" ${search.schedule === "12h" ? "selected" : ""}>Every 12 hours</option>
              <option value="24h" ${search.schedule === "24h" ? "selected" : ""}>Daily</option>
            </select>
            <button 
              hx-post="/api/search/${search.slug}/schedule"
              hx-include="#schedule-select"
              hx-swap="none"
              class="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200">
              Save
            </button>
          </div>
        </div>
      </div>
    </div>

    ${runningIndicator}

    <!-- Jobs Table -->
    <div class="bg-white rounded-lg shadow-sm border border-gray-200">
      <div class="px-6 py-4 border-b border-gray-200">
        <h2 class="text-lg font-semibold text-gray-900">Reports</h2>
      </div>
      ${
        jobs.length > 0
          ? `
        <table class="w-full">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Started</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase"></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">${jobRows}</tbody>
        </table>
      `
          : `
        <div class="p-8 text-center text-gray-500">
          No reports yet. Click "Run Now" to start.
        </div>
      `
      }
    </div>
  `;
}

function getNextRunInfo(search: Search, jobs: Job[]): string | null {
  if (!search.schedule) return null;

  const lastCompleted = jobs.find((j) => j.status === "completed");
  if (!lastCompleted?.completedAt) return "due now";

  const match = search.schedule.match(/^(\d+)(m|h)$/);
  if (!match) return null;

  const [, num, unit] = match;
  const intervalMs = (unit === "h" ? parseInt(num) * 60 : parseInt(num)) * 60000;
  const lastRun = new Date(lastCompleted.completedAt).getTime();
  const nextRun = lastRun + intervalMs;
  const now = Date.now();

  if (nextRun <= now) return "due now";

  const diffMs = nextRun - now;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);

  if (diffMins < 60) return `next in ${diffMins}m`;
  return `next in ${diffHours}h ${diffMins % 60}m`;
}

function getStatusBadge(job: Job): string {
  switch (job.status) {
    case "running":
      return `<span class="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700 flex items-center gap-1 w-fit">
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

function formatDuration(start: Date, end: Date): string {
  const diffSecs = Math.floor((end.getTime() - start.getTime()) / 1000);
  const mins = Math.floor(diffSecs / 60);
  const secs = diffSecs % 60;
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
