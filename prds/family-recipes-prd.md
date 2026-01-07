# Family Recipes App PRD

## Overview

Transform `apps/recipes` into a family recipe book with:
- **Entry via OpenCode**: Family members type prompts like "add grandma's lasagna recipe" in the OpenCode web UI
- **Display via Web UI**: Beautiful, searchable recipe site at `recipes.benjaminshafii.com`
- **Storage**: Markdown files with YAML front matter in the repo

## Architecture

```
Entry (OpenCode prompts) --> Skill parses & writes .md file --> Git repo
                                                                    |
                                                                    v
                                                          Vite build reads .md
                                                                    |
                                                                    v
                                                          Static site deployed
```

## Recipe Format

Recipes live in `apps/recipes/content/recipes/*.md`

### File Structure
```
apps/recipes/
├── content/
│   └── recipes/
│       ├── lemonade.md
│       ├── grandmas-lasagna.md
│       └── images/
│           ├── lemonade.jpg
│           └── grandmas-lasagna.jpg
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── components/
│   ├── lib/
│   │   └── recipes.ts      # Recipe loader/parser
│   └── styles/
│       └── global.css
├── public/
└── package.json
```

### Recipe Markdown Schema

```markdown
---
title: "Grandma's Lasagna"
slug: grandmas-lasagna
description: "Classic family lasagna with meat sauce"
tags: [italian, pasta, family-favorite, comfort-food]
image: images/grandmas-lasagna.jpg
yield:
  amount: 8
  unit: servings
prepTime: 45
cookTime: 60
totalTime: 105
variables:
  servings: 8
ingredients:
  - id: ground-beef
    name: Ground beef
    amount: 450
    unit: g
  - id: onion
    name: Onion
    amount: 150
    unit: g
    prep: diced
  - id: garlic
    name: Garlic
    amount: 15
    unit: g
    prep: minced
  - id: crushed-tomatoes
    name: Crushed tomatoes
    amount: 800
    unit: g
  - id: lasagna-noodles
    name: Lasagna noodles
    amount: 340
    unit: g
  - id: ricotta
    name: Ricotta cheese
    amount: 450
    unit: g
  - id: mozzarella
    name: Mozzarella
    amount: 340
    unit: g
    prep: shredded
  - id: parmesan
    name: Parmesan
    amount: 60
    unit: g
    prep: grated
  - id: egg
    name: Egg
    amount: 1
    unit: whole
  - id: salt
    name: Salt
    amount: 10
    unit: g
  - id: pepper
    name: Black pepper
    amount: 3
    unit: g
  - id: italian-seasoning
    name: Italian seasoning
    amount: 5
    unit: g
  - id: olive-oil
    name: Olive oil
    amount: 30
    unit: ml
notes: |
  - Mom always adds a pinch of sugar to the sauce
  - Can substitute ground turkey for beef
  - Freezes well for up to 3 months
createdAt: 2024-01-15
updatedAt: 2024-01-15
author: Grandma
---

## Steps

1. **Preheat oven** - Set to 375°F (190°C).

2. **Brown meat** - Heat **30ml olive oil** in large skillet over medium-high heat. Add **450g ground beef**, break apart, cook 8-10 min until browned. Drain excess fat.

3. **Build sauce** - Add **150g diced onion** to meat, cook 5 min until soft. Add **15g minced garlic**, cook 1 min. Stir in **800g crushed tomatoes**, **5g Italian seasoning**, **5g salt**, **2g pepper**. Simmer 20 min.

4. **Prep cheese mixture** (while sauce simmers) - Combine **450g ricotta**, **1 egg**, **30g grated parmesan**, **5g salt**, **1g pepper** in bowl. Mix well.

5. **Cook noodles** - Boil **340g lasagna noodles** according to package. Drain, lay flat to prevent sticking.

6. **Assemble** - In 9x13 baking dish: thin layer of sauce, layer of noodles, 1/3 ricotta mixture, 1/3 **340g shredded mozzarella**, repeat 2 more times. Top with remaining sauce, mozzarella, **30g parmesan**.

7. **Bake** - Cover with foil, bake 25 min at 375°F. Remove foil, bake 25 min more until bubbly and golden.

8. **Rest** - Let stand 15 min before cutting. This helps it hold together.
```

### Key Format Rules

1. **Units**: Always grams (g), ml, or Fahrenheit (°F). Never cups, tbsp, tsp.
2. **Ingredients defined once**: In front matter with `id`, `name`, `amount`, `unit`, optional `prep`
3. **Steps reference ingredients with amounts**: `**450g ground beef**` - bold, includes quantity
4. **Variables for scaling**: `variables.servings` is the base, UI can scale all amounts
5. **Notes section**: In front matter, for family tips and variations
6. **Images**: Relative path in `content/recipes/images/`

## UI Requirements

### Home Page (Recipe List)
- Search bar (searches title, tags, ingredients)
- Grid of recipe cards with:
  - Hero image (or placeholder)
  - Title
  - Tags (first 3)
  - Total time
- Filter by tags
- Sort by: recent, alphabetical, cook time

### Recipe Page
- Hero image
- Title, description, author
- Time badges (prep, cook, total)
- **Servings scaler** - input to adjust yield, recalculates all ingredient amounts
- Ingredients list with:
  - Checkbox to mark as "got it"
  - Scaled amounts based on servings
  - Prep notes
- Steps as numbered list with:
  - Ingredient amounts inline (scaled)
  - Checkable steps
- Notes section (family tips)
- Tags at bottom

### Styling
- Follow `apps/blog/src/styles/global.css` aesthetic:
  - Paper texture background
  - Industrial/label typography
  - Monospace for numbers/measurements
  - Clean, readable, minimal
- Mobile-first, works great on phone in kitchen
- Dark mode support (optional, nice-to-have)

## OpenCode Skill: `recipes`

### Location
`.opencode/skill/recipes/SKILL.md`

### Capabilities

1. **Add recipe** - Parse natural language recipe, create properly formatted .md file
2. **Update recipe** - Modify existing recipe (add notes, fix amounts, etc.)
3. **List recipes** - Show all recipes with basic info
4. **Search recipes** - Find recipes by ingredient, tag, or name

### Skill Behavior

When user says "add this recipe: [recipe text or URL]":
1. Parse the recipe (handle various formats: plain text, URL, structured)
2. Convert all measurements to grams/ml/°F
3. Generate slug from title
4. Create ingredient list with IDs
5. Format steps with bold ingredient references
6. Write to `apps/recipes/content/recipes/{slug}.md`
7. If image URL provided, download to `images/{slug}.jpg`
8. Confirm creation with summary

### Example Prompts the Skill Should Handle

- "Add recipe: Mom's chocolate chip cookies - 225g butter, 200g sugar, 100g brown sugar, 2 eggs, 5ml vanilla, 280g flour, 5g baking soda, 5g salt, 340g chocolate chips. Cream butter and sugars, add eggs and vanilla, mix in dry ingredients, fold in chips. Bake at 375F for 9-11 min."
- "Add a note to the lasagna recipe: works great with Italian sausage too"
- "What recipes use ricotta?"
- "Show me all pasta recipes"

## Technical Implementation

### Dependencies to Add
```json
{
  "dependencies": {
    "gray-matter": "^4.0.3",
    "marked": "^12.0.0",
    "fuse.js": "^7.0.0"
  },
  "devDependencies": {
    "tailwindcss": "^3.4.0",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0",
    "@tailwindcss/typography": "^0.5.0"
  }
}
```

### Recipe Loader (`src/lib/recipes.ts`)
- Use Vite's `import.meta.glob` to load all `.md` files at build time
- Parse front matter with `gray-matter`
- Parse markdown body with `marked`
- Export typed recipe objects
- Provide search function using `fuse.js`

### Scaling Logic
```typescript
function scaleAmount(baseAmount: number, baseServings: number, targetServings: number): number {
  return (baseAmount / baseServings) * targetServings;
}
```

### Build Process
- Vite builds static site
- All recipes baked in at build time
- No runtime file system access needed
- Deploy triggers on git push (already configured for recipes.benjaminshafii.com)

## Success Criteria

1. Family can add recipes via OpenCode prompts
2. Recipes display beautifully on web
3. Servings scaler works correctly
4. Search finds recipes by any field
5. Mobile-friendly for kitchen use
6. Existing lemonade recipe migrated to new format

## Out of Scope (for now)

- User accounts / authentication
- Comments from visitors
- Meal planning
- Shopping list generation
- Nutritional info calculation
- Recipe import from URLs (can add later)

---

## Tasks JSON

See `prds/family-recipes-tasks.json` for executable task list.
