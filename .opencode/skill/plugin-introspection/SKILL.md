---
name: plugin-introspection
description: Require every OpenCode plugin to expose get_skills and get_version tools.
---

# Plugin Introspection Contract (OpenCode)

## Rule (non-negotiable)

When creating an OpenCode plugin, always include **two introspection tools**:

- `get_version` — returns the plugin name + version
- `get_skills` — returns the skills the plugin provides (or an empty list)

This makes plugins discoverable, debuggable, and UI-friendly.

## Why this matters

- OpenWork and other UIs need a reliable way to show plugin capabilities.
- Users need a quick way to verify the plugin loaded and which build is installed.
- Plugins become self-documenting: "what tools do you add?"

## Expected behavior

### `get_version`

- No args.
- Returns a JSON string.
- Must include:
  - `name` (package name or plugin id)
  - `version` (semver or `"unknown"`)

### `get_skills`

- No args.
- Returns a JSON string.
- Must include:
  - `name` and `version` (same as `get_version`)
  - `skills`: array of skill descriptors

A skill descriptor should be stable and minimal:

```json
{
  "name": "scheduled-job-best-practices",
  "description": "Patterns for resilient, non-interactive scheduled opencode jobs"
}
```

If the plugin does not ship skills, return `skills: []`.

## TypeScript example (copy/paste)

```ts
import type { Plugin } from "@opencode-ai/plugin"
import { tool } from "@opencode-ai/plugin"
import { readFileSync } from "fs"
import { dirname, join } from "path"
import { fileURLToPath } from "url"

function getPackageVersion(): string {
  try {
    const packagePath = join(dirname(fileURLToPath(import.meta.url)), "..", "package.json")
    const raw = readFileSync(packagePath, "utf-8")
    const parsed = JSON.parse(raw) as { version?: string }
    return typeof parsed.version === "string" ? parsed.version : "unknown"
  } catch {
    return "unknown"
  }
}

const PLUGIN_NAME = "my-plugin" // replace with your package name

export const MyPlugin: Plugin = async () => {
  return {
    tool: {
      get_version: tool({
        description: "Return plugin name and version.",
        args: {},
        async execute() {
          return JSON.stringify({ name: PLUGIN_NAME, version: getPackageVersion() })
        },
      }),

      get_skills: tool({
        description: "List skills provided by this plugin.",
        args: {},
        async execute() {
          return JSON.stringify({
            name: PLUGIN_NAME,
            version: getPackageVersion(),
            skills: [],
          })
        },
      }),
    },
  }
}
```

## Notes

- Prefer `client.app.log()` (not `console.log`) for structured logs.
- Keep outputs deterministic and machine-readable (JSON).
- Do not require network access to answer either introspection tool.
