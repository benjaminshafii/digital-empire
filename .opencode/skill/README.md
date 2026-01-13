# OpenCode Skills

Skills are markdown documentation files that OpenCode reads to learn how to use APIs, services, and workflows.

## Structure

```
.opencode/skill/
├── README.md                    # This file
├── <skill-name>/
│   ├── SKILL.md                 # Prompt + usage (tracked)
│   ├── .env.example             # Required env vars (tracked)
│   ├── .env                     # Local credentials (gitignored)
│   ├── load-env.ts              # Validates env + exports config
│   ├── client.ts                # Shared fetch helper
│   ├── first-call.ts            # Minimal auth check
│   └── openapi.json             # Optional API spec
```

Some legacy skills still use `SKILL.example.md` templates; migrate as needed.
Legacy skills may only include `SKILL.md`. When you touch one, add the missing scaffold files if the skill needs credentials or API calls.

## First-Time Setup

After cloning this repo, create a local `.env` from the example and verify access (if the skill includes these files):

```bash
# Example for a skill with API credentials
cp .opencode/skill/<skill-name>/.env.example .opencode/skill/<skill-name>/.env
# Fill in required env vars, then run the minimal check
bun .opencode/skill/<skill-name>/first-call.ts
```

If a skill includes additional example data files (like `torrent-sources.example.json`), copy them to their non-example names in the same folder.

## How Skills Work

1. Skills are loaded when OpenCode starts or when you use the `skill` tool
2. OpenCode reads the markdown and uses it as context for API calls
3. Skills should contain:
   - Quick usage examples (copy/paste ready)
   - API reference
   - Common gotchas
   - First-time setup instructions

## Creating New Skills

```bash
mkdir -p .opencode/skill/<skill-name>
```

Minimum scaffold files:
- `SKILL.md`
- `.env.example`
- `load-env.ts`
- `client.ts`
- `first-call.ts`

Then create `SKILL.md` with this template:

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

## Security

- `SKILL.md` is tracked and should never include secrets
- Store sensitive credentials in `.env` (gitignored) or Bitwarden
- `.env.example` is committed as the credential template
- Never commit API keys, tokens, or passwords to git
- Extra data files with credentials should be gitignored (see `.gitignore`)
