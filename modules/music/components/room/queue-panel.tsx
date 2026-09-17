"use client";

import Image from "next/image";
import { ArrowBigUp, Loader2, Music2, X } from "lucide-react";
import { formatDuration } from "@/lib/youtube";
import type { QueueEntry } from "@/lib/socket-events";
import { cn } from "cn";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

interface QueuePanelProps {
  queue: QueueEntry[];
  myUpvotes: Set<string>;
  pendingVotes: Set<string>;
  pendingRemoves?: Set<string>;
  readOnly?: boolean;
  isOwner?: boolean;
  onToggleUpvote: (musicId: string) => void;
  onRemove?: (musicId: string) => void;
}

function QueueItem({
  entry,
  upvoted,
  pending,
  readOnly,
  rank,
  showRemove,
  removing,
  onToggle,
  onRemove,
}: {
  entry: QueueEntry;
  upvoted: boolean;
  pending: boolean;
  readOnly: boolean;
  rank: number;
  showRemove: boolean;
  removing: boolean;
  onToggle: () => void;
  onRemove: () => void;
}) {
  return (
    <li
      className={cn(
        "group/item relative flex items-center gap-3 rounded-xl border p-2.5 transition-all duration-200",
        entry.current
          ? "border-primary/50 bg-gradient-to-r from-primary/15 via-primary/5 to-transparent shadow-md shadow-primary/5"
          : "border-border/60 bg-card/60 hover:border-border hover:bg-card/90",
      )}
    >
      {/* Rank Indicator */}
      <div className="flex w-6 shrink-0 items-center justify-center">
        {entry.current ? (
          <span className="flex h-3.5 items-end gap-0.5" aria-hidden>
            <span className="eq-bar-1 w-0.5 rounded-full bg-primary" />
            <span className="eq-bar-2 w-0.5 rounded-full bg-primary" />
            <span className="eq-bar-3 w-0.5 rounded-full bg-primary" />
          </span>
        ) : (
          <span
            className={cn(
              "font-mono text-xs font-bold tabular-nums",
              rank === 2
                ? "text-primary font-extrabold"
                : rank === 3
                  ? "text-indigo-400"
                  : "text-muted-foreground",
            )}
          >
            #{rank}
          </span>
        )}
      </div>

      {/* Thumbnail */}
      <div className="relative size-11 shrink-0 overflow-hidden rounded-lg bg-muted border border-border/50">
        {entry.thumbnailUrl ? (
          <Image
            src={entry.thumbnailUrl}
            alt=""
            fill
            sizes="44px"
            className="object-cover transition-transform duration-300 group-hover/item:scale-105"
          />
        ) : (
          <Music2 className="absolute inset-0 m-auto size-5 text-muted-foreground" />
        )}
      </div>

      {/* Track Info */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-bold text-foreground">
          {entry.title}
        </p>
        <p className="truncate text-[11px] text-muted-foreground">
          {[entry.artist, formatDuration(entry.durationSeconds)]
            .filter(Boolean)
            .join(" · ") || `Added by ${entry.addedByName}`}
        </p>
        <p className="truncate text-[10px] text-muted-foreground/70">
          Added by <span className="text-foreground/80 font-medium">{entry.addedByName}</span>
        </p>
      </div>

      {/* Action / Upvote */}
      {entry.current ? (
        <div className="flex shrink-0 items-center gap-1.5">
          <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px] font-bold">
            Playing
          </Badge>
          {showRemove ? (
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={onRemove}
              disabled={removing}
              aria-label={`Remove ${entry.title} from queue`}
              className="size-7 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive active:scale-95"
            >
              {removing ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <X className="size-3.5" />
              )}
            </Button>
          ) : null}
        </div>
      ) : readOnly ? (
        <div className="flex shrink-0 items-center gap-1.5">
          <span className="flex items-center gap-1 rounded-lg border border-border/60 bg-muted/20 px-2 py-1 text-xs font-bold text-muted-foreground tabular-nums">
            <ArrowBigUp className="size-3.5" />
            {entry.votes}
          </span>
          {showRemove ? (
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={onRemove}
              disabled={removing}
              aria-label={`Remove ${entry.title} from queue`}
              className="size-7 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive active:scale-95"
            >
              {removing ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <X className="size-3.5" />
              )}
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="flex shrink-0 items-center gap-1.5">
          <Button
            size="sm"
            variant={upvoted ? "default" : "outline"}
            onClick={onToggle}
            disabled={pending}
            aria-pressed={upvoted}
            aria-label={upvoted ? "Remove upvote" : "Upvote"}
            className={cn(
              "group/btn h-8 gap-1.5 rounded-lg px-2.5 text-xs font-bold tabular-nums transition-all duration-150 active:scale-90",
              upvoted
                ? "bg-primary text-primary-foreground shadow-sm shadow-primary/30 hover:bg-primary/90"
                : "border-border/80 hover:border-primary/50 hover:bg-primary/10 hover:text-primary",
            )}
          >
            {pending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <ArrowBigUp
                className={cn(
                  "size-4 transition-transform duration-150",
                  upvoted ? "fill-current scale-110" : "group-hover/btn:-translate-y-0.5",
                )}
              />
            )}
            <span>{entry.votes}</span>
          </Button>
          {showRemove ? (
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={onRemove}
              disabled={removing}
              aria-label={`Remove ${entry.title} from queue`}
              className="size-7 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive active:scale-95"
            >
              {removing ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <X className="size-3.5" />
              )}
            </Button>
          ) : null}
        </div>
      )}
    </li>
  );
}

export function QueuePanel({
  queue,
  myUpvotes,
  pendingVotes,
  pendingRemoves = new Set<string>(),
  readOnly = false,
  isOwner = false,
  onToggleUpvote,
  onRemove,
}: QueuePanelProps) {
  const current = queue.find((q) => q.current);
  const upcoming = queue
    .filter((q) => !q.current && !q.played)
    .sort((a, b) => b.votes - a.votes || a.title.localeCompare(b.title));
  // Only the host sees the remove (×) button, and never in read-only mode.
  const showRemove = isOwner && !readOnly && onRemove !== undefined;

  return (
    <Card className="glass-card flex min-h-0 flex-1 flex-col overflow-hidden border-white/10 shadow-xl">
      <CardHeader className="pb-3 border-b border-border/40">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-bold tracking-tight">
            <span>Live Queue</span>
            <Badge variant="secondary" className="rounded-full px-2 text-[10px] font-bold tabular-nums">
              {queue.length}
            </Badge>
          </CardTitle>
          <span className="text-[10px] text-muted-foreground">
            Upvote to bump tracks
          </span>
        </div>
      </CardHeader>
      <CardContent className="min-h-0 flex-1 p-3">
        {queue.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 py-12 text-center text-muted-foreground">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-muted/25 text-primary">
              <Music2 className="size-6" />
            </div>
            <div className="flex flex-col gap-0.5">
              <p className="text-xs font-semibold text-foreground">The queue is empty</p>
              <p className="text-[11px] text-muted-foreground">
                Paste a link above to add the first track.
              </p>
            </div>
          </div>
        ) : (
          <ScrollArea className="h-full max-h-[60vh] lg:max-h-none">
            <ul className="flex flex-col gap-2 pr-2">
              {current ? (
                <QueueItem
                  entry={current}
                  upvoted={false}
                  pending={false}
                  readOnly
                  rank={1}
                  showRemove={showRemove}
                  removing={pendingRemoves.has(current.musicId)}
                  onToggle={() => undefined}
                  onRemove={() => onRemove?.(current.musicId)}
                />
              ) : null}
              {upcoming.map((entry, i) => (
                <QueueItem
                  key={entry.musicId}
                  entry={entry}
                  upvoted={myUpvotes.has(entry.musicId)}
                  pending={pendingVotes.has(entry.musicId)}
                  readOnly={readOnly}
                  rank={i + (current ? 2 : 1)}
                  showRemove={showRemove}
                  removing={pendingRemoves.has(entry.musicId)}
                  onToggle={() => onToggleUpvote(entry.musicId)}
                  onRemove={() => onRemove?.(entry.musicId)}
                />
              ))}
            </ul>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

export function FinalQueueList({ queue }: { queue: QueueEntry[] }) {
  if (queue.length === 0) {
    return (
      <p className="py-8 text-center text-xs text-muted-foreground">
        Nothing was queued in this session.
      </p>
    );
  }
  const sorted = [...queue].sort(
    (a, b) => b.votes - a.votes || a.title.localeCompare(b.title),
  );
  return (
    <ul className="flex flex-col gap-2">
      {sorted.map((entry, i) => (
        <li
          key={entry.musicId}
          className={cn(
            "flex items-center gap-3 rounded-xl border p-2.5 transition-all",
            i === 0
              ? "border-amber-500/40 bg-amber-500/10 shadow-sm"
              : i === 1
                ? "border-indigo-400/40 bg-indigo-400/10"
                : i === 2
                  ? "border-primary/40 bg-primary/10"
                  : "border-border/60 bg-card/60",
          )}
        >
          <span
            className={cn(
              "w-6 shrink-0 text-center font-mono text-xs font-bold tabular-nums",
              i === 0
                ? "text-amber-300"
                : i === 1
                  ? "text-indigo-300"
                  : i === 2
                    ? "text-primary"
                    : "text-muted-foreground",
            )}
          >
            #{i + 1}
          </span>
          <div className="relative size-10 shrink-0 overflow-hidden rounded-lg bg-muted border border-border/50">
            {entry.thumbnailUrl ? (
              <Image
                src={entry.thumbnailUrl}
                alt=""
                fill
                sizes="40px"
                className="object-cover"
              />
            ) : (
              <Music2 className="absolute inset-0 m-auto size-4 text-muted-foreground" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold text-foreground">{entry.title}</p>
            {entry.artist ? (
              <p className="truncate text-[11px] text-muted-foreground">
                {entry.artist}
              </p>
            ) : null}
          </div>
          <span className="flex shrink-0 items-center gap-1 rounded-lg border border-border/60 bg-muted/20 px-2 py-1 text-xs font-bold text-foreground tabular-nums">
            <ArrowBigUp className="size-3.5 fill-current text-primary" />
            {entry.votes}
          </span>
        </li>
      ))}
    </ul>
  );
}
