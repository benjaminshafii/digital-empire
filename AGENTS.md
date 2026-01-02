# AGENTS.md

## Motivation

AI models are good at running for long periods of time and executing more complex tasks.

It's now possible to do more than ever from fewer interfaces. From completing painful government tax software to finding deals on Facebook Marketplace. Many of these workflows are still hard or impossible to automate from large remote servers.

A lot of these tasks require highly sensitive credentials.

Running long-lived tasks on equivalent remote servers is ~8-10x more expensive on a yearly basis.

**Being productive in 2026 will be about:**
- Spending more time thinking and writing
- Spending less time clicking and context switching
- Creating self-improving systems

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

---

## Constraints

- Runs at home
- Can execute authenticated browsers for tasks without APIs
- Can be secured
- Accessible from outside the local network
- Multi-user
- Designed primarily for high-trust users
- Supervisor system to keep tasks alive
- Task scheduling

---

## Future Planning

- Prepare for distributed local LLMs
- Add a voice-first interface to control the system while on the move

---

## Unsure Aspects

- How isolated services should be (Docker vs native processes, especially on macOS where Docker may be constraining)

---

## Examples

- Deploying a simple SES email service and testing it end-to-end without human intervention
- Sending the robot vacuum to the kitchen at regular intervals
- Finding deals on Facebook Marketplace and notifying via Telegram

---

## Starting Point Technologies

**Software**
- OpenCode (primarily via plugins)
- Chrome MCP server
- Claude Opus 4.5 as the main driver
- Prepare for local models

**Hardware**
- Mac Studio (self-reference via AGENTS.md)

---

## Workflow Philosophy

**The prompt is the workflow.** Workflows are defined purely in natural language prompts with `@agent` tags. OpenCode handles all orchestration - running agents in sequence or parallel, passing data between them, background execution, retries.

**Example workflow (entire definition):**
```markdown
---
schedule: "0 9 * * *"
---

@fb-marketplace Find standing desks under $300 in SF
@telegram Send me the top 3 deals
```

No code. No DAGs. No YAML pipelines. The prompt *is* the source of truth.

---

## Build/Test Commands

- Package manager: `pnpm` (monorepo with Turborepo)
- Blog: `pnpm --filter @digital-empire/blog dev|build`
- Portfolio: `pnpm --filter @digital-empire/portfolio dev|build`
- Obsidian plugin: `pnpm --filter @digital-empire/obsidian-plugin build|test`
- Run single test: `pnpm --filter @digital-empire/obsidian-plugin vitest run src/services/<file>.test.ts`

Use the Playwright MCP to test the web apps.

## Code Style

- TypeScript strict mode with `strictNullChecks`
- Use `import type { X }` for type-only imports
- 2-space indentation, double quotes, semicolons
- PascalCase: components/classes/types; camelCase: functions/variables; SCREAMING_SNAKE_CASE: constants
- File names: kebab-case for non-components

## Error Handling

- Custom error classes extending `Error` with descriptive names
- Always check `error instanceof Error ? error.message : "Unknown error"`

## Testing (Vitest)

- Test files: `*.test.ts` co-located with source in `src/services/`
- Globals enabled: use `describe`, `it`, `expect`, `vi` without imports
- Use `vi.fn()` for mocks, `vi.mock()` for modules, factory functions for test objects
- Pattern: `beforeEach` for setup, `afterEach` with `vi.restoreAllMocks()`
