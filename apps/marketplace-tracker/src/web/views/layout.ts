/**
 * Base HTML layout with Tailwind CSS (CDN) and HTMX
 */

export function layout(title: string, content: string): string {
  return `<!DOCTYPE html>
<html lang="en" class="h-full bg-gray-50">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - Marketplace Tracker</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://unpkg.com/htmx.org@1.9.10"></script>
  <style>
    /* Custom styles for markdown content */
    .prose h1 { font-size: 1.875rem; font-weight: 700; margin-bottom: 1rem; }
    .prose h2 { font-size: 1.5rem; font-weight: 600; margin-top: 1.5rem; margin-bottom: 0.75rem; border-bottom: 1px solid #e5e7eb; padding-bottom: 0.5rem; }
    .prose h3 { font-size: 1.25rem; font-weight: 600; margin-top: 1rem; margin-bottom: 0.5rem; }
    .prose p { margin-bottom: 0.75rem; line-height: 1.625; }
    .prose ul { list-style-type: disc; padding-left: 1.5rem; margin-bottom: 0.75rem; }
    .prose ol { list-style-type: decimal; padding-left: 1.5rem; margin-bottom: 0.75rem; }
    .prose li { margin-bottom: 0.25rem; }
    .prose a { color: #2563eb; text-decoration: underline; }
    .prose a:hover { color: #1d4ed8; }
    .prose table { width: 100%; border-collapse: collapse; margin-bottom: 1rem; }
    .prose th, .prose td { border: 1px solid #e5e7eb; padding: 0.5rem 0.75rem; text-align: left; }
    .prose th { background-color: #f9fafb; font-weight: 600; }
    .prose hr { margin: 1.5rem 0; border-color: #e5e7eb; }
    .prose blockquote { border-left: 4px solid #e5e7eb; padding-left: 1rem; color: #6b7280; font-style: italic; }
    .prose code { background-color: #f3f4f6; padding: 0.125rem 0.25rem; border-radius: 0.25rem; font-size: 0.875rem; }
    .prose pre { background-color: #1f2937; color: #f9fafb; padding: 1rem; border-radius: 0.5rem; overflow-x: auto; margin-bottom: 1rem; }
    .prose pre code { background-color: transparent; padding: 0; }
    
    /* HTMX loading indicator */
    .htmx-request .htmx-indicator { display: inline-block; }
    .htmx-indicator { display: none; }
  </style>
</head>
<body class="h-full">
  <div class="min-h-full">
    <nav class="bg-white shadow-sm border-b border-gray-200">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="flex h-16 justify-between items-center">
          <div class="flex items-center">
            <a href="/" class="flex items-center gap-2">
              <span class="text-2xl">🛒</span>
              <span class="font-semibold text-gray-900">Marketplace Tracker</span>
            </a>
          </div>
          <div class="flex items-center gap-4">
            <span class="htmx-indicator">
              <svg class="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </span>
            <a href="/" class="text-gray-600 hover:text-gray-900">Dashboard</a>
          </div>
        </div>
      </div>
    </nav>

    <main class="py-8">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        ${content}
      </div>
    </main>
  </div>
</body>
</html>`;
}
