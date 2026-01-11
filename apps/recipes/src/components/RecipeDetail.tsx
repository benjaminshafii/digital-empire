import { useCallback, useMemo, useState } from "react";
import type { Recipe, ScaledIngredient } from "../lib/types";
import { formatAmount, formatTime, scaleIngredient } from "../lib/types";

interface RecipeDetailProps {
  recipe: Recipe;
  onBack: () => void;
}

export function RecipeDetail({ recipe, onBack }: RecipeDetailProps) {
  const baseScaleKey = recipe.variables
    ? Object.keys(recipe.variables)[0]
    : null;
  const baseScaleValue = baseScaleKey
    ? recipe.variables![baseScaleKey]
    : recipe.yield.amount;

  const [scaleValue, setScaleValue] = useState(baseScaleValue);
  const [checkedIngredients, setCheckedIngredients] = useState<Set<string>>(new Set());
  const [checkedSteps, setCheckedSteps] = useState<Set<number>>(new Set());

  const scaledIngredients = useMemo((): ScaledIngredient[] => {
    return recipe.ingredients.map((ing) =>
      scaleIngredient(ing, baseScaleValue, scaleValue)
    );
  }, [recipe.ingredients, baseScaleValue, scaleValue]);

  const toggleIngredient = useCallback((id: string) => {
    setCheckedIngredients((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const toggleStep = useCallback((index: number) => {
    setCheckedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }, []);

  const steps = useMemo(() => {
    const stepRegex = /<li>([\s\S]*?)<\/li>/g;
    const matches = recipe.content.matchAll(stepRegex);
    return Array.from(matches).map((m) => m[1]);
  }, [recipe.content]);

  const scaleStepText = useCallback((html: string): string => {
    let result = html;
    scaledIngredients.forEach((ing) => {
      const patterns = [
        new RegExp(`\\*\\*${ing.amount}${ing.unit}\\s+${ing.name}\\*\\*`, "gi"),
        new RegExp(`\\*\\*${ing.amount}\\s*${ing.unit}\\s+${ing.name}\\*\\*`, "gi"),
        new RegExp(`<strong>${ing.amount}${ing.unit}\\s+${ing.name}</strong>`, "gi"),
        new RegExp(`<strong>${ing.amount}\\s*${ing.unit}\\s+${ing.name}</strong>`, "gi"),
      ];
      patterns.forEach((pattern) => {
        result = result.replace(
          pattern,
          `<strong class="text-accent-muted">${formatAmount(ing.scaledAmount)}${ing.unit} ${ing.name}</strong>`
        );
      });
    });
    return result;
  }, [scaledIngredients]);

  const hasTime = recipe.prepTime || recipe.cookTime || recipe.totalTime;

  return (
    <div>
      <header className="bg-black text-white p-5 border-b-3 border-ink-black ink-heavy">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex-1">
            <button
              onClick={onBack}
              className="font-mono text-[10px] uppercase tracking-widest text-white/70 hover:text-white transition-colors inline-flex items-center gap-2 mb-4"
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
              <div className="w-1.5 h-1.5 bg-white rounded-full" />
              <div className="w-1.5 h-1.5 bg-white rounded-full" />
              <div className="w-1.5 h-1.5 bg-white rounded-full" />
              <div className="w-1.5 h-1.5 bg-white rounded-full" />
            </div>
            <span className="text-xs font-medium tracking-wide mix-blend-screen uppercase">Kitchen Log</span>
          </div>
        </div>
      </header>

      {recipe.image && (
        <div className="border-b-3 border-ink-black">
          <div className="aspect-video bg-ink/5 overflow-hidden">
            <img src={recipe.image} alt={recipe.title} className="w-full h-full object-cover" />
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-3 border-b-3 border-ink-black bg-gray-50 font-mono text-[10px] uppercase tracking-widest">
        <div className="p-3 border-b-3 md:border-b-0 md:border-r-3 border-ink-black flex items-center">
          <span className="text-gray-700">
            {recipe.author ? `By ${recipe.author}` : "Family Archive"}
          </span>
        </div>
        <div className="p-3 border-b-3 md:border-b-0 md:border-r-3 border-ink-black flex flex-col gap-1">
          {recipe.prepTime && <span className="text-gray-700">Prep {formatTime(recipe.prepTime)}</span>}
          {recipe.cookTime && <span className="text-gray-700">Cook {formatTime(recipe.cookTime)}</span>}
          {recipe.totalTime && <span className="text-gray-700">Total {formatTime(recipe.totalTime)}</span>}
          {!hasTime && <span className="text-gray-500">Time varies</span>}
        </div>
        <div className="p-3 flex flex-col gap-1">
          <span className="text-gray-700">
            Yield {formatAmount(recipe.yield.amount)} {recipe.yield.unit}
          </span>
          {baseScaleKey && <span className="text-gray-500">Base {baseScaleKey}</span>}
        </div>
      </div>

      <div className="border-b-3 border-ink-black p-4 bg-white">
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

        <div className="border-3 border-ink-black/80 bg-gray-50 p-4 mb-8 flex flex-wrap items-center gap-4">
          <span className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">
            {baseScaleKey || "Servings"}:
          </span>
          <input
            type="number"
            value={scaleValue}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              if (!isNaN(val) && val > 0) {
                setScaleValue(val);
              }
            }}
            className="servings-input"
            min="0.1"
            step="any"
          />
          <span className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">
            {recipe.yield.unit}
          </span>
          {scaleValue !== baseScaleValue && (
            <button
              onClick={() => setScaleValue(baseScaleValue)}
              className="font-mono text-[10px] uppercase tracking-widest text-ink-muted hover:text-ink underline"
            >
              Reset
            </button>
          )}
        </div>

        <div className="grid md:grid-cols-[280px_1fr] gap-8">
          <div>
            <h2 className="section-header">Ingredients</h2>
            <div className="bg-white border-3 border-ink-black/80">
              {scaledIngredients.map((ing) => (
                <button
                  key={ing.id}
                  onClick={() => toggleIngredient(ing.id)}
                  className={`ingredient-row w-full text-left px-4 cursor-pointer hover:bg-black/5 ${
                    checkedIngredients.has(ing.id) ? "checked" : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-4 h-4 border border-ink/30 flex items-center justify-center text-xs ${
                        checkedIngredients.has(ing.id) ? "bg-accent text-white border-accent" : ""
                      }`}
                    >
                      {checkedIngredients.has(ing.id) && "✓"}
                    </span>
                    <span className="ingredient-name">
                      {ing.name}
                      {ing.prep && (
                        <span className="text-ink-muted text-sm ml-1">({ing.prep})</span>
                      )}
                    </span>
                  </div>
                  <span className="font-mono text-sm">
                    <span className="text-accent-muted font-semibold">
                      {formatAmount(ing.scaledAmount)}
                    </span>
                    <span className="text-ink-muted ml-1">{ing.unit}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <h2 className="section-header">Steps</h2>
            <div className="space-y-0">
              {steps.map((step, index) => (
                <button
                  key={index}
                  onClick={() => toggleStep(index)}
                  className={`step-item w-full text-left cursor-pointer ${
                    checkedSteps.has(index) ? "checked" : ""
                  }`}
                  data-step={index + 1}
                >
                  <div
                    className="prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: scaleStepText(step) }}
                  />
                </button>
              ))}
            </div>
          </div>
        </div>

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
