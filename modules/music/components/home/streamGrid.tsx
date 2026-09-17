"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Check,
  Copy,
  Crown,
  Disc3,
  Loader2,
  Power,
} from "lucide-react";
import { YoutubeIcon, SpotifyIcon } from "@/modules/music/components/brand-icons";
import { DEMO_STREAM_CODE } from "@/lib/demo";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "cn";
import { Card, CardContent } from "@/components/ui/card";

export interface StreamListItem {
  id: string;
  code: string;
  type: "Youtube" | "Spotify";
  active: boolean;
  role: "Owner" | "Member";
  createdAt: string;
}

export function StreamGrid({ items }: { items: StreamListItem[] }) {
  const router = useRouter();
  const [endingId, setEndingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [joiningDemo, setJoiningDemo] = useState(false);

  async function joinDemoRoom() {
    setJoiningDemo(true);
    try {
      const res = await fetch("/api/stream/join", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: DEMO_STREAM_CODE }),
      });
      const json = await res.json();
      if (!json?.success || !json?.data?.streamId) {
        throw new Error(json?.message || "Demo room unavailable");
      }
      router.push(`/stream/${json.data.streamId}`);
      router.refresh();
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Could not join the demo room",
      );
      setJoiningDemo(false);
    }
  }

  async function endStream(id: string) {
    setEndingId(id);
    try {
      const res = await fetch("/api/stream", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ streamId: id }),
      });
      const json = await res.json();
      if (!json?.success) throw new Error(json?.message || "Failed");
      toast.success("Session ended");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not end session");
    } finally {
      setEndingId(null);
    }
  }

  async function copyCode(code: string, id: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedId(id);
      toast.success(`Copied invite code: ${code}`);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error("Could not copy");
    }
  }

  if (items.length === 0) {
    return (
      <Card className="glass-card overflow-hidden border-dashed border-border/80">
        <CardContent className="flex flex-col items-center justify-center gap-3 py-14 text-center">
          <div className="relative flex size-14 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
            <Disc3 className="size-7 animate-[spin_8s_linear_infinite] motion-reduce:animate-none" />
          </div>
          <div className="flex flex-col gap-1">
            <h3 className="text-base font-semibold text-foreground">
              No sessions yet
            </h3>
            <p className="max-w-sm text-xs text-muted-foreground">
              Start your first session above to play YouTube or Spotify tracks, or join with a friend&apos;s code.
            </p>
          </div>
          <div className="mt-2 flex flex-col items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={joinDemoRoom}
              disabled={joiningDemo}
              className="gap-1.5 border-primary/30 bg-primary/5 font-semibold text-primary hover:bg-primary/15 hover:text-primary active:scale-[0.98]"
            >
              {joiningDemo ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <span className="flex h-3 items-end gap-0.5" aria-hidden>
                  <span className="eq-bar-1 w-0.5 rounded-full bg-primary" />
                  <span className="eq-bar-2 w-0.5 rounded-full bg-primary" />
                  <span className="eq-bar-3 w-0.5 rounded-full bg-primary" />
                </span>
              )}
              <span>Peek into the demo room</span>
            </Button>
            <p className="text-[11px] text-muted-foreground">
              Code <span className="font-mono font-semibold">{DEMO_STREAM_CODE}</span> · a live room with votes already rolling.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {items.map((s) => (
        <Card
          key={s.id}
          className={cn(
            "glass-card group relative overflow-hidden border-white/10",
            !s.active && "opacity-60 saturate-50 hover:opacity-90 hover:saturate-100",
          )}
        >
          <CardContent className="flex flex-col gap-3.5 p-5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {/* Platform Badge */}
                <div
                  className={cn(
                    "flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold",
                    s.type === "Youtube"
                      ? "border-red-500/30 bg-red-500/10 text-red-400"
                      : "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
                  )}
                >
                  {s.type === "Youtube" ? (
                    <YoutubeIcon className="size-3" />
                  ) : (
                    <SpotifyIcon className="size-3" />
                  )}
                  <span>{s.type}</span>
                </div>

                {/* Status Indicator */}
                {s.active ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-400">
                    <span className="relative flex size-1.5">
                      <span className="radar-ring absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex size-1.5 rounded-full bg-emerald-400" />
                    </span>
                    <span>Live</span>
                  </span>
                ) : (
                  <Badge variant="outline" className="text-[11px] text-muted-foreground">
                    Ended
                  </Badge>
                )}
              </div>

              {/* Role Badge */}
              {s.role === "Owner" ? (
                <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-300">
                  <Crown className="size-3" /> Host
                </span>
              ) : (
                <span className="text-[11px] font-medium text-muted-foreground">Member</span>
              )}
            </div>

            {/* Room Code with 1-click copy */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                  Invite Code
                </span>
                <button
                  type="button"
                  onClick={() => copyCode(s.code, s.id)}
                  className="group/btn inline-flex items-center gap-2 self-start rounded-lg border border-border/80 bg-muted/20 px-2.5 py-1 font-mono text-xs font-semibold tracking-wider transition-colors hover:border-primary/50 hover:bg-muted/40"
                  title="Copy invite code"
                >
                  <span>{s.code}</span>
                  {copiedId === s.id ? (
                    <Check className="size-3.5 text-primary" />
                  ) : (
                    <Copy className="size-3.5 text-muted-foreground transition-colors group-hover/btn:text-foreground" />
                  )}
                </button>
              </div>

              {s.active ? (
                <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <span className="flex h-3 items-end gap-0.5" aria-hidden>
                    <span className="eq-bar-1 w-0.5 rounded-full bg-primary" />
                    <span className="eq-bar-2 w-0.5 rounded-full bg-primary" />
                    <span className="eq-bar-3 w-0.5 rounded-full bg-primary" />
                  </span>
                </div>
              ) : null}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between border-t border-border/40 pt-3">
              <Link
                href={`/stream/${s.id}`}
                prefetch={true}
                className={cn(
                  buttonVariants({
                    size: "sm",
                    variant: s.active ? "default" : "secondary",
                  }),
                  "group/link gap-1.5 font-semibold active:scale-[0.98]",
                )}
              >
                <span>{s.active ? "Enter room" : "View archive"}</span>
                <ArrowRight className="size-3.5 transition-transform duration-200 group-hover/link:translate-x-0.5" />
              </Link>

              {s.role === "Owner" && s.active ? (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={endingId === s.id}
                  onClick={() => endStream(s.id)}
                  className="h-8 text-xs text-muted-foreground hover:text-destructive active:scale-[0.98]"
                >
                  {endingId === s.id ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Power className="size-3.5" />
                  )}
                  <span>End</span>
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

