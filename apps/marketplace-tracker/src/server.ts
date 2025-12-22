#!/usr/bin/env bun
/**
 * Marketplace Tracker Web Server
 */
import { join, dirname } from "path";
import { setDataDir } from "opencode-job-runner";
import { createServer } from "opencode-job-runner/web";

// Set data directory to ./data relative to this app
const appDir = dirname(dirname(new URL(import.meta.url).pathname));
setDataDir(join(appDir, "data"));

// Create and export server
export default createServer({
  port: 3456,
  scheduler: true,
  name: "Marketplace Tracker",
});
