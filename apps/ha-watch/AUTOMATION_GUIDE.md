# Home Assistant UI Automation Guide

This document explains how to use Playwright MCP to automate Home Assistant UI interactions for setup and testing.

## Overview

The `opencode.json` configuration enables Playwright MCP server, which allows programmatic browser automation. This is useful for:

- Automating token creation
- Discovering available entities
- Testing voice commands
- Verifying device states
- Screenshot documentation

## Playwright MCP Setup

The configuration in `opencode.json` enables the Playwright MCP server:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "playwright": {
      "type": "local",
      "command": ["npx", "@playwright/mcp@latest"],
      "enabled": true
    }
  }
}
```

## Use Cases

### 1. Automated Token Creation

Instead of manually creating a long-lived access token, you can automate it:

```typescript
// Pseudocode for automation
async function createHAToken() {
  // 1. Navigate to HA
  await page.goto('http://casaos.local:8123');
  
  // 2. Login (credentials from environment variables)
  await page.fill('input[name="username"]', process.env.HA_USERNAME);
  await page.fill('input[name="password"]', process.env.HA_PASSWORD);
  await page.click('button[type="submit"]');
  
  // 3. Navigate to profile
  await page.click('[href="/profile"]');
  
  // 4. Scroll to tokens section
  await page.locator('text=Long-Lived Access Tokens').scrollIntoViewIfNeeded();
  
  // 5. Create token
  await page.click('button:has-text("Create Token")');
  await page.fill('input[name="name"]', 'HA Watch App - Auto Generated');
  await page.click('button:has-text("OK")');
  
  // 6. Copy token
  const token = await page.locator('.token-value').textContent();
  
  return token;
}
```

### 2. Entity Discovery

Automatically discover all available entities in your HA instance:

```typescript
async function discoverEntities() {
  // 1. Login
  await login();
  
  // 2. Go to Developer Tools
  await page.goto('http://casaos.local:8123/developer-tools/state');
  
  // 3. Get all entities
  const entities = await page.locator('.entity-id').allTextContents();
  
  // 4. Group by domain
  const grouped = entities.reduce((acc, entity) => {
    const [domain] = entity.split('.');
    if (!acc[domain]) acc[domain] = [];
    acc[domain].push(entity);
    return acc;
  }, {});
  
  return grouped;
}
```

### 3. Test Voice Commands

Verify that voice commands work correctly:

```typescript
async function testVoiceCommand(command: string) {
  // 1. Login
  await login();
  
  // 2. Go to Developer Tools > Services
  await page.goto('http://casaos.local:8123/developer-tools/service');
  
  // 3. Select conversation.process
  await page.selectOption('select[name="service"]', 'conversation.process');
  
  // 4. Enter command
  await page.fill('textarea[name="service_data"]', JSON.stringify({
    text: command,
    language: "en"
  }));
  
  // 5. Call service
  await page.click('button:has-text("Call Service")');
  
  // 6. Get response
  const response = await page.locator('.response').textContent();
  
  return response;
}
```

### 4. Screenshot Documentation

Generate screenshots of HA UI for documentation:

```typescript
async function captureScreenshots() {
  await login();
  
  // Dashboard
  await page.goto('http://casaos.local:8123/lovelace/0');
  await page.screenshot({ path: 'docs/dashboard.png' });
  
  // Entities
  await page.goto('http://casaos.local:8123/config/entities');
  await page.screenshot({ path: 'docs/entities.png' });
  
  // Developer Tools
  await page.goto('http://casaos.local:8123/developer-tools/state');
  await page.screenshot({ path: 'docs/dev-tools.png' });
}
```

### 5. Verify Entity States

Check if devices are in expected states:

```typescript
async function verifyEntityState(entityId: string, expectedState: string) {
  await login();
  
  // Go to Developer Tools > States
  await page.goto('http://casaos.local:8123/developer-tools/state');
  
  // Filter for entity
  await page.fill('input[placeholder="Filter entities"]', entityId);
  
  // Get current state
  const state = await page.locator(`[data-entity-id="${entityId}"] .state`).textContent();
  
  return state === expectedState;
}
```

## Common Login Flow

Reusable login function:

```typescript
async function login() {
  await page.goto('http://casaos.local:8123');
  
  // Check if already logged in
  const isLoggedIn = await page.locator('[href="/profile"]').isVisible();
  if (isLoggedIn) return;
  
  // Login (credentials from environment variables)
  await page.fill('input[name="username"]', process.env.HA_USERNAME);
  await page.fill('input[name="password"]', process.env.HA_PASSWORD);
  await page.click('button[type="submit"]');
  
  // Wait for dashboard to load
  await page.waitForURL('**/lovelace/**');
}
```

## Integration with Development Workflow

### During Development

1. **Auto-generate tokens**: No manual UI clicking
2. **Discover entities**: Automatically find all controllable devices
3. **Test commands**: Verify conversation API responses
4. **Monitor states**: Track device state changes

### During Testing

1. **E2E tests**: Verify watch app commands affect HA UI
2. **State verification**: Confirm lights turn on/off as expected
3. **Error scenarios**: Test invalid commands
4. **Performance**: Measure response times

### For Documentation

1. **Screenshots**: Capture UI states for README
2. **Entity lists**: Generate markdown tables of available devices
3. **API examples**: Document actual responses from your HA instance

## Example: Complete Setup Automation

```typescript
async function setupHAWatchApp() {
  console.log('🚀 Automating HA Watch App setup...');
  
  // 1. Create token
  console.log('📝 Creating long-lived access token...');
  const token = await createHAToken();
  console.log(`✅ Token created: ${token.substring(0, 20)}...`);
  
  // 2. Discover entities
  console.log('🔍 Discovering available entities...');
  const entities = await discoverEntities();
  console.log(`✅ Found ${Object.keys(entities).length} domains`);
  
  // 3. Test conversation API
  console.log('🗣️ Testing conversation API...');
  const response = await testVoiceCommand('turn on kitchen lights');
  console.log(`✅ Response: ${response}`);
  
  // 4. Save configuration
  console.log('💾 Saving configuration...');
  await fs.writeFile('config.json', JSON.stringify({
    token,
    entities,
    baseURL: 'http://casaos.local:8123'
  }, null, 2));
  
  console.log('🎉 Setup complete!');
}
```

## Security Notes

⚠️ **Important:**

- Store credentials in environment variables, never in code
- Create a `.env` file (gitignored) with your credentials:
  ```
  HA_USERNAME=your_username
  HA_PASSWORD=your_password
  HA_URL=http://your-ha-instance:8123
  ```
- The Playwright MCP server runs locally and doesn't expose credentials

## Useful Playwright Commands

```bash
# Install Playwright
npm install -D @playwright/test

# Run in headed mode (see browser)
npx playwright test --headed

# Debug mode
npx playwright test --debug

# Generate code from browser actions
npx playwright codegen http://casaos.local:8123
```

## Next Steps

With Playwright MCP, you can:

1. ✅ Automate token creation (no manual clicking)
2. ✅ Discover all available entities programmatically
3. ✅ Test voice commands against actual HA instance
4. ✅ Generate documentation with screenshots
5. ✅ Build E2E tests for watch app

This significantly speeds up development and testing! 🚀
