---
name: openwork-notary
description: Store Apple notarization IDs in Keychain and notarize/staple OpenWork DMGs locally.
---

## What this is

A small helper skill for the OpenWork macOS release flow.

It stores the **App Store Connect Issuer ID**, **API Key ID**, and **.p8 path** in the macOS Keychain so you don’t have to keep hunting them.

Keychain location used by this skill:
- Service: `com.differentai.openwork.notary`
- Accounts:
  - `issuer-id`
  - `key-id`
  - `key-path`

## Quick usage (Keychain)

### Store values

```bash
security add-generic-password -a issuer-id -s com.differentai.openwork.notary -w "<ISSUER_UUID>" -U
security add-generic-password -a key-id    -s com.differentai.openwork.notary -w "<KEY_ID>" -U
security add-generic-password -a key-path  -s com.differentai.openwork.notary -w "/path/to/AuthKey_<KEY_ID>.p8" -U
```

### Read values

```bash
security find-generic-password -a issuer-id -s com.differentai.openwork.notary -w
security find-generic-password -a key-id    -s com.differentai.openwork.notary -w
security find-generic-password -a key-path  -s com.differentai.openwork.notary -w
```

## Notarize + staple an OpenWork DMG (local)

### 1) Build a Developer ID signed DMG

```bash
APPLE_SIGNING_IDENTITY='Developer ID Application: Different AI inc. (F5DJWB4CCV)' \
  pnpm -C apps/openwork exec tauri build --bundles dmg
```

### 2) Submit to Apple notarization (wait)

```bash
bun .opencode/skill/openwork-notary/first-call.ts
```

### 3) Staple and verify

```bash
DMG_PATH="apps/openwork/src-tauri/target/release/bundle/dmg/OpenWork_0.1.2_aarch64.dmg"

xcrun stapler staple "$DMG_PATH"
spctl --assess --type open --verbose=4 "$DMG_PATH"
```

## Common gotchas

- `spctl` saying `Unnotarized Developer ID` means signing is fine but notarization is missing.
- `codesign ... code has no resources but signature indicates they must be present` usually means the `.app` bundle got signed incorrectly (or was modified after signing).
- Apple notarization can take > 1h sometimes; don’t assume it’s broken immediately.
