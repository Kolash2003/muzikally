export interface SpotifyEntity {
  type: "track" | "album" | "playlist" | "episode";
  id: string;
}

/**
 * Extract Spotify entity type and id from common Spotify URLs or URIs:
 * - https://open.spotify.com/track/5uvG5xETXhVkBSr09RBjyC
 * - https://open.spotify.com/track/5uvG5xETXhVkBSr09RBjyC?si=...
 * - https://open.spotify.com/intl-en/track/5uvG5xETXhVkBSr09RBjyC
 * - spotify:track:5uvG5xETXhVkBSr09RBjyC
 */
export function extractSpotifyEntity(url: string): SpotifyEntity | null {
  try {
    const match = url.match(/(track|album|playlist|episode)[\/:]([a-zA-Z0-9]{22})/);
    if (match) {
      return {
        type: match[1] as SpotifyEntity["type"],
        id: match[2],
      };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Generate a Spotify Embed URL from a track/album/playlist URL or ID.
 */
export function getSpotifyEmbedUrl(url: string): string | null {
  const entity = extractSpotifyEntity(url);
  if (!entity) return null;
  return `https://open.spotify.com/embed/${entity.type}/${entity.id}?utm_source=generator&theme=0`;
}
