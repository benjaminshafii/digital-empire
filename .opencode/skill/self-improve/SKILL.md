---
name: self-improve
description: Update skill documentation and extend OpenCode capabilities based on learnings
---

## Who I Am

I am **OpenCode** - a powerful AI coding agent built for the terminal by SST. I run as a TUI (Terminal User Interface) and have access to an extensible system of:

- **Skills** - Markdown docs I read to learn how to use APIs/services (`.opencode/skill/`)
- **Agents** - Specialized AI assistants for specific tasks (`.opencode/agent/`)
- **Plugins** - JavaScript/TypeScript hooks into my events (`.opencode/plugin/`)
- **Custom Tools** - Functions I can call during conversations (`.opencode/tool/`)
- **MCP Servers** - External tools via Model Context Protocol

I should use this knowledge to extend my own capabilities when needed.

---

## Self-Improvement Triggers

Update documentation immediately when:

1. **API behavior differs from docs** - e.g., endpoint requires different format
2. **Commands fail** - document the fix and correct syntax
3. **New workflow discovered** - add it to the skill
4. **Missing information** - add credentials location, gotchas, etc.
5. **User confirms something works** - lock in the correct approach
6. **Repeated task** - if I do something twice, make it a skill/tool

---

## What I Can Extend

### 1. Skills (Markdown Docs)
**Location:** `.opencode/skill/<name>/SKILL.md`
**Purpose:** Reference docs I read to learn APIs, credentials, workflows
**When to use:** New service integration, API docs, multi-step workflows

```
.opencode/skill/
├── bitwarden/SKILL.md      # Credential management
├── qbittorrent/SKILL.md    # Torrent downloads
├── telegram/SKILL.md       # Notifications
├── home-assistant/SKILL.md # Smart home
└── self-improve/SKILL.md   # This file
```

### 2. Agents (Specialized AI)
**Location:** `.opencode/agent/<name>.md`
**Purpose:** Focused assistants with custom prompts/models/tools
**When to use:** Recurring specialized tasks, different model needs

```markdown
# .opencode/agent/code-reviewer.md
---
description: Reviews code for best practices and potential issues
mode: subagent
model: anthropic/claude-sonnet-4-20250514
tools:
  write: false
  edit: false
---
You are a code reviewer. Focus on security, performance, and maintainability.
```

**Built-in agents:**
- `build` - Primary agent with all tools (default)
- `plan` - Analysis without making changes
- `general` - Subagent for research and multi-step tasks
- `explore` - Fast subagent for codebase exploration

**Invoke with:** `@agent-name` in messages, or Tab to switch primary agents

### 3. Plugins (Event Hooks)
**Location:** `.opencode/plugin/<name>.js` or `.ts`
**Purpose:** Hook into my events, modify behavior, add tools
**When to use:** Notifications, protections, custom integrations

```typescript
// .opencode/plugin/notification.js
export const NotificationPlugin = async ({ project, client, $, directory, worktree }) => {
  return {
    event: async ({ event }) => {
      if (event.type === "session.idle") {
        await $`notify-send "OpenCode" "Task completed!"`
      }
    },
  }
}
```

**Available events:**
- `session.idle`, `session.created`, `session.error`
- `tool.execute.before`, `tool.execute.after`
- `file.edited`, `message.updated`
- `permission.replied`

### 4. Custom Tools (Functions I Can Call)
**Location:** `.opencode/tool/<name>.ts`
**Purpose:** New capabilities beyond built-in tools
**When to use:** External APIs, complex operations, reusable functions

```typescript
// .opencode/tool/database.ts
import { tool } from "@opencode-ai/plugin"

export default tool({
  description: "Query the project database",
  args: {
    query: tool.schema.string().describe("SQL query to execute"),
  },
  async execute(args) {
    // Implementation here
    return `Executed: ${args.query}`
  },
})
```

**Can invoke any language:**
```typescript
// .opencode/tool/python-script.ts
async execute(args) {
  const result = await Bun.$`python3 script.py ${args.input}`.text()
  return result.trim()
}
```

### 5. MCP Servers (External Tools)
**Location:** `opencode.json`
**Purpose:** Connect to external tool servers
**When to use:** Pre-built integrations, complex external services

```json
{
  "mcp": {
    "browser": {
      "command": "npx",
      "args": ["@anthropic-ai/mcp-server-puppeteer"]
    }
  }
}
```

---

## Decision Tree: What Should I Create?

```
Need to extend my capabilities?
│
├─ Just need reference docs/commands?
│  └─ Create a SKILL (.opencode/skill/<name>/SKILL.md)
│
├─ Need a specialized AI persona/workflow?
│  └─ Create an AGENT (.opencode/agent/<name>.md)
│
├─ Need to hook into my events/modify behavior?
│  └─ Create a PLUGIN (.opencode/plugin/<name>.ts)
│
├─ Need a new callable function/API?
│  └─ Create a TOOL (.opencode/tool/<name>.ts)
│
└─ Need complex external integration?
   └─ Add an MCP SERVER (opencode.json)
```

---

## Skill Maintenance

### Update immediately when:
- API format is wrong (like `-d` vs `-F` for curl)
- Commands fail and I find the fix
- User confirms something works
- I discover a better approach

### Key sections to maintain:
```markdown
## Quick Usage (Already Configured)
# Most common commands - copy/paste ready

## Common Gotchas
# Things that don't work as expected

## API Reference
# Endpoints, parameters, return values

## First-Time Setup
# Only needed once, keep at bottom
```

### Rules:
1. **Update immediately** - Don't wait until end of conversation
2. **Keep it copy/paste ready** - Commands should work as-is
3. **Document the "why"** - Explain gotchas, not just the fix
4. **Test before documenting** - Only add confirmed working commands
5. **Remove outdated info** - Delete commands that don't work

---

## Creating New Skills

```bash
mkdir -p .opencode/skill/<skill-name>
```

Template:
```markdown
---
name: skill-name
description: One-line description
---

## Quick Usage (Already Configured)

### Action 1
\`\`\`bash
command here
\`\`\`

## Common Gotchas

- Thing that doesn't work as expected

## First-Time Setup (If Not Configured)

### What you need from the user
1. ...
```

---

## Creating New Agents

```bash
mkdir -p .opencode/agent
```

Template:
```markdown
---
description: What this agent does
mode: subagent  # or "primary"
model: anthropic/claude-sonnet-4-20250514
temperature: 0.3
tools:
  write: false
  edit: false
  bash: false
---

You are a [role]. Focus on:
- Task 1
- Task 2
```

---

## Creating New Tools

```bash
mkdir -p .opencode/tool
```

Template:
```typescript
import { tool } from "@opencode-ai/plugin"

export default tool({
  description: "What this tool does",
  args: {
    param: tool.schema.string().describe("Parameter description"),
  },
  async execute(args, context) {
    // Implementation
    return "result"
  },
})
```

---

## Examples of Self-Improvement

### Example 1: Fix incorrect API format
**Before:** `curl -d "urls=..."`  
**After:** `curl -F "urls=..."` (multipart/form-data required)

### Example 2: Add missing gotcha
```markdown
## Common Gotchas

- `jq` is NOT installed - use grep/cut for JSON parsing
- "Fails." response means duplicate, not error
```

### Example 3: Create agent for repeated task
If I keep doing code reviews, create `.opencode/agent/review.md`

### Example 4: Create tool for API I use often
If I keep calling the same API, create `.opencode/tool/api-name.ts`
