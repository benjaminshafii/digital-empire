---
name: hevy
description: Use the Hevy public API.
---

## Quick Usage (Already Configured)

- Load `HEVY_API_KEY` from `.opencode/skill/hevy/.env`.
- Base URL: `https://api.hevyapp.com`.

### Example request

```bash
curl -H "api-key: $HEVY_API_KEY" "https://api.hevyapp.com/v1/workouts?page=1&pageSize=5"
```

## First-Time Setup (If Not Configured)

1. Check for `.opencode/skill/hevy/.env`. If it does not exist, ask the user to create it.
2. Explain that Hevy Pro is required and the API key comes from `https://hevy.com/settings?developer`.
3. Ask the user to add the API key to the `.env` file:

```bash
HEVY_API_KEY=your_key_here
```

## API Spec

- Full OpenAPI spec: `.opencode/skill/hevy/openapi.json`
