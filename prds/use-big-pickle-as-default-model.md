# Use Big-Pickle as Default Model

## Summary
Standardize the default model selection on `opencode/big-pickle` across OpenWork, ensuring first-run sessions, fallbacks, and empty-provider states consistently resolve to big-pickle.

## Problem
- Default model selection can vary across sessions if no provider models are available or local storage is empty.
- The UI needs a clear, consistent fallback when providers are disconnected or missing.

## Goals
1. Use `opencode/big-pickle` as the default model everywhere a default is required.
2. Ensure first-run initialization persists the default model preference.
3. Keep the model picker fallback row aligned with the default model.

## Non-Goals
- Changing how users override the default model.
- Adjusting model costs or provider availability logic.
- Introducing new providers or model metadata.

## Functional Requirements
- The global default model constant is `providerID: opencode`, `modelID: big-pickle`.
- When no stored default exists, OpenWork sets and persists big-pickle as the default.
- The model picker fallback entry uses big-pickle when no providers are connected.
- Sessions without explicit model selection should resolve to big-pickle.

## UX/Flows
1. Fresh install with no stored default: big-pickle is selected and stored on first load.
2. No providers connected: model picker shows big-pickle as the fallback row.
3. New session with no override: prompts send using big-pickle.

## Technical Considerations (Design Only)
- Default model is defined in `DEFAULT_MODEL` and used by model selection logic.
- Default model preference persists via `MODEL_PREF_KEY` in localStorage.
- The model picker fallback entry should mirror the default model constant.
- Use `DEFAULT_MODEL` as the single source of truth; avoid duplicating the model string elsewhere.
- Reuse `formatModelRef`/`parseModelRef` for persistence and comparisons.

## Repo Touchpoints
- Default constant definition: `vendor/openwork/src/app/constants.ts`.
- Default model initialization + persistence: `vendor/openwork/src/app/app.tsx`.
- Session model resolution + fallback: `vendor/openwork/src/app/app.tsx`.
- Model picker fallback row when providers are missing: `vendor/openwork/src/app/app.tsx`.
- Default model display in settings/dashboard: `vendor/openwork/src/app/pages/settings.tsx`, `vendor/openwork/src/app/pages/dashboard.tsx`.
- Model ref parse/format helpers: `vendor/openwork/src/app/utils/index.ts`.

## Risks & Mitigations
- **Provider mismatch**: If opencode provider is unavailable, keep the fallback row but show disconnected state.
- **User confusion**: Always display the provider/model label in settings and dashboard.

## Open Questions
- Should we label big-pickle as “Default” in the model picker even when no providers are connected?
