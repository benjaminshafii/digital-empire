import { Command } from "commander";
import { getQueries, getNewItems } from "@marketplace-tracker/core";

export const listCommand = new Command("list")
  .description("List all saved queries")
  .option("-v, --verbose", "Show more details")
  .action(async (options) => {
    const queries = getQueries();

    if (queries.length === 0) {
      console.log("No queries saved yet.");
      console.log('Run "marketplace-tracker add <name> -t <terms>" to create one');
      return;
    }

    console.log(`\n${queries.length} saved queries:\n`);

    for (const query of queries) {
      const newItems = getNewItems(query.id);
      const newCount = newItems.length;
      const newBadge = newCount > 0 ? ` (${newCount} new)` : "";

      console.log(`  ${query.name}${newBadge}`);

      if (options.verbose) {
        console.log(`    ID: ${query.id}`);
        console.log(`    Terms: ${query.searchTerms.join(", ")}`);
        console.log(`    Max Price: $${query.maxPrice}`);
        console.log(`    Location: ${query.location}`);
        console.log(`    Last Run: ${query.lastRun || "never"}`);
        console.log("");
      }
    }

    if (!options.verbose) {
      console.log('\nUse --verbose for more details');
    }
  });
