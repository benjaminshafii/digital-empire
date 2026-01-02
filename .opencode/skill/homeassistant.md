# Home Assistant API Skill

Use this skill when controlling Home Assistant devices, querying states, triggering automations, or interacting with the HA REST API.

## Authentication

**Token Location:** `$HA_TOKEN` environment variable (stored in `.env`)

**How to get a Long-Lived Access Token:**
1. Log into Home Assistant web UI
2. Click your profile (bottom left corner)
3. Go to **Security** tab
4. Scroll to **Long-Lived Access Tokens**
5. Click **Create Token**, name it (e.g., "OpenCode")
6. Copy the token immediately (it won't be shown again)

## API Base

```
Base URL: $HA_URL/api/
Headers:
  Authorization: Bearer $HA_TOKEN
  Content-Type: application/json
```

## Common API Endpoints

### GET Endpoints (Read Data)

| Endpoint | Description |
|----------|-------------|
| `/api/` | Check if API is running |
| `/api/config` | Get HA configuration |
| `/api/states` | Get ALL entity states |
| `/api/states/<entity_id>` | Get single entity state |
| `/api/services` | List all available services |
| `/api/events` | List event types |
| `/api/history/period/<timestamp>?filter_entity_id=<ids>` | Get history |
| `/api/logbook/<timestamp>` | Get logbook entries |
| `/api/calendars` | List calendars |
| `/api/calendars/<entity_id>?start=<ts>&end=<ts>` | Get calendar events |
| `/api/camera_proxy/<entity_id>` | Get camera image |
| `/api/error_log` | Get error logs |

### POST Endpoints (Actions)

| Endpoint | Description |
|----------|-------------|
| `/api/services/<domain>/<service>` | Call a service |
| `/api/states/<entity_id>` | Create/update entity state |
| `/api/events/<event_type>` | Fire an event |
| `/api/template` | Render a template |
| `/api/intent/handle` | Handle voice intent |

### DELETE Endpoints

| Endpoint | Description |
|----------|-------------|
| `/api/states/<entity_id>` | Delete an entity |

## Service Calls (Most Powerful)

The `/api/services/<domain>/<service>` endpoint is the main way to control devices.

### Common Services

**Lights:**
```bash
# Turn on
curl -X POST "$HA_URL/api/services/light/turn_on" \
  -H "Authorization: Bearer $HA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"entity_id": "light.living_room"}'

# Turn on with brightness/color
curl -X POST "$HA_URL/api/services/light/turn_on" \
  -H "Authorization: Bearer $HA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"entity_id": "light.bedroom", "brightness": 128, "rgb_color": [255, 100, 50]}'

# Turn off
curl -X POST "$HA_URL/api/services/light/turn_off" \
  -H "Authorization: Bearer $HA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"entity_id": "light.living_room"}'

# Toggle
curl -X POST "$HA_URL/api/services/light/toggle" \
  -H "Authorization: Bearer $HA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"entity_id": "light.living_room"}'
```

**Switches:**
```bash
curl -X POST "$HA_URL/api/services/switch/turn_on" \
  -H "Authorization: Bearer $HA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"entity_id": "switch.coffee_maker"}'
```

**Climate/Thermostat:**
```bash
# Set temperature
curl -X POST "$HA_URL/api/services/climate/set_temperature" \
  -H "Authorization: Bearer $HA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"entity_id": "climate.living_room", "temperature": 72}'

# Set HVAC mode
curl -X POST "$HA_URL/api/services/climate/set_hvac_mode" \
  -H "Authorization: Bearer $HA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"entity_id": "climate.living_room", "hvac_mode": "heat"}'
```

**Covers/Blinds:**
```bash
curl -X POST "$HA_URL/api/services/cover/open_cover" \
  -H "Authorization: Bearer $HA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"entity_id": "cover.garage_door"}'

curl -X POST "$HA_URL/api/services/cover/set_cover_position" \
  -H "Authorization: Bearer $HA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"entity_id": "cover.blinds", "position": 50}'
```

**Locks:**
```bash
curl -X POST "$HA_URL/api/services/lock/lock" \
  -H "Authorization: Bearer $HA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"entity_id": "lock.front_door"}'
```

**Media Players:**
```bash
curl -X POST "$HA_URL/api/services/media_player/play_media" \
  -H "Authorization: Bearer $HA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"entity_id": "media_player.living_room", "media_content_id": "spotify:playlist:xyz", "media_content_type": "playlist"}'

curl -X POST "$HA_URL/api/services/media_player/volume_set" \
  -H "Authorization: Bearer $HA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"entity_id": "media_player.living_room", "volume_level": 0.5}'
```

**Vacuum:**
```bash
curl -X POST "$HA_URL/api/services/vacuum/start" \
  -H "Authorization: Bearer $HA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"entity_id": "vacuum.roborock"}'
```

**Automations:**
```bash
# Trigger automation
curl -X POST "$HA_URL/api/services/automation/trigger" \
  -H "Authorization: Bearer $HA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"entity_id": "automation.good_morning"}'

# Turn on/off automation
curl -X POST "$HA_URL/api/services/automation/turn_on" \
  -H "Authorization: Bearer $HA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"entity_id": "automation.motion_lights"}'
```

**Scripts:**
```bash
curl -X POST "$HA_URL/api/services/script/turn_on" \
  -H "Authorization: Bearer $HA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"entity_id": "script.movie_mode"}'
```

**Scenes:**
```bash
curl -X POST "$HA_URL/api/services/scene/turn_on" \
  -H "Authorization: Bearer $HA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"entity_id": "scene.romantic_dinner"}'
```

**Notifications:**
```bash
curl -X POST "$HA_URL/api/services/notify/mobile_app_iphone" \
  -H "Authorization: Bearer $HA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello from OpenCode!", "title": "Test"}'
```

## Query Examples

**Get all states:**
```bash
curl -s "$HA_URL/api/states" \
  -H "Authorization: Bearer $HA_TOKEN" | jq '.[] | {entity_id, state}'
```

**Get specific entity:**
```bash
curl -s "$HA_URL/api/states/light.living_room" \
  -H "Authorization: Bearer $HA_TOKEN" | jq
```

**List all lights:**
```bash
curl -s "$HA_URL/api/states" \
  -H "Authorization: Bearer $HA_TOKEN" | jq '[.[] | select(.entity_id | startswith("light."))]'
```

**Get available services for a domain:**
```bash
curl -s "$HA_URL/api/services" \
  -H "Authorization: Bearer $HA_TOKEN" | jq '.[] | select(.domain == "light")'
```

**Render a template:**
```bash
curl -X POST "$HA_URL/api/template" \
  -H "Authorization: Bearer $HA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"template": "The living room light is {{ states(\"light.living_room\") }}"}'
```

## Entity ID Patterns

| Domain | Pattern | Example |
|--------|---------|---------|
| Lights | `light.<name>` | `light.bedroom_ceiling` |
| Switches | `switch.<name>` | `switch.coffee_maker` |
| Sensors | `sensor.<name>` | `sensor.temperature` |
| Binary Sensors | `binary_sensor.<name>` | `binary_sensor.motion` |
| Climate | `climate.<name>` | `climate.thermostat` |
| Cover | `cover.<name>` | `cover.garage` |
| Lock | `lock.<name>` | `lock.front_door` |
| Media Player | `media_player.<name>` | `media_player.tv` |
| Vacuum | `vacuum.<name>` | `vacuum.roomba` |
| Camera | `camera.<name>` | `camera.front_yard` |
| Automation | `automation.<name>` | `automation.sunrise` |
| Script | `script.<name>` | `script.goodnight` |
| Scene | `scene.<name>` | `scene.movie_time` |
| Person | `person.<name>` | `person.john` |

## Response Codes

| Code | Meaning |
|------|---------|
| 200 | Success (existing entity updated) |
| 201 | Success (new entity created) |
| 400 | Bad request |
| 401 | Unauthorized (bad token) |
| 404 | Entity not found |
| 405 | Method not allowed |

## Tips

1. **Discover entities first:** Run `GET /api/states` to see all available entities
2. **Check services:** Run `GET /api/services` to see what actions are available
3. **Use `?return_response`:** Add to service calls to get response data back
4. **Multiple entities:** Pass array: `{"entity_id": ["light.a", "light.b"]}`
5. **Area targeting:** Use `{"area_id": "living_room"}` instead of entity_id

---

# Ben's Home Setup (casaos.local:8123)

## Lights (16 total)
- `light.ceiling` - Main ceiling light
- `light.hue` - Hue lights
- `light.kitchen_speaker` - Kitchen speaker light
- `light.living_room` - Living room lights
- `light.living_room_lamp` - Living room lamp
- `light.bed` - Bedroom light
- `light.office_lamp` - Office lamp
- `light.back_corner` (friendly_name: bedside)

**Turn all off:** `{"entity_id": "all"}`

## Roborock Q7 Max Vacuum

**Entity:** `vacuum.q7_max`

### Rooms (segment IDs for cleaning)
| Room | Segment ID |
|------|------------|
| Living room | 16 |
| Master bedroom | 18 |
| Guest bedroom | 19 |
| Bathroom | 20 |
| Kitchen | 21 |

### Room Buttons (use these - they work!)
```bash
# Clean specific room - USE button/press, NOT vacuum/send_command
curl -X POST "$HA_URL/api/services/button/press" \
  -H "Authorization: Bearer $HA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"entity_id": "button.q7_max_clean_living_room"}'
```
Available buttons:
- `button.q7_max_clean_living_room`
- `button.q7_max_clean_master_bedroom`
- `button.q7_max_clean_guest_bedroom`
- `button.q7_max_clean_bathroom`
- `button.q7_max_clean_kitchen` (may need HA restart after map update)
- `button.q7_max_full_cleaning`

### Alternative: Clean by segment ID (if button unavailable)
```bash
curl -X POST "$HA_URL/api/services/vacuum/send_command" \
  -H "Authorization: Bearer $HA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"entity_id": "vacuum.q7_max", "command": "app_segment_clean", "params": [21]}'
```

### Fan Speed (suction)
```bash
curl -X POST "$HA_URL/api/services/vacuum/set_fan_speed" \
  -H "Authorization: Bearer $HA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"entity_id": "vacuum.q7_max", "fan_speed": "balanced"}'
```
Options: `quiet`, `balanced`, `turbo`, `max`

### Mop Intensity
```bash
curl -X POST "$HA_URL/api/services/select/select_option" \
  -H "Authorization: Bearer $HA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"entity_id": "select.q7_max_mop_intensity", "option": "high"}'
```
Options: `off`, `low`, `medium`, `high`, `custom_water_flow`

### Return to Dock
```bash
curl -X POST "$HA_URL/api/services/vacuum/return_to_base" \
  -H "Authorization: Bearer $HA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"entity_id": "vacuum.q7_max"}'
```

### Get Room Map (to find segment IDs)
```bash
curl -X POST "$HA_URL/api/services/roborock/get_maps?return_response" \
  -H "Authorization: Bearer $HA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"entity_id": "vacuum.q7_max"}'
```

### Reload Integration (after map changes in Roborock app)
```bash
curl -X POST "$HA_URL/api/services/homeassistant/reload_config_entry" \
  -H "Authorization: Bearer $HA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"entity_id": "vacuum.q7_max"}'
```

### Vacuum Sensors
- `sensor.q7_max_battery` - Battery %
- `sensor.q7_max_status` - Current status
- `sensor.q7_max_current_room` - Room being cleaned
- `sensor.q7_max_cleaning_area` - Current clean area (m²)
- `sensor.q7_max_vacuum_error` - Error state
- `binary_sensor.q7_max_mop_attached` - Mop attached?
- `binary_sensor.q7_max_cleaning` - Currently cleaning?

### Maintenance Sensors
- `sensor.q7_max_main_brush_time_left`
- `sensor.q7_max_side_brush_time_left`
- `sensor.q7_max_filter_time_left`
- `sensor.q7_max_sensor_time_left`

## Media Players
- `media_player.living_room` - HomePod/Speaker
- `media_player.my_pad` - iPad (HomePod?)
- `media_player.lg_webos_tv_oled48b4pua` - LG OLED TV

### Stop Music
```bash
curl -X POST "$HA_URL/api/services/media_player/media_stop" \
  -H "Authorization: Bearer $HA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"entity_id": "media_player.my_pad"}'
```

### Volume
```bash
curl -X POST "$HA_URL/api/services/media_player/volume_set" \
  -H "Authorization: Bearer $HA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"entity_id": "media_player.my_pad", "volume_level": 0.5}'
```

## Scenes (20 total)
- `scene.living_room_rest`
- `scene.living_room_relax`
- `scene.living_room_read`
- ... and 17 more

## Other Entities
- `todo.shopping_list` - Shopping list
- `weather.forecast_home` - Weather
- `person.benjaminshafii` - Ben's location
- `device_tracker.the_best_one` - Device tracker
- `sun.sun` - Sun position

## Switches
- `switch.automation_wake_up` - Wake up automation
- `switch.q7_max_do_not_disturb` - Vacuum DND mode
- `switch.kitchen_presence_motion_sensor_enabled`
