import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { readKeychainValue } from "./client";

const KEYCHAIN_SERVICE = "com.differentai.openwork.notary";

type NotaryConfig = {
  issuerId: string;
  keyId: string;
  keyPath: string;
};

function requireValue(name: string, value: string | null | undefined) {
  if (value && value.trim().length > 0) return value.trim();
  throw new Error(`Missing ${name}. See .opencode/skill/openwork-notary/.env.example or store it in Keychain.`);
}

function loadNotaryConfig(): NotaryConfig {
  const issuerId =
    process.env.APPLE_NOTARY_API_ISSUER_ID ?? readKeychainValue(KEYCHAIN_SERVICE, "issuer-id");
  const keyId = process.env.APPLE_NOTARY_API_KEY_ID ?? readKeychainValue(KEYCHAIN_SERVICE, "key-id");
  const keyPath =
    process.env.APPLE_NOTARY_API_KEY_PATH ?? readKeychainValue(KEYCHAIN_SERVICE, "key-path");

  return {
    issuerId: requireValue("APPLE_NOTARY_API_ISSUER_ID", issuerId),
    keyId: requireValue("APPLE_NOTARY_API_KEY_ID", keyId),
    keyPath: requireValue("APPLE_NOTARY_API_KEY_PATH", keyPath),
  };
}

export const notaryConfig = loadNotaryConfig();

export const signingIdentity = process.env.APPLE_SIGNING_IDENTITY ?? null;

export function assertKeyFileReadable() {
  const absolute = resolve(notaryConfig.keyPath);
  const content = readFileSync(absolute);
  if (content.length === 0) throw new Error(`Notary key file is empty: ${absolute}`);
  return absolute;
}
