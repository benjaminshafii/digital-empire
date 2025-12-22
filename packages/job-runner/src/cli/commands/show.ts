import { parseArgs } from "util";
import {
  getSearch,
  getLatestJob,
  getJobReport,
  getJobLog,
  listSearches,
} from "../../core/index";

export async function showCommand(args: string[]) {
  const { values, positionals } = parseArgs({
    args,
    options: {
      log: { type: "boolean", short: "l" },
      job: { type: "string", short: "j" },
      json: { type: "boolean" },
      help: { type: "boolean", short: "h" },
    },
    allowPositionals: true,
  });

  if (values.help || positionals.length === 0) {
    console.log(`
Usage: mkt show <slug> [options]

View the latest report for a search.

Options:
  -l, --log         Show raw log instead of report
  -j, --job <id>    Show specific job instead of latest
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
      console.log(`Run it: mkt run ${slug}`);
      return;
    }
    jobId = latest.id;
  }

  if (values.log) {
    // Show raw log
    const log = getJobLog(slug, jobId);
    if (!log) {
      console.log("No log found for this job.");
      return;
    }

    if (values.json) {
      console.log(JSON.stringify({ log }, null, 2));
    } else {
      console.log(log);
    }
    return;
  }

  // Show report
  const report = getJobReport(slug, jobId);

  if (!report) {
    console.log("No report found for this job.");
    console.log("The job may still be running or may have failed.");
    console.log("Check status: mkt jobs");
    console.log(`View log: mkt show ${slug} --log`);
    return;
  }

  if (values.json) {
    console.log(
      JSON.stringify(
        {
          search: slug,
          jobId,
          report,
        },
        null,
        2
      )
    );
    return;
  }

  // Print the report with a header
  console.log("");
  console.log("=".repeat(60));
  console.log(`${search.name} - Report`);
  console.log(`Job: ${jobId}`);
  console.log("=".repeat(60));
  console.log("");
  console.log(report);
  console.log("");
}
