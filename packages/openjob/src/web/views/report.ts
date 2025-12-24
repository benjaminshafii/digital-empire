/**
 * Report page - rendered markdown
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

  marked.setOptions({ gfm: true, breaks: true });
  const html = marked.parse(report) as string;

  return `
    <div class="max-w-2xl mx-auto px-4 py-12">
      <!-- Header -->
      <div class="flex items-center gap-3 mb-6">
        <a href="/" class="text-xl font-semibold hover:opacity-70">openjob</a>
        <span class="text-gray-300">/</span>
        <a href="/job/${search.slug}" class="text-gray-600 hover:text-gray-900">${escapeHtml(search.name)}</a>
        <span class="text-gray-300">/</span>
        <span class="text-gray-900">report</span>
      </div>

      <!-- Meta -->
      <div class="flex items-center justify-between mb-6 text-sm text-gray-500">
        <div>
          <span class="font-mono">${job.id.slice(0, 8)}</span>
          <span class="mx-2">·</span>
          <span>${formatDate(job.createdAt)}</span>
          ${job.duration ? `<span class="mx-2">·</span><span>${formatDuration(job.duration)}</span>` : ''}
        </div>
        <a href="/api/search/${search.slug}/${job.id}/raw" class="hover:text-gray-900">Raw</a>
      </div>

      <!-- Content -->
      <div class="prose">
        ${html}
      </div>

      <!-- Footer -->
      <div class="mt-8 pt-6 border-t border-gray-100">
        <a href="/job/${search.slug}" class="text-sm text-gray-500 hover:text-gray-900">← Back</a>
      </div>
    </div>
  `;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}

function formatDuration(ms: number): string {
  if (ms < 60000) return `${Math.round(ms / 1000)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
