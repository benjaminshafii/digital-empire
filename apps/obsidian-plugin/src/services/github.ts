/**
 * GitHub Service
 *
 * Handles all GitHub API interactions for syncing content.
 * Uses the GitHub REST API to create, read, update, and delete files.
 */

import {
  GitHubAuthError,
  GitHubNotFoundError,
  GitHubConflictError,
  type GitHubFileResponse,
  type GitHubCreateUpdateResponse,
  type GitHubTreeItem,
  type GitHubRefResponse,
  type GitHubCommitResponse,
  type GitHubBlobResponse,
  type GitHubTreeResponse,
  type GitHubCreateTreeItem,
  type GitHubCreateCommitResponse,
} from "../types";

export interface GitHubServiceConfig {
  token: string;
  owner: string;
  repo: string;
  branch: string;
}

export interface FileContent {
  content: string;
  sha: string;
}

export class GitHubService {
  private config: GitHubServiceConfig;
  private baseUrl: string;

  constructor(config: GitHubServiceConfig) {
    this.config = config;
    this.baseUrl = `https://api.github.com/repos/${config.owner}/${config.repo}`;
  }

  private encodeGitHubPath(path: string): string {
    return path
      .split("/")
      .map((segment) => encodeURIComponent(segment))
      .join("/");
  }

  private bytesToBase64(bytes: Uint8Array): string {
    // Avoid spreading large arrays into String.fromCharCode
    const chunkSize = 0x8000;
    let binary = "";

    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
    }

    return btoa(binary);
  }

  /**
   * Make an authenticated request to the GitHub API
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = endpoint.startsWith("https://")
      ? endpoint
      : `${this.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.config.token}`,
        Accept: "application/vnd.github.v3+json",
        "Content-Type": "application/json",
        ...options.headers,
      },
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

    // Handle empty responses (like DELETE)
    const text = await response.text();
    if (!text) {
      return {} as T;
    }

    return JSON.parse(text) as T;
  }

  /**
   * Get a file's content and SHA from the repository
   * Returns null if the file doesn't exist
   */
  async getFile(path: string): Promise<FileContent | null> {
    try {
      const response = await this.request<GitHubFileResponse>(
        `/contents/${this.encodeGitHubPath(path)}?ref=${this.config.branch}`
      );

      // Decode base64 content
      const content = atob(response.content.replace(/\n/g, ""));

      return {
        content,
        sha: response.sha,
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
  async getFileSha(path: string): Promise<string | null> {
    try {
      const response = await this.request<GitHubFileResponse>(
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
  async createOrUpdateFile(
    path: string,
    content: string,
    message: string,
    sha?: string
  ): Promise<{ sha: string; commitSha: string }> {
    console.log("[GitHub] createOrUpdateFile called");
    console.log("[GitHub] Path:", path);
    console.log("[GitHub] Message:", message);
    console.log("[GitHub] SHA:", sha || "(none)");
    console.log("[GitHub] Content length:", content.length);

    // Use TextEncoder for proper UTF-8 encoding
    const encoder = new TextEncoder();
    const bytes = encoder.encode(content);
    const base64Content = this.bytesToBase64(bytes);

    const body: Record<string, string> = {
      message,
      content: base64Content,
      branch: this.config.branch,
    };

    if (sha) {
      body.sha = sha;
    }

    console.log("[GitHub] Request body:", { ...body, content: `(${base64Content.length} chars base64)` });

    const response = await this.request<GitHubCreateUpdateResponse>(
      `/contents/${this.encodeGitHubPath(path)}`, 
      {
        method: "PUT",
        body: JSON.stringify(body),
      }
    );

    console.log("[GitHub] Response received:", response);

    return {
      sha: response.content.sha,
      commitSha: response.commit.sha,
    };
  }

  /**
   * Create or update a binary file (e.g., images)
   */
  async createOrUpdateBinaryFile(
    path: string,
    content: ArrayBuffer,
    message: string,
    sha?: string
  ): Promise<{ sha: string; commitSha: string }> {
    const bytes = new Uint8Array(content);
    const base64Content = this.bytesToBase64(bytes);

    const body: Record<string, string> = {
      message,
      content: base64Content,
      branch: this.config.branch,
    };

    if (sha) {
      body.sha = sha;
    }

    const response = await this.request<GitHubCreateUpdateResponse>(
      `/contents/${this.encodeGitHubPath(path)}`,
      {
        method: "PUT",
        body: JSON.stringify(body),
      }
    );

    return {
      sha: response.content.sha,
      commitSha: response.commit.sha,
    };
  }

  /**
   * Delete a file from the repository
   */
  async deleteFile(path: string, sha: string, message: string): Promise<void> {
    await this.request(`/contents/${this.encodeGitHubPath(path)}`, {
      method: "DELETE",
      body: JSON.stringify({
        message,
        sha,
        branch: this.config.branch,
      }),
    });
  }

  /**
   * List files in a directory
   * Returns an empty array if the directory doesn't exist
   */
  async listFiles(path: string): Promise<GitHubTreeItem[]> {
    try {
      const response = await this.request<GitHubTreeItem[]>(
        `/contents/${this.encodeGitHubPath(path)}?ref=${this.config.branch}`
      );

      // Filter to only return files (blobs), not directories (trees)
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
  async listDirectories(path: string): Promise<GitHubTreeItem[]> {
    try {
      const response = await this.request<GitHubTreeItem[]>(
        `/contents/${this.encodeGitHubPath(path)}?ref=${this.config.branch}`
      );

      // Filter to only return directories (trees), not files (blobs)
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
  async testConnection(): Promise<boolean> {
    try {
      await this.request(`/branches/${this.config.branch}`);
      return true;
    } catch {
      return false;
    }
  }

  // ============================================
  // Git Tree API methods for atomic commits
  // ============================================

  /**
   * Get the current branch ref (commit SHA)
   */
  async getBranchRef(): Promise<string> {
    const response = await this.request<GitHubRefResponse>(
      `/git/ref/heads/${this.config.branch}`
    );
    return response.object.sha;
  }

  /**
   * Get a commit's tree SHA
   */
  async getCommitTree(commitSha: string): Promise<string> {
    const response = await this.request<GitHubCommitResponse>(
      `/git/commits/${commitSha}`
    );
    return response.tree.sha;
  }

  /**
   * Create a blob (file content) and return its SHA
   */
  async createBlob(content: string, encoding: "utf-8" | "base64" = "utf-8"): Promise<string> {
    const response = await this.request<GitHubBlobResponse>("/git/blobs", {
      method: "POST",
      body: JSON.stringify({
        content,
        encoding,
      }),
    });
    return response.sha;
  }

  /**
   * Create a blob from binary content
   */
  async createBlobFromBinary(content: ArrayBuffer): Promise<string> {
    const bytes = new Uint8Array(content);
    const base64Content = this.bytesToBase64(bytes);
    return this.createBlob(base64Content, "base64");
  }

  /**
   * Get the full tree for a path (recursive)
   */
  async getTree(treeSha: string, recursive = true): Promise<GitHubTreeItem[]> {
    const response = await this.request<GitHubTreeResponse>(
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
  async createTree(
    baseTreeSha: string,
    items: GitHubCreateTreeItem[],
    pathPrefix?: string
  ): Promise<string> {
    // If we have a path prefix, we need to preserve files outside that prefix
    // by including them in the new tree
    let treeItems = items;

    if (pathPrefix) {
      // Get the current full tree
      const currentTree = await this.getTree(baseTreeSha);
      
      // Keep items that are NOT under the pathPrefix
      const preservedItems: GitHubCreateTreeItem[] = currentTree
        .filter(item => !item.path.startsWith(pathPrefix + "/") && item.path !== pathPrefix)
        .filter(item => item.type === "blob") // Only include files, not directories
        .map(item => ({
          path: item.path,
          mode: "100644" as const,
          type: "blob" as const,
          sha: item.sha,
        }));

      // Combine preserved items with new items
      treeItems = [...preservedItems, ...items];
    }

    const response = await this.request<GitHubTreeResponse>("/git/trees", {
      method: "POST",
      body: JSON.stringify({
        tree: treeItems,
      }),
    });

    return response.sha;
  }

  /**
   * Create a commit
   */
  async createCommit(
    message: string,
    treeSha: string,
    parentSha: string
  ): Promise<string> {
    const response = await this.request<GitHubCreateCommitResponse>("/git/commits", {
      method: "POST",
      body: JSON.stringify({
        message,
        tree: treeSha,
        parents: [parentSha],
      }),
    });
    return response.sha;
  }

  /**
   * Update a branch ref to point to a new commit
   */
  async updateBranchRef(commitSha: string): Promise<void> {
    await this.request(`/git/refs/heads/${this.config.branch}`, {
      method: "PATCH",
      body: JSON.stringify({
        sha: commitSha,
      }),
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
  async atomicSync(
    targetPath: string,
    files: Array<{ path: string; content: string | ArrayBuffer }>,
    message: string
  ): Promise<{ commitSha: string }> {
    console.log("[GitHub] Starting atomic sync...");
    console.log("[GitHub] Target path:", targetPath);
    console.log("[GitHub] Files to sync:", files.length);

    // 1. Get current branch commit SHA
    const currentCommitSha = await this.getBranchRef();
    console.log("[GitHub] Current commit:", currentCommitSha);

    // 2. Get current tree SHA
    const currentTreeSha = await this.getCommitTree(currentCommitSha);
    console.log("[GitHub] Current tree:", currentTreeSha);

    // 3. Create blobs for all files
    const treeItems: GitHubCreateTreeItem[] = [];

    for (const file of files) {
      const fullPath = `${targetPath}/${file.path}`;
      let blobSha: string;

      if (typeof file.content === "string") {
        blobSha = await this.createBlob(file.content);
      } else {
        blobSha = await this.createBlobFromBinary(file.content);
      }

      treeItems.push({
        path: fullPath,
        mode: "100644",
        type: "blob",
        sha: blobSha,
      });

      console.log("[GitHub] Created blob for:", fullPath);
    }

    // 4. Create new tree (replacing everything under targetPath)
    const newTreeSha = await this.createTree(currentTreeSha, treeItems, targetPath);
    console.log("[GitHub] New tree:", newTreeSha);

    // 5. Create commit
    const newCommitSha = await this.createCommit(message, newTreeSha, currentCommitSha);
    console.log("[GitHub] New commit:", newCommitSha);

    // 6. Update branch ref
    await this.updateBranchRef(newCommitSha);
    console.log("[GitHub] Branch updated");

    return { commitSha: newCommitSha };
  }
}
