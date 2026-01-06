export function deriveRoomName(requestUrl) {
  try {
    const url = new URL(requestUrl, "http://localhost");
    const path = url.pathname.replace(/^\//, "");
    return path.length > 0 ? path : "default";
  } catch {
    return "default";
  }
}
