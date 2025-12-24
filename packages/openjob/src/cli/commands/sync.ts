import { existsSync, readFileSync } from "fs";
import { join } from "path";
import {
  listAllJobs,
  updateJob,
  setCurrentJob,
  getQueueState,
  tmuxSessionExists,
  getTmuxSessionName,
  getJobDir,
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
        // Session gone - check exit code to determine success
        const jobDir = getJobDir(job.searchSlug, job.id);
        const exitCodePath = join(jobDir, "EXIT_CODE");
        
        let exitCode: number | null = null;
        if (existsSync(exitCodePath)) {
          const code = readFileSync(exitCodePath, "utf-8").trim();
          exitCode = parseInt(code, 10);
          if (isNaN(exitCode)) exitCode = null;
        }

        if (exitCode === 0) {
          updateJob(job.searchSlug, job.id, {
            status: "completed",
            completedAt: new Date().toISOString(),
          });
          console.log(`  Fixed: ${job.id} -> completed (${job.searchSlug})`);
        } else {
          updateJob(job.searchSlug, job.id, {
            status: "failed",
            completedAt: new Date().toISOString(),
            error: exitCode !== null ? `Exit code: ${exitCode}` : "Session terminated without exit code",
          });
          console.log(`  Fixed: ${job.id} -> failed (${job.searchSlug})`);
        }
        fixed++;
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
