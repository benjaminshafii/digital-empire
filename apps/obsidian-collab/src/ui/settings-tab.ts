import { App, Notice, PluginSettingTab, Setting } from "obsidian";
import type ObsidianCollabPlugin from "../main";

export class CollabSettingTab extends PluginSettingTab {
  plugin: ObsidianCollabPlugin;

  constructor(app: App, plugin: ObsidianCollabPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl("h2", { text: "Obsidian Collab" });

    new Setting(containerEl)
      .setName("Collab folder")
      .setDesc("Any markdown file under this folder is treated as collaborative")
      .addText((text) =>
        text
          .setPlaceholder("collab")
          .setValue(this.plugin.settings.collabFolder)
          .onChange(async (value) => {
            this.plugin.settings.collabFolder = value.trim();
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Collaboration server URL")
      .setDesc("WebSocket URL for the collaboration server")
      .addText((text) =>
        text
          .setPlaceholder("ws://127.0.0.1:1234")
          .setValue(this.plugin.settings.serverUrl)
          .onChange(async (value) => {
            this.plugin.settings.serverUrl = value.trim();
            await this.plugin.saveSettings();
          })
      )
      .addButton((button) =>
        button.setButtonText("Test").onClick(async () => {
          try {
            await this.plugin.testConnection();
            new Notice("Collab server reachable");
          } catch (error) {
            new Notice(`Test failed: ${error instanceof Error ? error.message : "Unknown error"}`);
          }
        })
      );

    new Setting(containerEl)
      .setName("Autosave")
      .setDesc("Write collaborative edits back to the vault")
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.autosave).onChange(async (value) => {
          this.plugin.settings.autosave = value;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName("Autosave debounce (ms)")
      .setDesc("How long to wait before writing changes back to disk")
      .addText((text) =>
        text
          .setPlaceholder("1500")
          .setValue(String(this.plugin.settings.autosaveDebounceMs))
          .onChange(async (value) => {
            const parsed = Number(value);
            if (!Number.isFinite(parsed) || parsed < 0) return;
            this.plugin.settings.autosaveDebounceMs = Math.floor(parsed);
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Persist locally")
      .setDesc("Store CRDT state locally (offline-safe) using IndexedDB")
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.persistLocally).onChange(async (value) => {
          this.plugin.settings.persistLocally = value;
          await this.plugin.saveSettings();
        })
      );
  }
}
