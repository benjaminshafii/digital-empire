import type { Recipe } from "../lib/types";
import { formatAmount, formatTime } from "../lib/types";
import { ChevronRight, Clock } from "lucide-react";

interface RecipeCardProps {
  recipe: Recipe;
  index: number;
  onClick: () => void;
}

export function RecipeCard({ recipe, index, onClick }: RecipeCardProps) {
  const totalMinutes = recipe.totalTime ?? (recipe.prepTime ?? 0) + (recipe.cookTime ?? 0);
  const totalTimeLabel = totalMinutes ? formatTime(totalMinutes) : null;
  const formattedYield = formatAmount(recipe.yield.amount);
  const parsedYield = Number.parseFloat(formattedYield);
  const yieldLabel = Number.isInteger(recipe.yield.amount)
    ? recipe.yield.amount.toString()
    : Number.isNaN(parsedYield)
      ? formattedYield
      : parsedYield.toString();

  return (
    <button type="button" onClick={onClick} className="recipe-card group">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-400">
            {String(index + 1).padStart(2, "0")}
          </span>
          <h3 className="text-xl font-serif font-medium text-stone-900 mt-2 group-hover:underline decoration-stone-300">
            {recipe.title}
          </h3>
          {recipe.description && <p className="text-stone-500 mt-2 line-clamp-2">{recipe.description}</p>}
          <div className="flex flex-wrap items-center gap-3 mt-4">
            {totalTimeLabel && (
              <span className="inline-flex items-center gap-1 text-xs text-stone-500">
                <Clock size={14} className="text-stone-400" />
                {totalTimeLabel}
              </span>
            )}
            <span className="text-xs text-stone-400">
              {yieldLabel} {recipe.yield.unit}
            </span>
            {recipe.tags.slice(0, 2).map((tag) => (
              <span key={tag} className="tag">
                {tag}
              </span>
            ))}
          </div>
        </div>
        <ChevronRight size={20} className="text-stone-300 group-hover:text-stone-500 transition" />
      </div>
    </button>
  );
}
