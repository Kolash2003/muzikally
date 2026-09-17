"use client";

import { useRoomSocket } from "@/hooks/use-room-socket";
import { AddSong } from "./add-song";
import { PlayerPanel } from "./player-panel";
import { QueuePanel } from "./queue-panel";
import { RoomHeader } from "./room-header";
import {
  ConnectingScreen,
  EndedScreen,
  ErrorScreen,
  NotAMemberScreen,
  NotFoundScreen,
} from "./room-states";

export function RoomClient({ streamId }: { streamId: string }) {
  const {
    phase,
    room,
    queue,
    playback,
    myUpvotes,
    pendingVotes,
    pendingRemoves,
    lastError,
    toggleUpvote,
    removeFromQueue,
    sendPlayback,
    retry,
  } = useRoomSocket({ streamId });

  if (phase === "error") {
    return (
      <div className="flex min-h-full flex-col">
        <ErrorScreen message={lastError} onRetry={retry} />
      </div>
    );
  }

  if (phase === "connecting" || !room) {
    return (
      <div className="flex min-h-full flex-col">
        <ConnectingScreen />
      </div>
    );
  }

  if (phase === "not-found") {
    return (
      <div className="flex min-h-full flex-col">
        <NotFoundScreen />
      </div>
    );
  }

  if (phase === "not-a-member") {
    return (
      <div className="flex min-h-full flex-col">
        <NotAMemberScreen onJoined={retry} />
      </div>
    );
  }

  if (phase === "ended") {
    return (
      <div className="flex min-h-full flex-col">
        <RoomHeader
          streamId={streamId}
          code={room.stream.code}
          active={room.stream.active}
          isOwner={room.you.isOwner}
          ownerName={room.stream.ownerName}
          participants={room.participants}
        />
        <EndedScreen queue={queue} />
      </div>
    );
  }

  const readOnly = !room.stream.active;

  return (
    <div className="flex min-h-full flex-col">
      <RoomHeader
        streamId={streamId}
        code={room.stream.code}
        active={room.stream.active}
        isOwner={room.you.isOwner}
        ownerName={room.stream.ownerName}
        participants={room.participants}
      />
      <main className="mx-auto grid w-full max-w-6xl flex-1 gap-4 px-4 py-4 sm:px-6 sm:py-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex min-w-0 flex-col gap-4">
          <PlayerPanel
            queue={queue}
            playback={playback}
            isOwner={room.you.isOwner}
            streamType={room.stream.type}
            onControl={sendPlayback}
          />
        </div>
        <div className="flex min-h-0 flex-col gap-4">
          {!readOnly ? (
            <AddSong
              streamId={streamId}
              streamType={room.stream.type}
              onAdded={() => undefined}
            />
          ) : null}
          <QueuePanel
            queue={queue}
            myUpvotes={myUpvotes}
            pendingVotes={pendingVotes}
            pendingRemoves={pendingRemoves}
            readOnly={readOnly}
            isOwner={room.you.isOwner}
            onToggleUpvote={toggleUpvote}
            onRemove={removeFromQueue}
          />
        </div>
      </main>
    </div>
  );
}
