#!/usr/bin/env bun
/**
 * openjob serve - Start web UI + scheduler
 */

import { join } from "path";
import { setDataDir } from "../core";
import { createServer } from "./index";

// Set data directory
const dataDir = process.env.OPENJOB_DATA || join(process.cwd(), "data");
setDataDir(dataDir);

// Start server
const port = parseInt(process.env.PORT || "3456");
const server = createServer({ port, scheduler: true });

// Handle Bun.serve
export default {
  port: server.port,
  fetch: server.fetch,
};
