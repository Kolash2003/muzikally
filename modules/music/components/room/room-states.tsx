"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  Music2,
  Power,
  RotateCcw,
  TriangleAlert,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "cn";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import type { QueueEntry } from "@/lib/socket-events";
import { FinalQueueList } from "./queue-panel";

export function ConnectingScreen() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="flex items-center gap-2 text-xs font-semibold text-primary">
        <Loader2 className="size-4 animate-spin" />
        <span>Connecting to real-time jam session…</span>
      </div>
      <div className="grid flex-1 gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex flex-col gap-4">
          <Skeleton className="aspect-video w-full rounded-2xl border border-white/5 bg-muted/40" />
          <div className="flex flex-col gap-2 pt-2">
            <Skeleton className="h-6 w-1/2 rounded-lg bg-muted/40" />
            <Skeleton className="h-4 w-1/4 rounded-md bg-muted/30" />
          </div>
          <div className="flex gap-2 pt-2">
            <Skeleton className="size-10 rounded-xl bg-muted/40" />
            <Skeleton className="size-10 rounded-xl bg-muted/40" />
          </div>
        </div>
        <div className="flex flex-col gap-4">
          <Skeleton className="h-28 w-full rounded-2xl border border-white/5 bg-muted/40" />
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl bg-muted/30" />
          ))}
        </div>
      </div>
    </div>
  );
}

function CenteredCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-md flex-1 items-center px-4 py-16">
      <Card className="glass-card relative w-full overflow-hidden border-white/10 shadow-2xl">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-16 -right-16 size-36 rounded-full bg-primary/15 blur-2xl"
        />
        <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
          {children}
        </CardContent>
      </Card>
    </div>
  );
}

export function EndedScreen({ queue }: { queue: QueueEntry[] }) {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6">
      <Card className="glass-card relative overflow-hidden border-white/10 shadow-2xl">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-20 -right-20 size-48 rounded-full bg-amber-500/10 blur-3xl"
        />
        <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
          <span className="flex size-14 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-400">
            <Power className="size-6" />
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Jam Session Wrapped</h1>
          <p className="max-w-md text-xs text-muted-foreground">
            The host ended this session. Here are the top-voted tracks that made the crowd groove.
          </p>
          <Link
            href="/"
            className={cn(
              buttonVariants(),
              "mt-3 gap-2 rounded-xl px-5 font-semibold shadow-md shadow-primary/25 active:scale-95",
            )}
          >
            <ArrowLeft className="size-4" />
            Back to Dashboard
          </Link>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
          Final Track Leaderboard
        </h2>
        <FinalQueueList queue={queue} />
      </div>
    </div>
  );
}

export function ErrorScreen({
  message,
  onRetry,
}: {
  message: string | null;
  onRetry: () => void;
}) {
  return (
    <CenteredCard>
      <span className="flex size-14 items-center justify-center rounded-2xl border border-destructive/30 bg-destructive/10 text-destructive">
        <TriangleAlert className="size-7" />
      </span>
      <h1 className="text-xl font-bold tracking-tight text-foreground">Couldn&apos;t load the room</h1>
      <p className="text-xs text-muted-foreground">
        {message ?? "Something went wrong while joining. Check your connection and try again."}
      </p>
      <div className="mt-2 flex gap-2">
        <Button onClick={onRetry} className="gap-2 rounded-xl font-semibold shadow-sm active:scale-95">
          <RotateCcw className="size-4" />
          Try again
        </Button>
        <Link
          href="/"
          className={cn(
            buttonVariants({ variant: "ghost" }),
            "gap-2 rounded-xl border border-border/40 text-xs active:scale-95",
          )}
        >
          <ArrowLeft className="size-4" />
          Home
        </Link>
      </div>
    </CenteredCard>
  );
}

export function NotFoundScreen() {
  return (
    <CenteredCard>
      <span className="flex size-14 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10 text-primary">
        <Music2 className="size-7" />
      </span>
      <h1 className="text-xl font-bold tracking-tight text-foreground">Session Not Found</h1>
      <p className="text-xs text-muted-foreground">
        This link doesn&apos;t point to an active session. Check the invite code or start your own jam.
      </p>
      <Link
        href="/"
        className={cn(
          buttonVariants(),
          "mt-2 gap-2 rounded-xl px-5 font-semibold shadow-md shadow-primary/20 active:scale-95",
        )}
      >
        <ArrowLeft className="size-4" />
        Back Home
      </Link>
    </CenteredCard>
  );
}

export function NotAMemberScreen({
  onJoined,
}: {
  onJoined: () => void;
}) {
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
      if (!json?.success) {
        throw new Error(json?.message || "Could not join with that code");
      }
      onJoined();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setPending(false);
    }
  }

  return (
    <CenteredCard>
      <h1 className="text-xl font-bold tracking-tight text-foreground">
        Enter Room Code
      </h1>
      <p className="text-xs text-muted-foreground">
        Ask the host for the invite code to enter this session and vote tracks.
      </p>
      <form onSubmit={join} className="flex w-full gap-2 pt-2">
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="e.g. 49A2B"
          maxLength={16}
          autoComplete="off"
          spellCheck={false}
          className="h-11 font-mono text-sm tracking-wider uppercase bg-muted/25"
        />
        <Button
          type="submit"
          disabled={pending || !code.trim()}
          className="h-11 px-5 font-semibold shadow-md shadow-primary/25 active:scale-95"
        >
          {pending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <ArrowRight className="size-4" />
          )}
          Join
        </Button>
      </form>
      {error ? (
        <p className="w-full rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {error}
        </p>
      ) : null}
      <Link
        href="/"
        className={cn(
          buttonVariants({ variant: "ghost" }),
          "gap-2 text-xs text-muted-foreground active:scale-95",
        )}
      >
        <ArrowLeft className="size-4" />
        Back Home
      </Link>
    </CenteredCard>
  );
}
