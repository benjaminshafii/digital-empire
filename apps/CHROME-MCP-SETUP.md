# Chrome MCP Hands-Free Automation Setup

## Problem

Chrome 136+ introduced a security feature that shows a "Allow remote debugging?" prompt when connecting to the default user profile. This breaks hands-free automation.

## Solutions

### Option A: Separate Persistent Profile (Quick Win)

Use a **separate persistent Chrome profile** for automation. Chrome skips the security prompt for non-default user data directories.

### Option B: Chrome Extension + Native Messaging (Future)

Build a Chrome extension that communicates via Native Messaging, bypassing the DevTools Protocol entirely. This is how Claude's browser extension works.

---

## Option A: Separate Persistent Profile

## Setup

### 1. Update opencode.json

```json
"chrome": {
  "type": "local",
  "command": [
    "npx",
    "-y",
    "chrome-devtools-mcp@latest",
    "--autoConnect",
    "--userDataDir=/Users/benjaminshafii/.chrome-automation"
  ]
}
```

### 2. First-Time Setup (One Time Only)

When Chrome MCP first launches with this config:

1. A fresh Chrome window opens with an empty profile
2. Manually log into the sites you need for automation:
   - Facebook Marketplace
   - Any other authenticated sites
3. Close Chrome

Your sessions are now saved in `~/.chrome-automation/`

### 3. Ongoing Usage

Every subsequent run:
- Chrome opens with your saved profile
- No security prompts
- Already logged in
- Fully hands-free

## Why This Works

| Aspect | Default Profile | Separate Profile |
|--------|-----------------|------------------|
| Security prompt | Yes (Chrome 136+) | No |
| Your existing logins | Yes | No (separate) |
| Bot detection | No | No |
| Hands-free after setup | No | Yes |

Chrome's security change specifically targets the **default** user data directory to prevent malware from stealing cookies. Non-default directories are considered "developer use" and bypass the prompt.

## Maintenance

- If a site invalidates your session (password change, 2FA re-auth, etc.), you'll need to re-login once in the automation profile
- The profile persists across reboots
- To reset: delete `~/.chrome-automation/` and re-login

## Alternative Approaches Considered

### Chrome for Testing
- Works but triggers bot detection on many sites (Cloudflare, etc.)
- Different fingerprint than regular Chrome

### Enterprise Policy (RemoteDebuggingAllowed)
- Doesn't bypass Chrome 136+ prompt for default profile
- Only controls whether remote debugging is allowed at all

### Native Messaging Extension
- Would work with default profile
- Significant development effort
- Chrome extension APIs more limited than DevTools Protocol

---

## Option B: Chrome Extension + Native Messaging

### Why This Would Work

- No DevTools Protocol = no security prompt
- Uses your real Chrome profile with all cookies/logins
- No bot detection (it's just a normal extension)
- Fully hands-free once installed

### Architecture

```
┌─────────────────────┐     ┌──────────────────────┐     ┌─────────────────┐
│   MCP Server        │     │  Native Messaging    │     │ Chrome Extension│
│   (OpenCode)        │◄───►│  Host Binary         │◄───►│ (background +   │
│                     │     │  (stdin/stdout)      │     │  content script)│
└─────────────────────┘     └──────────────────────┘     └─────────────────┘
                                                                  │
                                                                  ▼
                                                         ┌─────────────────┐
                                                         │  Your Browser   │
                                                         │  (DOM, cookies, │
                                                         │   navigation)   │
                                                         └─────────────────┘
```

### Components Needed

1. **Chrome Extension** (`manifest.json` v3):
   ```json
   {
     "manifest_version": 3,
     "name": "OpenCode Browser Control",
     "permissions": ["nativeMessaging", "activeTab", "scripting", "tabs"],
     "background": {
       "service_worker": "background.js"
     }
   }
   ```

2. **Native Messaging Host** (`~/.config/google-chrome/NativeMessagingHosts/com.opencode.browser.json`):
   ```json
   {
     "name": "com.opencode.browser",
     "description": "OpenCode Browser Control",
     "path": "/path/to/native-host-binary",
     "type": "stdio",
     "allowed_origins": ["chrome-extension://YOUR_EXTENSION_ID/"]
   }
   ```

3. **MCP Server** that:
   - Spawns/connects to the native messaging host
   - Translates MCP tool calls to extension commands
   - Handles binary protocol (4-byte length prefix + JSON)

### Available Chrome Extension APIs

| API | Capability |
|-----|------------|
| `chrome.tabs` | Navigate, query tabs, get URL/title |
| `chrome.scripting.executeScript` | Run JS in page context |
| `chrome.scripting.insertCSS` | Inject styles |
| `chrome.storage` | Persist data |
| `chrome.cookies` | Read/write cookies (with host permissions) |

### Limitations vs DevTools Protocol

- No network interception/modification
- No performance tracing
- No full DOM tree access (only via executeScript)
- No screenshot API (would need canvas hack in content script)
- Limited debugging capabilities

### Implementation Effort

- **Basic (click, type, read, navigate)**: 2-3 days
- **Full feature parity with chrome-devtools-mcp**: 1-2 weeks

### Claude Browser Extension Analysis

From analyzing `test/claude-chrome.js`:
- Application slug: `claude-browser-use`
- Uses OAuth tokens stored in `chrome.storage`
- Communicates with Anthropic API via `fetch` with Bearer token
- The file is the popup/options UI (React app)
- The actual automation logic would be in a separate background/content script

---

## References

- [Chrome 136 Security Changes](https://developer.chrome.com/blog/remote-debugging-port)
- [Chrome for Testing](https://developer.chrome.com/blog/chrome-for-testing)
- [Chrome DevTools MCP](https://github.com/anthropics/anthropic-quickstarts/tree/main/mcp-servers/src/chrome-devtools)
- [Chrome Native Messaging](https://developer.chrome.com/docs/extensions/develop/concepts/native-messaging)
- [Chrome Extension APIs](https://developer.chrome.com/docs/extensions/reference/api)
