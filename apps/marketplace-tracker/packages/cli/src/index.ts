#!/usr/bin/env tsx
import { Command } from "commander";
import { addCommand } from "./commands/add";
import { listCommand } from "./commands/list";
import { runCommand } from "./commands/run";
import { deleteCommand } from "./commands/delete";
import { watchCommand } from "./commands/watch";

const program = new Command();

program
  .name("marketplace-tracker")
  .description("Track Facebook Marketplace deals using OpenCode agents")
  .version("0.0.1");

// Default action: start interactive TUI
program
  .action(async () => {
    // Dynamic import to avoid loading React unless needed
    const { startTUI } = await import("./tui");
    await startTUI();
  });

program.addCommand(addCommand);
program.addCommand(listCommand);
program.addCommand(runCommand);
program.addCommand(deleteCommand);
program.addCommand(watchCommand);

program.parse();
