export interface Ingredient {
  id: string;
  name: string;
  amount: number;
  unit: string;
  prep?: string;
}

export interface RecipeYield {
  amount: number;
  unit: string;
}

export interface RecipeBatch {
  label: string;
  totalGrams: number;
}

export interface RecipeComponent {
  name: string;
  description?: string;
  yieldGrams?: number;
  ingredients: Ingredient[];
  steps?: string[];
}

export interface RecipeFrontMatter {
  title: string;
  slug: string;
  description?: string;
  tags: string[];
  image?: string;
  yield: RecipeYield;
  prepTime?: number;
  cookTime?: number;
  totalTime?: number;
  variables?: Record<string, number>;
  ingredients?: Ingredient[];
  components?: RecipeComponent[];
  batch?: RecipeBatch;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
  author?: string;
}

export interface Recipe extends RecipeFrontMatter {
  content: string;
  rawContent: string;
  ingredients: Ingredient[];
  components: RecipeComponent[];
  batch: RecipeBatch;
}

export interface ScaledIngredient extends Ingredient {
  scaledAmount: number;
}

export function scaleIngredient(
  ingredient: Ingredient,
  baseValue: number,
  targetValue: number
): ScaledIngredient {
  const ratio = targetValue / baseValue;
  return {
    ...ingredient,
    scaledAmount: ingredient.amount * ratio,
  };
}

export function formatAmount(amount: number): string {
  if (amount >= 100) return amount.toFixed(0);
  if (amount >= 10) return amount.toFixed(1);
  if (amount >= 1) return amount.toFixed(2);
  return amount.toFixed(3);
}

export function formatTime(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) return `${hours} hr`;
  return `${hours} hr ${mins} min`;
}
