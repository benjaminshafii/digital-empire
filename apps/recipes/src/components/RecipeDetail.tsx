import { useCallback, useMemo, useState } from "react";
import type { Recipe, ScaledIngredient } from "../lib/types";
import { formatAmount, formatTime } from "../lib/types";

interface RecipeDetailProps {
  recipe: Recipe;
  onBack: () => void;
}

type IngredientOverrideMap = Record<string, number>;

type ComponentView = {
  name: string;
  description?: string;
  steps: string[];
  scaledIngredients: ScaledIngredient[];
  totalGrams: number;
  targetGrams?: number;
};

const buildIngredientKey = (componentIndex: number, ingredientId: string): string => {
  return `${componentIndex}:${ingredientId}`;
};

const buildStepKey = (componentIndex: number, stepIndex: number): string => {
  return `${componentIndex}:${stepIndex}`;
};

export function RecipeDetail({ recipe, onBack }: RecipeDetailProps) {
  const [batchMultiplier, setBatchMultiplier] = useState(1);
  const [ingredientOverrides, setIngredientOverrides] = useState<IngredientOverrideMap>({});
  const [lastEditedKey, setLastEditedKey] = useState<string | null>(null);
  const [checkedIngredients, setCheckedIngredients] = useState<Set<string>>(new Set());
  const [checkedSteps, setCheckedSteps] = useState<Set<string>>(new Set());

  const targetTotalGrams = recipe.batch.totalGrams * batchMultiplier;

  const componentViews = useMemo<ComponentView[]>(() => {
    const baseAmounts: Record<string, number> = {};

    recipe.components.forEach((component, componentIndex) => {
      component.ingredients.forEach((ingredient) => {
        const key = buildIngredientKey(componentIndex, ingredient.id);
        baseAmounts[key] = ingredient.amount * batchMultiplier;
      });
    });

    let ratio = 1;
    if (lastEditedKey) {
      const baseAmount = baseAmounts[lastEditedKey];
      const overrideAmount = ingredientOverrides[lastEditedKey];
      if (typeof baseAmount === "number" && typeof overrideAmount === "number" && baseAmount > 0) {
        ratio = overrideAmount / baseAmount;
      }
    }

    if (!Number.isFinite(ratio) || ratio <= 0) {
      ratio = 1;
    }

    return recipe.components.map((component, componentIndex) => {
      const scaledIngredients = component.ingredients.map((ingredient) => {
        const key = buildIngredientKey(componentIndex, ingredient.id);
        const overrideAmount = ingredientOverrides[key];
        const baseAmount = baseAmounts[key] ?? ingredient.amount * batchMultiplier;
        const scaledAmount = overrideAmount ?? baseAmount * ratio;
        return {
          ...ingredient,
          scaledAmount,
        };
      });

      const totalGrams = scaledIngredients.reduce(
        (total, ingredient) => total + ingredient.scaledAmount,
        0
      );

      const targetGrams = component.yieldGrams
        ? component.yieldGrams * batchMultiplier
        : undefined;

      return {
        name: component.name,
        description: component.description,
        steps: component.steps ?? [],
        scaledIngredients,
        totalGrams,
        targetGrams,
      };
    });
  }, [recipe.components, ingredientOverrides, batchMultiplier, lastEditedKey]);

  const currentTotalGrams = useMemo(() => {
    return componentViews.reduce((total, component) => total + component.totalGrams, 0);
  }, [componentViews]);
  const hasAdjustments = batchMultiplier !== 1 || Object.keys(ingredientOverrides).length > 0;
  const hasTime = recipe.prepTime || recipe.cookTime || recipe.totalTime;
  const yieldAmountLabel = Number.isInteger(recipe.yield.amount)
    ? recipe.yield.amount.toString()
    : formatAmount(recipe.yield.amount);

  const resetSimulation = useCallback(() => {
    setBatchMultiplier(1);
    setIngredientOverrides({});
  }, []);

  const toggleIngredient = useCallback((key: string) => {
    setCheckedIngredients((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const toggleStep = useCallback((key: string) => {
    setCheckedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const handleBatchChange = useCallback((value: string) => {
    const parsed = Number.parseFloat(value);
    if (!Number.isNaN(parsed) && parsed > 0) {
      setBatchMultiplier(parsed);
    }
  }, []);

  const handleIngredientChange = useCallback(
    (componentIndex: number, ingredientId: string, value: string) => {
      const key = buildIngredientKey(componentIndex, ingredientId);
      if (value.trim() === "") {
        setIngredientOverrides((prev) => {
          const next = { ...prev };
          delete next[key];
          const remainingKeys = Object.keys(next);
          setLastEditedKey((current) => {
            if (current !== key) return current;
            return remainingKeys.length > 0 ? remainingKeys[0] : null;
          });
          return next;
        });
        return;
      }

      const parsed = Number.parseFloat(value);
      if (Number.isNaN(parsed)) {
        return;
      }

      setIngredientOverrides((prev) => ({
        ...prev,
        [key]: parsed,
      }));
      setLastEditedKey(key);
    },
    []
  );

  const scaleStepText = useCallback(
    (html: string, scaledIngredients: ScaledIngredient[]): string => {
      let result = html;
      scaledIngredients.forEach((ingredient) => {
        const patterns = [
          new RegExp(
            `\\*\\*${ingredient.amount}${ingredient.unit}\\s+${ingredient.name}\\*\\*`,
            "gi"
          ),
          new RegExp(
            `\\*\\*${ingredient.amount}\\s*${ingredient.unit}\\s+${ingredient.name}\\*\\*`,
            "gi"
          ),
          new RegExp(
            `<strong>${ingredient.amount}${ingredient.unit}\\s+${ingredient.name}</strong>`,
            "gi"
          ),
          new RegExp(
            `<strong>${ingredient.amount}\\s*${ingredient.unit}\\s+${ingredient.name}</strong>`,
            "gi"
          ),
        ];
        patterns.forEach((pattern) => {
          result = result.replace(
            pattern,
            `<strong class="text-accent-muted">${formatAmount(ingredient.scaledAmount)}${ingredient.unit} ${ingredient.name}</strong>`
          );
        });
      });
      return result;
    },
    []
  );

  return (
    <div>
      <header className="bg-ink-black text-paper p-5 border-b-3 border-ink-black ink-heavy">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex-1">
            <button
              onClick={onBack}
              className="font-mono text-[10px] uppercase tracking-widest text-paper/70 hover:text-paper transition-colors inline-flex items-center gap-2 mb-4"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to recipes
            </button>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-black tight-tracking leading-tight uppercase text-balance mix-blend-screen">
              {recipe.title}
            </h1>
          </div>
          <div className="flex flex-col items-start md:items-end">
            <div className="flex gap-2 mb-2">
              <div className="w-1.5 h-1.5 bg-paper rounded-full" />
              <div className="w-1.5 h-1.5 bg-paper rounded-full" />
              <div className="w-1.5 h-1.5 bg-paper rounded-full" />
              <div className="w-1.5 h-1.5 bg-paper rounded-full" />
            </div>
            <span className="text-xs font-medium tracking-wide mix-blend-screen uppercase">Kitchen Log</span>
          </div>
        </div>
      </header>

      {recipe.image && (
        <div className="border-b-3 border-ink-black">
          <div className="aspect-square bg-ink/5 overflow-hidden max-w-[520px] mx-auto">
            <img src={recipe.image} alt={recipe.title} className="w-full h-full object-cover" />
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-3 border-b-3 border-ink-black bg-paper-cool font-mono text-[10px] uppercase tracking-widest">
        <div className="p-3 border-b-3 md:border-b-0 md:border-r-3 border-ink-black flex items-center">
          <span className="text-ink-muted">
            {recipe.author ? `By ${recipe.author}` : "Family Archive"}
          </span>
        </div>
        <div className="p-3 border-b-3 md:border-b-0 md:border-r-3 border-ink-black flex flex-col gap-1">
          {recipe.prepTime && <span className="text-ink-muted">Prep {formatTime(recipe.prepTime)}</span>}
          {recipe.cookTime && <span className="text-ink-muted">Cook {formatTime(recipe.cookTime)}</span>}
          {recipe.totalTime && <span className="text-ink-muted">Total {formatTime(recipe.totalTime)}</span>}
          {!hasTime && <span className="text-ink-muted/70">Time varies</span>}
        </div>
        <div className="p-3 flex flex-col gap-1">
          <span className="text-ink-muted">1 {recipe.batch.label} = {formatAmount(recipe.batch.totalGrams)}g</span>
          <span className="text-ink-muted/70">
            Yield {yieldAmountLabel} {recipe.yield.unit}
          </span>
        </div>
      </div>

      <div className="border-b-3 border-ink-black p-4 bg-paper">
        <div className="flex flex-wrap gap-2">
          {recipe.tags.length > 0 ? (
            recipe.tags.map((tag) => (
              <span key={tag} className="tag">
                {tag}
              </span>
            ))
          ) : (
            <span className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">
              No tags
            </span>
          )}
        </div>
      </div>

      <div className="dotted-line" />

      <div className="p-6 md:p-10">
        {recipe.description && (
          <p className="font-serif text-lg text-ink-light mb-6">{recipe.description}</p>
        )}

        <div className="border-3 border-ink-black/80 bg-paper-cool p-4 mb-10 flex flex-wrap items-center gap-4">
          <span className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">Batches:</span>
          <input
            type="number"
            value={batchMultiplier}
            onChange={(event) => handleBatchChange(event.target.value)}
            className="batch-input"
            min="0.1"
            step="any"
          />
          <span className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">
            {recipe.batch.label}
          </span>
          <div className="flex flex-col text-left md:text-right md:ml-auto">
            <span className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">
              Target {formatAmount(targetTotalGrams)}g
            </span>
            <span className="font-mono text-[10px] uppercase tracking-widest text-ink">
              Current {formatAmount(currentTotalGrams)}g
            </span>
          </div>
          {hasAdjustments && (
            <button
              onClick={resetSimulation}
              className="font-mono text-[10px] uppercase tracking-widest text-ink-muted hover:text-ink underline"
            >
              Reset
            </button>
          )}
        </div>

        {componentViews.map((component, componentIndex) => (
          <section key={`${component.name}-${componentIndex}`} className="mb-12 last:mb-0">
            <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
              <div>
                <h2 className="component-header">Component: {component.name}</h2>
                {component.description && (
                  <p className="text-sm text-ink-muted mt-2 max-w-2xl">
                    {component.description}
                  </p>
                )}
              </div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">
                {formatAmount(component.totalGrams)}g
                {component.targetGrams && (
                  <span className="text-ink-muted/70">
                    {" "}/ {formatAmount(component.targetGrams)}g target
                  </span>
                )}
              </div>
            </div>

            <div className="grid md:grid-cols-[280px_1fr] gap-8">
              <div>
                <h3 className="section-header">Ingredients</h3>
                <div className="bg-paper border-3 border-ink-black/80">
                  {component.scaledIngredients.map((ingredient) => {
                    const ingredientKey = buildIngredientKey(componentIndex, ingredient.id);
                    const displayAmount = ingredient.scaledAmount;
                    return (
                      <div
                        key={ingredientKey}
                        className={`ingredient-row w-full text-left px-4 hover:bg-ink/5 ${
                          checkedIngredients.has(ingredientKey) ? "checked" : ""
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => toggleIngredient(ingredientKey)}
                          className="flex items-center gap-3 text-left"
                        >
                          <span
                            className={`w-4 h-4 border border-ink/30 flex items-center justify-center text-xs ${
                              checkedIngredients.has(ingredientKey) ? "bg-accent text-paper border-accent" : ""
                            }`}
                          >
                            {checkedIngredients.has(ingredientKey) && "✓"}
                          </span>
                          <span className="ingredient-name">
                            {ingredient.name}
                            {ingredient.prep && (
                              <span className="text-ink-muted text-sm ml-1">({ingredient.prep})</span>
                            )}
                          </span>
                        </button>
                        <div className="flex items-center gap-2 font-mono text-sm">
                          <input
                            type="number"
                            value={Number.isFinite(displayAmount) ? displayAmount : 0}
                            onChange={(event) =>
                              handleIngredientChange(componentIndex, ingredient.id, event.target.value)
                            }
                            className="ingredient-input"
                            step="any"
                          />
                          <span className="text-ink-muted">{ingredient.unit}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <h3 className="section-header">Steps</h3>
                {component.steps.length > 0 ? (
                  <div className="space-y-0">
                    {component.steps.map((step, stepIndex) => {
                      const stepKey = buildStepKey(componentIndex, stepIndex);
                      return (
                        <button
                          key={stepKey}
                          onClick={() => toggleStep(stepKey)}
                          className={`step-item w-full text-left cursor-pointer ${
                            checkedSteps.has(stepKey) ? "checked" : ""
                          }`}
                          data-step={stepIndex + 1}
                        >
                          <div
                            className="prose prose-sm max-w-none"
                            dangerouslySetInnerHTML={{
                              __html: scaleStepText(step, component.scaledIngredients),
                            }}
                          />
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">
                    Steps coming soon
                  </p>
                )}
              </div>
            </div>
          </section>
        ))}

        {recipe.notes && (
          <div className="mt-8">
            <h2 className="section-header">Notes</h2>
            <div className="notes-box whitespace-pre-wrap">{recipe.notes}</div>
          </div>
        )}
      </div>
    </div>
  );
}
