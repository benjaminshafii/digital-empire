import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { RecipeList } from "./components/RecipeList";
import { RecipeDetail } from "./components/RecipeDetail";
import { getRecipeBySlug } from "./lib/recipes";

type Route =
  | { type: "list" }
  | { type: "recipe"; slug: string };

function parseHash(): Route {
  const hash = window.location.hash.slice(1);
  if (hash.startsWith("/recipe/")) {
    const slug = hash.replace("/recipe/", "");
    return { type: "recipe", slug };
  }
  return { type: "list" };
}

function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 font-sans antialiased selection:bg-green-100 selection:text-green-900">
      {children}
    </div>
  );
}

export default function App() {
  const [route, setRoute] = useState<Route>(parseHash);

  useEffect(() => {
    const handleHashChange = () => {
      setRoute(parseHash());
    };
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const navigateToRecipe = (slug: string) => {
    window.location.hash = `/recipe/${slug}`;
  };

  const navigateToList = () => {
    window.location.hash = "";
  };

  if (route.type === "recipe") {
    const recipe = getRecipeBySlug(route.slug);
    if (!recipe) {
      return (
        <AppShell>
          <div className="min-h-screen flex flex-col items-center justify-center text-center px-6">
            <h1 className="text-2xl font-serif font-medium text-stone-900 mb-2">Recipe not found</h1>
            <button
              type="button"
              onClick={navigateToList}
              className="text-sm text-stone-500 hover:text-stone-700 underline"
            >
              Back to recipes
            </button>
          </div>
        </AppShell>
      );
    }
    return (
      <AppShell>
        <RecipeDetail recipe={recipe} onBack={navigateToList} />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <RecipeList onSelectRecipe={navigateToRecipe} />
    </AppShell>
  );
}
