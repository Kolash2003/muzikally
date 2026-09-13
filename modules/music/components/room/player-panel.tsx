"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ListMusic, Pause, Play, SkipForward, Volume2 } from "lucide-react";
import { extractVideoId } from "@/lib/youtube";
import type {
  PlaybackStatePayload,
  QueueEntry,
} from "@/lib/socket-events";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  YouTubePlayer,
  YT_STATE,
  type YouTubePlayerHandle,
} from "./youtube-player";

interface PlayerPanelProps {
  queue: QueueEntry[];
  playback: PlaybackStatePayload | null;
  isOwner: boolean;
  streamType: "Youtube" | "Spotify";
  onControl: (action: "play" | "pause" | "next") => void;
}

function EqualizerBars() {
  return (
    <span className="flex h-4 items-end gap-[3px]" aria-hidden>
      {[0, 1, 2, 3].map((i) => (
        <span
          key={i}
          className="eq-bar w-[3px] rounded-full bg-primary"
          style={{ animationDelay: `${i * 0.18}s` }}
        />
      ))}
    </span>
  );
}

/**
 * Now-playing panel. The owner drives playback through socket controls;
 * every client (owner included) mirrors the broadcast playback:state so
 * all players stay on the same track and play/pause together.
 */
export function PlayerPanel({
  queue,
  playback,
  isOwner,
  streamType,
  onControl,
}: PlayerPanelProps) {
  const [handle, setHandle] = useState<YouTubePlayerHandle | null>(null);
  const [playerError, setPlayerError] = useState(false);
  // Playback key the "tap to enable sound" overlay was raised for. Keying by
  // playback state means a new track/command dismisses it automatically.
  const [tapKey, setTapKey] = useState<string | null>(null);
  const appliedRef = useRef<string>("");
  const handleRef = useRef<YouTubePlayerHandle | null>(null);

  useEffect(() => {
    handleRef.current = handle;
  });

  const current: QueueEntry | undefined = useMemo(() => {
    return (
      queue.find((q) => q.current) ??
      queue.find((q) => q.musicId === playback?.musicId)
    );
  }, [queue, playback?.musicId]);

  const videoId = useMemo(
    () =>
      current && current.source === "Youtube"
        ? extractVideoId(current.url)
        : null,
    [current],
  );

  const playbackKey = `${playback?.musicId ?? ""}:${playback?.status ?? ""}`;
  const needsTap = tapKey !== null && tapKey === playbackKey;

  // Mirror the broadcast playback state into the local player.
  useEffect(() => {
    if (!handle || !playback) return;
    if (playbackKey === appliedRef.current) return;
    appliedRef.current = playbackKey;
    if (playback.status === "playing") {
      handle.play();
      // Autoplay with sound can be blocked without a user gesture.
      const key = playbackKey;
      const timer = setTimeout(() => {
        if (handleRef.current?.getState() !== YT_STATE.PLAYING) {
          setTapKey(key);
        }
      }, 2000);
      return () => clearTimeout(timer);
    }
    handle.pause();
  }, [handle, playback, playbackKey]);

  const status = playback?.status ?? "paused";
  const isPlaying = status === "playing";
  // Play auto-starts the top of the queue server-side, so it only needs
  // songs — not an already-designated current track.
  const controlsEnabled = isOwner && queue.length > 0 && !playerError;

  if (streamType === "Spotify") {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <ListMusic className="size-8 text-muted-foreground" />
          <p className="max-w-sm text-sm text-muted-foreground">
            Spotify playback isn&apos;t supported in-app yet. Keep adding
            songs and voting — the queue below is live for everyone.
          </p>
          {current ? (
            <p className="text-sm font-medium">
              Up next: {current.title}
              {current.artist ? ` — ${current.artist}` : ""}
            </p>
          ) : null}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardContent className="flex flex-col gap-4 p-4 sm:p-5">
        <div className="relative">
          {/* Ambient glow tinted by the current thumbnail */}
          {current?.thumbnailUrl ? (
            <div
              aria-hidden
              className="pointer-events-none absolute -inset-6 -z-10 bg-cover bg-center opacity-30 blur-3xl saturate-150"
              style={{ backgroundImage: `url(${current.thumbnailUrl})` }}
            />
          ) : null}
          {videoId && !playerError ? (
            <YouTubePlayer
              videoId={videoId}
              onHandle={setHandle}
              onEnded={() => {
                if (isOwner) onControl("next");
              }}
              onError={() => setPlayerError(true)}
            />
          ) : (
            <div className="flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed text-muted-foreground">
              <ListMusic className="size-8" />
              <p className="text-sm">
                {playerError
                  ? "This video can't be embedded — skip to the next one."
                  : "Nothing playing yet. Add a song to get the jam going."}
              </p>
            </div>
          )}
          {needsTap && videoId && !playerError ? (
            <button
              type="button"
              onClick={() => {
                handleRef.current?.play();
                setTapKey(null);
              }}
              className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-xl bg-background/80 backdrop-blur-sm"
            >
              <Volume2 className="size-8 text-primary" />
              <span className="text-sm font-medium">
                Tap to enable sound
              </span>
            </button>
          ) : null}
        </div>

        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              {isPlaying && current ? <EqualizerBars /> : null}
              <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
                {isPlaying ? "Now playing" : "Paused"}
              </p>
            </div>
            <h2 className="mt-1 truncate text-lg font-semibold">
              {current?.title ?? "No track selected"}
            </h2>
            {current?.artist ? (
              <p className="truncate text-sm text-muted-foreground">
                {current.artist}
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="icon"
            onClick={() => onControl(isPlaying ? "pause" : "play")}
            disabled={!controlsEnabled}
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              <Pause className="size-4" />
            ) : (
              <Play className="size-4" />
            )}
          </Button>
          <Button
            size="icon"
            variant="secondary"
            onClick={() => onControl("next")}
            disabled={!controlsEnabled}
            aria-label="Next track"
          >
            <SkipForward className="size-4" />
          </Button>
          {!isOwner ? (
            <p className="ml-1 text-xs text-muted-foreground">
              Only the host controls playback
            </p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
