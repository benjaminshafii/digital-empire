#!/usr/bin/env bun
/**
 * mkt - Marketplace Tracker CLI
 *
 * Facebook Marketplace deal finder built on opencode-job-runner
 */
import { join, dirname } from "path";
import { setDataDir } from "opencode-job-runner";

// Set data directory to ./data relative to this app
const appDir = dirname(dirname(new URL(import.meta.url).pathname));
setDataDir(join(appDir, "data"));

// Import and run the CLI (dynamic import after setDataDir)
const { main } = await import("opencode-job-runner/cli");
main();
