/**
 * Cross-platform clipboard utilities for TUI
 * 
 * Supports reading/writing text and images from clipboard on:
 * - macOS (osascript)
 * - Windows/WSL (PowerShell)
 * - Linux (wl-clipboard for Wayland, xclip/xsel for X11)
 */

import { $ } from "bun";
import { platform, release, tmpdir } from "os";
import { join } from "path";
import { existsSync, unlinkSync } from "fs";

export interface ClipboardContent {
  data: string;
  mime: string;
}

/**
 * Read content from clipboard
 * Returns image as base64 if available, otherwise text
 */
export async function readClipboard(): Promise<ClipboardContent | undefined> {
  const os = platform();

  // macOS: Use osascript to read PNGf data from clipboard
  if (os === "darwin") {
    const tmpfile = join(tmpdir(), "openjob-clipboard.png");
    try {
      const result = await $`osascript -e 'set imageData to the clipboard as "PNGf"' -e 'set fileRef to open for access POSIX file "${tmpfile}" with write permission' -e 'set eof fileRef to 0' -e 'write imageData to fileRef' -e 'close access fileRef'`
        .nothrow()
        .quiet();
      
      if (result.exitCode === 0 && existsSync(tmpfile)) {
        const file = Bun.file(tmpfile);
        const buffer = await file.arrayBuffer();
        if (buffer.byteLength > 0) {
          return { data: Buffer.from(buffer).toString("base64"), mime: "image/png" };
        }
      }
    } catch {
      // Image not available, will fall through to text
    } finally {
      try {
        if (existsSync(tmpfile)) unlinkSync(tmpfile);
      } catch {}
    }
  }

  // Windows/WSL: Use PowerShell to get image from clipboard
  if (os === "win32" || release().includes("WSL")) {
    try {
      const script = `
        Add-Type -AssemblyName System.Windows.Forms;
        $img = [System.Windows.Forms.Clipboard]::GetImage();
        if ($img) {
          $ms = New-Object System.IO.MemoryStream;
          $img.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png);
          [System.Convert]::ToBase64String($ms.ToArray())
        }
      `.replace(/\n/g, " ");
      
      const result = await $`powershell.exe -command "${script}"`.nothrow().text();
      if (result) {
        const base64 = result.trim();
        const imageBuffer = Buffer.from(base64, "base64");
        if (imageBuffer.length > 0) {
          return { data: base64, mime: "image/png" };
        }
      }
    } catch {
      // Image not available
    }
  }

  // Linux: Try wl-paste (Wayland) then xclip (X11)
  if (os === "linux") {
    // Try Wayland first
    try {
      const wayland = await $`wl-paste -t image/png`.nothrow().arrayBuffer();
      if (wayland && wayland.byteLength > 0) {
        return { data: Buffer.from(wayland).toString("base64"), mime: "image/png" };
      }
    } catch {}

    // Try X11 xclip
    try {
      const x11 = await $`xclip -selection clipboard -t image/png -o`.nothrow().arrayBuffer();
      if (x11 && x11.byteLength > 0) {
        return { data: Buffer.from(x11).toString("base64"), mime: "image/png" };
      }
    } catch {}
  }

  // Fallback to text clipboard
  return readTextClipboard();
}

/**
 * Read text-only from clipboard
 */
export async function readTextClipboard(): Promise<ClipboardContent | undefined> {
  const os = platform();

  try {
    if (os === "darwin") {
      const text = await $`pbpaste`.nothrow().text();
      if (text) return { data: text, mime: "text/plain" };
    }

    if (os === "win32" || release().includes("WSL")) {
      const text = await $`powershell.exe -command "Get-Clipboard"`.nothrow().text();
      if (text) return { data: text.trim(), mime: "text/plain" };
    }

    if (os === "linux") {
      // Try Wayland
      if (process.env["WAYLAND_DISPLAY"]) {
        const text = await $`wl-paste`.nothrow().text();
        if (text) return { data: text, mime: "text/plain" };
      }
      // Try X11
      const text = await $`xclip -selection clipboard -o`.nothrow().text();
      if (text) return { data: text, mime: "text/plain" };
    }
  } catch {}

  return undefined;
}

/**
 * Write text to clipboard
 */
export async function writeClipboard(text: string): Promise<boolean> {
  const os = platform();

  try {
    if (os === "darwin") {
      const proc = Bun.spawn(["pbcopy"], { stdin: "pipe" });
      proc.stdin.write(text);
      proc.stdin.end();
      await proc.exited;
      return true;
    }

    if (os === "win32") {
      const escaped = text.replace(/"/g, '""');
      await $`powershell -command "Set-Clipboard -Value \"${escaped}\""`.nothrow().quiet();
      return true;
    }

    if (os === "linux") {
      // Try Wayland first
      if (process.env["WAYLAND_DISPLAY"] && Bun.which("wl-copy")) {
        const proc = Bun.spawn(["wl-copy"], { stdin: "pipe" });
        proc.stdin.write(text);
        proc.stdin.end();
        await proc.exited;
        return true;
      }
      // Try xclip
      if (Bun.which("xclip")) {
        const proc = Bun.spawn(["xclip", "-selection", "clipboard"], { stdin: "pipe" });
        proc.stdin.write(text);
        proc.stdin.end();
        await proc.exited;
        return true;
      }
      // Try xsel
      if (Bun.which("xsel")) {
        const proc = Bun.spawn(["xsel", "--clipboard", "--input"], { stdin: "pipe" });
        proc.stdin.write(text);
        proc.stdin.end();
        await proc.exited;
        return true;
      }
    }
  } catch {}

  return false;
}

/**
 * Check if clipboard contains an image
 */
export async function hasClipboardImage(): Promise<boolean> {
  const content = await readClipboard();
  return content?.mime.startsWith("image/") ?? false;
}

// Bracketed paste mode escape sequences
export const BRACKETED_PASTE = {
  ENABLE: "\x1b[?2004h",
  DISABLE: "\x1b[?2004l",
  START: "\x1b[200~",
  END: "\x1b[201~",
} as const;

/**
 * Enable bracketed paste mode in terminal
 * When enabled, pasted text is wrapped in escape sequences
 */
export function enableBracketedPaste(): void {
  process.stdout.write(BRACKETED_PASTE.ENABLE);
}

/**
 * Disable bracketed paste mode
 */
export function disableBracketedPaste(): void {
  process.stdout.write(BRACKETED_PASTE.DISABLE);
}

/**
 * Check if a string is a bracketed paste start sequence
 */
export function isBracketedPasteStart(data: string): boolean {
  return data.startsWith(BRACKETED_PASTE.START);
}

/**
 * Check if a string contains bracketed paste end sequence
 */
export function isBracketedPasteEnd(data: string): boolean {
  return data.includes(BRACKETED_PASTE.END);
}

/**
 * Extract pasted content from bracketed paste
 */
export function extractBracketedPaste(data: string): string {
  const startIdx = data.indexOf(BRACKETED_PASTE.START);
  const endIdx = data.indexOf(BRACKETED_PASTE.END);
  
  if (startIdx !== -1 && endIdx !== -1) {
    return data.slice(startIdx + BRACKETED_PASTE.START.length, endIdx);
  }
  
  // If we only have start, return everything after it
  if (startIdx !== -1) {
    return data.slice(startIdx + BRACKETED_PASTE.START.length);
  }
  
  return data;
}
