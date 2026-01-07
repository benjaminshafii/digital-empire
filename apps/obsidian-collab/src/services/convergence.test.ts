import { afterAll, beforeAll, describe, expect, it } from "vitest";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";

type CollabServer = {
  listen: () => Promise<{ host: string; port: number }>;
  close: () => Promise<void>;
};

describe("CRDT convergence (offline edits)", () => {
  let server: CollabServer;
  let wsUrl: string;

  beforeAll(async () => {
    const mod = await import("../../../collab-server/src/server.js");
    server = mod.createCollabServer({ host: "127.0.0.1", port: 0 });
    const bound = await server.listen();
    wsUrl = `ws://${bound.host}:${bound.port}`;
  });

  afterAll(async () => {
    await server.close();
  });

  it("converges after both clients edit offline", async () => {
    const roomName = `test-room-${Date.now()}`;

    const doc1 = new Y.Doc();
    const doc2 = new Y.Doc();

    const provider1 = new WebsocketProvider(wsUrl, roomName, doc1);
    const provider2 = new WebsocketProvider(wsUrl, roomName, doc2);

    const t1 = doc1.getText("content");
    const t2 = doc2.getText("content");

    await waitForSync(provider1);
    await waitForSync(provider2);

    // Go offline
    provider1.disconnect();
    provider2.disconnect();

    // Both edit independently
    t1.insert(0, "A");
    t2.insert(0, "B");

    // Reconnect
    provider1.connect();
    provider2.connect();

    await waitForSync(provider1);
    await waitForSync(provider2);

    const s1 = t1.toString();
    const s2 = t2.toString();

    expect(s1).toBe(s2);
    expect(s1.includes("A")).toBe(true);
    expect(s1.includes("B")).toBe(true);

    provider1.destroy();
    provider2.destroy();
    doc1.destroy();
    doc2.destroy();
  });
});

function waitForSync(provider: WebsocketProvider): Promise<void> {
  return new Promise((resolve) => {
    if ((provider as any).synced) {
      resolve();
      return;
    }
    const onSync = (synced: boolean) => {
      if (synced) {
        provider.off("sync", onSync);
        resolve();
      }
    };
    provider.on("sync", onSync);
  });
}
