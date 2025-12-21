/**
 * Content Transformer
 *
 * Transforms Obsidian-specific markdown syntax to standard markdown
 * suitable for the blog. Handles wiki-links, embeds, callouts, and
 * generates slugs and content hashes.
 */

/**
 * Generate a URL-friendly slug from a title or filename
 */
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // Remove special characters
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-") // Collapse multiple hyphens
    .replace(/^-|-$/g, ""); // Remove leading/trailing hyphens
}

/**
 * Transform Obsidian wiki-links to standard markdown links
 * [[Note]] -> [Note](/blog/note)
 * [[Note|Display Text]] -> [Display Text](/blog/note)
 */
export function transformWikiLinks(
  content: string,
  basePath: string = "/blog"
): string {
  // Match wiki-links but not inside code blocks
  const codeBlockRegex = /```[\s\S]*?```|`[^`]+`/g;
  const codeBlocks: string[] = [];

  // Temporarily replace code blocks with placeholders
  const contentWithPlaceholders = content.replace(codeBlockRegex, (match) => {
    codeBlocks.push(match);
    return `__CODE_BLOCK_${codeBlocks.length - 1}__`;
  });

  // Transform wiki-links: [[Note|Display]] or [[Note]]
  const wikiLinkRegex = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
  const transformed = contentWithPlaceholders.replace(
    wikiLinkRegex,
    (_match, link: string, displayText?: string) => {
      const slug = generateSlug(link);
      const text = displayText || link;
      return `[${text}](${basePath}/${slug})`;
    }
  );

  // Restore code blocks
  return transformed.replace(/__CODE_BLOCK_(\d+)__/g, (_match, index) => {
    return codeBlocks[parseInt(index, 10)];
  });
}

/**
 * Encode a URL/path for Markdown links.
 * - Encodes spaces and other unsafe characters in path segments
 * - Leaves absolute URLs readable
 */
function encodeMarkdownLinkDestination(destination: string): string {
  // Keep absolute URLs intact (encodeURI preserves :// etc)
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(destination)) {
    return encodeURI(destination);
  }

  return destination
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

/**
 * Transform Obsidian embeds
 * ![[Note]] -> removed (note embeds)
 * ![[image.png]] -> ![image](image.png) (image embeds)
 * ![[image.png|300]] -> ![image](image.png) (size/options ignored)
 */
export function transformEmbeds(
  content: string,
  imageAssetBasePath?: string,
  postSlug?: string
): string {
  // Match embeds but not inside code blocks
  const codeBlockRegex = /```[\s\S]*?```|`[^`]+`/g;
  const codeBlocks: string[] = [];

  const contentWithPlaceholders = content.replace(codeBlockRegex, (match) => {
    codeBlocks.push(match);
    return `__CODE_BLOCK_${codeBlocks.length - 1}__`;
  });

  // Image extensions
  const imageExtensions = /\.(png|jpg|jpeg|gif|svg|webp|bmp)$/i;

  // Transform embeds
  const embedRegex = /!\[\[([^\]]+)\]\]/g;
  const transformed = contentWithPlaceholders.replace(
    embedRegex,
    (_match, embed: string) => {
      // Split off Obsidian embed options like "|300" or "|alt"
      const linkpath = embed.split("|")[0].trim();

      // Check if it's an image
      if (imageExtensions.test(linkpath)) {
        const fileName = linkpath.split("/").pop() || linkpath;
        const altText = fileName.replace(/\.[^.]+$/, "");

        const destination =
          imageAssetBasePath && postSlug
            ? `${imageAssetBasePath}/${postSlug}/${fileName}`
            : linkpath;

        return `![${altText}](${encodeMarkdownLinkDestination(destination)})`;
      }

      // Remove note embeds entirely
      return "";
    }
  );

  // Restore code blocks
  return transformed.replace(/__CODE_BLOCK_(\d+)__/g, (_match, index) => {
    return codeBlocks[parseInt(index, 10)];
  });
}

/**
 * Transform Obsidian callouts to blockquotes
 * > [!note] Title
 * > Content
 *
 * Becomes:
 * > **Note: Title**
 * > Content
 */
export function transformCallouts(content: string): string {
  // Match callout syntax - [!type] followed by optional title on same line
  // Using [ \t]* (space/tab only) and [^\r\n]* to ensure we don't cross line boundaries
  const calloutRegex = /^(>\s*)\[!(\w+)\][ \t]*([^\r\n]*)?$/gm;

  return content.replace(
    calloutRegex,
    (_match, prefix: string, type: string, title?: string) => {
      const capitalizedType = type.charAt(0).toUpperCase() + type.slice(1);
      if (title && title.trim()) {
        return `${prefix}**${capitalizedType}: ${title.trim()}**`;
      }
      return `${prefix}**${capitalizedType}**`;
    }
  );
}

/**
 * Compute a SHA-256 hash of content for change detection
 * Returns a hex string
 */
export async function computeContentHash(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Extract frontmatter from markdown content
 * Returns { frontmatter, content } where content has frontmatter removed
 */
export function extractFrontmatter(
  markdown: string
): { frontmatter: Record<string, unknown>; content: string } {
  const frontmatterRegex = /^---\n([\s\S]*?)\n---\n?/;
  const match = markdown.match(frontmatterRegex);

  if (!match) {
    return { frontmatter: {}, content: markdown };
  }

  const frontmatterStr = match[1];
  const content = markdown.slice(match[0].length);

  // Simple YAML parsing (handles basic key: value pairs)
  const frontmatter: Record<string, unknown> = {};
  const lines = frontmatterStr.split("\n");

  for (const line of lines) {
    const colonIndex = line.indexOf(":");
    if (colonIndex === -1) continue;

    const key = line.slice(0, colonIndex).trim();
    let value: unknown = line.slice(colonIndex + 1).trim();

    // Handle arrays (simple case: [item1, item2])
    if (typeof value === "string" && value.startsWith("[") && value.endsWith("]")) {
      value = value
        .slice(1, -1)
        .split(",")
        .map((s) => s.trim().replace(/^["']|["']$/g, ""));
    }
    // Handle booleans
    else if (value === "true") {
      value = true;
    } else if (value === "false") {
      value = false;
    }
    // Handle quoted strings
    else if (
      typeof value === "string" &&
      ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'")))
    ) {
      value = value.slice(1, -1);
    }

    frontmatter[key] = value;
  }

  return { frontmatter, content };
}

/**
 * Transform all Obsidian-specific syntax in content
 */
export function transformContent(
  content: string,
  basePath: string = "/blog",
  imageAssetBasePath?: string,
  postSlug?: string
): string {
  let transformed = content;
  // Handle embeds first so wiki-link replacement doesn't break ![[...]] syntax.
  transformed = transformEmbeds(transformed, imageAssetBasePath, postSlug);
  transformed = transformWikiLinks(transformed, basePath);
  transformed = transformCallouts(transformed);
  return transformed;
}

/**
 * Get title from frontmatter or derive from filename
 */
export function getTitle(
  frontmatter: Record<string, unknown>,
  filename: string
): string {
  if (frontmatter.title && typeof frontmatter.title === "string") {
    return frontmatter.title;
  }
  // Remove .md extension and convert to title case
  return filename
    .replace(/\.md$/, "")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
