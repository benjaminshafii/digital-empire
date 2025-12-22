/**
 * SearchStore - CRUD operations for saved searches
 */
import { readFileSync, writeFileSync, existsSync, readdirSync, rmSync } from "fs";
import type { Search, CreateSearchOptions } from "./types";
import {
  SEARCHES_DIR,
  getSearchDir,
  getSearchConfigPath,
  ensureDir,
  ensureConfigDirs,
} from "./paths";

// Generate a URL-safe slug from a name
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 50);
}

// Create a new search
export function createSearch(options: CreateSearchOptions): Search {
  ensureConfigDirs();

  const slug = slugify(options.name);
  const searchDir = getSearchDir(slug);

  if (existsSync(searchDir)) {
    throw new Error(`Search "${slug}" already exists`);
  }

  ensureDir(searchDir);

  const search: Search = {
    slug,
    name: options.name,
    prompt: options.prompt,
    location: options.location || "San Francisco",
    schedule: options.schedule,
    createdAt: new Date().toISOString(),
  };

  writeFileSync(getSearchConfigPath(slug), JSON.stringify(search, null, 2));

  return search;
}

// Get a search by slug
export function getSearch(slug: string): Search | null {
  const configPath = getSearchConfigPath(slug);

  if (!existsSync(configPath)) {
    return null;
  }

  try {
    return JSON.parse(readFileSync(configPath, "utf-8"));
  } catch {
    return null;
  }
}

// List all searches
export function listSearches(): Search[] {
  ensureConfigDirs();

  if (!existsSync(SEARCHES_DIR)) {
    return [];
  }

  const searches: Search[] = [];

  for (const slug of readdirSync(SEARCHES_DIR)) {
    const search = getSearch(slug);
    if (search) {
      searches.push(search);
    }
  }

  return searches.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

// Update a search
export function updateSearch(
  slug: string,
  updates: Partial<Omit<Search, "slug" | "createdAt">>
): Search {
  const search = getSearch(slug);

  if (!search) {
    throw new Error(`Search "${slug}" not found`);
  }

  const updated: Search = {
    ...search,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  writeFileSync(getSearchConfigPath(slug), JSON.stringify(updated, null, 2));

  return updated;
}

// Delete a search (and all its jobs)
export function deleteSearch(slug: string): void {
  const searchDir = getSearchDir(slug);

  if (!existsSync(searchDir)) {
    throw new Error(`Search "${slug}" not found`);
  }

  rmSync(searchDir, { recursive: true });
}

// Check if a search exists
export function searchExists(slug: string): boolean {
  return existsSync(getSearchConfigPath(slug));
}
