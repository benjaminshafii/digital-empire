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

function RecipeShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-outer-bg text-ink flex justify-center items-start py-8 px-4">
      <svg style={{ display: "none" }} aria-hidden="true">
        <defs>
          <filter id="whiteDots" x="0%" y="0%" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.6" numOctaves="3" seed="5" result="noise" />
            <feColorMatrix
              in="noise"
              type="matrix"
              values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 100 -80"
              result="dots"
            />
          </filter>

          <filter id="ink-bleed" x="-20%" y="-20%" width="140%" height="140%">
            <feMorphology operator="dilate" radius="0.15" in="SourceGraphic" result="thickened" />
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" result="noise" />
            <feDisplacementMap in="thickened" in2="noise" scale="0.5" xChannelSelector="R" yChannelSelector="G" />
          </filter>

          <filter id="ink-heavy" x="-10%" y="-10%" width="120%" height="120%">
            <feTurbulence type="fractalNoise" baseFrequency="0.6" numOctaves="3" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.0" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
      </svg>

      <div
        className="relative w-full max-w-4xl bg-white border-3 border-ink-black overflow-hidden"
        style={{ filter: "contrast(110%) brightness(100%)", transform: "rotate(-0.2deg)" }}
      >
        <div className="paper-texture" />
        <div className="speckles-black" />
        <div className="speckles-white" />
        <div className="relative z-10">{children}</div>
      </div>
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
        <RecipeShell>
          <div className="p-10 text-center">
            <h1 className="font-sans font-black text-2xl mb-4">Recipe not found</h1>
            <button
              onClick={navigateToList}
              className="font-mono text-[10px] uppercase tracking-widest text-ink-muted hover:text-ink underline"
            >
              Back to recipes
            </button>
          </div>
        </RecipeShell>
      );
    }
    return (
      <RecipeShell>
        <RecipeDetail recipe={recipe} onBack={navigateToList} />
      </RecipeShell>
    );
  }

  return (
    <RecipeShell>
      <RecipeList onSelectRecipe={navigateToRecipe} />
    </RecipeShell>
  );
}
