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
  active: boolean;
  isOwner: boolean;
  ownerName: string;
  participants: ParticipantInfo[];
}

export function RoomHeader({
  streamId,
  code,
  active,
  isOwner,
  ownerName,
  participants,
}: RoomHeaderProps) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [ending, setEnding] = useState(false);
  const [endDialogOpen, setEndDialogOpen] = useState(false);

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
      // to the ended screen; dismiss the confirmation dialog.
      setEndDialogOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not end session");
      setEnding(false);
    }
  }

  return (
    <header className="sticky top-0 z-40 flex flex-wrap items-center justify-between gap-3 border-b border-border/50 bg-background/70 px-4 py-3 backdrop-blur-xl sm:px-6">
      <div className="flex items-center gap-3">
        <Link
          href="/"
          aria-label="Back to home"
          className={cn(
            buttonVariants({ variant: "ghost", size: "icon-sm" }),
            "size-8 rounded-lg border border-border/40 hover:border-border hover:bg-muted/40 active:scale-95",
          )}
        >
          <ArrowLeft className="size-4" />
        </Link>

        <div className="flex min-w-0 items-center gap-2.5">
          <div className="min-w-0">
            <p className="truncate text-sm font-bold tracking-tight text-foreground">
              {isOwner ? "Your Jam Session" : `${ownerName}'s Jam Session`}
            </p>
          </div>

          {/* Invite Code Pill */}
          <button
            type="button"
            onClick={copyCode}
            title="Click to copy invite code"
            className="group/pill inline-flex items-center gap-1.5 rounded-lg border border-border/80 bg-muted/25 px-2.5 py-1 font-mono text-xs font-semibold tracking-wider transition-all hover:border-primary/60 hover:bg-muted/50 active:scale-95"
          >
            <span className="text-[10px] uppercase text-muted-foreground font-sans tracking-normal">Code:</span>
            <span className="text-foreground">{code}</span>
            {copied ? (
              <Check className="size-3 text-primary animate-in fade-in zoom-in duration-200" />
            ) : (
              <Copy className="size-3 text-muted-foreground opacity-60 transition-opacity group-hover/pill:opacity-100" />
            )}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        {/* Participants Pile */}
        <Popover>
          <PopoverTrigger
            render={
              <button
                type="button"
                className="flex items-center gap-1.5 rounded-full border border-border/70 bg-card/60 py-1 pr-3 pl-1.5 transition-all hover:border-primary/50 hover:bg-card active:scale-95"
              />
            }
          >
            <span className="flex -space-x-1.5">
              {participants.slice(0, 3).map((p) => (
                <Avatar key={p.id} className="size-6 border-2 border-background ring-1 ring-border/40">
                  <AvatarImage src={p.image ?? ""} alt={p.name} />
                  <AvatarFallback className="bg-primary/20 text-[9px] font-bold text-primary">
                    {p.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              ))}
            </span>
            <div className="ml-1 flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <span className="relative flex size-1.5">
                <span className="radar-ring absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex size-1.5 rounded-full bg-emerald-400" />
              </span>
              <span>{participants.length}</span>
            </div>
          </PopoverTrigger>
          <PopoverContent align="end" className="glass-panel w-64 p-2 shadow-2xl">
            <div className="flex items-center justify-between px-2 pt-1 pb-2 border-b border-border/50">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                In this session
              </p>
              <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">
                {participants.length} online
              </span>
            </div>
            <ul className="mt-1 flex max-h-64 flex-col gap-1 overflow-y-auto">
              {participants.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted/40"
                >
                  <Avatar className="size-7 ring-1 ring-border/60">
                    <AvatarImage src={p.image ?? ""} alt={p.name} />
                    <AvatarFallback className="bg-primary/15 text-xs font-bold text-primary">
                      {p.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="min-w-0 flex-1 truncate text-xs font-medium text-foreground">
                    {p.name}
                  </span>
                  {p.isOwner ? (
                    <Badge variant="secondary" className="gap-1 border-amber-500/30 bg-amber-500/10 text-[10px] font-semibold text-amber-300">
                      <Crown className="size-3" />
                      Host
                    </Badge>
                  ) : null}
                </li>
              ))}
            </ul>
          </PopoverContent>
        </Popover>

        {isOwner && active ? (
          <AlertDialog
            open={endDialogOpen}
            onOpenChange={setEndDialogOpen}
          >
            <AlertDialogTrigger
              render={
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={ending}
                  className="h-8 gap-1.5 rounded-lg px-3 text-xs font-semibold shadow-sm active:scale-95"
                />
              }
            >
              <Power className="size-3.5" />
              End
            </AlertDialogTrigger>
            <AlertDialogContent className="glass-panel shadow-2xl">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-lg font-bold">
                  End this jam session?
                </AlertDialogTitle>
                <AlertDialogDescription className="text-sm text-muted-foreground">
                  Everyone in the room will see the session as ended. The final queue ranking remains preserved for everyone to see.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="rounded-lg">Keep Jamming</AlertDialogCancel>
                <AlertDialogAction
                  onClick={endSession}
                  className="rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  End Session
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
            className="h-8 gap-1.5 rounded-lg border border-border/40 text-xs font-semibold hover:bg-muted/40 active:scale-95"
          >
            <LogOut className="size-3.5" />
            Leave
          </Button>
        )}
      </div>
    </header>
  );
}
