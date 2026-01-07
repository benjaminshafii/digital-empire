import { Notice, Plugin, TFile } from "obsidian";
import type { CollabSettings } from "./types";
import { DEFAULT_COLLAB_SETTINGS } from "./types";
import { CollabNoteView, COLLAB_VIEW_TYPE } from "./ui/collab-view";
import { CollabSettingTab } from "./ui/settings-tab";

export default class ObsidianCollabPlugin extends Plugin {
  settings: CollabSettings = DEFAULT_COLLAB_SETTINGS;

  async onload(): Promise<void> {
    await this.loadSettings();

    this.registerView(COLLAB_VIEW_TYPE, (leaf) => new CollabNoteView(leaf, this));
    this.addSettingTab(new CollabSettingTab(this.app, this));

    this.addCommand({
      id: "open-collab-view",
      name: "Open collaboration view (current file)",
      callback: async () => {
        await this.openCollabViewForActiveFile();
      },
    });

    // Folder-based auto behavior: opening a file under collab folder routes to collab view.
    this.registerEvent(
      this.app.workspace.on("active-leaf-change", async () => {
        const file = this.app.workspace.getActiveFile();
        if (!file || file.extension !== "md") return;

        const folderPrefix = this.settings.collabFolder.endsWith("/")
          ? this.settings.collabFolder
          : `${this.settings.collabFolder}/`;

        if (!file.path.startsWith(folderPrefix)) return;

        await this.openCollabView(file);
      })
    );
  }

  async loadSettings(): Promise<void> {
    const loadedData = await this.loadData();
    this.settings = Object.assign({}, DEFAULT_COLLAB_SETTINGS, loadedData);
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  async testConnection(): Promise<void> {
    const url = this.settings.serverUrl.replace(/^ws/, "http");
    const res = await fetch(`${url}/healthz`);
    if (!res.ok) {
      throw new Error(`healthz returned ${res.status}`);
    }
  }

  private async openCollabViewForActiveFile(): Promise<void> {
    const activeFile = this.app.workspace.getActiveFile();
    if (!activeFile) {
      new Notice("Please open a file first");
      return;
    }
    await this.openCollabView(activeFile);
  }

  private async openCollabView(file: TFile): Promise<void> {
    const { workspace } = this.app;

    const existing = workspace.getLeavesOfType(COLLAB_VIEW_TYPE);
    if (existing.length > 0) {
      await existing[0].setViewState({
        type: COLLAB_VIEW_TYPE,
        active: true,
        state: { filePath: file.path },
      });
      workspace.revealLeaf(existing[0]);
      return;
    }

    const leaf = workspace.getRightLeaf(false);
    if (leaf) {
      await leaf.setViewState({
        type: COLLAB_VIEW_TYPE,
        active: true,
        state: { filePath: file.path },
      });
      workspace.revealLeaf(leaf);
    }
  }
}
