import { WebsocketProvider } from "y-websocket";
import * as Y from "yjs";

export type CollabStatus = "disconnected" | "connecting" | "connected" | "synced";

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

  status: CollabStatus = "connecting";

  constructor(serverUrl: string, roomName: string) {
    this.serverUrl = serverUrl;
    this.roomName = roomName;

    this.doc = new Y.Doc();
    this.text = this.doc.getText("content");
    this.undoManager = new Y.UndoManager(this.text);
    this.provider = new WebsocketProvider(this.serverUrl, this.roomName, this.doc);

    this.provider.on("status", ({ status }: { status: "connected" | "connecting" | "disconnected" }) => {
      if (status === "connected") {
        this.status = "connected";
        return;
      }

      if (status === "connecting") {
        this.status = "connecting";
        return;
      }

      this.status = "disconnected";
    });

    this.provider.on("sync", (isSynced: boolean) => {
      if (isSynced) {
        this.status = "synced";
      }
    });
  }

  ensureInitializedFromLocal(localText: string): void {
    if (this.text.length === 0 && localText.length > 0) {
      this.text.insert(0, localText);
    }
  }

  destroy(): void {
    this.provider.destroy();
    this.doc.destroy();
  }
}
