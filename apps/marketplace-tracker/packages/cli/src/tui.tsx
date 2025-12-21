#!/usr/bin/env tsx
import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { render, Box, Text, useInput, useApp, useStdout } from "ink";
import TextInput from "ink-text-input";
import Spinner from "ink-spinner";
import fuzzysort from "fuzzysort";
import {
  getQueries,
  getQueryByName,
  addQuery,
  deleteQuery,
  getItems,
  getNewItems,
  addItems,
  updateItemStatus,
  updateQueryLastRun,
  addToHistory,
  getHistory,
  clearHistory,
} from "@marketplace-tracker/core";
import type { Query, Item } from "@marketplace-tracker/core";
import { spawn, ChildProcess } from "child_process";
import { existsSync } from "fs";
import { homedir } from "os";
import { join } from "path";

// ============================================================================
// THEME & COLORS
// ============================================================================
const THEME = {
  primary: "cyan",
  secondary: "blue",
  success: "green",
  error: "red",
  warning: "yellow",
  muted: "gray",
  accent: "magenta",
} as const;

// ============================================================================
// LOGO
// ============================================================================
const LOGO = `
 ╔╦╗┌─┐┬─┐┬┌─┌─┐┌┬┐┌─┐┬  ┌─┐┌─┐┌─┐
 ║║║├─┤├┬┘├┴┐├┤  │ ├─┘│  ├─┤│  ├┤ 
 ╩ ╩┴ ┴┴└─┴ ┴└─┘ ┴ ┴  ┴─┘┴ ┴└─┘└─┘
 ╔╦╗┬─┐┌─┐┌─┐┬┌─┌─┐┬─┐
  ║ ├┬┘├─┤│  ├┴┐├┤ ├┬┘
  ╩ ┴└─┴ ┴└─┘┴ ┴└─┘┴└─
`.trim();

// ============================================================================
// TYPES
// ============================================================================
type View = "main" | "dialog";
type DialogType = "queries" | "items" | "jobs" | "help" | null;
type ToastType = "info" | "success" | "error" | "warning";

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  createdAt: number;
}

interface SlashCommand {
  name: string;
  shortcut?: string;
  description: string;
  args?: string;
}

interface BackgroundJob {
  id: string;
  queryName: string;
  status: "running" | "done" | "error";
  startTime: Date;
  proc: ChildProcess;
  results: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================
const SLASH_COMMANDS: SlashCommand[] = [
  { name: "list", shortcut: "l", description: "View saved searches" },
  { name: "run", shortcut: "r", description: "Run search(es)", args: "[name]" },
  { name: "bg", description: "Run search in background", args: "<name>" },
  { name: "verbose", shortcut: "v", description: "Toggle verbose mode" },
  { name: "jobs", shortcut: "j", description: "View background jobs" },
  { name: "delete", shortcut: "d", description: "Delete a search", args: "<name>" },
  { name: "clear", description: "Clear messages" },
  { name: "clear-history", description: "Clear input history" },
  { name: "help", shortcut: "?", description: "Show help" },
  { name: "quit", shortcut: "q", description: "Exit" },
];

const TOAST_DURATION = 4000;

// ============================================================================
// UTILITIES
// ============================================================================
function findOpencodeBinary(): string {
  const locations = [
    join(homedir(), ".opencode", "bin", "opencode"),
    "/usr/local/bin/opencode",
  ];
  for (const loc of locations) {
    if (existsSync(loc)) return loc;
  }
  return "opencode";
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (seconds < 60) return `${seconds}s ago`;
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return date.toLocaleDateString();
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// ============================================================================
// COMPONENTS
// ============================================================================

// Logo Header
function Logo() {
  return (
    <Box flexDirection="column" alignItems="center" marginBottom={1}>
      <Text color={THEME.primary}>{LOGO}</Text>
    </Box>
  );
}

// Toast Notification
function ToastNotification({ toast }: { toast: Toast }) {
  const colors: Record<ToastType, string> = {
    info: THEME.secondary,
    success: THEME.success,
    error: THEME.error,
    warning: THEME.warning,
  };

  const icons: Record<ToastType, string> = {
    info: "ℹ",
    success: "✓",
    error: "✗",
    warning: "⚠",
  };

  return (
    <Box paddingX={1}>
      <Text color={colors[toast.type]}>{icons[toast.type]} </Text>
      <Text>{toast.message}</Text>
    </Box>
  );
}

// Status Bar
function StatusBar({
  queries,
  runningJobs,
  verboseMode,
  activeSearch,
}: {
  queries: Query[];
  runningJobs: number;
  verboseMode: boolean;
  activeSearch: string | null;
}) {
  const newItemsCount = queries.reduce((sum, q) => sum + getNewItems(q.id).length, 0);

  return (
    <Box
      borderStyle="single"
      borderColor={THEME.muted}
      paddingX={1}
      justifyContent="space-between"
    >
      <Box>
        <Text color={THEME.muted}>Searches: </Text>
        <Text color={THEME.primary} bold>{queries.length}</Text>
        <Text color={THEME.muted}> │ New: </Text>
        <Text color={newItemsCount > 0 ? THEME.success : THEME.muted} bold>
          {newItemsCount}
        </Text>
        {runningJobs > 0 && (
          <>
            <Text color={THEME.muted}> │ </Text>
            <Text color={THEME.warning}>
              <Spinner type="dots" />
            </Text>
            <Text color={THEME.warning}> {runningJobs} job{runningJobs > 1 ? "s" : ""}</Text>
          </>
        )}
      </Box>
      <Box>
        {activeSearch && (
          <>
            <Text color={THEME.accent}>
              <Spinner type="dots" />
            </Text>
            <Text color={THEME.accent}> {activeSearch}</Text>
            <Text color={THEME.muted}> │ </Text>
          </>
        )}
        {verboseMode && (
          <>
            <Text color={THEME.warning}>[VERBOSE]</Text>
            <Text color={THEME.muted}> │ </Text>
          </>
        )}
        <Text color={THEME.muted}>? help │ ctrl+c quit</Text>
      </Box>
    </Box>
  );
}

// Autocomplete Dropdown with fuzzy search
function AutocompleteDropdown({
  commands,
  selectedIndex,
  searchTerm,
}: {
  commands: SlashCommand[];
  selectedIndex: number;
  searchTerm: string;
}) {
  if (commands.length === 0) return null;

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={THEME.secondary}
      paddingX={1}
      marginBottom={1}
    >
      <Text color={THEME.muted} dimColor>
        Commands matching "{searchTerm}"
      </Text>
      <Box height={1} />
      {commands.slice(0, 8).map((cmd, i) => {
        const isSelected = i === selectedIndex;
        return (
          <Box key={cmd.name}>
            <Text
              backgroundColor={isSelected ? THEME.secondary : undefined}
              color={isSelected ? "white" : undefined}
            >
              {isSelected ? "▸" : " "} /{cmd.name}
            </Text>
            {cmd.shortcut && <Text color={THEME.muted}> ({cmd.shortcut})</Text>}
            {cmd.args && <Text color={THEME.accent}> {cmd.args}</Text>}
            <Text color={THEME.muted}> — {cmd.description}</Text>
          </Box>
        );
      })}
      <Box height={1} />
      <Text color={THEME.muted} dimColor>
        ↑↓ navigate │ Tab complete │ Esc close
      </Text>
    </Box>
  );
}

// Dialog Component (overlay)
function Dialog({
  title,
  children,
  footer,
  width = 60,
}: {
  title: string;
  children: React.ReactNode;
  footer?: string;
  width?: number;
}) {
  return (
    <Box
      flexDirection="column"
      borderStyle="double"
      borderColor={THEME.primary}
      paddingX={2}
      paddingY={1}
      width={width}
    >
      <Box marginBottom={1}>
        <Text color={THEME.primary} bold>
          {title}
        </Text>
      </Box>
      {children}
      {footer && (
        <Box marginTop={1}>
          <Text color={THEME.muted} dimColor>
            {footer}
          </Text>
        </Box>
      )}
    </Box>
  );
}

// Queries Dialog
function QueriesDialog({
  queries,
  selectedIndex,
  backgroundJobs,
}: {
  queries: Query[];
  selectedIndex: number;
  backgroundJobs: BackgroundJob[];
}) {
  return (
    <Dialog
      title="📋 Saved Searches"
      footer="j/k navigate │ Enter view │ r run │ b background │ x delete │ Esc close"
      width={70}
    >
      {queries.length === 0 ? (
        <Text color={THEME.muted}>
          No searches saved. Type something like "amps under 300" to create one.
        </Text>
      ) : (
        <Box flexDirection="column">
          {queries.map((q, i) => {
            const newCount = getNewItems(q.id).length;
            const isSelected = i === selectedIndex;
            const bgJob = backgroundJobs.find(
              (j) => j.queryName === q.name && j.status === "running"
            );

            return (
              <Box key={q.id}>
                <Text
                  backgroundColor={isSelected ? THEME.secondary : undefined}
                  color={isSelected ? "white" : undefined}
                >
                  {isSelected ? "▸" : " "} {q.name.padEnd(25)}
                </Text>
                {bgJob && (
                  <Text color={THEME.warning}>
                    <Spinner type="dots" />
                  </Text>
                )}
                {newCount > 0 && (
                  <Text color={THEME.success} bold>
                    {" "}
                    ({newCount} new)
                  </Text>
                )}
                <Text color={THEME.muted}>
                  {" "}
                  ${q.maxPrice} · {q.searchTerms.slice(0, 2).join(", ")}
                </Text>
                {q.lastRun && (
                  <Text color={THEME.muted} dimColor>
                    {" "}
                    · {formatRelativeTime(new Date(q.lastRun))}
                  </Text>
                )}
              </Box>
            );
          })}
        </Box>
      )}
    </Dialog>
  );
}

// Items Dialog
function ItemsDialog({
  query,
  items,
  selectedIndex,
}: {
  query: Query;
  items: Item[];
  selectedIndex: number;
}) {
  const visibleItems = items.filter((i) => i.status !== "hidden");

  return (
    <Dialog
      title={`🛒 ${query.name} — ${visibleItems.length} items`}
      footer="j/k navigate │ Enter open in browser │ s mark seen │ h hide │ Esc back"
      width={80}
    >
      {visibleItems.length === 0 ? (
        <Text color={THEME.muted}>No items found. Run the search first.</Text>
      ) : (
        <Box flexDirection="column">
          {visibleItems.slice(0, 12).map((item, i) => {
            const isSelected = i === selectedIndex;
            const statusIcon =
              item.status === "new" ? "●" : item.status === "contacted" ? "◉" : "○";
            const statusColor =
              item.status === "new"
                ? THEME.warning
                : item.status === "contacted"
                ? THEME.accent
                : THEME.muted;

            return (
              <Box key={item.id} flexDirection="column">
                <Box>
                  <Text
                    backgroundColor={isSelected ? THEME.secondary : undefined}
                    color={isSelected ? "white" : undefined}
                  >
                    {isSelected ? "▸" : " "}
                    <Text color={isSelected ? "white" : statusColor}>{statusIcon}</Text>{" "}
                    {item.title.slice(0, 50).padEnd(50)}
                  </Text>
                  <Text color={THEME.success} bold>
                    {" "}
                    {item.price}
                  </Text>
                </Box>
                {isSelected && (
                  <Box marginLeft={4}>
                    <Text color={THEME.muted} dimColor>
                      {item.link.slice(0, 70)}
                    </Text>
                  </Box>
                )}
              </Box>
            );
          })}
        </Box>
      )}
    </Dialog>
  );
}

// Jobs Dialog
function JobsDialog({
  jobs,
  selectedIndex,
}: {
  jobs: BackgroundJob[];
  selectedIndex: number;
}) {
  return (
    <Dialog
      title="⚙ Background Jobs"
      footer="j/k navigate │ x cancel │ Esc close"
      width={60}
    >
      {jobs.length === 0 ? (
        <Text color={THEME.muted}>No background jobs running.</Text>
      ) : (
        <Box flexDirection="column">
          {jobs.map((job, i) => {
            const isSelected = i === selectedIndex;
            const statusColor =
              job.status === "running"
                ? THEME.warning
                : job.status === "done"
                ? THEME.success
                : THEME.error;
            const statusIcon =
              job.status === "running" ? (
                <Spinner type="dots" />
              ) : job.status === "done" ? (
                "✓"
              ) : (
                "✗"
              );

            return (
              <Box key={job.id}>
                <Text
                  backgroundColor={isSelected ? THEME.secondary : undefined}
                  color={isSelected ? "white" : undefined}
                >
                  {isSelected ? "▸" : " "} [{job.id}]
                </Text>
                <Text color={statusColor}> {statusIcon}</Text>
                <Text> {job.queryName}</Text>
                <Text color={THEME.muted}>
                  {" "}
                  · {formatRelativeTime(job.startTime)}
                </Text>
                {job.status === "done" && (
                  <Text color={THEME.success}> · {job.results} results</Text>
                )}
              </Box>
            );
          })}
        </Box>
      )}
    </Dialog>
  );
}

// Help Dialog
function HelpDialog() {
  return (
    <Dialog title="📖 Help" footer="Esc close" width={65}>
      <Box flexDirection="column">
        <Text color={THEME.primary} bold>
          Quick Start
        </Text>
        <Text color={THEME.muted}>
          Type a natural search like "vintage amps under 300" to create and run a search.
        </Text>
        <Box height={1} />

        <Text color={THEME.primary} bold>
          Commands
        </Text>
        {SLASH_COMMANDS.map((cmd) => (
          <Box key={cmd.name}>
            <Text color={THEME.accent}>/{cmd.name}</Text>
            {cmd.shortcut && <Text color={THEME.muted}> ({cmd.shortcut})</Text>}
            {cmd.args && <Text color={THEME.warning}> {cmd.args}</Text>}
            <Text color={THEME.muted}> — {cmd.description}</Text>
          </Box>
        ))}
        <Box height={1} />

        <Text color={THEME.primary} bold>
          Keyboard Shortcuts
        </Text>
        <Text>
          <Text color={THEME.accent}>↑/↓</Text>
          <Text color={THEME.muted}> — Browse input history</Text>
        </Text>
        <Text>
          <Text color={THEME.accent}>Tab</Text>
          <Text color={THEME.muted}> — Complete command</Text>
        </Text>
        <Text>
          <Text color={THEME.accent}>b/w</Text>
          <Text color={THEME.muted}> — Move active search to background</Text>
        </Text>
        <Text>
          <Text color={THEME.accent}>Ctrl+C</Text>
          <Text color={THEME.muted}> — Exit</Text>
        </Text>
      </Box>
    </Dialog>
  );
}

// Search Progress View
function SearchProgress({
  progress,
  verboseMode,
  verboseLog,
}: {
  progress: string;
  verboseMode: boolean;
  verboseLog: string[];
}) {
  return (
    <Box flexDirection="column" paddingX={2}>
      <Box marginBottom={1}>
        <Text color={THEME.primary}>
          <Spinner type="dots12" />
        </Text>
        <Text color={THEME.primary} bold>
          {" "}
          Searching...
        </Text>
      </Box>

      <Box marginBottom={1}>
        <Text>{progress || "Initializing agent..."}</Text>
      </Box>

      {verboseMode && verboseLog.length > 0 && (
        <Box
          flexDirection="column"
          borderStyle="single"
          borderColor={THEME.muted}
          paddingX={1}
          marginBottom={1}
        >
          <Text color={THEME.muted} bold>
            Agent Log
          </Text>
          {verboseLog.slice(-6).map((log, i) => (
            <Text key={i} color={THEME.muted} dimColor>
              {log}
            </Text>
          ))}
        </Box>
      )}

      <Text color={THEME.muted}>
        Press <Text color={THEME.accent}>b</Text> or{" "}
        <Text color={THEME.accent}>w</Text> to move to background
      </Text>
    </Box>
  );
}

// Input Prompt
function InputPrompt({
  value,
  onChange,
  onSubmit,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  placeholder: string;
}) {
  return (
    <Box borderStyle="round" borderColor={THEME.primary} paddingX={1}>
      <Text color={THEME.primary}>❯ </Text>
      <TextInput
        value={value}
        onChange={onChange}
        onSubmit={onSubmit}
        placeholder={placeholder}
      />
    </Box>
  );
}

// ============================================================================
// MAIN APP
// ============================================================================
function App() {
  const { exit } = useApp();
  const { stdout } = useStdout();
  const terminalWidth = stdout?.columns || 80;

  // State
  const [view, setView] = useState<View>("main");
  const [dialogType, setDialogType] = useState<DialogType>(null);
  const [input, setInput] = useState("");
  const [queries, setQueries] = useState<Query[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [items, setItems] = useState<Item[]>([]);
  const [currentQuery, setCurrentQuery] = useState<Query | null>(null);
  const [verboseMode, setVerboseMode] = useState(false);
  const [verboseLog, setVerboseLog] = useState<string[]>([]);
  const [backgroundJobs, setBackgroundJobs] = useState<BackgroundJob[]>([]);
  const [searchProgress, setSearchProgress] = useState("");
  const [activeSearchQuery, setActiveSearchQuery] = useState<Query | null>(null);
  const activeProc = useRef<ChildProcess | null>(null);

  // Toast state
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Input history
  const [inputHistory, setInputHistory] = useState<string[]>(() => getHistory());
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Autocomplete state
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [autocompleteIndex, setAutocompleteIndex] = useState(0);

  // Fuzzy search commands
  const filteredCommands = useMemo(() => {
    if (!input.startsWith("/") || input.length < 2) return [];
    const searchTerm = input.slice(1).split(" ")[0].toLowerCase();
    if (!searchTerm) return [];

    const results = fuzzysort.go(searchTerm, SLASH_COMMANDS, {
      keys: ["name", "shortcut"],
      threshold: -1000,
    });

    return results.map((r) => r.obj);
  }, [input]);

  // Load queries
  const refreshQueries = useCallback(() => {
    setQueries(getQueries());
  }, []);

  useEffect(() => {
    refreshQueries();
    const interval = setInterval(refreshQueries, 5000);
    return () => clearInterval(interval);
  }, [refreshQueries]);

  // Toast management
  const addToast = useCallback((type: ToastType, message: string) => {
    const id = generateId();
    setToasts((prev) => [...prev.slice(-2), { id, type, message, createdAt: Date.now() }]);

    // Auto-remove after duration
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, TOAST_DURATION);
  }, []);

  const addVerboseLog = useCallback((text: string) => {
    setVerboseLog((prev) => [...prev.slice(-20), text]);
  }, []);

  // Open dialog
  const openDialog = useCallback((type: DialogType) => {
    setDialogType(type);
    setView("dialog");
    setSelectedIndex(0);
  }, []);

  // Close dialog
  const closeDialog = useCallback(() => {
    setDialogType(null);
    setView("main");
    setSelectedIndex(0);
  }, []);

  // Move current search to background
  const moveToBackground = useCallback(() => {
    if (activeProc.current && activeSearchQuery) {
      const jobId = generateId();
      const job: BackgroundJob = {
        id: jobId,
        queryName: activeSearchQuery.name,
        status: "running",
        startTime: new Date(),
        proc: activeProc.current,
        results: 0,
      };

      setBackgroundJobs((prev) => [...prev, job]);
      addToast("info", `Moved "${activeSearchQuery.name}" to background`);

      setSearchProgress("");
      setActiveSearchQuery(null);
      activeProc.current = null;
    }
  }, [activeSearchQuery, addToast]);

  // Run a search
  const runSearch = useCallback(
    async (query: Query, runInBackground = false): Promise<void> => {
      return new Promise((resolve) => {
        if (!runInBackground) {
          setSearchProgress(`Searching for ${query.searchTerms.join(", ")}...`);
          setActiveSearchQuery(query);
          setVerboseLog([]);
          closeDialog();
        }

        // Kill orphaned Chrome MCP instances
        try {
          spawn("pkill", ["-f", "chrome-devtools-mcp"], { stdio: "ignore" });
        } catch {}

        const opencode = findOpencodeBinary();
        const searchTermsStr = query.searchTerms.map((t) => `"${t}"`).join(" OR ");
        const prompt = `Search Facebook Marketplace ${query.location} for ${searchTermsStr} under $${query.maxPrice}. Return a JSON array with objects containing: text (item description), price (string like "$150"), link (full URL).`;

        const proc = spawn(opencode, ["run", "--agent", "fb-marketplace", prompt], {
          cwd: join(homedir(), "git", "personal", "cool-website"),
          env: { ...process.env },
          stdio: ["inherit", "pipe", "pipe"],
        });

        if (!runInBackground) {
          activeProc.current = proc;
        } else {
          const jobId = generateId();
          const job: BackgroundJob = {
            id: jobId,
            queryName: query.name,
            status: "running",
            startTime: new Date(),
            proc,
            results: 0,
          };
          setBackgroundJobs((prev) => [...prev, job]);
        }

        let output = "";

        proc.stdout.on("data", (data) => {
          const chunk = data.toString();
          output += chunk;

          if (
            chunk.includes("another browser instance") ||
            chunk.includes("browser connection")
          ) {
            addToast("error", "Chrome is busy. Close other OpenCode sessions first.");
          }

          if (verboseMode) {
            const lines = chunk.split("\n").filter((l: string) => l.trim());
            for (const line of lines) {
              const cleanLine = line.replace(/\x1b\[[0-9;]*m/g, "").slice(0, 100);
              addVerboseLog(cleanLine);
            }
          }

          if (!runInBackground) {
            const lines = chunk.split("\n").filter((l: string) => l.trim());
            const lastLine = lines[lines.length - 1];
            if (lastLine) {
              const cleanLine = lastLine.replace(/\x1b\[[0-9;]*m/g, "").slice(0, 80);
              setSearchProgress(cleanLine);
            }
          }
        });

        proc.on("close", (code) => {
          const results = parseResults(output);

          if (results.length > 0) {
            const newItems = addItems(
              query.id,
              results.map((r) => ({
                title: r.text || r.item || "",
                price: r.price || "N/A",
                link: r.link || "",
                location: r.location || query.location,
              }))
            );
            updateQueryLastRun(query.id);

            if (runInBackground) {
              setBackgroundJobs((prev) =>
                prev.map((j) =>
                  j.queryName === query.name
                    ? { ...j, status: "done", results: newItems.length }
                    : j
                )
              );
            }

            addToast("success", `Found ${newItems.length} new items for "${query.name}"`);
          } else {
            if (code === 0) {
              addToast("info", `No new items for "${query.name}"`);
            } else {
              addToast("error", `Search failed for "${query.name}"`);
              if (runInBackground) {
                setBackgroundJobs((prev) =>
                  prev.map((j) =>
                    j.queryName === query.name ? { ...j, status: "error" } : j
                  )
                );
              }
            }
          }

          if (!runInBackground) {
            setSearchProgress("");
            setActiveSearchQuery(null);
            activeProc.current = null;
          }

          refreshQueries();
          resolve();
        });
      });
    },
    [addToast, addVerboseLog, refreshQueries, verboseMode, closeDialog]
  );

  // Parse results from output
  const parseResults = (output: string): any[] => {
    const results: any[] = [];

    const jsonBlockMatch = output.match(/```json\n([\s\S]*?)\n```/);
    if (jsonBlockMatch) {
      try {
        const parsed = JSON.parse(jsonBlockMatch[1]);
        if (Array.isArray(parsed)) {
          results.push(
            ...parsed.filter((item: any) => item.link && item.link.includes("marketplace"))
          );
        }
      } catch {}
    }

    const jsonArrayMatch = output.match(/\[\s*\{[\s\S]*?\}\s*\]/g);
    if (jsonArrayMatch) {
      for (const match of jsonArrayMatch) {
        try {
          const parsed = JSON.parse(match);
          if (Array.isArray(parsed)) {
            results.push(
              ...parsed.filter(
                (item: any) => item.link && item.link.includes("marketplace")
              )
            );
          }
        } catch {}
      }
    }

    const seen = new Set<string>();
    return results.filter((r) => {
      if (!r.link || seen.has(r.link)) return false;
      seen.add(r.link);
      return true;
    });
  };

  // Handle input submission
  const handleSubmit = useCallback(
    (value: string) => {
      const trimmed = value.trim();
      if (!trimmed) return;

      addToHistory(trimmed);
      setInputHistory((prev) => [...prev, trimmed]);
      setHistoryIndex(-1);
      setInput("");
      setShowAutocomplete(false);

      if (trimmed.startsWith("/")) {
        const [cmd, ...args] = trimmed.slice(1).split(" ");

        switch (cmd) {
          case "verbose":
          case "v":
            setVerboseMode((prev) => !prev);
            addToast("info", `Verbose mode ${!verboseMode ? "ON" : "OFF"}`);
            break;

          case "jobs":
          case "j":
            openDialog("jobs");
            break;

          case "list":
          case "l":
            openDialog("queries");
            break;

          case "run":
          case "r":
            const queryName = args.join(" ");
            if (queryName) {
              const query = getQueryByName(queryName);
              if (query) {
                runSearch(query);
              } else {
                addToast("error", `Query "${queryName}" not found`);
              }
            } else if (queries.length > 0) {
              addToast("info", `Running ${queries.length} queries...`);
              const runNext = async (idx: number) => {
                if (idx < queries.length) {
                  await runSearch(queries[idx]);
                  runNext(idx + 1);
                }
              };
              runNext(0);
            } else {
              addToast("error", "No queries to run");
            }
            break;

          case "bg":
          case "background":
            const bgQueryName = args.join(" ");
            if (bgQueryName) {
              const query = getQueryByName(bgQueryName);
              if (query) {
                runSearch(query, true);
                addToast("info", `Started "${bgQueryName}" in background`);
              } else {
                addToast("error", `Query "${bgQueryName}" not found`);
              }
            } else {
              addToast("error", "Usage: /bg <query-name>");
            }
            break;

          case "delete":
          case "d":
            const delName = args.join(" ");
            const delQuery = getQueryByName(delName);
            if (delQuery) {
              deleteQuery(delQuery.id);
              refreshQueries();
              addToast("success", `Deleted query "${delName}"`);
            } else {
              addToast("error", `Query "${delName}" not found`);
            }
            break;

          case "clear":
            setToasts([]);
            break;

          case "clear-history":
            clearHistory();
            setInputHistory([]);
            addToast("success", "Input history cleared");
            break;

          case "help":
          case "?":
            openDialog("help");
            break;

          case "quit":
          case "q":
            exit();
            break;

          default:
            addToast("error", `Unknown command: /${cmd}. Try /help`);
        }
      } else {
        // Natural language search
        const priceMatch = trimmed.match(/under\s*\$?(\d+)/i);
        const maxPrice = priceMatch ? parseInt(priceMatch[1]) : 500;

        let terms = trimmed
          .replace(/under\s*\$?\d+/gi, "")
          .replace(/search\s*(for)?/gi, "")
          .replace(/find\s*(me)?/gi, "")
          .replace(/look\s*(for)?/gi, "")
          .trim()
          .split(/\s+/)
          .filter((t) => t.length > 2);

        if (terms.length === 0) {
          addToast("error", "Couldn't parse search terms. Try: 'amps under 300'");
          return;
        }

        const name = terms.slice(0, 2).join("-") + "-" + Date.now().toString(36).slice(-4);

        const query = addQuery({
          name,
          searchTerms: terms,
          maxPrice,
          location: "San Francisco",
        });

        refreshQueries();
        addToast("success", `Created "${name}" for ${terms.join(", ")} <$${maxPrice}`);
        runSearch(query);
      }
    },
    [queries, runSearch, addToast, refreshQueries, exit, verboseMode, openDialog]
  );

  // Handle input change
  const handleInputChange = useCallback((value: string) => {
    setInput(value);
    setHistoryIndex(-1);

    if (value.startsWith("/") && value.length > 1) {
      setShowAutocomplete(true);
      setAutocompleteIndex(0);
    } else {
      setShowAutocomplete(false);
    }
  }, []);

  // Keyboard input handler
  useInput((char, key) => {
    // Background key during search
    if (activeSearchQuery && (char === "b" || char === "w")) {
      moveToBackground();
      return;
    }

    // Dialog navigation
    if (view === "dialog") {
      if (key.escape) {
        if (dialogType === "items") {
          setDialogType("queries");
          setSelectedIndex(0);
        } else {
          closeDialog();
        }
        return;
      }

      const maxIndex =
        dialogType === "queries"
          ? queries.length - 1
          : dialogType === "items"
          ? items.filter((i) => i.status !== "hidden").length - 1
          : dialogType === "jobs"
          ? backgroundJobs.length - 1
          : 0;

      if (key.upArrow || char === "k") {
        setSelectedIndex((i) => Math.max(0, i - 1));
        return;
      }
      if (key.downArrow || char === "j") {
        setSelectedIndex((i) => Math.min(maxIndex, i + 1));
        return;
      }

      // Dialog-specific actions
      if (dialogType === "queries" && queries.length > 0) {
        if (key.return) {
          const query = queries[selectedIndex];
          setCurrentQuery(query);
          setItems(getItems(query.id));
          setDialogType("items");
          setSelectedIndex(0);
          return;
        }
        if (char === "r") {
          runSearch(queries[selectedIndex]);
          return;
        }
        if (char === "b") {
          runSearch(queries[selectedIndex], true);
          addToast("info", `Started "${queries[selectedIndex].name}" in background`);
          return;
        }
        if (char === "x") {
          const q = queries[selectedIndex];
          deleteQuery(q.id);
          refreshQueries();
          addToast("success", `Deleted "${q.name}"`);
          setSelectedIndex((i) => Math.max(0, i - 1));
          return;
        }
      }

      if (dialogType === "items" && items.length > 0) {
        const visibleItems = items.filter((i) => i.status !== "hidden");
        if (key.return && visibleItems[selectedIndex]) {
          spawn("open", [visibleItems[selectedIndex].link]);
          return;
        }
        if (char === "s" && visibleItems[selectedIndex]) {
          updateItemStatus(visibleItems[selectedIndex].id, "seen");
          setItems(getItems(currentQuery!.id));
          return;
        }
        if (char === "h" && visibleItems[selectedIndex]) {
          updateItemStatus(visibleItems[selectedIndex].id, "hidden");
          setItems(getItems(currentQuery!.id));
          return;
        }
      }

      if (dialogType === "jobs" && char === "x" && backgroundJobs[selectedIndex]) {
        const job = backgroundJobs[selectedIndex];
        if (job.status === "running") {
          job.proc.kill();
        }
        setBackgroundJobs((prev) => prev.filter((j) => j.id !== job.id));
        addToast("info", `Removed job ${job.id}`);
        return;
      }

      return;
    }

    // Autocomplete navigation (main view)
    if (showAutocomplete && filteredCommands.length > 0) {
      if (key.upArrow) {
        setAutocompleteIndex((i) => Math.max(0, i - 1));
        return;
      }
      if (key.downArrow) {
        setAutocompleteIndex((i) => Math.min(filteredCommands.length - 1, i + 1));
        return;
      }
      if (key.tab) {
        const selected = filteredCommands[autocompleteIndex];
        if (selected) {
          setInput(`/${selected.name}${selected.args ? " " : ""}`);
          setShowAutocomplete(false);
        }
        return;
      }
      if (key.escape) {
        setShowAutocomplete(false);
        return;
      }
    }

    // History navigation (main view, no autocomplete)
    if (view === "main" && !showAutocomplete && inputHistory.length > 0) {
      if (key.upArrow) {
        const newIndex =
          historyIndex === -1 ? inputHistory.length - 1 : Math.max(0, historyIndex - 1);
        setHistoryIndex(newIndex);
        setInput(inputHistory[newIndex] || "");
        return;
      }
      if (key.downArrow && historyIndex !== -1) {
        const newIndex = historyIndex + 1;
        if (newIndex >= inputHistory.length) {
          setHistoryIndex(-1);
          setInput("");
        } else {
          setHistoryIndex(newIndex);
          setInput(inputHistory[newIndex] || "");
        }
        return;
      }
    }

    if (key.ctrl && char === "c") {
      exit();
    }
  });

  const runningJobs = backgroundJobs.filter((j) => j.status === "running").length;

  return (
    <Box
      flexDirection="column"
      width={Math.min(terminalWidth, 90)}
      paddingX={1}
    >
      {/* Logo */}
      <Logo />

      {/* Toasts */}
      {toasts.length > 0 && (
        <Box flexDirection="column" marginBottom={1}>
          {toasts.map((toast) => (
            <ToastNotification key={toast.id} toast={toast} />
          ))}
        </Box>
      )}

      {/* Active search progress */}
      {activeSearchQuery && (
        <Box marginBottom={1}>
          <SearchProgress
            progress={searchProgress}
            verboseMode={verboseMode}
            verboseLog={verboseLog}
          />
        </Box>
      )}

      {/* Dialog overlay */}
      {view === "dialog" && (
        <Box justifyContent="center" marginBottom={1}>
          {dialogType === "queries" && (
            <QueriesDialog
              queries={queries}
              selectedIndex={selectedIndex}
              backgroundJobs={backgroundJobs}
            />
          )}
          {dialogType === "items" && currentQuery && (
            <ItemsDialog
              query={currentQuery}
              items={items}
              selectedIndex={selectedIndex}
            />
          )}
          {dialogType === "jobs" && (
            <JobsDialog jobs={backgroundJobs} selectedIndex={selectedIndex} />
          )}
          {dialogType === "help" && <HelpDialog />}
        </Box>
      )}

      {/* Autocomplete */}
      {view === "main" && showAutocomplete && filteredCommands.length > 0 && (
        <AutocompleteDropdown
          commands={filteredCommands}
          selectedIndex={autocompleteIndex}
          searchTerm={input.slice(1).split(" ")[0]}
        />
      )}

      {/* Input prompt */}
      <InputPrompt
        value={input}
        onChange={handleInputChange}
        onSubmit={handleSubmit}
        placeholder='Type a search like "amps under 300" or /help'
      />

      {/* Status bar */}
      <Box marginTop={1}>
        <StatusBar
          queries={queries}
          runningJobs={runningJobs}
          verboseMode={verboseMode}
          activeSearch={activeSearchQuery?.name || null}
        />
      </Box>
    </Box>
  );
}

export function startTUI() {
  return new Promise<void>((resolve) => {
    const { waitUntilExit } = render(<App />);
    waitUntilExit().then(resolve);
  });
}

// Allow running directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startTUI();
}
