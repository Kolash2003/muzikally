/** Extract the 11-char video id from common YouTube URL shapes. */
export function extractVideoId(url: string): string | null {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    if (host.includes("youtu.be")) {
      const id = parsed.pathname.slice(1).split("/")[0];
      return isVideoId(id) ? id : null;
    }
    if (!host.includes("youtube.com")) return null;
    if (parsed.pathname === "/watch") {
      const id = parsed.searchParams.get("v");
      return isVideoId(id) ? id : null;
    }
    const parts = parsed.pathname.split("/").filter(Boolean);
    // /embed/<id>, /shorts/<id>, /live/<id>, /v/<id>
    if (parts.length >= 2 && ["embed", "shorts", "live", "v"].includes(parts[0])) {
      return isVideoId(parts[1]) ? parts[1] : null;
    }
    return null;
  } catch {
    return null;
  }
}

function isVideoId(value: string | null): value is string {
  return !!value && /^[A-Za-z0-9_-]{11}$/.test(value);
}

/** Human-readable mm:ss (or h:mm:ss) duration. */
export function formatDuration(totalSeconds: number | null | undefined): string {
  if (totalSeconds == null || totalSeconds < 0) return "";
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  const mm = h > 0 ? String(m).padStart(2, "0") : String(m);
  return `${h > 0 ? `${h}:` : ""}${mm}:${String(s).padStart(2, "0")}`;
}
