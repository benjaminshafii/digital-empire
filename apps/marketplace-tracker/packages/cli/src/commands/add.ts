import { Command } from "commander";
import { addQuery, getQueryByName } from "@marketplace-tracker/core";

export const addCommand = new Command("add")
  .description("Add a new marketplace search query")
  .argument("<name>", "Unique name for this query")
  .option("-t, --terms <terms...>", "Search terms (e.g., -t amp speaker)")
  .option("-p, --max-price <price>", "Maximum price in dollars", "500")
  .option("-l, --location <location>", "Location/city to search", "San Francisco")
  .action(async (name: string, options) => {
    const existing = getQueryByName(name);
    if (existing) {
      console.error(`Error: Query "${name}" already exists`);
      process.exit(1);
    }

    if (!options.terms || options.terms.length === 0) {
      console.error("Error: At least one search term is required (-t)");
      process.exit(1);
    }

    const query = addQuery({
      name,
      searchTerms: options.terms,
      maxPrice: parseInt(options.maxPrice, 10),
      location: options.location,
    });

    console.log(`\n✓ Created query: ${query.name}`);
    console.log(`  ID: ${query.id}`);
    console.log(`  Terms: ${query.searchTerms.join(", ")}`);
    console.log(`  Max Price: $${query.maxPrice}`);
    console.log(`  Location: ${query.location}`);
    console.log(`\nRun "marketplace-tracker run ${name}" to search now`);
  });
