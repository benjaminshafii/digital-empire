/**
 * Status Bar Item
 *
 * Shows sync status of the current document in the Obsidian status bar.
 * Clicking opens the Sync Status View.
 */

import { TFile } from "obsidian";
import type WebsiteSyncPlugin from "../main";
import type { SyncableNote } from "../types";
import { SYNC_VIEW_TYPE } from "./sync-view";

export class StatusBarManager {
  private plugin: WebsiteSyncPlugin;
  private statusBarEl: HTMLElement;
  private isUpdating = false;

  constructor(plugin: WebsiteSyncPlugin, statusBarEl: HTMLElement) {
    this.plugin = plugin;
    this.statusBarEl = statusBarEl;

    this.statusBarEl.addClass("mod-clickable");
    this.statusBarEl.addEventListener("click", () => this.openSyncView());
    this.statusBarEl.setAttribute("aria-label", "Open Website Sync panel");

    // Listen for active file changes
    this.plugin.registerEvent(
      this.plugin.app.workspace.on("active-leaf-change", () => this.update())
    );

    this.update();
  }

  /**
   * Update the status bar with current file's sync status
   */
  async update(): Promise<void> {
    if (this.isUpdating) return;
    this.isUpdating = true;

    try {
      if (!this.plugin.syncService) {
        this.statusBarEl.setText("Sync: Not configured");
        return;
      }

      if (!this.plugin.settings.githubToken) {
        this.statusBarEl.setText("Sync: Configure GitHub");
        return;
      }

      // Get current file
      const activeFile = this.plugin.app.workspace.getActiveFile();
      
      if (!activeFile || activeFile.extension !== "md") {
        // Show overall stats when not on a markdown file
        await this.showOverallStatus();
        return;
      }

      // Check if file is in publishable folder
      const sourceFolder = this.plugin.settings.sourceFolder;
      if (!activeFile.path.startsWith(sourceFolder + "/") && activeFile.path !== sourceFolder) {
        this.statusBarEl.setText("Sync: Not in publish folder");
        return;
      }

      // Get this specific note's status
      const note = await this.plugin.syncService.fileToSyncableNote(activeFile);
      
      if (!note) {
        this.statusBarEl.setText("Sync: Error reading file");
        return;
      }

      if (!note.frontmatter.publish) {
        this.statusBarEl.setText("Sync: Not published");
        return;
      }

      // Show current file's sync status
      this.renderCurrentFileStatus(note);
    } catch (error) {
      this.statusBarEl.setText("Sync: Error");
    } finally {
      this.isUpdating = false;
    }
  }

  /**
   * Show overall sync status (when not on a publishable file)
   */
  private async showOverallStatus(): Promise<void> {
    if (!this.plugin.syncService) return;

    const notes = await this.plugin.syncService.getPublishableNotes();
    const counts = this.countByStatus(notes);
    
    const total = counts.synced + counts.changed + counts.notSynced + counts.error;
    const pending = counts.changed + counts.notSynced;

    if (total === 0) {
      this.statusBarEl.setText("Sync: No posts");
    } else if (pending === 0) {
      this.statusBarEl.setText(`Sync: ● All synced (${total})`);
    } else {
      this.statusBarEl.setText(`Sync: ${pending} pending`);
    }
  }

  /**
   * Render status for the current file
   */
  private renderCurrentFileStatus(note: SyncableNote): void {
    const status = note.syncStatus.state;
    
    switch (status) {
      case "synced":
        this.statusBarEl.setText("Sync: ● Synced");
        this.statusBarEl.style.color = "var(--color-green)";
        break;
      case "changed":
        this.statusBarEl.setText("Sync: ◐ Changed");
        this.statusBarEl.style.color = "var(--color-yellow)";
        break;
      case "not-synced":
        this.statusBarEl.setText("Sync: ○ Not synced");
        this.statusBarEl.style.color = "var(--text-muted)";
        break;
      case "error":
        this.statusBarEl.setText(`Sync: ✕ Error`);
        this.statusBarEl.style.color = "var(--color-red)";
        break;
    }
  }

  private countByStatus(notes: SyncableNote[]): StatusCounts {
    const counts: StatusCounts = {
      synced: 0,
      changed: 0,
      notSynced: 0,
      error: 0,
    };

    for (const note of notes) {
      switch (note.syncStatus.state) {
        case "synced":
          counts.synced++;
          break;
        case "changed":
          counts.changed++;
          break;
        case "not-synced":
          counts.notSynced++;
          break;
        case "error":
          counts.error++;
          break;
      }
    }

    return counts;
  }

  private async openSyncView(): Promise<void> {
    const { workspace } = this.plugin.app;

    const existing = workspace.getLeavesOfType(SYNC_VIEW_TYPE);
    if (existing.length > 0) {
      workspace.revealLeaf(existing[0]);
      return;
    }

    const leaf = workspace.getRightLeaf(false);
    if (leaf) {
      await leaf.setViewState({
        type: SYNC_VIEW_TYPE,
        active: true,
      });
      workspace.revealLeaf(leaf);
    }
  }

  showSyncing(): void {
    this.statusBarEl.setText("Sync: Syncing...");
    this.statusBarEl.style.color = "";
  }

  destroy(): void {
    this.statusBarEl.remove();
  }
}

interface StatusCounts {
  synced: number;
  changed: number;
  notSynced: number;
  error: number;
}
