# Website Sync Plugin - Implementation Plan

## Overview

An Obsidian plugin that syncs markdown notes to a website's blog via GitHub. Features a sleek native UI showing sync status for each publishable note.

## Core Features

1. **Sync Status View** - Always visible list showing all publishable notes and their sync state
2. **One-click Publish/Unpublish** - Simple buttons to sync or remove posts
3. **Visual Status Indicators** - Green (synced), yellow (changed), red (not synced)
4. **Content Transformation** - Wiki-links → URLs, clean Obsidian-specific syntax

## Architecture

```
src/
├── main.ts                 # Plugin entry point
├── types.ts                # Shared types
├── services/
│   ├── github.ts           # GitHub API wrapper
│   ├── github.test.ts      # GitHub service tests
│   ├── transformer.ts      # Content transformation
│   ├── transformer.test.ts # Transformer tests
│   ├── sync.ts             # Sync orchestration
│   └── sync.test.ts        # Sync service tests
├── ui/
│   ├── settings-tab.ts     # Settings configuration
│   ├── sync-view.ts        # Main sync status view
│   └── status-bar.ts       # Status bar item
└── __mocks__/
    └── obsidian.ts         # Mock Obsidian API for tests
```

## Data Models

### SyncableNote
```typescript
interface SyncableNote {
  path: string;           // Vault path: "publish/my-post.md"
  title: string;          // From frontmatter or filename
  slug: string;           // URL slug: "my-post"
  frontmatter: {
    title: string;
    date: string;
    tags: string[];
    publish: boolean;
    draft?: boolean;
  };
  content: string;        // Raw markdown content
  contentHash: string;    // MD5 hash for change detection
  syncStatus: SyncStatus;
}

type SyncStatus = 
  | { state: 'synced'; lastSync: Date; remoteSha: string }
  | { state: 'changed'; lastSync: Date; remoteSha: string }
  | { state: 'not-synced' }
  | { state: 'error'; message: string };
```

### PluginSettings
```typescript
interface PluginSettings {
  sourceFolder: string;      // Default: "publish"
  githubToken: string;       // PAT with repo access
  githubOwner: string;       // e.g., "benjaminshafii"
  githubRepo: string;        // e.g., "cool-website"
  targetPath: string;        // e.g., "apps/blog/src/content/blog"
  branch: string;            // Default: "master"
  syncedNotes: Record<string, {  // Persisted sync state
    remoteSha: string;
    contentHash: string;
    lastSync: string;
  }>;
}
```

## UI Components

### 1. Sync Status View (Leaf View)

A dedicated view panel showing all publishable notes:

```
┌─────────────────────────────────────────────┐
│  Website Sync                    [⟳ Sync All]│
├─────────────────────────────────────────────┤
│  ● My First Post                    [Synced]│
│    /publish/my-first-post.md                │
│    Last sync: 2 hours ago                   │
├─────────────────────────────────────────────┤
│  ◐ Updated Post                   [Changed] │
│    /publish/updated-post.md        [Sync ↑] │
│    Local changes detected                   │
├─────────────────────────────────────────────┤
│  ○ New Draft                   [Not Synced] │
│    /publish/new-draft.md      [Publish ↑]   │
│                                             │
├─────────────────────────────────────────────┤
│  ● Old Post                        [Synced] │
│    /publish/old-post.md        [Unpublish]  │
│    Last sync: 3 days ago                    │
└─────────────────────────────────────────────┘
```

**Status Icons:**
- `●` Green circle = Synced, no changes
- `◐` Yellow half-circle = Synced but local changes
- `○` Empty circle = Not synced to website
- `✕` Red X = Error state

**Actions:**
- `Sync ↑` - Push local changes to GitHub
- `Publish ↑` - First-time publish
- `Unpublish` - Remove from website (keeps local)
- `⟳ Sync All` - Sync all changed notes

### 2. Settings Tab

Native Obsidian settings interface:

```
┌─────────────────────────────────────────────┐
│  Website Sync Settings                      │
├─────────────────────────────────────────────┤
│  Source Folder                              │
│  [publish                              ]    │
│  Folder containing notes to sync            │
├─────────────────────────────────────────────┤
│  GitHub Token                               │
│  [ghp_xxxx...                    ] [Test]   │
│  Personal access token with repo scope      │
├─────────────────────────────────────────────┤
│  Repository                                 │
│  Owner: [benjaminshafii            ]        │
│  Repo:  [cool-website              ]        │
│  Branch: [master                   ]        │
├─────────────────────────────────────────────┤
│  Target Path                                │
│  [apps/blog/src/content/blog       ]        │
│  Path in repo where posts are stored        │
└─────────────────────────────────────────────┘
```

### 3. Status Bar Item

Quick glance sync status:

```
[● 5 synced | ◐ 2 changed | ○ 1 new]
```

Clicking opens the Sync Status View.

## TDD Test Cases

### GitHub Service Tests

```typescript
describe('GitHubService', () => {
  describe('getFile', () => {
    it('returns file content and sha when file exists', async () => {});
    it('returns null when file does not exist', async () => {});
    it('throws on API error', async () => {});
  });
  
  describe('createOrUpdateFile', () => {
    it('creates new file when sha is not provided', async () => {});
    it('updates existing file when sha is provided', async () => {});
    it('throws on conflict (sha mismatch)', async () => {});
  });
  
  describe('deleteFile', () => {
    it('deletes file with correct sha', async () => {});
    it('throws when file does not exist', async () => {});
  });
  
  describe('listFiles', () => {
    it('returns list of files in directory', async () => {});
    it('returns empty array for empty directory', async () => {});
  });
});
```

### Transformer Tests

```typescript
describe('ContentTransformer', () => {
  describe('transformWikiLinks', () => {
    it('converts [[Note]] to [Note](/blog/note)', () => {});
    it('converts [[Note|Display]] to [Display](/blog/note)', () => {});
    it('handles multiple wiki-links in one line', () => {});
    it('preserves code blocks unchanged', () => {});
  });
  
  describe('transformEmbeds', () => {
    it('removes note embeds ![[Note]]', () => {});
    it('converts image embeds to markdown images', () => {});
  });
  
  describe('transformCallouts', () => {
    it('converts > [!note] to blockquote', () => {});
    it('preserves callout content', () => {});
  });
  
  describe('generateSlug', () => {
    it('converts title to lowercase slug', () => {});
    it('replaces spaces with hyphens', () => {});
    it('removes special characters', () => {});
  });
  
  describe('computeContentHash', () => {
    it('returns consistent hash for same content', () => {});
    it('returns different hash for different content', () => {});
  });
});
```

### Sync Service Tests

```typescript
describe('SyncService', () => {
  describe('getPublishableNotes', () => {
    it('returns notes with publish: true frontmatter', async () => {});
    it('excludes notes with publish: false', async () => {});
    it('excludes notes outside source folder', async () => {});
  });
  
  describe('computeSyncStatus', () => {
    it('returns synced when hash matches remote', async () => {});
    it('returns changed when hash differs from remote', async () => {});
    it('returns not-synced when no remote record', async () => {});
  });
  
  describe('syncNote', () => {
    it('creates new file for not-synced note', async () => {});
    it('updates file for changed note', async () => {});
    it('skips synced notes', async () => {});
    it('updates local sync state on success', async () => {});
  });
  
  describe('unpublishNote', () => {
    it('deletes remote file', async () => {});
    it('removes from local sync state', async () => {});
    it('throws when note not synced', async () => {});
  });
  
  describe('syncAll', () => {
    it('syncs all changed and not-synced notes', async () => {});
    it('returns summary of sync results', async () => {});
  });
});
```

## Implementation Order

### Phase 1: Core Services (TDD)

1. **Types & Mocks**
   - Define all TypeScript interfaces
   - Create Obsidian API mock for testing

2. **GitHub Service**
   - Write tests first
   - Implement `getFile`, `createOrUpdateFile`, `deleteFile`, `listFiles`
   - Use native `fetch` (available in Obsidian)

3. **Content Transformer**
   - Write tests for each transformation
   - Implement wiki-link conversion
   - Implement embed handling
   - Implement slug generation
   - Implement content hashing

4. **Sync Service**
   - Write tests with mocked GitHub service
   - Implement note discovery
   - Implement sync status computation
   - Implement sync/unpublish operations

### Phase 2: UI Components

5. **Settings Tab**
   - Use native `PluginSettingTab`
   - Add validation for GitHub token
   - Test connection button

6. **Sync Status View**
   - Create custom `ItemView`
   - Render note list with status indicators
   - Add action buttons
   - Implement real-time updates

7. **Status Bar**
   - Add status bar item
   - Show sync summary
   - Click to open view

### Phase 3: Integration

8. **Main Plugin**
   - Wire up all services
   - Register commands
   - Add ribbon icon
   - Handle file change events

9. **Polish**
   - Error handling & notices
   - Loading states
   - Keyboard shortcuts
   - Mobile support

## File Change Detection

The plugin watches for file changes to update sync status:

```typescript
// Register events in onload()
this.registerEvent(
  this.app.vault.on('modify', (file) => {
    if (this.isPublishableNote(file)) {
      this.updateSyncStatus(file);
    }
  })
);

this.registerEvent(
  this.app.vault.on('rename', (file, oldPath) => {
    if (this.isPublishableNote(file)) {
      this.handleRename(file, oldPath);
    }
  })
);

this.registerEvent(
  this.app.vault.on('delete', (file) => {
    this.handleDelete(file);
  })
);
```

## Content Hash Strategy

To detect changes without storing full content:

```typescript
function computeContentHash(content: string): string {
  // Simple hash using Web Crypto API (available in Obsidian)
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  // Use SubtleCrypto for SHA-256
  return crypto.subtle.digest('SHA-256', data)
    .then(hash => Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join(''));
}
```

## Error Handling

All operations should provide clear feedback:

```typescript
try {
  await this.syncNote(note);
  new Notice(`✓ Published: ${note.title}`);
} catch (error) {
  if (error instanceof GitHubAuthError) {
    new Notice('⚠ GitHub authentication failed. Check your token.');
  } else if (error instanceof GitHubConflictError) {
    new Notice('⚠ Conflict detected. Remote was modified.');
  } else {
    new Notice(`✕ Sync failed: ${error.message}`);
  }
}
```

## Success Criteria

- [ ] All tests pass
- [ ] Can publish a note with one click
- [ ] Can unpublish a note with one click
- [ ] Sync status updates in real-time
- [ ] Wiki-links are converted correctly
- [ ] Settings persist across restarts
- [ ] Works on desktop and mobile
- [ ] Clear error messages for all failure modes
