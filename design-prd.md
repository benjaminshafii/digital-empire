# Design PRD

## Goal

Build a collection of hyper-personal applications that serve my family. Access is shared with my wife and potentially my child in the future.

## Principles

- Self-aware: the repo knows it is OpenCode and can retrieve its own source to understand and improve itself.
- Skill-first evolution: self-improvement happens primarily by adding/refining skills instead of hard-coded workflows.
- Self-building: constructs what it needs when it needs it.
- Self-improving and self-fixing: updates docs/prompts/skills and repairs broken states.
- Reconstructable: can rebuild itself from scratch using internal context and external sources.
- Portable: no user-specific data in the repo; credentials live in Bitwarden/env/OS keychain.
- Standards-first: use existing tools/protocols before custom ones.
- Graceful degradation: if access is missing, guide the user to add credentials.
- Multi-user: supports credentialed, specialized versions per family member.
- Open source: shareable and inspectable as-is.

## Access model

- Uses Bitwarden to store and retrieve credentials.
- If a task requires access it doesn’t have, it asks the user to add the credential in the correct Bitwarden folder (AI credentials).
- Each family member can have their own credentialed profile and permissions.

## Repository governance

- Every package/app has its own `AGENTS.md` describing local conventions and workflows.
- The root `AGENTS.md` documents this structure and defines how local guidance overrides global rules.
- `AGENTS.md` files are the canonical, self-describing guide for agent behavior and scope.

## Agent-native architecture

### Core principles

- Parity: anything a user can do in the UI, the agent can do via tools.
- Granularity: tools are atomic primitives; logic stays in prompts.
- Composability: new features are new prompts, not new code.
- Emergent capability: atomic tools allow unanticipated outcomes.
- Prompt is the workflow: natural language defines multi-step flows.

### Tool design rules

- CRUD completeness for every entity.
- Domain tools only for vocabulary anchoring, guardrails, or efficiency.
- Keep primitives available even with shortcuts.
- Prefer dynamic capability discovery when integrating new APIs.

### Completion signals

- Agents explicitly signal completion; avoid heuristic stopping.

### Files as interface

- Prefer file-backed artifacts for inspectable, portable user data.

### Success checklist

- Agent can achieve any UI action.
- Tools are atomic and composable.
- CRUD exists for each entity.
- Unexpected requests can be solved in a loop.
- Completion is explicit.

## Example requests

- “Hey, does Benjamin work on Tuesday?”
  - Connects to her calendar, checks mine, and verifies access.
  - If calendar access is missing, it proposes the next step: connect via API (preferred) or add credentials in the correct Bitwarden folder.
  - If only her calendar is available, it responds with partial info and flags missing access.
- “Hey, add this recipe to the recipe app.”
  - Parses the message, stores it with the recipe skill, and confirms success.
  - If the recipe skill doesn’t exist yet, it proposes a minimal skill or file schema, then re-runs.
  - If access is missing, it asks for credentials or a local file path.
- “Send a Telegram message to X.”
  - Uses the Telegram skill and confirms delivery.
  - If Telegram credentials are missing, it asks to add them in Bitwarden.
  - If “X” is ambiguous, it asks which contact or channel.
- “Download this torrent from here.”
  - Uses the qBittorrent skill and reports progress.
  - If the session is missing, it asks for credentials or host info.
  - If the link is invalid, it requests a new magnet or URL.
- “Hey, how have I been performing in the last 2 weeks on my workout?”
  - Pulls Hevy data and summarizes trends and consistency.
  - If Hevy isn’t connected, it proposes connecting via API or adding credentials.
  - If only partial data exists, it reports what it can and flags gaps.
- “Create a new app to manage my coffee.”
  - Proposes a default deployment and asks: “Do you want to use `coffee.benjaminshafii.com`? (yes/no)”.
  - If no, it asks for a preferred subdomain or suggests alternatives.
  - Once confirmed, it scaffolds the app, deploys, and shares the URL.
