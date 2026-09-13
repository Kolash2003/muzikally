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
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 px-4 py-6 sm:px-6">
      <div className="grid flex-1 gap-4 lg:grid-cols-[1fr_380px]">
        <div className="flex flex-col gap-4">
          <Skeleton className="aspect-video w-full rounded-xl" />
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
          <div className="flex gap-2">
            <Skeleton className="size-8 rounded-lg" />
            <Skeleton className="size-8 rounded-lg" />
          </div>
        </div>
        <div className="flex flex-col gap-4">
          <Skeleton className="h-[76px] w-full rounded-xl" />
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-[68px] w-full rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}

function CenteredCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-md flex-1 items-center px-4 py-12">
      <Card className="w-full">
        <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
          {children}
        </CardContent>
      </Card>
    </div>
  );
}

export function EndedScreen({ queue }: { queue: QueueEntry[] }) {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-8 sm:px-6">
      <Card>
        <CardContent className="flex flex-col items-center gap-2 p-8 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-muted">
            <Power className="size-5 text-muted-foreground" />
          </span>
          <h1 className="text-xl font-semibold">This jam has ended</h1>
          <p className="text-sm text-muted-foreground">
            The host closed this session. Here&apos;s what made the final cut.
          </p>
          <Link href="/" className={cn(buttonVariants(), "mt-2")}>
            <ArrowLeft className="size-4" />
            Back home
          </Link>
        </CardContent>
      </Card>
      <FinalQueueList queue={queue} />
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
      <span className="flex size-12 items-center justify-center rounded-full bg-destructive/10">
        <TriangleAlert className="size-5 text-destructive" />
      </span>
      <h1 className="text-xl font-semibold">Couldn&apos;t load the room</h1>
      <p className="text-sm text-muted-foreground">
        {message ?? "Something went wrong while joining. Check your connection and try again."}
      </p>
      <div className="mt-2 flex gap-2">
        <Button onClick={onRetry}>
          <RotateCcw className="size-4" />
          Try again
        </Button>
        <Link href="/" className={cn(buttonVariants({ variant: "ghost" }))}>
          <ArrowLeft className="size-4" />
          Back home
        </Link>
      </div>
    </CenteredCard>
  );
}

export function NotFoundScreen() {
  return (
    <CenteredCard>
      <span className="flex size-12 items-center justify-center rounded-full bg-muted">
        <Music2 className="size-5 text-muted-foreground" />
      </span>
      <h1 className="text-xl font-semibold">Session not found</h1>
      <p className="text-sm text-muted-foreground">
        This link doesn&apos;t point to a jam session. Check the URL or start
        your own.
      </p>
      <Link href="/" className={cn(buttonVariants(), "mt-2")}>
        <ArrowLeft className="size-4" />
        Back home
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
      <h1 className="text-xl font-semibold">You&apos;re not in this session</h1>
      <p className="text-sm text-muted-foreground">
        Ask the host for the invite code and enter it below to join the jam.
      </p>
      <form onSubmit={join} className="flex w-full gap-2">
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="e.g. a1b2c3d4"
          maxLength={16}
          autoComplete="off"
          className="font-mono uppercase"
        />
        <Button type="submit" disabled={pending || !code.trim()}>
          {pending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <ArrowRight className="size-4" />
          )}
          Join
        </Button>
      </form>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Link href="/" className={cn(buttonVariants({ variant: "ghost" }))}>
        <ArrowLeft className="size-4" />
        Back home
      </Link>
    </CenteredCard>
  );
}
