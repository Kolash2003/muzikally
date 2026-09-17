"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSocket } from "@/lib/socket-client";
import { SocketEvents, type StreamEndedPayload } from "@/lib/socket-events";

/**
 * Keeps the dashboard session list honest: when any stream the user can see
 * ends, re-fetch the list instead of showing a stale "Live" card that leads
 * to a dead room.
 */
export function StreamListRefresher({ streamIds }: { streamIds: string[] }) {
  const router = useRouter();

  useEffect(() => {
    const ids = new Set(streamIds);
    const socket = getSocket();
    const onEnded = (body: StreamEndedPayload) => {
      if (ids.has(body.streamId)) router.refresh();
    };
    socket.on(SocketEvents.StreamEnded, onEnded);
    return () => {
      socket.off(SocketEvents.StreamEnded, onEnded);
    };
    // Re-subscribe only when the visible set of streams actually changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, streamIds.join(",")]);

  return null;
}
