# Obsidian Website Sync Plugin - Design Document

## Overview

A simple Obsidian plugin that syncs markdown files from a designated folder in your vault to your website's blog content folder via GitHub.

## Goals

1. **Simplicity** - One-click publish, minimal configuration
2. **Non-destructive** - Never modify files in Obsidian, only read
3. **Git-based** - Use GitHub as the sync mechanism (familiar, auditable)

## User Flow

1. User writes a note in Obsidian
2. User adds frontmatter with `publish: true` 
3. User clicks "Sync to Website" in ribbon or command palette
4. Plugin reads all publishable notes and pushes to GitHub repo
5. Website rebuilds automatically via Vercel/GitHub Actions

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    OBSIDIAN VAULT                        │
│  ┌─────────────────────────────────────────────────┐    │
│  │  /publish/                                       │    │
│  │    ├── my-first-post.md   (publish: true)       │    │
│  │    ├── draft-post.md      (publish: false)      │    │
│  │    └── another-post.md    (publish: true)       │    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
                           │
                           │ Plugin reads files with
                           │ publish: true frontmatter
                           ▼
┌─────────────────────────────────────────────────────────┐
│                    SYNC PLUGIN                           │
│  1. Read all .md files from configured folder           │
│  2. Filter by frontmatter (publish: true)               │
│  3. Transform content (wiki-links → URLs, etc.)         │
│  4. Push to GitHub via API                              │
└─────────────────────────────────────────────────────────┘
                           │
                           │ GitHub API
                           │ (create/update files)
                           ▼
┌─────────────────────────────────────────────────────────┐
│              GITHUB REPOSITORY                           │
│  cool-website/                                          │
│    └── apps/blog/src/content/blog/                      │
│          ├── my-first-post.md                           │
│          └── another-post.md                            │
└─────────────────────────────────────────────────────────┘
                           │
                           │ Vercel auto-deploy
                           ▼
┌─────────────────────────────────────────────────────────┐
│              LIVE WEBSITE                                │
│  blog.benjaminshafii.com/blog/my-first-post             │
└─────────────────────────────────────────────────────────┘
```

## Frontmatter Schema

Required frontmatter for publishable posts:

```yaml
---
title: "My Post Title"
date: 2024-11-30
publish: true           # Required: must be true to sync
tags: ["tag1", "tag2"]  # Optional
draft: false            # Optional: if true, won't appear on site
---
```

## Plugin Settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `sourceFolder` | string | `"publish"` | Folder in vault to sync from |
| `githubToken` | string | `""` | Personal access token (PAT) |
| `githubRepo` | string | `""` | Format: `owner/repo` |
| `targetPath` | string | `"apps/blog/src/content/blog"` | Path in repo for posts |
| `branch` | string | `"master"` | Branch to push to |

## Content Transformations

The plugin will transform Obsidian-specific syntax to standard markdown:

1. **Wiki-links** → Standard links
   - `[[Note Name]]` → `[Note Name](/blog/note-name)`
   - `[[Note Name|Display]]` → `[Display](/blog/note-name)`

2. **Embeds** → Links (or remove)
   - `![[Image.png]]` → `![Image](/images/image.png)` (if supported)
   - `![[Note]]` → Remove or convert to blockquote

3. **Callouts** → Blockquotes (Astro can style these)
   - `> [!note]` → `> **Note:**`

## File Structure

```
apps/obsidian-plugin/
├── DESIGN.md           # This file
├── manifest.json       # Plugin metadata
├── package.json        # Dependencies
├── src/
│   ├── main.ts         # Plugin entry point
│   ├── settings.ts     # Settings tab
│   ├── sync.ts         # Sync logic
│   ├── transform.ts    # Content transformations
│   └── github.ts       # GitHub API wrapper
├── styles.css          # Optional styles
└── tsconfig.json       # TypeScript config
```

## Implementation Steps

### Phase 1: Basic Sync (MVP)
1. [ ] Set up plugin boilerplate (manifest, main.ts)
2. [ ] Create settings tab with GitHub token, repo, paths
3. [ ] Implement file reading from source folder
4. [ ] Filter by `publish: true` frontmatter
5. [ ] Push files to GitHub via REST API
6. [ ] Add ribbon icon and command

### Phase 2: Transformations
1. [ ] Wiki-link to URL conversion
2. [ ] Remove Obsidian-specific syntax
3. [ ] Handle image embeds (future: upload to repo)

### Phase 3: Polish
1. [ ] Sync status indicator
2. [ ] Diff preview before sync
3. [ ] Delete posts removed from vault
4. [ ] Conflict detection

## GitHub API Usage

We'll use the GitHub Contents API for simplicity:

```typescript
// Create or update a file
PUT /repos/{owner}/{repo}/contents/{path}
{
  "message": "Sync: Update {filename}",
  "content": "{base64-encoded-content}",
  "sha": "{existing-file-sha}"  // Required for updates
}
```

For multiple files, we could use the Git Data API (trees/commits) but Contents API is simpler for MVP.

## Security Considerations

1. **Token Storage** - Store GitHub PAT in Obsidian's secure storage (plugin data)
2. **Minimal Permissions** - PAT only needs `repo` scope (or `public_repo` for public repos)
3. **No Secrets in Content** - Plugin should warn if content contains sensitive patterns

## Alternatives Considered

1. **Git CLI** - Requires git installed, complex setup
2. **GitHub Actions (pull-based)** - Requires vault in git, not user-friendly
3. **Custom API** - Extra infrastructure, overkill for personal use

## Dependencies

- `obsidian` - Obsidian API (provided)
- No external dependencies needed - use built-in fetch for GitHub API

## Success Criteria

- [ ] User can sync posts with 1 click
- [ ] Posts appear on live site within 2 minutes
- [ ] Wiki-links are converted to proper URLs
- [ ] Drafts (publish: false) are not synced
- [ ] Settings are persisted across restarts
