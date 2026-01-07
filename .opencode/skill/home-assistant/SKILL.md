---
name: home-assistant
description: Control Home Assistant devices via REST API
---

## Credential Check

**Before using this skill, verify credentials are configured:**
```bash
source .env && echo "HA URL: $HA_URL" && echo "Token: ${HA_TOKEN:0:10}..."
```

If this shows nothing or errors, guide the user through First-Time Setup below.

---

## Environment Setup

Credentials are stored in `.env` (gitignored):
```
HA_URL=http://homeassistant.local:8123
HA_TOKEN=your-long-lived-access-token
```

---

## Quick Usage

### Check API is running
```bash
source .env && curl -s -H "Authorization: Bearer $HA_TOKEN" "$HA_URL/api/"
# Should return: {"message": "API running."}
```

### Get all entity states
```bash
source .env && curl -s -H "Authorization: Bearer $HA_TOKEN" "$HA_URL/api/states" | head -100
```

### Get specific entity
```bash
source .env && curl -s -H "Authorization: Bearer $HA_TOKEN" "$HA_URL/api/states/light.living_room"
```

### Turn on a light
```bash
source .env && curl -s -X POST -H "Authorization: Bearer $HA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"entity_id": "light.living_room"}' \
  "$HA_URL/api/services/light/turn_on"
```

### Turn off a light
```bash
source .env && curl -s -X POST -H "Authorization: Bearer $HA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"entity_id": "light.living_room"}' \
  "$HA_URL/api/services/light/turn_off"
```

### Toggle a light
```bash
source .env && curl -s -X POST -H "Authorization: Bearer $HA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"entity_id": "light.living_room"}' \
  "$HA_URL/api/services/light/toggle"
```

---

## Common Services

### Lights
```bash
# Turn on with brightness
curl -s -X POST -H "Authorization: Bearer $HA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"entity_id": "light.bedroom", "brightness": 128}' \
  "$HA_URL/api/services/light/turn_on"
```

### Switches
```bash
curl -s -X POST -H "Authorization: Bearer $HA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"entity_id": "switch.coffee_maker"}' \
  "$HA_URL/api/services/switch/turn_on"
```

### Climate
```bash
curl -s -X POST -H "Authorization: Bearer $HA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"entity_id": "climate.thermostat", "temperature": 72}' \
  "$HA_URL/api/services/climate/set_temperature"
```

### Vacuum
```bash
curl -s -X POST -H "Authorization: Bearer $HA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"entity_id": "vacuum.roborock"}' \
  "$HA_URL/api/services/vacuum/start"
```

### Scenes
```bash
curl -s -X POST -H "Authorization: Bearer $HA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"entity_id": "scene.movie_mode"}' \
  "$HA_URL/api/services/scene/turn_on"
```

---

## Entity ID Patterns

| Domain | Pattern | Example |
|--------|---------|---------|
| Lights | `light.<name>` | `light.bedroom_ceiling` |
| Switches | `switch.<name>` | `switch.coffee_maker` |
| Sensors | `sensor.<name>` | `sensor.temperature` |
| Climate | `climate.<name>` | `climate.thermostat` |
| Vacuum | `vacuum.<name>` | `vacuum.roomba` |
| Scene | `scene.<name>` | `scene.movie_time` |

---

## First-Time Setup (If Credentials Missing)

### What you need from the user

1. **Home Assistant URL** - e.g., `http://homeassistant.local:8123`
2. **Long-lived access token**

### Step 1: Get the access token

Tell the user:
> 1. Open Home Assistant web UI
> 2. Click your profile (bottom left corner)
> 3. Go to **Security** tab
> 4. Scroll to **Long-Lived Access Tokens**
> 5. Click **Create Token**, name it (e.g., "OpenCode")
> 6. Copy the token immediately (it won't be shown again!)

### Step 2: Add credentials to .env
```bash
cat >> .env << 'EOF'
# Home Assistant
HA_URL=http://homeassistant.local:8123
HA_TOKEN=your-long-lived-token-here
EOF
```

### Step 3: Test it works
```bash
source .env && curl -s -H "Authorization: Bearer $HA_TOKEN" "$HA_URL/api/"
# Should return: {"message": "API running."}
```

---

## API Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/` | GET | Check API status |
| `/api/states` | GET | Get all entity states |
| `/api/states/<entity_id>` | GET | Get single entity |
| `/api/services/<domain>/<service>` | POST | Call a service |
| `/api/services` | GET | List available services |

## Response Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 401 | Unauthorized (bad/expired token) |
| 404 | Entity not found |
