// Sync status for each note
export type SyncStatus =
  | { state: "synced"; lastSync: Date; remoteSha: string }
  | { state: "changed"; lastSync: Date; remoteSha: string }
  | { state: "not-synced" }
  | { state: "error"; message: string };

// Frontmatter expected in publishable notes
export interface NoteFrontmatter {
  title?: string;
  date?: string;
  tags?: string[];
  publish?: boolean;
  draft?: boolean;
}

// A note that can be synced to the website
export interface SyncableNote {
  path: string; // Vault path: "publish/my-post.md"
  title: string; // From frontmatter or filename
  slug: string; // URL slug: "my-post"
  frontmatter: NoteFrontmatter;
  content: string; // Raw markdown content
  contentHash: string; // SHA-256 hash for change detection
  syncStatus: SyncStatus;
}

// Persisted sync state for a single note
export interface PersistedSyncState {
  remoteSha: string;
  contentHash: string;
  lastSync: string; // ISO date string
  slug: string; // Track slug to detect title/slug changes
}

// Plugin settings
export interface PluginSettings {
  sourceFolder: string; // Default: "publish"
  githubToken: string; // PAT with repo access
  githubOwner: string; // e.g., "benjaminshafii"
  githubRepo: string; // e.g., "digital-empire"
  targetPath: string; // e.g., "apps/blog/src/content/blog"
  branch: string; // Default: "main"
  syncedNotes: Record<string, PersistedSyncState>;
}

// Default settings
export const DEFAULT_SETTINGS: PluginSettings = {
  sourceFolder: "publish",
  githubToken: "",
  githubOwner: "",
  githubRepo: "",
  targetPath: "apps/blog/src/content/blog",
  branch: "main",
  syncedNotes: {},
};

// GitHub API response types
export interface GitHubFileResponse {
  sha: string;
  content: string; // Base64 encoded
  encoding: string;
  name: string;
  path: string;
}

export interface GitHubCreateUpdateResponse {
  content: {
    sha: string;
    path: string;
  };
  commit: {
    sha: string;
  };
}

export interface GitHubTreeItem {
  path: string;
  type: "blob" | "tree";
  sha: string;
}

// Git Tree API types for atomic commits
export interface GitHubRefResponse {
  ref: string;
  object: {
    sha: string;
    type: string;
  };
}

export interface GitHubCommitResponse {
  sha: string;
  tree: {
    sha: string;
  };
}

export interface GitHubBlobResponse {
  sha: string;
}

export interface GitHubTreeResponse {
  sha: string;
  tree: GitHubTreeItem[];
}

export interface GitHubCreateTreeItem {
  path: string;
  mode: "100644" | "100755" | "040000" | "160000" | "120000";
  type: "blob" | "tree" | "commit";
  sha?: string;
  content?: string;
}

export interface GitHubCreateCommitResponse {
  sha: string;
}

// Custom errors
export class GitHubAuthError extends Error {
  constructor(message: string = "GitHub authentication failed") {
    super(message);
    this.name = "GitHubAuthError";
  }
}

export class GitHubNotFoundError extends Error {
  constructor(path: string) {
    super(`File not found: ${path}`);
    this.name = "GitHubNotFoundError";
  }
}

export class GitHubConflictError extends Error {
  constructor(message: string = "Conflict: remote file was modified") {
    super(message);
    this.name = "GitHubConflictError";
  }
}
