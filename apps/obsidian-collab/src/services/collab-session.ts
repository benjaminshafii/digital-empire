import { WebsocketProvider } from "y-websocket";
import { IndexeddbPersistence } from "y-indexeddb";
import * as Y from "yjs";

export type CollabStatus = "disconnected" | "connecting" | "connected" | "synced";

type StatusListener = (status: CollabStatus) => void;

export function createRoomNameFromPath(filePath: string): string {
  return encodeURIComponent(filePath);
}

export class CollabSession {
  readonly serverUrl: string;
  readonly roomName: string;

  readonly doc: Y.Doc;
  readonly text: Y.Text;
  readonly undoManager: Y.UndoManager;

  readonly provider: WebsocketProvider;
  readonly persistence: IndexeddbPersistence | null;

  status: CollabStatus = "connecting";

  private readonly statusListeners = new Set<StatusListener>();

  constructor(serverUrl: string, roomName: string, persistLocally: boolean) {
    this.serverUrl = serverUrl;
    this.roomName = roomName;

    this.doc = new Y.Doc();
    this.text = this.doc.getText("content");
    this.undoManager = new Y.UndoManager(this.text);

    this.persistence = persistLocally ? new IndexeddbPersistence(this.roomName, this.doc) : null;

    this.provider = new WebsocketProvider(this.serverUrl, this.roomName, this.doc);

    this.provider.on(
      "status",
      ({ status }: { status: "connected" | "connecting" | "disconnected" }) => {
        if (status === "connected") {
          this.setStatus("connected");
          return;
        }

        if (status === "connecting") {
          this.setStatus("connecting");
          return;
        }

        this.setStatus("disconnected");
      }
    );

    this.provider.on("sync", (isSynced: boolean) => {
      if (isSynced) {
        this.setStatus("synced");
      }
    });
  }

  onStatusChange(listener: StatusListener): () => void {
    this.statusListeners.add(listener);
    listener(this.status);
    return () => this.statusListeners.delete(listener);
  }

  async waitForLocalReady(): Promise<void> {
    if (!this.persistence) return;
    await this.persistence.whenSynced;
  }

  replaceText(nextText: string): void {
    this.doc.transact(() => {
      const currentLength = this.text.length;
      if (currentLength > 0) {
        this.text.delete(0, currentLength);
      }
      if (nextText.length > 0) {
        this.text.insert(0, nextText);
      }
    });
  }

  connect(): void {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (this.provider as any).connect?.();
  }

  disconnect(): void {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (this.provider as any).disconnect?.();
  }

  destroy(): void {
    this.statusListeners.clear();
    this.provider.destroy();
    this.doc.destroy();
  }

  private setStatus(status: CollabStatus): void {
    if (this.status === status) return;
    this.status = status;
    for (const listener of this.statusListeners) {
      listener(status);
    }
  }
}
