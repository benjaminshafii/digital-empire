#!/usr/bin/env bun
/**
 * ocr - OpenCode Job Runner CLI
 *
 * Run and schedule OpenCode agent jobs
 */

import { parseArgs } from "util";
import { addCommand } from "./commands/add";
import { listCommand } from "./commands/list";
import { runCommand } from "./commands/run";
import { editCommand } from "./commands/edit";
import { jobsCommand } from "./commands/jobs";
import { watchCommand } from "./commands/watch";
import { showCommand } from "./commands/show";
import { deleteCommand } from "./commands/delete";
import { scheduleCommand } from "./commands/schedule";
import { syncCommand } from "./commands/sync";
import { cancelCommand } from "./commands/cancel";

const VERSION = "0.1.0";

const HELP = `
ocr - OpenCode Job Runner v${VERSION}

Run and schedule OpenCode agent jobs.

USAGE:
  ocr <command> [options]

COMMANDS:
  add [name]              Create a new job with a prompt
  edit <slug>             Edit a job's prompt
  list, ls                List all saved jobs
  run <slug>              Run a job
  jobs                    List recent job runs
  watch [job-id]          Attach to a running job's tmux session
  show <slug>             View the latest report for a job
  delete, rm <slug>       Delete a saved job
  cancel [job-id]         Cancel running or queued jobs
  schedule <subcommand>   Manage scheduled runs
  sync                    Fix orphaned job statuses

OPTIONS:
  -h, --help              Show this help message
  -v, --version           Show version

EXAMPLES:
  # Create a job with a prompt
  ocr add -p "Standing desk under 300"
  
  # Create with a specific agent
  ocr add -r -p "@my-agent Do something"
  
  # Edit the prompt
  ocr edit standing-desk
  
  # Run and watch
  ocr run standing-desk --attach

For more info: https://github.com/sst/opencode
`;

export async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args[0] === "-h" || args[0] === "--help") {
    console.log(HELP);
    process.exit(0);
  }
  
  if (args[0] === "-v" || args[0] === "--version") {
    console.log(VERSION);
    process.exit(0);
  }
  
  const command = args[0];
  const commandArgs = args.slice(1);
  
  try {
    switch (command) {
      case "add":
        await addCommand(commandArgs);
        break;
      case "edit":
        await editCommand(commandArgs);
        break;
      case "list":
      case "ls":
        await listCommand(commandArgs);
        break;
      case "run":
        await runCommand(commandArgs);
        break;
      case "jobs":
        await jobsCommand(commandArgs);
        break;
      case "watch":
        await watchCommand(commandArgs);
        break;
      case "show":
        await showCommand(commandArgs);
        break;
      case "delete":
      case "rm":
        await deleteCommand(commandArgs);
        break;
      case "schedule":
        await scheduleCommand(commandArgs);
        break;
      case "sync":
        await syncCommand(commandArgs);
        break;
      case "cancel":
        await cancelCommand(commandArgs);
        break;
      default:
        console.error(`Unknown command: ${command}`);
        console.log(HELP);
        process.exit(1);
    }
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }
}

// Auto-run if this is the entry point
if (import.meta.main) {
  main();
}
