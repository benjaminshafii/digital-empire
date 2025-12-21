import Database from "better-sqlite3";
import { homedir } from "os";
import { mkdirSync, existsSync } from "fs";
import { join } from "path";
import { randomUUID } from "crypto";
import type { Query, Item } from "./types";

const CONFIG_DIR = join(homedir(), ".config", "marketplace-tracker");
const DB_PATH = join(CONFIG_DIR, "data.db");

// Ensure config directory exists
if (!existsSync(CONFIG_DIR)) {
  mkdirSync(CONFIG_DIR, { recursive: true });
}

const db = new Database(DB_PATH);

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS queries (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    search_terms TEXT NOT NULL,
    max_price INTEGER NOT NULL,
    location TEXT NOT NULL,
    created_at TEXT NOT NULL,
    last_run TEXT
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS items (
    id TEXT PRIMARY KEY,
    query_id TEXT NOT NULL,
    title TEXT NOT NULL,
    price TEXT NOT NULL,
    link TEXT UNIQUE NOT NULL,
    location TEXT,
    first_seen TEXT NOT NULL,
    status TEXT DEFAULT 'new',
    FOREIGN KEY (query_id) REFERENCES queries(id)
  )
`);

// Query operations
export function addQuery(query: Omit<Query, "id" | "createdAt" | "lastRun">): Query {
  const id = randomUUID();
  const createdAt = new Date().toISOString();

  const stmt = db.prepare(
    `INSERT INTO queries (id, name, search_terms, max_price, location, created_at, last_run)
     VALUES (?, ?, ?, ?, ?, ?, NULL)`
  );
  stmt.run(id, query.name, JSON.stringify(query.searchTerms), query.maxPrice, query.location, createdAt);

  return { id, ...query, createdAt, lastRun: null };
}

export function getQueries(): Query[] {
  const stmt = db.prepare("SELECT * FROM queries ORDER BY created_at DESC");
  const rows = stmt.all() as any[];
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    searchTerms: JSON.parse(row.search_terms),
    maxPrice: row.max_price,
    location: row.location,
    createdAt: row.created_at,
    lastRun: row.last_run,
  }));
}

export function getQueryById(id: string): Query | null {
  const stmt = db.prepare("SELECT * FROM queries WHERE id = ?");
  const row = stmt.get(id) as any;
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    searchTerms: JSON.parse(row.search_terms),
    maxPrice: row.max_price,
    location: row.location,
    createdAt: row.created_at,
    lastRun: row.last_run,
  };
}

export function getQueryByName(name: string): Query | null {
  const stmt = db.prepare("SELECT * FROM queries WHERE name = ?");
  const row = stmt.get(name) as any;
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    searchTerms: JSON.parse(row.search_terms),
    maxPrice: row.max_price,
    location: row.location,
    createdAt: row.created_at,
    lastRun: row.last_run,
  };
}

export function updateQueryLastRun(id: string): void {
  const stmt = db.prepare("UPDATE queries SET last_run = ? WHERE id = ?");
  stmt.run(new Date().toISOString(), id);
}

export function deleteQuery(id: string): void {
  const deleteItems = db.prepare("DELETE FROM items WHERE query_id = ?");
  const deleteQueryStmt = db.prepare("DELETE FROM queries WHERE id = ?");
  deleteItems.run(id);
  deleteQueryStmt.run(id);
}

// Item operations
export function addItems(queryId: string, items: Omit<Item, "id" | "queryId" | "firstSeen" | "status">[]): Item[] {
  const added: Item[] = [];
  const firstSeen = new Date().toISOString();

  const stmt = db.prepare(
    `INSERT INTO items (id, query_id, title, price, link, location, first_seen, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'new')`
  );

  for (const item of items) {
    const id = randomUUID();
    try {
      stmt.run(id, queryId, item.title, item.price, item.link, item.location || "", firstSeen);
      added.push({ id, queryId, ...item, location: item.location || "", firstSeen, status: "new" });
    } catch (e) {
      // Likely duplicate link, skip
    }
  }

  return added;
}

export function getItems(queryId: string): Item[] {
  const stmt = db.prepare("SELECT * FROM items WHERE query_id = ? ORDER BY first_seen DESC");
  const rows = stmt.all(queryId) as any[];
  return rows.map((row) => ({
    id: row.id,
    queryId: row.query_id,
    title: row.title,
    price: row.price,
    link: row.link,
    location: row.location,
    firstSeen: row.first_seen,
    status: row.status,
  }));
}

export function getNewItems(queryId: string): Item[] {
  const stmt = db.prepare("SELECT * FROM items WHERE query_id = ? AND status = 'new' ORDER BY first_seen DESC");
  const rows = stmt.all(queryId) as any[];
  return rows.map((row) => ({
    id: row.id,
    queryId: row.query_id,
    title: row.title,
    price: row.price,
    link: row.link,
    location: row.location,
    firstSeen: row.first_seen,
    status: row.status,
  }));
}

export function updateItemStatus(id: string, status: Item["status"]): void {
  const stmt = db.prepare("UPDATE items SET status = ? WHERE id = ?");
  stmt.run(status, id);
}

export function markAllSeen(queryId: string): void {
  const stmt = db.prepare("UPDATE items SET status = 'seen' WHERE query_id = ? AND status = 'new'");
  stmt.run(queryId);
}

// Input history operations
db.exec(`
  CREATE TABLE IF NOT EXISTS input_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    input TEXT NOT NULL,
    created_at TEXT NOT NULL
  )
`);

export function addToHistory(input: string): void {
  const stmt = db.prepare("INSERT INTO input_history (input, created_at) VALUES (?, ?)");
  stmt.run(input, new Date().toISOString());
  
  // Keep only last 100 entries
  db.exec("DELETE FROM input_history WHERE id NOT IN (SELECT id FROM input_history ORDER BY id DESC LIMIT 100)");
}

export function getHistory(): string[] {
  const stmt = db.prepare("SELECT input FROM input_history ORDER BY id ASC");
  const rows = stmt.all() as { input: string }[];
  return rows.map((r) => r.input);
}

export function clearHistory(): void {
  db.exec("DELETE FROM input_history");
}
