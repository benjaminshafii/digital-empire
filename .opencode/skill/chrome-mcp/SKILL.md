---
name: chrome-mcp
description: Control Chrome browser efficiently with minimal token usage
---

## Quick Usage

### Navigate directly (don't use search boxes)
```javascript
chrome_navigate_page({ url: "https://example.com/search?q=term" })
```

### Extract data with evaluate_script (not screenshots)
```javascript
chrome_evaluate_script({
  function: `() => {
    const items = document.querySelectorAll('a[href*="/item/"]');
    return Array.from(items).slice(0, 15).map(el => ({
      text: el.textContent?.substring(0, 150) || '',
      link: el.href
    }));
  }`
})
```

### Take snapshot for page structure (lightweight)
```javascript
chrome_take_snapshot()  // Returns a11y tree, good for finding elements
```

### Take screenshot only for visual tasks
```javascript
chrome_take_screenshot()  // Use sparingly - high token cost
```

---

## Token-Efficient Patterns

### 1. URL Navigation > Form Filling

**Good** (1 call):
```javascript
chrome_navigate_page({ url: "https://site.com/search?query=desk&maxPrice=300" })
```

**Bad** (3+ calls):
```javascript
chrome_navigate_page({ url: "https://site.com" })
chrome_fill({ uid: "search-box", value: "desk" })
chrome_click({ uid: "search-button" })
```

### 2. evaluate_script > Snapshot for Data Extraction

**Good** - Get exactly what you need:
```javascript
chrome_evaluate_script({
  function: `() => {
    return Array.from(document.querySelectorAll('.listing')).map(el => ({
      title: el.querySelector('h2')?.textContent,
      price: el.querySelector('.price')?.textContent,
      link: el.querySelector('a')?.href
    }));
  }`
})
```

**Wasteful** - Snapshot returns entire page structure:
```javascript
chrome_take_snapshot()  // Then parse through huge response
```

### 3. Limit Results in Script

Always `.slice()` to avoid huge responses:
```javascript
chrome_evaluate_script({
  function: `() => {
    return Array.from(document.querySelectorAll('a'))
      .slice(0, 20)  // Limit results
      .map(el => ({ text: el.textContent?.substring(0, 100), href: el.href }));
  }`
})
```

### 4. Truncate Text Content

```javascript
// Good - truncated
text: el.textContent?.substring(0, 150) || ''

// Bad - could be huge
text: el.textContent
```

---

## When to Use Each Tool

| Tool | Use For | Token Cost |
|------|---------|------------|
| `navigate_page` | Go to URL, reload, back/forward | Low |
| `evaluate_script` | Extract data, click via JS, check state | Low |
| `take_snapshot` | Find element UIDs, understand page structure | Medium |
| `take_screenshot` | Visual comparison, verify appearance | High |
| `click` | Click element by UID (need snapshot first) | Low |
| `fill` | Fill form field (need snapshot first) | Low |

### Decision Tree

```
Need data from page?
├─ Structured data (links, prices, text)
│  └─ evaluate_script with targeted selectors
├─ Need to find element UIDs to click
│  └─ take_snapshot (once), then click/fill
└─ Visual comparison (style, color, condition)
   └─ take_screenshot

Need to navigate?
├─ Site has URL-based search/filters
│  └─ navigate_page with query params
└─ Must use forms
   └─ take_snapshot → fill → click
```

---

## Common Selectors

### Links with specific patterns
```javascript
document.querySelectorAll('a[href*="/item/"]')      // Contains "/item/"
document.querySelectorAll('a[href^="/product"]')    // Starts with "/product"
document.querySelectorAll('a[href$=".html"]')       // Ends with ".html"
```

### Extract price from mixed text
```javascript
const priceMatch = text.match(/\$[\d,]+/);
const price = priceMatch ? priceMatch[0] : 'N/A';
```

### Get page content for reading
```javascript
chrome_evaluate_script({
  function: `() => ({ content: document.body.innerText.substring(0, 2000) })`
})
```

---

## Multi-Account Sites (Gmail, Google)

Google uses `/u/N/` for account indices:
```
https://mail.google.com/mail/u/0/  → First account
https://mail.google.com/mail/u/1/  → Second account
https://drive.google.com/drive/u/1/  → Second account's Drive
```

Navigate directly to correct account:
```javascript
chrome_navigate_page({ url: "https://mail.google.com/mail/u/1/#inbox" })
```

---

## Error Handling

| Error | Solution |
|-------|----------|
| Navigation timeout | Usually OK - page loaded, continue |
| Element not found | Take fresh snapshot, UID may have changed |
| Empty results | Try broader selector or wait for page load |
| Login required | Tell user to log in manually in Chrome |

### Timeouts are Usually OK
```javascript
// Even if this "times out", the page usually loaded
chrome_navigate_page({ url: "https://example.com" })
// Just continue with your next action
```

---

## Page Management

### List open pages
```javascript
chrome_list_pages()
```

### Switch to page by index
```javascript
chrome_select_page({ pageIdx: 1 })
```

### Open new page
```javascript
chrome_new_page({ url: "https://example.com" })
```

### Close page
```javascript
chrome_close_page({ pageIdx: 0 })
```

---

## Real Examples

### Facebook Marketplace Search
```javascript
// 1. Navigate directly with filters
chrome_navigate_page({ 
  url: "https://www.facebook.com/marketplace/sanfrancisco/search?query=standing%20desk&maxPrice=300" 
})

// 2. Extract listings efficiently
chrome_evaluate_script({
  function: `() => {
    const listings = document.querySelectorAll('a[href*="/marketplace/item/"]');
    return Array.from(listings).slice(0, 15).map(el => ({
      text: el.textContent?.substring(0, 150) || '',
      price: (el.textContent?.match(/\\$[\\d,]+/) || ['N/A'])[0],
      link: el.href
    }));
  }`
})
```

### Gmail - Read Recent Emails
```javascript
// 1. Navigate to inbox
chrome_navigate_page({ url: "https://mail.google.com/mail/u/0/#inbox" })

// 2. Get email subjects
chrome_evaluate_script({
  function: `() => {
    const rows = document.querySelectorAll('tr.zA');
    return Array.from(rows).slice(0, 10).map(row => ({
      from: row.querySelector('.yX')?.textContent || '',
      subject: row.querySelector('.y6')?.textContent || '',
      snippet: row.querySelector('.y2')?.textContent || ''
    }));
  }`
})
```

### Check if Logged In
```javascript
chrome_evaluate_script({
  function: `() => ({
    url: window.location.href,
    hasLoginButton: !!document.querySelector('[data-testid="login"]'),
    hasAvatar: !!document.querySelector('img[alt*="profile"], img[alt*="avatar"]')
  })`
})
```
