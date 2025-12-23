#!/usr/bin/env bun
/**
 * mkt - Marketplace Tracker CLI
 *
 * Facebook Marketplace deal finder built on openjob
 * 
 * This is a thin wrapper that sets the data directory and starts the openjob TUI.
 */
import { join, dirname } from "path";
import { setDataDir } from "openjob";

// Set data directory to ./data relative to this app
const appDir = dirname(dirname(new URL(import.meta.url).pathname));
setDataDir(join(appDir, "data"));

// Start the server instead of CLI
console.log("Use 'pnpm --filter @digital-empire/marketplace-tracker serve' to start the server");
console.log("Or run 'openjob' in the marketplace-tracker directory for the interactive CLI");
