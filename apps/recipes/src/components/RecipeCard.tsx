import type { Recipe } from '../lib/types';
import { formatTime } from '../lib/types';

interface RecipeCardProps {
  recipe: Recipe;
  onClick: () => void;
}

export function RecipeCard({ recipe, onClick }: RecipeCardProps) {
  return (
    <button
      onClick={onClick}
      className="recipe-card text-left w-full cursor-pointer group"
    >
      {/* Image */}
      {recipe.image ? (
        <div className="aspect-[4/3] bg-ink/5 mb-3 overflow-hidden">
          <img
            src={recipe.image}
            alt={recipe.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>
      ) : (
        <div className="aspect-[4/3] bg-ink/5 mb-3 flex items-center justify-center">
          <span className="text-4xl opacity-20">🍽</span>
        </div>
      )}

      {/* Title */}
      <h3 className="font-sans font-semibold text-lg mb-1 group-hover:underline">
        {recipe.title}
      </h3>

      {/* Description */}
      {recipe.description && (
        <p className="text-sm text-ink-muted mb-3 line-clamp-2">
          {recipe.description}
        </p>
      )}

      {/* Tags */}
      <div className="flex flex-wrap gap-1 mb-3">
        {recipe.tags.slice(0, 3).map((tag) => (
          <span key={tag} className="tag">
            {tag}
          </span>
        ))}
      </div>

      {/* Time */}
      {recipe.totalTime && (
        <div className="time-badge">
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          {formatTime(recipe.totalTime)}
        </div>
      )}
    </button>
  );
}
