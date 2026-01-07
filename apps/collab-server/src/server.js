import http from "node:http";
import * as Y from "yjs";
import {
  Awareness,
  applyAwarenessUpdate,
  encodeAwarenessUpdate,
  removeAwarenessStates,
} from "y-protocols/awareness";
import * as syncProtocol from "y-protocols/sync";
import * as encoding from "lib0/encoding";
import * as decoding from "lib0/decoding";
import { WebSocketServer } from "ws";

const MESSAGE_SYNC = 0;
const MESSAGE_AWARENESS = 1;

function readEnvString(name, defaultValue) {
  const value = process.env[name];
  return value && value.length > 0 ? value : defaultValue;
}

function readEnvNumber(name, defaultValue) {
  const value = process.env[name];
  if (!value) return defaultValue;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : defaultValue;
}

export function deriveRoomName(requestUrl) {
  try {
    const url = new URL(requestUrl, "http://localhost");
    const path = url.pathname.replace(/^\//, "");
    return path.length > 0 ? path : "default";
  } catch {
    return "default";
  }
}

function setCors(res) {
  // Obsidian runs on app://obsidian.md, so we need explicit CORS.
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

class Room {
  constructor(name) {
    this.name = name;
    this.doc = new Y.Doc();
    this.awareness = new Awareness(this.doc);
    this.conns = new Set();
    this.connByClientId = new Map();
    this.clientIdsByConn = new Map();

    this.doc.on("update", (update, origin) => {
      this.broadcastSyncUpdate(update, origin);
    });

    this.awareness.on("update", ({ added, updated, removed }, origin) => {
      const changed = added.concat(updated, removed);
      const update = encodeAwarenessUpdate(this.awareness, changed);
      this.broadcastAwarenessUpdate(update, origin);
    });
  }

  addConn(ws) {
    this.conns.add(ws);
    if (!this.clientIdsByConn.has(ws)) {
      this.clientIdsByConn.set(ws, new Set());
    }
  }

  removeConn(ws) {
    this.conns.delete(ws);

    const clientIds = this.clientIdsByConn.get(ws);
    if (clientIds && clientIds.size > 0) {
      removeAwarenessStates(this.awareness, Array.from(clientIds), ws);
      for (const clientId of clientIds) {
        this.connByClientId.delete(clientId);
      }
    }

    this.clientIdsByConn.delete(ws);
  }

  broadcastSyncUpdate(update, origin) {
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, MESSAGE_SYNC);
    syncProtocol.writeUpdate(encoder, update);
    const message = encoding.toUint8Array(encoder);

    for (const conn of this.conns) {
      if (conn.readyState !== conn.OPEN) continue;
      if (origin && origin === conn) continue;
      conn.send(message);
    }
  }

  broadcastAwarenessUpdate(update, origin) {
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, MESSAGE_AWARENESS);
    encoding.writeVarUint8Array(encoder, update);
    const message = encoding.toUint8Array(encoder);

    for (const conn of this.conns) {
      if (conn.readyState !== conn.OPEN) continue;
      if (origin && origin === conn) continue;
      conn.send(message);
    }
  }

  sendSyncStep1(ws) {
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, MESSAGE_SYNC);
    syncProtocol.writeSyncStep1(encoder, this.doc);
    ws.send(encoding.toUint8Array(encoder));
  }

  sendAwarenessStates(ws) {
    const states = this.awareness.getStates();
    const clientIds = Array.from(states.keys());
    if (clientIds.length === 0) return;

    const update = encodeAwarenessUpdate(this.awareness, clientIds);
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, MESSAGE_AWARENESS);
    encoding.writeVarUint8Array(encoder, update);
    ws.send(encoding.toUint8Array(encoder));
  }

  handleAwarenessUpdate(ws, update) {
    const before = new Set(this.awareness.getStates().keys());
    applyAwarenessUpdate(this.awareness, update, ws);
    const after = new Set(this.awareness.getStates().keys());

    const clientIdsForConn = this.clientIdsByConn.get(ws) ?? new Set();

    for (const clientId of after) {
      if (before.has(clientId)) continue;
      this.connByClientId.set(clientId, ws);
      clientIdsForConn.add(clientId);
    }

    for (const clientId of before) {
      if (after.has(clientId)) continue;
      const owner = this.connByClientId.get(clientId);
      if (owner) {
        const ownerIds = this.clientIdsByConn.get(owner);
        ownerIds?.delete(clientId);
      }
      this.connByClientId.delete(clientId);
    }

    this.clientIdsByConn.set(ws, clientIdsForConn);
  }

  handleMessage(ws, message) {
    const decoder = decoding.createDecoder(message);
    const messageType = decoding.readVarUint(decoder);

    if (messageType === MESSAGE_SYNC) {
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, MESSAGE_SYNC);
      syncProtocol.readSyncMessage(decoder, encoder, this.doc, ws);
      const reply = encoding.toUint8Array(encoder);
      if (reply.length > 1) {
        ws.send(reply);
      }
      return;
    }

    if (messageType === MESSAGE_AWARENESS) {
      const update = decoding.readVarUint8Array(decoder);
      this.handleAwarenessUpdate(ws, update);
    }
  }

  destroy() {
    this.doc.destroy();
  }
}

export function createCollabServer({ host = "127.0.0.1", port = 1234 } = {}) {
  const rooms = new Map();

  function getRoom(name) {
    let room = rooms.get(name);
    if (!room) {
      room = new Room(name);
      rooms.set(name, room);
    }
    return room;
  }

  const server = http.createServer((req, res) => {
    setCors(res);

    if (!req.url) {
      res.writeHead(404);
      res.end();
      return;
    }

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    if (req.method !== "GET") {
      res.writeHead(404);
      res.end();
      return;
    }

    if (req.url === "/healthz") {
      res.writeHead(200, { "Content-Type": "text/plain" });
      res.end("ok");
      return;
    }

    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("yjs-collab-server\n");
  });

  const wss = new WebSocketServer({ server });

  wss.on("connection", (ws, req) => {
    const roomName = deriveRoomName(req.url ?? "/");
    const room = getRoom(roomName);
    room.addConn(ws);

    ws.on("message", (data) => {
      const message = data instanceof Buffer ? new Uint8Array(data) : new Uint8Array(data);
      room.handleMessage(ws, message);
    });

    ws.on("close", () => {
      room.removeConn(ws);
      if (room.conns.size === 0) {
        rooms.delete(roomName);
        room.destroy();
      }
    });

    room.sendSyncStep1(ws);
    room.sendAwarenessStates(ws);
  });

  return {
    server,
    wss,
    host,
    port,
    async listen() {
      await new Promise((resolve) => {
        server.listen(port, host, resolve);
      });

      const address = server.address();
      const resolvedPort = typeof address === "object" && address ? address.port : port;
      return { host, port: resolvedPort };
    },
    async close() {
      wss.close();
      await new Promise((resolve) => server.close(resolve));
    },
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const host = readEnvString("HOST", "127.0.0.1");
  const port = readEnvNumber("PORT", 1234);

  const app = createCollabServer({ host, port });
  app.listen().then(({ host: boundHost, port: boundPort }) => {
    console.log(`[collab-server] listening on http://${boundHost}:${boundPort}`);
  });
}
