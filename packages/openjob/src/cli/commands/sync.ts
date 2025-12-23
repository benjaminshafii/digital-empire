import { existsSync, readFileSync } from "fs";
import {
  listAllJobs,
  updateJob,
  setCurrentJob,
  getQueueState,
  tmuxSessionExists,
  getTmuxSessionName,
  getJobReportPath,
} from "../../core/index";

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
        // Session gone - check if report.md was created
        const reportPath = getJobReportPath(job.searchSlug, job.id);
        const hasReport = existsSync(reportPath);
        
        let reportValid = false;
        if (hasReport) {
          const content = readFileSync(reportPath, "utf-8").trim();
          reportValid = content.length > 100;
        }

        if (reportValid) {
          updateJob(job.searchSlug, job.id, {
            status: "completed",
            completedAt: new Date().toISOString(),
          });
          console.log(`  Fixed: ${job.id} -> completed (${job.searchSlug})`);
        } else {
          updateJob(job.searchSlug, job.id, {
            status: "failed",
            completedAt: new Date().toISOString(),
            error: "No report.md generated",
          });
          console.log(`  Fixed: ${job.id} -> failed (${job.searchSlug})`);
        }
        fixed++;
      }
    } else if (job.status === "failed") {
      // Re-check failed jobs - report.md might exist now
      const reportPath = getJobReportPath(job.searchSlug, job.id);
      if (existsSync(reportPath)) {
        const content = readFileSync(reportPath, "utf-8").trim();
        if (content.length > 100) {
          updateJob(job.searchSlug, job.id, {
            status: "completed",
            error: undefined,
          });
          console.log(`  Recovered: ${job.id} -> completed (${job.searchSlug})`);
          fixed++;
        }
      }
    }
  }

  // Clear stale current job
  if (queueState.currentJobId) {
    const sessionName = getTmuxSessionName(queueState.currentJobId);
    if (!tmuxSessionExists(sessionName)) {
      setCurrentJob(undefined);
      console.log("  Cleared stale current job");
      fixed++;
    }
  }

  if (fixed === 0) {
    console.log("All jobs in sync.");
  } else {
    console.log(`\nFixed ${fixed} job(s).`);
  }
}
