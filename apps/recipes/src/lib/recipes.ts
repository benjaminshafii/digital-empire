import matter from "gray-matter";
import { marked } from "marked";
import type {
  Ingredient,
  Recipe,
  RecipeBatch,
  RecipeComponent,
  RecipeFrontMatter,
} from "./types";

const recipeFiles = import.meta.glob("../../content/recipes/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const sumIngredientAmounts = (ingredients: Ingredient[]): number => {
  return ingredients.reduce((total, ingredient) => total + ingredient.amount, 0);
};

const normalizeHtmlSteps = (htmlContent: string): string[] => {
  const stepRegex = /<li>([\s\S]*?)<\/li>/g;
  const matches = htmlContent.matchAll(stepRegex);
  return Array.from(matches).map((match) => match[1]);
};

const normalizeComponentSteps = (steps?: string[]): string[] => {
  if (!steps || steps.length === 0) return [];
  return steps.map((step) => marked.parseInline(step) as string);
};

const normalizeComponents = (
  frontMatter: RecipeFrontMatter,
  htmlContent: string
): RecipeComponent[] => {
  if (frontMatter.components && frontMatter.components.length > 0) {
    return frontMatter.components.map((component) => {
      const ingredients = component.ingredients ?? [];
      return {
        ...component,
        ingredients,
        steps: normalizeComponentSteps(component.steps),
        yieldGrams: component.yieldGrams ?? sumIngredientAmounts(ingredients),
      };
    });
  }

  const ingredients = frontMatter.ingredients ?? [];
  return [
    {
      name: "Main",
      ingredients,
      steps: normalizeHtmlSteps(htmlContent),
      yieldGrams: sumIngredientAmounts(ingredients),
    },
  ];
};

const normalizeBatch = (
  frontMatter: RecipeFrontMatter,
  components: RecipeComponent[]
): RecipeBatch => {
  const baseTotal = components.reduce((total, component) => {
    const componentTotal = component.yieldGrams ?? sumIngredientAmounts(component.ingredients);
    return total + componentTotal;
  }, 0);

  return {
    label: frontMatter.batch?.label ?? "batch",
    totalGrams: frontMatter.batch?.totalGrams ?? baseTotal,
  };
};

const flattenIngredients = (components: RecipeComponent[]): Ingredient[] => {
  return components.flatMap((component) => component.ingredients ?? []);
};

function parseRecipe(rawContent: string, filename: string): Recipe {
  const { data, content } = matter(rawContent);
  const frontMatter = data as RecipeFrontMatter;

  if (!frontMatter.slug) {
    frontMatter.slug = filename.replace(/^.*\//, "").replace(/\.md$/, "");
  }

  if (!frontMatter.tags) frontMatter.tags = [];
  if (!frontMatter.pairsWellWith) frontMatter.pairsWellWith = [];
  if (!frontMatter.ingredients) frontMatter.ingredients = [];
  if (!frontMatter.yield) frontMatter.yield = { amount: 1, unit: "serving" };

  const htmlContent = marked.parse(content, { async: false }) as string;

  const components = normalizeComponents(frontMatter, htmlContent);
  const batch = normalizeBatch(frontMatter, components);
  const ingredients = flattenIngredients(components);

  return {
    ...frontMatter,
    content: htmlContent,
    rawContent: content,
    components,
    ingredients,
    batch,
  };
}

const recipes: Recipe[] = Object.entries(recipeFiles).map(([path, content]) => {
  return parseRecipe(content, path);
});

const normalizeDate = (value: unknown): string => {
  if (!value) return "1970-01-01";
  if (typeof value === "string") return value;
  if (typeof value === "number") return new Date(value).toISOString();
  if (value instanceof Date) return value.toISOString();
  return String(value);
};

recipes.sort((a, b) => {
  const dateA = normalizeDate(a.updatedAt || a.createdAt);
  const dateB = normalizeDate(b.updatedAt || b.createdAt);
  return dateB.localeCompare(dateA);
});

export function getRecipes(): Recipe[] {
  return recipes;
}

export function getRecipeBySlug(slug: string): Recipe | undefined {
  return recipes.find((r) => r.slug === slug);
}

export function getAllTags(): string[] {
  const tagSet = new Set<string>();
  recipes.forEach((recipe) => recipe.tags.forEach((tag) => tagSet.add(tag)));
  return Array.from(tagSet).sort();
}

export function getRecipesByTag(tag: string): Recipe[] {
  return recipes.filter((recipe) => recipe.tags.includes(tag));
}
