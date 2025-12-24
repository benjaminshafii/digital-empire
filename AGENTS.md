# AGENTS.md

## openjob & marketplace-tracker Philosophy

**The prompt is the workflow.** Workflows are defined purely in natural language prompts with `@agent` tags. OpenCode handles all orchestration - running agents in sequence or parallel, passing data between them, background execution, retries.

openjob is just infrastructure: scheduling (cron), persistence (save prompts, track job history), and UI (TUI/web). It doesn't define what agents output or how they communicate - that's all in the prompt.

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

Use the playwright mcp to test the web apps.

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
