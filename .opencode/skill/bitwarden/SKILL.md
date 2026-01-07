---
name: bitwarden
description: Setup Bitwarden CLI with API key authentication for persistent vault access
---

## Credential Check

**Before using this skill, run this check to verify the user is fully set up:**

```bash
# Check 1: CLI installed
which bw || echo "CLI not installed"

# Check 2: Credentials in .env
source .env 2>/dev/null && [ -n "$BW_CLIENTID" ] && echo "Client ID: ${BW_CLIENTID:0:20}..." || echo "BW_CLIENTID not set"

# Check 3: Already logged in
bw status 2>/dev/null | grep -o '"status":"[^"]*"' || echo "Not logged in"

# Check 4: Can unlock vault (full test)
source .env && export BW_SESSION=$(echo "$BW_PASSWORD" | bw unlock --raw 2>/dev/null) && bw status 2>/dev/null | grep -o '"status":"unlocked"' && echo "Vault access OK" || echo "Cannot unlock vault"
```

**Quick one-liner to verify everything works:**
```bash
source .env && export BW_SESSION=$(echo "$BW_PASSWORD" | bw unlock --raw 2>/dev/null) && bw list items 2>/dev/null | grep -o '"name":"[^"]*"' | head -3
```

If this returns item names, the user is fully set up. If it fails at any step, guide them through First-Time Setup below.

---

## Environment Setup

Credentials are stored in `.env` (gitignored):
```
BW_CLIENTID=user.XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
BW_CLIENTSECRET=XXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
BW_PASSWORD=your-master-password
```

---

## Quick Usage

### Unlock vault and get a credential
```bash
source .env && \
export BW_SESSION=$(echo "$BW_PASSWORD" | bw unlock --raw) && \
bw list items --search "SERVICE_NAME"
```

### Parse username/password from result
```bash
# Get username
bw list items --search "SERVICE_NAME" | grep -o '"username":"[^"]*"' | head -1 | cut -d'"' -f4

# Get password
bw list items --search "SERVICE_NAME" | grep -o '"password":"[^"]*"' | head -1 | cut -d'"' -f4
```

### One-liner to get password
```bash
source .env && \
export BW_SESSION=$(echo "$BW_PASSWORD" | bw unlock --raw) && \
bw list items --search "SERVICE" | grep -o '"password":"[^"]*"' | head -1 | cut -d'"' -f4
```

### Check vault status
```bash
source .env && bw status
```

---

## Common Gotchas

- `jq` may NOT be installed - use `grep`/`cut` for JSON parsing
- Must `source .env` before every session
- Session expires - re-unlock if you get auth errors
- API key login is separate from unlocking vault

---

## First-Time Setup (If Credentials Missing)

### What you need from the user

1. **Email address** - Bitwarden account email
2. **API Key** - `client_id` and `client_secret`
3. **Master password** - For unlocking the vault

### Step 1: Get the API key

Tell the user:
> 1. Go to https://vault.bitwarden.com
> 2. Click Account Settings (bottom left)
> 3. Go to Security > Keys
> 4. Click "View API Key" (enter master password)
> 5. Copy both `client_id` and `client_secret`

### Step 2: Install CLI (if needed)
```bash
npm install -g @bitwarden/cli
```

### Step 3: Add credentials to .env
```bash
cat >> .env << 'EOF'
# Bitwarden CLI
BW_CLIENTID=user.XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
BW_CLIENTSECRET=XXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
BW_PASSWORD=your-master-password-here
EOF
```

### Step 4: Login with API key
```bash
source .env && bw login --apikey
```

### Step 5: Test it works
```bash
source .env && \
export BW_SESSION=$(echo "$BW_PASSWORD" | bw unlock --raw) && \
bw status
# Should show: {"status":"unlocked","userEmail":"..."}
```

---

## API Reference

| Command | Description |
|---------|-------------|
| `bw login --apikey` | Login with API credentials |
| `bw unlock --raw` | Unlock vault, returns session key |
| `bw list items --search X` | Search for items |
| `bw get item ID` | Get specific item by ID |
| `bw status` | Check login/lock status |
| `bw sync` | Sync vault with server |
