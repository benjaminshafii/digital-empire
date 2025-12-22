import { parseArgs } from "util";
import {
  attachToJob,
  getRunningJob,
  listTmuxSessions,
  tmuxSessionExists,
  getTmuxSessionName,
} from "../../core/index";

export async function watchCommand(args: string[]) {
  const { values, positionals } = parseArgs({
    args,
    options: {
      help: { type: "boolean", short: "h" },
    },
    allowPositionals: true,
  });

  if (values.help) {
    console.log(`
Usage: mkt watch [job-id]

Attach to a running job's tmux session.

If no job ID is provided, attaches to the currently running job.

Press Ctrl+B, D to detach from the session.
`);
    return;
  }

  let jobId = positionals[0];

  // If no job ID, try to find the running job
  if (!jobId) {
    const running = getRunningJob();
    if (running) {
      jobId = running.job.id;
      console.log(`Attaching to running job: ${jobId} (${running.searchSlug})`);
    } else {
      // Check for any marketplace tracker tmux sessions
      const sessions = listTmuxSessions();
      if (sessions.length === 0) {
        console.log("No jobs currently running.");
        console.log("Start one with: mkt run <slug>");
        return;
      } else if (sessions.length === 1) {
        // Extract job ID from session name (mkt-<jobId>)
        jobId = sessions[0].replace("mkt-", "");
        console.log(`Attaching to session: ${sessions[0]}`);
      } else {
        console.log("Multiple sessions found:");
        for (const s of sessions) {
          console.log(`  ${s}`);
        }
        console.log("\nSpecify which one: mkt watch <job-id>");
        return;
      }
    }
  }

  // Check if session exists
  const sessionName = getTmuxSessionName(jobId);
  if (!tmuxSessionExists(sessionName)) {
    console.error(`No tmux session found for job ${jobId}`);
    console.log("The job may have already completed.");
    console.log("Check job status: mkt jobs");
    process.exit(1);
  }

  console.log("Attaching (Ctrl+B, D to detach)...\n");
  attachToJob(jobId);
}
