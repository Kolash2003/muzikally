"use client";

import { useMemo } from "react";
import { getSpotifyEmbedUrl } from "@/lib/spotify";

interface SpotifyPlayerProps {
  url: string;
  title?: string;
  height?: number;
}

export function SpotifyPlayer({
  url,
  title,
  height = 352,
}: SpotifyPlayerProps) {
  const embedUrl = useMemo(() => getSpotifyEmbedUrl(url), [url]);

  if (!embedUrl) {
    return (
      <div className="flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/80 bg-black/40 p-6 text-center text-muted-foreground">
        <p className="text-sm font-medium text-foreground">
          Invalid Spotify URL
        </p>
        <p className="text-xs text-muted-foreground">
          Could not load the Spotify player for this track.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full overflow-hidden rounded-xl bg-black/60 shadow-xl transition-all duration-300">
      <iframe
        title={title ? `Spotify player: ${title}` : "Spotify Web Player"}
        src={embedUrl}
        width="100%"
        height={height}
        frameBorder="0"
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        loading="lazy"
        className="block w-full border-0"
      />
    </div>
  );
}
