import { parseArgs } from "util";
import { listAllJobs, getQueueState, getRunningJob } from "../../core/index";

export async function jobsCommand(args: string[]) {
  const { values } = parseArgs({
    args,
    options: {
      limit: { type: "string", short: "n", default: "10" },
      status: { type: "string", short: "s" },
      json: { type: "boolean", short: "j" },
      help: { type: "boolean", short: "h" },
    },
  });

  if (values.help) {
    console.log(`
Usage: mkt jobs [options]

List recent jobs.

Options:
  -n, --limit <n>       Number of jobs to show (default: 10)
  -s, --status <status> Filter by status (running, completed, failed, queued)
  -j, --json            Output as JSON
  -h, --help            Show help
`);
    return;
  }

  let jobs = listAllJobs(parseInt(values.limit as string, 10) * 2);

  if (values.status) {
    jobs = jobs.filter((j) => j.status === values.status);
  }

  jobs = jobs.slice(0, parseInt(values.limit as string, 10));

  if (values.json) {
    console.log(JSON.stringify(jobs, null, 2));
    return;
  }

  const queueState = getQueueState();
  const runningJob = getRunningJob();

  console.log("");

  if (runningJob) {
    console.log(
      `Currently running: ${runningJob.searchSlug} (job ${runningJob.job.id})`
    );
    console.log(`  Watch: mkt watch ${runningJob.job.id}`);
    console.log("");
  }

  if (queueState.queue.length > 0) {
    console.log(`Queued: ${queueState.queue.length} job(s)`);
    console.log("");
  }

  if (jobs.length === 0) {
    console.log("No jobs yet.");
    console.log("Run a search with: mkt run <slug>");
    return;
  }

  console.log(
    "ID".padEnd(15) +
      "SEARCH".padEnd(22) +
      "STATUS".padEnd(12) +
      "STARTED".padEnd(15) +
      "DURATION"
  );
  console.log("-".repeat(75));

  for (const job of jobs) {
    const id = job.id.padEnd(15);
    const search = job.searchSlug.substring(0, 20).padEnd(22);
    const status = job.status.padEnd(12);

    let started = "-";
    if (job.startedAt) {
      const date = new Date(job.startedAt);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);

      if (diffMins < 60) {
        started = `${diffMins}m ago`;
      } else if (diffHours < 24) {
        started = `${diffHours}h ago`;
      } else {
        started = date.toLocaleDateString();
      }
    }

    let duration = "-";
    if (job.startedAt && job.completedAt) {
      const start = new Date(job.startedAt).getTime();
      const end = new Date(job.completedAt).getTime();
      const secs = Math.floor((end - start) / 1000);
      const mins = Math.floor(secs / 60);
      if (mins > 0) {
        duration = `${mins}m ${secs % 60}s`;
      } else {
        duration = `${secs}s`;
      }
    } else if (job.startedAt && job.status === "running") {
      const start = new Date(job.startedAt).getTime();
      const now = Date.now();
      const secs = Math.floor((now - start) / 1000);
      const mins = Math.floor(secs / 60);
      if (mins > 0) {
        duration = `${mins}m ${secs % 60}s`;
      } else {
        duration = `${secs}s`;
      }
      duration += "...";
    }

    console.log(id + search + status + started.padEnd(15) + duration);
  }

  console.log("");
}
