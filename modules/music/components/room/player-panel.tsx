"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ExternalLink, Info, ListMusic, Pause, Play, SkipForward, Volume2 } from "lucide-react";
import { extractVideoId } from "@/lib/youtube";
import type {
  PlaybackStatePayload,
  QueueEntry,
} from "@/lib/socket-events";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SpotifyIcon } from "@/modules/music/components/brand-icons";
import { SpotifyPlayer } from "./spotify-player";
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
    <span className="flex h-4 items-end gap-1" aria-hidden>
      <span className="eq-bar-1 w-1 rounded-full bg-primary" />
      <span className="eq-bar-2 w-1 rounded-full bg-primary" />
      <span className="eq-bar-3 w-1 rounded-full bg-primary" />
      <span className="eq-bar-4 w-1 rounded-full bg-primary" />
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
      queue.find((q) => q.musicId === playback?.musicId) ??
      (streamType === "Spotify" ? queue[0] : undefined)
    );
  }, [queue, playback?.musicId, streamType]);

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
    const hasTrack = Boolean(current?.url);
    return (
      <Card className="glass-card relative overflow-hidden border-white/10 shadow-2xl">
        <CardContent className="flex flex-col gap-4 p-4 sm:p-5">
          <div className="relative overflow-hidden rounded-xl bg-black/40 border border-white/10 shadow-inner">
            {/* Ambient glow tinted by the current thumbnail */}
            {current?.thumbnailUrl ? (
              <div
                aria-hidden
                className="pointer-events-none absolute -inset-8 -z-10 bg-cover bg-center opacity-40 blur-3xl saturate-200 transition-all duration-700"
                style={{ backgroundImage: `url(${current.thumbnailUrl})` }}
              />
            ) : null}

            {hasTrack ? (
              <SpotifyPlayer
                url={current!.url}
                title={current!.title}
                height={352}
              />
            ) : (
              <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border/80 text-muted-foreground p-6 text-center">
                <div className="flex size-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <SpotifyIcon className="size-7" />
                </div>
                <p className="text-sm font-semibold text-foreground">
                  Queue is waiting for tracks
                </p>
                <p className="max-w-xs text-xs text-muted-foreground">
                  Add a Spotify link in the panel on the right to start listening and voting together.
                </p>
              </div>
            )}
          </div>

          {/* Track Title & Meta */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-400">
                  <SpotifyIcon className="size-3" />
                  <span>Spotify Room</span>
                </div>
                {hasTrack ? <EqualizerBars /> : null}
              </div>
              <h2 className="mt-1.5 truncate text-lg font-bold tracking-tight text-foreground">
                {current?.title ?? "No track selected"}
              </h2>
              {current?.artist ? (
                <p className="truncate text-xs text-muted-foreground">
                  {current.artist}
                </p>
              ) : null}
            </div>

            {current?.url ? (
              <a
                href={current.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-muted/40 px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground shrink-0"
              >
                <span>Open in Spotify</span>
                <ExternalLink className="size-3" />
              </a>
            ) : null}
          </div>

          {/* Spotify info banner */}
          <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-xs text-muted-foreground">
            <Info className="size-4 shrink-0 text-emerald-400" />
            <span>
              Audio plays via Spotify Embed. Log into Spotify in your browser for full tracks, or enjoy 30s previews without an account.
            </span>
          </div>

          {/* Controls Bar */}
          <div className="flex items-center justify-between border-t border-border/50 pt-3">
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="default"
                onClick={() => onControl("next")}
                disabled={!isOwner || queue.length === 0}
                className="gap-2 rounded-xl shadow-md shadow-primary/25 transition-all active:scale-95"
              >
                <SkipForward className="size-4" />
                <span>Next Track</span>
              </Button>
            </div>

            {!isOwner ? (
              <span className="rounded-md border border-border/40 bg-muted/30 px-2 py-1 text-[11px] text-muted-foreground font-medium">
                Synchronized with host
              </span>
            ) : (
              <span className="text-[11px] text-muted-foreground">
                Host controls active
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card relative overflow-hidden border-white/10 shadow-2xl">
      <CardContent className="flex flex-col gap-4 p-4 sm:p-5">
        <div className="relative overflow-hidden rounded-xl bg-black/40 border border-white/10 shadow-inner">
          {/* Ambient glow tinted by the current thumbnail */}
          {current?.thumbnailUrl ? (
            <div
              aria-hidden
              className="pointer-events-none absolute -inset-8 -z-10 bg-cover bg-center opacity-40 blur-3xl saturate-200 transition-all duration-700"
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
            <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border/80 text-muted-foreground p-6 text-center">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-muted/30 text-primary">
                <ListMusic className="size-6" />
              </div>
              <p className="text-sm font-medium text-foreground">
                {playerError
                  ? "This video can't be embedded — skip to the next one."
                  : "Queue is waiting for tracks"}
              </p>
              <p className="max-w-xs text-xs text-muted-foreground">
                {playerError
                  ? "The publisher restricted embedding for this song."
                  : "Add a YouTube link in the panel on the right to start playback."}
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
              className="group absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-xl bg-background/85 backdrop-blur-md transition-all hover:bg-background/75"
            >
              <div className="flex size-14 items-center justify-center rounded-full bg-primary/20 text-primary ring-4 ring-primary/20 transition-transform group-hover:scale-110">
                <Volume2 className="size-7" />
              </div>
              <span className="text-sm font-bold text-foreground">
                Tap to enable sound
              </span>
            </button>
          ) : null}
        </div>

        {/* Track Title & Meta */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              {isPlaying && current ? <EqualizerBars /> : null}
              <p className="text-[11px] font-bold tracking-wider uppercase text-primary">
                {isPlaying ? "Now Playing" : "Paused"}
              </p>
            </div>
            <h2 className="mt-1 truncate text-lg font-bold tracking-tight text-foreground">
              {current?.title ?? "No track selected"}
            </h2>
            {current?.artist ? (
              <p className="truncate text-xs text-muted-foreground">
                {current.artist}
              </p>
            ) : null}
          </div>
        </div>

        {/* Controls Bar */}
        <div className="flex items-center justify-between border-t border-border/50 pt-3">
          <div className="flex items-center gap-2">
            <Button
              size="icon"
              onClick={() => onControl(isPlaying ? "pause" : "play")}
              disabled={!controlsEnabled}
              aria-label={isPlaying ? "Pause" : "Play"}
              className="size-10 rounded-xl shadow-md shadow-primary/25 transition-all active:scale-95"
            >
              {isPlaying ? (
                <Pause className="size-4.5" />
              ) : (
                <Play className="size-4.5" />
              )}
            </Button>
            <Button
              size="icon"
              variant="secondary"
              onClick={() => onControl("next")}
              disabled={!controlsEnabled}
              aria-label="Next track"
              className="size-10 rounded-xl border border-border/60 transition-all active:scale-95"
            >
              <SkipForward className="size-4.5" />
            </Button>
          </div>

          {!isOwner ? (
            <span className="rounded-md border border-border/40 bg-muted/30 px-2 py-1 text-[11px] text-muted-foreground font-medium">
              Synchronized with host
            </span>
          ) : (
            <span className="text-[11px] text-muted-foreground">
              Host controls active
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
