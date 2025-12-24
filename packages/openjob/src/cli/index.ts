#!/usr/bin/env bun
/**
 * openjob - Interactive OpenCode Job Runner
 * 
 * Usage:
 *   openjob           Start interactive TUI
 *   openjob serve     Start web server + scheduler
 *   openjob <cmd>     Run a specific command
 */

import { parseArgs } from "util";
import { startTui } from "./tui";
import { listCommand } from "./commands/list";
import { runCommand } from "./commands/run";
import { jobsCommand } from "./commands/jobs";
import { watchCommand } from "./commands/watch";
import { showCommand } from "./commands/show";
import { deleteCommand } from "./commands/delete";
import { syncCommand } from "./commands/sync";
import { cancelCommand } from "./commands/cancel";
import { createServer } from "../web";
import { setDataDir, ensureDataDirs } from "../core";
import { join } from "path";

const VERSION = "0.1.0";

const HELP = `
openjob - Interactive OpenCode Job Runner v${VERSION}

USAGE:
  openjob                   Start interactive TUI (default)
  openjob serve [--port N]  Start web server + scheduler
  openjob <command>         Run a specific command

COMMANDS:
  serve               Start web UI + scheduler (non-blocking in TUI)
  tui                 Start new OpenTUI interface (experimental)
  list, ls            List all saved jobs
  run <slug>          Run a job
  jobs                List recent job runs
  watch [job-id]      Attach to a running job's tmux session
  show <slug>         View the latest report for a job
  delete, rm <slug>   Delete a saved job
  cancel [job-id]     Cancel running or queued jobs
  sync                Fix orphaned job statuses

OPTIONS:
  -h, --help          Show this help message
  -v, --version       Show version
  -d, --data <dir>    Set data directory (default: ./data)

INTERACTIVE MODE (default):
  Just run 'openjob' to enter the interactive TUI:
  - Type prompts with @agent autocomplete
  - Enter: run + attach to tmux
  - Ctrl+B: run in background
  - Ctrl+S: schedule job
  - Ctrl+W: toggle web server

For more info: https://github.com/sst/opencode
`;

async function serveCommand(args: string[]) {
  const { values } = parseArgs({
    args,
    options: {
      port: { type: "string", short: "p", default: "3456" },
    },
    allowPositionals: true,
  });
  
  const port = parseInt(values.port || "3456", 10);
  ensureDataDirs();
  
  const server = createServer({ port, scheduler: true });
  
  // Keep the process running
  console.log("\nPress Ctrl+C to stop\n");
  
  // Handle shutdown
  process.on("SIGINT", () => {
    server.stopScheduler();
    console.log("\nShutting down...");
    process.exit(0);
  });
  
  // Keep alive
  await new Promise(() => {});
}

export async function main() {
  const args = process.argv.slice(2);
  
  // Parse global options first
  let dataDir: string | undefined;
  const filteredArgs: string[] = [];
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "-d" || args[i] === "--data") {
      dataDir = args[i + 1];
      i++; // skip next arg
    } else {
      filteredArgs.push(args[i]);
    }
  }
  
  // Set data directory if specified
  if (dataDir) {
    setDataDir(dataDir);
  } else {
    // Default to ./data relative to cwd
    setDataDir(join(process.cwd(), "data"));
  }
  
  // No args = interactive TUI
  if (filteredArgs.length === 0) {
    await startTui();
    return;
  }
  
  if (filteredArgs[0] === "-h" || filteredArgs[0] === "--help") {
    console.log(HELP);
    process.exit(0);
  }
  
  if (filteredArgs[0] === "-v" || filteredArgs[0] === "--version") {
    console.log(VERSION);
    process.exit(0);
  }
  
  const command = filteredArgs[0];
  const commandArgs = filteredArgs.slice(1);
  
  try {
    switch (command) {
      case "serve":
        await serveCommand(commandArgs);
        break;
      case "tui":
        // Start new OpenTUI interface
        await import("../tui/index.tsx");
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
