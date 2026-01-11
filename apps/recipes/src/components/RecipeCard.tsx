import type { Recipe } from "../lib/types";
import { formatTime } from "../lib/types";

interface RecipeCardProps {
  recipe: Recipe;
  index: number;
  onClick: () => void;
}

export function RecipeCard({ recipe, index, onClick }: RecipeCardProps) {
  return (
    <button onClick={onClick} className="recipe-card w-full cursor-pointer group">
      <div className="flex items-start gap-3">
        <span className="font-mono text-xs text-ink-muted pt-0.5 font-bold ink-bleed">
          {String(index + 1).padStart(2, "0")}
        </span>
        <div className="flex-1 min-w-0">
          <h3 className="font-sans font-black text-lg md:text-xl tight-tracking leading-tight group-hover:underline decoration-2 underline-offset-2 ink-bleed">
            {recipe.title}
          </h3>
          {recipe.description && (
            <p className="text-sm text-ink-muted mt-2 line-clamp-2">{recipe.description}</p>
          )}
          <div className="flex items-center gap-3 mt-3 flex-wrap">
            {recipe.totalTime && (
              <span className="time-badge">Total {formatTime(recipe.totalTime)}</span>
            )}
            {recipe.tags.length > 0 && (
              <div className="flex gap-1.5 flex-wrap">
                {recipe.tags.slice(0, 3).map((tag) => (
                  <span key={tag} className="tag">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        <span className="font-mono text-[10px] text-ink-muted opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          OPEN
        </span>
      </div>
    </button>
  );
}
