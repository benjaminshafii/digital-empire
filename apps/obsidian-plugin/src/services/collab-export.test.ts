import { describe, expect, it } from "vitest";
import { buildCollabSnapshotPath } from "./collab-export";

describe("buildCollabSnapshotPath", () => {
  it("formats timestamps as YYYYMMDD-HHMMSS", () => {
    const result = buildCollabSnapshotPath("note.md", "export", new Date("2025-01-01T12:00:00.000Z"));
    expect(result).toBe("export/note-20250101-120000.md");
  });

  it("uses the basename of the note path", () => {
    const result = buildCollabSnapshotPath("folder/subfolder/note.md", "export", new Date("2025-01-01T12:00:00.000Z"));
    expect(result).toBe("export/note-20250101-120000.md");
  });

  it("sanitizes spaces into dashes", () => {
    const result = buildCollabSnapshotPath("My Cool Note.md", "export", new Date("2025-01-01T12:00:00.000Z"));
    expect(result).toBe("export/My-Cool-Note-20250101-120000.md");
  });

  it("trims export folder slashes", () => {
    const result = buildCollabSnapshotPath("note.md", "/export/", new Date("2025-01-01T12:00:00.000Z"));
    expect(result).toBe("export/note-20250101-120000.md");
  });

  it("omits folder prefix when empty", () => {
    const result = buildCollabSnapshotPath("note.md", "", new Date("2025-01-01T12:00:00.000Z"));
    expect(result).toBe("note-20250101-120000.md");
  });

  it("limits basename length", () => {
    const longBasename = "a".repeat(300) + ".md";
    const result = buildCollabSnapshotPath(longBasename, "export", new Date("2025-01-01T12:00:00.000Z"));
    expect(result.startsWith("export/" + "a".repeat(80))).toBe(true);
  });
});
