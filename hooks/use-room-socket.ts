"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { emitWithAck, getSocket } from "@/lib/socket-client";
import {
  SocketEvents,
  type ParticipantsUpdatedPayload,
  type PlaybackAction,
  type PlaybackStatePayload,
  type QueueEntry,
  type QueueRemoveAckData,
  type StreamJoinAckData,
  type UpvoteToggleAckData,
} from "@/lib/socket-events";

export type RoomPhase =
  | "connecting"
  | "live"
  | "ended"
  | "not-found"
  | "not-a-member"
  | "error";

export type RoomSnapshot = StreamJoinAckData;

interface UseRoomSocketOptions {
  streamId: string;
}

/**
 * Owns the socket lifecycle for one jam room: joins on mount (and on
 * reconnect), subscribes to room events, and exposes actions.
 * Pure socket authority — all state arrives via the join ack + broadcasts.
 */
export function useRoomSocket({ streamId }: UseRoomSocketOptions) {
  const [phase, setPhase] = useState<RoomPhase>("connecting");
  const [room, setRoom] = useState<RoomSnapshot | null>(null);
  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const [playback, setPlayback] = useState<PlaybackStatePayload | null>(null);
  const [myUpvotes, setMyUpvotes] = useState<Set<string>>(new Set());
  const [pendingVotes, setPendingVotes] = useState<Set<string>>(new Set());
  const [pendingRemoves, setPendingRemoves] = useState<Set<string>>(new Set());
  const [lastError, setLastError] = useState<string | null>(null);
  const myIdRef = useRef<string | null>(null);
  const participantIdsRef = useRef<Set<string>>(new Set());

  // The subscription effect below lists streamId as a dependency, so its
  // handlers always close over the current room id.

  const applyJoinData = useCallback((data: StreamJoinAckData) => {
    myIdRef.current = data.you.id;
    participantIdsRef.current = new Set(data.participants.map((p) => p.id));
    setRoom(data);
    setQueue(data.queue);
    setPlayback(data.playback);
    setMyUpvotes(new Set(data.myUpvotes));
    setPendingVotes(new Set());
    setPendingRemoves(new Set());
    setLastError(null);
    setPhase(data.stream.active ? "live" : "ended");
  }, []);

  const join = useCallback(async () => {
    const ack = await emitWithAck<StreamJoinAckData>(SocketEvents.StreamJoin, {
      streamId,
    });
    if (!ack.success || !ack.data) {
      const message = ack.message ?? "Could not join the room";
      setLastError(message);
      if (/not found/i.test(message)) {
        setPhase("not-found");
      } else if (/participant/i.test(message)) {
        setPhase("not-a-member");
      } else {
        setPhase("error");
      }
      return false;
    }
    applyJoinData(ack.data);
    return true;
  }, [applyJoinData, streamId]);

  useEffect(() => {
    let cancelled = false;
    const socket = getSocket();

    const onQueue = (body: { streamId: string; queue: QueueEntry[] }) => {
      if (cancelled || body.streamId !== streamId) return;
      setQueue(body.queue);
      // A vote the server never confirmed must not linger as pending.
      setPendingVotes((prev) => {
        if (prev.size === 0) return prev;
        const next = new Set(prev);
        for (const id of prev) {
          if (body.queue.some((q) => q.musicId === id)) next.delete(id);
        }
        return next;
      });
    };
    const onPlayback = (body: PlaybackStatePayload) => {
      if (cancelled || body.streamId !== streamId) return;
      setPlayback(body);
      if (body.musicId) {
        setQueue((prev) =>
          prev.map((q) => ({ ...q, current: q.musicId === body.musicId })),
        );
      }
    };
    const onParticipants = (body: ParticipantsUpdatedPayload) => {
      if (cancelled || body.streamId !== streamId) return;
      const prevIds = participantIdsRef.current;
      const me = myIdRef.current;
      if (me) {
        for (const p of body.participants) {
          if (!prevIds.has(p.id) && p.id !== me) {
            toast.info(`${p.name} joined the jam`);
          }
        }
      }
      participantIdsRef.current = new Set(body.participants.map((p) => p.id));
      setRoom((prev) =>
        prev ? { ...prev, participants: body.participants } : prev,
      );
    };
    const onEnded = (body: { streamId: string }) => {
      if (cancelled || body.streamId !== streamId) return;
      setPhase("ended");
      setRoom((prev) =>
        prev
          ? { ...prev, stream: { ...prev.stream, active: false } }
          : prev,
      );
      toast.info("The host ended this jam session");
    };
    const onError = (body: { message: string }) => {
      if (!cancelled) toast.error(body.message);
    };
    const onReconnect = () => {
      if (!cancelled) void join();
    };

    socket.on(SocketEvents.QueueUpdated, onQueue);
    socket.on(SocketEvents.PlaybackState, onPlayback);
    socket.on(SocketEvents.ParticipantsUpdated, onParticipants);
    socket.on(SocketEvents.StreamEnded, onEnded);
    socket.on(SocketEvents.Error, onError);
    socket.on("connect", onReconnect);

    // Joining the room is a mount-time subscription to an external system
    // (the socket server owns all room state), not state derived from props.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void join();

    return () => {
      cancelled = true;
      socket.off(SocketEvents.QueueUpdated, onQueue);
      socket.off(SocketEvents.PlaybackState, onPlayback);
      socket.off(SocketEvents.ParticipantsUpdated, onParticipants);
      socket.off(SocketEvents.StreamEnded, onEnded);
      socket.off(SocketEvents.Error, onError);
      socket.off("connect", onReconnect);
      socket.emit(SocketEvents.StreamLeave, { streamId });
    };
  }, [streamId, join]);

  /** The server says this stream is over — show the ended screen. */
  const markEnded = useCallback(() => {
    setRoom((prev) =>
      prev ? { ...prev, stream: { ...prev.stream, active: false } } : prev,
    );
    setPhase("ended");
  }, []);

  const toggleUpvote = useCallback(
    async (musicId: string) => {
      const wasUpvoted = myUpvotes.has(musicId);
      // Optimistic flip.
      setMyUpvotes((prev) => {
        const next = new Set(prev);
        if (wasUpvoted) next.delete(musicId);
        else next.add(musicId);
        return next;
      });
      setPendingVotes((prev) => new Set(prev).add(musicId));

      const ack = await emitWithAck<UpvoteToggleAckData>(
        SocketEvents.UpvoteToggle,
        { streamId, musicId },
      );
      if (
        !ack.success &&
        /ended|not available/i.test(ack.message ?? "")
      ) {
        // Our snapshot is stale — the stream ended without us noticing.
        setPendingVotes((prev) => {
          const next = new Set(prev);
          next.delete(musicId);
          return next;
        });
        markEnded();
        return;
      }
      if (!ack.success || !ack.data) {
        // Revert the optimistic flip.
        setMyUpvotes((prev) => {
          const next = new Set(prev);
          if (wasUpvoted) next.add(musicId);
          else next.delete(musicId);
          return next;
        });
        toast.error(ack.message ?? "Could not vote");
      } else {
        setQueue(ack.data.queue);
        setMyUpvotes((prev) => {
          const next = new Set(prev);
          if (ack.data!.upvoted) next.add(musicId);
          else next.delete(musicId);
          return next;
        });
      }
      setPendingVotes((prev) => {
        const next = new Set(prev);
        next.delete(musicId);
        return next;
      });
    },
    [streamId, myUpvotes],
  );

  const sendPlayback = useCallback(
    async (action: PlaybackAction) => {
      const ack = await emitWithAck(SocketEvents.PlaybackControl, {
        streamId,
        action,
      });
      if (!ack.success) {
        if (/ended|not available/i.test(ack.message ?? "")) {
          // Our snapshot is stale — the stream ended without us noticing.
          markEnded();
          return;
        }
        toast.error(ack.message ?? "Playback failed");
      }
    },
    [streamId, markEnded],
  );

  /** Host-only: remove a song from the queue. */
  const removeFromQueue = useCallback(
    async (musicId: string) => {
      setPendingRemoves((prev) => new Set(prev).add(musicId));
      const ack = await emitWithAck<QueueRemoveAckData>(
        SocketEvents.QueueRemove,
        { streamId, musicId },
      );
      if (!ack.success) {
        if (/ended|not available/i.test(ack.message ?? "")) {
          // Our snapshot is stale — the stream ended without us noticing.
          markEnded();
        } else {
          toast.error(ack.message ?? "Could not remove song");
        }
      } else if (ack.data) {
        setQueue(ack.data.queue);
        setMyUpvotes((prev) => {
          const next = new Set(prev);
          next.delete(musicId);
          return next;
        });
      }
      setPendingRemoves((prev) => {
        const next = new Set(prev);
        next.delete(musicId);
        return next;
      });
    },
    [streamId, markEnded],
  );

  /** Retry after joining via invite code (not-a-member screen). */
  const retry = useCallback(() => {
    setPhase("connecting");
    setLastError(null);
    void join();
  }, [join]);

  return {
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
  };
}
