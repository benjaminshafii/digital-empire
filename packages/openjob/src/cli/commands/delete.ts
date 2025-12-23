import { parseArgs } from "util";
import { createInterface } from "readline";
import { deleteSearch, getSearch, listSearches } from "../../core/index";

export async function deleteCommand(args: string[]) {
  const { values, positionals } = parseArgs({
    args,
    options: {
      force: { type: "boolean", short: "f" },
      help: { type: "boolean", short: "h" },
    },
    allowPositionals: true,
  });

  if (values.help || positionals.length === 0) {
    console.log(`
Usage: mkt delete <slug> [options]

Delete a saved search and all its jobs.

Options:
  -f, --force    Skip confirmation
  -h, --help     Show help
`);
    return;
  }

  const slug = positionals[0];
  const search = getSearch(slug);

  if (!search) {
    console.error(`Error: Search "${slug}" not found`);
    console.log("\nAvailable searches:");
    for (const s of listSearches()) {
      console.log(`  ${s.slug}`);
    }
    process.exit(1);
  }

  if (!values.force) {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const answer = await new Promise<string>((resolve) => {
      rl.question(
        `Delete "${search.name}" and all its job history? (y/N) `,
        resolve
      );
    });
    rl.close();

    if (answer.toLowerCase() !== "y") {
      console.log("Cancelled.");
      return;
    }
  }

  deleteSearch(slug);
  console.log(`Deleted: ${slug}`);
}
