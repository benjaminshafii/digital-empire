# Marketplace Tracker

Simplified FB Marketplace deal finder with Telegram notifications.

## How It Works

1. **Enter a search term** (e.g., "standing desk under $300")
2. The app automatically:
   - Runs `@fb-marketplace` agent to find deals
   - Sends top results to your Telegram group via `@telegram` MCP
   - Saves a full report

## Setup

### 1. Configure Telegram MCP

The app uses [telegram-mcp](https://github.com/chigwell/telegram-mcp) to send notifications.

**Get Telegram API credentials:**
1. Go to [my.telegram.org/apps](https://my.telegram.org/apps)
2. Create an app to get `API_ID` and `API_HASH`
3. Clone and set up telegram-mcp:
   ```bash
   git clone https://github.com/chigwell/telegram-mcp ~/.opencode/mcp/telegram-mcp
   cd ~/.opencode/mcp/telegram-mcp
   uv sync
   uv run session_string_generator.py  # Follow prompts to get session string
   ```

**Set environment variables:**
```bash
export TELEGRAM_API_ID=your_api_id
export TELEGRAM_API_HASH=your_api_hash
export TELEGRAM_SESSION_STRING=your_session_string
```

### 2. Run the Web UI

```bash
cd apps/marketplace-tracker
bun run src/server.ts
# Open http://localhost:3456
```

### 3. Configure in Settings

1. Click ⚙️ Settings
2. Enter your **Telegram Chat ID** (the group where notifications go)
3. Set your **Location** (e.g., `sanfrancisco`, `losangeles`, `nyc`)
4. Save

### 4. Search!

Enter a search term like "Herman Miller Aeron under $500" and click Search.

The app will:
- Search FB Marketplace in your location
- Send top 3-5 deals to your Telegram group
- Save a full report you can view in the UI

## CLI Usage

You can also use the CLI:

```bash
# List searches
bun run src/cli.ts list

# View a report
bun run src/cli.ts show standing-desk

# Run a search again
bun run src/cli.ts run standing-desk
```

## Architecture

```
User enters: "standing desk under $300"
                    │
                    ▼
┌─────────────────────────────────────┐
│  Marketplace Tracker builds prompt  │
│  with @summarize agent              │
└─────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────┐
│  @summarize orchestrates:           │
│    1. @fb-marketplace → find deals  │
│    2. @telegram → send notification │
│    3. Write full report             │
└─────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────┐
│  Results:                           │
│    - Telegram message with top deals│
│    - Full report in UI              │
└─────────────────────────────────────┘
```

## Files

| File | Purpose |
|------|---------|
| `data/config.json` | Telegram chat ID + location |
| `data/searches/*/prompt.md` | Generated prompts |
| `data/searches/*/jobs/*/report.md` | Search results |
| `.opencode/agent/summarize.md` | Glue agent |
| `opencode.json` | MCP server config |

## Requirements

- [OpenCode](https://opencode.ai) CLI
- [tmux](https://github.com/tmux/tmux) for job sessions
- [Bun](https://bun.sh) runtime
- Telegram account with API credentials
