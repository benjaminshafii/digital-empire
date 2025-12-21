# Blog

Personal blog built with Astro, featuring a minimal content-focused design.

## Tech Stack

- **Framework**: Astro 5
- **Content**: Markdown with frontmatter
- **Styling**: Minimal, content-first approach

## Project Structure

```
src/
├── content/
│   └── blog/           # Markdown blog posts
├── layouts/
│   └── BlogLayout.astro
├── pages/
│   ├── index.astro     # Blog listing
│   └── blog/
│       └── [slug].astro # Dynamic post pages
└── content.config.ts   # Content collection config
```

## Writing Posts

Add new posts as Markdown files in `src/content/blog/`:

```markdown
---
title: "My Post Title"
date: 2025-01-01
description: "A brief description"
---

Your content here...
```

## Development

```bash
# From monorepo root
npm run dev:blog
```

## Build

```bash
# From monorepo root
npm run build:blog
```

## Deployment

Deployed via Vercel with the root directory set to `apps/blog`.
