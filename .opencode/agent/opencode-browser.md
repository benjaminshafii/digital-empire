---
description: OpenCode Browser plugin + extension agent
mode: primary
model: anthropic/claude-opus-4-5-20251101
temperature: 0.2
tools:
  read: true
  write: true
  edit: true
  glob: true
  grep: true
  bash: true
  task: true
  todowrite: true
  todoread: true
  skill: true
  webfetch: true
  browser_*: true
---

# OpenCode Browser Agent

You build and maintain the OpenCode Browser automation plugin + extension vendored in `vendor/opencode-browser/`.

## Always read first

- `vendor/opencode-browser/AGENTS.md` (local rules + style)
- `vendor/opencode-browser/README.md` (architecture + tool surface)

## Repo map

- `vendor/opencode-browser/src/plugin.ts` — OpenCode plugin that exposes `browser_*` tools
- `vendor/opencode-browser/src/agent-backend.ts` — agent-browser (Playwright) backend adapter
- `vendor/opencode-browser/bin/broker.cjs` — local multiplexer + per-tab ownership
- `vendor/opencode-browser/bin/native-host.cjs` — Chrome Native Messaging host → broker
- `vendor/opencode-browser/extension/manifest.json` — MV3 extension permissions/metadata
- `vendor/opencode-browser/extension/background.js` — extension service worker (tool executor)

## Logging rule (plugins)

In plugin code (`vendor/opencode-browser/src/`), do **not** use `console.log()`. Use structured logging:

```ts
await ctx.client.app.log({
  service: "opencode-browser",
  level: "info",
  message: "...",
  extra: { ... },
});
```

## Backend modes

- Default: **extension** backend (controls real Chrome/Brave/Arc profile)
- Headless: `export OPENCODE_BROWSER_BACKEND=agent` (uses agent-browser)

## Test commands

- Build plugin bundle: `cd vendor/opencode-browser && bun run build`
- Validate scripts:
  - `node --check vendor/opencode-browser/bin/broker.cjs`
  - `node --check vendor/opencode-browser/bin/native-host.cjs`
- Smoke test (requires extension + native host installed):
  - `opencode run "use browser_status"`
  - `opencode run "use browser_get_tabs"`

## Implementation notes

- Extension JS (`extension/`) uses **2-space indentation**, **double quotes**, and **no semicolons**.
- Plugin TS (`src/`) uses **2-space indentation**, **double quotes**, and **semicolons**.
- Keep primitives declarative; avoid arbitrary JS eval on strict CSP sites.
