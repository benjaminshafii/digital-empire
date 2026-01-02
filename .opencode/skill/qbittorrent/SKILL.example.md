---
name: qbittorrent
description: Setup qBittorrent Web UI access for adding and managing torrents
---

## Quick Usage (Already Configured)

### Get credentials from Bitwarden and login
```bash
# Get password from Bitwarden (assumes bitwarden skill is configured)
source ~/.bashrc  # Load BW_CLIENTID and BW_CLIENTSECRET
export BW_SESSION=$(bw unlock --passwordfile ~/.bw_password --raw)
QB_USER=$(bw list items --search qbit | grep -o '"username":"[^"]*"' | head -1 | cut -d'"' -f4)
QB_PASS=$(bw list items --search qbit | grep -o '"password":"[^"]*"' | head -1 | cut -d'"' -f4)

# Login to qBittorrent (stores session cookie)
curl -s -c /tmp/qb.txt -b /tmp/qb.txt \
  "http://localhost:8080/api/v2/auth/login" \
  -d "username=$QB_USER&password=$QB_PASS"
```

### Add a magnet link
```bash
# IMPORTANT: Must use multipart/form-data (-F flag), NOT -d!
# "Fails." response means torrent already exists (duplicate) - not an error!
# "Ok." means successfully added
curl -s -c /tmp/qb.txt -b /tmp/qb.txt \
  "http://localhost:8080/api/v2/torrents/add" \
  -F "urls=magnet:?xt=urn:btih:HASH&dn=NAME&tr=TRACKER"

# With optional parameters:
curl -s -c /tmp/qb.txt -b /tmp/qb.txt \
  "http://localhost:8080/api/v2/torrents/add" \
  -F "urls=MAGNET_LINK" \
  -F "savepath=/downloads" \
  -F "category=anime" \
  -F "tags=onepiece,anime"
```

### Check if torrent exists / get status
```bash
# Check by hash (case-insensitive)
curl -s -b /tmp/qb.txt "http://localhost:8080/api/v2/torrents/info?hashes=HASH_LOWERCASE"

# Search by name
curl -s -b /tmp/qb.txt "http://localhost:8080/api/v2/torrents/info" | grep -i "torrent name"
```

### List all torrents
```bash
curl -s -b /tmp/qb.txt "http://localhost:8080/api/v2/torrents/info"
```

### Torrent states
- `downloading` - Currently downloading
- `stoppedDL` - Paused while downloading
- `uploading` - Currently seeding
- `stoppedUP` - Completed, seeding stopped
- `stalledDL` - No peers available
- `error` - Error occurred

---

## One-liner: Full workflow to add torrent

```bash
# Login and add torrent (use -F for multipart/form-data, NOT -d)
source ~/.bashrc && \
export BW_SESSION=$(bw unlock --passwordfile ~/.bw_password --raw) && \
QB_PASS=$(bw list items --search qbit | grep -o '"password":"[^"]*"' | head -1 | cut -d'"' -f4) && \
curl -s -c /tmp/qb.txt -b /tmp/qb.txt "http://localhost:8080/api/v2/auth/login" -d "username=admin&password=$QB_PASS" && \
curl -s -c /tmp/qb.txt -b /tmp/qb.txt "http://localhost:8080/api/v2/torrents/add" -F "urls=MAGNET_LINK_HERE"
```

---

## First-Time Setup (If Not Configured)

### What you need from the user

1. **Web UI port** - Default is 8080
2. **Username** - Default is "admin"
3. **Password** - Set in qBittorrent preferences

### How to enable Web UI

Tell the user:
> In qBittorrent: Tools → Options → Web UI
> - Check "Web User Interface (Remote control)"
> - Set port (default 8080)
> - Set username/password
> - Optional: Check "Bypass authentication for clients on localhost"

### Store credentials in Bitwarden

Use the Bitwarden web vault to create a login item named "qbitorrent" with username and password.

### Verify setup works

```bash
curl -s http://localhost:8080/api/v2/app/version
# Should return version like "v5.1.2"
```

## API Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v2/auth/login` | POST | Login (username, password) |
| `/api/v2/torrents/add` | POST | Add torrent (urls=magnet) |
| `/api/v2/torrents/info` | GET | List all torrents |
| `/api/v2/torrents/info?hashes=X` | GET | Get specific torrent |
| `/api/v2/torrents/pause` | POST | Pause (hashes=X) |
| `/api/v2/torrents/resume` | POST | Resume (hashes=X) |
| `/api/v2/torrents/delete` | POST | Delete (hashes=X, deleteFiles=bool) |
| `/api/v2/app/preferences` | GET | Get settings |

---

## Torrent Sources Configuration

User-specific torrent sources are stored in `torrent-sources.json` (gitignored).  
Copy from `torrent-sources.example.json` to get started.

### Setup torrent sources

```bash
# First time setup - copy example config
cp .opencode/skill/qbittorrent/torrent-sources.example.json \
   .opencode/skill/qbittorrent/torrent-sources.json

# Edit to add/remove sources
```

### Config structure

```json
{
  "sources": [
    {
      "name": "nyaa",           // Short identifier
      "url": "https://nyaa.si", // Base URL
      "type": "anime",          // Category: anime|movies|tv|games|general
      "searchPath": "/?q=",     // Search URL path
      "description": "..."      // What it's for
    }
  ],
  "preferences": {
    "defaultSource": "nyaa",
    "preferredQuality": "1080p",
    "excludeKeywords": ["cam", "hdts"],
    "includeKeywords": []
  }
}
```

### Available sources (in example config)

| Name | Type | URL | Description |
|------|------|-----|-------------|
| nyaa | anime | nyaa.si | Anime, manga, games, music from Japan |
| 1337x | general | 1337x.to | Movies, TV, games, software |
| rarbg-index | general | rargb.to | Movies, TV, games (RARBG successor) |
| rutracker | general | rutracker.org | Russian tracker - music, software |
| fitgirl | games | fitgirl-repacks.site | Compressed game repacks |
| eztv | tv | eztvx.to | TV shows only |
| yts | movies | yts.mx | Movies - small file sizes |
| torrentgalaxy | general | torrentgalaxy.to | General torrents |
