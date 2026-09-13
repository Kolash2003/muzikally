"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Copy,
  Crown,
  Loader2,
  Music,
  Power,
} from "lucide-react";
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

  async function copyCode(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      toast.success(`Copied ${code}`);
    } catch {
      toast.error("Could not copy");
    }
  }

  if (items.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
          <Music className="size-6" />
          <p className="text-sm">No sessions yet. Start or join one above.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {items.map((s) => (
        <Card key={s.id} className={!s.active ? "opacity-70" : undefined}>
          <CardContent className="flex flex-col gap-3 p-5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{s.type}</Badge>
                <Badge
                  variant={s.active ? "default" : "outline"}
                  className="capitalize"
                >
                  {s.active ? "live" : "ended"}
                </Badge>
              </div>
              {s.role === "Owner" ? (
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <Crown className="size-3.5 text-primary" /> Owner
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">Member</span>
              )}
            </div>
            <button
              type="button"
              onClick={() => copyCode(s.code)}
              className="group inline-flex items-center gap-2 self-start rounded-md border border-border px-2.5 py-1.5 font-mono text-sm tracking-wider hover:border-primary/60"
              title="Copy invite code"
            >
              {s.code}
              <Copy className="size-3.5 opacity-50 transition-opacity group-hover:opacity-100" />
            </button>
            <div className="flex items-center gap-2">
              <Link
                href={`/stream/${s.id}`}
                prefetch={true}
                className={cn(
                  buttonVariants({
                    size: "sm",
                    variant: s.active ? "default" : "outline",
                  }),
                )}
              >
                Open room <ArrowRight className="size-4" />
              </Link>
              {s.role === "Owner" && s.active ? (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={endingId === s.id}
                  onClick={() => endStream(s.id)}
                >
                  {endingId === s.id ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Power className="size-4" />
                  )}
                  End
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
