# OpenWork Pnpm Monorepo Migration

## Summary
Convert `vendor/openwork` into a pnpm monorepo and move the existing Tauri + SolidJS app into `packages/desktop` while keeping all dev, build, test, and release workflows working without disruption.

## Problem
- The current repo is a single-package layout, which blocks additional packages (shared UI, SDK helpers, future mobile/web clients) and makes workspace tooling harder.
- CI/release flows, Tauri config, and scripts assume the repo root is the app root; moving files risks breaking paths and build pipelines.
- Release and prerelease workflows copy sidecars and invoke `tauri-action` from root paths that will change once the app lives under `packages/desktop`.
- OpenWork docs, skills, and agent guides hardcode root paths (`src-tauri/*`, `pnpm dev`) that will drift after the move unless updated.

## Goals
1. Make `vendor/openwork` the workspace root with `packages/desktop` as the existing app.
2. Preserve current commands (`pnpm dev`, `pnpm build:web`, `pnpm test:e2e`, release tags) via workspace-aware scripts.
3. Keep Tauri build outputs, sidecar packaging, and updater artifacts intact.
4. Update GitHub workflows to target the new package layout without changing behavior.

## Non-Goals
- Changing OpenWork runtime behavior, UI, or backend logic.
- Introducing new packages beyond the initial `packages/desktop` move.
- Switching build tooling away from pnpm or Tauri.

## Functional Requirements
- Root workspace config lives in `vendor/openwork/pnpm-workspace.yaml` and includes `packages/*`.
- Root `vendor/openwork/package.json` is private and provides wrapper scripts that invoke the desktop package (filter or `-C`).
- All current app files move into `vendor/openwork/packages/desktop` with identical contents and relative structure.
- `pnpm-lock.yaml` remains at the workspace root and is regenerated once after the move.
- `tauri dev/build` continues to call Vite through `beforeDevCommand`/`beforeBuildCommand` without path regressions.
- Release and prerelease workflows build from `packages/desktop` and still upload updater JSON and sidecars.

## Migration Strategy (Zero-Disruption Plan)
1. **Inventory + Baseline**: Record current working commands (`pnpm dev:web`, `pnpm build:web`, `pnpm test:e2e`, `pnpm bump:patch`) and CI job outputs to use as a parity checklist.
2. **Workspace Scaffolding**: Create/adjust root `package.json` for workspace metadata and root scripts; update `pnpm-workspace.yaml` to `packages/*`.
3. **Package Move**: Create `packages/desktop` and move app-specific files/directories:
   - `src/`, `src-tauri/`, `public/`, `index.html`
   - `vite.config.ts`, `tailwind.config.ts`, `tsconfig.json`
   - `scripts/`, `progress.json`, `pr/`, `prd-*.md`
   - app `package.json` (now `packages/desktop/package.json`)
4. **Script + Path Rewrites**: Update workspace scripts to run in `packages/desktop` so `process.cwd()` remains correct for `scripts/*.mjs` and version bumping.
5. **Tauri Path Audit**: Verify `src-tauri/tauri.conf.json` still points to `../dist`, and that `beforeDevCommand`/`beforeBuildCommand` execute from the desktop package root.
6. **Workflow Updates**: Adjust `.github/workflows/*.yml` to:
   - install from workspace root (`pnpm install --frozen-lockfile`)
   - run desktop commands via `pnpm --filter @different-ai/openwork ...` or `working-directory: packages/desktop`
   - set `tauri-action` `projectPath: packages/desktop`
   - copy sidecars into `packages/desktop/src-tauri/sidecars`
7. **Docs + Skill Updates**: Refresh `AGENTS.md`, `README.md`, and `.opencode/skill/*` instructions to point at the desktop package paths and new wrapper commands; update `progress.json`/`pr` docs if they reference old paths.
8. **Ignore Rules**: Update `.gitignore` to ignore `packages/desktop/src-tauri/target` and `packages/desktop/src-tauri/sidecars` (or switch to a globbed pattern).
9. **Validation Matrix**: Run local checks from root and package:
   - `pnpm dev:web` (root wrapper) and `pnpm -C packages/desktop dev:web`
   - `pnpm test:e2e` (workspace filter)
   - `pnpm exec tauri dev` inside `packages/desktop`
10. **Rollback Plan**: Keep the move in a single PR and preserve pre-move commit for fast revert if CI fails.

## Technical Considerations (Design Only)
- `tauri.conf.json` runs `beforeDevCommand`/`beforeBuildCommand` from the Tauri project root, so commands must resolve to the desktop package (use workspace filters or run inside `packages/desktop`).
- `scripts/bump-version.mjs` expects `package.json` and `src-tauri/*` relative to `process.cwd()`; scripts must execute with CWD set to `packages/desktop`.
- `tauri-action` currently uses `projectPath: .` and `tauriScript: pnpm exec tauri -vvv`; both need to target `packages/desktop` after the move.
- Sidecar download steps in release workflows write to `src-tauri/sidecars`; update to `packages/desktop/src-tauri/sidecars`.
- `src-tauri/src/engine/doctor.rs` checks `src-tauri/sidecars` relative to CWD; ensure all dev/CI entrypoints run Tauri from `packages/desktop` or update the fallback path.
- `.gitignore` entries for `src-tauri/target` and `src-tauri/sidecars` are root-relative; expand to the new package path.
- `.opencode/skill/publish/first-call.ts` reads `package.json` from CWD; update to read from `packages/desktop` or enforce running from that directory.

## Repo Touchpoints
- Workspace root config: `vendor/openwork/pnpm-workspace.yaml`, `vendor/openwork/package.json`, `vendor/openwork/pnpm-lock.yaml`.
- Desktop package root: `vendor/openwork/packages/desktop/package.json`, `vendor/openwork/packages/desktop/vite.config.ts`, `vendor/openwork/packages/desktop/tsconfig.json`.
- Tauri backend: `vendor/openwork/packages/desktop/src-tauri/tauri.conf.json`, `vendor/openwork/packages/desktop/src-tauri/Cargo.toml`, `vendor/openwork/packages/desktop/src-tauri/Cargo.lock`.
- Frontend assets: `vendor/openwork/packages/desktop/src`, `vendor/openwork/packages/desktop/public`, `vendor/openwork/packages/desktop/index.html`.
- Automation scripts: `vendor/openwork/packages/desktop/scripts/bump-version.mjs`, `vendor/openwork/packages/desktop/scripts/e2e.mjs`.
- Local engine path checks: `vendor/openwork/packages/desktop/src-tauri/src/engine/doctor.rs`.
- Agent + skill docs: `vendor/openwork/AGENTS.md`, `vendor/openwork/.opencode/skill/openwork-core/SKILL.md`, `vendor/openwork/.opencode/skill/tauri-solidjs/SKILL.md`.
- Release guidance: `vendor/openwork/.opencode/skill/release/SKILL.md`, `vendor/openwork/.opencode/skill/publish/SKILL.md`, `vendor/openwork/.opencode/skill/publish/first-call.ts`.
- CI/release workflows: `vendor/openwork/.github/workflows/ci.yml`, `vendor/openwork/.github/workflows/ci-tests.yml`, `vendor/openwork/.github/workflows/prerelease.yml`, `vendor/openwork/.github/workflows/release-macos-aarch64.yml`.
- Documentation + hygiene: `vendor/openwork/README.md`, `vendor/openwork/.gitignore`, `vendor/openwork/progress.json`, `vendor/openwork/pr/*`.

## Risks & Mitigations
- **Broken CI paths**: Update workflows with explicit `working-directory` or `pnpm --filter` usage and verify `tauri-action` `projectPath`.
- **Script CWD mismatch**: Ensure root wrapper scripts call into the desktop package to preserve `process.cwd()`.
- **Sidecar packaging regressions**: Update sidecar copy paths and confirm artifacts appear in release builds.
- **Stale docs/skills**: Update OpenWork skills and docs that mention root paths, then re-run their checklists to validate.

## Open Questions
- Should the desktop package keep the name `@different-ai/openwork` or move to `@different-ai/openwork-desktop` with a root meta package?
- Do we want a root `pnpm dev` script that forwards to the desktop package, or require `pnpm -C packages/desktop dev` for clarity?
- Should OpenWork docs (`pr/`, `prd-*.md`, `progress.json`) live at the monorepo root or move into `packages/desktop` with the app?
