import { useState, useEffect } from 'react';
import { RecipeList } from './components/RecipeList';
import { RecipeDetail } from './components/RecipeDetail';
import { getRecipeBySlug } from './lib/recipes';

type Route = 
  | { type: 'list' }
  | { type: 'recipe'; slug: string };

function parseHash(): Route {
  const hash = window.location.hash.slice(1); // Remove #
  if (hash.startsWith('/recipe/')) {
    const slug = hash.replace('/recipe/', '');
    return { type: 'recipe', slug };
  }
  return { type: 'list' };
}

export default function App() {
  const [route, setRoute] = useState<Route>(parseHash);

  // Listen for hash changes
  useEffect(() => {
    const handleHashChange = () => {
      setRoute(parseHash());
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Navigate to recipe
  const navigateToRecipe = (slug: string) => {
    window.location.hash = `/recipe/${slug}`;
  };

  // Navigate back to list
  const navigateToList = () => {
    window.location.hash = '';
  };

  // Render based on route
  if (route.type === 'recipe') {
    const recipe = getRecipeBySlug(route.slug);
    if (!recipe) {
      return (
        <div className="min-h-screen p-6 max-w-4xl mx-auto">
          <div className="text-center py-12">
            <h1 className="font-sans font-black text-2xl mb-4">Recipe not found</h1>
            <button
              onClick={navigateToList}
              className="font-mono text-sm text-ink-muted hover:text-ink underline"
            >
              Back to recipes
            </button>
          </div>
        </div>
      );
    }
    return (
      <div className="min-h-screen p-6 max-w-4xl mx-auto paper-texture">
        <RecipeDetail recipe={recipe} onBack={navigateToList} />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 max-w-6xl mx-auto paper-texture">
      <RecipeList onSelectRecipe={navigateToRecipe} />
    </div>
  );
}
