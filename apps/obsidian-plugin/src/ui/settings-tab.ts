/**
 * Settings Tab
 *
 * Configuration UI for the Website Sync plugin.
 */

import { App, PluginSettingTab, Setting, Notice } from "obsidian";
import type WebsiteSyncPlugin from "../main";
import { SyncService } from "../services/sync";

export class WebsiteSyncSettingTab extends PluginSettingTab {
  plugin: WebsiteSyncPlugin;

  constructor(app: App, plugin: WebsiteSyncPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl("h2", { text: "Website Sync Settings" });

    // Source Folder
    new Setting(containerEl)
      .setName("Source folder")
      .setDesc("Folder containing notes to sync (notes must have publish: true in frontmatter)")
      .addText((text) =>
        text
          .setPlaceholder("publish")
          .setValue(this.plugin.settings.sourceFolder)
          .onChange(async (value) => {
            this.plugin.settings.sourceFolder = value;
            await this.plugin.saveSettings();
          })
      )
      .addButton((button) =>
        button.setButtonText("Create folder").onClick(async () => {
          const folderPath = this.plugin.settings.sourceFolder;
          if (!folderPath) {
            new Notice("Please enter a folder name first.");
            return;
          }
          const folder = this.app.vault.getAbstractFileByPath(folderPath);
          if (folder) {
            new Notice(`Folder "${folderPath}" already exists.`);
            return;
          }
          try {
            await this.app.vault.createFolder(folderPath);
            new Notice(`Folder "${folderPath}" created successfully.`);
          } catch (error) {
            new Notice(`Failed to create folder: ${error instanceof Error ? error.message : "Unknown error"}`);
          }
        })
      );

    // GitHub Token
    new Setting(containerEl)
      .setName("GitHub token")
      .setDesc("Personal access token with repo scope")
      .addText((text) =>
        text
          .setPlaceholder("ghp_xxxx...")
          .setValue(this.plugin.settings.githubToken)
          .onChange(async (value) => {
            this.plugin.settings.githubToken = value;
            await this.plugin.saveSettings();
          })
      )
      .addButton((button) =>
        button.setButtonText("Test").onClick(async () => {
          const syncService = new SyncService(this.app, this.plugin.settings);
          const success = await syncService.testConnection();
          if (success) {
            new Notice("Connection successful!");
          } else {
            new Notice("Connection failed. Check your token and repository settings.");
          }
        })
      );

    // GitHub Owner
    new Setting(containerEl)
      .setName("GitHub owner")
      .setDesc("GitHub username or organization")
      .addText((text) =>
        text
          .setPlaceholder("username")
          .setValue(this.plugin.settings.githubOwner)
          .onChange(async (value) => {
            this.plugin.settings.githubOwner = value;
            await this.plugin.saveSettings();
          })
      );

    // GitHub Repo
    new Setting(containerEl)
      .setName("GitHub repository")
      .setDesc("Repository name")
      .addText((text) =>
        text
          .setPlaceholder("my-website")
          .setValue(this.plugin.settings.githubRepo)
          .onChange(async (value) => {
            this.plugin.settings.githubRepo = value;
            await this.plugin.saveSettings();
          })
      );

    // Branch
    new Setting(containerEl)
      .setName("Branch")
      .setDesc("Git branch to sync to")
      .addText((text) =>
        text
          .setPlaceholder("main")
          .setValue(this.plugin.settings.branch)
          .onChange(async (value) => {
            this.plugin.settings.branch = value;
            await this.plugin.saveSettings();
          })
      );

    // Target Path
    new Setting(containerEl)
      .setName("Target path")
      .setDesc("Path in repository where posts are stored")
      .addText((text) =>
        text
          .setPlaceholder("apps/blog/src/content/blog")
          .setValue(this.plugin.settings.targetPath)
          .onChange(async (value) => {
            this.plugin.settings.targetPath = value;
            await this.plugin.saveSettings();
          })
      );

    // Sync Status Section
    containerEl.createEl("h3", { text: "Sync Status" });

    const syncedCount = Object.keys(this.plugin.settings.syncedNotes).length;
    new Setting(containerEl)
      .setName("Synced notes")
      .setDesc(`${syncedCount} notes are currently synced`)
      .addButton((button) =>
        button.setButtonText("Clear sync state").onClick(async () => {
          this.plugin.settings.syncedNotes = {};
          await this.plugin.saveSettings();
          new Notice("Sync state cleared. All notes will be treated as new.");
          this.display(); // Refresh the display
        })
      );
  }
}
