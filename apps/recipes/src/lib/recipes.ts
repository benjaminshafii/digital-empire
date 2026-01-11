import matter from "gray-matter";
import { marked } from "marked";
import type { Recipe, RecipeFrontMatter } from "./types";

// Import all markdown files from content/recipes at build time
const recipeFiles = import.meta.glob("../../content/recipes/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

function parseRecipe(rawContent: string, filename: string): Recipe {
  const { data, content } = matter(rawContent);
  const frontMatter = data as RecipeFrontMatter;

  // Generate slug from filename if not in frontmatter
  if (!frontMatter.slug) {
    frontMatter.slug = filename.replace(/^.*\//, "").replace(/\.md$/, "");
  }

  // Ensure required fields have defaults
  if (!frontMatter.tags) frontMatter.tags = [];
  if (!frontMatter.ingredients) frontMatter.ingredients = [];
  if (!frontMatter.yield) frontMatter.yield = { amount: 1, unit: "serving" };

  // Parse markdown content to HTML
  const htmlContent = marked.parse(content, { async: false }) as string;

  return {
    ...frontMatter,
    content: htmlContent,
    rawContent: content,
  };
}

// Parse all recipes at module load time
const recipes: Recipe[] = Object.entries(recipeFiles).map(([path, content]) => {
  return parseRecipe(content, path);
});

// Sort by updatedAt or createdAt, most recent first
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
  recipes.forEach((r) => r.tags.forEach((t) => tagSet.add(t)));
  return Array.from(tagSet).sort();
}

export function getRecipesByTag(tag: string): Recipe[] {
  return recipes.filter((r) => r.tags.includes(tag));
}
