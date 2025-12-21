import { describe, it, expect } from "vitest";
import {
  generateSlug,
  transformWikiLinks,
  transformEmbeds,
  transformCallouts,
  computeContentHash,
  extractFrontmatter,
  transformContent,
  getTitle,
} from "./transformer";

describe("generateSlug", () => {
  it("converts title to lowercase slug", () => {
    expect(generateSlug("My First Post")).toBe("my-first-post");
  });

  it("replaces spaces with hyphens", () => {
    expect(generateSlug("hello world")).toBe("hello-world");
  });

  it("removes special characters", () => {
    expect(generateSlug("What's New?")).toBe("whats-new");
    expect(generateSlug("Hello! World@2024")).toBe("hello-world2024");
  });

  it("collapses multiple hyphens", () => {
    expect(generateSlug("hello   world")).toBe("hello-world");
    expect(generateSlug("hello---world")).toBe("hello-world");
  });

  it("removes leading and trailing hyphens", () => {
    expect(generateSlug("  hello world  ")).toBe("hello-world");
    expect(generateSlug("---hello---")).toBe("hello");
  });

  it("handles empty strings", () => {
    expect(generateSlug("")).toBe("");
  });
});

describe("transformWikiLinks", () => {
  it("converts [[Note]] to [Note](/blog/note)", () => {
    const content = "Check out [[My Note]] for more info.";
    const result = transformWikiLinks(content);
    expect(result).toBe("Check out [My Note](/blog/my-note) for more info.");
  });

  it("converts [[Note|Display]] to [Display](/blog/note)", () => {
    const content = "See [[My Note|this article]] for details.";
    const result = transformWikiLinks(content);
    expect(result).toBe("See [this article](/blog/my-note) for details.");
  });

  it("handles multiple wiki-links in one line", () => {
    const content = "See [[Note One]] and [[Note Two]] for more.";
    const result = transformWikiLinks(content);
    expect(result).toBe(
      "See [Note One](/blog/note-one) and [Note Two](/blog/note-two) for more."
    );
  });

  it("preserves code blocks unchanged", () => {
    const content = "```js\nconst x = [[Note]];\n```";
    const result = transformWikiLinks(content);
    expect(result).toBe("```js\nconst x = [[Note]];\n```");
  });

  it("preserves inline code unchanged", () => {
    const content = "Use `[[Note]]` syntax in Obsidian.";
    const result = transformWikiLinks(content);
    expect(result).toBe("Use `[[Note]]` syntax in Obsidian.");
  });

  it("uses custom base path", () => {
    const content = "Check [[My Note]]";
    const result = transformWikiLinks(content, "/posts");
    expect(result).toBe("Check [My Note](/posts/my-note)");
  });
});

describe("transformEmbeds", () => {
  it("removes note embeds ![[Note]]", () => {
    const content = "Some text\n![[Embedded Note]]\nMore text";
    const result = transformEmbeds(content);
    expect(result).toBe("Some text\n\nMore text");
  });

  it("converts image embeds to markdown images", () => {
    const content = "Here's an image: ![[screenshot.png]]";
    const result = transformEmbeds(content);
    expect(result).toBe("Here's an image: ![screenshot](screenshot.png)");
  });

  it("encodes spaces in image filenames", () => {
    const content = "![[Pasted image 20251211164820.png]]";
    const result = transformEmbeds(content);
    expect(result).toBe("![Pasted image 20251211164820](Pasted%20image%2020251211164820.png)");
  });

  it("ignores Obsidian image embed options", () => {
    expect(transformEmbeds("![[photo.png|300]]")).toBe("![photo](photo.png)");
  });

  it("handles various image extensions", () => {
    expect(transformEmbeds("![[photo.jpg]]")).toBe("![photo](photo.jpg)");
    expect(transformEmbeds("![[photo.jpeg]]")).toBe("![photo](photo.jpeg)");
    expect(transformEmbeds("![[icon.svg]]")).toBe("![icon](icon.svg)");
    expect(transformEmbeds("![[animation.gif]]")).toBe(
      "![animation](animation.gif)"
    );
    expect(transformEmbeds("![[photo.webp]]")).toBe("![photo](photo.webp)");
  });

  it("preserves code blocks unchanged", () => {
    const content = "```md\n![[Note]]\n```";
    const result = transformEmbeds(content);
    expect(result).toBe("```md\n![[Note]]\n```");
  });
});

describe("transformCallouts", () => {
  it("converts > [!note] to blockquote with title line", () => {
    const content = "> [!note] Important\n> This is a note.";
    const result = transformCallouts(content);
    expect(result).toBe("> **Note: Important**\n> This is a note.");
  });

  it("converts > [!note] without title", () => {
    const content = "> [!note]\n> This is a note.";
    const result = transformCallouts(content);
    expect(result).toBe("> **Note**\n> This is a note.");
  });

  it("preserves callout content and title", () => {
    const content = "> [!warning] Be careful!\n> Don't do this.";
    const result = transformCallouts(content);
    expect(result).toBe("> **Warning: Be careful!**\n> Don't do this.");
  });

  it("handles various callout types", () => {
    expect(transformCallouts("> [!info]")).toBe("> **Info**");
    expect(transformCallouts("> [!tip]")).toBe("> **Tip**");
    expect(transformCallouts("> [!danger]")).toBe("> **Danger**");
  });
});

describe("computeContentHash", () => {
  it("returns consistent hash for same content", async () => {
    const hash1 = await computeContentHash("Hello, World!");
    const hash2 = await computeContentHash("Hello, World!");
    expect(hash1).toBe(hash2);
  });

  it("returns different hash for different content", async () => {
    const hash1 = await computeContentHash("Hello, World!");
    const hash2 = await computeContentHash("Hello, Universe!");
    expect(hash1).not.toBe(hash2);
  });

  it("returns 64-character hex string", async () => {
    const hash = await computeContentHash("test");
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });
});

describe("extractFrontmatter", () => {
  it("extracts frontmatter from markdown", () => {
    const markdown = `---
title: My Post
date: 2024-01-01
---

# Content here`;
    const { frontmatter, content } = extractFrontmatter(markdown);
    expect(frontmatter.title).toBe("My Post");
    expect(frontmatter.date).toBe("2024-01-01");
    expect(content.trim()).toBe("# Content here");
  });

  it("returns empty frontmatter when none exists", () => {
    const markdown = "# Just content";
    const { frontmatter, content } = extractFrontmatter(markdown);
    expect(frontmatter).toEqual({});
    expect(content).toBe("# Just content");
  });

  it("handles boolean values", () => {
    const markdown = `---
publish: true
draft: false
---
content`;
    const { frontmatter } = extractFrontmatter(markdown);
    expect(frontmatter.publish).toBe(true);
    expect(frontmatter.draft).toBe(false);
  });

  it("handles array values", () => {
    const markdown = `---
tags: [tech, programming, web]
---
content`;
    const { frontmatter } = extractFrontmatter(markdown);
    expect(frontmatter.tags).toEqual(["tech", "programming", "web"]);
  });

  it("handles quoted strings", () => {
    const markdown = `---
title: "My Post: A Story"
---
content`;
    const { frontmatter } = extractFrontmatter(markdown);
    expect(frontmatter.title).toBe("My Post: A Story");
  });
});

describe("transformContent", () => {
  it("transforms all Obsidian syntax", () => {
    const content = `Check [[My Note]] for details.

![[embedded.md]]

![[Pasted image 20251211164820.png]]

> [!note] Important
> Remember this.`;

    const result = transformContent(content);

    expect(result).toContain("[My Note](/blog/my-note)");
    expect(result).not.toContain("![[embedded.md]]");
    expect(result).toContain(
      "![Pasted image 20251211164820](Pasted%20image%2020251211164820.png)"
    );
    expect(result).toContain("**Note: Important**");
  });
});

describe("getTitle", () => {
  it("returns title from frontmatter", () => {
    expect(getTitle({ title: "My Custom Title" }, "some-file.md")).toBe(
      "My Custom Title"
    );
  });

  it("derives title from filename when no frontmatter title", () => {
    expect(getTitle({}, "my-first-post.md")).toBe("My First Post");
  });

  it("handles filenames without hyphens", () => {
    expect(getTitle({}, "post.md")).toBe("Post");
  });
});
