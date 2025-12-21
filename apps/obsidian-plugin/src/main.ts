/**
 * Website Sync Plugin
 *
 * An Obsidian plugin that syncs markdown notes to your website via GitHub.
 * Uses atomic sync - one button, one commit, folder matches exactly what's in Obsidian.
 */

import { Plugin, Notice, TFile, Menu } from "obsidian";
import type { PluginSettings } from "./types";
import { DEFAULT_SETTINGS } from "./types";
import { SyncService } from "./services/sync";
import { WebsiteSyncSettingTab } from "./ui/settings-tab";
import { SyncStatusView, SYNC_VIEW_TYPE } from "./ui/sync-view";
import { StatusBarManager } from "./ui/status-bar";
import { generateSlug } from "./services/transformer";

export default class WebsiteSyncPlugin extends Plugin {
  settings: PluginSettings = DEFAULT_SETTINGS;
  syncService: SyncService | null = null;
  statusBarManager: StatusBarManager | null = null;

  async onload(): Promise<void> {
    console.log("Loading Website Sync plugin");

    await this.loadSettings();
    this.initSyncService();

    this.registerView(SYNC_VIEW_TYPE, (leaf) => new SyncStatusView(leaf, this));
    this.addSettingTab(new WebsiteSyncSettingTab(this.app, this));

    const statusBarEl = this.addStatusBarItem();
    this.statusBarManager = new StatusBarManager(this, statusBarEl);

    // Ribbon icon - sync all
    this.addRibbonIcon("upload-cloud", "Sync to website", async () => {
      await this.syncNotes();
    });

    // Command: sync all notes
    this.addCommand({
      id: "sync-notes",
      name: "Sync all publishable notes",
      callback: async () => {
        await this.syncNotes();
      },
    });

    // Command: open sync view
    this.addCommand({
      id: "open-sync-view",
      name: "Open sync status panel",
      callback: async () => {
        await this.openSyncView();
      },
    });

    // Command: quick publish current note
    this.addCommand({
      id: "quick-publish",
      name: "Quick Publish: Add frontmatter, move to folder, and sync",
      callback: async () => {
        await this.quickPublish();
      },
    });

    // File menu: quick publish
    this.registerEvent(
      this.app.workspace.on("file-menu", (menu: Menu, file: TFile) => {
        if (file instanceof TFile && file.extension === "md") {
          menu.addItem((item) => {
            item
              .setTitle("Quick Publish to Website")
              .setIcon("upload-cloud")
              .onClick(async () => {
                await this.quickPublish(file);
              });
          });
        }
      })
    );

    // Update status bar on file changes
    this.registerEvent(
      this.app.vault.on("modify", () => {
        this.statusBarManager?.update();
      })
    );
  }

  onunload(): void {
    console.log("Unloading Website Sync plugin");
    this.statusBarManager?.destroy();
  }

  initSyncService(): void {
    this.syncService = new SyncService(this.app, this.settings);
  }

  async loadSettings(): Promise<void> {
    const loadedData = await this.loadData();
    this.settings = Object.assign({}, DEFAULT_SETTINGS, loadedData);
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
    this.initSyncService();
  }

  /**
   * Sync all publishable notes atomically.
   * One commit replaces entire remote folder.
   */
  async syncNotes(): Promise<void> {
    if (!this.syncService) {
      new Notice("Sync service not initialized");
      return;
    }

    if (!this.settings.githubToken) {
      new Notice("Please configure your GitHub settings first");
      return;
    }

    new Notice("Starting sync...");

    try {
      const summary = await this.syncService.sync();

      this.settings.syncedNotes = this.syncService.getSyncedNotes();
      await this.saveSettings();

      this.statusBarManager?.update();
      this.refreshSyncView();

      // Show warnings
      if (summary.warnings.length > 0) {
        for (const warning of summary.warnings) {
          new Notice(`Warning: ${warning}`, 5000);
        }
      }

      if (summary.failed > 0) {
        const failedNotes = summary.results.filter(r => !r.success);
        const errorMsg = failedNotes.map(r => r.error).join(", ");
        new Notice(`Sync failed: ${errorMsg}`, 10000);
      } else if (summary.synced > 0) {
        new Notice(`Synced ${summary.synced} notes`);
      } else {
        new Notice("No notes to sync");
      }
    } catch (error) {
      console.error("Sync error:", error);
      new Notice(`Sync failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  refreshSyncView(): void {
    const leaves = this.app.workspace.getLeavesOfType(SYNC_VIEW_TYPE);
    for (const leaf of leaves) {
      const view = leaf.view;
      if (view instanceof SyncStatusView) {
        view.refresh();
      }
    }
  }

  async openSyncView(): Promise<void> {
    const { workspace } = this.app;

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

  /**
   * Quick Publish: Add frontmatter, move to publish folder, then sync all.
   */
  async quickPublish(file?: TFile): Promise<void> {
    if (!this.syncService) {
      new Notice("Sync service not initialized");
      return;
    }

    if (!this.settings.githubToken) {
      new Notice("Please configure your GitHub settings first");
      return;
    }

    const targetFile = file || this.app.workspace.getActiveFile();
    if (!targetFile) {
      new Notice("No file selected");
      return;
    }

    if (targetFile.extension !== "md") {
      new Notice("Can only publish markdown files");
      return;
    }

    try {
      let content = await this.app.vault.read(targetFile);
      const hasFrontmatter = content.trimStart().startsWith("---");
      const today = new Date().toISOString().split("T")[0];

      const titleFromFilename = targetFile.basename
        .replace(/-/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());

      if (!hasFrontmatter) {
        const frontmatter = `---
title: "${titleFromFilename}"
date: "${today}"
publish: true
---

`;
        content = frontmatter + content;
        await this.app.vault.modify(targetFile, content);
        new Notice("Added frontmatter");
      } else {
        // Update existing frontmatter
        const frontmatterRegex = /^---\n([\s\S]*?)\n---/;
        const match = content.match(frontmatterRegex);

        if (match) {
          let fm = match[1];

          if (!/^publish:\s*true/m.test(fm)) {
            if (/^publish:/m.test(fm)) {
              fm = fm.replace(/^publish:.*$/m, "publish: true");
            } else {
              fm += "\npublish: true";
            }
          }

          if (!/^date:/m.test(fm)) {
            fm += `\ndate: "${today}"`;
          }

          if (!/^title:/m.test(fm)) {
            fm = `title: "${titleFromFilename}"\n` + fm;
          }

          content = content.replace(frontmatterRegex, `---\n${fm}\n---`);
          await this.app.vault.modify(targetFile, content);
        }
      }

      // Move to publish folder if needed
      const sourceFolder = this.settings.sourceFolder;

      if (!targetFile.path.startsWith(sourceFolder + "/")) {
        const folderExists = this.app.vault.getAbstractFileByPath(sourceFolder);
        if (!folderExists) {
          await this.app.vault.createFolder(sourceFolder);
        }

        const slug = generateSlug(titleFromFilename);
        const newPath = `${sourceFolder}/${slug}.md`;

        if (this.app.vault.getAbstractFileByPath(newPath)) {
          new Notice(`File already exists at ${newPath}`);
          return;
        }

        await this.app.fileManager.renameFile(targetFile, newPath);
        new Notice(`Moved to ${newPath}`);
      }

      // Now sync everything
      await this.syncNotes();
    } catch (error) {
      console.error("Quick publish error:", error);
      new Notice(`Quick publish failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }
}
