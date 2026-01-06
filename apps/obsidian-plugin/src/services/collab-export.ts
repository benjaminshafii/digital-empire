function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function formatTimestampForPath(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = pad2(date.getMonth() + 1);
  const dd = pad2(date.getDate());
  const hh = pad2(date.getHours());
  const min = pad2(date.getMinutes());
  const ss = pad2(date.getSeconds());

  return `${yyyy}${mm}${dd}-${hh}${min}${ss}`;
}

function sanitizeBasenameForPath(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

export function buildCollabSnapshotPath(notePath: string, exportFolder: string, now: Date = new Date()): string {
  const filename = notePath.split("/").pop() ?? "note.md";
  const basename = filename.replace(/\.md$/i, "");
  const safeBasename = sanitizeBasenameForPath(basename) || "note";
  const ts = formatTimestampForPath(now);

  const folder = exportFolder.replace(/^\/+/, "").replace(/\/+$/, "");
  const prefix = folder.length > 0 ? `${folder}/` : "";
  return `${prefix}${safeBasename}-${ts}.md`;
}
