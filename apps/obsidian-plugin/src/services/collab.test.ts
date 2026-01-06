import { describe, expect, it } from "vitest";
import { createRoomNameFromPath } from "./collab";

describe("createRoomNameFromPath", () => {
  it("produces a deterministic room name", () => {
    expect(createRoomNameFromPath("publish/note.md")).toBe(createRoomNameFromPath("publish/note.md"));
  });

  it("does not contain slashes", () => {
    const room = createRoomNameFromPath("publish/note.md");
    expect(room.includes("/")).toBe(false);
  });
});
