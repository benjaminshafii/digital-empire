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
    <div>
      <header className="bg-ink-black text-paper p-5 flex flex-col gap-4 md:flex-row md:items-end md:justify-between border-b-3 border-ink-black ink-heavy">
        <div>
          <span className="font-mono text-[10px] uppercase tracking-widest text-paper/70">Family Archive</span>
          <h1 className="text-3xl md:text-5xl font-black tight-tracking leading-tight uppercase mix-blend-screen">
            Family Recipes
          </h1>
        </div>
        <div className="flex flex-col items-start md:items-end">
          <div className="flex gap-2 mb-2">
            <div className="w-1.5 h-1.5 bg-paper rounded-full" />
            <div className="w-1.5 h-1.5 bg-paper rounded-full" />
            <div className="w-1.5 h-1.5 bg-paper rounded-full" />
            <div className="w-1.5 h-1.5 bg-paper rounded-full" />
          </div>
          <span className="text-xs font-medium tracking-wide mix-blend-screen uppercase">Kitchen Notes</span>
        </div>
      </header>

      <div className="grid md:grid-cols-[160px_1fr] border-b-3 border-ink-black bg-paper-cool">
        <div className="p-4 border-b-3 md:border-b-0 md:border-r-3 border-ink-black flex items-center">
          <span className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">
            {recipeCount.toString().padStart(3, "0")} Recipes
          </span>
        </div>
        <div className="p-4">
          <input
            type="text"
            placeholder="Search recipes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      {allTags.length > 0 && (
        <div className="border-b-3 border-ink-black bg-paper">
          <div className="p-4 flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedTag("")}
              className={`tag cursor-pointer transition-colors ${
                !selectedTag ? "bg-ink-black text-paper" : "hover:bg-ink/10"
              }`}
            >
              All
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setSelectedTag(tag === selectedTag ? "" : tag)}
                className={`tag cursor-pointer transition-colors ${
                  tag === selectedTag ? "bg-ink-black text-paper" : "hover:bg-ink/10"
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="w-full py-2 border-b-3 border-ink-black text-center bg-paper-cool">
        <span className="text-xs font-bold tracking-wide ink-bleed uppercase">Recipe Log</span>
      </div>

      <div className="dotted-line" />

      {filteredRecipes.length > 0 ? (
        <ul className="divide-y divide-ink/15">
          {filteredRecipes.map((recipe, index) => (
            <li key={recipe.slug}>
              <RecipeCard
                recipe={recipe}
                index={index}
                onClick={() => onSelectRecipe(recipe.slug)}
              />
            </li>
          ))}
        </ul>
      ) : (
        <div className="text-center py-12">
          <p className="text-ink-muted font-mono text-[10px] uppercase tracking-widest">
            No recipes found
          </p>
        </div>
      )}
    </div>
  );
}
