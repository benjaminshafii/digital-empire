import { createRoomNameFromPath } from "./collab-session";

describe("createRoomNameFromPath", () => {
  it("is deterministic", () => {
    expect(createRoomNameFromPath("collab/note.md")).toBe(createRoomNameFromPath("collab/note.md"));
  });

  it("does not include raw slashes", () => {
    expect(createRoomNameFromPath("collab/note.md").includes("/")).toBe(false);
  });
});
