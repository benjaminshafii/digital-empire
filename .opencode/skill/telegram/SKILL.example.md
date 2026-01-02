---
name: telegram
description: Setup Telegram bot for sending notifications and messages
---

## What you need from the user

1. **Bot token** - From @BotFather
2. **Chat ID** - Their personal or group chat ID

## How to create a bot and get token

Tell the user:
> 1. Open Telegram and message @BotFather
> 2. Send `/newbot`
> 3. Choose a name (e.g., "My OpenCode Bot")
> 4. Choose a username (must end in `bot`, e.g., "myopencode_bot")
> 5. BotFather will give you a token like `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`

## How to get chat ID

Tell the user:
> 1. Message your new bot (just say "hi")
> 2. Then I'll fetch your chat ID using the bot API

Get chat ID:
```bash
curl -s "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/getUpdates" | jq '.result[0].message.chat.id'
```

## Store credentials

```bash
cat >> ~/.bashrc << 'EOF'
export TELEGRAM_BOT_TOKEN="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
export TELEGRAM_CHAT_ID="987654321"
EOF
```

Or in Bitwarden:
```bash
bw get template item | jq '.name="telegram-bot" | .type=2 | .notes="CHAT_ID: 123456" | .secureNote.type=0 | .fields=[{"name":"bot_token","value":"TOKEN","type":1},{"name":"chat_id","value":"CHATID","type":0}]' | bw encode | bw create item
```

## API usage

Send a message:
```bash
curl -s -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage" \
  -d "chat_id=$TELEGRAM_CHAT_ID" \
  -d "text=Hello from OpenCode!"
```

Send with markdown:
```bash
curl -s -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage" \
  -d "chat_id=$TELEGRAM_CHAT_ID" \
  -d "parse_mode=Markdown" \
  -d "text=*Bold* and _italic_"
```

## Verify setup works

```bash
curl -s "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/getMe"
# Should return bot info with "ok": true
```
