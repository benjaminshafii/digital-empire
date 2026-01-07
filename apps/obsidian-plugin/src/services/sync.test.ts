import { describe, it, expect, vi, beforeEach } from "vitest";
import { SyncService } from "./sync";
import type { PluginSettings, SyncableNote, NoteFrontmatter } from "../types";
import { TFile } from "obsidian";

// Mock the GitHubService
vi.mock("./github", () => ({
  GitHubService: vi.fn().mockImplementation(() => ({
    atomicSync: vi.fn().mockResolvedValue({ commitSha: "newcommitsha" }),
    testConnection: vi.fn().mockResolvedValue(true),
  })),
}));

// Mock TFile
const mockTFile = {
  path: "publish/test-post.md",
  basename: "test-post",
};

// Mock App
const createMockApp = (files: any[] = [], fileContents: Record<string, string> = {}) => ({
  vault: {
    getMarkdownFiles: vi.fn().mockReturnValue(files),
    read: vi.fn().mockImplementation((file: any) => {
      return Promise.resolve(fileContents[file.path] || "");
    }),
    readBinary: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
    getAbstractFileByPath: vi.fn().mockReturnValue(mockTFile),
  },
  metadataCache: {
    getFirstLinkpathDest: vi.fn().mockReturnValue(null),
  },
});

const createMockSettings = (overrides: Partial<PluginSettings> = {}): PluginSettings => ({
  sourceFolder: "publish",
  githubToken: "test-token",
  githubOwner: "testowner",
  githubRepo: "testrepo",
  targetPath: "apps/blog/src/content/blog",
  branch: "main",
  syncedNotes: {},
  ...overrides,
});

describe("SyncService", () => {
  describe("getPublishableNotes", () => {
    it("returns only notes with publish: true", async () => {
      const files = [
        { path: "publish/post1.md", basename: "post1" },
        { path: "publish/post2.md", basename: "post2" },
        { path: "publish/draft.md", basename: "draft" },
      ];

      const fileContents: Record<string, string> = {
        "publish/post1.md": "---\ntitle: Post 1\npublish: true\n---\nContent 1",
        "publish/post2.md": "---\ntitle: Post 2\npublish: true\n---\nContent 2",
        "publish/draft.md": "---\ntitle: Draft\npublish: false\n---\nDraft content",
      };

      const app = createMockApp(files, fileContents);
      const settings = createMockSettings();
      const service = new SyncService(app as any, settings);

      const notes = await service.getPublishableNotes();

      expect(notes).toHaveLength(2);
      expect(notes[0].title).toBe("Post 1");
      expect(notes[1].title).toBe("Post 2");
    });

    it("returns empty array when no publishable notes exist", async () => {
      const files = [
        { path: "publish/draft.md", basename: "draft" },
      ];

      const fileContents: Record<string, string> = {
        "publish/draft.md": "---\ntitle: Draft\npublish: false\n---\nDraft content",
      };

      const app = createMockApp(files, fileContents);
      const settings = createMockSettings();
      const service = new SyncService(app as any, settings);

      const notes = await service.getPublishableNotes();

      expect(notes).toHaveLength(0);
    });
  });

  describe("sync", () => {
    it("calls atomicSync with all publishable notes", async () => {
      const files = [
        { path: "publish/post1.md", basename: "post1" },
        { path: "publish/post2.md", basename: "post2" },
      ];

      const fileContents: Record<string, string> = {
        "publish/post1.md": "---\ntitle: Post One\npublish: true\n---\nContent 1",
        "publish/post2.md": "---\ntitle: Post Two\npublish: true\n---\nContent 2",
      };

      const app = createMockApp(files, fileContents);
      const settings = createMockSettings();
      const service = new SyncService(app as any, settings);

      const result = await service.sync();

      expect(result.synced).toBe(2);
      expect(result.failed).toBe(0);
      expect(result.results).toHaveLength(2);
      expect(result.results.every(r => r.success)).toBe(true);
    });

    it("updates syncedNotes after successful sync", async () => {
      const files = [
        { path: "publish/post1.md", basename: "post1" },
      ];

      const fileContents: Record<string, string> = {
        "publish/post1.md": "---\ntitle: Post One\npublish: true\n---\nContent",
      };

      const app = createMockApp(files, fileContents);
      const settings = createMockSettings();
      const service = new SyncService(app as any, settings);

      await service.sync();

      const syncedNotes = service.getSyncedNotes();
      expect(Object.keys(syncedNotes)).toHaveLength(1);
      expect(syncedNotes["publish/post1.md"]).toBeDefined();
      expect(syncedNotes["publish/post1.md"].slug).toBe("post-one");
    });

    it("returns empty result when no notes to sync", async () => {
      const app = createMockApp([], {});
      const settings = createMockSettings();
      const service = new SyncService(app as any, settings);

      const result = await service.sync();

      expect(result.synced).toBe(0);
      expect(result.failed).toBe(0);
      expect(result.results).toHaveLength(0);
    });

    it("cleans up old syncedNotes entries for deleted notes", async () => {
      const files = [
        { path: "publish/post1.md", basename: "post1" },
      ];

      const fileContents: Record<string, string> = {
        "publish/post1.md": "---\ntitle: Post One\npublish: true\n---\nContent",
      };

      const app = createMockApp(files, fileContents);

      // Settings with an old note that no longer exists
      const settings = createMockSettings({
        syncedNotes: {
          "publish/old-post.md": {
            remoteSha: "oldsha",
            contentHash: "oldhash",
            lastSync: "2024-01-01T00:00:00Z",
            slug: "old-post",
          },
          "publish/post1.md": {
            remoteSha: "existingsha",
            contentHash: "existinghash",
            lastSync: "2024-01-01T00:00:00Z",
            slug: "post-one",
          },
        },
      });

      const service = new SyncService(app as any, settings);

      await service.sync();

      const syncedNotes = service.getSyncedNotes();

      // Old note should be removed
      expect(syncedNotes["publish/old-post.md"]).toBeUndefined();
      // Current note should still exist
      expect(syncedNotes["publish/post1.md"]).toBeDefined();
    });
  });

  describe("computeSyncStatus", () => {
    it("returns not-synced for new notes", async () => {
      const files = [
        { path: "publish/new-post.md", basename: "new-post" },
      ];

      const fileContents: Record<string, string> = {
        "publish/new-post.md": "---\ntitle: New Post\npublish: true\n---\nNew content",
      };

      const app = createMockApp(files, fileContents);
      const settings = createMockSettings();
      const service = new SyncService(app as any, settings);

      const notes = await service.getPublishableNotes();

      expect(notes[0].syncStatus.state).toBe("not-synced");
    });

    it("returns synced for unchanged notes", async () => {
      const files = [
        { path: "publish/synced-post.md", basename: "synced-post" },
      ];

      const content = "---\ntitle: Synced Post\npublish: true\n---\nContent";
      const fileContents: Record<string, string> = {
        "publish/synced-post.md": content,
      };

      const app = createMockApp(files, fileContents);

      // First sync to get the hash
      const initialSettings = createMockSettings();
      const initialService = new SyncService(app as any, initialSettings);
      const initialNotes = await initialService.getPublishableNotes();
      const contentHash = initialNotes[0].contentHash;

      // Now create service with matching hash in syncedNotes
      const settings = createMockSettings({
        syncedNotes: {
          "publish/synced-post.md": {
            remoteSha: "sha123",
            contentHash: contentHash,
            lastSync: "2024-01-01T00:00:00Z",
            slug: "synced-post",
          },
        },
      });

      const service = new SyncService(app as any, settings);
      const notes = await service.getPublishableNotes();

      expect(notes[0].syncStatus.state).toBe("synced");
    });

    it("returns changed when content differs", async () => {
      const files = [
        { path: "publish/changed-post.md", basename: "changed-post" },
      ];

      const fileContents: Record<string, string> = {
        "publish/changed-post.md": "---\ntitle: Changed Post\npublish: true\n---\nNew content",
      };

      const app = createMockApp(files, fileContents);
      const settings = createMockSettings({
        syncedNotes: {
          "publish/changed-post.md": {
            remoteSha: "sha123",
            contentHash: "different-hash",
            lastSync: "2024-01-01T00:00:00Z",
            slug: "changed-post",
          },
        },
      });

      const service = new SyncService(app as any, settings);
      const notes = await service.getPublishableNotes();

      expect(notes[0].syncStatus.state).toBe("changed");
    });

    it("returns changed when slug changes (title renamed)", async () => {
      const files = [
        { path: "publish/renamed-post.md", basename: "renamed-post" },
      ];

      const content = "---\ntitle: New Title\npublish: true\n---\nContent";
      const fileContents: Record<string, string> = {
        "publish/renamed-post.md": content,
      };

      const app = createMockApp(files, fileContents);

      // Get the actual hash
      const tempSettings = createMockSettings();
      const tempService = new SyncService(app as any, tempSettings);
      const tempNotes = await tempService.getPublishableNotes();
      const contentHash = tempNotes[0].contentHash;

      // Now test with old slug but matching hash
      const settings = createMockSettings({
        syncedNotes: {
          "publish/renamed-post.md": {
            remoteSha: "sha123",
            contentHash: contentHash,
            lastSync: "2024-01-01T00:00:00Z",
            slug: "old-title", // Different slug!
          },
        },
      });

      const service = new SyncService(app as any, settings);
      const notes = await service.getPublishableNotes();

      // Should be changed because slug differs
      expect(notes[0].syncStatus.state).toBe("changed");
    });
  });

  describe("buildFinalContent", () => {
    it("includes frontmatter in output", async () => {
      const files = [
        { path: "publish/post.md", basename: "post" },
      ];

      const fileContents: Record<string, string> = {
        "publish/post.md": "---\ntitle: My Post\ndate: 2024-01-15\ntags: [tech, blog]\npublish: true\n---\n\nHello world",
      };

      const app = createMockApp(files, fileContents);
      const settings = createMockSettings();
      const service = new SyncService(app as any, settings);

      const notes = await service.getPublishableNotes();
      const note = notes[0];

      expect(note.frontmatter.title).toBe("My Post");
      expect(note.frontmatter.date).toBe("2024-01-15");
      expect(note.frontmatter.tags).toEqual(["tech", "blog"]);
    });
  });
});
