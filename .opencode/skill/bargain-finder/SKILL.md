---
name: bargain-finder
description: Find local marketplace bargains via browser tools and send top deals to Telegram
---

## Overview

Use this skill to find the best local bargains on Facebook Marketplace and Craigslist with the browser tools only. The goal is a short list of **top 3–5 deals** with a mini-report per deal explaining why it is a great bargain.

Default search center: **957 Hayes St, San Francisco, CA (94117)**.

## Prerequisites

- Chrome running with the OpenCode browser extension (see `browser` skill).
- Telegram configured (see `telegram` skill).

## Inputs (from the user prompt)

- **Items**: list of items to search for (required).
- **Optional filters**: brand preferences, max price caps, condition notes.
- **Excluded keywords** (default): `broken`, `for parts`, `repair`, `not working`.

## Bargain Hallmarks (stupid simple)

1. **Distance first**
   - 0–1 mile: always best
   - 1–3 miles: acceptable
   - 3–5 miles: only if insanely cheap
2. **Price vs typical**
   - Glance at the first 8–10 results to estimate a typical price.
   - If distance is 3–5 miles, only keep listings priced **~50% or less** of typical.
3. **Clean condition**
   - Clear photos and description, no damage language.
4. **Urgency signals**
   - “moving,” “must go,” “today,” “pickup only,” “OBO.”

## Workflow (browser tools only)

### 1) Build search URLs

For each item in the prompt:
- **Facebook Marketplace**: `https://www.facebook.com/marketplace/sanfrancisco/search?query=<item>`
- **Craigslist**: `https://sfbay.craigslist.org/search/sss?query=<item>&search_distance=5&postal=94117`

### 2) Apply filters

- Set **radius to 5 miles** and sort by **closest** (if available).
- If the UI resets location, set it back to **957 Hayes St**.

### 3) Collect candidate listings

For each item, scan the first page and open promising listings in new tabs. Capture:
- title
- price
- distance
- condition notes
- link

Exclude listings that contain the default broken keywords.

### 4) Rank and pick top 3–5

- Rank by distance bucket first, then price vs typical.
- Keep only “insanely cheap” deals if they are 3–5 miles away.
- Add urgency/quality signals as tie-breakers.

### 5) Send Telegram summary

Send a concise report with 2–4 lines per item, capturing the price, distance, condition signals, and why it is a great bargain.

## Telegram Output Format

Use Markdown:

```
*Daily Bargains (SF 957 Hayes St)*

1) $120 — Yamaha receiver + speakers (0.8 mi) [FB link]
   Why it’s a deal: ~50% below typical; clean photos, complete set.
   Condition: described as “like new,” no damage language.
   Notes: pickup today, seller says “must go.”

2) $80 — Solid wood coffee table (2.2 mi) [CL link]
   Why it’s a deal: price below similar listings nearby.
   Condition: solid wood, minor scuffs only.
   Notes: moving sale, quick pickup.
```

## Daily Scheduler Prompt Template

```
---
schedule: "0 9 * * *"
---

@bargain-finder
Find top 3–5 deals near 957 Hayes St, San Francisco. Use browser tools only.
Search Facebook Marketplace and Craigslist for: <items list>.
Apply distance rule (1–3–5 miles), exclude broken listings, and send a short report per deal with why it is great.
Send results via Telegram.
```

## Common Gotchas

- Facebook Marketplace requires an authenticated session in Chrome.
- Filters sometimes reset when switching queries; re-check radius.
- If a listing lacks distance, skip it unless price is obviously insane.

## When Done

Always release the browser lock:
```
browser_browser_release()
```
