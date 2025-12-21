import { spawn, execSync } from "child_process";
import { existsSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import type { SearchResult, RunnerOptions } from "./types";

interface SearchParams {
  searchTerms: string[];
  maxPrice: number;
  location: string;
}

/**
 * Find the opencode binary
 */
function findOpencodeBinary(): string {
  // Check common locations
  const locations = [
    join(homedir(), ".opencode", "bin", "opencode"),
    "/usr/local/bin/opencode",
    "/opt/homebrew/bin/opencode",
  ];

  for (const loc of locations) {
    if (existsSync(loc)) {
      return loc;
    }
  }

  // Fall back to PATH
  return "opencode";
}

/**
 * Find the project root with opencode.json that has Chrome MCP configured
 */
function findProjectRoot(): string {
  // Walk up from current directory looking for opencode.json with chrome MCP
  let dir = process.cwd();
  const root = "/";

  while (dir !== root) {
    const configPath = join(dir, "opencode.json");
    if (existsSync(configPath)) {
      try {
        const config = JSON.parse(require("fs").readFileSync(configPath, "utf-8"));
        if (config.mcp?.chrome) {
          return dir;
        }
      } catch {
        // Ignore parse errors
      }
    }
    dir = join(dir, "..");
  }

  // Fallback: check common project locations
  const commonPaths = [
    join(homedir(), "git", "personal", "cool-website"),
    process.cwd(),
  ];

  for (const p of commonPaths) {
    const configPath = join(p, "opencode.json");
    if (existsSync(configPath)) {
      return p;
    }
  }

  return process.cwd();
}

/**
 * Run a marketplace search using the opencode fb-marketplace agent
 */
export async function runMarketplaceSearch(params: SearchParams, options: RunnerOptions = {}): Promise<SearchResult[]> {
  const searchTermsStr = params.searchTerms.map((t) => `"${t}"`).join(" OR ");

  const prompt = `Search Facebook Marketplace ${params.location} for ${searchTermsStr} under $${params.maxPrice}. 
Return ONLY a JSON array with objects containing: text (item description), price (string like "$150"), link (full URL).
Do not include any other text, just the JSON array.`;

  const opencodeBin = findOpencodeBinary();
  const args = ["run", "--agent", "fb-marketplace", "--format", "json"];

  // Attach to running server for faster execution
  if (options.serverUrl) {
    args.push("--attach", options.serverUrl);
  }

  args.push(prompt);

  console.log(`  Using opencode: ${opencodeBin}`);

  // Find the project root that has opencode.json with Chrome MCP configured
  // This is needed because the fb-marketplace agent requires Chrome tools
  const projectRoot = findProjectRoot();
  console.log(`  Project root: ${projectRoot}`);

  return new Promise((resolve, reject) => {
    const proc = spawn(opencodeBin, args, {
      cwd: projectRoot,
      env: { ...process.env, PATH: `${join(homedir(), ".opencode", "bin")}:${process.env.PATH}` },
    });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    proc.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    proc.on("error", (err) => {
      reject(new Error(`Failed to start opencode: ${err.message}`));
    });

    proc.on("close", (code) => {
      if (code !== 0) {
        console.error("OpenCode error:", stderr);
        reject(new Error(`OpenCode exited with code ${code}`));
        return;
      }

      resolve(parseSearchResults(stdout));
    });
  });
}

/**
 * Parse the JSON output from opencode (handles NDJSON event format)
 */
function parseSearchResults(output: string): SearchResult[] {
  const results: SearchResult[] = [];

  try {
    // Parse NDJSON events (one JSON object per line)
    const lines = output.split("\n").filter((l) => l.trim());

    for (const line of lines) {
      try {
        const event = JSON.parse(line);

        // Look for tool results that contain marketplace listings
        if (event.type === "tool_use" && event.part?.state?.output) {
          const toolOutput = event.part.state.output;

          // Try to parse the output as JSON array
          try {
            const parsed = JSON.parse(toolOutput);
            if (Array.isArray(parsed)) {
              for (const item of parsed) {
                if (item.link && item.link.includes("marketplace")) {
                  results.push({
                    text: item.text || item.title || "",
                    price: item.price || "N/A",
                    link: item.link || item.url || "",
                  });
                }
              }
            }
          } catch {
            // Output wasn't JSON, try regex extraction
            const jsonMatch = toolOutput.match(/\[[\s\S]*?\]/);
            if (jsonMatch) {
              try {
                const parsed = JSON.parse(jsonMatch[0]);
                if (Array.isArray(parsed)) {
                  for (const item of parsed) {
                    results.push({
                      text: item.text || item.title || "",
                      price: item.price || "N/A",
                      link: item.link || item.url || "",
                    });
                  }
                }
              } catch {
                // Ignore parse errors
              }
            }
          }
        }

        // Also look for text responses that might contain JSON
        if (event.type === "text" && event.part?.text) {
          const jsonMatch = event.part.text.match(/\[[\s\S]*?\]/);
          if (jsonMatch) {
            try {
              const parsed = JSON.parse(jsonMatch[0]);
              if (Array.isArray(parsed)) {
                for (const item of parsed) {
                  if (item.link) {
                    results.push({
                      text: item.text || item.title || "",
                      price: item.price || "N/A",
                      link: item.link || item.url || "",
                    });
                  }
                }
              }
            } catch {
              // Ignore parse errors
            }
          }
        }
      } catch {
        // Skip non-JSON lines
      }
    }

    // Deduplicate by link
    const seen = new Set<string>();
    return results.filter((r) => {
      if (seen.has(r.link)) return false;
      seen.add(r.link);
      return true;
    });
  } catch (e) {
    console.error("Failed to parse search results:", e);
    console.error("Raw output:", output.substring(0, 500));
    return [];
  }
}

/**
 * Start an opencode server for faster repeated searches
 */
export async function startServer(port: number = 4096): Promise<{ proc: ReturnType<typeof spawn>; url: string }> {
  const proc = spawn("opencode", ["serve", "--port", String(port)], {
    stdio: "inherit",
  });

  // Wait a bit for server to start
  await new Promise((resolve) => setTimeout(resolve, 2000));

  return {
    proc,
    url: `http://localhost:${port}`,
  };
}
