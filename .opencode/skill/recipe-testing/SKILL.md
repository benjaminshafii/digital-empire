---
name: recipe-testing
description: Create brutally simple test-stage recipes and, on approval, add them to the recipe app
---

## Purpose

Create ultra-simple, test-stage recipes. These are meant to be cooked once and are not canon. Only add to the recipe app after the user explicitly approves the final summary.

## Workflow

1. **Collect minimal inputs**
   - Dish name
   - Main ingredients (3-8 items)
   - Serving size
   - Rough prep time + cook time
   - Any must-have flavor notes (optional)

2. **Draft a brutally simple recipe**
   - Keep ingredients minimal.
   - Use short, direct steps (3-6 steps).
   - Use metric units (g, ml) and °F.
   - Include only essential tips.

3. **Lock-down confirmation (required)**
   - Summarize the recipe clearly.
   - Ask: “Reply ‘approved’ to add to the testing list.”
   - If not approved, update and repeat.

4. **On approval, add to recipe app**
   - Use the `recipes` skill flow.
   - Tag with `testing` and a relevant meal/cuisine tag if obvious.
   - Add a note like: “Testing recipe — not yet canonical.”

## Output Format (for approval summary)

- Title
- Yield (servings)
- Prep/Cook/Total time
- Ingredients list (metric)
- Steps list (short)
- Tags (include `testing`)
- Notes (include testing disclaimer)

## Notes

- Default to simplicity over perfection.
- No fancy techniques; no more than one optional ingredient.
- If the user asks for “Michelin-ish,” suggest plating or finishing touches, but keep core recipe minimal.
