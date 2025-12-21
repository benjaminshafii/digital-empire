/**
 * Sync Service
 *
 * Orchestrates syncing of notes between Obsidian and GitHub.
 * Uses atomic Git Tree API to ensure the remote folder exactly matches local publishable notes.
 */

import { TFile, type App } from "obsidian";
import type {
  SyncableNote,
  SyncStatus,
  PluginSettings,
  PersistedSyncState,
  NoteFrontmatter,
} from "../types";
import { GitHubService } from "./github";
import {
  transformContent,
  computeContentHash,
  extractFrontmatter,
  generateSlug,
  getTitle,
} from "./transformer";

export interface SyncResult {
  success: boolean;
  note: SyncableNote;
  error?: string;
}

export interface SyncSummary {
  synced: number;
  failed: number;
  results: SyncResult[];
  warnings: string[];
}

export interface NoteValidation {
  valid: boolean;
  warnings: string[];
  errors: string[];
}

export class SyncService {
  private app: App;
  private settings: PluginSettings;
  private github: GitHubService;

  constructor(app: App, settings: PluginSettings) {
    this.app = app;
    this.settings = settings;
    this.github = new GitHubService({
      token: settings.githubToken,
      owner: settings.githubOwner,
      repo: settings.githubRepo,
      branch: settings.branch,
    });
  }

  /**
   * Update settings (e.g., when user changes them)
   */
  updateSettings(settings: PluginSettings): void {
    this.settings = settings;
    this.github = new GitHubService({
      token: settings.githubToken,
      owner: settings.githubOwner,
      repo: settings.githubRepo,
      branch: settings.branch,
    });
  }

  /**
   * Get all notes that are eligible for publishing
   * (notes in source folder with publish: true frontmatter)
   */
  async getPublishableNotes(): Promise<SyncableNote[]> {
    const sourceFolder = this.settings.sourceFolder;
    const notes: SyncableNote[] = [];

    // Get all markdown files in the source folder
    const files = this.app.vault.getMarkdownFiles().filter((file) => {
      return file.path.startsWith(sourceFolder + "/") || file.path === sourceFolder;
    });

    for (const file of files) {
      const note = await this.fileToSyncableNote(file);
      if (note && note.frontmatter.publish === true) {
        notes.push(note);
      }
    }

    return notes;
  }

  /**
   * Convert a TFile to a SyncableNote with computed status
   */
  async fileToSyncableNote(file: TFile): Promise<SyncableNote | null> {
    try {
      const rawContent = await this.app.vault.read(file);
      const { frontmatter, content } = extractFrontmatter(rawContent);

      const filename = file.basename;
      const slug = generateSlug(frontmatter.title as string || filename);
      const title = getTitle(frontmatter as Record<string, unknown>, filename);

      // Transform content for the blog
      const transformedContent = transformContent(content, "/blog", "assets", slug);

      // Compute hash of the transformed content (what would be synced)
      const fullContent = this.buildFinalContent(
        frontmatter as NoteFrontmatter,
        transformedContent,
        title
      );
      const contentHash = await computeContentHash(fullContent);

      // Determine sync status
      const syncStatus = this.computeSyncStatus(file.path, contentHash, slug);

      return {
        path: file.path,
        title,
        slug,
        frontmatter: frontmatter as NoteFrontmatter,
        content: transformedContent,
        contentHash,
        syncStatus,
      };
    } catch (error) {
      console.error(`Error processing file ${file.path}:`, error);
      return null;
    }
  }

  /**
   * Build the final content that will be pushed to GitHub
   */
  private buildFinalContent(
    frontmatter: NoteFrontmatter,
    content: string,
    title: string
  ): string {
    const fmLines: string[] = ["---"];

    // Always include title (use computed title if not in frontmatter)
    const titleToUse = frontmatter.title || title;
    fmLines.push(`title: "${titleToUse}"`);

    if (frontmatter.date) {
      fmLines.push(`date: "${frontmatter.date}"`);
    }
    if (frontmatter.tags && frontmatter.tags.length > 0) {
      fmLines.push(`tags: [${frontmatter.tags.map((t) => `"${t}"`).join(", ")}]`);
    }
    if (frontmatter.draft !== undefined) {
      fmLines.push(`draft: ${frontmatter.draft}`);
    }

    fmLines.push("---");
    fmLines.push("");

    return fmLines.join("\n") + content;
  }

  private extractEmbeddedImageLinkpaths(markdown: string): string[] {
    const codeBlockRegex = /```[\s\S]*?```|`[^`]+`/g;
    const codeBlocks: string[] = [];

    const contentWithPlaceholders = markdown.replace(codeBlockRegex, (match) => {
      codeBlocks.push(match);
      return `__CODE_BLOCK_${codeBlocks.length - 1}__`;
    });

    const embedRegex = /!\[\[([^\]]+)\]\]/g;
    const imageExtensions = /\.(png|jpg|jpeg|gif|svg|webp|bmp)$/i;

    const linkpaths: string[] = [];
    let match: RegExpExecArray | null;

    while ((match = embedRegex.exec(contentWithPlaceholders)) !== null) {
      const rawLinkpath = match[1].split("|")[0].trim();
      if (imageExtensions.test(rawLinkpath)) {
        linkpaths.push(rawLinkpath);
      }
    }

    return Array.from(new Set(linkpaths));
  }

  /**
   * Compute sync status by comparing local content hash with persisted state
   */
  private computeSyncStatus(path: string, contentHash: string, currentSlug: string): SyncStatus {
    const persisted = this.settings.syncedNotes[path];

    if (!persisted) {
      return { state: "not-synced" };
    }

    const slugChanged = persisted.slug && persisted.slug !== currentSlug;

    if (persisted.contentHash === contentHash && !slugChanged) {
      return {
        state: "synced",
        lastSync: new Date(persisted.lastSync),
        remoteSha: persisted.remoteSha,
      };
    }

    return {
      state: "changed",
      lastSync: new Date(persisted.lastSync),
      remoteSha: persisted.remoteSha,
    };
  }

/**
   * Validate a note before syncing
   */
  validateNote(note: SyncableNote): NoteValidation {
    const warnings: string[] = [];
    const errors: string[] = [];

    // Check for title
    if (!note.frontmatter.title && !note.title) {
      errors.push(`"${note.path}": Missing title (required for blog)`);
    }

    // Check for date
    if (!note.frontmatter.date) {
      warnings.push(`"${note.path}": Missing date`);
    }

    return {
      valid: errors.length === 0,
      warnings,
      errors,
    };
  }

  /**
   * Sync all publishable notes to GitHub.
   * Uses atomic Git Tree API - one commit replaces entire folder.
   * Remote folder will contain EXACTLY the local publishable notes.
   */
  async sync(): Promise<SyncSummary> {
    console.log("[Sync] Starting atomic sync...");

    const localNotes = await this.getPublishableNotes();
    console.log("[Sync] Found", localNotes.length, "publishable notes");

    if (localNotes.length === 0) {
      console.log("[Sync] No notes to sync");
      return { synced: 0, failed: 0, results: [], warnings: [] };
    }

    // Validate all notes first
    const allWarnings: string[] = [];
    const validNotes: SyncableNote[] = [];
    const results: SyncResult[] = [];

    for (const note of localNotes) {
      const validation = this.validateNote(note);
      allWarnings.push(...validation.warnings);

      if (!validation.valid) {
        // Add errors as failures
        for (const error of validation.errors) {
          console.error("[Sync] Validation error:", error);
        }
        note.syncStatus = { state: "error", message: validation.errors.join(", ") };
        results.push({ success: false, note, error: validation.errors.join(", ") });
      } else {
        validNotes.push(note);
      }
    }

    if (validNotes.length === 0) {
      console.log("[Sync] No valid notes to sync");
      return { synced: 0, failed: results.length, results, warnings: allWarnings };
    }

    // Build the complete file list (notes + assets)
    const files: Array<{ path: string; content: string | ArrayBuffer }> = [];

    for (const note of validNotes) {
      try {
        // Build final content for the note
        const finalContent = this.buildFinalContent(note.frontmatter, note.content, note.title);
        files.push({
          path: `${note.slug}.md`,
          content: finalContent,
        });

        // Collect embedded images
        const assets = await this.collectEmbeddedAssets(note);
        for (const asset of assets) {
          files.push({
            path: `assets/${note.slug}/${asset.name}`,
            content: asset.content,
          });
        }

        results.push({ success: true, note });
      } catch (error) {
        console.error("[Sync] Failed to process note:", note.path, error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        note.syncStatus = { state: "error", message: errorMessage };
        results.push({ success: false, note, error: errorMessage });
      }
    }

    const successfulNotes = results.filter(r => r.success);
    const failedNotes = results.filter(r => !r.success);

    if (successfulNotes.length === 0) {
      console.log("[Sync] All notes failed to process");
      return { synced: 0, failed: failedNotes.length, results, warnings: allWarnings };
    }

    const message = `Sync: ${successfulNotes.length} posts`;

    try {
      console.log("[Sync] Pushing", files.length, "files atomically...");
      const { commitSha } = await this.github.atomicSync(
        this.settings.targetPath,
        files,
        message
      );
      console.log("[Sync] Commit created:", commitSha);

      // Update persisted state for all successful notes
      const now = new Date().toISOString();
      for (const result of successfulNotes) {
        const note = result.note;
        this.settings.syncedNotes[note.path] = {
          remoteSha: commitSha,
          contentHash: note.contentHash,
          lastSync: now,
          slug: note.slug,
        };
        note.syncStatus = {
          state: "synced",
          lastSync: new Date(),
          remoteSha: commitSha,
        };
      }

      // Clean up syncedNotes for notes that no longer exist
      const validPaths = new Set(localNotes.map(n => n.path));
      for (const path of Object.keys(this.settings.syncedNotes)) {
        if (!validPaths.has(path)) {
          delete this.settings.syncedNotes[path];
        }
      }

      console.log("[Sync] Complete!");
      return { synced: successfulNotes.length, failed: failedNotes.length, results, warnings: allWarnings };
    } catch (error) {
      console.error("[Sync] Atomic sync failed:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      
      for (const result of results) {
        if (result.success) {
          result.success = false;
          result.error = errorMessage;
          result.note.syncStatus = { state: "error", message: errorMessage };
        }
      }

      return { synced: 0, failed: results.length, results, warnings: allWarnings };
    }
  }

  /**
   * Collect all embedded image assets for a note
   */
  private async collectEmbeddedAssets(
    note: SyncableNote
  ): Promise<Array<{ name: string; content: ArrayBuffer }>> {
    const sourceFile = this.app.vault.getAbstractFileByPath(note.path);
    if (!(sourceFile instanceof TFile)) {
      return [];
    }

    const rawMarkdown = await this.app.vault.read(sourceFile);
    const { content } = extractFrontmatter(rawMarkdown);
    const embeddedImages = this.extractEmbeddedImageLinkpaths(content);

    const assets: Array<{ name: string; content: ArrayBuffer }> = [];

    for (const linkpath of embeddedImages) {
      const resolved = this.app.metadataCache.getFirstLinkpathDest(linkpath, note.path);
      if (!(resolved instanceof TFile)) {
        continue;
      }

      const binary = await this.app.vault.readBinary(resolved);
      assets.push({
        name: resolved.name,
        content: binary,
      });
    }

    return assets;
  }

  /**
   * Get the persisted sync state (for saving)
   */
  getSyncedNotes(): Record<string, PersistedSyncState> {
    return this.settings.syncedNotes;
  }

  /**
   * Test the GitHub connection
   */
  async testConnection(): Promise<boolean> {
    return this.github.testConnection();
  }
}
