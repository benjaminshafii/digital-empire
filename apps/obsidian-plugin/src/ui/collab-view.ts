import { ItemView, Notice, TFile, WorkspaceLeaf } from "obsidian";
import { EditorState } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { defaultKeymap, history, redo, undo } from "@codemirror/commands";
import { yCollab } from "y-codemirror.next";
import type WebsiteSyncPlugin from "../main";
import { CollabSession, createRoomNameFromPath } from "../services/collab";

export const COLLAB_VIEW_TYPE = "collab-note-view";

type CollabViewState = {
  filePath: string;
};

export class CollabNoteView extends ItemView {
  plugin: WebsiteSyncPlugin;
  filePath: string | null = null;

  getFilePath(): string | null {
    return this.filePath;
  }

  getCurrentText(): string | null {
    if (!this.session) return null;
    return this.session.text.toString();
  }

  private editorView: EditorView | null = null;
  private session: CollabSession | null = null;
  private saveTimer: number | null = null;
  private lastWrittenText: string = "";

  constructor(leaf: WorkspaceLeaf, plugin: WebsiteSyncPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType(): string {
    return COLLAB_VIEW_TYPE;
  }

  getDisplayText(): string {
    return "Collaboration";
  }

  getIcon(): string {
    return "users";
  }

  async applyState(state: CollabViewState): Promise<void> {
    this.filePath = state.filePath;
    await this.openForCurrentState();
  }

  getState(): CollabViewState {
    if (!this.filePath) {
      return { filePath: "" };
    }
    return { filePath: this.filePath };
  }

  async onOpen(): Promise<void> {
    await this.openForCurrentState();
  }

  async onClose(): Promise<void> {
    this.teardown();
  }

  private teardown(): void {
    if (this.saveTimer) {
      window.clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }

    this.editorView?.destroy();
    this.editorView = null;

    this.session?.destroy();
    this.session = null;
  }

  private async openForCurrentState(): Promise<void> {
    this.teardown();

    const container = this.containerEl.children[1];
    container.empty();
    container.addClass("collab-view-container");

    if (!this.filePath) {
      container.createEl("div", { cls: "collab-view-empty", text: "No file selected." });
      return;
    }

    const abstract = this.app.vault.getAbstractFileByPath(this.filePath);
    if (!(abstract instanceof TFile) || abstract.extension !== "md") {
      container.createEl("div", { cls: "collab-view-empty", text: "Not a markdown file." });
      return;
    }

    const serverUrl = this.plugin.settings.collabServerUrl;
    if (!serverUrl) {
      new Notice("Set Collaboration server URL in settings");
      container.createEl("div", { cls: "collab-view-empty", text: "Missing server URL." });
      return;
    }

    const localText = await this.app.vault.read(abstract);
    const roomName = createRoomNameFromPath(abstract.path);

    this.session = new CollabSession(serverUrl, roomName);
    this.session.provider.on("sync", (isSynced: boolean) => {
      if (isSynced) {
        this.session?.ensureInitializedFromLocal(localText);
      }
    });

    const editorHost = container.createDiv();
    editorHost.style.height = "100%";

    const state = EditorState.create({
      doc: this.session.text.toString(),
      extensions: [
        history(),
        keymap.of([
          ...defaultKeymap,
          { key: "Mod-z", run: undo },
          { key: "Mod-Shift-z", run: redo },
        ]),
        yCollab(this.session.text, this.session.provider.awareness, {
          undoManager: this.session.undoManager,
        }),
        EditorView.updateListener.of(() => {
          if (this.plugin.settings.collabAutosave) {
            this.scheduleSave(abstract);
          }
        }),
      ],
    });

    this.editorView = new EditorView({
      state,
      parent: editorHost,
    });

    this.lastWrittenText = localText;

    if (this.plugin.settings.collabAutosave) {
      this.session.text.observe(() => this.scheduleSave(abstract));
    }
  }

  private scheduleSave(file: TFile): void {
    if (!this.session) return;

    const debounceMs = this.plugin.settings.collabAutosaveDebounceMs;

    if (this.saveTimer) {
      window.clearTimeout(this.saveTimer);
    }

    this.saveTimer = window.setTimeout(async () => {
      if (!this.session) return;
      const text = this.session.text.toString();
      if (text === this.lastWrittenText) return;
      this.lastWrittenText = text;

      try {
        await this.app.vault.modify(file, text);
      } catch (error) {
        new Notice(`Failed to save: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    }, debounceMs);
  }
}
