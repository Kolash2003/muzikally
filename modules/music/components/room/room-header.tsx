"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  Copy,
  Crown,
  LogOut,
  Power,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import type { ParticipantInfo } from "@/lib/socket-events";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "cn";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface RoomHeaderProps {
  streamId: string;
  code: string;
  isOwner: boolean;
  ownerName: string;
  participants: ParticipantInfo[];
}

export function RoomHeader({
  streamId,
  code,
  isOwner,
  ownerName,
  participants,
}: RoomHeaderProps) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [ending, setEnding] = useState(false);

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success("Invite code copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy the code");
    }
  }

  async function leave() {
    setLeaving(true);
    try {
      await fetch(`/api/stream/join?streamId=${streamId}`, {
        method: "DELETE",
      });
    } catch {
      // Leaving the socket room is enough; membership cleanup is best-effort.
    } finally {
      router.push("/");
      router.refresh();
    }
  }

  async function endSession() {
    setEnding(true);
    try {
      const res = await fetch("/api/stream", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ streamId }),
      });
      const json = await res.json();
      if (!json?.success) throw new Error(json?.message || "Failed");
      // The stream:ended broadcast flips everyone (including the owner)
      // to the ended screen.
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not end session");
      setEnding(false);
    }
  }

  return (
    <header className="flex flex-wrap items-center gap-2 border-b border-border bg-background/80 px-4 py-3 backdrop-blur sm:px-6">
      <Link
        href="/"
        aria-label="Back to home"
        className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }))}
      >
        <ArrowLeft className="size-4" />
      </Link>

      <div className="mr-auto flex min-w-0 items-center gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">
            {isOwner ? "Your jam session" : `${ownerName}'s jam session`}
          </p>
        </div>
        <button
          type="button"
          onClick={copyCode}
          title="Copy invite code"
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-1 font-mono text-xs tracking-wider transition-colors hover:border-primary/60"
        >
          {code}
          {copied ? (
            <Check className="size-3.5 text-primary" />
          ) : (
            <Copy className="size-3.5 opacity-50" />
          )}
        </button>
      </div>

      <Popover>
        <PopoverTrigger
          render={
            <button
              type="button"
              className="flex items-center rounded-full border border-border py-1 pr-3 pl-1 transition-colors hover:border-primary/60"
            />
          }
        >
          <span className="flex -space-x-2">
            {participants.slice(0, 4).map((p) => (
              <Avatar key={p.id} className="size-6 border-2 border-background">
                <AvatarImage src={p.image ?? ""} alt={p.name} />
                <AvatarFallback className="text-[10px]">
                  {p.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            ))}
          </span>
          <span className="ml-1.5 flex items-center gap-1 text-xs text-muted-foreground">
            <Users className="size-3.5" />
            {participants.length}
          </span>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-64 p-2">
          <p className="px-2 pt-1 pb-2 text-xs font-medium text-muted-foreground">
            In this session
          </p>
          <ul className="flex max-h-64 flex-col gap-1 overflow-y-auto">
            {participants.map((p) => (
              <li
                key={p.id}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5"
              >
                <Avatar className="size-7">
                  <AvatarImage src={p.image ?? ""} alt={p.name} />
                  <AvatarFallback className="text-xs">
                    {p.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="min-w-0 flex-1 truncate text-sm">
                  {p.name}
                </span>
                {p.isOwner ? (
                  <Badge variant="secondary" className="gap-1 text-[10px]">
                    <Crown className="size-3 text-primary" />
                    Host
                  </Badge>
                ) : null}
              </li>
            ))}
          </ul>
        </PopoverContent>
      </Popover>

      {isOwner ? (
        <AlertDialog>
          <AlertDialogTrigger
            render={
              <Button variant="destructive" size="sm" disabled={ending} />
            }
          >
            <Power className="size-4" />
            End
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>End this jam session?</AlertDialogTitle>
              <AlertDialogDescription>
                Everyone in the room will see the session as ended. The queue
                stays visible but nobody can add or vote anymore.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep jamming</AlertDialogCancel>
              <AlertDialogAction onClick={endSession}>
                End session
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          onClick={leave}
          disabled={leaving}
        >
          <LogOut className="size-4" />
          Leave
        </Button>
      )}
    </header>
  );
}
