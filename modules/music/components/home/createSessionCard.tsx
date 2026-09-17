"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Radio } from "lucide-react";
import { YoutubeIcon, SpotifyIcon } from "@/modules/music/components/brand-icons";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "cn";

type StreamType = "Youtube" | "Spotify";

export function CreateSessionCard() {
  const router = useRouter();
  const [type, setType] = useState<StreamType>("Youtube");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/stream", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type }),
      });
      const json = await res.json();
      if (!json?.success || !json?.stream?.id) {
        throw new Error(json?.message || "Could not create the session");
      }
      router.push(`/stream/${json.stream.id}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setPending(false);
    }
  }

  return (
    <Card className="glass-card relative overflow-hidden border-white/10">
      {/* Decorative gradient corner aura */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-16 -right-16 size-36 rounded-full bg-primary/15 blur-2xl transition-opacity group-hover:opacity-100"
      />

      <CardHeader className="pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <Radio className="size-5" />
          </div>
          <div>
            <CardTitle className="text-lg font-bold">Start a Jam Session</CardTitle>
            <CardDescription className="text-xs">
              Host a room, invite friends, and stream songs together.
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {/* Source Platform Selector */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Playback Source
          </label>
          <div className="grid grid-cols-2 gap-2" role="group" aria-label="Source">
            <button
              type="button"
              onClick={() => setType("Youtube")}
              disabled={pending}
              className={cn(
                "relative flex items-center gap-2.5 rounded-xl border p-3 text-left transition-all",
                type === "Youtube"
                  ? "border-red-500/50 bg-red-500/10 shadow-sm shadow-red-500/10"
                  : "border-border/60 bg-muted/20 hover:border-border hover:bg-muted/40",
              )}
            >
              <div
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-lg",
                  type === "Youtube" ? "bg-red-500/20 text-red-400" : "bg-muted text-muted-foreground",
                )}
              >
                <YoutubeIcon className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-foreground">YouTube</p>
                <p className="text-[10px] text-muted-foreground">Video & Audio</p>
              </div>
              {type === "Youtube" ? (
                <Check className="size-4 text-red-400" />
              ) : null}
            </button>

            <button
              type="button"
              onClick={() => setType("Spotify")}
              disabled={pending}
              className={cn(
                "relative flex items-center gap-2.5 rounded-xl border p-3 text-left transition-all",
                type === "Spotify"
                  ? "border-emerald-500/50 bg-emerald-500/10 shadow-sm shadow-emerald-500/10"
                  : "border-border/60 bg-muted/20 hover:border-border hover:bg-muted/40",
              )}
            >
              <div
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-lg",
                  type === "Spotify" ? "bg-emerald-500/20 text-emerald-400" : "bg-muted text-muted-foreground",
                )}
              >
                <SpotifyIcon className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-foreground">Spotify</p>
                <p className="text-[10px] text-muted-foreground">Queue Mode</p>
              </div>
              {type === "Spotify" ? (
                <Check className="size-4 text-emerald-400" />
              ) : null}
            </button>
          </div>
        </div>

        {error ? (
          <p className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {error}
          </p>
        ) : null}

        <Button
          onClick={start}
          disabled={pending}
          size="lg"
          className="group relative flex h-11 w-full items-center justify-center gap-2 overflow-hidden rounded-xl font-semibold shadow-md shadow-primary/20 transition-all active:scale-[0.98]"
        >
          <span
            aria-hidden
            className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/15 to-transparent transition-transform duration-700 group-hover:translate-x-full"
          />
          {pending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Radio className="size-4" />
          )}
          <span>{pending ? "Creating room…" : "Create Session"}</span>
        </Button>
      </CardContent>
    </Card>
  );
}

