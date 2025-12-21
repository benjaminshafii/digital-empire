import { Command } from "commander";
import {
  getQueries,
  getQueryByName,
  addItems,
  getNewItems,
  runMarketplaceSearch,
  updateQueryLastRun,
} from "@marketplace-tracker/core";
import type { Query, SearchResult } from "@marketplace-tracker/core";

async function runQuery(query: Query, verbose: boolean): Promise<number> {
  console.log(`\nSearching: ${query.name}`);
  console.log(`  Terms: ${query.searchTerms.join(", ")}`);
  console.log(`  Max Price: $${query.maxPrice}`);
  console.log(`  Location: ${query.location}`);

  try {
    const startTime = Date.now();
    console.log(`  Starting Chrome automation...`);
    
    const results = await runMarketplaceSearch(
      {
        searchTerms: query.searchTerms,
        maxPrice: query.maxPrice,
        location: query.location,
      },
      { timeout: 180000 }
    );
    
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    console.log(`  Search completed in ${elapsed}s`);

    if (verbose) {
      console.log(`  Found ${results.length} results from search`);
    }

    // Add items to store (deduplicates by link)
    const newItems = addItems(
      query.id,
      results.map((r: SearchResult) => ({
        title: r.text,
        price: r.price,
        link: r.link,
        location: query.location,
      }))
    );

    updateQueryLastRun(query.id);

    if (newItems.length > 0) {
      console.log(`  ✓ ${newItems.length} NEW items found!`);
      for (const item of newItems) {
        console.log(`    - ${item.title} (${item.price})`);
        console.log(`      ${item.link}`);
      }
    } else {
      console.log(`  No new items`);
    }

    return newItems.length;
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error(`  Error: ${msg}`);
    return 0;
  }
}

export const runCommand = new Command("run")
  .description("Run marketplace searches")
  .argument("[name]", "Query name to run (runs all if omitted)")
  .option("-v, --verbose", "Show more details")
  .option("-t, --timeout <ms>", "Timeout per query in ms", "180000")
  .action(async (name: string | undefined, options) => {
    console.log("Note: Each search uses Chrome automation and may take 2-3 minutes.\n");
    let queries: Query[];

    if (name) {
      const query = getQueryByName(name);
      if (!query) {
        console.error(`Error: Query "${name}" not found`);
        process.exit(1);
      }
      queries = [query];
    } else {
      queries = getQueries();
      if (queries.length === 0) {
        console.log("No queries to run.");
        console.log('Run "marketplace-tracker add <name> -t <terms>" to create one');
        return;
      }
    }

    console.log(`Running ${queries.length} ${queries.length === 1 ? "query" : "queries"}...`);

    let totalNew = 0;
    for (const query of queries) {
      totalNew += await runQuery(query, options.verbose);
    }

    console.log(`\n--------------------`);
    console.log(`Total new items: ${totalNew}`);

    if (totalNew > 0) {
      console.log('Run "marketplace-tracker watch" to view items');
    }
  });
