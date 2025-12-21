# Obsidian Website Sync Plugin

A simple Obsidian plugin that syncs markdown files from your vault to your website's blog via GitHub.

## Overview

Write your blog posts in Obsidian, add `publish: true` to the frontmatter, and click sync. The plugin pushes your content to GitHub, where your website (Vercel, Netlify, etc.) automatically rebuilds.

## Features

- **One-Click Publish**: Sync all publishable notes with a single click
- **Non-Destructive**: Only reads from Obsidian, never modifies your notes
- **Git-Based**: Uses GitHub API for auditable, version-controlled publishing
- **Wiki-Link Transform**: Converts Obsidian wiki-links to standard URLs
- **Draft Support**: Only publishes notes with `publish: true` frontmatter

## Installation

### Manual Installation

1. Download the latest release
2. Extract to `.obsidian/plugins/website-sync/`
3. Enable the plugin in Obsidian settings

### Development

```bash
# From monorepo root
pnpm install

# Build the plugin
pnpm --filter @cool-website/obsidian-plugin build

# Run tests
pnpm --filter @cool-website/obsidian-plugin test
```

## Usage

### 1. Configure the Plugin

In Obsidian Settings > Website Sync:

- **GitHub Token**: Personal access token with repo write permissions
- **Repository**: `owner/repo` format (e.g., `benjaminshafii/cool-website`)
- **Source Folder**: Folder in your vault to sync from (e.g., `publish/`)
- **Target Path**: Path in the repo to sync to (e.g., `apps/blog/src/content/`)

### 2. Write Your Post

```markdown
---
title: My First Post
publish: true
date: 2025-01-15
---

# Hello World

This is my first blog post written in Obsidian!
```

### 3. Sync

Click the sync icon in the ribbon or use the command palette:
- `Website Sync: Sync to GitHub`

## How It Works

```
Obsidian Vault                    GitHub Repo
┌──────────────┐                  ┌──────────────┐
│ /publish/    │                  │ /apps/blog/  │
│  post-1.md   │  ──── sync ───▶  │  post-1.md   │
│  post-2.md   │                  │  post-2.md   │
└──────────────┘                  └──────────────┘
                                         │
                                         ▼
                                  ┌──────────────┐
                                  │   Vercel/    │
                                  │   Netlify    │
                                  │   Rebuild    │
                                  └──────────────┘
```

## Project Structure

```
obsidian-plugin/
├── src/
│   ├── main.ts              # Plugin entry point
│   ├── types.ts             # TypeScript types
│   ├── services/
│   │   ├── github.ts        # GitHub API client
│   │   ├── sync.ts          # Sync logic
│   │   └── transformer.ts   # Content transformations
│   └── ui/
│       ├── settings-tab.ts  # Settings UI
│       ├── status-bar.ts    # Status bar item
│       └── sync-view.ts     # Sync progress view
├── __mocks__/
│   └── obsidian.ts          # Mocks for testing
├── manifest.json            # Obsidian plugin manifest
├── esbuild.config.mjs       # Build configuration
└── vitest.config.ts         # Test configuration
```

## Content Transformations

The plugin transforms Obsidian-specific syntax for web compatibility:

| Obsidian | Web |
|----------|-----|
| `[[Link]]` | `[Link](/blog/link)` |
| `![[image.png]]` | `![image](/images/image.png)` |
| `==highlight==` | `<mark>highlight</mark>` |

## Testing

```bash
# Run all tests
pnpm --filter @cool-website/obsidian-plugin test

# Run specific test file
pnpm --filter @cool-website/obsidian-plugin vitest run src/services/sync.test.ts
```

## License

MIT
