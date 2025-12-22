#!/usr/bin/env bun
/**
 * mkt - Marketplace Tracker CLI
 *
 * Automate Facebook Marketplace searches with AI
 */

import { parseArgs } from "util";
import { addCommand } from "./commands/add";
import { listCommand } from "./commands/list";
import { runCommand } from "./commands/run";
import { jobsCommand } from "./commands/jobs";
import { watchCommand } from "./commands/watch";
import { showCommand } from "./commands/show";
import { deleteCommand } from "./commands/delete";
import { scheduleCommand } from "./commands/schedule";
import { syncCommand } from "./commands/sync";
import { cancelCommand } from "./commands/cancel";

const VERSION = "0.1.0";

const HELP = `
mkt - Marketplace Tracker CLI v${VERSION}

Automate Facebook Marketplace searches with AI.

USAGE:
  mkt <command> [options]

COMMANDS:
  add [name]              Create a new saved search
  list, ls                List all saved searches
  run <slug>              Run a marketplace search
  jobs                    List recent jobs
  watch [job-id]          Attach to a running job's tmux session
  show <slug>             View the latest report for a search
  delete, rm <slug>       Delete a saved search
  cancel [job-id]         Cancel running or queued jobs
  schedule <subcommand>   Manage scheduled runs via cron
  sync                    Fix orphaned job statuses

OPTIONS:
  -h, --help              Show this help message
  -v, --version           Show version

EXAMPLES:
  mkt add "speakers" --prompt "Good speaker under 200"
  mkt run speakers --attach
  mkt show speakers
  mkt jobs --status running

For more info: https://github.com/sst/opencode
`;

async function main() {
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

main();
