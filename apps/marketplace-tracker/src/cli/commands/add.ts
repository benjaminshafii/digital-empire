import { parseArgs } from "util";
import { createInterface } from "readline";
import { execSync } from "child_process";
import { createSearch, searchExists, slugify } from "../../core";
import { findOpencodeBinary } from "../../core/paths";

function promptUser(question: string): Promise<string> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

// Generate a short name from a prompt using opencode
async function generateNameFromPrompt(prompt: string): Promise<string> {
  try {
    const opencode = findOpencodeBinary();
    const escaped = prompt.replace(/"/g, '\\"').replace(/\n/g, ' ');
    
    const result = execSync(
      `${opencode} run "Generate a 1-3 word title for this marketplace search. Reply with ONLY the title, nothing else: ${escaped}"`,
      { 
        encoding: "utf-8",
        timeout: 15000,
        cwd: process.cwd(),
        stdio: ['pipe', 'pipe', 'pipe'],
      }
    );
    
    // Extract the title from opencode output - look for the last non-empty line
    const lines = result.trim().split("\n").filter(l => l.trim() && !l.includes("opencode"));
    const title = lines[lines.length - 1]?.trim() || "";
    
    // Clean up
    return title.replace(/["'`]/g, "").substring(0, 40) || "search";
  } catch {
    // Fallback: extract main noun from prompt
    const words = prompt.split(/\s+/).slice(0, 2).join(" ");
    return words.substring(0, 30) || "search";
  }
}

export async function addCommand(args: string[]) {
  const { values, positionals } = parseArgs({
    args,
    options: {
      prompt: { type: "string", short: "p" },
      location: { type: "string", short: "l" },
      schedule: { type: "string", short: "s" },
      help: { type: "boolean", short: "h" },
    },
    allowPositionals: true,
  });

  if (values.help) {
    console.log(`
Usage: mkt add [name] [options]

Create a new saved search.

Options:
  -p, --prompt <text>      What to search for (required)
  -l, --location <city>    Location (default: San Francisco)
  -s, --schedule <cron>    Cron schedule (e.g., "0 9 * * *")
  -h, --help               Show help

Examples:
  mkt add -p "Standing desk under 300"
  mkt add "speakers" --prompt "Good speakers under 200"
  mkt add -p "Herman Miller chair" -l "Oakland"
`);
    return;
  }

  // Get prompt - either from flag or interactively
  let searchPrompt = values.prompt;
  if (!searchPrompt) {
    if (positionals.length === 0) {
      // Fully interactive mode
      searchPrompt = await promptUser("What are you looking for?\n> ");
    } else {
      // Name provided, ask for prompt
      console.log(`\nCreating search: "${positionals[0]}"\n`);
      searchPrompt = await promptUser("What are you looking for?\n> ");
    }

    if (!searchPrompt) {
      throw new Error("Search prompt is required");
    }
  }

  // Get name - from positional, auto-generate, or use prompt
  let name = positionals[0];
  if (!name) {
    console.log("Generating search name...");
    name = await generateNameFromPrompt(searchPrompt);
    console.log(`  → ${name}`);
  }

  // Handle duplicate slugs
  let slug = slugify(name);
  let counter = 2;
  while (searchExists(slug)) {
    slug = `${slugify(name)}-${counter}`;
    name = `${name} ${counter}`;
    counter++;
  }

  const location = values.location || "San Francisco";

  const search = createSearch({
    name,
    prompt: searchPrompt,
    location,
    schedule: values.schedule,
  });

  console.log(`\nCreated search: ${search.slug}`);
  console.log(`  Prompt: ${search.prompt.substring(0, 60)}${search.prompt.length > 60 ? '...' : ''}`);
  console.log(`  Location: ${search.location}`);
  if (search.schedule) {
    console.log(`  Schedule: ${search.schedule}`);
  }

  console.log(`\nRun it now with:`);
  console.log(`  mkt run ${search.slug}`);
}
