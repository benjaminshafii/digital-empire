# Marketplace Tracker

A CLI tool for tracking deals on Facebook Marketplace. Set up search queries with price limits and get notified when new items matching your criteria appear.

## Features

- **Multiple Search Queries**: Track multiple items with different search terms and price limits
- **Status Tracking**: Mark items as new, seen, contacted, purchased, or hidden
- **Terminal UI**: Beautiful TUI for browsing results
- **Background Watching**: Run in watch mode to continuously check for new deals
- **Persistent Storage**: SQLite database for storing queries and results

## Installation

```bash
# From the monorepo root
pnpm install

# Run the CLI
pnpm --filter @cool-website/marketplace-tracker-cli dev
```

## Usage

### Commands

```bash
# Add a new search query
marketplace-tracker add "iPhone 15" --max-price 800 --location "San Francisco"

# List all saved queries
marketplace-tracker list

# Run all queries once
marketplace-tracker run

# Watch mode - continuously check for new items
marketplace-tracker watch

# Delete a query
marketplace-tracker delete <query-id>
```

### Terminal UI

Launch the interactive terminal UI to browse results:

```bash
marketplace-tracker tui
```

## Project Structure

```
marketplace-tracker/
├── packages/
│   ├── cli/              # CLI application
│   │   ├── src/
│   │   │   ├── commands/ # CLI commands (add, list, run, etc.)
│   │   │   ├── tui/      # Terminal UI components
│   │   │   └── index.ts  # Entry point
│   │   └── package.json
│   └── core/             # Core library
│       ├── src/
│       │   ├── runner.ts # Search runner
│       │   ├── store.ts  # Data persistence
│       │   └── types.ts  # TypeScript types
│       └── package.json
├── package.json
└── turbo.json
```

## Tech Stack

- **TypeScript** - Type-safe code
- **Ink** - React for CLI (Terminal UI)
- **better-sqlite3** - Local database
- **Commander** - CLI framework

## Data Model

### Query
```typescript
interface Query {
  id: string;
  name: string;
  searchTerms: string[];
  maxPrice: number;
  location: string;
  createdAt: string;
  lastRun: string | null;
}
```

### Item
```typescript
interface Item {
  id: string;
  queryId: string;
  title: string;
  price: string;
  link: string;
  location: string;
  firstSeen: string;
  status: "new" | "seen" | "contacted" | "purchased" | "hidden";
}
```

## License

MIT
