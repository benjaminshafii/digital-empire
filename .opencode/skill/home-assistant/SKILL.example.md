---
name: home-assistant
description: Setup Home Assistant API access with long-lived access token
---

## What you need from the user

1. **Server URL** - e.g., `http://homeassistant.local:8123` or their HA instance URL
2. **Long-lived access token**

## How to get the access token

Tell the user:
> In Home Assistant:
> 1. Click your profile (bottom left)
> 2. Scroll to "Long-Lived Access Tokens"
> 3. Click "Create Token"
> 4. Give it a name (e.g., "opencode")
> 5. Copy the token immediately (it won't be shown again)

## Store credentials

Option 1 - In Bitwarden:
```bash
bw get template item | jq '.name="home-assistant" | .type=1 | .login.username="URL" | .login.password="TOKEN"' | bw encode | bw create item
```

Option 2 - In environment:
```bash
cat >> ~/.bashrc << 'EOF'
export HA_URL="http://homeassistant.local:8123"
export HA_TOKEN="your-long-lived-token"
EOF
```

## API usage

Get all states:
```bash
curl -s -H "Authorization: Bearer $HA_TOKEN" "$HA_URL/api/states"
```

Get specific entity:
```bash
curl -s -H "Authorization: Bearer $HA_TOKEN" "$HA_URL/api/states/light.living_room"
```

Call a service:
```bash
curl -s -X POST -H "Authorization: Bearer $HA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"entity_id": "light.living_room"}' \
  "$HA_URL/api/services/light/turn_on"
```

## Verify setup works

```bash
curl -s -H "Authorization: Bearer $HA_TOKEN" "$HA_URL/api/"
# Should return: {"message": "API running."}
```
