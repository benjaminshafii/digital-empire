# Torrent Download Automation via Chrome MCP

Efficiently search for torrents on ThePirateBay and add them to qBittorrent (CasaOS) using `chrome_evaluate_script` instead of full page snapshots.

## CRITICAL: NEVER Use `take_snapshot` or `chrome_take_snapshot`

**DO NOT call `take_snapshot` or `chrome_take_snapshot` for torrent automation.**

Each snapshot costs ~50k tokens and destroys context efficiency. Instead, use `chrome_evaluate_script` for ALL interactions:
- Reading search results
- Finding torrent links
- Clicking buttons
- Getting torrent info
- Checking download status

## qBittorrent Credentials (CasaOS)

| Field | Value |
|-------|-------|
| URL | http://casaos.local:8080/ |
| Username | admin |
| Password | kVs36P37k |

## The Pattern

### 1. Navigate to ThePirateBay
```javascript
chrome_navigate_page({ url: "https://thepiratebay.org" })
```

Note: ThePirateBay domains change frequently. Common alternatives:
- thepiratebay.org
- thepiratebay10.org
- piratebay.live
- thehiddenbay.com

### 2. Search for Content (Prioritize Quality)

Search strategy for best quality:
- Include "2160p" or "4K" for resolution
- Include "DV" or "Dolby Vision" for HDR
- Include "REMUX" for highest quality (uncompressed)
- Sort by seeders for reliability

```javascript
chrome_evaluate_script({
  function: `() => {
    const searchBox = document.querySelector('input[name="q"]') || document.querySelector('#searchInput') || document.querySelector('input[type="search"]');
    if (searchBox) {
      searchBox.value = 'MOVIE_NAME 2160p DV Dolby Vision';
      const form = searchBox.closest('form');
      if (form) form.submit();
      return { searching: true };
    }
    // Try clicking search if no form
    const searchBtn = document.querySelector('input[type="submit"]') || document.querySelector('button[type="submit"]');
    if (searchBtn) searchBtn.click();
    return { clicked: true };
  }`
})
```

### 3. Get Search Results (Sorted by Seeders)
```javascript
chrome_evaluate_script({
  function: `() => {
    // TPB uses table rows for results
    const rows = document.querySelectorAll('#searchResult tr, .list-entry, table tr');
    const results = [];
    rows.forEach((row, i) => {
      if (i === 0) return; // skip header
      const nameEl = row.querySelector('.detName a, .detLink, td:nth-child(2) a');
      const magnetEl = row.querySelector('a[href^="magnet:"]');
      const seedEl = row.querySelector('td:nth-child(6), .seeders');
      const sizeEl = row.querySelector('.detDesc, td:nth-child(5)');
      
      if (nameEl && magnetEl) {
        results.push({
          name: nameEl.textContent?.trim().substring(0, 80),
          magnet: magnetEl.href,
          seeders: seedEl?.textContent?.trim() || '0',
          size: sizeEl?.textContent?.match(/Size ([^,]+)/)?.[1] || sizeEl?.textContent?.trim()
        });
      }
    });
    // Sort by seeders (highest first)
    return results.sort((a, b) => parseInt(b.seeders) - parseInt(a.seeders)).slice(0, 5);
  }`
})
```

### 4. Filter for Best Quality
```javascript
chrome_evaluate_script({
  function: `() => {
    const rows = document.querySelectorAll('#searchResult tr, .list-entry, table tr');
    const results = [];
    rows.forEach((row, i) => {
      if (i === 0) return;
      const nameEl = row.querySelector('.detName a, .detLink, td:nth-child(2) a');
      const magnetEl = row.querySelector('a[href^="magnet:"]');
      const seedEl = row.querySelector('td:nth-child(6), .seeders');
      
      const name = nameEl?.textContent?.toLowerCase() || '';
      const isDV = name.includes('dv') || name.includes('dolby vision') || name.includes('dolby.vision');
      const is4K = name.includes('2160p') || name.includes('4k') || name.includes('uhd');
      const isRemux = name.includes('remux');
      
      if (nameEl && magnetEl && (isDV || is4K)) {
        results.push({
          name: nameEl.textContent?.trim().substring(0, 100),
          magnet: magnetEl.href,
          seeders: parseInt(seedEl?.textContent?.trim() || '0'),
          isDolbyVision: isDV,
          is4K: is4K,
          isRemux: isRemux,
          qualityScore: (isDV ? 3 : 0) + (is4K ? 2 : 0) + (isRemux ? 1 : 0)
        });
      }
    });
    // Sort by quality score, then seeders
    return results.sort((a, b) => {
      if (b.qualityScore !== a.qualityScore) return b.qualityScore - a.qualityScore;
      return b.seeders - a.seeders;
    }).slice(0, 5);
  }`
})
```

### 5. Copy Magnet Link
```javascript
// Store the magnet link from the best result
// The magnet link from step 3 or 4 is what you'll add to qBittorrent
```

## Adding to qBittorrent (CasaOS)

### 1. Navigate to qBittorrent Web UI
```javascript
chrome_navigate_page({ url: "http://casaos.local:8080/" })
```

### 2. Login if Required
```javascript
chrome_evaluate_script({
  function: `() => {
    const userInput = document.querySelector('#username, input[name="username"]');
    const passInput = document.querySelector('#password, input[name="password"]');
    const loginBtn = document.querySelector('#loginButton, button[type="submit"], input[type="submit"]');
    
    if (userInput && passInput) {
      userInput.value = 'admin';
      passInput.value = 'kVs36P37k';
      if (loginBtn) loginBtn.click();
      return { loggedIn: true };
    }
    return { alreadyLoggedIn: true };
  }`
})
```

### 3. Add Torrent via Magnet Link
```javascript
chrome_evaluate_script({
  function: `() => {
    // Look for add torrent button
    const addBtn = document.querySelector('#add, .add-torrent, button[title*="Add"], #addTorrent');
    if (addBtn) {
      addBtn.click();
      return { opened: 'add dialog' };
    }
    return { error: 'Add button not found' };
  }`
})

// Wait for dialog, then add magnet
chrome_evaluate_script({
  function: `() => {
    const magnetInput = document.querySelector('#urls, textarea[name="urls"], #torrentLinks');
    if (magnetInput) {
      magnetInput.value = 'MAGNET_LINK_HERE';
      // Find and click submit/add button
      const submitBtn = document.querySelector('#addTorrentButton, button[type="submit"]') ||
        Array.from(document.querySelectorAll('button')).find(b => 
          b.textContent?.toLowerCase().includes('add') || 
          b.textContent?.toLowerCase().includes('download')
        );
      if (submitBtn) submitBtn.click();
      return { added: true };
    }
    return { error: 'Magnet input not found' };
  }`
})
```

### Alternative: Direct API Add (Most Reliable)
```javascript
chrome_evaluate_script({
  function: `async () => {
    const formData = new FormData();
    formData.append('urls', 'MAGNET_LINK_HERE');
    
    const response = await fetch('/api/v2/torrents/add', {
      method: 'POST',
      body: formData
    });
    
    return { 
      success: response.ok,
      status: response.status
    };
  }`
})
```

## Key Selectors

### ThePirateBay
| Element | Selector |
|---------|----------|
| Search box | `input[name="q"]`, `#searchInput` |
| Search results table | `#searchResult tr` |
| Torrent name | `.detName a`, `.detLink` |
| Magnet link | `a[href^="magnet:"]` |
| Seeders | `td:nth-child(6)` |
| Size | `.detDesc` |

### qBittorrent Web UI
| Element | Selector |
|---------|----------|
| Username | `#username` |
| Password | `#password` |
| Login button | `#loginButton` |
| Add torrent | `#add`, `button[title*="Add"]` |
| Magnet input | `#urls`, `textarea[name="urls"]` |
| Torrent list | `#torrentsTable` |

## Check Download Status
```javascript
chrome_evaluate_script({
  function: `() => {
    const torrents = document.querySelectorAll('#torrentsTable tr, .torrent-row');
    return Array.from(torrents).slice(0, 5).map(t => ({
      name: t.querySelector('.torrent-name, td:nth-child(1)')?.textContent?.substring(0, 50),
      progress: t.querySelector('.progress, td:nth-child(2)')?.textContent,
      status: t.querySelector('.status, td:nth-child(3)')?.textContent
    }));
  }`
})
```

## Quality Priority Guide

When searching, prioritize in this order:
1. **Dolby Vision + 2160p + REMUX** - Best possible quality
2. **Dolby Vision + 2160p** - Excellent quality
3. **HDR10+ + 2160p** - Great quality
4. **2160p REMUX** - 4K uncompressed
5. **2160p** - Standard 4K
6. **1080p REMUX** - HD uncompressed (fallback)

Search terms to include:
- `2160p DV` or `2160p Dolby Vision`
- `4K DV REMUX`
- `UHD HDR`

## Tips

1. **NEVER use `take_snapshot`** - Always use `evaluate_script` instead
2. **Check seeders first** - High seeders = faster download, verified content
3. **Verify quality tags** - Look for DV, HDR, REMUX in title
4. **Use magnet links** - More reliable than .torrent files
5. **qBittorrent API** - Use `/api/v2/torrents/add` for most reliable adding

## Complete Workflow Example

```javascript
// 1. Search ThePirateBay
chrome_navigate_page({ url: "https://thepiratebay.org" })

// 2. Search with quality filters
chrome_evaluate_script({
  function: `() => {
    const searchBox = document.querySelector('input[name="q"]');
    searchBox.value = 'Oppenheimer 2160p DV';
    searchBox.closest('form').submit();
    return { searching: 'Oppenheimer 2160p DV' };
  }`
})

// 3. Get best quality result with most seeders
chrome_evaluate_script({
  function: `() => {
    // ... quality filter code from above
    return bestResults[0]; // Returns magnet link
  }`
})

// 4. Navigate to qBittorrent
chrome_navigate_page({ url: "http://casaos.local:8080/" })

// 5. Login
chrome_evaluate_script({ function: `() => { /* login code */ }` })

// 6. Add magnet via API
chrome_evaluate_script({
  function: `async () => {
    const formData = new FormData();
    formData.append('urls', 'magnet:?xt=urn:btih:...');
    await fetch('/api/v2/torrents/add', { method: 'POST', body: formData });
    return { added: true };
  }`
})
```

## Context Usage

| Method | Tokens per Operation |
|--------|---------------------|
| Snapshot-based | ~50k per page |
| evaluate_script | ~100-300 per action |

Full workflow (search + add) uses ~1-2k tokens vs ~150k+ with snapshots.
