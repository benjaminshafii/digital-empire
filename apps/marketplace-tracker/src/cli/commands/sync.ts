import {
  listAllJobs,
  updateJob,
  getJobLog,
  saveJobReport,
  setCurrentJob,
  getQueueState,
  tmuxSessionExists,
  getTmuxSessionName,
} from "../../core";

// Extract report from output log
function extractReport(log: string): string {
  const lines = log.split("\n");
  let inReport = false;
  let reportLines: string[] = [];

  for (const line of lines) {
    const cleanLine = line.replace(/\x1b\[[0-9;]*m/g, "").trim();

    // Start at any markdown header (# or ##)
    if (cleanLine.match(/^#{1,2} /) && !inReport) {
      inReport = true;
      reportLines = [cleanLine];
    } else if (inReport) {
      // Skip tool calls
      if (cleanLine.match(/^\|  \w+_/) || cleanLine.startsWith("$ ") || cleanLine.startsWith("bun run")) {
        continue;
      }
      // Stop at end markers
      if (cleanLine.includes("opencode") && cleanLine.includes("session")) {
        break;
      }
      reportLines.push(cleanLine);
    }
  }

  return reportLines.join("\n").trim();
}

export async function syncCommand(args: string[]) {
  console.log("Syncing job statuses...\n");

  const jobs = listAllJobs(50);
  const queueState = getQueueState();
  let fixed = 0;

  for (const job of jobs) {
    if (job.status === "running") {
      const sessionName = getTmuxSessionName(job.id);
      const sessionExists = tmuxSessionExists(sessionName);

      if (!sessionExists) {
        // Session is gone, job should be marked complete or failed
        const log = getJobLog(job.searchSlug, job.id);
        const report = extractReport(log);

        if (report && report.length > 100) {
          // Save the report
          saveJobReport(job.searchSlug, job.id, report);
          updateJob(job.searchSlug, job.id, {
            status: "completed",
            completedAt: new Date().toISOString(),
          });
          console.log(`  Fixed: ${job.id} -> completed (${job.searchSlug})`);
          fixed++;
        } else {
          updateJob(job.searchSlug, job.id, {
            status: "failed",
            completedAt: new Date().toISOString(),
            error: "Session ended without generating report",
          });
          console.log(`  Fixed: ${job.id} -> failed (${job.searchSlug})`);
          fixed++;
        }
      }
    }
  }

  // Clear current job if it's not actually running
  if (queueState.currentJobId) {
    const sessionName = getTmuxSessionName(queueState.currentJobId);
    if (!tmuxSessionExists(sessionName)) {
      setCurrentJob(undefined);
      console.log("  Cleared stale current job from queue");
      fixed++;
    }
  }

  if (fixed === 0) {
    console.log("All jobs are in sync.");
  } else {
    console.log(`\nFixed ${fixed} job(s).`);
  }
}
