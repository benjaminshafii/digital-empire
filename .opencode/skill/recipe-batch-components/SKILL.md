---
name: recipe-batch-components
description: Define batch grams and componentized recipes for the recipes app
---

## Overview

Use this skill when adding or updating recipes so every recipe defines a batch size in grams and is decomposed into explicit components. The app is read-only; UI changes only simulate adjustments in-memory.

## Required Frontmatter Fields

Always include:

- `batch.label` (string, usually "batch")
- `batch.totalGrams` (number, total output for 1 batch)
- `components` (array of components, even if there is only one)

Keep `yield` for servings, cookies, etc. if it is meaningful.

## Component Rules

- Split recipes into atomic components that can stand alone (e.g., concentrate, sauce, dough, topping, dilution water).
- Each component must include its own `ingredients` and `steps` array.
- If the recipe is simple, create a single component named "Main".
- Ingredient amounts are always in grams (`g`).
- Steps are markdown strings; keep bolded ingredient amounts inline.

## Batch Rules

- `batch.totalGrams` should equal the sum of component yields for 1 batch.
- If servings are supplied, estimate grams per serving and document the logic in your notes.
- Provide `component.yieldGrams` for each component to make the batch math explicit.

### Serving Heuristics (use when needed)

- Drinks: ~200g per serving
- Cookies or bars: ~50g per serving
- Entrées: ~300g per serving
- Sauces or toppings: ~30g per serving

## Template

```markdown
---
title: "Recipe Title"
slug: recipe-slug
description: "Short description"
tags: [tag1, tag2]
image: "/images/recipe-slug.png"
yield:
  amount: 4
  unit: servings
batch:
  label: batch
  totalGrams: 1200
components:
  - name: Base
    description: "Primary component description."
    yieldGrams: 900
    ingredients:
      - id: ingredient-id
        name: Ingredient Name
        amount: 200
        unit: g
    steps:
      - "**Action** - Instruction with **200g ingredient name**."
  - name: Finish
    description: "Secondary component description."
    yieldGrams: 300
    ingredients:
      - id: finish-ingredient
        name: Finish Ingredient
        amount: 300
        unit: g
    steps:
      - "**Finish** - Add **300g finish ingredient**."
notes: |
  - Optional prep tips
createdAt: 2026-01-11
updatedAt: 2026-01-11
author: Family
---
```

## Checklist

- [ ] `batch.totalGrams` matches component totals
- [ ] Each component has ingredients + steps
- [ ] All amounts are in grams
- [ ] Steps include bolded amounts
- [ ] `yield` reflects servings or output units
