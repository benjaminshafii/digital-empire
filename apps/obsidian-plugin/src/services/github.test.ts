import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GitHubService } from "./github";
import {
  GitHubAuthError,
  GitHubNotFoundError,
  GitHubConflictError,
} from "../types";

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("GitHubService", () => {
  let service: GitHubService;

  beforeEach(() => {
    service = new GitHubService({
      token: "test-token",
      owner: "testowner",
      repo: "testrepo",
      branch: "main",
    });
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("getFile", () => {
    it("returns file content and sha when file exists", async () => {
      const mockResponse = {
        sha: "abc123",
        content: btoa("Hello, World!"), // Base64 encode
        encoding: "base64",
        name: "test.md",
        path: "test.md",
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify(mockResponse)),
      });

      const result = await service.getFile("test.md");

      expect(result).not.toBeNull();
      expect(result?.content).toBe("Hello, World!");
      expect(result?.sha).toBe("abc123");
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.github.com/repos/testowner/testrepo/contents/test.md?ref=main",
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer test-token",
          }),
        })
      );
    });

    it("returns null when file does not exist", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: () => Promise.resolve("Not found"),
      });

      const result = await service.getFile("nonexistent.md");

      expect(result).toBeNull();
    });

    it("throws GitHubAuthError on 401", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: () => Promise.resolve("Unauthorized"),
      });

      await expect(service.getFile("test.md")).rejects.toThrow(GitHubAuthError);
    });
  });

  describe("createOrUpdateFile", () => {
    it("creates new file when sha is not provided", async () => {
      const mockResponse = {
        content: { sha: "newsha123", path: "newfile.md" },
        commit: { sha: "commitsha456" },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        text: () => Promise.resolve(JSON.stringify(mockResponse)),
      });

      const result = await service.createOrUpdateFile(
        "newfile.md",
        "# New Content",
        "Add new file"
      );

      expect(result.sha).toBe("newsha123");
      expect(result.commitSha).toBe("commitsha456");

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.message).toBe("Add new file");
      expect(body.content).toBe(btoa("# New Content"));
      expect(body.sha).toBeUndefined();
    });

    it("updates existing file when sha is provided", async () => {
      const mockResponse = {
        content: { sha: "updatedsha", path: "existing.md" },
        commit: { sha: "commitsha789" },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify(mockResponse)),
      });

      const result = await service.createOrUpdateFile(
        "existing.md",
        "# Updated Content",
        "Update file",
        "oldsha123"
      );

      expect(result.sha).toBe("updatedsha");

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.sha).toBe("oldsha123");
    });

    it("throws GitHubConflictError on 409", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 409,
        text: () => Promise.resolve("Conflict"),
      });

      await expect(
        service.createOrUpdateFile("test.md", "content", "message", "wrongsha")
      ).rejects.toThrow(GitHubConflictError);
    });
  });

  describe("deleteFile", () => {
    it("deletes file with correct sha", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(""),
      });

      await service.deleteFile("todelete.md", "sha123", "Delete file");

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.github.com/repos/testowner/testrepo/contents/todelete.md",
        expect.objectContaining({
          method: "DELETE",
        })
      );

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.sha).toBe("sha123");
      expect(body.message).toBe("Delete file");
    });

    it("throws GitHubNotFoundError when file does not exist", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: () => Promise.resolve("Not found"),
      });

      await expect(
        service.deleteFile("nonexistent.md", "sha123", "Delete")
      ).rejects.toThrow(GitHubNotFoundError);
    });
  });

  describe("listFiles", () => {
    it("returns list of files in directory", async () => {
      const mockResponse = [
        { path: "blog/post1.md", type: "blob", sha: "sha1" },
        { path: "blog/post2.md", type: "blob", sha: "sha2" },
        { path: "blog/images", type: "tree", sha: "sha3" },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify(mockResponse)),
      });

      const result = await service.listFiles("blog");

      // Should only return blobs, not trees
      expect(result).toHaveLength(2);
      expect(result[0].path).toBe("blog/post1.md");
      expect(result[1].path).toBe("blog/post2.md");
    });

    it("returns empty array for empty/nonexistent directory", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: () => Promise.resolve("Not found"),
      });

      const result = await service.listFiles("empty");

      expect(result).toEqual([]);
    });
  });

  describe("testConnection", () => {
    it("returns true when connection is successful", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify({ name: "main" })),
      });

      const result = await service.testConnection();

      expect(result).toBe(true);
    });

    it("returns false when connection fails", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: () => Promise.resolve("Unauthorized"),
      });

      const result = await service.testConnection();

      expect(result).toBe(false);
    });
  });

  // ============================================
  // Git Tree API Tests
  // ============================================

  describe("getBranchRef", () => {
    it("returns the commit SHA for the branch", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify({
          ref: "refs/heads/main",
          object: { sha: "abc123commit", type: "commit" },
        })),
      });

      const result = await service.getBranchRef();

      expect(result).toBe("abc123commit");
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.github.com/repos/testowner/testrepo/git/ref/heads/main",
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer test-token",
          }),
        })
      );
    });
  });

  describe("getCommitTree", () => {
    it("returns the tree SHA for a commit", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify({
          sha: "abc123commit",
          tree: { sha: "tree456sha" },
        })),
      });

      const result = await service.getCommitTree("abc123commit");

      expect(result).toBe("tree456sha");
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.github.com/repos/testowner/testrepo/git/commits/abc123commit",
        expect.anything()
      );
    });
  });

  describe("createBlob", () => {
    it("creates a blob and returns its SHA", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        text: () => Promise.resolve(JSON.stringify({ sha: "blob789sha" })),
      });

      const result = await service.createBlob("Hello, World!");

      expect(result).toBe("blob789sha");
      
      const fetchCall = mockFetch.mock.calls[0];
      expect(fetchCall[0]).toBe("https://api.github.com/repos/testowner/testrepo/git/blobs");
      expect(fetchCall[1].method).toBe("POST");
      
      const body = JSON.parse(fetchCall[1].body);
      expect(body.content).toBe("Hello, World!");
      expect(body.encoding).toBe("utf-8");
    });

    it("creates a base64 encoded blob", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        text: () => Promise.resolve(JSON.stringify({ sha: "blobbase64sha" })),
      });

      const result = await service.createBlob("SGVsbG8=", "base64");

      expect(result).toBe("blobbase64sha");
      
      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.encoding).toBe("base64");
    });
  });

  describe("getTree", () => {
    it("returns tree items recursively", async () => {
      const mockTree = {
        sha: "treesharoot",
        tree: [
          { path: "file1.md", type: "blob", sha: "sha1" },
          { path: "folder", type: "tree", sha: "sha2" },
          { path: "folder/file2.md", type: "blob", sha: "sha3" },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify(mockTree)),
      });

      const result = await service.getTree("treesharoot");

      expect(result).toHaveLength(3);
      expect(result[0].path).toBe("file1.md");
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.github.com/repos/testowner/testrepo/git/trees/treesharoot?recursive=1",
        expect.anything()
      );
    });

    it("returns tree items non-recursively when specified", async () => {
      const mockTree = {
        sha: "treesharoot",
        tree: [{ path: "file1.md", type: "blob", sha: "sha1" }],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify(mockTree)),
      });

      await service.getTree("treesharoot", false);

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.github.com/repos/testowner/testrepo/git/trees/treesharoot",
        expect.anything()
      );
    });
  });

  describe("createTree", () => {
    it("creates a new tree with provided items", async () => {
      // Mock getTree for the base tree (called internally)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify({
          sha: "basetree",
          tree: [
            { path: "other/file.md", type: "blob", sha: "othersah" },
            { path: "blog/old.md", type: "blob", sha: "oldsha" },
          ],
        })),
      });

      // Mock createTree response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        text: () => Promise.resolve(JSON.stringify({ sha: "newtreesha", tree: [] })),
      });

      const items = [
        { path: "blog/new.md", mode: "100644" as const, type: "blob" as const, sha: "newsha" },
      ];

      const result = await service.createTree("basetree", items, "blog");

      expect(result).toBe("newtreesha");

      // Check that the second call (createTree) included preserved items + new items
      const createTreeCall = mockFetch.mock.calls[1];
      expect(createTreeCall[0]).toBe("https://api.github.com/repos/testowner/testrepo/git/trees");
      expect(createTreeCall[1].method).toBe("POST");

      const body = JSON.parse(createTreeCall[1].body);
      // Should have: other/file.md (preserved) + blog/new.md (new)
      expect(body.tree).toHaveLength(2);
      expect(body.tree.some((i: any) => i.path === "other/file.md")).toBe(true);
      expect(body.tree.some((i: any) => i.path === "blog/new.md")).toBe(true);
      // Should NOT have blog/old.md (it's under the pathPrefix and wasn't in new items)
      expect(body.tree.some((i: any) => i.path === "blog/old.md")).toBe(false);
    });

    it("creates tree without pathPrefix (replaces entire tree)", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        text: () => Promise.resolve(JSON.stringify({ sha: "newtreesha", tree: [] })),
      });

      const items = [
        { path: "file.md", mode: "100644" as const, type: "blob" as const, sha: "sha1" },
      ];

      const result = await service.createTree("basetree", items);

      expect(result).toBe("newtreesha");

      // Should only make one call (no getTree needed)
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe("createCommit", () => {
    it("creates a commit with the correct structure", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        text: () => Promise.resolve(JSON.stringify({ sha: "newcommitsha" })),
      });

      const result = await service.createCommit("Sync: 3 posts", "newtreesha", "parentcommitsha");

      expect(result).toBe("newcommitsha");

      const fetchCall = mockFetch.mock.calls[0];
      expect(fetchCall[0]).toBe("https://api.github.com/repos/testowner/testrepo/git/commits");
      expect(fetchCall[1].method).toBe("POST");

      const body = JSON.parse(fetchCall[1].body);
      expect(body.message).toBe("Sync: 3 posts");
      expect(body.tree).toBe("newtreesha");
      expect(body.parents).toEqual(["parentcommitsha"]);
    });
  });

  describe("updateBranchRef", () => {
    it("updates the branch to point to a new commit", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify({ ref: "refs/heads/main" })),
      });

      await service.updateBranchRef("newcommitsha");

      const fetchCall = mockFetch.mock.calls[0];
      expect(fetchCall[0]).toBe("https://api.github.com/repos/testowner/testrepo/git/refs/heads/main");
      expect(fetchCall[1].method).toBe("PATCH");

      const body = JSON.parse(fetchCall[1].body);
      expect(body.sha).toBe("newcommitsha");
    });
  });

  describe("atomicSync", () => {
    it("performs a complete atomic sync in one commit", async () => {
      // 1. getBranchRef
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify({
          ref: "refs/heads/main",
          object: { sha: "currentcommit" },
        })),
      });

      // 2. getCommitTree
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify({
          sha: "currentcommit",
          tree: { sha: "currenttree" },
        })),
      });

      // 3. createBlob for file1
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        text: () => Promise.resolve(JSON.stringify({ sha: "blob1sha" })),
      });

      // 4. createBlob for file2
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        text: () => Promise.resolve(JSON.stringify({ sha: "blob2sha" })),
      });

      // 5. getTree (for createTree with pathPrefix)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify({
          sha: "currenttree",
          tree: [
            { path: "other/preserved.md", type: "blob", sha: "preservedsha" },
            { path: "blog/orphan.md", type: "blob", sha: "orphansha" },
          ],
        })),
      });

      // 6. createTree
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        text: () => Promise.resolve(JSON.stringify({ sha: "newtreesha", tree: [] })),
      });

      // 7. createCommit
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        text: () => Promise.resolve(JSON.stringify({ sha: "newcommitsha" })),
      });

      // 8. updateBranchRef
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify({ ref: "refs/heads/main" })),
      });

      const files = [
        { path: "post1.md", content: "# Post 1" },
        { path: "post2.md", content: "# Post 2" },
      ];

      const result = await service.atomicSync("blog", files, "Sync: 2 posts");

      expect(result.commitSha).toBe("newcommitsha");
      expect(mockFetch).toHaveBeenCalledTimes(8);

      // Verify the final tree creation included new files but excluded orphaned blog/orphan.md
      const createTreeCall = mockFetch.mock.calls[5];
      const treeBody = JSON.parse(createTreeCall[1].body);
      
      // Should have: other/preserved.md + blog/post1.md + blog/post2.md
      expect(treeBody.tree.some((i: any) => i.path === "other/preserved.md")).toBe(true);
      expect(treeBody.tree.some((i: any) => i.path === "blog/post1.md")).toBe(true);
      expect(treeBody.tree.some((i: any) => i.path === "blog/post2.md")).toBe(true);
      // Should NOT have blog/orphan.md
      expect(treeBody.tree.some((i: any) => i.path === "blog/orphan.md")).toBe(false);
    });

    it("handles binary content (images)", async () => {
      // Mock the entire flow but focus on binary blob creation
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify({
          ref: "refs/heads/main",
          object: { sha: "currentcommit" },
        })),
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify({
          sha: "currentcommit",
          tree: { sha: "currenttree" },
        })),
      });

      // createBlob for binary content
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        text: () => Promise.resolve(JSON.stringify({ sha: "imageblobsha" })),
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify({
          sha: "currenttree",
          tree: [],
        })),
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        text: () => Promise.resolve(JSON.stringify({ sha: "newtreesha", tree: [] })),
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        text: () => Promise.resolve(JSON.stringify({ sha: "newcommitsha" })),
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify({ ref: "refs/heads/main" })),
      });

      // Create a simple binary ArrayBuffer
      const binaryContent = new Uint8Array([0x89, 0x50, 0x4E, 0x47]).buffer; // PNG header

      const files = [
        { path: "assets/image.png", content: binaryContent },
      ];

      const result = await service.atomicSync("blog", files, "Sync with image");

      expect(result.commitSha).toBe("newcommitsha");

      // Verify blob was created with base64 encoding
      const blobCall = mockFetch.mock.calls[2];
      const blobBody = JSON.parse(blobCall[1].body);
      expect(blobBody.encoding).toBe("base64");
    });
  });

  describe("listDirectories", () => {
    it("returns only directories (trees)", async () => {
      const mockResponse = [
        { path: "blog/post1.md", type: "blob", sha: "sha1" },
        { path: "blog/assets", type: "tree", sha: "sha2" },
        { path: "blog/images", type: "tree", sha: "sha3" },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify(mockResponse)),
      });

      const result = await service.listDirectories("blog");

      expect(result).toHaveLength(2);
      expect(result[0].path).toBe("blog/assets");
      expect(result[1].path).toBe("blog/images");
    });

    it("returns empty array for nonexistent directory", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: () => Promise.resolve("Not found"),
      });

      const result = await service.listDirectories("nonexistent");

      expect(result).toEqual([]);
    });
  });
});
