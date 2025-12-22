import { parseArgs } from "util";
import { spawnSync } from "child_process";
import {
  getSearch,
  getPrompt,
  listSearches,
  getSearchPromptPath,
} from "../../core/index";

export async function editCommand(args: string[]) {
  const { values, positionals } = parseArgs({
    args,
    options: {
      help: { type: "boolean", short: "h" },
    },
    allowPositionals: true,
  });

  if (values.help || positionals.length === 0) {
    console.log(`
Usage: mkt edit <slug>

Edit the prompt for a job. Opens in your default editor.

Examples:
  mkt edit desk
  mkt edit speakers
`);
    return;
  }

  const slug = positionals[0];
  const search = getSearch(slug);

  if (!search) {
    console.error(`Error: Job "${slug}" not found`);
    console.log("\nAvailable jobs:");
    for (const s of listSearches()) {
      console.log(`  ${s.slug}`);
    }
    process.exit(1);
  }

  // Ensure prompt.md exists (triggers migration if needed)
  const prompt = getPrompt(slug);
  if (!prompt) {
    console.error("Could not load or create prompt file");
    process.exit(1);
  }

  const promptPath = getSearchPromptPath(slug);
  const editor = process.env.EDITOR || process.env.VISUAL || "nano";

  console.log(`Opening ${promptPath} in ${editor}...`);

  const result = spawnSync(editor, [promptPath], { stdio: "inherit" });

  if (result.error) {
    console.error(`Failed to open editor: ${result.error.message}`);
    process.exit(1);
  }

  console.log("\nPrompt saved. Run with:");
  console.log(`  mkt run ${slug}`);
}
