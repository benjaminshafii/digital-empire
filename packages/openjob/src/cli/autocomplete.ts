/**
 * Autocomplete system for TUI
 * 
 * Supports:
 * - @ mentions for agents and files
 * - / commands for built-in actions
 * - Fuzzy matching with scoring
 */

import { readdirSync, existsSync, statSync } from "fs";
import { join, relative } from "path";
import { findProjectRoot } from "../core";

// ANSI codes
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const RESET = "\x1b[0m";
const CYAN = "\x1b[36m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const MAGENTA = "\x1b[35m";
const BLUE = "\x1b[34m";
const BG_CYAN = "\x1b[46m";
const BLACK = "\x1b[30m";

export interface AutocompleteOption {
  display: string;
  value: string;
  description?: string;
  type: "agent" | "file" | "command";
  icon?: string;
}

export interface AutocompleteState {
  visible: boolean;
  mode: "@" | "/" | null;
  options: AutocompleteOption[];
  filtered: AutocompleteOption[];
  selected: number;
  triggerIndex: number; // Position in input where trigger started
  filter: string; // Current filter text after trigger
}

export function createAutocompleteState(): AutocompleteState {
  return {
    visible: false,
    mode: null,
    options: [],
    filtered: [],
    selected: 0,
    triggerIndex: 0,
    filter: "",
  };
}

/**
 * Get available agents from .opencode/agent/*.md
 */
export function getAgents(): AutocompleteOption[] {
  try {
    const projectRoot = findProjectRoot();
    const agentDir = join(projectRoot, ".opencode", "agent");
    if (!existsSync(agentDir)) return [];
    
    return readdirSync(agentDir)
      .filter(f => f.endsWith(".md"))
      .map(f => {
        const name = f.replace(".md", "");
        return {
          display: `@${name}`,
          value: name,
          description: "agent",
          type: "agent" as const,
          icon: "🤖",
        };
      });
  } catch {
    return [];
  }
}

/**
 * Get files in the current project for @ mentions
 */
export function getFiles(query: string = "", maxResults: number = 10): AutocompleteOption[] {
  try {
    const projectRoot = findProjectRoot();
    const files: AutocompleteOption[] = [];
    
    const ignoreDirs = new Set([
      "node_modules", ".git", ".next", "dist", "build", 
      ".cache", "coverage", ".turbo", ".vercel"
    ]);
    
    function walkDir(dir: string, depth: number = 0) {
      if (depth > 4 || files.length >= maxResults * 2) return;
      
      try {
        const entries = readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.name.startsWith(".") && entry.name !== ".opencode") continue;
          if (ignoreDirs.has(entry.name)) continue;
          
          const fullPath = join(dir, entry.name);
          const relativePath = relative(projectRoot, fullPath);
          
          if (entry.isDirectory()) {
            walkDir(fullPath, depth + 1);
          } else {
            // Filter by query if provided
            if (query && !relativePath.toLowerCase().includes(query.toLowerCase())) {
              continue;
            }
            
            files.push({
              display: `@${relativePath}`,
              value: relativePath,
              description: "file",
              type: "file" as const,
              icon: "📄",
            });
          }
        }
      } catch {}
    }
    
    walkDir(projectRoot);
    return files.slice(0, maxResults);
  } catch {
    return [];
  }
}

/**
 * Built-in slash commands
 */
export function getCommands(): AutocompleteOption[] {
  return [
    // Job commands
    { display: "/run", value: "run", description: "Run job and attach", type: "command", icon: "▶" },
    { display: "/bg", value: "bg", description: "Run job in background", type: "command", icon: "⏳" },
    { display: "/schedule", value: "schedule", description: "Schedule this job", type: "command", icon: "📅" },
    
    // Session commands
    { display: "/list", value: "list", description: "List saved jobs", type: "command", icon: "📋" },
    { display: "/jobs", value: "jobs", description: "Show recent job runs", type: "command", icon: "📊" },
    { display: "/watch", value: "watch", description: "Attach to running job", type: "command", icon: "👀" },
    
    // Server commands
    { display: "/server", value: "server", description: "Toggle web server", type: "command", icon: "🌐" },
    { display: "/status", value: "status", description: "Show status", type: "command", icon: "ℹ️" },
    
    // Utility commands
    { display: "/clear", value: "clear", description: "Clear input", type: "command", icon: "🗑" },
    { display: "/help", value: "help", description: "Show help", type: "command", icon: "❓" },
    { display: "/quit", value: "quit", description: "Exit openjob", type: "command", icon: "👋" },
  ];
}

/**
 * Fuzzy match score - higher is better
 */
function fuzzyScore(query: string, target: string): number {
  const q = query.toLowerCase();
  const t = target.toLowerCase();
  
  // Exact match at start is best
  if (t.startsWith(q)) return 1000 + (100 - t.length);
  
  // Exact substring match
  if (t.includes(q)) return 500 + (100 - t.indexOf(q));
  
  // Fuzzy character matching
  let score = 0;
  let qi = 0;
  let consecutive = 0;
  
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) {
      score += 10 + consecutive * 5;
      consecutive++;
      qi++;
    } else {
      consecutive = 0;
    }
  }
  
  // Must match all query characters
  if (qi < q.length) return 0;
  
  return score;
}

/**
 * Filter and sort options by query
 */
export function filterOptions(
  options: AutocompleteOption[],
  query: string
): AutocompleteOption[] {
  if (!query) return options.slice(0, 10);
  
  return options
    .map(opt => ({
      opt,
      score: Math.max(
        fuzzyScore(query, opt.value),
        fuzzyScore(query, opt.display),
        opt.description ? fuzzyScore(query, opt.description) : 0
      ),
    }))
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map(x => x.opt);
}

/**
 * Check if we should trigger autocomplete
 */
export function shouldTrigger(
  input: string,
  cursorPos: number
): { mode: "@" | "/" | null; triggerIndex: number } {
  // Check for / at start of input
  if (input.startsWith("/") && cursorPos > 0) {
    return { mode: "/", triggerIndex: 0 };
  }
  
  // Check for @ with whitespace before it (or at start)
  const beforeCursor = input.slice(0, cursorPos);
  const atMatch = beforeCursor.match(/(?:^|\s)@(\S*)$/);
  if (atMatch) {
    const triggerIndex = beforeCursor.lastIndexOf("@");
    return { mode: "@", triggerIndex };
  }
  
  return { mode: null, triggerIndex: 0 };
}

/**
 * Get filter text from input
 */
export function getFilterText(
  input: string,
  mode: "@" | "/",
  triggerIndex: number
): string {
  const afterTrigger = input.slice(triggerIndex + 1);
  // Get text until whitespace
  const match = afterTrigger.match(/^(\S*)/);
  return match ? match[1] : "";
}

/**
 * Render autocomplete popup
 */
export function renderAutocomplete(state: AutocompleteState): string {
  if (!state.visible || state.filtered.length === 0) return "";
  
  const lines: string[] = [];
  const maxDisplay = Math.min(state.filtered.length, 8);
  
  // Calculate scroll offset if needed
  let startIdx = 0;
  if (state.selected >= maxDisplay) {
    startIdx = state.selected - maxDisplay + 1;
  }
  
  lines.push(""); // Empty line before popup
  
  for (let i = startIdx; i < startIdx + maxDisplay && i < state.filtered.length; i++) {
    const opt = state.filtered[i];
    const isSelected = i === state.selected;
    
    const icon = opt.icon || (opt.type === "agent" ? "🤖" : opt.type === "file" ? "📄" : "⚡");
    const desc = opt.description ? ` ${DIM}${opt.description}${RESET}` : "";
    
    if (isSelected) {
      lines.push(`  ${BG_CYAN}${BLACK} ${icon} ${opt.display}${desc} ${RESET}`);
    } else {
      lines.push(`  ${DIM} ${icon}${RESET} ${opt.display}${desc}`);
    }
  }
  
  // Show scroll indicator if more items
  if (state.filtered.length > maxDisplay) {
    const shown = `${startIdx + 1}-${Math.min(startIdx + maxDisplay, state.filtered.length)}`;
    lines.push(`  ${DIM}(${shown} of ${state.filtered.length})${RESET}`);
  }
  
  lines.push(`${DIM}  ↑/↓ navigate, Tab/Enter select, Esc cancel${RESET}`);
  
  return lines.join("\n");
}

/**
 * Update autocomplete state based on input
 */
export function updateAutocomplete(
  state: AutocompleteState,
  input: string,
  cursorPos: number,
  agents: AutocompleteOption[],
  commands: AutocompleteOption[]
): AutocompleteState {
  const trigger = shouldTrigger(input, cursorPos);
  
  if (!trigger.mode) {
    return { ...state, visible: false, mode: null, filtered: [], selected: 0 };
  }
  
  const filter = getFilterText(input, trigger.mode, trigger.triggerIndex);
  
  let options: AutocompleteOption[];
  if (trigger.mode === "@") {
    // Combine agents and files for @ mentions
    // Get fresh files each time based on filter
    const files = getFiles(filter, 10);
    options = [...agents, ...files];
    
    // If no options at all, still show we're in @ mode
    if (options.length === 0) {
      options = [{
        display: "@...",
        value: "",
        description: "Type to search files",
        type: "file" as const,
        icon: "📂",
      }];
    }
  } else {
    options = commands;
  }
  
  const filtered = filterOptions(options, filter);
  
  // Keep selection in bounds
  const selected = Math.min(state.selected, Math.max(0, filtered.length - 1));
  
  return {
    ...state,
    visible: filtered.length > 0,
    mode: trigger.mode,
    options,
    filtered,
    selected,
    triggerIndex: trigger.triggerIndex,
    filter,
  };
}

/**
 * Move selection up/down
 */
export function moveSelection(state: AutocompleteState, direction: -1 | 1): AutocompleteState {
  if (!state.visible || state.filtered.length === 0) return state;
  
  let next = state.selected + direction;
  if (next < 0) next = state.filtered.length - 1;
  if (next >= state.filtered.length) next = 0;
  
  return { ...state, selected: next };
}

/**
 * Get selected option
 */
export function getSelectedOption(state: AutocompleteState): AutocompleteOption | null {
  if (!state.visible || state.filtered.length === 0) return null;
  return state.filtered[state.selected] || null;
}

/**
 * Apply selected autocomplete to input
 */
export function applyAutocomplete(
  input: string,
  state: AutocompleteState
): { input: string; cursorPos: number } | null {
  const option = getSelectedOption(state);
  if (!option) return null;
  
  if (state.mode === "@") {
    // Replace @filter with @value
    const before = input.slice(0, state.triggerIndex);
    const afterTrigger = input.slice(state.triggerIndex + 1);
    const afterFilter = afterTrigger.replace(/^\S*/, "");
    const newInput = `${before}@${option.value} ${afterFilter}`.replace(/\s+/g, " ");
    return { input: newInput.trimEnd(), cursorPos: before.length + option.value.length + 2 };
  } else if (state.mode === "/") {
    // Replace /filter with /value
    const afterFilter = input.slice(1).replace(/^\S*/, "");
    const newInput = `/${option.value} ${afterFilter}`.replace(/\s+/g, " ");
    return { input: newInput.trimEnd(), cursorPos: option.value.length + 2 };
  }
  
  return null;
}
