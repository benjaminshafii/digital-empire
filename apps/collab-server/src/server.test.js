import assert from "node:assert/strict";
import test from "node:test";

import { deriveRoomName } from "./room-name.js";

test("deriveRoomName returns default for empty", () => {
  assert.equal(deriveRoomName("/"), "default");
  assert.equal(deriveRoomName(""), "default");
});

test("deriveRoomName strips leading slash", () => {
  assert.equal(deriveRoomName("/room"), "room");
  assert.equal(deriveRoomName("/a/b"), "a/b");
});

test("deriveRoomName ignores query", () => {
  assert.equal(deriveRoomName("/room?x=1"), "room");
});
