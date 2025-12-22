import { parseArgs } from "util";
import { listSearches, getLatestJob, getPrompt } from "../../core/index";

export async function listCommand(args: string[]) {
  const { values } = parseArgs({
    args,
    options: {
      json: { type: "boolean", short: "j" },
      help: { type: "boolean", short: "h" },
    },
  });

  if (values.help) {
    console.log(`
Usage: mkt list [options]

List all saved jobs.

Options:
  -j, --json    Output as JSON
  -h, --help    Show help
`);
    return;
  }

  const searches = listSearches();

  if (searches.length === 0) {
    console.log("No jobs yet.");
    console.log('Create one with: mkt add -p "your prompt"');
    return;
  }

  if (values.json) {
    const output = searches.map((s) => {
      const latestJob = getLatestJob(s.slug);
      const prompt = getPrompt(s.slug);
      return {
        ...s,
        promptPreview: prompt?.split("\n")[0] || "",
        lastRun: latestJob?.completedAt,
        lastStatus: latestJob?.status,
      };
    });
    console.log(JSON.stringify(output, null, 2));
    return;
  }

  // Table header
  console.log("");
  console.log(
    "NAME".padEnd(25) +
      "SCHEDULE".padEnd(12) +
      "LAST RUN".padEnd(15) +
      "STATUS".padEnd(10) +
      "PROMPT"
  );
  console.log("-".repeat(90));

  for (const search of searches) {
    const latestJob = getLatestJob(search.slug);
    const prompt = getPrompt(search.slug);
    const promptPreview = (prompt?.split("\n")[0] || "").substring(0, 25);

    const name = search.name.substring(0, 23).padEnd(25);
    const schedule = (search.schedule || "-").padEnd(12);

    let lastRun = "-";
    let status = "-";

    if (latestJob) {
      const date = new Date(latestJob.completedAt || latestJob.createdAt);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 60) {
        lastRun = `${diffMins}m ago`;
      } else if (diffHours < 24) {
        lastRun = `${diffHours}h ago`;
      } else {
        lastRun = `${diffDays}d ago`;
      }

      status =
        latestJob.status === "completed"
          ? "ok"
          : latestJob.status === "running"
            ? "running"
            : latestJob.status;
    }

    console.log(name + schedule + lastRun.padEnd(15) + status.padEnd(10) + promptPreview);
  }

  console.log("");
}
