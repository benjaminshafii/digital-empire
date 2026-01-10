---
name: qbittorrent
description: Manage qBittorrent Web UI end-to-end (add, monitor, control torrents)
---

## Credential Check

**Before using this skill, verify credentials are configured:**
```bash
source .env && echo "QB URL: $QB_URL" && echo "User: $QB_USER"
```

If this shows nothing or errors, guide the user through First-Time Setup below.

---

## Environment Setup

Credentials are stored in `.env` (gitignored):
```
QB_URL=http://localhost:8080
QB_USER=admin
QB_PASS=your-password
```

---

## Torrent Sources (Vanilla)

The tracked, portable template is `.opencode/skill/qbittorrent/torrent-sources.example.json`.

During setup, copy it to `.opencode/skill/qbittorrent/torrent-sources.json` (gitignored) and customize it for your environment:
```bash
cp .opencode/skill/qbittorrent/torrent-sources.example.json .opencode/skill/qbittorrent/torrent-sources.json
```

List the configured sources:
```bash
jq -r '.sources[] | "\(.name)\t\(.url)\(.searchPath)"' .opencode/skill/qbittorrent/torrent-sources.json
```

---

## Quick Usage

### End-to-end flow

1. Pick a source from `.opencode/skill/qbittorrent/torrent-sources.json` (create it from the example if missing) and grab a magnet link or `.torrent` file from the official page.
2. Login to the Web API (stores a `SID` cookie in `/tmp/qb.txt`).
3. Add the torrent (magnet or `.torrent`).
4. Monitor progress/state until complete.

### Login and store session
```bash
source .env && curl -s -c /tmp/qb.txt -b /tmp/qb.txt \
  "$QB_URL/api/v2/auth/login" \
  -d "username=$QB_USER&password=$QB_PASS"
```

### Add a magnet link
```bash
# IMPORTANT: Must use -F (multipart/form-data), NOT -d!
curl -s -c /tmp/qb.txt -b /tmp/qb.txt \
  "$QB_URL/api/v2/torrents/add" \
  -F "urls=magnet:?xt=urn:btih:HASH&dn=NAME"
```

### Add a .torrent file
```bash
curl -s -c /tmp/qb.txt -b /tmp/qb.txt \
  "$QB_URL/api/v2/torrents/add" \
  -F "torrents=@/path/to/file.torrent"
```

**Response meanings:**
- `Ok.` = Successfully added
- `Fails.` = Torrent already exists (duplicate) - NOT an error!

### Add with save path and category
```bash
curl -s -c /tmp/qb.txt -b /tmp/qb.txt \
  "$QB_URL/api/v2/torrents/add" \
  -F "urls=MAGNET_LINK" \
  -F "savepath=/downloads/movies" \
  -F "category=movies"
```

### List all torrents
```bash
curl -s -b /tmp/qb.txt "$QB_URL/api/v2/torrents/info"
```

### Check torrent status by hash
```bash
curl -s -b /tmp/qb.txt "$QB_URL/api/v2/torrents/info?hashes=HASH_LOWERCASE"
```

### Latest torrent + completion
```bash
curl -s -b /tmp/qb.txt "$QB_URL/api/v2/torrents/info" | jq -r '
  if length==0 then "No torrents"
  else (sort_by(.added_on) | last) as $t
  | "name=\($t.name)\nhash=\($t.hash)\nstate=\($t.state)\nprogress=\($t.progress)\nadded_on=\($t.added_on)\ncompletion_on=\($t.completion_on)\nsave_path=\($t.save_path)"
  end'
```

Rule of thumb: a torrent is finished when `progress` is `1` and `state` is `uploading`/`stoppedUP`/`pausedUP`.

---

## One-liner: Login and add torrent
```bash
source .env && \
curl -s -c /tmp/qb.txt "$QB_URL/api/v2/auth/login" -d "username=$QB_USER&password=$QB_PASS" && \
curl -s -b /tmp/qb.txt "$QB_URL/api/v2/torrents/add" -F "urls=MAGNET_LINK_HERE"
```

---

## Torrent States

| State | Meaning |
|-------|---------|
| `downloading` | Currently downloading |
| `stoppedDL` | Paused while downloading |
| `uploading` | Currently seeding |
| `stoppedUP` | Completed, seeding stopped |
| `stalledDL` | No peers available |
| `error` | Error occurred |

---

## Common Gotchas

- **Must use `-F` not `-d`** for adding torrents (multipart/form-data required)
- `Fails.` response = duplicate torrent, not an error
- Some endpoints (including `/api/v2/app/version`) may return `403 Forbidden` until you authenticate and send the `SID` cookie
- Session cookie stored in `/tmp/qb.txt` - re-login if expired
- Hash must be lowercase when querying

---

## Manage Torrents

### Pause torrent
```bash
curl -s -b /tmp/qb.txt -X POST "$QB_URL/api/v2/torrents/pause" \
  -d "hashes=HASH"
```

### Resume torrent
```bash
curl -s -b /tmp/qb.txt -X POST "$QB_URL/api/v2/torrents/resume" \
  -d "hashes=HASH"
```

### Delete torrent (keep files)
```bash
curl -s -b /tmp/qb.txt -X POST "$QB_URL/api/v2/torrents/delete" \
  -d "hashes=HASH&deleteFiles=false"
```

### Delete torrent and files
```bash
curl -s -b /tmp/qb.txt -X POST "$QB_URL/api/v2/torrents/delete" \
  -d "hashes=HASH&deleteFiles=true"
```

---

## First-Time Setup (If Credentials Missing)

### What you need from the user

1. **Web UI URL** - Default is `http://localhost:8080`
2. **Username** - Default is `admin`
3. **Password** - Set in qBittorrent preferences
4. **Torrent sources config** - Copy the example to a local config (gitignored)

```bash
cp .opencode/skill/qbittorrent/torrent-sources.example.json .opencode/skill/qbittorrent/torrent-sources.json
```

### Step 1: Enable Web UI in qBittorrent

Tell the user:
> 1. Open qBittorrent
> 2. Go to Tools > Options > Web UI
> 3. Check "Web User Interface (Remote control)"
> 4. Set port (default 8080)
> 5. Set username and password
> 6. Click OK

### Step 2: Add credentials to .env
```bash
cat >> .env << 'EOF'
# qBittorrent
QB_URL=http://localhost:8080
QB_USER=admin
QB_PASS=your-password-here
EOF
```

### Step 3: Test it works
```bash
source .env && \
curl -s -c /tmp/qb.txt "$QB_URL/api/v2/auth/login" -d "username=$QB_USER&password=$QB_PASS" >/dev/null && \
curl -s -b /tmp/qb.txt "$QB_URL/api/v2/app/version"
# Should return version like "v5.1.2" (some setups return 403 until authenticated)
```

---

## API Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v2/auth/login` | POST | Login (username, password) |
| `/api/v2/torrents/add` | POST | Add torrent (-F urls=magnet) |
| `/api/v2/torrents/info` | GET | List all torrents |
| `/api/v2/torrents/info?hashes=X` | GET | Get specific torrent |
| `/api/v2/torrents/pause` | POST | Pause (hashes=X) |
| `/api/v2/torrents/resume` | POST | Resume (hashes=X) |
| `/api/v2/torrents/delete` | POST | Delete (hashes=X, deleteFiles=bool) |
| `/api/v2/app/version` | GET | Get qBittorrent version |
