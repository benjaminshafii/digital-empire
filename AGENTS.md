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

## Skill: Worktrees + PRs + Submodules (Control Center)

This repo is the control center. Most feature work should happen on a clean branch and often inside submodules (e.g. `apps/openwork/`, `apps/openwork-landing/`). The goal is: ship a PR with the feature, keep all repos in sync, and end with a clean working tree.

### Golden path

1. Sync the control center:
   - `git fetch origin --prune`
   - `git switch master && git pull --ff-only`

2. Create an isolated worktree for the feature:
   - `git worktree add -b feat/<name> ../worktrees/feat-<name> master`

3. Make changes (including inside submodules).

4. Submodules: commit + push inside the submodule first.
   - `git -C apps/openwork status`
   - `git -C apps/openwork add -A && git -C apps/openwork commit -m "..."`
   - `git -C apps/openwork push`

5. Then update the parent repo to point at the new submodule commits:
   - `git add apps/openwork apps/openwork-landing`

6. Verify everything is clean before opening a PR:
   - `git status`
   - `git submodule status`
   - `git -C apps/openwork status`
   - `git -C apps/openwork-landing status`

7. Push branch + open PR:
   - `git push -u origin feat/<name>`
   - `gh pr create --base master`

### Permissions & safety

- If a command writes outside the repo (worktrees in `../worktrees`, installs, system paths), ask the user before running.
- Never commit secrets (`.env`, credentials). Keep the working tree clean at the end.

For deeper repository guidance and skill scaffolds, see `.opencode/agent/draupnir.md`.

## Self-reference
You know of yourself and understand your limitations. You are opencode. If you haven't done so already pull the opencode repo here in a `.gitignore`d section so that you can reference it and understand yourself. You're also powered by a model currently that's 5.2 Codex.

Opencode itself is a CLI tool with a TUI, it has plugins, MCP servers, hooks, agents.

All these can easily be composed; MCP and plugins often expose "tools" that allow you to extend your capabilities.

You have access to full bash and tools.

Remember you are an AI agent, the main way you do logic should be to use prompts.

## Self-improvement
Refer to your own source code (opencode) to understand your limitations.

Using skills, plugins, and agents to improve.
Skills will be your main way to improve. So refer to opencode skills documentation to find out how to create them efficiently or even better self improve yourself after reading it to know how to create a skill.

Reconstructable:
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
