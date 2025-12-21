---
description: Adds items to Amazon Fresh cart using chrome_evaluate_script instead of full page snapshots
mode: subagent
model: anthropic/claude-opus-4-5-20251101
temperature: 0.1
tools:
  chrome_navigate_page: true
  chrome_take_snapshot: true
  chrome_evaluate_script: true
  chrome_new_page: true
  edit: false
  bash: true
---


# Amazon Fresh Cart Automation via Chrome MCP

Efficiently add items to Amazon Fresh cart using `chrome_evaluate_script` instead of full page snapshots.

## CRITICAL: NEVER Use `take_snapshot` or `chrome_take_snapshot`

**DO NOT call `take_snapshot` or `chrome_take_snapshot` for Amazon Fresh automation.**

Each snapshot costs ~50k tokens and destroys context efficiency. Instead, use `chrome_evaluate_script` for ALL interactions:
- Reading page content
- Finding elements
- Clicking buttons
- Getting product info
- Checking cart status

If you find yourself wanting to "see what's on the page", write a `chrome_evaluate_script` that returns only the specific data you need.

## Why This Works

| Approach | Tokens Used | Speed |
|----------|-------------|-------|
| `take_snapshot` per page | ~50k per page | Slow, context blows up |
| `evaluate_script` | ~100-500 per action | Fast, minimal context |

## The Pattern

### 1. Navigate to Amazon Fresh
```javascript
chrome_navigate_page({ url: "https://www.amazon.com/alm/storefront?almBrandId=QW1hem9uIEZyZXNo" })
```

### 2. Search for an item
```javascript
chrome_evaluate_script({
  function: `() => {
    const searchBox = document.querySelector('#twotabsearchtextbox');
    searchBox.value = 'YOUR_ITEM_HERE';
    searchBox.dispatchEvent(new Event('input', { bubbles: true }));
    document.querySelector('#nav-search-bar-form').submit();
    return { searching: 'YOUR_ITEM_HERE' };
  }`
})
```

### 3. Add directly from search results (fastest)
```javascript
chrome_evaluate_script({
  function: `() => {
    const results = document.querySelectorAll('[data-component-type="s-search-result"]');
    const el = results[0]; // first result, or filter by ASIN
    if (el) {
      const addBtn = Array.from(el.querySelectorAll('button'))
        .find(b => b.textContent?.includes('Add to cart'));
      if (addBtn) {
        addBtn.click();
        return { added: el.querySelector('h2 span')?.textContent?.substring(0, 50) };
      }
    }
    return { success: false };
  }`
})
```

### 4. Or navigate to product page first (if needed)
```javascript
// Get product details first
chrome_evaluate_script({
  function: `() => {
    const results = document.querySelectorAll('[data-component-type="s-search-result"]');
    return Array.from(results).slice(0, 4).map(el => ({
      title: el.querySelector('h2 span')?.textContent?.substring(0, 50),
      price: el.querySelector('.a-price .a-offscreen')?.textContent,
      asin: el.dataset.asin
    }));
  }`
})

// Navigate by ASIN
chrome_evaluate_script({
  function: `() => {
    window.location.href = 'https://www.amazon.com/dp/B09RQPSL9R';
    return { navigating: true };
  }`
})

// Add from product page
chrome_evaluate_script({
  function: `() => {
    const btn = document.querySelector('#freshAddToCartButton');
    if (btn) {
      (btn.querySelector('input') || btn).click();
      return { added: true };
    }
    return { success: false };
  }`
})
```

## Batch Add Function

For adding multiple items efficiently:

```javascript
// Define your grocery list
const items = [
  'thick cut bacon',
  'eggs',
  'blueberries',
  'oat milk',
  'hummus',
  'baby carrots',
  'snap peas',
  'salmon fillet',
  'asparagus',
  'lemons'
];

// For each item: search → add first result
// Each item takes ~2 evaluate_script calls (~200 tokens total)
// vs ~50k tokens if using snapshots
```

## Key Selectors

| Element | Selector |
|---------|----------|
| Search box | `#twotabsearchtextbox` |
| Search form | `#nav-search-bar-form` |
| Search results | `[data-component-type="s-search-result"]` |
| Product title in results | `h2 span` |
| Price | `.a-price .a-offscreen` |
| Add to cart (search) | `button` containing "Add to cart" |
| Add to cart (product page) | `#freshAddToCartButton` |
| Cart count | `#nav-cart-count` |

## Check Cart Status

```javascript
chrome_evaluate_script({
  function: `() => ({
    cartCount: document.querySelector('#nav-cart-count')?.textContent,
    url: window.location.href
  })`
})
```

## Tips

1. **NEVER use `take_snapshot`** - This is the #1 rule. Always use `evaluate_script` instead
2. **Use search results add-to-cart** - Don't navigate to product page unless you need to verify details
3. **Filter by ASIN** - If you know the exact product, match by `el.dataset.asin`
4. **Batch searches** - Each search+add is ~2 calls, very efficient
5. **Return minimal data** - Only return the specific fields you need from `evaluate_script`

## Context Usage Comparison

Adding 10 items to cart:

| Method | Total Tokens |
|--------|--------------|
| Snapshot-based | ~500k+ (10 pages × 50k) |
| evaluate_script | ~2-3k (20 calls × 100-150 tokens) |

**~150-200x more efficient**

## Common Mistakes to Avoid

```javascript
// BAD - Don't do this!
chrome_take_snapshot()  // 50k tokens wasted

// GOOD - Do this instead!
chrome_evaluate_script({
  function: `() => ({
    pageTitle: document.title,
    itemCount: document.querySelectorAll('[data-component-type="s-search-result"]').length
  })`
})  // ~100 tokens
```

Remember: If you're about to call `take_snapshot`, STOP and write an `evaluate_script` instead.
