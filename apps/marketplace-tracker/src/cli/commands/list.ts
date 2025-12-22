import { parseArgs } from "util";
import { listSearches, getLatestJob } from "../../core";

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

List all saved searches.

Options:
  -j, --json    Output as JSON
  -h, --help    Show help
`);
    return;
  }

  const searches = listSearches();

  if (searches.length === 0) {
    console.log("No searches yet.");
    console.log('Create one with: mkt add "search name"');
    return;
  }

  if (values.json) {
    const output = searches.map((s) => {
      const latestJob = getLatestJob(s.slug);
      return {
        ...s,
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
      "LOCATION".padEnd(18) +
      "SCHEDULE".padEnd(15) +
      "LAST RUN".padEnd(15) +
      "STATUS"
  );
  console.log("-".repeat(85));

  for (const search of searches) {
    const latestJob = getLatestJob(search.slug);

    const name = search.name.substring(0, 23).padEnd(25);
    const location = search.location.substring(0, 16).padEnd(18);
    const schedule = (search.schedule || "-").padEnd(15);

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

    console.log(name + location + schedule + lastRun.padEnd(15) + status);
  }

  console.log("");
}
