import { useState, useMemo } from "react";
import { getRecipes, getAllTags } from "../lib/recipes";
import { filterAndSearch } from "../lib/search";
import { RecipeCard } from "./RecipeCard";

interface RecipeListProps {
  onSelectRecipe: (slug: string) => void;
}

export function RecipeList({ onSelectRecipe }: RecipeListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string>("");

  const allTags = useMemo(() => getAllTags(), []);
  
  const filteredRecipes = useMemo(() => {
    return filterAndSearch(searchQuery, selectedTag);
  }, [searchQuery, selectedTag]);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-ink/10 pb-6 mb-8">
        <h1 className="font-sans font-black text-3xl md:text-4xl tracking-tight mb-2">
          Family Recipes
        </h1>
        <p className="font-mono text-sm text-ink-muted">
          {getRecipes().length} recipes
        </p>
      </header>

      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search recipes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
      </div>

      {/* Tag filters */}
      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-8">
          <button
            onClick={() => setSelectedTag("")}
            className={`tag cursor-pointer transition-colors ${
              !selectedTag ? "bg-ink text-white" : "hover:bg-ink/10"
            }`}
          >
            All
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setSelectedTag(tag === selectedTag ? "" : tag)}
              className={`tag cursor-pointer transition-colors ${
                tag === selectedTag ? "bg-ink text-white" : "hover:bg-ink/10"
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {/* Recipe grid */}
      {filteredRecipes.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRecipes.map((recipe) => (
            <RecipeCard
              key={recipe.slug}
              recipe={recipe}
              onClick={() => onSelectRecipe(recipe.slug)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-ink-muted font-mono text-sm">
            No recipes found
          </p>
        </div>
      )}
    </div>
  );
}
