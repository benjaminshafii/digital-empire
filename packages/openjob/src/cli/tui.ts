#!/usr/bin/env bun
/**
 * openjob interactive TUI
 * 
 * Features:
 * - Text input with @agent and @file autocomplete
 * - /command system for quick actions
 * - Enter: save prompt, start job, attach to tmux
 * - Ctrl+S: schedule picker
 * - Ctrl+B: background mode (run without attaching)
 * - Ctrl+W: toggle web server + scheduler
 * - Ctrl+V: paste from clipboard (supports images)
 */

import { readdirSync, existsSync, appendFileSync } from "fs";
import { join } from "path";
import {
  createSearch,
  slugify,
  searchExists,
  startJob,
  attachToJob,
  getRunningJob,
  listAllJobs,
  listSearches,
  getSearch,
  updateSearch,
  ensureDataDirs,
  findProjectRoot,
  isSchedulerActive,
} from "../core";
import { createServer } from "../web";
import {
  readClipboard,
  enableBracketedPaste,
  disableBracketedPaste,
  isBracketedPasteStart,
  isBracketedPasteEnd,
  extractBracketedPaste,
  BRACKETED_PASTE,
} from "./clipboard";
import {
  createAutocompleteState,
  getAgents,
  getCommands,
  updateAutocomplete,
  moveSelection,
  applyAutocomplete,
  renderAutocomplete,
  getSelectedOption,
  type AutocompleteState,
  type AutocompleteOption,
} from "./autocomplete";

// ANSI codes
const CLEAR_LINE = "\x1b[2K\r";
const CLEAR_SCREEN = "\x1b[2J\x1b[H";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const RESET = "\x1b[0m";
const CYAN = "\x1b[36m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const MAGENTA = "\x1b[35m";
const RED = "\x1b[31m";
const BLUE = "\x1b[34m";

interface PromptPart {
  type: "agent" | "file" | "image" | "text";
  value: string;
  display: string; // What's shown in the input
  data?: string; // base64 for images
  mime?: string;
}

interface TuiState {
  input: string;
  cursorPos: number;
  serverRunning: boolean;
  serverPort: number;
  mode: "input" | "schedule" | "command";
  selectedSchedule: number;
  // Paste handling
  isPasting: boolean;
  pasteBuffer: string;
  // Parts (agents, files, images mentioned in prompt)
  parts: PromptPart[];
  // Autocomplete
  autocomplete: AutocompleteState;
  // Track last job for scheduling
  lastJobSlug: string | null;
}

// Debug logging  
const DEBUG = false;
const debugLog = (msg: string) => {
  if (DEBUG) {
    appendFileSync("/tmp/openjob-debug.log", `${new Date().toISOString()} ${msg}\n`);
  }
};

const SCHEDULE_OPTIONS = [
  { label: "Every 2 hours", cron: "0 */2 * * *" },
  { label: "Every 4 hours", cron: "0 */4 * * *" },
  { label: "Every 6 hours", cron: "0 */6 * * *" },
  { label: "Daily at 9 AM", cron: "0 9 * * *" },
  { label: "Daily at 6 PM", cron: "0 18 * * *" },
  { label: "Weekly Monday 9 AM", cron: "0 9 * * 1" },
  { label: "Cancel", cron: "" },
];

function clearScreen(): void {
  process.stdout.write(CLEAR_SCREEN);
}

function renderStatusLine(state: TuiState): string {
  const runningResult = getRunningJob();
  const parts = [
    state.serverRunning ? `${GREEN}● server:${state.serverPort}${RESET}` : `${DIM}○ server${RESET}`,
    isSchedulerActive() ? `${GREEN}● scheduler${RESET}` : `${DIM}○ scheduler${RESET}`,
    runningResult ? `${YELLOW}● running: ${runningResult.searchSlug}${RESET}` : "",
  ].filter(Boolean);
  
  return parts.join("  ");
}

function renderParts(parts: PromptPart[]): string {
  if (parts.length === 0) return "";
  
  const labels = parts.map((p, i) => {
    switch (p.type) {
      case "image":
        return `${MAGENTA}[Image ${i + 1}]${RESET}`;
      case "file":
        return `${BLUE}[@${p.value}]${RESET}`;
      case "agent":
        return `${CYAN}[@${p.value}]${RESET}`;
      default:
        return "";
    }
  }).filter(Boolean);
  
  return labels.length > 0 ? labels.join(" ") + "\n" : "";
}

function renderPrompt(state: TuiState): void {
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
  console.log(renderStatusLine(state));
  process.stdout.write(renderParts(state.parts));
  
  // Show autocomplete mode indicator in prompt
  const acIndicator = state.autocomplete.visible ? 
    ` ${DIM}[${state.autocomplete.mode} ${state.autocomplete.filtered.length}]${RESET}` : "";
  process.stdout.write(`${BOLD}>${RESET} ${state.input}${acIndicator}`);
  
  // Show autocomplete popup
  if (state.autocomplete.visible) {
    process.stdout.write("\n"); // Move to next line
    process.stdout.write(renderAutocomplete(state.autocomplete));
  }
}

function showHelp(): void {
  console.log(`
${BOLD}openjob${RESET} - Interactive job runner

${BOLD}Commands:${RESET}
  ${CYAN}@agent${RESET}    Mention an agent (e.g., @fb-marketplace)
  ${CYAN}@file${RESET}     Attach a file (e.g., @src/index.ts)
  ${CYAN}/list${RESET}     List saved jobs
  ${CYAN}/jobs${RESET}     Show recent job runs
  ${CYAN}/watch${RESET}    Attach to running job
  ${CYAN}/server${RESET}   Toggle web server
  ${CYAN}/help${RESET}     Show this help
  ${CYAN}/quit${RESET}     Exit

${BOLD}Keys:${RESET}
  ${CYAN}Enter${RESET}     Run job and attach to tmux
  ${CYAN}Ctrl+B${RESET}    Run in background
  ${CYAN}Ctrl+S${RESET}    Schedule last/running job
  ${CYAN}Ctrl+W${RESET}    Toggle web server + scheduler
  ${CYAN}Ctrl+V${RESET}    Paste from clipboard
  ${CYAN}Tab${RESET}       Accept autocomplete
  ${CYAN}Ctrl+C${RESET}    Exit

${BOLD}Workflow:${RESET}
  1. Type prompt: ${DIM}@fb-marketplace Find standing desks${RESET}
  2. Press Enter to run
  3. Press Ctrl+S while running (or after) to schedule recurring
`);
}

export async function startTui(): Promise<void> {
  ensureDataDirs();
  
  // Pre-load agents and commands
  const agents = getAgents();
  const commands = getCommands();
  debugLog(`Loaded ${agents.length} agents, ${commands.length} commands`);
  
  const state: TuiState = {
    input: "",
    cursorPos: 0,
    serverRunning: false,
    serverPort: 3456,
    mode: "input",
    selectedSchedule: 0,
    isPasting: false,
    pasteBuffer: "",
    parts: [],
    autocomplete: createAutocompleteState(),
    lastJobSlug: null,
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
  
  // Enable bracketed paste mode
  enableBracketedPaste();
  
  const cleanup = () => {
    disableBracketedPaste();
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(false);
    }
    console.log("\n");
    process.exit(0);
  };
  
  const refresh = () => {
    clearScreen();
    showHelp();
    renderPrompt(state);
  };
  
  const updateAutocompleteSuggestions = () => {
    state.autocomplete = updateAutocomplete(
      state.autocomplete,
      state.input,
      state.input.length, // cursor at end for now
      agents,
      commands
    );
  };
  
  // Handle pasting from clipboard
  const handlePaste = async (pastedText?: string) => {
    const content = await readClipboard();
    
    if (content?.mime.startsWith("image/")) {
      const imageNum = state.parts.filter(p => p.type === "image").length + 1;
      state.parts.push({
        type: "image",
        value: `clipboard-image-${imageNum}`,
        display: `[Image ${imageNum}]`,
        data: content.data,
        mime: content.mime,
      });
      console.log(`\n${GREEN}Added image from clipboard${RESET}`);
      refresh();
      return;
    }
    
    const textToInsert = pastedText || content?.data || "";
    if (textToInsert) {
      const normalized = textToInsert.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
      const lines = normalized.split("\n");
      
      if (lines.length > 1) {
        console.log(`\n${DIM}Pasted ${lines.length} lines${RESET}`);
      }
      
      state.input += normalized.replace(/\n/g, " ").trim();
      updateAutocompleteSuggestions();
      refresh();
    }
  };
  
  // Execute a slash command
  const executeCommand = async (cmd: string, args: string = "") => {
    switch (cmd) {
      case "run":
        await runJob(false);
        break;
      case "bg":
        await runJob(true);
        break;
      case "schedule":
        if (state.input.trim() || args.trim()) {
          state.mode = "schedule";
          state.selectedSchedule = 0;
          clearScreen();
          console.log(`\n${BOLD}Prompt:${RESET} ${args || state.input}\n`);
          renderPrompt(state);
        } else {
          console.log(`\n${YELLOW}Enter a prompt first${RESET}`);
          refresh();
        }
        break;
      case "list":
        clearScreen();
        console.log(`\n${BOLD}Saved Jobs:${RESET}\n`);
        const searches = listSearches();
        if (searches.length === 0) {
          console.log(`${DIM}No saved jobs${RESET}`);
        } else {
          searches.slice(0, 10).forEach(s => {
            const scheduled = s.schedule ? ` ${MAGENTA}(scheduled)${RESET}` : "";
            console.log(`  ${CYAN}${s.slug}${RESET}${scheduled}`);
            console.log(`    ${DIM}${s.name}${RESET}`);
          });
        }
        console.log();
        state.input = "";
        renderPrompt(state);
        break;
      case "jobs":
        clearScreen();
        console.log(`\n${BOLD}Recent Job Runs:${RESET}\n`);
        const jobs = listAllJobs(10);
        if (jobs.length === 0) {
          console.log(`${DIM}No recent jobs${RESET}`);
        } else {
          jobs.forEach(j => {
            const statusColor = j.status === "completed" ? GREEN : 
                               j.status === "running" ? YELLOW : 
                               j.status === "failed" ? RED : DIM;
            console.log(`  ${statusColor}●${RESET} ${j.searchSlug} ${DIM}(${j.id})${RESET}`);
            console.log(`    ${DIM}${j.status} - ${new Date(j.createdAt).toLocaleString()}${RESET}`);
          });
        }
        console.log();
        state.input = "";
        renderPrompt(state);
        break;
      case "watch":
        const runningResult = getRunningJob();
        if (runningResult) {
          console.log(`\n${DIM}Attaching to ${runningResult.searchSlug}...${RESET}\n`);
          if (process.stdin.isTTY) process.stdin.setRawMode(false);
          attachToJob(runningResult.job.id);
          if (process.stdin.isTTY) process.stdin.setRawMode(true);
          refresh();
        } else {
          console.log(`\n${YELLOW}No running job to watch${RESET}`);
          refresh();
        }
        break;
      case "server":
        await toggleServer();
        break;
      case "status":
        clearScreen();
        console.log(`\n${BOLD}Status:${RESET}\n`);
        console.log(`  Server: ${state.serverRunning ? GREEN + "running" : DIM + "stopped"}${RESET}`);
        console.log(`  Scheduler: ${isSchedulerActive() ? GREEN + "active" : DIM + "inactive"}${RESET}`);
        const statusRunning = getRunningJob();
        console.log(`  Running job: ${statusRunning ? YELLOW + statusRunning.searchSlug : DIM + "none"}${RESET}`);
        console.log();
        state.input = "";
        renderPrompt(state);
        break;
      case "clear":
        state.input = "";
        state.parts = [];
        state.autocomplete = createAutocompleteState();
        refresh();
        break;
      case "help":
        state.input = "";
        refresh();
        break;
      case "quit":
      case "exit":
        cleanup();
        break;
      default:
        console.log(`\n${YELLOW}Unknown command: /${cmd}${RESET}`);
        refresh();
    }
  };
  
  const runJob = async (background: boolean, schedule?: string) => {
    if (!state.input.trim() && state.parts.length === 0) return;
    
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
      
      // Track for scheduling
      state.lastJobSlug = search.slug;
      
      // Clear state
      state.input = "";
      state.parts = [];
      state.autocomplete = createAutocompleteState();
      
      if (!background && job.status === "running") {
        console.log(`\n${DIM}Attaching to tmux... (Ctrl+B, D to detach)${RESET}\n`);
        if (process.stdin.isTTY) process.stdin.setRawMode(false);
        attachToJob(job.id);
        if (process.stdin.isTTY) process.stdin.setRawMode(true);
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
      } catch (error) {
        console.log(`\n${YELLOW}Failed to start server:${RESET} ${error instanceof Error ? error.message : error}`);
      }
    }
    refresh();
  };
  
  // Handle autocomplete selection
  const acceptAutocomplete = () => {
    const result = applyAutocomplete(state.input, state.autocomplete);
    if (result) {
      const selected = getSelectedOption(state.autocomplete);
      
      // Track as part if it's an agent or file
      if (selected && state.autocomplete.mode === "@") {
        state.parts.push({
          type: selected.type as "agent" | "file",
          value: selected.value,
          display: selected.display,
        });
      }
      
      state.input = result.input;
      state.autocomplete = createAutocompleteState();
      refresh();
      return true;
    }
    return false;
  };
  
  process.stdin.on("data", async (key: string) => {
    // Handle bracketed paste
    if (isBracketedPasteStart(key)) {
      state.isPasting = true;
      state.pasteBuffer = extractBracketedPaste(key);
      if (isBracketedPasteEnd(key)) {
        state.isPasting = false;
        const pastedContent = state.pasteBuffer;
        state.pasteBuffer = "";
        await handlePaste(pastedContent);
      }
      return;
    }
    
    if (state.isPasting) {
      if (isBracketedPasteEnd(key)) {
        state.isPasting = false;
        const endIdx = key.indexOf(BRACKETED_PASTE.END);
        state.pasteBuffer += key.slice(0, endIdx);
        const pastedContent = state.pasteBuffer;
        state.pasteBuffer = "";
        await handlePaste(pastedContent);
      } else {
        state.pasteBuffer += key;
      }
      return;
    }
    
    // Handle schedule mode
    if (state.mode === "schedule") {
      if (key === "\x1b[A") { // Up
        state.selectedSchedule = Math.max(0, state.selectedSchedule - 1);
        clearScreen();
        renderPrompt(state);
      } else if (key === "\x1b[B") { // Down
        state.selectedSchedule = Math.min(SCHEDULE_OPTIONS.length - 1, state.selectedSchedule + 1);
        clearScreen();
        renderPrompt(state);
      } else if (key === "\r") { // Enter
        const selectedOption = SCHEDULE_OPTIONS[state.selectedSchedule];
        state.mode = "input";
        clearScreen();
        
        if (selectedOption.cron) {
          // Schedule the last/running job
          const running = getRunningJob();
          const targetSlug = running?.searchSlug || state.lastJobSlug;
          
          if (targetSlug) {
            try {
              updateSearch(targetSlug, { schedule: selectedOption.cron });
              console.log(`\n${GREEN}Scheduled:${RESET} ${targetSlug}`);
              console.log(`${MAGENTA}${selectedOption.label}${RESET}\n`);
            } catch (error) {
              console.log(`\n${RED}Failed to schedule:${RESET} ${error instanceof Error ? error.message : error}`);
            }
          }
        }
        
        showHelp();
        renderPrompt(state);
      } else if (key === "\x1b" || key === "\x03") { // Escape or Ctrl+C
        state.mode = "input";
        refresh();
      }
      return;
    }
    
    // Normal input mode with autocomplete
    
    // Ctrl+C - exit
    if (key === "\x03") {
      cleanup();
      return;
    }
    
    // Ctrl+V - paste
    if (key === "\x16") {
      await handlePaste();
      return;
    }
    
    // Escape - close autocomplete or cancel
    if (key === "\x1b") {
      if (state.autocomplete.visible) {
        state.autocomplete = createAutocompleteState();
        refresh();
      }
      return;
    }
    
    // Up arrow - navigate autocomplete or history
    if (key === "\x1b[A") {
      if (state.autocomplete.visible) {
        state.autocomplete = moveSelection(state.autocomplete, -1);
        refresh();
      }
      return;
    }
    
    // Down arrow - navigate autocomplete
    if (key === "\x1b[B") {
      if (state.autocomplete.visible) {
        state.autocomplete = moveSelection(state.autocomplete, 1);
        refresh();
      }
      return;
    }
    
    // Tab - accept autocomplete
    if (key === "\t") {
      if (state.autocomplete.visible) {
        acceptAutocomplete();
      }
      return;
    }
    
    // Enter - accept autocomplete or execute
    if (key === "\r") {
      if (state.autocomplete.visible) {
        // Check if it's a command being selected
        const selected = getSelectedOption(state.autocomplete);
        if (selected?.type === "command") {
          state.autocomplete = createAutocompleteState();
          state.input = "";
          await executeCommand(selected.value);
          return;
        }
        // Otherwise accept the autocomplete
        if (acceptAutocomplete()) {
          return;
        }
      }
      
      // Check if input is a command
      if (state.input.startsWith("/")) {
        const [cmd, ...args] = state.input.slice(1).split(/\s+/);
        state.autocomplete = createAutocompleteState();
        state.input = args.join(" ");
        await executeCommand(cmd, state.input);
        return;
      }
      
      // Run as job
      state.autocomplete = createAutocompleteState();
      await runJob(false);
      return;
    }
    
    // Ctrl+S - schedule the last/running job
    if (key === "\x13") {
      // Check for running job first
      const running = getRunningJob();
      const targetSlug = running?.searchSlug || state.lastJobSlug;
      
      if (targetSlug) {
        const search = getSearch(targetSlug);
        if (search) {
          state.mode = "schedule";
          state.selectedSchedule = 0;
          state.autocomplete = createAutocompleteState();
          clearScreen();
          console.log(`\n${BOLD}Schedule job:${RESET} ${search.slug}`);
          console.log(`${DIM}${search.name}${RESET}\n`);
          renderPrompt(state);
          return;
        }
      }
      
      // No job to schedule
      console.log(`\n${YELLOW}No job to schedule. Run a job first, then press Ctrl+S.${RESET}`);
      refresh();
      return;
    }
    
    // Ctrl+B - background
    if (key === "\x02") {
      state.autocomplete = createAutocompleteState();
      await runJob(true);
      return;
    }
    
    // Ctrl+W - toggle server
    if (key === "\x17") {
      await toggleServer();
      return;
    }
    
    // Backspace
    if (key === "\x7f") {
      state.input = state.input.slice(0, -1);
      updateAutocompleteSuggestions();
      refresh();
      return;
    }
    
    // Printable characters
    if (key.charCodeAt(0) >= 32) {
      state.input += key;
      updateAutocompleteSuggestions();
      debugLog(`Input: "${state.input}", autocomplete.visible: ${state.autocomplete.visible}, filtered: ${state.autocomplete.filtered.length}`);
      refresh();
      return;
    }
  });
  
  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);
}
