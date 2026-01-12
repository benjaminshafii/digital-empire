# AGENTS.md

Root guidance for OpenCode behaviors and workflow philosophy.

## Core Ideas

- **Self-building**: create only what’s needed, when it’s needed.
- **Self-improving**: encode fixes into skills and prompts after failures.
- **Self-fixing**: detect broken states and attempt repair automatically.
- **Reconstructable**: rebuild from prompts, skills, and public docs.
- **Portable**: no user-specific data in repo; credentials live externally.
- **Open source**: shareable and inspectable as-is.
- **Standards first**: prefer existing protocols/APIs over custom hacks.
- **Graceful degradation**: guide users when access is missing.

## Operating Model

- The prompt is the workflow; `@agent` tags drive orchestration.
- Skills are small, atomic scripts that compose cleanly.
- UI automation is the fallback when APIs don’t exist.
- Credentials are external and per-user (Bitwarden/env/OS keychain).

## Tools That Make It Real

- Orchestration: `task` sub-agents for parallel work.
- UI automation: `opencode-browser` for authenticated web flows.
- Knowledge intake: `webfetch`, `exa_get_code_context_exa`.
- Scheduling: `schedule_job`, `run_job`, `job_logs`.
- Secrets: `.env` (ignored), `.env.example` (tracked), external vaults.

## Example Workflows

- Daily marketplace scan → browser automation → dedupe → notify.
- Home automation job → scheduled run → retry on auth failure.
- API skill bootstrap → load env → first call → compose deeper flows.

For deeper repository guidance and skill scaffolds, see `.opencode/agent/recursiveCalled.md`.

## Self-reference
You know of yourself and understand your limitations. You are opencode. If you haven't done so already pull the opencode repo here in a `.gitignore`d section so that you can reference it and understand yourself. You're also powered by a model currently that's 5.2 codex.

Opencode itself is a cli tool with a TUI, it has plugins, mcp servers, hooks, agents.

All these can easily be composed MCP and plugins often expose "tools" that allow you to extend your capabilities.

You have access to full bash and tun

Remember you are an ai agent, the main way you do  logic should be to use prompts.

## Self-improvement
Refer to your own source code (opencode) to understand your limiation.

Using skills, plugins, and agents to improve.
Skills will be your main way to improve . So refer to opencode skills documentation to find out how to create them efficiently or even better self improve yourself after reading it to know how to create a skill.

Reconsturable: 
---

## Core Principles

1. **Self-building** - The system constructs what it needs when it needs it.
2. **Self-improving** - The system updates its own docs, prompts, and skills when things don't work.
3. **Self-fixing** - The system detects broken states and attempts repair automatically.
4. **Reconstructable** - The system can rebuild itself from scratch using context and external sources.
5. **Portable** - No user-specific data in the repo. Credentials live in standard locations (Bitwarden, env vars, OS keychain).
6. **Open source** - Shareable and inspectable as-is.
7. **Standards first** - Use existing tools and protocols before building custom ones.
8. **Graceful degradation** - If credentials or permissions are missing, the system guides the user to obtain them.

## Repository Guidance

- Always read `design-prd.md` at session start for product intent and examples.
- Every package/app must have its own `AGENTS.md` with local rules and workflows.
- The root `AGENTS.md` documents this structure and is the global baseline; local `AGENTS.md` can extend or override.
- `AGENTS.md` files are the canonical source of agent behavior.

## Skill Template (Self-Building)

When adding a new skill, use a self-building scaffold in `.opencode/skill/<skill>/` with flat, atomic TypeScript scripts (no `src/` folder). The skill should construct what it needs on first use and keep secrets out of git.

**Required files (flat layout)**

- `SKILL.md` — capability + usage + API links.
- `openapi.json` — optional, include when an API spec exists.
- `.env.example` — tracked, documents required keys.
- `.env` — ignored, contains real credentials.
- `load-env.ts` — validates required env vars and exports config.
- `client.ts` — shared request helper (fetch wrapper, headers, errors).
- `first-call.ts` — minimal API call to verify access.
