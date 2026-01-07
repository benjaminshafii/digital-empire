---
name: browser
description: Control Chrome browser via OpenCode browser extension for authenticated web automation
---

# Browser MCP (OpenCode Browser Extension)

Controls your **actual Chrome browser** with logged-in sessions. Unlike Playwright (which opens a fresh browser), this uses your existing Chrome with all cookies and authentication intact.

## Prerequisites

1. Chrome running with **OpenCode browser extension** installed and enabled
2. Extension connected to OpenCode (click extension icon if disconnected)

## Available Tools

All tools are prefixed with `browser_browser_`:

| Tool | Purpose | Token Cost |
|------|---------|------------|
| `browser_browser_navigate` | Go to URL | Low |
| `browser_browser_click` | Click element by CSS selector | Low |
| `browser_browser_type` | Type text into input | Low |
| `browser_browser_snapshot` | Get accessibility tree (for finding elements) | Medium |
| `browser_browser_screenshot` | Capture visual screenshot | High |
| `browser_browser_scroll` | Scroll page or element into view | Low |
| `browser_browser_wait` | Wait for specified milliseconds | Low |
| `browser_browser_execute` | Run JavaScript (may fail due to CSP) | Low |
| `browser_browser_get_tabs` | List open tabs | Low |
| `browser_browser_status` | Check browser lock status | Low |
| `browser_browser_release` | Release browser lock when done | Low |
| `browser_browser_takeover` | Request lock from another session (no kill) | Low |
| `browser_browser_force_kill_session` | Force kill blocking session (last resort) | Low |

## Session Management

The browser plugin uses a lock file to ensure only one OpenCode session controls Chrome at a time.

### Auto-Takeover (v2.0.2+)

When your session tries to use the browser but another session holds the lock:
1. The plugin automatically sends a **soft release signal** (SIGUSR1) to the blocking session
2. The blocking session releases the lock without terminating
3. Your session takes over seamlessly

This means **you rarely need to manually handle lock conflicts** - just call `browser_browser_navigate` and it will work.

### Releasing When Done

**Always release the browser lock when your task is complete:**

```
browser_browser_release()
```

This allows other sessions to use the browser without waiting for the 2-hour TTL.

## Quick Usage

### Navigate to URL
```
browser_browser_navigate({ url: "https://mail.google.com" })
```

### Get page structure (for finding selectors)
```
browser_browser_snapshot()
```
Returns accessibility tree with element names, roles, selectors, and UIDs.

### Click an element
```
browser_browser_click({ selector: "#loginbutton" })
browser_browser_click({ selector: "button[name='login']" })
browser_browser_click({ selector: "tr.zA:first-child" })
```

### Type into input
```
browser_browser_type({ selector: "#email", text: "user@example.com" })
browser_browser_type({ selector: "#pass", text: "password123" })
```

### Take screenshot (for visual verification)
```
browser_browser_screenshot()
```

### Wait for page load
```
browser_browser_wait({ ms: 2000 })
```

### Scroll
```
// Scroll by pixels (may not work on fixed-layout sites like Gmail)
browser_browser_scroll({ y: 500 })   // Down
browser_browser_scroll({ y: -500 })  // Up

// Scroll element into view (more reliable)
browser_browser_scroll({ selector: "div.AO" })
```

## Workflow Pattern

1. **Navigate** to URL
2. **Snapshot** to understand page structure
3. **Click/Type** using selectors from snapshot
4. **Wait** if needed for dynamic content
5. **Screenshot** to verify visual state (sparingly)

## Snapshot vs Screenshot

| Use Snapshot | Use Screenshot |
|--------------|----------------|
| Find element selectors | Visual verification |
| Understand page structure | Compare images |
| Read text content | Debug layout issues |
| Low token cost | High token cost |

**Prefer snapshots** - they're cheaper and give you actionable selectors.

## Common Selectors

```css
/* By ID */
#email
#loginbutton

/* By attribute */
button[name="login"]
input[type="password"]
a[href*="/marketplace/item/"]

/* By class */
div.T-I.T-I-KE
tr.zA:first-child

/* Gmail specific */
tr.zA              /* Email rows */
div.Am.aiL.Al.editable  /* Compose body */
```

## Authenticated Sites

The browser MCP shines for sites requiring login:

- **Gmail** - Already logged in, access inbox directly
- **Facebook** - Marketplace, messages, etc.
- **Google Drive** - File access
- **Any site** where you're already authenticated

### Multi-Account Google Sites

Google uses `/u/N/` for account switching:
```
https://mail.google.com/mail/u/0/  # First account
https://mail.google.com/mail/u/1/  # Second account
```

## Error Handling

| Error | Solution |
|-------|----------|
| "Not connected to browser extension" | Open Chrome, enable extension, click to connect |
| "Navigation timeout" | Usually OK - page loaded, continue |
| "Element not found" | Take fresh snapshot, selector may have changed |
| "CSP blocks execute" | Use click/type instead of JavaScript eval |
| "Scrolling may not work on fixed-layout sites" | Use selector scrolling |
| "Browser locked... Auto-takeover failed" | Use `browser_browser_force_kill_session` as last resort |
| "Cannot start WebSocket server" | Port 19222 is in use by another application |

**Note:** As of v2.0.2, the plugin automatically attempts soft takeover when blocked by another session. Manual intervention is rarely needed.

## Limitations

1. **No JavaScript eval on some sites** - CSP blocks `browser_browser_execute` on Gmail, Facebook, etc. Use click/type instead.
2. **Scrolling** - Pixel scrolling may not work on fixed-layout sites. Use selector scrolling.
3. **Single browser** - Controls whatever Chrome is connected, not multiple instances.

---

## Test Cases

### Basic Operations

#### Test 1: Single Session - Navigate
```
1. Check browser_status should show "Browser available (no active session)"
2. Call browser_navigate to https://google.com
3. Call browser_snapshot to verify page loaded
```

#### Test 2: Multi-Session - Auto Takeover
```
1. Start OpenCode in Terminal 1 - will acquire lock
2. Start OpenCode in Terminal 2
3. In Terminal 2, call browser_status
4. Should show "Browser locked by another session (PID <PID1>)"
5. Try to call browser_navigate in Terminal 2
6. Should auto-takeover: Terminal 1 releases, Terminal 2 takes over
7. Terminal 1's browser_status should now show "Browser available (no active session)"
8. Terminal 2 owns the browser
```

#### Test 3: Stale Lock Recovery
```
1. Start OpenCode, it acquires lock
2. OpenCode crashes (but lock file remains)
3. Start new OpenCode session
4. Lock file shows stale PID
5. Call browser_navigate - should auto-clean stale lock and work
```

#### Test 4: Port Conflict with Non-Browser App
```
1. Some other app uses port 19222
2. Start OpenCode, checkPortAvailable() returns false (port in use)
3. Call browser_navigate
4. Should error: "Port 19222 is in use... Use browser_kill_session to take over."
5. (Note: browser_kill_session should NOT work in this case since the port owner is not OpenCode browser)
```

#### Test 5: Chrome Not Running
```
1. Chrome is closed
2. Extension not connected (isConnected = false)
3. Call browser_status
4. Should show: "Browser available (no active session), Extension: not connected"
5. Try to call browser_navigate
6. Should error: "Chrome extension not connected..."
```

#### Test 6: Screenshot Persists
```
1. Navigate to google.com
2. Call browser_screenshot({ name: "google-search" })
3. Screenshot saved to: ~/.opencode-browser/screenshots/google-search.png
4. Call browser_screenshot again
5. New screenshot: ~/.opencode-browser/screenshots/google-search-2.png
6. Verify you can compare screenshots between sessions
```

#### Test 7: Full Workflow
```
1. browser_status → verify available
2. browser_navigate → navigate to URL
3. browser_snapshot → get page structure
4. browser_click → click using selector
5. browser_type → fill form
6. browser_screenshot → capture visual
7. browser_wait → wait for dynamic content
8. browser_execute → run JS to get dynamic data
9. browser_get_tabs → list all tabs
```

### Expected Results for Each Test

| Test | browser_status | browser_navigate | Expected Flow |
|-------|---------------|-----------------|---------------|
| Test 1 | "Browser available" | Success | Lock acquired, server started |
| Test 2 | "Browser locked by..." | Success (auto-takeover) | Soft signal sent, lock transferred |
| Test 3 | "Browser available" | Success | Stale lock auto-cleaned |
| Test 4 | "Port 19222 is in use..." | Error | Port conflict, helpful error |
| Test 5 | "...Extension: not connected" | Info | No crash, clear error message |
| Test 6 | Saved to: ~/.opencode-browser/screenshots/ | Success | Screenshots persist |
| Test 7 | Multiple operations | Success | Full end-to-end workflow |

### Troubleshooting

If tests fail, check:
1. Is Chrome running? Extension badge should show "ON"
2. Check OpenCode logs for `[browser-plugin]` messages
3. Verify lock file: `cat ~/.opencode-browser/lock.json`
4. Port check: `lsof -i :19222` or `nc -z localhost 19222`


## Example: Gmail Reply

```
// 1. Navigate to search
browser_browser_navigate({ url: "https://mail.google.com/mail/u/0/#search/from%3Auser%40example.com" })

// 2. Wait for load
browser_browser_wait({ ms: 2000 })

// 3. Click first email
browser_browser_click({ selector: "tr.zA:first-child" })

// 4. Wait and take snapshot to find reply button
browser_browser_wait({ ms: 1500 })
browser_browser_snapshot()

// 5. Click reply (selector from snapshot)
browser_browser_click({ selector: "span.ams.bkH" })

// 6. Type reply
browser_browser_type({ selector: "div.Am.aiL.Al.editable", text: "Thank you!" })

// 7. Click send
browser_browser_click({ selector: "div.T-I.J-J5-Ji.aoO.v7.T-I-atl.L3" })
```

## Example: Facebook Login

```
// 1. Navigate
browser_browser_navigate({ url: "https://www.facebook.com" })

// 2. Type credentials
browser_browser_type({ selector: "#email", text: "phone_or_email" })
browser_browser_type({ selector: "#pass", text: "password" })

// 3. Click login
browser_browser_click({ selector: "button[name='login']" })

// 4. Wait and verify
browser_browser_wait({ ms: 3000 })
browser_browser_snapshot()
```

### Quick Reference

#### Release browser when done
```
browser_browser_release()
```

#### Check status
```
browser_browser_status()
```
