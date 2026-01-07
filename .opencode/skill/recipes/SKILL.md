---
name: recipes
description: Add, update, and manage family recipes in the recipe book app
---

## Overview

The family recipe book lives at `apps/recipes/` and is deployed to `recipes.benjaminshafii.com`.

Recipes are stored as Markdown files with YAML front matter in `apps/recipes/content/recipes/`.

## Quick Usage

### Add a New Recipe

When a user says "add this recipe" or provides recipe details, create a new `.md` file:

```bash
# Create the recipe file
cat > apps/recipes/content/recipes/{slug}.md << 'EOF'
---
title: "Recipe Title"
slug: recipe-slug
description: "Brief description"
tags: [tag1, tag2]
yield:
  amount: 4
  unit: servings
prepTime: 15
cookTime: 30
totalTime: 45
variables:
  servings: 4
ingredients:
  - id: ingredient-id
    name: Ingredient Name
    amount: 100
    unit: g
    prep: optional prep notes
notes: |
  - Family tips go here
createdAt: 2025-01-07
updatedAt: 2025-01-07
author: Family
---

## Steps

1. **Action** - Instruction with **100g ingredient name**.

2. **Next action** - More instructions.
EOF
```

### List All Recipes

```bash
ls apps/recipes/content/recipes/*.md
```

### Search Recipes

```bash
grep -l "ingredient" apps/recipes/content/recipes/*.md
```

---

## Recipe Format Rules

### 1. Units - ALWAYS Use Metric

| Type | Unit | Never Use |
|------|------|-----------|
| Weight | g (grams) | cups, tbsp, tsp, oz, lb |
| Volume (liquids) | ml | cups, fl oz |
| Temperature | °F (Fahrenheit) | Celsius |
| Count | whole, pieces | - |

**Conversions Reference:**
- 1 cup flour = 120g
- 1 cup sugar = 200g
- 1 cup butter = 225g
- 1 tbsp = 15ml
- 1 tsp = 5ml
- 1 egg = 50g
- 1 clove garlic = 5g

### 2. Ingredients Array

Each ingredient MUST have:
- `id`: kebab-case identifier (e.g., `ground-beef`)
- `name`: Display name (e.g., `Ground beef`)
- `amount`: Number (e.g., `450`)
- `unit`: Unit string (e.g., `g`)
- `prep`: Optional prep notes (e.g., `diced`, `minced`)

```yaml
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
```

### 3. Steps Format

Steps are written in Markdown under `## Steps` heading.

Each step should:
1. Start with **bold action title** (2-3 words)
2. Include ingredient amounts inline as **bold** text
3. Include temperatures and times where relevant

```markdown
## Steps

1. **Preheat oven** - Set to 375°F.

2. **Brown meat** - Heat **30ml olive oil** in large skillet. Add **450g ground beef**, cook 8-10 min until browned.

3. **Build sauce** - Add **150g diced onion**, cook 5 min. Add **15g minced garlic**, cook 1 min.
```

### 4. Variables for Scaling

The `variables` field defines what the user can adjust in the UI. The first variable is used as the primary scaler.

```yaml
variables:
  servings: 4  # User can change this, all ingredients scale proportionally
```

For ratio-based recipes (like lemonade), use the key ingredient:

```yaml
variables:
  lemonJuice: 22  # Scale based on lemon juice amount
```

### 5. Tags

Use lowercase, hyphenated tags:
- Cuisine: `italian`, `mexican`, `asian`, `american`
- Type: `breakfast`, `lunch`, `dinner`, `dessert`, `snack`, `drinks`
- Diet: `vegetarian`, `vegan`, `gluten-free`, `dairy-free`
- Occasion: `quick`, `meal-prep`, `family-favorite`, `holiday`
- Method: `baked`, `grilled`, `slow-cooker`, `one-pot`

### 6. Images

Store images in `apps/recipes/content/recipes/images/` with the recipe slug:

```yaml
image: images/garlic-butter-pasta.jpg
```

If no image, omit the field (a placeholder will show).

---

## Example: Complete Recipe

```markdown
---
title: "Garlic Butter Pasta"
slug: garlic-butter-pasta
description: "Simple weeknight pasta with garlic, butter, and parmesan"
tags: [italian, pasta, quick, vegetarian]
yield:
  amount: 2
  unit: servings
prepTime: 10
cookTime: 15
totalTime: 25
variables:
  servings: 2
ingredients:
  - id: spaghetti
    name: Spaghetti
    amount: 200
    unit: g
  - id: butter
    name: Butter
    amount: 60
    unit: g
  - id: garlic
    name: Garlic
    amount: 20
    unit: g
    prep: minced
  - id: parmesan
    name: Parmesan
    amount: 30
    unit: g
    prep: grated
  - id: parsley
    name: Fresh parsley
    amount: 10
    unit: g
    prep: chopped
  - id: salt
    name: Salt
    amount: 5
    unit: g
  - id: black-pepper
    name: Black pepper
    amount: 2
    unit: g
notes: |
  - Reserve pasta water before draining - it helps the sauce come together
  - Don't brown the garlic, just cook until fragrant
  - Add red pepper flakes for heat
createdAt: 2025-01-07
updatedAt: 2025-01-07
author: Family
---

## Steps

1. **Boil water** - Bring large pot of salted water to boil (start this first while prepping).

2. **Prep ingredients** (while water heats) - Mince **20g garlic**, grate **30g parmesan**, chop **10g parsley**.

3. **Cook pasta** - Add **200g spaghetti** to boiling water, cook 8-10 min until al dente. Reserve 120ml pasta water before draining.

4. **Make garlic butter** (while pasta cooks) - Melt **60g butter** in large pan over medium heat. Add **20g minced garlic**, sauté 1-2 min until fragrant (don't brown).

5. **Combine** - Toss drained pasta in garlic butter. Add **30g parmesan** and splash of pasta water. Toss until creamy.

6. **Season and serve** - Add **5g salt** and **2g black pepper** to taste. Top with **10g parsley**. Serve immediately.
```

---

## Common Tasks

### Add a Note to Existing Recipe

Edit the `notes` field in the front matter:

```bash
# Open the recipe file and add to notes section
```

### Update an Ingredient Amount

Find and update the ingredient in the `ingredients` array, then update any step references.

### Add a Tag

Add to the `tags` array in front matter.

### Change Yield

Update both `yield.amount` and `variables.servings` (or the primary variable).

---

## Validation Checklist

Before saving a recipe, verify:

- [ ] `slug` is kebab-case and unique
- [ ] All amounts are in grams (g), ml, or °F
- [ ] Each ingredient has `id`, `name`, `amount`, `unit`
- [ ] Steps reference ingredients with **bold amounts**
- [ ] `totalTime` = `prepTime` + `cookTime`
- [ ] Tags are lowercase and relevant
- [ ] Notes are helpful family tips

---

## After Adding a Recipe

The recipe will appear on `recipes.benjaminshafii.com` after the next deployment.

To test locally:
```bash
cd apps/recipes && pnpm dev
```

To trigger deployment:
```bash
git add apps/recipes/content/recipes/
git commit -m "Add recipe: Recipe Name"
git push
```
