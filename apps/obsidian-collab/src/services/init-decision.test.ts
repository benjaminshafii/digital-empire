import { describe, expect, it } from "vitest";
import { decideInit } from "./init-decision";

describe("decideInit", () => {
  it("initializes CRDT from disk when CRDT empty", () => {
    expect(decideInit({ diskText: "hello", crdtText: "" })).toEqual({ type: "init-crdt-from-disk" });
  });

  it("prompts when both have content and differ (prefer CRDT over disk)", () => {
    expect(decideInit({ diskText: "disk", crdtText: "crdt" })).toEqual({ type: "prompt" });
  });

  it("noops when both equal", () => {
    expect(decideInit({ diskText: "same", crdtText: "same" })).toEqual({ type: "noop" });
  });

  it("noops when disk empty", () => {
    expect(decideInit({ diskText: "", crdtText: "nonempty" })).toEqual({ type: "noop" });
  });
});
