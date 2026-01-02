---
name: bitwarden
description: Setup Bitwarden CLI with API key authentication for persistent vault access
---

## Quick Access (Already Configured)

Get a credential from Bitwarden:
```bash
source ~/.bashrc  # Load BW_CLIENTID and BW_CLIENTSECRET from environment
export BW_SESSION=$(bw unlock --passwordfile ~/.bw_password --raw)
bw list items --search "SERVICE_NAME"
```

Parse credentials (extract username/password):
```bash
# Get as JSON - parse with string manipulation since jq may not be installed
bw list items --search "SERVICE_NAME" | grep -o '"username":"[^"]*"' | head -1 | cut -d'"' -f4
bw list items --search "SERVICE_NAME" | grep -o '"password":"[^"]*"' | head -1 | cut -d'"' -f4
```

## One-liner to get password for a service
```bash
source ~/.bashrc && export BW_SESSION=$(bw unlock --passwordfile ~/.bw_password --raw) && bw list items --search "SERVICE" | grep -o '"password":"[^"]*"' | head -1 | cut -d'"' -f4
```

---

## First-Time Setup (If Not Configured)

### What you need from the user

1. **Email address** - Their Bitwarden account email
2. **API Key** - `client_id` and `client_secret`
3. **Master password** - For unlocking the vault

### How to get the API key

Tell the user:
> Go to https://vault.bitwarden.com → Account Settings → Security → Keys → View API Key
> You'll need to enter your master password, then copy the `client_id` and `client_secret`

### Setup steps

1. Install the CLI:
```bash
npm install -g @bitwarden/cli
```

2. Add credentials to `~/.bashrc`:
```bash
cat >> ~/.bashrc << 'EOF'

# Bitwarden CLI API Key Authentication
export BW_CLIENTID="user.XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
export BW_CLIENTSECRET="XXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
EOF
```

3. Store master password securely:
```bash
echo "users-master-password" > ~/.bw_password
chmod 600 ~/.bw_password
```

4. Login and test:
```bash
source ~/.bashrc
bw login --apikey
export BW_SESSION=$(bw unlock --passwordfile ~/.bw_password --raw)
bw status
```

### Verify setup works

```bash
bw status
# Should show: {"status":"unlocked","userEmail":"..."}
```

## Store a new credential

```bash
# Note: jq may not be installed, so use the web vault for creating new items
# Or install jq first: sudo apt-get install jq
bw get template item | jq '.name="SERVICE" | .type=1 | .login.username="USER" | .login.password="PASS"' | bw encode | bw create item
```

---

## Local Configuration

After cloning this repo, copy this file and add your credentials:

```bash
cp .opencode/skill/bitwarden/SKILL.example.md .opencode/skill/bitwarden/SKILL.md
# Then edit SKILL.md to add your BW_CLIENTID and BW_CLIENTSECRET
```

The `SKILL.md` file is gitignored and contains your actual credentials.
