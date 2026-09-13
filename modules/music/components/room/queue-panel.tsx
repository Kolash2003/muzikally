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
        "flex items-center gap-3 rounded-xl border p-2.5 transition-colors",
        entry.current
          ? "border-primary/50 bg-primary/5"
          : "border-border bg-card",
      )}
    >
      <span className="w-5 shrink-0 text-center text-xs font-semibold text-muted-foreground tabular-nums">
        {rank}
      </span>
      <div className="relative size-11 shrink-0 overflow-hidden rounded-lg bg-muted">
        {entry.thumbnailUrl ? (
          <Image
            src={entry.thumbnailUrl}
            alt=""
            fill
            sizes="44px"
            className="object-cover"
          />
        ) : (
          <Music2 className="absolute inset-0 m-auto size-5 text-muted-foreground" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{entry.title}</p>
        <p className="truncate text-xs text-muted-foreground">
          {[entry.artist, formatDuration(entry.durationSeconds)]
            .filter(Boolean)
            .join(" · ") || `Added by ${entry.addedByName}`}
        </p>
        <p className="truncate text-xs text-muted-foreground/70">
          Added by {entry.addedByName}
        </p>
      </div>
      {entry.current ? (
        <div className="flex shrink-0 items-center gap-1.5">
          <Badge>Playing</Badge>
          {showRemove ? (
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={onRemove}
              disabled={removing}
              aria-label={`Remove ${entry.title} from queue`}
              className="text-muted-foreground hover:text-destructive"
            >
              {removing ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <X className="size-4" />
              )}
            </Button>
          ) : null}
        </div>
      ) : readOnly ? (
        <div className="flex shrink-0 items-center gap-1.5">
          <span className="flex items-center gap-1 text-sm font-semibold text-muted-foreground tabular-nums">
            <ArrowBigUp className="size-4" />
            {entry.votes}
          </span>
          {showRemove ? (
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={onRemove}
              disabled={removing}
              aria-label={`Remove ${entry.title} from queue`}
              className="text-muted-foreground hover:text-destructive"
            >
              {removing ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <X className="size-4" />
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
            className="tabular-nums"
          >
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <ArrowBigUp
                className={cn("size-4", upvoted && "fill-current")}
              />
            )}
            {entry.votes}
          </Button>
          {showRemove ? (
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={onRemove}
              disabled={removing}
              aria-label={`Remove ${entry.title} from queue`}
              className="text-muted-foreground hover:text-destructive"
            >
              {removing ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <X className="size-4" />
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
    .filter((q) => !q.current)
    .sort((a, b) => b.votes - a.votes || a.title.localeCompare(b.title));
  // Only the host sees the remove (×) button, and never in read-only mode.
  const showRemove = isOwner && !readOnly && onRemove !== undefined;

  return (
    <Card className="flex min-h-0 flex-1 flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          Up next
          <Badge variant="secondary" className="tabular-nums">
            {upcoming.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="min-h-0 flex-1 px-3 pb-3">
        {queue.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 py-10 text-center text-muted-foreground">
            <Music2 className="size-8" />
            <p className="text-sm">
              The queue is empty.
              <br />
              Paste a link above to add the first song.
            </p>
          </div>
        ) : (
          <ScrollArea className="h-full max-h-[60vh] lg:max-h-none">
            <ul className="flex flex-col gap-2 pr-3">
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
      <p className="py-8 text-center text-sm text-muted-foreground">
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
          className="flex items-center gap-3 rounded-xl border border-border p-2.5"
        >
          <span className="w-5 shrink-0 text-center text-xs font-semibold text-muted-foreground tabular-nums">
            {i + 1}
          </span>
          <div className="relative size-10 shrink-0 overflow-hidden rounded-lg bg-muted">
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
            <p className="truncate text-sm font-medium">{entry.title}</p>
            {entry.artist ? (
              <p className="truncate text-xs text-muted-foreground">
                {entry.artist}
              </p>
            ) : null}
          </div>
          <span className="flex shrink-0 items-center gap-1 text-sm text-muted-foreground tabular-nums">
            <ArrowBigUp className="size-4" />
            {entry.votes}
          </span>
        </li>
      ))}
    </ul>
  );
}
