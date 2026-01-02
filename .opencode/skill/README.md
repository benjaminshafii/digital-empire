# OpenCode Skills

Skills are markdown documentation files that OpenCode reads to learn how to use APIs, services, and workflows.

## Structure

```
.opencode/skill/
├── README.md                    # This file
├── self-improve/
│   └── SKILL.md                 # Meta-skill for self-improvement (no credentials)
├── bitwarden/
│   ├── SKILL.example.md         # Template (committed to git)
│   └── SKILL.md                 # Your config with credentials (gitignored)
├── qbittorrent/
│   ├── SKILL.example.md         # Template (committed to git)
│   ├── SKILL.md                 # Your config with credentials (gitignored)
│   ├── torrent-sources.example.json
│   └── torrent-sources.json     # Your sources (gitignored)
├── telegram/
│   └── SKILL.md                 # (gitignored - contains bot token)
├── home-assistant/
│   └── SKILL.md                 # (gitignored - contains access token)
└── setup/
    └── SKILL.md                 # General setup notes
```

## First-Time Setup

After cloning this repo, copy the example files and add your credentials:

```bash
# Bitwarden
cp .opencode/skill/bitwarden/SKILL.example.md .opencode/skill/bitwarden/SKILL.md
# Edit SKILL.md to add your BW_CLIENTID and BW_CLIENTSECRET

# qBittorrent  
cp .opencode/skill/qbittorrent/SKILL.example.md .opencode/skill/qbittorrent/SKILL.md
cp .opencode/skill/qbittorrent/torrent-sources.example.json .opencode/skill/qbittorrent/torrent-sources.json

# Telegram (if needed)
# Create .opencode/skill/telegram/SKILL.md with your bot token

# Home Assistant (if needed)
# Create .opencode/skill/home-assistant/SKILL.md with your access token
```

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

- `SKILL.md` files are gitignored because they may contain credentials
- `SKILL.example.md` files are committed as templates
- Never commit API keys, tokens, or passwords to git
- Store sensitive credentials in Bitwarden and reference them in skills
