
## Summary
Strengthen MCP OAuth quick-connect flows in OpenWork so OAuth-capable servers (e.g., Linear) avoid false "OAuth not supported" errors, update status immediately after auth, and support remote/client OAuth completion without relying on server-side browser opens.

## Problem
- Quick connect triggers `client.mcp.auth.authenticate` immediately after `client.mcp.add`, which can return "does not support OAuth" before the engine reloads and reads MCP capabilities.
- Server-side OAuth opens a browser on the host and expects a loopback callback (`127.0.0.1:19876`), which breaks when OpenWork connects from a remote client.
- Users must reload the engine manually and retry, yet the MCP list and quick-connect badges often stay stale even after reload.
- `reloadEngineInstance` refreshes providers, plugins, and skills but does not refresh MCP status, so the UI can remain out of sync.

## Goals
1. Ensure OAuth flows only start after MCP capabilities are loaded, without auto-reloading the engine.
2. Keep MCP status badges/details in sync after OAuth completion and engine reload.
3. Support remote/client OAuth completion without server-side browser opens.
4. Provide clear recovery paths (reload, retry, CLI fallback) without requiring terminal usage by default.

## Non-Goals
- Auto-reloading the engine when MCP auth starts.
- Redesigning the entire MCP tab or adding new MCP server management features.
- Changing OpenCode server-side OAuth behavior.

## User Stories
1. As a user connecting Linear, I complete OAuth without seeing a false "OAuth not supported" error.
2. As a user, after I finish OAuth, the MCP card immediately shows Connected.
3. As a user, if auth fails, I can retry or reload with one click and see why.

## Functional Requirements
### Connection + Reload
- After `connectMcp` writes `opencode.json` and calls `client.mcp.add`, verify the server is loaded and OAuth-capable before starting the OAuth flow.
- If OAuth capabilities are not available yet, present a "Reload engine to continue" CTA. Do not auto-reload, and keep reload disabled when active runs are present.
- After a successful reload, allow the user to retry OAuth from the modal.

### OAuth Modal State
- Start OAuth with `client.mcp.auth.start`, open the authorization URL from the UI (Tauri/web), and avoid `client.mcp.auth.authenticate`.
- During OAuth, poll `client.mcp.status` for the server slug and transition to Connected once status flips.
- On "I'm done", re-check `client.mcp.status` before closing the modal so the UI reflects the true connection state.
- If OAuth start fails with "does not support OAuth", show reload guidance and offer a CLI fallback button (desktop only).

### Remote/Client OAuth Completion
- Offer a manual completion path that accepts the OAuth callback URL or code and submits it via `client.mcp.auth.callback`.
- Document a port-forward option (`ssh -L 19876:127.0.0.1:19876`) for users who prefer automatic loopback callbacks.
- Do not require command-line usage for the default flow.

### Status Sync
- After engine reload, always call `refreshMcpServers` and update `mcpStatuses`.
- Ensure quick-connect cards, connected list, and detail panel read from the refreshed status map.

### Fallbacks
- Expose the existing Tauri command `opencode_mcp_auth` as a UI action when SDK-based auth fails.

## UX/Flows
1. User clicks Connect on Linear.
2. OpenWork updates `opencode.json`, calls `client.mcp.add`, and checks capability status.
3. If reload required, user clicks "Reload & Continue" (or auto-reload) and OAuth resumes.
4. OAuth modal opens browser, shows waiting state, and polls for status.
5. On success, modal shows Connected and MCP list updates immediately.

## Technical Considerations (Design Only)
- `connectMcp` in `vendor/openwork/packages/app/src/app/app.tsx` handles config write and `client.mcp.add`; add a post-add status check and reload gating here.
- `McpAuthModal` in `vendor/openwork/packages/app/src/app/components/mcp-auth-modal.tsx` should use `client.mcp.auth.start` + `client.mcp.auth.callback`, add status polling, and expose manual callback entry for remote clients.
- `reloadEngineInstance` in `vendor/openwork/packages/app/src/app/system-state.ts` should call `refreshMcpServers` and update `mcpStatuses` after reload completes.
- `refreshMcpServers` uses `client.mcp.status` and `parseMcpServersFromContent` in `vendor/openwork/packages/app/src/app/mcp.ts`.
- CLI fallback is already wired through `opencodeMcpAuth` in `vendor/openwork/packages/app/src/app/lib/tauri.ts` and `vendor/openwork/packages/desktop/src-tauri/src/commands/misc.rs`.

## Repo Touchpoints
- `vendor/openwork/packages/app/src/app/app.tsx`
- `vendor/openwork/packages/app/src/app/components/mcp-auth-modal.tsx`
- `vendor/openwork/packages/app/src/app/pages/mcp.tsx`
- `vendor/openwork/packages/app/src/app/system-state.ts`
- `vendor/openwork/packages/app/src/app/mcp.ts`
- `vendor/openwork/packages/app/src/app/constants.ts`
- `vendor/openwork/packages/app/src/app/lib/tauri.ts`
- `vendor/openwork/packages/desktop/src-tauri/src/commands/misc.rs`
- `vendor/openwork/packages/app/src/i18n/locales/en.ts`

## Risks & Mitigations
- **Manual reload required**: keep reload gated and explicit; disable the CTA when runs are active to avoid session loss.
- **Polling overhead**: use short-lived polling with backoff and a max timeout.
- **CLI fallback availability**: detect missing OpenCode CLI and reuse existing install guidance.

## Open Questions
- Should OpenWork auto-run `opencode mcp auth` when SDK auth fails, or only offer it as a button?
- Do we need a persistent "OAuth in progress" state across app restarts?
- Should we add a first-class deep link/callback handler instead of manual URL paste for remote clients?
