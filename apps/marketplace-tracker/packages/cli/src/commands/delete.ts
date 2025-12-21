import { Command } from "commander";
import { getQueryByName, deleteQuery } from "@marketplace-tracker/core";

export const deleteCommand = new Command("delete")
  .description("Delete a saved query and its items")
  .argument("<name>", "Query name to delete")
  .option("-y, --yes", "Skip confirmation")
  .action(async (name: string, options) => {
    const query = getQueryByName(name);
    if (!query) {
      console.error(`Error: Query "${name}" not found`);
      process.exit(1);
    }

    if (!options.yes) {
      console.log(`About to delete query: ${query.name}`);
      console.log(`  Terms: ${query.searchTerms.join(", ")}`);
      console.log(`  This will also delete all saved items for this query.`);
      console.log("");

      // Simple confirmation using Bun's stdin
      process.stdout.write("Continue? [y/N] ");
      const response = await new Promise<string>((resolve) => {
        process.stdin.once("data", (data) => {
          resolve(data.toString().trim().toLowerCase());
        });
      });

      if (response !== "y" && response !== "yes") {
        console.log("Cancelled");
        return;
      }
    }

    deleteQuery(query.id);
    console.log(`✓ Deleted query: ${name}`);
  });
