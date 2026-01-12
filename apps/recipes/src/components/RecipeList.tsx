import { useMemo, useState } from "react";
import { getAllTags, getRecipes } from "../lib/recipes";
import { filterAndSearch } from "../lib/search";
import { RecipeCard } from "./RecipeCard";

interface RecipeListProps {
  onSelectRecipe: (slug: string) => void;
}

export function RecipeList({ onSelectRecipe }: RecipeListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string>("");

  const allTags = useMemo(() => getAllTags(), []);
  const recipeCount = useMemo(() => getRecipes().length, []);

  const filteredRecipes = useMemo(() => {
    return filterAndSearch(searchQuery, selectedTag);
  }, [searchQuery, selectedTag]);

  return (
    <div className="pb-24">
      <header className="sticky top-0 bg-stone-50/95 backdrop-blur-md z-10 px-6 py-4 flex items-center justify-between border-b border-stone-100/70">
        <div>
          <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-stone-400">Kitchen Log</span>
          <h1 className="text-3xl font-serif font-medium text-stone-900">Family Recipes</h1>
        </div>
        <span className="text-xs font-semibold text-stone-400">
          {recipeCount.toString().padStart(3, "0")} recipes
        </span>
      </header>

      <main className="px-6 pt-6">
        <div className="mb-6">
          <input
            type="text"
            placeholder="Search recipes..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="search-input"
          />
        </div>

        {allTags.length > 0 && (
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 mb-6">
            <button
              type="button"
              onClick={() => setSelectedTag("")}
              className={
                "px-3 py-1 rounded-full text-[10px] uppercase tracking-widest font-semibold transition whitespace-nowrap " +
                (!selectedTag
                  ? "bg-stone-900 text-white"
                  : "bg-white text-stone-500 border border-stone-200 hover:bg-stone-100")
              }
            >
              All
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setSelectedTag(tag === selectedTag ? "" : tag)}
                className={
                  "px-3 py-1 rounded-full text-[10px] uppercase tracking-widest font-semibold transition whitespace-nowrap " +
                  (tag === selectedTag
                    ? "bg-stone-900 text-white"
                    : "bg-white text-stone-500 border border-stone-200 hover:bg-stone-100")
                }
              >
                {tag}
              </button>
            ))}
          </div>
        )}

        {filteredRecipes.length > 0 ? (
          <ul className="space-y-4">
            {filteredRecipes.map((recipe, index) => (
              <li key={recipe.slug}>
                <RecipeCard recipe={recipe} index={index} onClick={() => onSelectRecipe(recipe.slug)} />
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-center py-12">
            <p className="text-stone-400 font-medium">No recipes found</p>
          </div>
        )}
      </main>
    </div>
  );
}
