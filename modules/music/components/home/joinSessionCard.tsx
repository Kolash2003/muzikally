"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, KeyRound, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function JoinSessionCard() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function join(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/stream/join", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });
      const json = await res.json();
      if (!json?.success || !json?.data?.streamId) {
        throw new Error(json?.message || "Could not join with that code");
      }
      router.push(`/stream/${json.data.streamId}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setPending(false);
    }
  }

  return (
    <Card className="glass-card relative overflow-hidden border-white/10">
      {/* Decorative gradient corner aura */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-16 -right-16 size-36 rounded-full bg-indigo-500/15 blur-2xl transition-opacity group-hover:opacity-100"
      />

      <CardHeader className="pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-lg bg-indigo-500/15 text-indigo-400">
            <KeyRound className="size-5" />
          </div>
          <div>
            <CardTitle className="text-lg font-bold">Join with Code</CardTitle>
            <CardDescription className="text-xs">
              Got an invite? Enter the room code to start voting.
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        <form onSubmit={join} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Room Invite Code
            </label>
            <div className="flex gap-2">
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g. 49A2B"
                maxLength={16}
                autoComplete="off"
                spellCheck={false}
                className="h-11 font-mono text-sm tracking-wider uppercase bg-muted/25 border-border/80 focus-visible:border-primary focus-visible:ring-primary/20"
              />
              <Button
                type="submit"
                disabled={pending || !code.trim()}
                className="group relative h-11 px-5 font-semibold shadow-md shadow-primary/20 active:scale-[0.98]"
              >
                {pending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <>
                    <span>Join</span>
                    <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-1" />
                  </>
                )}
              </Button>
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground">
            Room codes are shared by the session host. You&apos;ll be able to vote and add tracks immediately.
          </p>

          {error ? (
            <p className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {error}
            </p>
          ) : null}
        </form>
      </CardContent>
    </Card>
  );
}

