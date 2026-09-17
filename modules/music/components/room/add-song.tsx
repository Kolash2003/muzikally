"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Link2, Loader2, Music2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface ResolvedTrack {
  title: string;
  artist: string | null;
  thumbnailUrl: string | null;
  source: "Youtube" | "Spotify";
}

interface AddSongProps {
  streamId: string;
  streamType: "Youtube" | "Spotify";
  onAdded: () => void;
}

type ResolveState =
  | { status: "idle" }
  | { status: "resolving" }
  | { status: "resolved"; track: ResolvedTrack; url: string }
  | { status: "error"; message: string };

export function AddSong({ streamId, streamType, onAdded }: AddSongProps) {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [state, setState] = useState<ResolveState>({ status: "idle" });
  const [adding, setAdding] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function resolveUrl(trimmed: string) {
    try {
      const res = await fetch(
        `/api/music/resolve?url=${encodeURIComponent(trimmed)}`,
      );
      const json = await res.json();
      if (!json?.success || !json?.data) {
        throw new Error(json?.message || "Could not resolve that link");
      }
      const track = json.data as ResolvedTrack;
      if (track.source !== streamType) {
        setState({
          status: "error",
          message: `This is a ${streamType} session — only ${streamType} links work here.`,
        });
        return;
      }
      setState({ status: "resolved", track, url: trimmed });
    } catch (e) {
      setState({
        status: "error",
        message: e instanceof Error ? e.message : "Could not resolve that link",
      });
    }
  }

  function handleUrlChange(value: string) {
    setUrl(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = value.trim();
    if (!trimmed || !/^https?:\/\//i.test(trimmed)) {
      setState({ status: "idle" });
      return;
    }
    setState({ status: "resolving" });
    debounceRef.current = setTimeout(() => {
      void resolveUrl(trimmed);
    }, 600);
  }

  useEffect(() => {
    const timer = debounceRef.current;
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, []);

  async function add() {
    if (state.status !== "resolved" || adding) return;
    setAdding(true);
    try {
      const res = await fetch("/api/music", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          streamId,
          title: state.track.title,
          artist: state.track.artist ?? undefined,
          url: state.url,
          thumbnailUrl: state.track.thumbnailUrl ?? undefined,
        }),
      });
      const json = await res.json();
      if (!json?.success) {
        throw new Error(json?.message || "Could not add that song");
      }
      toast.success("Added to the queue");
      setUrl("");
      setState({ status: "idle" });
      onAdded();
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not add that song");
    } finally {
      setAdding(false);
    }
  }

  return (
    <Card className="glass-card overflow-hidden border-white/10 shadow-xl">
      <CardContent className="flex flex-col gap-3 p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Queue a Track
          </span>
          <span className="rounded-md border border-border/40 bg-muted/30 px-2 py-0.5 text-[10px] font-semibold text-primary">
            {streamType}
          </span>
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Link2 className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={url}
              onChange={(e) => handleUrlChange(e.target.value)}
              placeholder={`Paste a ${streamType} link…`}
              autoComplete="off"
              spellCheck={false}
              className="h-10 rounded-xl bg-muted/20 pl-9 text-xs border-border/80 focus-visible:border-primary focus-visible:ring-primary/20"
            />
          </div>
          <Button
            onClick={add}
            disabled={state.status !== "resolved" || adding}
            className="h-10 rounded-xl px-4 text-xs font-semibold shadow-md shadow-primary/20 transition-all active:scale-95"
          >
            {adding ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Plus className="size-3.5" />
            )}
            <span>Add</span>
          </Button>
        </div>

        {state.status === "resolving" ? (
          <div className="flex items-center gap-2 rounded-xl border border-border/50 bg-muted/20 p-2.5 text-xs text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin text-primary" />
            <span>Fetching track details from {streamType}…</span>
          </div>
        ) : null}

        {state.status === "error" ? (
          <p className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {state.message}
          </p>
        ) : null}

        {state.status === "resolved" ? (
          <div className="flex items-center gap-3 rounded-xl border border-primary/40 bg-primary/10 p-2.5 animate-in fade-in zoom-in-95 duration-200">
            <div className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-muted border border-border/60">
              {state.track.thumbnailUrl ? (
                <Image
                  src={state.track.thumbnailUrl}
                  alt=""
                  fill
                  sizes="48px"
                  className="object-cover"
                />
              ) : (
                <Music2 className="absolute inset-0 m-auto size-5 text-muted-foreground" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold text-foreground">
                {state.track.title}
              </p>
              {state.track.artist ? (
                <p className="truncate text-[11px] text-muted-foreground">
                  {state.track.artist}
                </p>
              ) : null}
            </div>
            <span className="rounded-md bg-primary/20 px-2 py-0.5 text-[10px] font-bold text-primary uppercase">
              Ready
            </span>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
