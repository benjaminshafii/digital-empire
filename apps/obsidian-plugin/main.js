var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => WebsiteSyncPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian4 = require("obsidian");

// src/types.ts
var DEFAULT_SETTINGS = {
  sourceFolder: "publish",
  githubToken: "",
  githubOwner: "",
  githubRepo: "",
  targetPath: "apps/blog/src/content/blog",
  branch: "main",
  syncedNotes: {}
};
var GitHubAuthError = class extends Error {
  constructor(message = "GitHub authentication failed") {
    super(message);
    this.name = "GitHubAuthError";
  }
};
var GitHubNotFoundError = class extends Error {
  constructor(path) {
    super(`File not found: ${path}`);
    this.name = "GitHubNotFoundError";
  }
};
var GitHubConflictError = class extends Error {
  constructor(message = "Conflict: remote file was modified") {
    super(message);
    this.name = "GitHubConflictError";
  }
};

// src/services/sync.ts
var import_obsidian = require("obsidian");

// src/services/github.ts
var GitHubService = class {
  constructor(config) {
    this.config = config;
    this.baseUrl = `https://api.github.com/repos/${config.owner}/${config.repo}`;
  }
  encodeGitHubPath(path) {
    return path.split("/").map((segment) => encodeURIComponent(segment)).join("/");
  }
  bytesToBase64(bytes) {
    const chunkSize = 32768;
    let binary = "";
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
    }
    return btoa(binary);
  }
  /**
   * Make an authenticated request to the GitHub API
   */
  async request(endpoint, options = {}) {
    const url = endpoint.startsWith("https://") ? endpoint : `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.config.token}`,
        Accept: "application/vnd.github.v3+json",
        "Content-Type": "application/json",
        ...options.headers
      }
    });
    if (response.status === 401) {
      throw new GitHubAuthError();
    }
    if (response.status === 404) {
      throw new GitHubNotFoundError(endpoint);
    }
    if (response.status === 409) {
      throw new GitHubConflictError();
    }
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`GitHub API error (${response.status}): ${error}`);
    }
    const text = await response.text();
    if (!text) {
      return {};
    }
    return JSON.parse(text);
  }
  /**
   * Get a file's content and SHA from the repository
   * Returns null if the file doesn't exist
   */
  async getFile(path) {
    try {
      const response = await this.request(
        `/contents/${this.encodeGitHubPath(path)}?ref=${this.config.branch}`
      );
      const content = atob(response.content.replace(/\n/g, ""));
      return {
        content,
        sha: response.sha
      };
    } catch (error) {
      if (error instanceof GitHubNotFoundError) {
        return null;
      }
      throw error;
    }
  }
  /**
   * Get a file's SHA without decoding content
   * Returns null if the file doesn't exist
   */
  async getFileSha(path) {
    try {
      const response = await this.request(
        `/contents/${this.encodeGitHubPath(path)}?ref=${this.config.branch}`
      );
      return response.sha;
    } catch (error) {
      if (error instanceof GitHubNotFoundError) {
        return null;
      }
      throw error;
    }
  }
  /**
   * Create or update a file in the repository
   * If sha is provided, updates existing file; otherwise creates new file
   */
  async createOrUpdateFile(path, content, message, sha) {
    console.log("[GitHub] createOrUpdateFile called");
    console.log("[GitHub] Path:", path);
    console.log("[GitHub] Message:", message);
    console.log("[GitHub] SHA:", sha || "(none)");
    console.log("[GitHub] Content length:", content.length);
    const encoder = new TextEncoder();
    const bytes = encoder.encode(content);
    const base64Content = this.bytesToBase64(bytes);
    const body = {
      message,
      content: base64Content,
      branch: this.config.branch
    };
    if (sha) {
      body.sha = sha;
    }
    console.log("[GitHub] Request body:", { ...body, content: `(${base64Content.length} chars base64)` });
    const response = await this.request(
      `/contents/${this.encodeGitHubPath(path)}`,
      {
        method: "PUT",
        body: JSON.stringify(body)
      }
    );
    console.log("[GitHub] Response received:", response);
    return {
      sha: response.content.sha,
      commitSha: response.commit.sha
    };
  }
  /**
   * Create or update a binary file (e.g., images)
   */
  async createOrUpdateBinaryFile(path, content, message, sha) {
    const bytes = new Uint8Array(content);
    const base64Content = this.bytesToBase64(bytes);
    const body = {
      message,
      content: base64Content,
      branch: this.config.branch
    };
    if (sha) {
      body.sha = sha;
    }
    const response = await this.request(
      `/contents/${this.encodeGitHubPath(path)}`,
      {
        method: "PUT",
        body: JSON.stringify(body)
      }
    );
    return {
      sha: response.content.sha,
      commitSha: response.commit.sha
    };
  }
  /**
   * Delete a file from the repository
   */
  async deleteFile(path, sha, message) {
    await this.request(`/contents/${this.encodeGitHubPath(path)}`, {
      method: "DELETE",
      body: JSON.stringify({
        message,
        sha,
        branch: this.config.branch
      })
    });
  }
  /**
   * List files in a directory
   * Returns an empty array if the directory doesn't exist
   */
  async listFiles(path) {
    try {
      const response = await this.request(
        `/contents/${this.encodeGitHubPath(path)}?ref=${this.config.branch}`
      );
      return response.filter((item) => item.type === "blob");
    } catch (error) {
      if (error instanceof GitHubNotFoundError) {
        return [];
      }
      throw error;
    }
  }
  /**
   * List directories in a path
   * Returns an empty array if the directory doesn't exist
   */
  async listDirectories(path) {
    try {
      const response = await this.request(
        `/contents/${this.encodeGitHubPath(path)}?ref=${this.config.branch}`
      );
      return response.filter((item) => item.type === "tree");
    } catch (error) {
      if (error instanceof GitHubNotFoundError) {
        return [];
      }
      throw error;
    }
  }
  /**
   * Test the connection and authentication
   */
  async testConnection() {
    try {
      await this.request(`/branches/${this.config.branch}`);
      return true;
    } catch (e) {
      return false;
    }
  }
  // ============================================
  // Git Tree API methods for atomic commits
  // ============================================
  /**
   * Get the current branch ref (commit SHA)
   */
  async getBranchRef() {
    const response = await this.request(
      `/git/ref/heads/${this.config.branch}`
    );
    return response.object.sha;
  }
  /**
   * Get a commit's tree SHA
   */
  async getCommitTree(commitSha) {
    const response = await this.request(
      `/git/commits/${commitSha}`
    );
    return response.tree.sha;
  }
  /**
   * Create a blob (file content) and return its SHA
   */
  async createBlob(content, encoding = "utf-8") {
    const response = await this.request("/git/blobs", {
      method: "POST",
      body: JSON.stringify({
        content,
        encoding
      })
    });
    return response.sha;
  }
  /**
   * Create a blob from binary content
   */
  async createBlobFromBinary(content) {
    const bytes = new Uint8Array(content);
    const base64Content = this.bytesToBase64(bytes);
    return this.createBlob(base64Content, "base64");
  }
  /**
   * Get the full tree for a path (recursive)
   */
  async getTree(treeSha, recursive = true) {
    const response = await this.request(
      `/git/trees/${treeSha}${recursive ? "?recursive=1" : ""}`
    );
    return response.tree;
  }
  /**
   * Create a new tree.
   * 
   * @param baseTreeSha - The SHA of the base tree to build upon
   * @param items - Items to add/update in the tree. To delete a file, omit it from items.
   * @param pathPrefix - If provided, only files under this prefix in the base tree will be replaced.
   *                     Files outside this prefix are preserved.
   */
  async createTree(baseTreeSha, items, pathPrefix) {
    let treeItems = items;
    if (pathPrefix) {
      const currentTree = await this.getTree(baseTreeSha);
      const preservedItems = currentTree.filter((item) => !item.path.startsWith(pathPrefix + "/") && item.path !== pathPrefix).filter((item) => item.type === "blob").map((item) => ({
        path: item.path,
        mode: "100644",
        type: "blob",
        sha: item.sha
      }));
      treeItems = [...preservedItems, ...items];
    }
    const response = await this.request("/git/trees", {
      method: "POST",
      body: JSON.stringify({
        tree: treeItems
      })
    });
    return response.sha;
  }
  /**
   * Create a commit
   */
  async createCommit(message, treeSha, parentSha) {
    const response = await this.request("/git/commits", {
      method: "POST",
      body: JSON.stringify({
        message,
        tree: treeSha,
        parents: [parentSha]
      })
    });
    return response.sha;
  }
  /**
   * Update a branch ref to point to a new commit
   */
  async updateBranchRef(commitSha) {
    await this.request(`/git/refs/heads/${this.config.branch}`, {
      method: "PATCH",
      body: JSON.stringify({
        sha: commitSha
      })
    });
  }
  /**
   * Atomic sync: Replace all files under a path with the provided files in a single commit.
   * Files outside the path are preserved. Files under the path not in the items list are deleted.
   * 
   * @param targetPath - The folder path to sync (e.g., "apps/blog/src/content/blog")
   * @param files - Array of { path, content } where path is relative to targetPath
   * @param message - Commit message
   */
  async atomicSync(targetPath, files, message) {
    console.log("[GitHub] Starting atomic sync...");
    console.log("[GitHub] Target path:", targetPath);
    console.log("[GitHub] Files to sync:", files.length);
    const currentCommitSha = await this.getBranchRef();
    console.log("[GitHub] Current commit:", currentCommitSha);
    const currentTreeSha = await this.getCommitTree(currentCommitSha);
    console.log("[GitHub] Current tree:", currentTreeSha);
    const treeItems = [];
    for (const file of files) {
      const fullPath = `${targetPath}/${file.path}`;
      let blobSha;
      if (typeof file.content === "string") {
        blobSha = await this.createBlob(file.content);
      } else {
        blobSha = await this.createBlobFromBinary(file.content);
      }
      treeItems.push({
        path: fullPath,
        mode: "100644",
        type: "blob",
        sha: blobSha
      });
      console.log("[GitHub] Created blob for:", fullPath);
    }
    const newTreeSha = await this.createTree(currentTreeSha, treeItems, targetPath);
    console.log("[GitHub] New tree:", newTreeSha);
    const newCommitSha = await this.createCommit(message, newTreeSha, currentCommitSha);
    console.log("[GitHub] New commit:", newCommitSha);
    await this.updateBranchRef(newCommitSha);
    console.log("[GitHub] Branch updated");
    return { commitSha: newCommitSha };
  }
};

// src/services/transformer.ts
function generateSlug(title) {
  return title.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}
function transformWikiLinks(content, basePath = "/blog") {
  const codeBlockRegex = /```[\s\S]*?```|`[^`]+`/g;
  const codeBlocks = [];
  const contentWithPlaceholders = content.replace(codeBlockRegex, (match) => {
    codeBlocks.push(match);
    return `__CODE_BLOCK_${codeBlocks.length - 1}__`;
  });
  const wikiLinkRegex = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
  const transformed = contentWithPlaceholders.replace(
    wikiLinkRegex,
    (_match, link, displayText) => {
      const slug = generateSlug(link);
      const text = displayText || link;
      return `[${text}](${basePath}/${slug})`;
    }
  );
  return transformed.replace(/__CODE_BLOCK_(\d+)__/g, (_match, index) => {
    return codeBlocks[parseInt(index, 10)];
  });
}
function encodeMarkdownLinkDestination(destination) {
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(destination)) {
    return encodeURI(destination);
  }
  return destination.split("/").map((segment) => encodeURIComponent(segment)).join("/");
}
function transformEmbeds(content, imageAssetBasePath, postSlug) {
  const codeBlockRegex = /```[\s\S]*?```|`[^`]+`/g;
  const codeBlocks = [];
  const contentWithPlaceholders = content.replace(codeBlockRegex, (match) => {
    codeBlocks.push(match);
    return `__CODE_BLOCK_${codeBlocks.length - 1}__`;
  });
  const imageExtensions = /\.(png|jpg|jpeg|gif|svg|webp|bmp)$/i;
  const embedRegex = /!\[\[([^\]]+)\]\]/g;
  const transformed = contentWithPlaceholders.replace(
    embedRegex,
    (_match, embed) => {
      const linkpath = embed.split("|")[0].trim();
      if (imageExtensions.test(linkpath)) {
        const fileName = linkpath.split("/").pop() || linkpath;
        const altText = fileName.replace(/\.[^.]+$/, "");
        const destination = imageAssetBasePath && postSlug ? `${imageAssetBasePath}/${postSlug}/${fileName}` : linkpath;
        return `![${altText}](${encodeMarkdownLinkDestination(destination)})`;
      }
      return "";
    }
  );
  return transformed.replace(/__CODE_BLOCK_(\d+)__/g, (_match, index) => {
    return codeBlocks[parseInt(index, 10)];
  });
}
function transformCallouts(content) {
  const calloutRegex = /^(>\s*)\[!(\w+)\][ \t]*([^\r\n]*)?$/gm;
  return content.replace(
    calloutRegex,
    (_match, prefix, type, title) => {
      const capitalizedType = type.charAt(0).toUpperCase() + type.slice(1);
      if (title && title.trim()) {
        return `${prefix}**${capitalizedType}: ${title.trim()}**`;
      }
      return `${prefix}**${capitalizedType}**`;
    }
  );
}
async function computeContentHash(content) {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
function extractFrontmatter(markdown) {
  const frontmatterRegex = /^---\n([\s\S]*?)\n---\n?/;
  const match = markdown.match(frontmatterRegex);
  if (!match) {
    return { frontmatter: {}, content: markdown };
  }
  const frontmatterStr = match[1];
  const content = markdown.slice(match[0].length);
  const frontmatter = {};
  const lines = frontmatterStr.split("\n");
  for (const line of lines) {
    const colonIndex = line.indexOf(":");
    if (colonIndex === -1) continue;
    const key = line.slice(0, colonIndex).trim();
    let value = line.slice(colonIndex + 1).trim();
    if (typeof value === "string" && value.startsWith("[") && value.endsWith("]")) {
      value = value.slice(1, -1).split(",").map((s) => s.trim().replace(/^["']|["']$/g, ""));
    } else if (value === "true") {
      value = true;
    } else if (value === "false") {
      value = false;
    } else if (typeof value === "string" && (value.startsWith('"') && value.endsWith('"') || value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    frontmatter[key] = value;
  }
  return { frontmatter, content };
}
function transformContent(content, basePath = "/blog", imageAssetBasePath, postSlug) {
  let transformed = content;
  transformed = transformEmbeds(transformed, imageAssetBasePath, postSlug);
  transformed = transformWikiLinks(transformed, basePath);
  transformed = transformCallouts(transformed);
  return transformed;
}
function getTitle(frontmatter, filename) {
  if (frontmatter.title && typeof frontmatter.title === "string") {
    return frontmatter.title;
  }
  return filename.replace(/\.md$/, "").replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// src/services/sync.ts
var SyncService = class {
  constructor(app, settings) {
    this.app = app;
    this.settings = settings;
    this.github = new GitHubService({
      token: settings.githubToken,
      owner: settings.githubOwner,
      repo: settings.githubRepo,
      branch: settings.branch
    });
  }
  /**
   * Update settings (e.g., when user changes them)
   */
  updateSettings(settings) {
    this.settings = settings;
    this.github = new GitHubService({
      token: settings.githubToken,
      owner: settings.githubOwner,
      repo: settings.githubRepo,
      branch: settings.branch
    });
  }
  /**
   * Get all notes that are eligible for publishing
   * (notes in source folder with publish: true frontmatter)
   */
  async getPublishableNotes() {
    const sourceFolder = this.settings.sourceFolder;
    const notes = [];
    const files = this.app.vault.getMarkdownFiles().filter((file) => {
      return file.path.startsWith(sourceFolder + "/") || file.path === sourceFolder;
    });
    for (const file of files) {
      const note = await this.fileToSyncableNote(file);
      if (note && note.frontmatter.publish === true) {
        notes.push(note);
      }
    }
    return notes;
  }
  /**
   * Convert a TFile to a SyncableNote with computed status
   */
  async fileToSyncableNote(file) {
    try {
      const rawContent = await this.app.vault.read(file);
      const { frontmatter, content } = extractFrontmatter(rawContent);
      const filename = file.basename;
      const slug = generateSlug(frontmatter.title || filename);
      const title = getTitle(frontmatter, filename);
      const transformedContent = transformContent(content, "/blog", "assets", slug);
      const fullContent = this.buildFinalContent(
        frontmatter,
        transformedContent,
        title
      );
      const contentHash = await computeContentHash(fullContent);
      const syncStatus = this.computeSyncStatus(file.path, contentHash, slug);
      return {
        path: file.path,
        title,
        slug,
        frontmatter,
        content: transformedContent,
        contentHash,
        syncStatus
      };
    } catch (error) {
      console.error(`Error processing file ${file.path}:`, error);
      return null;
    }
  }
  /**
   * Build the final content that will be pushed to GitHub
   */
  buildFinalContent(frontmatter, content, title) {
    const fmLines = ["---"];
    const titleToUse = frontmatter.title || title;
    fmLines.push(`title: "${titleToUse}"`);
    if (frontmatter.date) {
      fmLines.push(`date: "${frontmatter.date}"`);
    }
    if (frontmatter.tags && frontmatter.tags.length > 0) {
      fmLines.push(`tags: [${frontmatter.tags.map((t) => `"${t}"`).join(", ")}]`);
    }
    if (frontmatter.draft !== void 0) {
      fmLines.push(`draft: ${frontmatter.draft}`);
    }
    fmLines.push("---");
    fmLines.push("");
    return fmLines.join("\n") + content;
  }
  extractEmbeddedImageLinkpaths(markdown) {
    const codeBlockRegex = /```[\s\S]*?```|`[^`]+`/g;
    const codeBlocks = [];
    const contentWithPlaceholders = markdown.replace(codeBlockRegex, (match2) => {
      codeBlocks.push(match2);
      return `__CODE_BLOCK_${codeBlocks.length - 1}__`;
    });
    const embedRegex = /!\[\[([^\]]+)\]\]/g;
    const imageExtensions = /\.(png|jpg|jpeg|gif|svg|webp|bmp)$/i;
    const linkpaths = [];
    let match;
    while ((match = embedRegex.exec(contentWithPlaceholders)) !== null) {
      const rawLinkpath = match[1].split("|")[0].trim();
      if (imageExtensions.test(rawLinkpath)) {
        linkpaths.push(rawLinkpath);
      }
    }
    return Array.from(new Set(linkpaths));
  }
  /**
   * Compute sync status by comparing local content hash with persisted state
   */
  computeSyncStatus(path, contentHash, currentSlug) {
    const persisted = this.settings.syncedNotes[path];
    if (!persisted) {
      return { state: "not-synced" };
    }
    const slugChanged = persisted.slug && persisted.slug !== currentSlug;
    if (persisted.contentHash === contentHash && !slugChanged) {
      return {
        state: "synced",
        lastSync: new Date(persisted.lastSync),
        remoteSha: persisted.remoteSha
      };
    }
    return {
      state: "changed",
      lastSync: new Date(persisted.lastSync),
      remoteSha: persisted.remoteSha
    };
  }
  /**
     * Validate a note before syncing
     */
  validateNote(note) {
    const warnings = [];
    const errors = [];
    if (!note.frontmatter.title && !note.title) {
      errors.push(`"${note.path}": Missing title (required for blog)`);
    }
    if (!note.frontmatter.date) {
      warnings.push(`"${note.path}": Missing date`);
    }
    return {
      valid: errors.length === 0,
      warnings,
      errors
    };
  }
  /**
   * Sync all publishable notes to GitHub.
   * Uses atomic Git Tree API - one commit replaces entire folder.
   * Remote folder will contain EXACTLY the local publishable notes.
   */
  async sync() {
    console.log("[Sync] Starting atomic sync...");
    const localNotes = await this.getPublishableNotes();
    console.log("[Sync] Found", localNotes.length, "publishable notes");
    if (localNotes.length === 0) {
      console.log("[Sync] No notes to sync");
      return { synced: 0, failed: 0, results: [], warnings: [] };
    }
    const allWarnings = [];
    const validNotes = [];
    const results = [];
    for (const note of localNotes) {
      const validation = this.validateNote(note);
      allWarnings.push(...validation.warnings);
      if (!validation.valid) {
        for (const error of validation.errors) {
          console.error("[Sync] Validation error:", error);
        }
        note.syncStatus = { state: "error", message: validation.errors.join(", ") };
        results.push({ success: false, note, error: validation.errors.join(", ") });
      } else {
        validNotes.push(note);
      }
    }
    if (validNotes.length === 0) {
      console.log("[Sync] No valid notes to sync");
      return { synced: 0, failed: results.length, results, warnings: allWarnings };
    }
    const files = [];
    for (const note of validNotes) {
      try {
        const finalContent = this.buildFinalContent(note.frontmatter, note.content, note.title);
        files.push({
          path: `${note.slug}.md`,
          content: finalContent
        });
        const assets = await this.collectEmbeddedAssets(note);
        for (const asset of assets) {
          files.push({
            path: `assets/${note.slug}/${asset.name}`,
            content: asset.content
          });
        }
        results.push({ success: true, note });
      } catch (error) {
        console.error("[Sync] Failed to process note:", note.path, error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        note.syncStatus = { state: "error", message: errorMessage };
        results.push({ success: false, note, error: errorMessage });
      }
    }
    const successfulNotes = results.filter((r) => r.success);
    const failedNotes = results.filter((r) => !r.success);
    if (successfulNotes.length === 0) {
      console.log("[Sync] All notes failed to process");
      return { synced: 0, failed: failedNotes.length, results, warnings: allWarnings };
    }
    const message = `Sync: ${successfulNotes.length} posts`;
    try {
      console.log("[Sync] Pushing", files.length, "files atomically...");
      const { commitSha } = await this.github.atomicSync(
        this.settings.targetPath,
        files,
        message
      );
      console.log("[Sync] Commit created:", commitSha);
      const now = (/* @__PURE__ */ new Date()).toISOString();
      for (const result of successfulNotes) {
        const note = result.note;
        this.settings.syncedNotes[note.path] = {
          remoteSha: commitSha,
          contentHash: note.contentHash,
          lastSync: now,
          slug: note.slug
        };
        note.syncStatus = {
          state: "synced",
          lastSync: /* @__PURE__ */ new Date(),
          remoteSha: commitSha
        };
      }
      const validPaths = new Set(localNotes.map((n) => n.path));
      for (const path of Object.keys(this.settings.syncedNotes)) {
        if (!validPaths.has(path)) {
          delete this.settings.syncedNotes[path];
        }
      }
      console.log("[Sync] Complete!");
      return { synced: successfulNotes.length, failed: failedNotes.length, results, warnings: allWarnings };
    } catch (error) {
      console.error("[Sync] Atomic sync failed:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      for (const result of results) {
        if (result.success) {
          result.success = false;
          result.error = errorMessage;
          result.note.syncStatus = { state: "error", message: errorMessage };
        }
      }
      return { synced: 0, failed: results.length, results, warnings: allWarnings };
    }
  }
  /**
   * Collect all embedded image assets for a note
   */
  async collectEmbeddedAssets(note) {
    const sourceFile = this.app.vault.getAbstractFileByPath(note.path);
    if (!(sourceFile instanceof import_obsidian.TFile)) {
      return [];
    }
    const rawMarkdown = await this.app.vault.read(sourceFile);
    const { content } = extractFrontmatter(rawMarkdown);
    const embeddedImages = this.extractEmbeddedImageLinkpaths(content);
    const assets = [];
    for (const linkpath of embeddedImages) {
      const resolved = this.app.metadataCache.getFirstLinkpathDest(linkpath, note.path);
      if (!(resolved instanceof import_obsidian.TFile)) {
        continue;
      }
      const binary = await this.app.vault.readBinary(resolved);
      assets.push({
        name: resolved.name,
        content: binary
      });
    }
    return assets;
  }
  /**
   * Get the persisted sync state (for saving)
   */
  getSyncedNotes() {
    return this.settings.syncedNotes;
  }
  /**
   * Test the GitHub connection
   */
  async testConnection() {
    return this.github.testConnection();
  }
};

// src/ui/settings-tab.ts
var import_obsidian2 = require("obsidian");
var WebsiteSyncSettingTab = class extends import_obsidian2.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "Website Sync Settings" });
    new import_obsidian2.Setting(containerEl).setName("Source folder").setDesc("Folder containing notes to sync (notes must have publish: true in frontmatter)").addText(
      (text) => text.setPlaceholder("publish").setValue(this.plugin.settings.sourceFolder).onChange(async (value) => {
        this.plugin.settings.sourceFolder = value;
        await this.plugin.saveSettings();
      })
    ).addButton(
      (button) => button.setButtonText("Create folder").onClick(async () => {
        const folderPath = this.plugin.settings.sourceFolder;
        if (!folderPath) {
          new import_obsidian2.Notice("Please enter a folder name first.");
          return;
        }
        const folder = this.app.vault.getAbstractFileByPath(folderPath);
        if (folder) {
          new import_obsidian2.Notice(`Folder "${folderPath}" already exists.`);
          return;
        }
        try {
          await this.app.vault.createFolder(folderPath);
          new import_obsidian2.Notice(`Folder "${folderPath}" created successfully.`);
        } catch (error) {
          new import_obsidian2.Notice(`Failed to create folder: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
      })
    );
    new import_obsidian2.Setting(containerEl).setName("GitHub token").setDesc("Personal access token with repo scope").addText(
      (text) => text.setPlaceholder("ghp_xxxx...").setValue(this.plugin.settings.githubToken).onChange(async (value) => {
        this.plugin.settings.githubToken = value;
        await this.plugin.saveSettings();
      })
    ).addButton(
      (button) => button.setButtonText("Test").onClick(async () => {
        const syncService = new SyncService(this.app, this.plugin.settings);
        const success = await syncService.testConnection();
        if (success) {
          new import_obsidian2.Notice("Connection successful!");
        } else {
          new import_obsidian2.Notice("Connection failed. Check your token and repository settings.");
        }
      })
    );
    new import_obsidian2.Setting(containerEl).setName("GitHub owner").setDesc("GitHub username or organization").addText(
      (text) => text.setPlaceholder("username").setValue(this.plugin.settings.githubOwner).onChange(async (value) => {
        this.plugin.settings.githubOwner = value;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian2.Setting(containerEl).setName("GitHub repository").setDesc("Repository name").addText(
      (text) => text.setPlaceholder("my-website").setValue(this.plugin.settings.githubRepo).onChange(async (value) => {
        this.plugin.settings.githubRepo = value;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian2.Setting(containerEl).setName("Branch").setDesc("Git branch to sync to").addText(
      (text) => text.setPlaceholder("main").setValue(this.plugin.settings.branch).onChange(async (value) => {
        this.plugin.settings.branch = value;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian2.Setting(containerEl).setName("Target path").setDesc("Path in repository where posts are stored").addText(
      (text) => text.setPlaceholder("apps/blog/src/content/blog").setValue(this.plugin.settings.targetPath).onChange(async (value) => {
        this.plugin.settings.targetPath = value;
        await this.plugin.saveSettings();
      })
    );
    containerEl.createEl("h3", { text: "Sync Status" });
    const syncedCount = Object.keys(this.plugin.settings.syncedNotes).length;
    new import_obsidian2.Setting(containerEl).setName("Synced notes").setDesc(`${syncedCount} notes are currently synced`).addButton(
      (button) => button.setButtonText("Clear sync state").onClick(async () => {
        this.plugin.settings.syncedNotes = {};
        await this.plugin.saveSettings();
        new import_obsidian2.Notice("Sync state cleared. All notes will be treated as new.");
        this.display();
      })
    );
  }
};

// src/ui/sync-view.ts
var import_obsidian3 = require("obsidian");
var SYNC_VIEW_TYPE = "website-sync-view";
var SyncStatusView = class extends import_obsidian3.ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.notes = [];
    this.isLoading = false;
    this.plugin = plugin;
  }
  getViewType() {
    return SYNC_VIEW_TYPE;
  }
  getDisplayText() {
    return "Website Sync";
  }
  getIcon() {
    return "upload-cloud";
  }
  async onOpen() {
    await this.refresh();
  }
  async onClose() {
  }
  async refresh() {
    if (!this.plugin.syncService) {
      this.renderError("Sync service not initialized");
      return;
    }
    this.isLoading = true;
    this.renderLoading();
    try {
      this.notes = await this.plugin.syncService.getPublishableNotes();
      this.render();
    } catch (error) {
      this.renderError(
        error instanceof Error ? error.message : "Failed to load notes"
      );
    } finally {
      this.isLoading = false;
    }
  }
  render() {
    const container = this.containerEl.children[1];
    container.empty();
    const content = container.createEl("div", { cls: "sync-view-container" });
    this.renderHeader(content);
    if (this.notes.length === 0) {
      this.renderEmptyState(content);
    } else {
      this.renderNotesList(content);
    }
    this.addStyles();
  }
  renderHeader(container) {
    const header = container.createEl("div", { cls: "sync-view-header" });
    const title = header.createEl("h4", { text: "Website Sync" });
    title.style.margin = "0";
    const actions = header.createEl("div", { cls: "sync-view-actions" });
    const refreshBtn = actions.createEl("button", {
      cls: "sync-view-btn",
      attr: { "aria-label": "Refresh" }
    });
    (0, import_obsidian3.setIcon)(refreshBtn, "refresh-cw");
    refreshBtn.addEventListener("click", () => this.refresh());
    const syncBtn = actions.createEl("button", {
      cls: "sync-view-btn sync-view-btn-primary",
      text: "Sync"
    });
    syncBtn.addEventListener("click", () => this.sync());
  }
  renderEmptyState(container) {
    const empty = container.createEl("div", { cls: "sync-view-empty" });
    empty.createEl("p", {
      text: `No publishable notes found in "${this.plugin.settings.sourceFolder}" folder.`
    });
    empty.createEl("p", {
      text: `Add "publish: true" to a note's frontmatter to sync it.`,
      cls: "sync-view-hint"
    });
  }
  renderNotesList(container) {
    const list = container.createEl("div", { cls: "sync-view-list" });
    const synced = this.notes.filter((n) => n.syncStatus.state === "synced");
    const changed = this.notes.filter((n) => n.syncStatus.state === "changed");
    const notSynced = this.notes.filter((n) => n.syncStatus.state === "not-synced");
    const errors = this.notes.filter((n) => n.syncStatus.state === "error");
    if (errors.length > 0) {
      this.renderSection(list, "Errors", errors, "error");
    }
    if (notSynced.length > 0) {
      this.renderSection(list, "Not Synced", notSynced, "not-synced");
    }
    if (changed.length > 0) {
      this.renderSection(list, "Changed", changed, "changed");
    }
    if (synced.length > 0) {
      this.renderSection(list, "Synced", synced, "synced");
    }
  }
  renderSection(container, title, notes, statusClass) {
    const section = container.createEl("div", { cls: "sync-view-section" });
    const header = section.createEl("div", { cls: "sync-view-section-header" });
    header.createEl("span", { text: title });
    header.createEl("span", {
      text: `(${notes.length})`,
      cls: "sync-view-count"
    });
    for (const note of notes) {
      this.renderNoteItem(section, note, statusClass);
    }
  }
  renderNoteItem(container, note, statusClass) {
    const item = container.createEl("div", {
      cls: `sync-view-item sync-view-item-${statusClass}`
    });
    const indicator = item.createEl("span", {
      cls: `sync-view-indicator sync-view-indicator-${statusClass}`
    });
    indicator.textContent = this.getStatusIcon(note.syncStatus);
    const info = item.createEl("div", { cls: "sync-view-item-info" });
    const titleEl = info.createEl("div", {
      cls: "sync-view-item-title",
      text: note.title
    });
    titleEl.addEventListener("click", () => this.openNote(note));
    info.createEl("div", {
      cls: "sync-view-item-path",
      text: note.path
    });
    info.createEl("div", {
      cls: "sync-view-item-status",
      text: this.getStatusText(note.syncStatus)
    });
  }
  getStatusIcon(status) {
    switch (status.state) {
      case "synced":
        return "\u25CF";
      case "changed":
        return "\u25D0";
      case "not-synced":
        return "\u25CB";
      case "error":
        return "\u2715";
    }
  }
  getStatusText(status) {
    switch (status.state) {
      case "synced":
        return `Last sync: ${this.formatDate(status.lastSync)}`;
      case "changed":
        return "Local changes detected";
      case "not-synced":
        return "Not published yet";
      case "error":
        return `Error: ${status.message}`;
    }
  }
  formatDate(date) {
    const now = /* @__PURE__ */ new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 6e4);
    const hours = Math.floor(diff / 36e5);
    const days = Math.floor(diff / 864e5);
    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  }
  renderLoading() {
    const container = this.containerEl.children[1];
    container.empty();
    container.createEl("div", {
      cls: "sync-view-loading",
      text: "Loading notes..."
    });
  }
  renderError(message) {
    const container = this.containerEl.children[1];
    container.empty();
    const error = container.createEl("div", { cls: "sync-view-error" });
    error.createEl("p", { text: message });
  }
  async openNote(note) {
    const file = this.app.vault.getAbstractFileByPath(note.path);
    if (file) {
      await this.app.workspace.getLeaf().openFile(file);
    }
  }
  /**
   * Sync all notes atomically.
   * Remote folder will contain EXACTLY these notes after sync.
   */
  async sync() {
    if (!this.plugin.syncService) return;
    this.isLoading = true;
    this.renderSyncingState();
    try {
      const result = await this.plugin.syncService.sync();
      this.plugin.settings.syncedNotes = this.plugin.syncService.getSyncedNotes();
      await this.plugin.saveSettings();
      if (result.warnings.length > 0) {
        console.warn("[Sync] Warnings:", result.warnings);
      }
      console.log(
        `[Sync] Complete: ${result.synced} synced, ${result.failed} failed`
      );
      if (result.failed > 0) {
        const failedNotes = result.results.filter((r) => !r.success);
        const errorMessages = failedNotes.map((r) => r.error).join("\n");
        this.renderSyncResult(
          `Sync failed for ${result.failed} note(s)`,
          errorMessages,
          "error"
        );
        return;
      }
      await this.refresh();
    } catch (error) {
      console.error("Sync error:", error);
      this.renderError(error instanceof Error ? error.message : "Sync failed");
    }
  }
  renderSyncResult(title, details, type) {
    const container = this.containerEl.children[1];
    container.empty();
    const resultEl = container.createEl("div", { cls: `sync-view-${type}` });
    resultEl.createEl("p", { text: title });
    if (details) {
      const detailsEl = resultEl.createEl("pre", { cls: "sync-view-details" });
      detailsEl.textContent = details;
    }
    const retryBtn = resultEl.createEl("button", {
      cls: "sync-view-btn",
      text: "Back to list"
    });
    retryBtn.addEventListener("click", () => this.refresh());
  }
  renderSyncingState() {
    const container = this.containerEl.children[1];
    container.empty();
    const syncingEl = container.createEl("div", { cls: "sync-view-loading" });
    syncingEl.createEl("div", { text: `Syncing ${this.notes.length} notes...` });
    syncingEl.createEl("div", {
      text: "Creating atomic commit...",
      cls: "sync-view-hint"
    });
  }
  addStyles() {
    const styleId = "sync-view-styles";
    if (document.getElementById(styleId)) return;
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      .sync-view-container {
        padding: 10px;
      }
      
      .sync-view-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 15px;
        padding-bottom: 10px;
        border-bottom: 1px solid var(--background-modifier-border);
      }
      
      .sync-view-actions {
        display: flex;
        gap: 5px;
      }
      
      .sync-view-btn {
        padding: 5px 10px;
        border-radius: 4px;
        border: 1px solid var(--background-modifier-border);
        background: var(--background-secondary);
        cursor: pointer;
        font-size: 12px;
      }
      
      .sync-view-btn:hover {
        background: var(--background-modifier-hover);
      }
      
      .sync-view-btn-primary {
        background: var(--interactive-accent);
        color: var(--text-on-accent);
        border: none;
      }
      
      .sync-view-btn-primary:hover {
        background: var(--interactive-accent-hover);
      }
      
      .sync-view-btn-small {
        padding: 2px 8px;
        font-size: 11px;
      }
      
      .sync-view-empty {
        text-align: center;
        color: var(--text-muted);
        padding: 20px;
      }
      
      .sync-view-hint {
        font-size: 12px;
        opacity: 0.8;
      }
      
      .sync-view-section {
        margin-bottom: 15px;
      }
      
      .sync-view-section-header {
        font-weight: 600;
        margin-bottom: 8px;
        display: flex;
        gap: 5px;
      }
      
      .sync-view-count {
        color: var(--text-muted);
        font-weight: normal;
      }
      
      .sync-view-item {
        display: flex;
        align-items: flex-start;
        padding: 8px;
        margin-bottom: 5px;
        border-radius: 5px;
        background: var(--background-secondary);
      }
      
      .sync-view-indicator {
        font-size: 14px;
        margin-right: 10px;
        margin-top: 2px;
      }
      
      .sync-view-indicator-synced { color: var(--color-green); }
      .sync-view-indicator-changed { color: var(--color-yellow); }
      .sync-view-indicator-not-synced { color: var(--text-muted); }
      .sync-view-indicator-error { color: var(--color-red); }
      
      .sync-view-item-info {
        flex: 1;
        min-width: 0;
      }
      
      .sync-view-item-title {
        font-weight: 500;
        cursor: pointer;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      
      .sync-view-item-title:hover {
        color: var(--text-accent);
      }
      
      .sync-view-item-path {
        font-size: 11px;
        color: var(--text-muted);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      
      .sync-view-item-status {
        font-size: 11px;
        color: var(--text-muted);
      }
      
      .sync-view-loading,
      .sync-view-error,
      .sync-view-warning {
        text-align: center;
        padding: 20px;
        color: var(--text-muted);
      }
      
      .sync-view-error {
        color: var(--text-error);
      }
      
      .sync-view-warning {
        color: var(--color-orange);
      }
      
      .sync-view-details {
        text-align: left;
        font-size: 11px;
        background: var(--background-secondary);
        padding: 10px;
        border-radius: 4px;
        overflow-x: auto;
        white-space: pre-wrap;
        word-break: break-word;
      }
    `;
    document.head.appendChild(style);
  }
};

// src/ui/status-bar.ts
var StatusBarManager = class {
  constructor(plugin, statusBarEl) {
    this.isUpdating = false;
    this.plugin = plugin;
    this.statusBarEl = statusBarEl;
    this.statusBarEl.addClass("mod-clickable");
    this.statusBarEl.addEventListener("click", () => this.openSyncView());
    this.statusBarEl.setAttribute("aria-label", "Open Website Sync panel");
    this.plugin.registerEvent(
      this.plugin.app.workspace.on("active-leaf-change", () => this.update())
    );
    this.update();
  }
  /**
   * Update the status bar with current file's sync status
   */
  async update() {
    if (this.isUpdating) return;
    this.isUpdating = true;
    try {
      if (!this.plugin.syncService) {
        this.statusBarEl.setText("Sync: Not configured");
        return;
      }
      if (!this.plugin.settings.githubToken) {
        this.statusBarEl.setText("Sync: Configure GitHub");
        return;
      }
      const activeFile = this.plugin.app.workspace.getActiveFile();
      if (!activeFile || activeFile.extension !== "md") {
        await this.showOverallStatus();
        return;
      }
      const sourceFolder = this.plugin.settings.sourceFolder;
      if (!activeFile.path.startsWith(sourceFolder + "/") && activeFile.path !== sourceFolder) {
        this.statusBarEl.setText("Sync: Not in publish folder");
        return;
      }
      const note = await this.plugin.syncService.fileToSyncableNote(activeFile);
      if (!note) {
        this.statusBarEl.setText("Sync: Error reading file");
        return;
      }
      if (!note.frontmatter.publish) {
        this.statusBarEl.setText("Sync: Not published");
        return;
      }
      this.renderCurrentFileStatus(note);
    } catch (error) {
      this.statusBarEl.setText("Sync: Error");
    } finally {
      this.isUpdating = false;
    }
  }
  /**
   * Show overall sync status (when not on a publishable file)
   */
  async showOverallStatus() {
    if (!this.plugin.syncService) return;
    const notes = await this.plugin.syncService.getPublishableNotes();
    const counts = this.countByStatus(notes);
    const total = counts.synced + counts.changed + counts.notSynced + counts.error;
    const pending = counts.changed + counts.notSynced;
    if (total === 0) {
      this.statusBarEl.setText("Sync: No posts");
    } else if (pending === 0) {
      this.statusBarEl.setText(`Sync: \u25CF All synced (${total})`);
    } else {
      this.statusBarEl.setText(`Sync: ${pending} pending`);
    }
  }
  /**
   * Render status for the current file
   */
  renderCurrentFileStatus(note) {
    const status = note.syncStatus.state;
    switch (status) {
      case "synced":
        this.statusBarEl.setText("Sync: \u25CF Synced");
        this.statusBarEl.style.color = "var(--color-green)";
        break;
      case "changed":
        this.statusBarEl.setText("Sync: \u25D0 Changed");
        this.statusBarEl.style.color = "var(--color-yellow)";
        break;
      case "not-synced":
        this.statusBarEl.setText("Sync: \u25CB Not synced");
        this.statusBarEl.style.color = "var(--text-muted)";
        break;
      case "error":
        this.statusBarEl.setText(`Sync: \u2715 Error`);
        this.statusBarEl.style.color = "var(--color-red)";
        break;
    }
  }
  countByStatus(notes) {
    const counts = {
      synced: 0,
      changed: 0,
      notSynced: 0,
      error: 0
    };
    for (const note of notes) {
      switch (note.syncStatus.state) {
        case "synced":
          counts.synced++;
          break;
        case "changed":
          counts.changed++;
          break;
        case "not-synced":
          counts.notSynced++;
          break;
        case "error":
          counts.error++;
          break;
      }
    }
    return counts;
  }
  async openSyncView() {
    const { workspace } = this.plugin.app;
    const existing = workspace.getLeavesOfType(SYNC_VIEW_TYPE);
    if (existing.length > 0) {
      workspace.revealLeaf(existing[0]);
      return;
    }
    const leaf = workspace.getRightLeaf(false);
    if (leaf) {
      await leaf.setViewState({
        type: SYNC_VIEW_TYPE,
        active: true
      });
      workspace.revealLeaf(leaf);
    }
  }
  showSyncing() {
    this.statusBarEl.setText("Sync: Syncing...");
    this.statusBarEl.style.color = "";
  }
  destroy() {
    this.statusBarEl.remove();
  }
};

// src/main.ts
var WebsiteSyncPlugin = class extends import_obsidian4.Plugin {
  constructor() {
    super(...arguments);
    this.settings = DEFAULT_SETTINGS;
    this.syncService = null;
    this.statusBarManager = null;
  }
  async onload() {
    console.log("Loading Website Sync plugin");
    await this.loadSettings();
    this.initSyncService();
    this.registerView(SYNC_VIEW_TYPE, (leaf) => new SyncStatusView(leaf, this));
    this.addSettingTab(new WebsiteSyncSettingTab(this.app, this));
    const statusBarEl = this.addStatusBarItem();
    this.statusBarManager = new StatusBarManager(this, statusBarEl);
    this.addRibbonIcon("upload-cloud", "Sync to website", async () => {
      await this.syncNotes();
    });
    this.addCommand({
      id: "sync-notes",
      name: "Sync all publishable notes",
      callback: async () => {
        await this.syncNotes();
      }
    });
    this.addCommand({
      id: "open-sync-view",
      name: "Open sync status panel",
      callback: async () => {
        await this.openSyncView();
      }
    });
    this.addCommand({
      id: "quick-publish",
      name: "Quick Publish: Add frontmatter, move to folder, and sync",
      callback: async () => {
        await this.quickPublish();
      }
    });
    this.registerEvent(
      this.app.workspace.on("file-menu", (menu, file) => {
        if (file instanceof import_obsidian4.TFile && file.extension === "md") {
          menu.addItem((item) => {
            item.setTitle("Quick Publish to Website").setIcon("upload-cloud").onClick(async () => {
              await this.quickPublish(file);
            });
          });
        }
      })
    );
    this.registerEvent(
      this.app.vault.on("modify", () => {
        var _a;
        (_a = this.statusBarManager) == null ? void 0 : _a.update();
      })
    );
  }
  onunload() {
    var _a;
    console.log("Unloading Website Sync plugin");
    (_a = this.statusBarManager) == null ? void 0 : _a.destroy();
  }
  initSyncService() {
    this.syncService = new SyncService(this.app, this.settings);
  }
  async loadSettings() {
    const loadedData = await this.loadData();
    this.settings = Object.assign({}, DEFAULT_SETTINGS, loadedData);
  }
  async saveSettings() {
    await this.saveData(this.settings);
    this.initSyncService();
  }
  /**
   * Sync all publishable notes atomically.
   * One commit replaces entire remote folder.
   */
  async syncNotes() {
    var _a;
    if (!this.syncService) {
      new import_obsidian4.Notice("Sync service not initialized");
      return;
    }
    if (!this.settings.githubToken) {
      new import_obsidian4.Notice("Please configure your GitHub settings first");
      return;
    }
    new import_obsidian4.Notice("Starting sync...");
    try {
      const summary = await this.syncService.sync();
      this.settings.syncedNotes = this.syncService.getSyncedNotes();
      await this.saveSettings();
      (_a = this.statusBarManager) == null ? void 0 : _a.update();
      this.refreshSyncView();
      if (summary.warnings.length > 0) {
        for (const warning of summary.warnings) {
          new import_obsidian4.Notice(`Warning: ${warning}`, 5e3);
        }
      }
      if (summary.failed > 0) {
        const failedNotes = summary.results.filter((r) => !r.success);
        const errorMsg = failedNotes.map((r) => r.error).join(", ");
        new import_obsidian4.Notice(`Sync failed: ${errorMsg}`, 1e4);
      } else if (summary.synced > 0) {
        new import_obsidian4.Notice(`Synced ${summary.synced} notes`);
      } else {
        new import_obsidian4.Notice("No notes to sync");
      }
    } catch (error) {
      console.error("Sync error:", error);
      new import_obsidian4.Notice(`Sync failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }
  refreshSyncView() {
    const leaves = this.app.workspace.getLeavesOfType(SYNC_VIEW_TYPE);
    for (const leaf of leaves) {
      const view = leaf.view;
      if (view instanceof SyncStatusView) {
        view.refresh();
      }
    }
  }
  async openSyncView() {
    const { workspace } = this.app;
    const existing = workspace.getLeavesOfType(SYNC_VIEW_TYPE);
    if (existing.length > 0) {
      workspace.revealLeaf(existing[0]);
      return;
    }
    const leaf = workspace.getRightLeaf(false);
    if (leaf) {
      await leaf.setViewState({
        type: SYNC_VIEW_TYPE,
        active: true
      });
      workspace.revealLeaf(leaf);
    }
  }
  /**
   * Quick Publish: Add frontmatter, move to publish folder, then sync all.
   */
  async quickPublish(file) {
    if (!this.syncService) {
      new import_obsidian4.Notice("Sync service not initialized");
      return;
    }
    if (!this.settings.githubToken) {
      new import_obsidian4.Notice("Please configure your GitHub settings first");
      return;
    }
    const targetFile = file || this.app.workspace.getActiveFile();
    if (!targetFile) {
      new import_obsidian4.Notice("No file selected");
      return;
    }
    if (targetFile.extension !== "md") {
      new import_obsidian4.Notice("Can only publish markdown files");
      return;
    }
    try {
      let content = await this.app.vault.read(targetFile);
      const hasFrontmatter = content.trimStart().startsWith("---");
      const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      const titleFromFilename = targetFile.basename.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      if (!hasFrontmatter) {
        const frontmatter = `---
title: "${titleFromFilename}"
date: "${today}"
publish: true
---

`;
        content = frontmatter + content;
        await this.app.vault.modify(targetFile, content);
        new import_obsidian4.Notice("Added frontmatter");
      } else {
        const frontmatterRegex = /^---\n([\s\S]*?)\n---/;
        const match = content.match(frontmatterRegex);
        if (match) {
          let fm = match[1];
          if (!/^publish:\s*true/m.test(fm)) {
            if (/^publish:/m.test(fm)) {
              fm = fm.replace(/^publish:.*$/m, "publish: true");
            } else {
              fm += "\npublish: true";
            }
          }
          if (!/^date:/m.test(fm)) {
            fm += `
date: "${today}"`;
          }
          if (!/^title:/m.test(fm)) {
            fm = `title: "${titleFromFilename}"
` + fm;
          }
          content = content.replace(frontmatterRegex, `---
${fm}
---`);
          await this.app.vault.modify(targetFile, content);
        }
      }
      const sourceFolder = this.settings.sourceFolder;
      if (!targetFile.path.startsWith(sourceFolder + "/")) {
        const folderExists = this.app.vault.getAbstractFileByPath(sourceFolder);
        if (!folderExists) {
          await this.app.vault.createFolder(sourceFolder);
        }
        const slug = generateSlug(titleFromFilename);
        const newPath = `${sourceFolder}/${slug}.md`;
        if (this.app.vault.getAbstractFileByPath(newPath)) {
          new import_obsidian4.Notice(`File already exists at ${newPath}`);
          return;
        }
        await this.app.fileManager.renameFile(targetFile, newPath);
        new import_obsidian4.Notice(`Moved to ${newPath}`);
      }
      await this.syncNotes();
    } catch (error) {
      console.error("Quick publish error:", error);
      new import_obsidian4.Notice(`Quick publish failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }
};
