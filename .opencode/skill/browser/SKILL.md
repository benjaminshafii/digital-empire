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
| Navigation timeout | Usually OK - page loaded, continue |
| Element not found | Take fresh snapshot, selector may have changed |
| CSP blocks execute | Use click/type instead of JavaScript eval |

## Limitations

1. **No JavaScript eval on some sites** - CSP blocks `browser_browser_execute` on Gmail, Facebook, etc. Use click/type instead.
2. **Scrolling** - Pixel scrolling may not work on fixed-layout sites. Use selector scrolling.
3. **Single browser** - Controls whatever Chrome is connected, not multiple instances.

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
