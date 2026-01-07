import { useState, useMemo, useCallback } from 'react';
import type { Recipe, Ingredient, ScaledIngredient } from '../lib/types';
import { scaleIngredient, formatAmount, formatTime } from '../lib/types';

interface RecipeDetailProps {
  recipe: Recipe;
  onBack: () => void;
}

export function RecipeDetail({ recipe, onBack }: RecipeDetailProps) {
  // Get the primary scaling variable (first one in variables, or use yield)
  const baseScaleKey = recipe.variables 
    ? Object.keys(recipe.variables)[0] 
    : null;
  const baseScaleValue = baseScaleKey 
    ? recipe.variables![baseScaleKey] 
    : recipe.yield.amount;

  const [scaleValue, setScaleValue] = useState(baseScaleValue);
  const [checkedIngredients, setCheckedIngredients] = useState<Set<string>>(new Set());
  const [checkedSteps, setCheckedSteps] = useState<Set<number>>(new Set());

  // Scale all ingredients
  const scaledIngredients = useMemo((): ScaledIngredient[] => {
    return recipe.ingredients.map((ing) =>
      scaleIngredient(ing, baseScaleValue, scaleValue)
    );
  }, [recipe.ingredients, baseScaleValue, scaleValue]);

  // Toggle ingredient checked state
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

  // Toggle step checked state
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

  // Parse steps from content (look for ordered list items)
  const steps = useMemo(() => {
    // Extract steps from the HTML content
    const stepRegex = /<li>([\s\S]*?)<\/li>/g;
    const matches = recipe.content.matchAll(stepRegex);
    return Array.from(matches).map((m) => m[1]);
  }, [recipe.content]);

  // Replace ingredient amounts in step text with scaled values
  const scaleStepText = useCallback((html: string): string => {
    let result = html;
    scaledIngredients.forEach((ing) => {
      // Match patterns like **22g lemon juice** or **0.5g lemon zest**
      const patterns = [
        new RegExp(`\\*\\*${ing.amount}${ing.unit}\\s+${ing.name}\\*\\*`, 'gi'),
        new RegExp(`\\*\\*${ing.amount}\\s*${ing.unit}\\s+${ing.name}\\*\\*`, 'gi'),
        new RegExp(`<strong>${ing.amount}${ing.unit}\\s+${ing.name}</strong>`, 'gi'),
        new RegExp(`<strong>${ing.amount}\\s*${ing.unit}\\s+${ing.name}</strong>`, 'gi'),
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

  return (
    <div className="min-h-screen">
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-ink-muted hover:text-ink mb-6 font-mono text-sm"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to recipes
      </button>

      {/* Hero image */}
      {recipe.image && (
        <div className="aspect-video bg-ink/5 mb-6 overflow-hidden">
          <img
            src={recipe.image}
            alt={recipe.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Header */}
      <header className="mb-8">
        <h1 className="font-sans font-black text-3xl md:text-4xl tracking-tight mb-2 text-balance">
          {recipe.title}
        </h1>
        {recipe.description && (
          <p className="font-serif text-lg text-ink-light mb-4">
            {recipe.description}
          </p>
        )}

        {/* Meta info */}
        <div className="flex flex-wrap gap-4 text-sm">
          {recipe.author && (
            <span className="font-mono text-ink-muted">
              by {recipe.author}
            </span>
          )}
          {recipe.prepTime && (
            <span className="time-badge">
              Prep: {formatTime(recipe.prepTime)}
            </span>
          )}
          {recipe.cookTime && (
            <span className="time-badge">
              Cook: {formatTime(recipe.cookTime)}
            </span>
          )}
          {recipe.totalTime && (
            <span className="time-badge">
              Total: {formatTime(recipe.totalTime)}
            </span>
          )}
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1 mt-4">
          {recipe.tags.map((tag) => (
            <span key={tag} className="tag">
              {tag}
            </span>
          ))}
        </div>
      </header>

      {/* Servings scaler */}
      <div className="bg-ink/5 p-4 mb-8 flex items-center gap-4">
        <span className="font-mono text-sm text-ink-muted uppercase tracking-wide">
          {baseScaleKey || 'Servings'}:
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
        <span className="font-mono text-sm text-ink-muted">
          {recipe.yield.unit}
        </span>
        {scaleValue !== baseScaleValue && (
          <button
            onClick={() => setScaleValue(baseScaleValue)}
            className="font-mono text-xs text-ink-muted hover:text-ink underline"
          >
            Reset
          </button>
        )}
      </div>

      <div className="grid md:grid-cols-[300px_1fr] gap-8">
        {/* Ingredients */}
        <div>
          <h2 className="section-header">Ingredients</h2>
          <div className="bg-white border border-ink/10">
            {scaledIngredients.map((ing) => (
              <button
                key={ing.id}
                onClick={() => toggleIngredient(ing.id)}
                className={`ingredient-row w-full text-left px-4 cursor-pointer hover:bg-ink/5 ${
                  checkedIngredients.has(ing.id) ? 'checked' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-4 h-4 border border-ink/30 flex items-center justify-center text-xs ${
                      checkedIngredients.has(ing.id) ? 'bg-accent text-white border-accent' : ''
                    }`}
                  >
                    {checkedIngredients.has(ing.id) && '✓'}
                  </span>
                  <span className="ingredient-name">
                    {ing.name}
                    {ing.prep && (
                      <span className="text-ink-muted text-sm ml-1">
                        ({ing.prep})
                      </span>
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

        {/* Steps */}
        <div>
          <h2 className="section-header">Steps</h2>
          <div className="space-y-0">
            {steps.map((step, index) => (
              <button
                key={index}
                onClick={() => toggleStep(index)}
                className={`step-item w-full text-left cursor-pointer ${
                  checkedSteps.has(index) ? 'checked' : ''
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

      {/* Notes */}
      {recipe.notes && (
        <div className="mt-8">
          <h2 className="section-header">Notes</h2>
          <div className="notes-box whitespace-pre-wrap">
            {recipe.notes}
          </div>
        </div>
      )}
    </div>
  );
}
