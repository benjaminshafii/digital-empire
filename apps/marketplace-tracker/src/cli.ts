#!/usr/bin/env bun
/**
 * Marketplace Tracker CLI
 *
 * Simple entry point that starts the web server.
 * All functionality is in the web UI.
 */

console.log(`
Marketplace Tracker

Usage:
  bun run src/server.ts    Start the web server
  
The web UI runs at http://localhost:3456

To schedule jobs, use OpenCode with the openjob plugin:
  opencode run "Schedule a job called marketplace-desk at 0 9 * * * to run: @fb-marketplace find standing desks under $300"
`);
