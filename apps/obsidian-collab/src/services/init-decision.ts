export type InitDecision =
  | { type: "init-crdt-from-disk" }
  | { type: "prompt" }
  | { type: "noop" };

type DecideInitParams = {
  diskText: string;
  crdtText: string;
};

/**
 * Decide how to initialize a collaborative document from disk + CRDT.
 *
 * Rules:
 * - If CRDT is empty and disk has content => initialize CRDT from disk.
 * - If both have content and differ => prompt user (never overwrite CRDT blindly).
 * - Otherwise => noop.
 */
export function decideInit({ diskText, crdtText }: DecideInitParams): InitDecision {
  if (crdtText.length === 0 && diskText.length > 0) {
    return { type: "init-crdt-from-disk" };
  }

  if (diskText.length > 0 && crdtText.length > 0 && diskText !== crdtText) {
    return { type: "prompt" };
  }

  return { type: "noop" };
}
