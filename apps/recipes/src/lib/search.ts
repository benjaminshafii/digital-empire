import Fuse, { type IFuseOptions } from "fuse.js";
import type { Recipe } from "./types";
import { getRecipes } from "./recipes";

// Create a searchable index
const fuseOptions: IFuseOptions<Recipe> = {
  keys: [
    { name: "title", weight: 2 },
    { name: "description", weight: 1 },
    { name: "tags", weight: 1.5 },
    { name: "ingredients.name", weight: 1 },
    { name: "author", weight: 0.5 },
  ],
  threshold: 0.3,
  includeScore: true,
  ignoreLocation: true,
};

let fuse: Fuse<Recipe> | null = null;

function getFuse(): Fuse<Recipe> {
  if (!fuse) {
    fuse = new Fuse(getRecipes(), fuseOptions);
  }
  return fuse;
}

export function searchRecipes(query: string): Recipe[] {
  if (!query.trim()) {
    return getRecipes();
  }

  const results = getFuse().search(query);
  return results.map((result) => result.item);
}

export function filterByTag(recipes: Recipe[], tag: string): Recipe[] {
  if (!tag) return recipes;
  return recipes.filter((recipe) => recipe.tags.includes(tag));
}

export function filterAndSearch(query: string, tag?: string): Recipe[] {
  let results = searchRecipes(query);
  if (tag) {
    results = filterByTag(results, tag);
  }
  return results;
}
