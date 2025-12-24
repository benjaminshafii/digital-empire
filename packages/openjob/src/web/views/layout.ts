/**
 * Clean, minimal layout
 */

export function layout(title: string, content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://unpkg.com/htmx.org@1.9.10"></script>
  <style>
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      -webkit-font-smoothing: antialiased;
    }
    .prose { line-height: 1.7; }
    .prose h1 { font-size: 1.5rem; font-weight: 600; margin: 1.5rem 0 1rem; }
    .prose h2 { font-size: 1.25rem; font-weight: 600; margin: 1.25rem 0 0.75rem; }
    .prose h3 { font-size: 1.1rem; font-weight: 600; margin: 1rem 0 0.5rem; }
    .prose p { margin-bottom: 0.75rem; }
    .prose ul, .prose ol { padding-left: 1.5rem; margin-bottom: 0.75rem; }
    .prose li { margin-bottom: 0.25rem; }
    .prose code { background: #f3f4f6; padding: 0.125rem 0.375rem; border-radius: 0.25rem; font-size: 0.875rem; }
    .prose pre { background: #f9fafb; border: 1px solid #e5e7eb; padding: 1rem; border-radius: 0.5rem; overflow-x: auto; margin: 1rem 0; }
    .prose pre code { background: none; padding: 0; }
    .prose table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
    .prose th, .prose td { border: 1px solid #e5e7eb; padding: 0.5rem 0.75rem; text-align: left; }
    .prose th { background: #f9fafb; font-weight: 600; }
    .prose a { color: #2563eb; }
    .prose blockquote { border-left: 3px solid #e5e7eb; padding-left: 1rem; color: #6b7280; }
  </style>
</head>
<body class="bg-white text-gray-900 min-h-screen">
  ${content}
</body>
</html>`;
}
