import { ItemView, Modal, Notice, TFile, WorkspaceLeaf } from "obsidian";
import type { ViewStateResult } from "obsidian";
import { EditorState } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { defaultKeymap, history, redo, undo } from "@codemirror/commands";
import { yCollab } from "y-codemirror.next";
import type ObsidianCollabPlugin from "../main";
import type { CollabStatus } from "../services/collab-session";
import { CollabSession, createRoomNameFromPath } from "../services/collab-session";

export const COLLAB_VIEW_TYPE = "collab-note-view";

type CollabViewState = {
  filePath?: string;
};

type ResolutionChoice = "keep-crdt" | "overwrite-crdt-from-disk" | "fork-disk";

function timestampForFilename(now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(
    now.getMinutes()
  )}${pad(now.getSeconds())}`;
}

async function promptResolveDiskVsCrdt(
  app: ObsidianCollabPlugin["app"],
  filePath: string,
  diskText: string,
  crdtText: string
): Promise<ResolutionChoice> {
  return await new Promise<ResolutionChoice>((resolve) => {
    class ResolveModal extends Modal {
      onOpen(): void {
        const { contentEl } = this;
        contentEl.empty();

        contentEl.createEl("h3", { text: "This file changed outside collaboration" });
        contentEl.createEl("p", {
          text: "The vault file content differs from the collaborative document. Choose how to resolve:",
        });

        contentEl.createEl("p", {
          text: `File: ${filePath}`,
        });

        const buttons = contentEl.createDiv({ cls: "collab-resolve-buttons" });

        const keepBtn = buttons.createEl("button", { text: "Keep collaborative version" });
        keepBtn.onclick = () => {
          this.close();
          resolve("keep-crdt");
        };

        const overwriteBtn = buttons.createEl("button", { text: "Overwrite collaboration with disk" });
        overwriteBtn.onclick = () => {
          this.close();
          resolve("overwrite-crdt-from-disk");
        };

        const forkBtn = buttons.createEl("button", { text: "Fork disk version" });
        forkBtn.onclick = () => {
          this.close();
          resolve("fork-disk");
        };

        const preview = contentEl.createEl("details");
        preview.createEl("summary", { text: "Preview (first 400 chars)" });
        const pre = preview.createEl("pre");
        pre.setText(
          `Disk:\n${diskText.slice(0, 400)}\n\nCollaborative:\n${crdtText.slice(0, 400)}`
        );
      }
    }

    const modal = new ResolveModal(app);
    modal.open();
  });
}

export class CollabNoteView extends ItemView {
  plugin: ObsidianCollabPlugin;
  filePath: string | null = null;


  private editorView: EditorView | null = null;
  private session: CollabSession | null = null;
  private saveTimer: number | null = null;
  private lastWrittenText: string = "";
  private unsubscribeStatus: (() => void) | null = null;
  private manuallyOffline = false;

  constructor(leaf: WorkspaceLeaf, plugin: ObsidianCollabPlugin) {
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

  async setState(state: unknown, result: { history: boolean }): Promise<void> {
    const maybeState = state as Partial<CollabViewState> | null;

    if (maybeState && typeof maybeState.filePath === "string" && maybeState.filePath.length > 0) {
      this.filePath = maybeState.filePath;
    } else {
      const activeFile = this.app.workspace.getActiveFile();
      this.filePath = activeFile?.path ?? null;
    }

    await this.openForCurrentState();
  }

  getState(): CollabViewState {
    return { filePath: this.filePath ?? "" };
  }

  getCurrentText(): string | null {
    if (!this.session) return null;
    return this.session.text.toString();
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

    this.unsubscribeStatus?.();
    this.unsubscribeStatus = null;

    this.editorView?.destroy();
    this.editorView = null;

    this.session?.destroy();
    this.session = null;

    this.manuallyOffline = false;
  }

  private async openForCurrentState(): Promise<void> {
    this.teardown();

    const folderPrefix = this.plugin.settings.collabFolder.endsWith("/")
      ? this.plugin.settings.collabFolder
      : `${this.plugin.settings.collabFolder}/`;

    // If opened without state, fall back to active file.
    if (!this.filePath) {
      const active = this.app.workspace.getActiveFile();
      if (active && active.extension === "md" && active.path.startsWith(folderPrefix)) {
        this.filePath = active.path;
      }
    }

    const container = this.containerEl.children[1];
    container.empty();
    container.addClass("collab-view-container");

    const header = container.createDiv({ cls: "collab-view-header" });

    const statusRow = header.createDiv({ cls: "collab-view-status" });
    statusRow.createEl("span", { text: "Status:" });
    const statusValue = statusRow.createEl("strong", { text: "-" });


    const metaRow = header.createDiv({ cls: "collab-view-meta" });
    metaRow.createEl("div", { text: `File: ${this.filePath ?? ""}` });

    const actionsRow = header.createDiv({ cls: "collab-view-actions" });
    const testBtn = actionsRow.createEl("button", { text: "Test server" });
    const reconnectBtn = actionsRow.createEl("button", { text: "Reconnect" });
    const copyRoomBtn = actionsRow.createEl("button", { text: "Copy room URL" });
    const offlineBtn = actionsRow.createEl("button", { text: "Go offline" });

    const setStatus = (status: CollabStatus) => {
      statusValue.textContent = status;
      offlineBtn.textContent = this.manuallyOffline ? "Go online" : "Go offline";
    };

    testBtn.onclick = async () => {
      try {
        await this.plugin.testConnection();
        new Notice("Collab server reachable");
      } catch (error) {
        new Notice(`Test failed: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    };

    reconnectBtn.onclick = () => {
      this.manuallyOffline = false;
      offlineBtn.textContent = "Go offline";
      this.session?.connect();
    };

    copyRoomBtn.onclick = async () => {
      if (!this.session) return;
      const roomUrl = `${this.session.serverUrl.replace(/\/$/, "")}/${this.session.roomName}`;
      try {
        await navigator.clipboard.writeText(roomUrl);
        new Notice("Copied room URL");
      } catch (error) {
        new Notice(`Failed to copy: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    };

    offlineBtn.onclick = () => {
      if (!this.session) return;

      this.manuallyOffline = !this.manuallyOffline;

      if (this.manuallyOffline) {
        this.session.disconnect();
      } else {
        this.session.connect();
      }

      setStatus(this.session.status);
    };

    if (!this.filePath) {
      container.createEl("div", { cls: "collab-view-empty", text: "No file selected." });
      return;
    }

    const abstract = this.app.vault.getAbstractFileByPath(this.filePath);
    if (!(abstract instanceof TFile) || abstract.extension !== "md") {
      container.createEl("div", { cls: "collab-view-empty", text: "Not a markdown file." });
      return;
    }

    const serverUrl = this.plugin.settings.serverUrl;
    if (!serverUrl) {
      new Notice("Set Collaboration server URL in settings");
      container.createEl("div", { cls: "collab-view-empty", text: "Missing server URL." });
      return;
    }

    const diskText = await this.app.vault.read(abstract);
    const roomName = createRoomNameFromPath(abstract.path);
    metaRow.createEl("div", { text: `Room: ${roomName}` });

    this.session = new CollabSession(serverUrl, roomName, this.plugin.settings.persistLocally);
    this.unsubscribeStatus = this.session.onStatusChange((status) => setStatus(status));

    await this.session.waitForLocalReady();

    // Initialization rules:
    // - If CRDT has no content after local persistence loads, and disk has content, initialize CRDT from disk.
    // - If both have content and differ, prompt the user.
    const crdtTextAfterLocal = this.session.text.toString();

    if (this.session.text.length === 0 && diskText.length > 0) {
      this.session.replaceText(diskText);
    } else if (diskText.length > 0 && crdtTextAfterLocal.length > 0 && diskText !== crdtTextAfterLocal) {
      const choice = await promptResolveDiskVsCrdt(this.app, abstract.path, diskText, crdtTextAfterLocal);

      if (choice === "overwrite-crdt-from-disk") {
        this.session.replaceText(diskText);
      }

      if (choice === "fork-disk") {
        const ts = timestampForFilename();
        const forkPath = `${abstract.path.replace(/\.md$/, "")}.external-${ts}.md`;
        try {
          await this.app.vault.create(forkPath, diskText);
          new Notice(`Forked disk version to ${forkPath}`);
        } catch (error) {
          new Notice(`Failed to fork: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
      }

      if (choice === "keep-crdt" || choice === "fork-disk") {
        try {
          await this.app.vault.modify(abstract, crdtTextAfterLocal);
        } catch (error) {
          new Notice(`Failed to write collaborative content to disk: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
      }
    }


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
          if (this.plugin.settings.autosave) {
            this.scheduleSave(abstract);
          }
        }),
      ],
    });

    this.editorView = new EditorView({
      state,
      parent: editorHost,
    });

    this.lastWrittenText = this.session.text.toString();

    if (this.plugin.settings.autosave) {
      this.session.text.observe(() => this.scheduleSave(abstract));
    }
  }

  private scheduleSave(file: TFile): void {
    if (!this.session) return;

    const debounceMs = this.plugin.settings.autosaveDebounceMs;

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
