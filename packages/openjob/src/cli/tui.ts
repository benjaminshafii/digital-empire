#!/usr/bin/env bun
/**
 * openjob interactive TUI
 * 
 * Features:
 * - Text input with @agent autocomplete
 * - Enter: save prompt, start job, attach to tmux
 * - Ctrl+S: schedule picker
 * - Ctrl+B: background mode (run without attaching)
 * - Ctrl+W: toggle web server + scheduler
 */

import * as readline from "readline";
import { readdirSync, existsSync } from "fs";
import { join } from "path";
import {
  createSearch,
  slugify,
  searchExists,
  startJob,
  attachToJob,
  getRunningJob,
  ensureDataDirs,
  findProjectRoot,
  isSchedulerActive,
} from "../core";
import { createServer } from "../web";

// ANSI codes
const CLEAR_LINE = "\x1b[2K\r";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const RESET = "\x1b[0m";
const CYAN = "\x1b[36m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const MAGENTA = "\x1b[35m";

interface TuiState {
  input: string;
  cursorPos: number;
  suggestions: string[];
  selectedSuggestion: number;
  showingSuggestions: boolean;
  serverRunning: boolean;
  serverPort: number;
  mode: "input" | "schedule";
  scheduleOptions: string[];
  selectedSchedule: number;
}

const SCHEDULE_OPTIONS = [
  { label: "Every 2 hours", cron: "0 */2 * * *" },
  { label: "Every 4 hours", cron: "0 */4 * * *" },
  { label: "Every 6 hours", cron: "0 */6 * * *" },
  { label: "Daily at 9 AM", cron: "0 9 * * *" },
  { label: "Daily at 6 PM", cron: "0 18 * * *" },
  { label: "Weekly Monday 9 AM", cron: "0 9 * * 1" },
  { label: "Cancel", cron: "" },
];

function getAgents(): string[] {
  try {
    const projectRoot = findProjectRoot();
    const agentDir = join(projectRoot, ".opencode", "agent");
    if (!existsSync(agentDir)) return [];
    
    return readdirSync(agentDir)
      .filter(f => f.endsWith(".md"))
      .map(f => f.replace(".md", ""));
  } catch {
    return [];
  }
}

function findAgentSuggestions(input: string, agents: string[]): string[] {
  // Find @word pattern at cursor
  const match = input.match(/@(\w*)$/);
  if (!match) return [];
  
  const partial = match[1].toLowerCase();
  return agents
    .filter(a => a.toLowerCase().startsWith(partial))
    .slice(0, 5);
}

function renderPrompt(state: TuiState): void {
  const running = getRunningJob();
  const statusLine = [
    state.serverRunning ? `${GREEN}● server:${state.serverPort}${RESET}` : `${DIM}○ server${RESET}`,
    isSchedulerActive() ? `${GREEN}● scheduler${RESET}` : `${DIM}○ scheduler${RESET}`,
    running ? `${YELLOW}● running: ${running.searchSlug}${RESET}` : "",
  ].filter(Boolean).join("  ");
  
  process.stdout.write(CLEAR_LINE);
  
  if (state.mode === "schedule") {
    console.log(`\n${BOLD}Schedule:${RESET}`);
    SCHEDULE_OPTIONS.forEach((opt, i) => {
      const selected = i === state.selectedSchedule;
      console.log(`  ${selected ? CYAN + ">" : " "} ${opt.label}${RESET}`);
    });
    console.log(`\n${DIM}↑/↓ to select, Enter to confirm, Esc to cancel${RESET}`);
    return;
  }
  
  // Normal input mode
  process.stdout.write(`${statusLine}\n`);
  process.stdout.write(`${BOLD}>${RESET} ${state.input}`);
  
  if (state.showingSuggestions && state.suggestions.length > 0) {
    console.log();
    state.suggestions.forEach((s, i) => {
      const selected = i === state.selectedSuggestion;
      console.log(`  ${selected ? CYAN : DIM}@${s}${RESET}`);
    });
    process.stdout.write(`${DIM}Tab to complete, ↑/↓ to select${RESET}\n`);
    process.stdout.write(`${BOLD}>${RESET} ${state.input}`);
  }
}

function clearScreen(): void {
  process.stdout.write("\x1b[2J\x1b[H");
}

function showHelp(): void {
  console.log(`
${BOLD}openjob${RESET} - Interactive job runner

${BOLD}Keys:${RESET}
  ${CYAN}Enter${RESET}     Run job and attach to tmux
  ${CYAN}Ctrl+B${RESET}    Run job in background
  ${CYAN}Ctrl+S${RESET}    Schedule job (pick interval)
  ${CYAN}Ctrl+W${RESET}    Toggle web server + scheduler
  ${CYAN}Tab${RESET}       Autocomplete @agent
  ${CYAN}Ctrl+C${RESET}    Exit

${BOLD}Usage:${RESET}
  Type a prompt with optional @agent prefix:
  ${DIM}> @fb-marketplace Find standing desks under $300${RESET}

  Press Enter to run immediately, or Ctrl+S to schedule.
`);
}

export async function startTui(): Promise<void> {
  ensureDataDirs();
  const agents = getAgents();
  
  const state: TuiState = {
    input: "",
    cursorPos: 0,
    suggestions: [],
    selectedSuggestion: 0,
    showingSuggestions: false,
    serverRunning: false,
    serverPort: 3456,
    mode: "input",
    scheduleOptions: SCHEDULE_OPTIONS.map(o => o.label),
    selectedSchedule: 0,
  };
  
  let serverHandle: { stopScheduler: () => void } | null = null;
  
  clearScreen();
  showHelp();
  renderPrompt(state);
  
  // Set up raw mode for key handling
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
  }
  process.stdin.resume();
  process.stdin.setEncoding("utf8");
  
  const cleanup = () => {
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(false);
    }
    console.log("\n");
    process.exit(0);
  };
  
  const runJob = async (background: boolean, schedule?: string) => {
    if (!state.input.trim()) return;
    
    const prompt = state.input.trim();
    const name = prompt.split(/\s+/).slice(0, 3).join(" ").substring(0, 30) || "job";
    
    let slug = slugify(name);
    let counter = 2;
    while (searchExists(slug)) slug = `${slugify(name)}-${counter++}`;
    
    try {
      const search = createSearch({ name, prompt, schedule });
      console.log(`\n${GREEN}Created:${RESET} ${search.slug}`);
      
      if (schedule) {
        console.log(`${MAGENTA}Scheduled:${RESET} ${SCHEDULE_OPTIONS.find(o => o.cron === schedule)?.label}`);
      }
      
      const job = await startJob(search.slug);
      console.log(`${GREEN}Started:${RESET} job ${job.id}`);
      
      state.input = "";
      
      if (!background && job.status === "running") {
        console.log(`\n${DIM}Attaching to tmux... (Ctrl+B, D to detach)${RESET}\n`);
        // Restore terminal before attaching
        if (process.stdin.isTTY) {
          process.stdin.setRawMode(false);
        }
        attachToJob(job.id);
        // Re-enable raw mode after detaching
        if (process.stdin.isTTY) {
          process.stdin.setRawMode(true);
        }
        clearScreen();
        showHelp();
      }
      
      renderPrompt(state);
    } catch (error) {
      console.log(`\n${YELLOW}Error:${RESET} ${error instanceof Error ? error.message : error}`);
      renderPrompt(state);
    }
  };
  
  const toggleServer = async () => {
    if (state.serverRunning && serverHandle) {
      serverHandle.stopScheduler();
      serverHandle = null;
      state.serverRunning = false;
      console.log(`\n${YELLOW}Server stopped${RESET}`);
    } else {
      try {
        const server = createServer({ port: state.serverPort, scheduler: true });
        serverHandle = server;
        state.serverRunning = true;
        // Server logs its own startup message
      } catch (error) {
        console.log(`\n${YELLOW}Failed to start server:${RESET} ${error instanceof Error ? error.message : error}`);
      }
    }
    renderPrompt(state);
  };
  
  process.stdin.on("data", async (key: string) => {
    // Handle schedule mode
    if (state.mode === "schedule") {
      if (key === "\x1b[A") { // Up arrow
        state.selectedSchedule = Math.max(0, state.selectedSchedule - 1);
        clearScreen();
        renderPrompt(state);
      } else if (key === "\x1b[B") { // Down arrow
        state.selectedSchedule = Math.min(SCHEDULE_OPTIONS.length - 1, state.selectedSchedule + 1);
        clearScreen();
        renderPrompt(state);
      } else if (key === "\r") { // Enter
        const selected = SCHEDULE_OPTIONS[state.selectedSchedule];
        state.mode = "input";
        clearScreen();
        if (selected.cron) {
          await runJob(true, selected.cron);
        } else {
          showHelp();
          renderPrompt(state);
        }
      } else if (key === "\x1b" || key === "\x03") { // Escape or Ctrl+C
        state.mode = "input";
        clearScreen();
        showHelp();
        renderPrompt(state);
      }
      return;
    }
    
    // Normal input mode
    if (key === "\x03") { // Ctrl+C
      cleanup();
    } else if (key === "\x13") { // Ctrl+S - schedule
      if (state.input.trim()) {
        state.mode = "schedule";
        state.selectedSchedule = 0;
        clearScreen();
        console.log(`\n${BOLD}Prompt:${RESET} ${state.input}\n`);
        renderPrompt(state);
      }
    } else if (key === "\x02") { // Ctrl+B - background
      await runJob(true);
    } else if (key === "\x17") { // Ctrl+W - toggle server
      await toggleServer();
    } else if (key === "\r") { // Enter - run and attach
      state.showingSuggestions = false;
      await runJob(false);
    } else if (key === "\t") { // Tab - autocomplete
      if (state.showingSuggestions && state.suggestions.length > 0) {
        const selected = state.suggestions[state.selectedSuggestion];
        // Replace @partial with @selected
        state.input = state.input.replace(/@\w*$/, `@${selected} `);
        state.showingSuggestions = false;
        state.suggestions = [];
        clearScreen();
        showHelp();
        renderPrompt(state);
      }
    } else if (key === "\x1b[A") { // Up arrow
      if (state.showingSuggestions && state.suggestions.length > 0) {
        state.selectedSuggestion = Math.max(0, state.selectedSuggestion - 1);
        clearScreen();
        showHelp();
        renderPrompt(state);
      }
    } else if (key === "\x1b[B") { // Down arrow
      if (state.showingSuggestions && state.suggestions.length > 0) {
        state.selectedSuggestion = Math.min(state.suggestions.length - 1, state.selectedSuggestion + 1);
        clearScreen();
        showHelp();
        renderPrompt(state);
      }
    } else if (key === "\x7f") { // Backspace
      state.input = state.input.slice(0, -1);
      state.suggestions = findAgentSuggestions(state.input, agents);
      state.showingSuggestions = state.suggestions.length > 0;
      state.selectedSuggestion = 0;
      clearScreen();
      showHelp();
      renderPrompt(state);
    } else if (key.charCodeAt(0) >= 32) { // Printable characters
      state.input += key;
      state.suggestions = findAgentSuggestions(state.input, agents);
      state.showingSuggestions = state.suggestions.length > 0;
      state.selectedSuggestion = 0;
      clearScreen();
      showHelp();
      renderPrompt(state);
    }
  });
  
  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);
}
