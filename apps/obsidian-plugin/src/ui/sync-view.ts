/**
 * Sync Status View
 *
 * Shows all publishable notes and their sync status.
 * One button to sync - atomic, replaces entire remote folder.
 */

import { ItemView, WorkspaceLeaf, setIcon } from "obsidian";
import type WebsiteSyncPlugin from "../main";
import type { SyncableNote, SyncStatus } from "../types";

export const SYNC_VIEW_TYPE = "website-sync-view";

export class SyncStatusView extends ItemView {
  plugin: WebsiteSyncPlugin;
  notes: SyncableNote[] = [];
  isLoading = false;

  constructor(leaf: WorkspaceLeaf, plugin: WebsiteSyncPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType(): string {
    return SYNC_VIEW_TYPE;
  }

  getDisplayText(): string {
    return "Website Sync";
  }

  getIcon(): string {
    return "upload-cloud";
  }

  async onOpen(): Promise<void> {
    await this.refresh();
  }

  async onClose(): Promise<void> {}

  async refresh(): Promise<void> {
    if (!this.plugin.syncService) {
      this.renderError("Sync service not initialized");
      return;
    }

    this.isLoading = true;
    this.renderLoading();

    try {
      this.notes = await this.plugin.syncService.getPublishableNotes();
      this.render();
    } catch (error) {
      this.renderError(
        error instanceof Error ? error.message : "Failed to load notes"
      );
    } finally {
      this.isLoading = false;
    }
  }

  private render(): void {
    const container = this.containerEl.children[1];
    container.empty();

    const content = container.createEl("div", { cls: "sync-view-container" });

    this.renderHeader(content);

    if (this.notes.length === 0) {
      this.renderEmptyState(content);
    } else {
      this.renderNotesList(content);
    }

    this.addStyles();
  }

  private renderHeader(container: HTMLElement): void {
    const header = container.createEl("div", { cls: "sync-view-header" });

    const title = header.createEl("h4", { text: "Website Sync" });
    title.style.margin = "0";

    const actions = header.createEl("div", { cls: "sync-view-actions" });

    // Refresh button
    const refreshBtn = actions.createEl("button", {
      cls: "sync-view-btn",
      attr: { "aria-label": "Refresh" },
    });
    setIcon(refreshBtn, "refresh-cw");
    refreshBtn.addEventListener("click", () => this.refresh());

    // Single sync button
    const syncBtn = actions.createEl("button", {
      cls: "sync-view-btn sync-view-btn-primary",
      text: "Sync",
    });
    syncBtn.addEventListener("click", () => this.sync());
  }

  private renderEmptyState(container: HTMLElement): void {
    const empty = container.createEl("div", { cls: "sync-view-empty" });
    empty.createEl("p", {
      text: `No publishable notes found in "${this.plugin.settings.sourceFolder}" folder.`,
    });
    empty.createEl("p", {
      text: 'Add "publish: true" to a note\'s frontmatter to sync it.',
      cls: "sync-view-hint",
    });
  }

  private renderNotesList(container: HTMLElement): void {
    const list = container.createEl("div", { cls: "sync-view-list" });

    // Group by status
    const synced = this.notes.filter((n) => n.syncStatus.state === "synced");
    const changed = this.notes.filter((n) => n.syncStatus.state === "changed");
    const notSynced = this.notes.filter((n) => n.syncStatus.state === "not-synced");
    const errors = this.notes.filter((n) => n.syncStatus.state === "error");

    if (errors.length > 0) {
      this.renderSection(list, "Errors", errors, "error");
    }
    if (notSynced.length > 0) {
      this.renderSection(list, "Not Synced", notSynced, "not-synced");
    }
    if (changed.length > 0) {
      this.renderSection(list, "Changed", changed, "changed");
    }
    if (synced.length > 0) {
      this.renderSection(list, "Synced", synced, "synced");
    }
  }

  private renderSection(
    container: HTMLElement,
    title: string,
    notes: SyncableNote[],
    statusClass: string
  ): void {
    const section = container.createEl("div", { cls: "sync-view-section" });

    const header = section.createEl("div", { cls: "sync-view-section-header" });
    header.createEl("span", { text: title });
    header.createEl("span", {
      text: `(${notes.length})`,
      cls: "sync-view-count",
    });

    for (const note of notes) {
      this.renderNoteItem(section, note, statusClass);
    }
  }

  private renderNoteItem(
    container: HTMLElement,
    note: SyncableNote,
    statusClass: string
  ): void {
    const item = container.createEl("div", {
      cls: `sync-view-item sync-view-item-${statusClass}`,
    });

    // Status indicator
    const indicator = item.createEl("span", {
      cls: `sync-view-indicator sync-view-indicator-${statusClass}`,
    });
    indicator.textContent = this.getStatusIcon(note.syncStatus);

    // Note info
    const info = item.createEl("div", { cls: "sync-view-item-info" });
    const titleEl = info.createEl("div", {
      cls: "sync-view-item-title",
      text: note.title,
    });
    titleEl.addEventListener("click", () => this.openNote(note));

    info.createEl("div", {
      cls: "sync-view-item-path",
      text: note.path,
    });

    info.createEl("div", {
      cls: "sync-view-item-status",
      text: this.getStatusText(note.syncStatus),
    });
  }

  private getStatusIcon(status: SyncStatus): string {
    switch (status.state) {
      case "synced":
        return "●";
      case "changed":
        return "◐";
      case "not-synced":
        return "○";
      case "error":
        return "✕";
    }
  }

  private getStatusText(status: SyncStatus): string {
    switch (status.state) {
      case "synced":
        return `Last sync: ${this.formatDate(status.lastSync)}`;
      case "changed":
        return "Local changes detected";
      case "not-synced":
        return "Not published yet";
      case "error":
        return `Error: ${status.message}`;
    }
  }

  private formatDate(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  }

  private renderLoading(): void {
    const container = this.containerEl.children[1];
    container.empty();
    container.createEl("div", {
      cls: "sync-view-loading",
      text: "Loading notes...",
    });
  }

  private renderError(message: string): void {
    const container = this.containerEl.children[1];
    container.empty();
    const error = container.createEl("div", { cls: "sync-view-error" });
    error.createEl("p", { text: message });
  }

  private async openNote(note: SyncableNote): Promise<void> {
    const file = this.app.vault.getAbstractFileByPath(note.path);
    if (file) {
      await this.app.workspace.getLeaf().openFile(file as any);
    }
  }

  /**
   * Sync all notes atomically.
   * Remote folder will contain EXACTLY these notes after sync.
   */
  private async sync(): Promise<void> {
    if (!this.plugin.syncService) return;

    this.isLoading = true;
    this.renderSyncingState();

    try {
      const result = await this.plugin.syncService.sync();

      this.plugin.settings.syncedNotes = this.plugin.syncService.getSyncedNotes();
      await this.plugin.saveSettings();

      // Log warnings
      if (result.warnings.length > 0) {
        console.warn("[Sync] Warnings:", result.warnings);
      }

      console.log(
        `[Sync] Complete: ${result.synced} synced, ${result.failed} failed`
      );

      // Show result with warnings if any
      if (result.failed > 0) {
        const failedNotes = result.results.filter(r => !r.success);
        const errorMessages = failedNotes.map(r => r.error).join("\n");
        this.renderSyncResult(
          `Sync failed for ${result.failed} note(s)`,
          errorMessages,
          "error"
        );
        return;
      }

      await this.refresh();
    } catch (error) {
      console.error("Sync error:", error);
      this.renderError(error instanceof Error ? error.message : "Sync failed");
    }
  }

  private renderSyncResult(title: string, details: string, type: "error" | "warning"): void {
    const container = this.containerEl.children[1];
    container.empty();
    
    const resultEl = container.createEl("div", { cls: `sync-view-${type}` });
    resultEl.createEl("p", { text: title });
    
    if (details) {
      const detailsEl = resultEl.createEl("pre", { cls: "sync-view-details" });
      detailsEl.textContent = details;
    }

    const retryBtn = resultEl.createEl("button", {
      cls: "sync-view-btn",
      text: "Back to list",
    });
    retryBtn.addEventListener("click", () => this.refresh());
  }

  private renderSyncingState(): void {
    const container = this.containerEl.children[1];
    container.empty();
    const syncingEl = container.createEl("div", { cls: "sync-view-loading" });
    syncingEl.createEl("div", { text: `Syncing ${this.notes.length} notes...` });
    syncingEl.createEl("div", {
      text: "Creating atomic commit...",
      cls: "sync-view-hint",
    });
  }

  private addStyles(): void {
    const styleId = "sync-view-styles";
    if (document.getElementById(styleId)) return;

    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      .sync-view-container {
        padding: 10px;
      }
      
      .sync-view-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 15px;
        padding-bottom: 10px;
        border-bottom: 1px solid var(--background-modifier-border);
      }
      
      .sync-view-actions {
        display: flex;
        gap: 5px;
      }
      
      .sync-view-btn {
        padding: 5px 10px;
        border-radius: 4px;
        border: 1px solid var(--background-modifier-border);
        background: var(--background-secondary);
        cursor: pointer;
        font-size: 12px;
      }
      
      .sync-view-btn:hover {
        background: var(--background-modifier-hover);
      }
      
      .sync-view-btn-primary {
        background: var(--interactive-accent);
        color: var(--text-on-accent);
        border: none;
      }
      
      .sync-view-btn-primary:hover {
        background: var(--interactive-accent-hover);
      }
      
      .sync-view-btn-small {
        padding: 2px 8px;
        font-size: 11px;
      }
      
      .sync-view-empty {
        text-align: center;
        color: var(--text-muted);
        padding: 20px;
      }
      
      .sync-view-hint {
        font-size: 12px;
        opacity: 0.8;
      }
      
      .sync-view-section {
        margin-bottom: 15px;
      }
      
      .sync-view-section-header {
        font-weight: 600;
        margin-bottom: 8px;
        display: flex;
        gap: 5px;
      }
      
      .sync-view-count {
        color: var(--text-muted);
        font-weight: normal;
      }
      
      .sync-view-item {
        display: flex;
        align-items: flex-start;
        padding: 8px;
        margin-bottom: 5px;
        border-radius: 5px;
        background: var(--background-secondary);
      }
      
      .sync-view-indicator {
        font-size: 14px;
        margin-right: 10px;
        margin-top: 2px;
      }
      
      .sync-view-indicator-synced { color: var(--color-green); }
      .sync-view-indicator-changed { color: var(--color-yellow); }
      .sync-view-indicator-not-synced { color: var(--text-muted); }
      .sync-view-indicator-error { color: var(--color-red); }
      
      .sync-view-item-info {
        flex: 1;
        min-width: 0;
      }
      
      .sync-view-item-title {
        font-weight: 500;
        cursor: pointer;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      
      .sync-view-item-title:hover {
        color: var(--text-accent);
      }
      
      .sync-view-item-path {
        font-size: 11px;
        color: var(--text-muted);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      
      .sync-view-item-status {
        font-size: 11px;
        color: var(--text-muted);
      }
      
      .sync-view-loading,
      .sync-view-error,
      .sync-view-warning {
        text-align: center;
        padding: 20px;
        color: var(--text-muted);
      }
      
      .sync-view-error {
        color: var(--text-error);
      }
      
      .sync-view-warning {
        color: var(--color-orange);
      }
      
      .sync-view-details {
        text-align: left;
        font-size: 11px;
        background: var(--background-secondary);
        padding: 10px;
        border-radius: 4px;
        overflow-x: auto;
        white-space: pre-wrap;
        word-break: break-word;
      }
    `;
    document.head.appendChild(style);
  }
}
