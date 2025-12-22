import { parseArgs } from "util";
import { createInterface } from "readline";
import { execSync } from "child_process";
import { createSearch, searchExists, slugify, getPrompt } from "../../core/index";
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

// Generate a short name from a description using opencode
async function generateNameFromDescription(description: string): Promise<string> {
  try {
    const opencode = findOpencodeBinary();
    const escaped = description.replace(/"/g, '\\"').replace(/\n/g, ' ');
    
    const result = execSync(
      `${opencode} run "Generate a 1-3 word title for this job. Reply with ONLY the title, nothing else: ${escaped}"`,
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
    return title.replace(/["'`]/g, "").substring(0, 40) || "job";
  } catch {
    // Fallback: extract main words from description
    const words = description.split(/\s+/).slice(0, 2).join(" ");
    return words.substring(0, 30) || "job";
  }
}

/**
 * Generate a default FB Marketplace prompt template
 * This serves as an example of how to structure prompts for the orchestrator
 */
function generateFBMarketplacePrompt(description: string, location: string): string {
  return `@fb-marketplace Find deals on Facebook Marketplace.

SEARCH: ${description}
LOCATION: ${location}

Write a markdown report with:
- **Top Picks** (3-5 best deals with links)
- **Other Options** (table: price, item, link)
- **Avoid** (overpriced/sketchy listings)

CRITICAL: Every item MUST have a Facebook Marketplace link.
Format: [Item - $XX](https://facebook.com/marketplace/item/XXX)
No link = don't include it.

Save the report to: {{reportPath}}`;
}

export async function addCommand(args: string[]) {
  const { values, positionals } = parseArgs({
    args,
    options: {
      prompt: { type: "string", short: "p" },
      location: { type: "string", short: "l" },
      schedule: { type: "string", short: "s" },
      raw: { type: "boolean", short: "r" },
      help: { type: "boolean", short: "h" },
    },
    allowPositionals: true,
  });

  if (values.help) {
    console.log(`
Usage: mkt add [name] [options]

Create a new job with a prompt.

Options:
  -p, --prompt <text>      What to search for (generates FB Marketplace prompt)
  -l, --location <city>    Location for FB Marketplace (default: San Francisco)
  -s, --schedule <interval> Schedule interval (e.g., "1h", "6h", "24h")
  -r, --raw                 Use prompt as-is (don't wrap in FB Marketplace template)
  -h, --help               Show help

Examples:
  # FB Marketplace search (default)
  mkt add -p "Standing desk under 300"
  mkt add -p "Herman Miller chair" -l "Oakland"

  # Raw prompt with any agents
  mkt add -r -p "@my-agent Do something custom"
  mkt add -r -p "@fb-marketplace Find X then @telegram notify"
`);
    return;
  }

  // Get description - either from flag or interactively
  let description = values.prompt;
  if (!description) {
    if (positionals.length === 0) {
      // Fully interactive mode
      description = await promptUser("What are you looking for?\n> ");
    } else {
      // Name provided, ask for description
      console.log(`\nCreating job: "${positionals[0]}"\n`);
      description = await promptUser("What are you looking for?\n> ");
    }

    if (!description) {
      throw new Error("Prompt/description is required");
    }
  }

  // Get name - from positional or auto-generate
  let name = positionals[0];
  if (!name) {
    console.log("Generating job name...");
    name = await generateNameFromDescription(description);
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

  // Generate the prompt content
  let promptContent: string;
  if (values.raw) {
    // Use as-is
    promptContent = description;
  } else {
    // Wrap in FB Marketplace template
    const location = values.location || "San Francisco";
    promptContent = generateFBMarketplacePrompt(description, location);
  }

  const search = createSearch({
    name,
    prompt: promptContent,
    schedule: values.schedule,
  });

  console.log(`\nCreated job: ${search.slug}`);
  
  // Show first few lines of prompt
  const promptPreview = promptContent.split("\n").slice(0, 3).join("\n");
  console.log(`  Prompt:\n    ${promptPreview.replace(/\n/g, "\n    ")}...`);
  
  if (search.schedule) {
    console.log(`  Schedule: ${search.schedule}`);
  }

  console.log(`\nRun it now with:`);
  console.log(`  mkt run ${search.slug}`);
  console.log(`\nEdit the prompt with:`);
  console.log(`  mkt edit ${search.slug}`);
}
