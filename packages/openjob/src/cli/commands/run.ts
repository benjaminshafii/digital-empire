import { parseArgs } from "util";
import {
  getSearch,
  listSearches,
  startJob,
  attachToJob,
  isTmuxAvailable,
  getPrompt,
} from "../../core/index";

export async function runCommand(args: string[]) {
  const { values, positionals } = parseArgs({
    args,
    options: {
      attach: { type: "boolean", short: "a" },
      all: { type: "boolean" },
      help: { type: "boolean", short: "h" },
    },
    allowPositionals: true,
  });

  if (values.help) {
    console.log(`
Usage: mkt run <slug> [options]

Run a job.

Options:
  -a, --attach    Attach to tmux session to watch live
  --all           Run all jobs (sequentially)
  -h, --help      Show help

Examples:
  mkt run speakers
  mkt run speakers --attach
  mkt run --all
`);
    return;
  }

  // Check tmux
  if (!isTmuxAvailable()) {
    throw new Error("tmux is required but not installed. Install with: brew install tmux");
  }

  if (values.all) {
    const searches = listSearches();
    if (searches.length === 0) {
      console.log("No jobs to run.");
      return;
    }

    console.log(`Queueing ${searches.length} jobs...`);

    for (const search of searches) {
      try {
        const job = await startJob(search.slug);
        console.log(`  ${search.slug}: ${job.status} (job ${job.id})`);
      } catch (error) {
        console.error(
          `  ${search.slug}: error - ${error instanceof Error ? error.message : error}`
        );
      }
    }

    console.log("\nJobs queued. Run 'mkt jobs' to see status.");
    console.log("Attach to a running job with: mkt watch");
    return;
  }

  // Single job
  if (positionals.length === 0) {
    throw new Error("Please specify a job slug. Run 'mkt list' to see available jobs.");
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

  const prompt = getPrompt(slug);
  const promptPreview = prompt?.split("\n")[0] || "...";

  console.log(`Starting job: ${search.name}`);
  console.log(`  Prompt: ${promptPreview.substring(0, 60)}...`);
  console.log("");

  const job = await startJob(slug, {
    onStart: (j) => {
      console.log(`Job started: ${j.id}`);
      console.log(`  tmux session: ${j.tmuxSession}`);
    },
    onComplete: (result) => {
      if (result.job.status === "completed") {
        console.log(`\nJob completed!`);
        console.log(`View report: mkt show ${slug}`);
      } else {
        console.log(`\nJob failed: ${result.job.error}`);
      }
    },
  });

  if (job.status === "queued") {
    console.log(`Job queued (another job is running): ${job.id}`);
    console.log("It will start automatically when the current job finishes.");
    return;
  }

  if (values.attach) {
    console.log("\nAttaching to session (Ctrl+B, D to detach)...\n");
    attachToJob(job.id);
  } else {
    console.log("Job running in background.");
    console.log(`  Watch: tmux attach -t mkt-${job.id}`);
    console.log(`  Status: mkt jobs`);
    console.log(`  When done: mkt sync && mkt show ${slug}`);
  }
}
