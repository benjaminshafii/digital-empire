#!/usr/bin/env bun
/**
 * mkt - Marketplace Tracker CLI
 *
 * Facebook Marketplace deal finder built on @cool-website/job-runner
 */
import { join, dirname } from "path";
import { setDataDir } from "@cool-website/job-runner";

// Set data directory to ./data relative to this app
const appDir = dirname(dirname(new URL(import.meta.url).pathname));
setDataDir(join(appDir, "data"));

// Import and run the CLI (dynamic import after setDataDir)
const { main } = await import("@cool-website/job-runner/cli");
main();
