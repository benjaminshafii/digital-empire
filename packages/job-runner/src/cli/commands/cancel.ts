import { parseArgs } from "util";
import { cancelJob, listAllJobs, getRunningJob, deleteJob } from "../../core/index";
import { clearQueue, getQueueState, listJobsForSearch } from "../../core/job-store";
import { listSearches } from "../../core/search-store";

export async function cancelCommand(args: string[]) {
  const { values, positionals } = parseArgs({
    args,
    options: {
      all: { type: "boolean", short: "a" },
      queue: { type: "boolean", short: "q" },
      jobs: { type: "boolean", short: "j" },
      help: { type: "boolean", short: "h" },
    },
    allowPositionals: true,
  });

  if (values.help) {
    console.log(`
Usage: mkt cancel [job-id] [options]

Cancel running or queued jobs.

Options:
  -a, --all        Cancel the current running job
  -q, --queue      Clear all queued jobs
  -j, --jobs       Delete ALL job history (keeps searches)
  -h, --help       Show help

Examples:
  mkt cancel cfb7c4dc          Cancel a specific job by ID
  mkt cancel --all             Cancel the currently running job
  mkt cancel --queue           Clear all queued jobs
  mkt cancel --jobs            Delete all job history
  mkt cancel --all --queue     Cancel running job and clear queue
`);
    return;
  }

  // Cancel specific job by ID
  if (positionals.length > 0) {
    const jobId = positionals[0];
    const jobs = listAllJobs(50);
    const job = jobs.find(j => j.id.startsWith(jobId));
    
    if (!job) {
      console.error(`Job not found: ${jobId}`);
      process.exit(1);
    }

    if (job.status !== "running" && job.status !== "queued") {
      console.error(`Job ${jobId} is not running or queued (status: ${job.status})`);
      process.exit(1);
    }

    cancelJob(job.searchSlug, job.id);
    console.log(`Cancelled: ${job.id} (${job.searchSlug})`);
    return;
  }

  // Cancel running job
  if (values.all) {
    const running = getRunningJob();
    if (running) {
      cancelJob(running.searchSlug, running.job.id);
      console.log(`Cancelled running job: ${running.job.id} (${running.searchSlug})`);
    } else {
      console.log("No running job to cancel.");
    }
  }

  // Clear queue
  if (values.queue) {
    const state = getQueueState();
    const count = state.queue.length;
    if (count > 0) {
      clearQueue();
      console.log(`Cleared ${count} queued job(s).`);
    } else {
      console.log("Queue is already empty.");
    }
  }

  // Delete all jobs
  if (values.jobs) {
    const searches = listSearches();
    let deleted = 0;
    
    for (const search of searches) {
      const jobs = listJobsForSearch(search.slug);
      for (const job of jobs) {
        // Cancel if running
        if (job.status === "running" || job.status === "queued") {
          try { cancelJob(search.slug, job.id); } catch {}
        }
        // Delete job
        try {
          deleteJob(search.slug, job.id);
          deleted++;
        } catch {}
      }
    }
    
    // Clear queue state
    clearQueue();
    
    console.log(`Deleted ${deleted} job(s) from all searches.`);
  }

  if (!values.all && !values.queue && !values.jobs && positionals.length === 0) {
    console.log("Specify a job ID, --all, --queue, or --jobs. Use --help for usage.");
  }
}
