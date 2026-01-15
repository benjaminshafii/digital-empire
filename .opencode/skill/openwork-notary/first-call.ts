import { exec } from "./client";
import { assertKeyFileReadable, notaryConfig } from "./load-env";

// Minimal auth check: list notarization history.
// This hits Apple's notary service; success means credentials work.

const keyPath = assertKeyFileReadable();

const { issuerId, keyId } = notaryConfig;

const { stdout } = exec("xcrun", [
  "notarytool",
  "history",
  "--key",
  keyPath,
  "--key-id",
  keyId,
  "--issuer",
  issuerId,
  "--output-format",
  "json",
  "--no-progress",
]);

process.stdout.write(stdout);
