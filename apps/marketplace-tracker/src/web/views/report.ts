/**
 * Report page - renders markdown report as HTML
 */
import { marked } from "marked";
import type { Search, Job } from "../../core/types";

interface ReportPageData {
  search: Search;
  job: Job;
  report: string;
}

export function reportPage(data: ReportPageData): string {
  const { search, job, report } = data;

  // Configure marked for nice output
  marked.setOptions({
    gfm: true,
    breaks: true,
  });

  const htmlContent = marked.parse(report) as string;

  return `
    <div class="mb-6 flex items-center justify-between">
      <div>
        <a href="/search/${search.slug}" class="text-blue-600 hover:text-blue-800 text-sm">&larr; Back to ${escapeHtml(search.name)}</a>
        <h1 class="text-2xl font-bold text-gray-900 mt-2">${escapeHtml(search.name)} Report</h1>
        <p class="text-gray-500 text-sm mt-1">
          Job ${job.id.slice(0, 8)} &bull; ${formatDate(job.createdAt)}
        </p>
      </div>
      <div class="flex gap-2">
        <a href="/api/search/${search.slug}/${job.id}/raw" 
           class="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
          View Raw Markdown
        </a>
      </div>
    </div>

    <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
      <div class="prose max-w-none">
        ${htmlContent}
      </div>
    </div>
  `;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
