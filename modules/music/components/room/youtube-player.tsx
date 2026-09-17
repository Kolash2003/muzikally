"use client";

import { useEffect, useRef } from "react";

/* Minimal YouTube IFrame API typings (no extra dependency). */
interface YTPlayer {
  loadVideoById(videoId: string): void;
  cueVideoById(videoId: string): void;
  playVideo(): void;
  pauseVideo(): void;
  mute(): void;
  unMute(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  getCurrentTime(): number;
  getPlayerState(): number;
  destroy(): void;
}

interface YTNamespace {
  Player: new (
    el: HTMLElement,
    opts: {
      videoId?: string;
      playerVars?: Record<string, string | number>;
      events?: {
        onReady?: () => void;
        onStateChange?: (e: { data: number }) => void;
        onError?: () => void;
      };
    },
  ) => YTPlayer;
  PlayerState: { ENDED: number; PLAYING: number; PAUSED: number };
}

declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

export const YT_STATE = { ENDED: 0, PLAYING: 1, PAUSED: 2 } as const;

let apiPromise: Promise<YTNamespace> | null = null;

function loadYouTubeApi(): Promise<YTNamespace> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("YouTube API needs the browser"));
  }
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (apiPromise) return apiPromise;
  apiPromise = new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error("YouTube API timed out")),
      15000,
    );
    window.onYouTubeIframeAPIReady = () => {
      clearTimeout(timeout);
      if (window.YT?.Player) resolve(window.YT);
      else reject(new Error("YouTube API failed to load"));
    };
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    tag.async = true;
    tag.onerror = () => {
      clearTimeout(timeout);
      reject(new Error("YouTube API failed to load"));
    };
    document.head.appendChild(tag);
  });
  return apiPromise;
}

export interface YouTubePlayerHandle {
  load(videoId: string): void;
  play(): void;
  pause(): void;
  mute(): void;
  unMute(): void;
  seek(seconds: number): void;
  getCurrentTime(): number;
  getState(): number | null;
}

interface YouTubePlayerProps {
  videoId: string | null;
  onReady?: () => void;
  onEnded?: () => void;
  onError?: () => void;
  onHandle?: (handle: YouTubePlayerHandle | null) => void;
}

/**
 * Thin wrapper around the YouTube IFrame API.
 * The parent drives playback imperatively through the handle and learns
 * about natural track ends via `onEnded`.
 *
 * The IFrame player object only gains its methods (`playVideo`, …) once
 * `onReady` fires — calling them earlier throws. The handle therefore
 * queues intents issued before readiness and flushes them on ready.
 */
export function YouTubePlayer({
  videoId,
  onReady,
  onEnded,
  onError,
  onHandle,
}: YouTubePlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const readyRef = useRef(false);
  const pendingRef = useRef<{
    videoId: string | null;
    autoplay: boolean;
    muted: boolean;
  }>({
    videoId: null,
    autoplay: false,
    muted: false,
  });
  const callbacksRef = useRef({ onReady, onEnded, onError, onHandle });
  // Mount-time video id for the async creation below; later changes go
  // through the prop effect.
  const initialVideoId = useRef(videoId);

  useEffect(() => {
    callbacksRef.current = { onReady, onEnded, onError, onHandle };
  });

  useEffect(() => {
    let cancelled = false;
    loadYouTubeApi()
      .then((YT) => {
        if (cancelled || !containerRef.current) return;
        playerRef.current = new YT.Player(containerRef.current, {
          // Pass the video up-front: the prop-driven load below can run
          // before this async creation finishes and would otherwise miss.
          videoId: initialVideoId.current ?? undefined,
          playerVars: { rel: 0 },
          events: {
            onReady: () => {
              if (cancelled) return;
              readyRef.current = true;
              // Flush intents that arrived before the player was ready.
              const pending = pendingRef.current;
              pendingRef.current = {
                videoId: null,
                autoplay: false,
                muted: false,
              };
              if (
                pending.muted &&
                typeof playerRef.current?.mute === "function"
              ) {
                playerRef.current.mute();
              }
              if (pending.videoId) {
                if (pending.autoplay) {
                  playerRef.current?.loadVideoById(pending.videoId);
                } else {
                  playerRef.current?.cueVideoById(pending.videoId);
                }
              } else if (pending.autoplay) {
                playerRef.current?.playVideo();
              }
              callbacksRef.current.onReady?.();
            },
            onStateChange: (e) => {
              if (e.data === YT.PlayerState.ENDED) {
                callbacksRef.current.onEnded?.();
              }
            },
            onError: () => callbacksRef.current.onError?.(),
          },
        });
        callbacksRef.current.onHandle?.({
          load: (id) => {
            if (readyRef.current && playerRef.current) {
              playerRef.current.loadVideoById(id);
            } else {
              pendingRef.current = {
                videoId: id,
                autoplay: pendingRef.current.autoplay,
                muted: pendingRef.current.muted,
              };
            }
          },
          play: () => {
            if (readyRef.current && playerRef.current) {
              playerRef.current.playVideo();
            } else {
              pendingRef.current.autoplay = true;
            }
          },
          pause: () => {
            if (readyRef.current && playerRef.current) {
              playerRef.current.pauseVideo();
            } else {
              pendingRef.current.autoplay = false;
            }
          },
          mute: () => {
            if (
              readyRef.current &&
              typeof playerRef.current?.mute === "function"
            ) {
              playerRef.current.mute();
            } else {
              pendingRef.current.muted = true;
            }
          },
          unMute: () => {
            if (
              readyRef.current &&
              typeof playerRef.current?.unMute === "function"
            ) {
              playerRef.current.unMute();
            } else {
              pendingRef.current.muted = false;
            }
          },
          seek: (seconds: number) => {
            playerRef.current?.seekTo(seconds, true);
          },
          getCurrentTime: () =>
            readyRef.current && playerRef.current
              ? playerRef.current.getCurrentTime()
              : 0,
          getState: () =>
            readyRef.current && playerRef.current
              ? playerRef.current.getPlayerState()
              : null,
        });
      })
      .catch(() => callbacksRef.current.onError?.());
    return () => {
      cancelled = true;
      readyRef.current = false;
      pendingRef.current = { videoId: null, autoplay: false, muted: false };
      callbacksRef.current.onHandle?.(null);
      playerRef.current?.destroy();
      playerRef.current = null;
    };
    // Mount once; the video is driven through the handle.
  }, []);

  useEffect(() => {
    if (videoId) playerRef.current?.cueVideoById(videoId);
  }, [videoId]);

  return (
    <div className="aspect-video w-full overflow-hidden rounded-xl bg-black">
      <div ref={containerRef} className="h-full w-full" />
    </div>
  );
}
