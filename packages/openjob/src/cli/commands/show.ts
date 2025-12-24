import { parseArgs } from "util";
import {
  getSearch,
  getLatestJob,
  getJobLog,
  getJob,
  listSearches,
  getJobDir,
} from "../../core/index";
import { readdirSync } from "fs";

export async function showCommand(args: string[]) {
  const { values, positionals } = parseArgs({
    args,
    options: {
      job: { type: "string", short: "j" },
      json: { type: "boolean" },
      files: { type: "boolean", short: "f" },
      help: { type: "boolean", short: "h" },
    },
    allowPositionals: true,
  });

  if (values.help || positionals.length === 0) {
    console.log(`
Usage: openjob show <slug> [options]

View job details and logs.

Options:
  -j, --job <id>    Show specific job instead of latest
  -f, --files       List files in job directory
  --json            Output as JSON
  -h, --help        Show help
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

  // Get the job to show
  let jobId = values.job as string | undefined;
  if (!jobId) {
    const latest = getLatestJob(slug);
    if (!latest) {
      console.log(`No completed jobs for "${slug}" yet.`);
      console.log(`Run it: openjob run ${slug}`);
      return;
    }
    jobId = latest.id;
  }

  const job = getJob(slug, jobId);
  if (!job) {
    console.error(`Job "${jobId}" not found`);
    return;
  }

  // List files in job directory
  if (values.files) {
    const jobDir = getJobDir(slug, jobId);
    try {
      const files = readdirSync(jobDir);
      console.log(`Files in job ${jobId}:`);
      for (const file of files) {
        console.log(`  ${file}`);
      }
    } catch {
      console.log("Job directory not found");
    }
    return;
  }

  // Show job info and log
  const log = getJobLog(slug, jobId);

  if (values.json) {
    console.log(JSON.stringify({ 
      job,
      log: log || null,
    }, null, 2));
    return;
  }

  // Print job info
  console.log("");
  console.log("=".repeat(60));
  console.log(`${search.name} - Job ${jobId.slice(0, 8)}`);
  console.log("=".repeat(60));
  console.log(`Status: ${job.status}`);
  console.log(`Created: ${job.createdAt}`);
  if (job.startedAt) console.log(`Started: ${job.startedAt}`);
  if (job.completedAt) console.log(`Completed: ${job.completedAt}`);
  if (job.error) console.log(`Error: ${job.error}`);
  console.log("");
  
  if (log) {
    console.log("--- Log ---");
    console.log(log);
  } else {
    console.log("No log found for this job.");
  }
  console.log("");
}
