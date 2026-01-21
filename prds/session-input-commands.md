# Session Input Commands

## Summary
Introduce slash commands in the session input (starting with `/models`), upgrade the input bar to a multiline composer, and improve AI message rendering with markdown-aware code blocks. The goal is to make power actions discoverable, reduce friction in long prompts, and improve readability of assistant output.

## Problem
- The current prompt input is single-line, limiting long or structured instructions.
- Model switching is hidden behind a button and lacks a fast, keyboard-driven entry.
- AI responses render as plain text, so markdown and code blocks are hard to scan.

## Goals
1. Add a slash command system starting with `/models`.
2. Provide autocomplete UX for slash commands.
3. Make the input bar multiline with sensible submit behavior.
4. Render assistant markdown with styled code blocks.
5. When invoking `/models`, focus the model selector search input immediately and keep it snappy.

## Non-Goals
- Redesigning the entire session layout.
- Implementing advanced prompt templates or macros.
- Changing the underlying session prompt API format.

## User Stories
1. As a user, I can type `/models` to open the model picker without using the mouse, with the search box focused.
2. As a user, I can write multi-line prompts with Shift+Enter and send with Enter.
3. As a user, I can read assistant responses with syntax-highlighted code blocks.

## Functional Requirements
### Slash Commands
- The input recognizes `/`-prefixed commands.
- Initial command: `/models` opens the model picker.
- Command suggestions appear as the user types `/` (autocomplete feel, keyboard navigable).
- Commands should not be sent to the backend as normal text; they trigger UI actions.
- Include `/help` and `/clear` in the command list, even if the behaviors ship later.
- When `/models` is selected, the model picker opens and the search input is focused in the same tick.

### Multiline Input
- Replace the single-line input with a multiline composer (textarea or contenteditable).
- Enter submits by default; Shift+Enter inserts a newline.
- Input height should grow up to a reasonable max before scrolling.

### Markdown Rendering for Assistant Messages
- Assistant text parts render markdown (headings, lists, inline code, links).
- Code blocks render with a distinct background, monospace font, and horizontal scroll.
- Preserve plain text rendering for user messages.

## UX/Flows
1. User types `/` and sees a small suggestion menu above the input.
2. Autocomplete highlights `/models`; Enter selects it and opens the model picker.
3. The model picker search input is focused immediately so the user can type without delay.
4. User writes a multi-line prompt; Shift+Enter adds a line; Enter sends.
5. Assistant responds with markdown; code blocks appear styled and readable.

## Technical Considerations (Design Only)
- Add command parsing in the session input layer before `sendPromptAsync`.
- Wire `/models` to `openSessionModelPicker`.
- Use the existing model list and query logic from the model picker state.
- Introduce a markdown renderer in `PartView` for assistant text parts only.
- Keep command definitions, suggestion data, and input key handling colocated in `vendor/openwork/src/app/pages/session.tsx`.
- Focus the model picker input inside `vendor/openwork/src/app/components/model-picker-modal.tsx` when the modal opens.
- Avoid new global stores; reuse existing prompt and model picker state.
- Prefer a lightweight markdown/codeblock renderer scoped to `PartView` over a shared global renderer.

## Repo Touchpoints
- Session input UI + key handling: `vendor/openwork/src/app/pages/session.tsx`.
- Prompt send flow: `vendor/openwork/src/app/app.tsx` (sendPrompt, prompt state).
- Model picker modal + query: `vendor/openwork/src/app/components/model-picker-modal.tsx`.
- Message rendering: `vendor/openwork/src/app/components/part-view.tsx`.

## Risks & Mitigations
- **Command collisions with normal text**: only treat `/` at the start of input as a command.
- **Accidental submits in multiline input**: show a hint or subtle UI cue for Shift+Enter.
- **Markdown rendering regressions**: scope to assistant messages and sanitize output.

## Open Questions
- Should command suggestions include future commands (e.g., `/help`, `/clear`)?
- Should `/models` also accept an optional search query (e.g., `/models gpt`)?
- Should markdown rendering include syntax highlighting or stay neutral?
