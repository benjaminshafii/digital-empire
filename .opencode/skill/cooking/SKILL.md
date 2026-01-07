---
name: cooking
description: Format recipes with efficient structure, grams + Fahrenheit, and coupled ingredients in steps
---

## Recipe Formatting Rules

When formatting or creating recipes, ALWAYS follow these rules:

### 1. Ingredients First
- List ALL ingredients at the top before any steps
- Format: `- {amount}g {ingredient}` or `- {count} {ingredient} ({weight}g), {prep}`
- Always include gram weights (even for items like "4 cloves garlic" add "(20g)")

### 2. Dual Units
- **Weight:** Always grams (g)
- **Temperature:** Always Fahrenheit (°F)
- **Volume for liquids:** ml or cups (with ml in parentheses)

### 3. Coupled Ingredients in Steps
- REPEAT the ingredient amount inline when used in a step
- Format: `Add **200g spaghetti** to boiling water`
- Bold the ingredient + amount for scannability

### 4. Efficiency Optimized
- Order steps to minimize idle time
- Call out parallel tasks: "(while X cooks)" or "(start this first)"
- Front-load passive tasks (boiling water, preheating oven)
- Group prep work that can happen during wait times

### 5. Step Structure
Each step should have:
- **Bold action title** - 2-3 word summary
- Clear instruction with coupled ingredients
- Time estimate where relevant
- Temperature where relevant

---

## Template

```markdown
### {Recipe Name}

**Ingredients**
- {amount}g {ingredient}
- {count} {ingredient} ({weight}g), {prep method}
- ...

**Steps**

1. **{Action}** - {Instruction with **Xg ingredient**}. {Time/temp if relevant}.

2. **{Action}** ({parallel note}) - {Instruction with **Xg ingredient**}.

...
```

---

## Example: Garlic Butter Pasta

**Ingredients**
- 200g spaghetti
- 60g butter
- 4 cloves garlic (20g), minced
- 30g parmesan, grated
- 10g fresh parsley, chopped
- Salt to taste

**Steps**

1. **Boil water** - Bring large pot of salted water to boil (start this first while prepping).

2. **Prep while water heats** - Mince **4 cloves garlic (20g)**, grate **30g parmesan**, chop **10g parsley**.

3. **Cook pasta** - Add **200g spaghetti** to boiling water, cook 8-10 min until al dente. Reserve 120ml pasta water before draining.

4. **Make garlic butter** (while pasta cooks) - Melt **60g butter** in large pan over medium heat (350°F). Add **20g minced garlic**, sauté 1-2 min until fragrant (don't brown).

5. **Combine** - Toss drained pasta in garlic butter. Add **30g parmesan** and splash of pasta water. Toss until creamy.

6. **Finish** - Top with **10g parsley**, salt to taste. Serve immediately.

---

## Example: Roasted Chicken Thighs

**Ingredients**
- 4 bone-in chicken thighs (800g total)
- 30g olive oil
- 5g salt
- 3g black pepper
- 4 cloves garlic (20g), smashed
- 2 sprigs rosemary (5g)
- 1 lemon (60g), halved

**Steps**

1. **Preheat oven** - Set to 425°F (start first).

2. **Season chicken** - Pat **800g chicken thighs** dry. Rub with **30g olive oil**, season with **5g salt** and **3g pepper**.

3. **Prep aromatics** (while oven heats) - Smash **4 cloves garlic (20g)**, halve **1 lemon (60g)**.

4. **Arrange pan** - Place chicken skin-side up in baking dish. Scatter **20g smashed garlic**, **5g rosemary**, and **60g lemon halves** around thighs.

5. **Roast** - Bake at 425°F for 35-40 min until skin is golden and internal temp reaches 165°F.

6. **Rest** - Let rest 5 min before serving. Squeeze roasted lemon over top.

---

## Common Conversions Reference

| Item | Typical Weight |
|------|---------------|
| 1 clove garlic | 5g |
| 1 egg | 50g |
| 1 cup flour | 120g |
| 1 cup sugar | 200g |
| 1 cup butter | 225g |
| 1 tbsp olive oil | 14g |
| 1 lemon | 60g |
| 1 medium onion | 150g |
