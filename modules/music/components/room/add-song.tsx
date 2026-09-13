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
    <Card>
      <CardContent className="flex flex-col gap-3 p-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Link2 className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={url}
              onChange={(e) => handleUrlChange(e.target.value)}
              placeholder={`Paste a ${streamType} link…`}
              autoComplete="off"
              spellCheck={false}
              className="pl-9"
            />
          </div>
          <Button
            onClick={add}
            disabled={state.status !== "resolved" || adding}
          >
            {adding ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Plus className="size-4" />
            )}
            Add
          </Button>
        </div>

        {state.status === "resolving" ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Looking up that link…
          </p>
        ) : null}

        {state.status === "error" ? (
          <p className="text-sm text-destructive">{state.message}</p>
        ) : null}

        {state.status === "resolved" ? (
          <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/40 p-2.5">
            <div className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-muted">
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
              <p className="truncate text-sm font-medium">
                {state.track.title}
              </p>
              {state.track.artist ? (
                <p className="truncate text-xs text-muted-foreground">
                  {state.track.artist}
                </p>
              ) : null}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
